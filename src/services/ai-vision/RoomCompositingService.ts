/**
 * A genuinely different capability from RoomVisionService: that file
 * only *reads* a room photo and returns structured data (bounding
 * boxes, categories). This file *generates a new photo* — the same
 * room photo you send, edited so the matched products actually appear
 * placed inside it, scaled and positioned by the model rather than
 * drawn as a flat sticker overlay by the frontend.
 *
 * One call, every product: `compose()` takes the room photo plus every
 * matched product's photo together and asks for a single edited result
 * containing all of them — not one call (and one bill) per detected
 * placement. An earlier version called it once per product; that
 * multiplied cost by however many items a scan happened to find, which
 * is exactly what this shape avoids. See compose()'s own comment.
 *
 * Provider: Google's Gemini image-generation models (@google/genai),
 * via the same `models.generateContent` call RoomVisionService already
 * uses, just with `responseModalities: [Modality.IMAGE]` and multiple
 * input images (the room, then each product) instead of one image and
 * a JSON schema. Model id verified against the installed SDK's own
 * model list (gemini-nano-banana-2.1) — not guessed from training data.
 *
 * COST: unlike RoomVisionService's vision-analysis models, there is no
 * free tier for this at all. Verified directly: every Gemini image-
 * generation model returns a hard `limit: 0` free-tier quota regardless
 * of request volume — this isn't congestion, it's a wall. A Google AI
 * Studio project needs Cloud Billing actually linked (not just a
 * consumer "Google AI Pro"/Gemini Advanced subscription, which is a
 * separate system) before any call here will succeed. Confirmed
 * working live, with billing active, on the single-product version of
 * this call — ~15-60s per call depending on image size/complexity (see
 * COMPOSE_TIMEOUT_MS). The multi-product reshape above is unverified
 * against a live call as of this writing; the request/response shapes
 * are independently checked against the SDK's types, and the single-
 * product path they're adapted from is proven, but re-confirm with a
 * real multi-product call before trusting it in production.
 *
 * "Editing" / iterative refinement: `refine()` feeds a previous result
 * back in as input with a new instruction, which is how Gemini's image
 * models support multi-turn edits ("move it left," "make it bigger") —
 * there's no separate "edit mode," it's the same compose-style call
 * with the prior output as the base image.
 */

import { GoogleGenAI, Modality } from "@google/genai";

export interface GeneratedImage {
  data: string; // base64
  mimeType: string;
}

export type CompositingErrorCode =
  | "INVALID_IMAGE"
  | "TIMEOUT"
  | "RATE_LIMITED"
  | "AUTH_ERROR"
  | "PROVIDER_ERROR"
  | "MODEL_REFUSED"
  | "NO_IMAGE_RETURNED"
  | "UNKNOWN";

export interface CompositingError {
  code: CompositingErrorCode;
  message: string;
  retryable: boolean;
}

export type CompositingResult =
  | { ok: true; image: GeneratedImage }
  | { ok: false; error: CompositingError };

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
// Measured live, with billing active: a real compose() call through the
// full app route took ~60s end to end (raw SDK call alone: ~15s for a
// much smaller/simpler test image — a believable, photorealistic
// full-size room scene takes meaningfully longer to generate). 45s cut
// it close enough to risk spurious timeouts on a normal-sized photo;
// 90s gives real headroom without the request hanging indefinitely.
const COMPOSE_TIMEOUT_MS = 90_000;
const RETRY_BASE_DELAY_MS = 500;

// Only one model is tried, unlike RoomVisionService's free-tier fallback
// list: these are all equally paid, so there's no "try a cheaper free
// one" option, and nano-banana-2.1 is the current purpose-built
// compositing/editing model rather than a generic image generator.
const DEFAULT_MODEL = "gemini-nano-banana-2.1";
const MAX_RETRIES = 2;

const REFUSAL_FINISH_REASONS = new Set([
  "SAFETY",
  "RECITATION",
  "LANGUAGE",
  "BLOCKLIST",
  "PROHIBITED_CONTENT",
  "SPII",
  "OTHER",
]);

function isAllowedMimeType(value: string): boolean {
  return ALLOWED_MIME_TYPES.has(value);
}

export class RoomCompositingService {
  private readonly client: GoogleGenAI;
  private readonly model: string;

  constructor(deps?: {
    /** Falls back to GOOGLE_API_KEY, then GEMINI_API_KEY, if omitted. */
    geminiApiKey?: string;
    /** Inject a pre-built (or mocked) client in tests. */
    geminiClient?: GoogleGenAI;
    /** Defaults to "gemini-nano-banana-2.1". */
    model?: string;
  }) {
    this.client = deps?.geminiClient ?? new GoogleGenAI({ apiKey: deps?.geminiApiKey });
    this.model = deps?.model ?? DEFAULT_MODEL;
  }

  /**
   * Single-pass composite: edits the one room photo to place every
   * given product into it, in one model call — not one call (and one
   * bill) per product. This is the whole point of this method's shape:
   * an earlier version called compose() once per matched placement,
   * which multiplied cost by however many items were detected in the
   * room; this instead sends the room photo plus every product's photo
   * together and asks for one edited result containing all of them.
   *
   * Each product can carry its own placement hint (e.g. a detected
   * space's `description` from RoomVisionService — "empty corner by
   * the window"), and the instruction explicitly tells the model to
   * keep every item spatially distinct so a sofa and a desk don't end
   * up overlapping in the result (same concern RoomVisionService's own
   * spatial-coherence check addresses on the analysis side). Product
   * images should ideally be transparent cutouts (see src/lib/seed.ts's
   * `realImage` field) for an unambiguous shape reference; not
   * required, just better.
   */
  async compose(input: {
    roomImage: Buffer;
    roomMimeType: string;
    products: Array<{
      image: Buffer;
      mimeType: string;
      /** For the model's reference and the prompt text only — not sent as structured data. */
      label: string;
      placementHint?: string;
      /** Which way this piece should face once placed — e.g. "facing
       *  into the room, back against the wall" — typically carried
       *  over from RoomVisionService's own `orientation` field for
       *  this same spot, so the angle a human designer would choose
       *  during analysis is the angle actually rendered here too. */
      orientation?: string;
    }>;
    /** The customer's stated style/colour direction (same text that
     *  steered RoomVisionService's catalog matching) — repeated here so
     *  the image itself is rendered to look like one styled, coordinated
     *  room rather than individually-correct-but-mismatched pieces. */
    styleNote?: string;
  }): Promise<CompositingResult> {
    const roomCheck = this.validateImage(input.roomImage, input.roomMimeType, "room photo");
    if (roomCheck) return { ok: false, error: roomCheck };
    if (input.products.length === 0) {
      return { ok: false, error: { code: "INVALID_IMAGE", message: "No products given to place.", retryable: false } };
    }
    for (const product of input.products) {
      const check = this.validateImage(product.image, product.mimeType, `${product.label} photo`);
      if (check) return { ok: false, error: check };
    }

    const itemLines = input.products
      .map((p, i) => {
        const ordinal = `Product ${i + 2}`; // image 1 is the room; products start at image 2
        const where = p.placementHint ? ` Place it: ${p.placementHint}.` : " Choose the most sensible empty spot for it.";
        const facing = p.orientation ? ` Orient it: ${p.orientation}.` : "";
        return `- ${ordinal} (${p.label}):${where}${facing}`;
      })
      .join("\n");

    const styleLine = input.styleNote?.trim()
      ? ` The customer asked for ${input.styleNote.trim()} — render every new piece so it reads as part of ` +
        "one deliberately styled, fashion-forward room (a small, coordinated palette of colours and " +
        "materials repeated across the new pieces), not individually-fine items that happen to clash once " +
        "placed together."
      : " Style the result the way a professional stager would: keep the new pieces' colours and materials " +
        "reading as one coordinated, fashionable palette rather than a random assortment, taking the cue " +
        "from the room's own existing tones where there's no other guidance.";

    const instruction =
      "You are an interior designer editing the first image (a real room photo) to show how each of the " +
      "following products would actually look placed inside it by someone who knows how to arrange a " +
      "room, all in this one edited photo:\n" +
      itemLines +
      "\n\nGetting the angle right matters as much as getting the spot right: rotate and orient each " +
      "piece exactly the way the instructions above describe, matching the room's real perspective and " +
      "vanishing point rather than placing it flat-on regardless of the camera angle — a sofa or chair " +
      "whose seat and back face the direction described, a piece against a wall sitting flush and square " +
      "with that wall rather than at a careless angle, a lamp standing upright. Every product must end up " +
      "in a distinct, non-overlapping spot — treat the room as one real physical space where each item " +
      "needs its own floor or wall area, the same way they would if someone actually placed all of them in " +
      "the room at once. Match the room's existing scale and lighting for every item, each with a natural " +
      "contact shadow where it touches the floor or wall, so all of them look like they genuinely belong " +
      "in the photo rather than pasted on top." +
      styleLine +
      " Do not alter anything else in the room — same walls, same other furniture, same lighting " +
      "everywhere outside the new products. Return only the one edited room photo.";

    const parts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> = [
      { text: instruction },
      { inlineData: { data: input.roomImage.toString("base64"), mimeType: input.roomMimeType } },
    ];
    for (const product of input.products) {
      parts.push({ inlineData: { data: product.image.toString("base64"), mimeType: product.mimeType } });
    }

    return this.generateImage(parts);
  }

  /**
   * Iterative edit of a previous result — this is "let him play with
   * the photo": feed back whatever compose()/refine() last returned,
   * plus a plain-language change ("move it closer to the window,"
   * "make it a bit smaller," "turn it to face the sofa"), and get the
   * next version back. There's no bounded set of supported edits; it's
   * whatever instruction you send.
   */
  async refine(input: {
    baseImage: Buffer;
    baseMimeType: string;
    instruction: string;
  }): Promise<CompositingResult> {
    const check = this.validateImage(input.baseImage, input.baseMimeType, "image");
    if (check) return { ok: false, error: check };

    return this.generateImage([
      {
        text:
          `Apply this change to the room photo: ${input.instruction}. ` +
          "Keep everything else in the image exactly the same. Return only the edited photo.",
      },
      { inlineData: { data: input.baseImage.toString("base64"), mimeType: input.baseMimeType } },
    ]);
  }

  private validateImage(image: Buffer, mimeType: string, label: string): CompositingError | null {
    if (!Buffer.isBuffer(image) || image.byteLength === 0) {
      return { code: "INVALID_IMAGE", message: `No ${label} data received.`, retryable: false };
    }
    if (image.byteLength > MAX_IMAGE_BYTES) {
      return {
        code: "INVALID_IMAGE",
        message: `The ${label} is too large (${(image.byteLength / 1024 / 1024).toFixed(1)}MB, max ${
          MAX_IMAGE_BYTES / 1024 / 1024
        }MB).`,
        retryable: false,
      };
    }
    if (!isAllowedMimeType(mimeType)) {
      return { code: "INVALID_IMAGE", message: `Unsupported ${label} type: ${mimeType}`, retryable: false };
    }
    return null;
  }

  private async generateImage(
    parts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }>
  ): Promise<CompositingResult> {
    let lastError: CompositingError = { code: "UNKNOWN", message: "Exhausted retries without a result.", retryable: false };

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await this.client.models.generateContent({
          model: this.model,
          contents: [{ role: "user", parts }],
          config: {
            responseModalities: [Modality.IMAGE],
            abortSignal: AbortSignal.timeout(COMPOSE_TIMEOUT_MS),
          },
        });

        const blockReason = response.promptFeedback?.blockReason;
        if (blockReason) {
          return { ok: false, error: { code: "MODEL_REFUSED", message: `The model declined this edit (${blockReason}).`, retryable: false } };
        }
        const finishReason = response.candidates?.[0]?.finishReason;
        if (finishReason && REFUSAL_FINISH_REASONS.has(finishReason)) {
          return { ok: false, error: { code: "MODEL_REFUSED", message: `The model declined this edit (${finishReason}).`, retryable: false } };
        }

        const generated = this.extractImage(response);
        if (!generated) {
          return { ok: false, error: { code: "NO_IMAGE_RETURNED", message: "The model did not return an image.", retryable: true } };
        }
        return { ok: true, image: generated };
      } catch (err) {
        lastError = this.classifyProviderError(err);
        const isLastAttempt = attempt === MAX_RETRIES;
        if (!lastError.retryable || isLastAttempt) {
          return { ok: false, error: lastError };
        }
        await this.delay(RETRY_BASE_DELAY_MS * 2 ** attempt + Math.random() * 200);
      }
    }
    return { ok: false, error: lastError };
  }

  /** `response.data` (the SDK's own convenience getter) concatenates
   *  inline data but doesn't expose the mime type, so this scans the
   *  actual content parts directly to get both. */
  private extractImage(response: {
    candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { data?: string; mimeType?: string } }> } }>;
  }): GeneratedImage | null {
    const parts = response.candidates?.[0]?.content?.parts ?? [];
    for (const part of parts) {
      if (part.inlineData?.data && part.inlineData.mimeType) {
        return { data: part.inlineData.data, mimeType: part.inlineData.mimeType };
      }
    }
    return null;
  }

  private classifyProviderError(err: unknown): CompositingError {
    if (err instanceof Error && err.name === "AbortError") {
      return { code: "TIMEOUT", message: `Image generation exceeded ${COMPOSE_TIMEOUT_MS}ms.`, retryable: true };
    }
    if (this.isApiError(err)) {
      if (err.status === 401 || err.status === 403) {
        return { code: "AUTH_ERROR", message: "AI provider rejected the API key.", retryable: false };
      }
      if (err.status === 429) {
        // The most likely real-world cause for this specific service:
        // image generation has no free tier at all (see the file
        // header), so a 429 here very often means billing isn't linked
        // yet, not ordinary rate-limiting — surfaced in the message
        // since it changes what the user needs to do about it.
        return {
          code: "RATE_LIMITED",
          message:
            "AI provider rate-limited or quota-blocked this request. Image generation has no free tier — " +
            "confirm Cloud Billing is linked to your Google AI Studio project, not just a consumer " +
            "subscription, then try again.",
          retryable: true,
        };
      }
      const retryable = err.status >= 500;
      return { code: "PROVIDER_ERROR", message: `AI provider error: ${err.message}`, retryable };
    }
    return {
      code: "UNKNOWN",
      message: err instanceof Error ? err.message : "Unknown error generating the image.",
      retryable: false,
    };
  }

  private isApiError(err: unknown): err is { status: number; message: string } {
    return typeof err === "object" && err !== null && "status" in err && typeof (err as { status: unknown }).status === "number";
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
