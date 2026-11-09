/**
 * Isolated AI Vision service: "photo of an empty room" -> "furniture
 * placements matched to partner catalog products."
 *
 * Framework-agnostic by design — no Next.js/Express imports, no database
 * access, no routing. Your existing controller owns receiving the upload
 * (multer, formidable, a signed-URL download, whatever) and just hands
 * this service a Buffer + mime type:
 *
 *   const service = new RoomVisionService({ searchPartnerCatalog });
 *   const result = await service.analyzeRoom(imageBuffer, mimeType);
 *   if (!result.ok) {
 *     return res.status(statusForError(result.error.code)).json(result.error);
 *   }
 *   return res.json(result.data);
 *
 * Vision provider: Google's Gemini API (@google/genai), cycling through
 * a short list of free-tier, vision-capable models (no billing account
 * required, verified against ai.google.dev's own pricing page) rather
 * than committing to one — see DEFAULT_MODEL_FALLBACKS below for why a
 * single fixed model isn't reliable on the free tier. Chosen to avoid
 * the per-token cost of the Claude/OpenAI versions this file has also
 * been. Swapping providers again only touches `callVisionModel` below;
 * everything else — catalog matching, fallback logic, the response
 * shape — is unchanged across all three providers this file has run on.
 *
 * Trade-off: the free tier is rate-limited (a handful of requests per
 * minute/day, not published as a hard number by Google at the time of
 * writing) and individual models intermittently return 503s under load
 * (handled by the fallback above) — fine for development and a
 * prototype like this one, not
 * for production traffic. If you outgrow it, this is the one file that
 * needs to change.
 *
 * Honesty note on bounding boxes: a general-purpose multimodal vision
 * model is not a trained object-detection/segmentation network. The
 * bounding boxes it returns are a best-effort visual estimate ("roughly
 * here, roughly this big"), not pixel-accurate geometry. That's good
 * enough to anchor a product thumbnail/pin in the right neighborhood of
 * the photo; it is not a substitute for real segmentation if your
 * product later needs precise to-scale overlay compositing.
 */

import { GoogleGenAI, MediaResolution, Type, type Schema } from "@google/genai";

// ---------------------------------------------------------------------------
// Public contracts
// ---------------------------------------------------------------------------

/** One partner-catalog hit, exactly as your existing search already returns it. */
export interface CatalogMatch {
  productId: string;
  /** 0..1 similarity/relevance score. */
  score: number;
  category?: string;
}

/**
 * The dependency you already have — "assume a function
 * searchPartnerCatalog(query/embedding) already exists." This service
 * takes it as an injected dependency (constructor param) rather than
 * importing it directly, so:
 *   - this file has zero coupling to your DB/search implementation,
 *   - you can swap keyword search for a vector/embedding search later
 *     without touching this file,
 *   - it's trivially mockable in tests.
 */
export type SearchPartnerCatalog = (
  query: string,
  options?: { category?: string; limit?: number }
) => Promise<CatalogMatch[]>;

/** The customer's own stated design direction, collected by the UI
 *  before the scan runs (a style pick and/or a few preferred colours).
 *  Both optional — when neither is given, the model falls back to
 *  reading the room's own existing style the way it always has. */
export interface DesignPreferences {
  style?: string;
  colors?: string[];
}

/** Fractions (0..1) of image width/height — resolution-independent, so
 *  whatever size your client renders the photo at, it scales trivially:
 *  pixelX = box.x * renderedWidth, etc. */
export interface NormalizedBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FurniturePlacement {
  spaceId: string;
  /** Human-readable label the model gave this space, e.g. "empty corner
   *  left of the window" — useful for a UI caption and for debugging. */
  description: string;
  category: string;
  boundingBox: NormalizedBoundingBox;
  /** Which way the piece should face/sit once placed, in the model's
   *  own words — e.g. "facing into the room, back against the wall"
   *  or "angled toward the seating area for conversation." This is
   *  the "place it like a human would" half of the analysis: a
   *  bounding box alone says *where*; this says *which way it should
   *  turn to actually look right there*. Fed into the compositing
   *  stage (RoomCompositingService) as part of its placement hint. */
  orientation: string;
  productId: string | null;
  matchConfidence: number;
  fallback: {
    used: boolean;
    reason?: "no_catalog_match" | "below_confidence_threshold" | "catalog_search_failed";
  };
}

export interface RoomVisionPayload {
  roomType: string;
  styleTags: string[];
  analysisConfidence: number;
  /** The model's estimate of the room's own usable floor/wall extent in
   *  the photo — not a product placement, just the space everything
   *  else has to fit inside of. Every placement's boundingBox is
   *  expected to sit within this region; see MIN_ROOM_OVERLAP_RATIO. */
  roomBoundary: NormalizedBoundingBox;
  placements: FurniturePlacement[];
}

export type VisionErrorCode =
  | "INVALID_IMAGE"
  | "TIMEOUT"
  | "RATE_LIMITED"
  | "AUTH_ERROR"
  | "PROVIDER_ERROR"
  | "MODEL_REFUSED"
  | "UNPARSEABLE_RESPONSE"
  | "LOW_CONFIDENCE"
  | "UNKNOWN";

export interface VisionError {
  code: VisionErrorCode;
  message: string;
  /** Whether it's worth letting the client retry the same request
   *  as-is (true), vs. needing a different photo/input (false) — maps
   *  cleanly to "show a Retry button" vs. "show a specific message." */
  retryable: boolean;
}

export type RoomVisionResult =
  | { ok: true; data: RoomVisionPayload }
  | { ok: false; error: VisionError };

// ---------------------------------------------------------------------------
// Tunables
// ---------------------------------------------------------------------------

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // comfortably under the provider's own limit
const VISION_TIMEOUT_MS = 30_000;
const RETRY_BASE_DELAY_MS = 500;
const MATCH_CONFIDENCE_THRESHOLD = 0.6;
const FALLBACK_CONFIDENCE_THRESHOLD = 0.45; // a looser bar for the broadened fallback query
const LOW_CONFIDENCE_THRESHOLD = 0.45; // below this, the photo itself is the problem

// Spatial-coherence checks, enforced in code rather than left to the
// model's own diligence — prompting alone is not reliable for "don't
// suggest a sofa, a desk, and a dining set that would all overlap in
// the same spot." These run on the already-parsed boxes:
//   - a space whose box barely sits inside the model's own reported
//     room boundary is almost certainly a mis-estimate (half off-frame,
//     or describing something outside the room entirely) and is dropped;
//   - two spaces whose boxes overlap substantially can't both hold a
//     full-size piece of furniture at once — the later one in the
//     model's own list (treated as the lower-priority suggestion) is
//     dropped rather than silently rendering two products stacked on
//     top of each other.
const MIN_ROOM_OVERLAP_RATIO = 0.5; // a space must have ≥50% of its area inside the room boundary
const MAX_SPACE_OVERLAP_RATIO = 0.25; // two spaces overlapping more than this can't coexist

// finishReason values that mean "the model declined to answer", not "it
// finished normally" — anything that isn't a plain stop or a length cap.
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

// ---------------------------------------------------------------------------
// Shape the model is forced to return, via Gemini's native structured-
// output mode (responseMimeType + responseSchema) rather than free-text
// JSON. This is what makes "robust" actually true here: no regex-
// stripping markdown fences, no hoping the model obeys a "respond with
// ONLY json" instruction — the API itself constrains generation to this
// schema.
// ---------------------------------------------------------------------------

interface RawDetectedSpace {
  description: string;
  category: string;
  search_query: string;
  orientation: string;
  bounding_box: { x: number; y: number; width: number; height: number };
}

interface RawAnalysis {
  room_type: string;
  confidence: number;
  style_tags: string[];
  room_boundary: { x: number; y: number; width: number; height: number };
  detected_spaces: RawDetectedSpace[];
}

const BOUNDING_BOX_SCHEMA: Schema = {
  type: Type.OBJECT,
  description:
    "Your best visual estimate of this space's position, as fractions (0-1) of image width/height — not pixel coordinates.",
  properties: {
    x: { type: Type.NUMBER },
    y: { type: Type.NUMBER },
    width: { type: Type.NUMBER },
    height: { type: Type.NUMBER },
  },
  required: ["x", "y", "width", "height"],
};

/**
 * Builds the detected-space schema, optionally constraining `category`
 * to an exact enum via Gemini's `format: "enum"` — this is the single
 * biggest lever for analysis quality against a real catalogue: without
 * it, the model is free to say "coffee table" or "accent chair" or
 * "side table," and the catalog-matching stage has to *guess* which of
 * your actual categories that maps to (see zawiyaCatalogAdapter.ts's
 * keyword heuristic). With it, the model is constrained at generation
 * time to one of the categories you actually sell, so that guesswork
 * stage becomes a plain equality check instead of a heuristic. Omit
 * `categoryVocabulary` to fall back to free-text category (useful if
 * this service is reused against a catalog with no fixed taxonomy).
 */
function buildDetectedSpaceSchema(categoryVocabulary?: string[]): Schema {
  return {
    type: Type.OBJECT,
    properties: {
      description: {
        type: Type.STRING,
        description: "short human-readable label naming where this space is, e.g. 'empty corner by the window'",
      },
      category: categoryVocabulary
        ? {
            type: Type.STRING,
            format: "enum",
            enum: categoryVocabulary,
            description: "the single closest category from this exact list — pick the nearest real match even if imperfect",
          }
        : {
            type: Type.STRING,
            description: "furniture category that would fit here, e.g. sofa, armchair, floor lamp, dining table",
          },
      search_query: {
        type: Type.STRING,
        description:
          "a short, generic retail search phrase for this spot (2-4 words, e.g. 'grey fabric sofa', 'oak floor lamp') — the kind of phrase a furniture store's own search bar would match, not a full sentence",
      },
      orientation: {
        type: Type.STRING,
        description:
          "which way this piece should face once placed, the way a person actually arranging furniture would decide — e.g. 'facing into the room, back against the wall', 'angled toward the seating area for conversation', 'facing the window', 'aligned square with the wall behind it, front toward the walkway'. Base this on the room's real perspective and what's already in it (face seating toward a TV or the room's open centre, not into a corner; keep a reading lamp upright beside where someone would sit; keep a desk's front edge facing into the room, not against the wall it already meets at the side).",
      },
      bounding_box: BOUNDING_BOX_SCHEMA,
    },
    required: ["description", "category", "search_query", "orientation", "bounding_box"],
  };
}

function buildAnalysisSchema(categoryVocabulary?: string[]): Schema {
  return {
    type: Type.OBJECT,
    properties: {
      room_type: {
        type: Type.STRING,
        description: "e.g. living room, bedroom, dining room, office, outdoor, entryway",
      },
      confidence: {
        type: Type.NUMBER,
        description:
          "0.0-1.0 confidence that the photo itself was clear enough to analyze reliably (lighting, framing, blur, obstruction). This reflects image quality only — a clear photo with few genuine placement opportunities is still high confidence.",
      },
      style_tags: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "1-4 short tags describing the room's existing décor style.",
      },
      room_boundary: {
        ...BOUNDING_BOX_SCHEMA,
        description:
          "The overall usable floor/wall extent of the room itself, as fractions (0-1) of image width/height — the visible walls, floor and ceiling that bound the space, not any one piece of furniture. Every detected space must sit inside this region; nothing you suggest should extend past the room's own visible edges (a doorway into another room, a window view outside, or the edge of the photo itself).",
      },
      detected_spaces: {
        type: Type.ARRAY,
        description:
          "Every distinct empty area where one piece of furniture or decor could realistically go, chosen and oriented the way an experienced interior designer presenting a full room concept would — spread across different categories (seating, lighting, wall art/decor, storage/console, and more), not just the single most obvious spot. Aim to furnish the whole room: most rooms with genuine wall and floor space to spare can realistically take 4-7 well-chosen pieces across those categories, not just 1-2. Only return a shorter list when the room is genuinely small, already furnished, or has no plausible spot left for another category. Do not suggest furniture that would duplicate a piece already clearly present and adequate in the room. Before finalizing this list, mentally place every suggested item into the room at the same time: none of their bounding boxes should overlap each other, and all of them together should plausibly coexist in the room's actual floor area without being impossibly crowded — if two items in the same category would conflict, keep only the one you're more confident about, but don't let that reduce coverage of the other categories. Empty array if no genuine opportunity exists at all.",
        items: buildDetectedSpaceSchema(categoryVocabulary),
      },
    },
    required: ["room_type", "confidence", "style_tags", "room_boundary", "detected_spaces"],
  };
}

/** The per-request user-turn text sent alongside the room photo — folds
 *  in the customer's stated style/colour preference (if any) so it's
 *  the first thing the model reads, not buried in the system prompt. */
function buildUserPromptText(preferences?: DesignPreferences): string {
  const base = "Analyze this room photo and find every genuine furniture-placement opportunity in it.";
  const style = preferences?.style?.trim();
  const colors = preferences?.colors?.filter((c) => c.trim().length > 0) ?? [];
  if (!style && colors.length === 0) return base;

  const parts: string[] = [];
  if (style) parts.push(`a ${style} style`);
  if (colors.length > 0) parts.push(`a colour palette built around ${colors.join(", ")}`);
  return (
    base +
    ` The customer has asked for ${parts.join(
      " and "
    )} — use this as your primary guide for which categories, search queries and colours to choose; every suggested search_query should reflect it where a genuine match is plausible, and the colours you choose across every suggested piece should read as one deliberately coordinated palette built around what the customer asked for, not a generic guess at the room's existing style.`
  );
}

const SYSTEM_INSTRUCTION =
  "You are an experienced interior designer acting as the vision-analysis stage of a furniture " +
  "marketplace app's AI Room-Fit feature. A customer has photographed their room and wants to see " +
  "it fully furnished and styled — a complete, cohesive room design across multiple categories " +
  "(seating, lighting, wall art/decor, storage or a console/stand, and more), not just the single " +
  "most obvious missing piece. Think the way a human designer presenting a full room concept would: " +
  "read the room first, then furnish it properly. " +
  "\n\n" +
  "1. READ THE ROOM. Identify its function and its focal point — a TV, a fireplace, a window " +
  "with a view, a dining table — and the walkways people actually use to move through it " +
  "(doorways, the path between furniture). Identify what's already there and working, so you " +
  "never suggest a duplicate of a piece that's already adequate. " +
  "\n\n" +
  "2. FURNISH THE WHOLE ROOM, ACROSS CATEGORIES. Don't stop after finding one good spot — actively " +
  "look for a genuine opportunity in each of these categories before moving on, the way a designer " +
  "presenting a full room board would: a seating piece (sofa/chair/armchair) near the focal point; " +
  "a lighting piece (floor lamp, wall lamp, or pendant) where light is actually needed; wall art or " +
  "decor on a bare wall at eye level; and a console, storage piece, or stand against a free wall. " +
  "Only skip a category if the room genuinely has no plausible spot for it (e.g. no bare wall for " +
  "art, or no floor space for another seat) — don't skip it just to keep the list short. Each spot " +
  "still has to be one a human would actually use: no crowding, no blocking a walkway or doorway, " +
  "and related to the room's real use — seating within conversation distance of other seating, not " +
  "isolated facing a blank wall; a lamp beside where someone would actually sit or read; storage or " +
  "a console flush against a wall, not jutting into the walking path; a desk or dining piece with " +
  "room to pull a chair out. " +
  "\n\n" +
  "3. STYLE IT LIKE A PROFESSIONAL — COORDINATE THE PALETTE. Every `search_query` you write across " +
  "the whole set of detected spaces should read like it came from one stylist's single moodboard, " +
  "not a pile of independent guesses. Before finalizing, look at the colours and materials implied " +
  "by every search_query together: pick a small, deliberate palette (e.g. warm neutrals with one " +
  "wood tone, or a cool grey-and-black scheme with a single accent colour) and keep every piece's " +
  "stated colour within that story — complementary or tonal, never a piece that would visually clash " +
  "against the others once all of them are in the same photo. A room styled well usually repeats " +
  "2-3 colours/materials across its pieces rather than introducing a new, unrelated colour for every " +
  "single item. If the room's existing furniture or walls already lean a certain way (warm wood, " +
  "cool grey, etc.), let that anchor the palette unless the customer's own stated preference (see " +
  "below, when given) says otherwise. " +
  "\n\n" +
  "4. GET THE ANGLE RIGHT. For every space, decide which way that piece should face once placed — " +
  "the single most important thing a human would get right that a careless placement wouldn't: " +
  "seating generally faces into the room or toward the focal point, not into a corner; a piece " +
  "against a wall sits flush and square with that wall, not at a random angle; a desk's working " +
  "front faces into the room, not the wall; a floor lamp stands upright near where its light is " +
  "actually needed; wall art hangs flat against the wall at eye level. Say this plainly in the " +
  "orientation field (e.g. 'facing the window, back against the opposite wall' or 'angled toward " +
  "the existing armchair for conversation'). " +
  "\n\n" +
  "5. RESPECT THE ROOM'S OWN LIMITS. First identify the room's own boundary — its visible walls, " +
  "floor and ceiling — and treat that as a hard limit: nothing you suggest may extend past it, " +
  "into a doorway to another room, out a window, or off the edge of the photo. " +
  "\n\n" +
  "6. CHECK THE WHOLE SCENE AT ONCE, not a list of independent guesses: before finalizing, " +
  "mentally place every suggested item into the room at the same time and check that none of " +
  "them physically overlap and that they could all realistically coexist in the room's actual " +
  "floor area — a sofa, a desk and a full dining set rarely fit in the same small room at once, " +
  "so if two suggestions in the *same* category would conflict, keep only the one you're more " +
  "confident about, but don't let that trim your coverage of the *other* categories above. " +
  "\n\n" +
  "Aim for a well-rounded, fully furnished result, not a minimal one — most rooms with genuine " +
  "wall and floor space to spare can realistically take 4-7 well-chosen pieces spread across " +
  "those categories. Only fall back to a shorter list when the room is genuinely too small or " +
  "already too full for more. If the user-turn message states a style and/or colour preference, " +
  "treat that as overriding guidance for point 3's palette and for which categories/search queries " +
  "to favour. Respond with your structured findings in the required schema.";

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

// Google's free tier spreads load across several model variants, and
// which one is momentarily overloaded (HTTP 503 "experiencing high
// demand") shifts from minute to minute — observed directly: at one
// point gemini-3.8-flash, gemini-3.5-flash-lite, and gemini-3.1-flash-lite
// were all 503-ing while gemini-3.6-flash alone worked, and that mix
// changes. Picking one fixed model to dodge today's congestion just
// means hitting tomorrow's, so this service tries a short list of
// free-tier models in order instead of just one.
const DEFAULT_MODEL_FALLBACKS = ["gemini-3.6-flash", "gemini-3.8-flash", "gemini-3.5-flash-lite"];
const RETRIES_PER_MODEL = 1; // 2 attempts on a given model before moving to the next one

export class RoomVisionService {
  private readonly client: GoogleGenAI;
  private readonly searchPartnerCatalog: SearchPartnerCatalog;
  private readonly models: string[];
  private readonly analysisSchema: Schema;

  constructor(deps: {
    searchPartnerCatalog: SearchPartnerCatalog;
    /** Your catalog's real category taxonomy (e.g. ["sofa", "bed",
     *  "chair", ...]). When provided, the model is constrained to pick
     *  exactly one of these for every detected space — see
     *  buildDetectedSpaceSchema's comment for why this is the single
     *  biggest lever on match quality. Omit it to let the model use
     *  free-text categories instead. */
    categoryVocabulary?: string[];
    /** Falls back to GOOGLE_API_KEY, then GEMINI_API_KEY, if omitted —
     *  that's the SDK's own resolution order, not something this file
     *  implements. */
    geminiApiKey?: string;
    /** Inject a pre-built (or mocked) client in tests. */
    geminiClient?: GoogleGenAI;
    /** Tried in order; the first model that answers wins. Defaults to a
     *  short list of free-tier, vision-capable Gemini models, to absorb
     *  one of them being temporarily overloaded (see the comment above
     *  DEFAULT_MODEL_FALLBACKS). Pass a single paid model id here (as a
     *  one-element array) once you outgrow the free tier. */
    models?: string[];
  }) {
    this.searchPartnerCatalog = deps.searchPartnerCatalog;
    this.client = deps.geminiClient ?? new GoogleGenAI({ apiKey: deps.geminiApiKey });
    this.models = deps.models && deps.models.length > 0 ? deps.models : DEFAULT_MODEL_FALLBACKS;
    this.analysisSchema = buildAnalysisSchema(deps.categoryVocabulary);
  }

  /**
   * Full pipeline: validate -> vision analysis -> catalog-match every
   * detected space -> clean payload.
   *
   * Never throws. Every failure mode — a bad upload, a provider timeout,
   * a rate limit, a refusal, an unparseable response, a too-blurry photo
   * — comes back as `{ ok: false, error }` so the controller doesn't
   * need try/catch or any Gemini-SDK-specific knowledge.
   *
   * `preferences` is the customer's own stated style/colour direction,
   * collected by the UI before the scan runs — when given, it's handed
   * to the model as explicit guidance so every `search_query` it writes
   * (and therefore every catalog match) leans toward that look, instead
   * of the model guessing a style from the room photo alone.
   */
  async analyzeRoom(
    image: Buffer,
    mimeType: string,
    preferences?: DesignPreferences
  ): Promise<RoomVisionResult> {
    const validation = this.validateImage(image, mimeType);
    if (!validation.ok) return { ok: false, error: validation.error };

    const analysisResult = await this.callVisionModel(image, validation.mimeType, preferences);
    if (!analysisResult.ok) return analysisResult;
    const analysis = analysisResult.data;

    if (analysis.confidence < LOW_CONFIDENCE_THRESHOLD) {
      return {
        ok: false,
        error: {
          code: "LOW_CONFIDENCE",
          message:
            "The photo couldn't be read confidently enough to recommend placements. Ask for better lighting, a wider framing, or less clutter.",
          retryable: true,
        },
      };
    }

    const placements = await this.matchSpacesToCatalog(analysis.detected_spaces);

    return {
      ok: true,
      data: {
        roomType: analysis.room_type,
        styleTags: analysis.style_tags,
        analysisConfidence: analysis.confidence,
        roomBoundary: analysis.room_boundary,
        placements,
      },
    };
  }

  // -- Stage 0: input validation -------------------------------------------

  private validateImage(
    image: Buffer,
    mimeType: string
  ): { ok: true; mimeType: string } | { ok: false; error: VisionError } {
    if (!Buffer.isBuffer(image) || image.byteLength === 0) {
      return { ok: false, error: { code: "INVALID_IMAGE", message: "No image data received.", retryable: false } };
    }
    if (image.byteLength > MAX_IMAGE_BYTES) {
      return {
        ok: false,
        error: {
          code: "INVALID_IMAGE",
          message: `Image is too large (${(image.byteLength / 1024 / 1024).toFixed(1)}MB, max ${
            MAX_IMAGE_BYTES / 1024 / 1024
          }MB).`,
          retryable: false,
        },
      };
    }
    if (!isAllowedMimeType(mimeType)) {
      return {
        ok: false,
        error: { code: "INVALID_IMAGE", message: `Unsupported image type: ${mimeType}`, retryable: false },
      };
    }
    return { ok: true, mimeType };
  }

  // -- Stage 1: AI vision analysis -----------------------------------------

  private async callVisionModel(
    image: Buffer,
    mimeType: string,
    preferences?: DesignPreferences
  ): Promise<{ ok: true; data: RawAnalysis } | { ok: false; error: VisionError }> {
    const base64 = image.toString("base64");
    const promptText = buildUserPromptText(preferences);

    let lastError: VisionError = {
      code: "UNKNOWN",
      message: "Exhausted retries without a result.",
      retryable: false,
    };

    // Outer loop over models, inner loop over retries *for that model*.
    // A capacity error (503) means the model itself is the problem, not
    // this particular request — retrying the same overloaded model
    // repeatedly wastes the whole request's time budget on something
    // unlikely to recover in seconds; moving to the next model is a much
    // better use of a retry than hammering the one that's down.
    for (const model of this.models) {
      for (let attempt = 0; attempt <= RETRIES_PER_MODEL; attempt++) {
        try {
          const response = await this.client.models.generateContent({
            model,
            contents: [
              {
                role: "user",
                parts: [
                  { text: promptText },
                  { inlineData: { data: base64, mimeType } },
                ],
              },
            ],
            config: {
              systemInstruction: SYSTEM_INSTRUCTION,
              responseMimeType: "application/json",
              responseSchema: this.analysisSchema,
              // Per Gemini's own docs, "high" is a smarter zoomed/
              // reframed read of the image at the same 256-token budget
              // as "medium" (not a bigger token cost) — this is the
              // lever for the model actually resolving fine detail like
              // room edges and where one piece of furniture ends and
              // the next begins, rather than leaving resolution
              // unspecified.
              mediaResolution: MediaResolution.MEDIA_RESOLUTION_HIGH,
              abortSignal: AbortSignal.timeout(VISION_TIMEOUT_MS),
            },
          });

          const blockReason = response.promptFeedback?.blockReason;
          if (blockReason) {
            return {
              ok: false,
              error: { code: "MODEL_REFUSED", message: `The model declined to analyze this image (${blockReason}).`, retryable: false },
            };
          }

          const finishReason = response.candidates?.[0]?.finishReason;
          if (finishReason && REFUSAL_FINISH_REASONS.has(finishReason)) {
            return {
              ok: false,
              error: { code: "MODEL_REFUSED", message: `The model declined to analyze this image (${finishReason}).`, retryable: false },
            };
          }

          const text = response.text;
          if (!text) {
            return {
              ok: false,
              error: { code: "UNPARSEABLE_RESPONSE", message: "Model did not return structured analysis.", retryable: true },
            };
          }

          let rawInput: unknown;
          try {
            rawInput = JSON.parse(text);
          } catch {
            return {
              ok: false,
              error: { code: "UNPARSEABLE_RESPONSE", message: "Model's structured response was not valid JSON.", retryable: true },
            };
          }

          const parsed = this.coerceAnalysis(rawInput);
          if (!parsed) {
            return {
              ok: false,
              error: { code: "UNPARSEABLE_RESPONSE", message: "Model's structured response was malformed.", retryable: true },
            };
          }
          return { ok: true, data: parsed };
        } catch (err) {
          lastError = this.classifyProviderError(err);
          if (!lastError.retryable) {
            // Auth/bad-request errors are about the key or the request
            // itself, not this model — every other model would fail the
            // same way, so there's no point cycling through them.
            return { ok: false, error: lastError };
          }
          const isLastAttemptForThisModel = attempt === RETRIES_PER_MODEL;
          if (!isLastAttemptForThisModel) {
            // Exponential backoff with jitter before retrying the same
            // model once more.
            await this.delay(RETRY_BASE_DELAY_MS * 2 ** attempt + Math.random() * 200);
          }
          // Either way, fall through to the next retry (same model) or
          // the next model (outer loop) once this model's retries run out.
        }
      }
    }

    return { ok: false, error: lastError };
  }

  /** Gemini's SDK exposes a single ApiError (with a numeric `.status`)
   *  rather than Claude's/OpenAI's per-case subclasses — so the
   *  classification happens on the status code directly. A cancelled
   *  AbortSignal surfaces as a plain DOMException named "AbortError",
   *  independent of ApiError, and is checked first. */
  private classifyProviderError(err: unknown): VisionError {
    if (err instanceof Error && err.name === "AbortError") {
      return { code: "TIMEOUT", message: `AI vision call exceeded ${VISION_TIMEOUT_MS}ms.`, retryable: true };
    }
    if (this.isApiError(err)) {
      if (err.status === 401 || err.status === 403) {
        return { code: "AUTH_ERROR", message: "AI vision provider rejected the API key.", retryable: false };
      }
      if (err.status === 429) {
        return {
          code: "RATE_LIMITED",
          message: "AI vision provider rate-limited this request (the free tier has tight request limits).",
          retryable: true,
        };
      }
      const retryable = err.status >= 500;
      return { code: "PROVIDER_ERROR", message: `AI vision provider error: ${err.message}`, retryable };
    }
    return {
      code: "UNKNOWN",
      message: err instanceof Error ? err.message : "Unknown error calling the AI vision provider.",
      retryable: false,
    };
  }

  private isApiError(err: unknown): err is { status: number; message: string } {
    return (
      typeof err === "object" &&
      err !== null &&
      "status" in err &&
      typeof (err as { status: unknown }).status === "number"
    );
  }

  /** Defensively re-validates the structured output at the boundary —
   *  `responseSchema` is a strong guarantee, not an absolute one worth
   *  trusting blindly across a network boundary. One malformed
   *  detected_space is dropped rather than failing the whole analysis. */
  private coerceAnalysis(input: unknown): RawAnalysis | null {
    if (typeof input !== "object" || input === null) return null;
    const obj = input as Record<string, unknown>;
    if (typeof obj.room_type !== "string") return null;
    if (typeof obj.confidence !== "number") return null;
    if (!Array.isArray(obj.style_tags)) return null;
    if (!Array.isArray(obj.detected_spaces)) return null;

    // A missing/malformed room_boundary degrades to "the whole frame,"
    // rather than failing the analysis outright — it's a defense-in-
    // depth aid for the spatial filter below, not core content worth
    // discarding a real analysis over.
    const roomBoundary = this.parseBoundingBox(obj.room_boundary) ?? { x: 0, y: 0, width: 1, height: 1 };

    const spaces: RawDetectedSpace[] = [];
    for (const raw of obj.detected_spaces) {
      if (typeof raw !== "object" || raw === null) continue;
      const s = raw as Record<string, unknown>;
      const bbox = this.parseBoundingBox(s.bounding_box);
      if (
        typeof s.description !== "string" ||
        typeof s.category !== "string" ||
        typeof s.search_query !== "string" ||
        !bbox
      ) {
        continue;
      }
      spaces.push({
        description: s.description,
        category: s.category,
        search_query: s.search_query,
        // Lenient on purpose, unlike the fields above: orientation is
        // descriptive guidance for the compositing stage, not load-
        // bearing for matching or geometry — a missing/malformed value
        // degrades to "no specific guidance" rather than discarding an
        // otherwise-valid detected space over it.
        orientation: typeof s.orientation === "string" ? s.orientation : "",
        bounding_box: bbox,
      });
    }

    return {
      room_type: obj.room_type,
      confidence: this.clamp01(obj.confidence),
      style_tags: obj.style_tags.filter((t): t is string => typeof t === "string"),
      room_boundary: roomBoundary,
      detected_spaces: this.enforceSpatialCoherence(spaces, roomBoundary),
    };
  }

  private parseBoundingBox(raw: unknown): NormalizedBoundingBox | null {
    if (typeof raw !== "object" || raw === null) return null;
    const b = raw as Record<string, unknown>;
    if (typeof b.x !== "number" || typeof b.y !== "number" || typeof b.width !== "number" || typeof b.height !== "number") {
      return null;
    }
    return {
      x: this.clamp01(b.x),
      y: this.clamp01(b.y),
      width: this.clamp01(b.width),
      height: this.clamp01(b.height),
    };
  }

  /**
   * Geometric cross-check across the *set* of detected spaces, run in
   * code rather than left entirely to the model's own diligence —
   * prompting reduces how often a model suggests a sofa, a desk, and a
   * dining set that would all occupy the same spot, but doesn't
   * guarantee it. This enforces it:
   *   1. drops any space mostly outside the model's own room_boundary
   *      (MIN_ROOM_OVERLAP_RATIO) — almost always a mis-estimate rather
   *      than a real opportunity just outside the frame;
   *   2. drops the later of any two spaces that overlap substantially
   *      (MAX_SPACE_OVERLAP_RATIO) — two full-size pieces of furniture
   *      can't occupy the same floor area, and the model's own ordering
   *      is treated as its rough priority/confidence order, so the
   *      earlier one wins.
   */
  private enforceSpatialCoherence(
    spaces: RawDetectedSpace[],
    roomBoundary: NormalizedBoundingBox
  ): RawDetectedSpace[] {
    const kept: RawDetectedSpace[] = [];
    for (const space of spaces) {
      const box = space.bounding_box;
      if (this.overlapRatio(box, roomBoundary) < MIN_ROOM_OVERLAP_RATIO) continue;
      if (kept.some((existing) => this.overlapRatio(box, existing.bounding_box) > MAX_SPACE_OVERLAP_RATIO)) continue;
      kept.push(space);
    }
    return kept;
  }

  /** Intersection area as a fraction of `box`'s own area (0..1) — not a
   *  symmetric IoU, deliberately: "is most of *this* box swallowed by
   *  the other one" is what decides both the room-boundary check and
   *  the pairwise-overlap check above, regardless of the other box's
   *  own size. */
  private overlapRatio(box: NormalizedBoundingBox, other: NormalizedBoundingBox): number {
    const boxArea = box.width * box.height;
    if (boxArea <= 0) return 0;
    const ix = Math.max(0, Math.min(box.x + box.width, other.x + other.width) - Math.max(box.x, other.x));
    const iy = Math.max(0, Math.min(box.y + box.height, other.y + other.height) - Math.max(box.y, other.y));
    return (ix * iy) / boxArea;
  }

  // -- Stage 2: catalog matching -------------------------------------------

  private matchSpacesToCatalog(spaces: RawDetectedSpace[]): Promise<FurniturePlacement[]> {
    // Independent per space and isolated per-item below, so one slow or
    // failing catalog lookup never blocks or fails the others.
    return Promise.all(spaces.map((space, i) => this.matchOneSpace(space, `space_${i}`)));
  }

  private async matchOneSpace(space: RawDetectedSpace, spaceId: string): Promise<FurniturePlacement> {
    const base = {
      spaceId,
      description: space.description,
      category: space.category,
      orientation: space.orientation,
      boundingBox: space.bounding_box,
    };

    // Primary attempt: the AI's specific query (style + category).
    let matches: CatalogMatch[];
    try {
      matches = await this.searchPartnerCatalog(space.search_query, { category: space.category, limit: 3 });
    } catch {
      return { ...base, productId: null, matchConfidence: 0, fallback: { used: true, reason: "catalog_search_failed" } };
    }

    const best = this.bestAbove(matches, MATCH_CONFIDENCE_THRESHOLD);
    if (best) {
      return { ...base, productId: best.productId, matchConfidence: best.score, fallback: { used: false } };
    }

    // Fallback: no exact match cleared the bar. Broaden to a
    // category-only search (drop style/colour qualifiers) with a looser
    // threshold before giving up entirely — a generic sofa beats no sofa.
    try {
      const broadened = await this.searchPartnerCatalog(space.category, { limit: 3 });
      const fallbackBest = this.bestAbove(broadened, FALLBACK_CONFIDENCE_THRESHOLD);
      if (fallbackBest) {
        return {
          ...base,
          productId: fallbackBest.productId,
          matchConfidence: fallbackBest.score,
          fallback: { used: true, reason: "below_confidence_threshold" },
        };
      }
    } catch {
      // The primary search already succeeded above, so a failure here
      // isn't a hard error — just fall through to "no match" below.
    }

    return { ...base, productId: null, matchConfidence: 0, fallback: { used: true, reason: "no_catalog_match" } };
  }

  private bestAbove(matches: CatalogMatch[], threshold: number): CatalogMatch | null {
    const sorted = [...matches].sort((a, b) => b.score - a.score);
    return sorted[0] && sorted[0].score >= threshold ? sorted[0] : null;
  }

  private clamp01(n: number): number {
    return Math.max(0, Math.min(1, n));
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
