import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { mutateDb, readDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { newId } from "@/lib/id";
import { rankCandidates } from "@/lib/recommend";

/**
 * FR-03/FR-04/FR-05: Room Photo Upload, AI Room Analysis, and AI
 * Furniture Placement & Visualization.
 *
 * The documentation (Section 5.2.3) specifies a two-stage pipeline: a
 * fine-tuned CV backbone extracts room attributes (type, style, empty
 * space, palette), then a weighted-similarity formula ranks catalogue
 * candidates against those attributes. Training and hosting a real CV
 * model is out of scope for this prototype - instead, attribute
 * extraction (this route) uses Claude's vision input to read the room
 * photo directly, and the *documented scoring formula itself* runs
 * unchanged in src/lib/recommend.ts against the live product catalogue.
 * This keeps Stage 2 (matching) faithful to the spec while swapping
 * Stage 1 (perception) for a multimodal LLM call instead of a trained
 * backbone - the same "pre-trained model instead of training from
 * scratch" risk-reduction the documentation itself argues for (Section
 * 1.3.1), just using a different pre-trained model.
 *
 * What this route does NOT do: composite product cutouts into the room
 * photo at estimated scale/position (the "staged image" in Section
 * 5.2.3's Stage 2). That needs real image segmentation and perspective
 * warping, which is future work (README). Instead this returns a
 * ranked, purchasable product list with per-item match scores and
 * reasons grounded in what the model saw - the FR-05 requirement's
 * substance (pick suitable, purchasable products for this room) without
 * the pixel-compositing step.
 */

const ALLOWED_MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
type AllowedMediaType = (typeof ALLOWED_MEDIA_TYPES)[number];
function isAllowedMediaType(value: string): value is AllowedMediaType {
  return (ALLOWED_MEDIA_TYPES as readonly string[]).includes(value);
}

const STYLE_VOCAB = [
  "scandinavian", "minimalist", "boutique", "natural", "artisan", "earthy",
  "luxury", "modern", "statement", "gold-accent", "traditional", "carved-wood",
  "heritage", "formal", "upholstered", "family", "classic-modern", "budget", "functional",
];
const COLOUR_VOCAB = [
  "grey", "light grey", "charcoal", "beige", "tan", "oak", "light oak", "white",
  "natural", "cream", "terracotta", "rust", "emerald", "gold", "blush",
  "white marble", "deep red", "dark wood", "maroon", "dark walnut", "raw oak",
];
const ROOM_TYPES = ["living room", "dining room", "bedroom", "office", "outdoor", "entryway"];

interface AIAttributes {
  roomType: string;
  confidence: number;
  styleTags: string[];
  palette: string[];
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not set on the server. Add it to .env.local and restart." },
      { status: 500 }
    );
  }

  let body: { image?: string; mediaType?: string; budget?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const { image, mediaType, budget } = body;
  if (!image || !mediaType) {
    return NextResponse.json(
      { error: "Expected { image: base64String, mediaType: string }." },
      { status: 400 }
    );
  }
  if (!isAllowedMediaType(mediaType)) {
    return NextResponse.json({ error: `Unsupported image type: ${mediaType}` }, { status: 400 });
  }

  const client = new Anthropic();
  const prompt = `You are the room-analysis stage of ZAWIYA, a furniture-marketplace app. A customer has sent a photo of a room they want to furnish.

Look at the room photo and identify:
1. roomType - pick exactly one from: ${ROOM_TYPES.join(", ")}. If none clearly fits, pick the closest.
2. confidence - your confidence (0.0 to 1.0) that you could read the room well enough to recommend furniture. Lower this for very dark, blurry, extremely cluttered, or heavily cropped photos.
3. styleTags - 1 to 4 tags describing the room's existing style, chosen ONLY from this list: ${STYLE_VOCAB.join(", ")}.
4. palette - 1 to 3 dominant colours you see, chosen ONLY from this list (pick the closest matches even if not exact): ${COLOUR_VOCAB.join(", ")}.

Respond with ONLY a JSON object, no markdown fences, no commentary, in exactly this shape:
{"roomType": "...", "confidence": 0.0, "styleTags": ["..."], "palette": ["..."]}`;

  let responseText: string;
  try {
    const message = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 1024,
      output_config: { effort: "medium" },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: image } },
            { type: "text", text: prompt },
          ],
        },
      ],
    });

    if (message.stop_reason === "refusal") {
      return NextResponse.json({ error: "The model declined to analyze this image." }, { status: 422 });
    }
    const textBlock = message.content.find((b) => b.type === "text");
    responseText = textBlock && "text" in textBlock ? textBlock.text : "";
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      return NextResponse.json({ error: "Invalid ANTHROPIC_API_KEY." }, { status: 500 });
    }
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: "Rate limited by the AI provider - try again shortly." }, { status: 429 });
    }
    if (err instanceof Anthropic.APIError) {
      return NextResponse.json({ error: `AI provider error: ${err.message}` }, { status: 502 });
    }
    return NextResponse.json({ error: "Unexpected error analyzing the photo." }, { status: 500 });
  }

  let attrs: AIAttributes;
  try {
    const cleaned = responseText.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    const parsed = JSON.parse(cleaned);
    attrs = {
      roomType: typeof parsed.roomType === "string" ? parsed.roomType : "living room",
      confidence: typeof parsed.confidence === "number" ? Math.max(0, Math.min(1, parsed.confidence)) : 0.5,
      styleTags: Array.isArray(parsed.styleTags) ? parsed.styleTags.filter((t: unknown) => typeof t === "string") : [],
      palette: Array.isArray(parsed.palette) ? parsed.palette.filter((t: unknown) => typeof t === "string") : [],
    };
  } catch {
    return NextResponse.json({ error: "Could not parse the AI's response. Try again." }, { status: 502 });
  }

  // Scenario 4 (Section 4.3): low-confidence result -> ask for a retake
  // instead of showing unreliable recommendations.
  const LOW_CONFIDENCE_THRESHOLD = 0.45;
  if (attrs.confidence < LOW_CONFIDENCE_THRESHOLD) {
    mutateDb((db) => {
      db.roomScans.push({
        id: newId("room"),
        userId: user.id,
        roomType: attrs.roomType,
        styleTags: attrs.styleTags,
        palette: attrs.palette,
        confidence: attrs.confidence,
        createdAt: new Date().toISOString(),
      });
    });
    return NextResponse.json({
      lowConfidence: true,
      confidence: attrs.confidence,
      message:
        "This photo couldn't be analyzed confidently. Try better lighting, framing the whole room, and reducing clutter.",
    });
  }

  const db = readDb();
  const activeShopIds = new Set(db.shops.filter((s) => s.status === "active").map((s) => s.id));
  const candidates = db.products.filter((p) => activeShopIds.has(p.shopId));
  const ranked = rankCandidates(
    candidates,
    { roomType: attrs.roomType, styleTags: attrs.styleTags, palette: attrs.palette },
    budget,
    6
  );

  const shopsById = new Map(db.shops.map((s) => [s.id, s]));
  const recommendations = ranked.map((r) => ({
    product: r.product,
    shopName: shopsById.get(r.product.shopId)?.name ?? "Shop",
    matchScore: r.matchScore,
    reason: r.reason,
  }));

  mutateDb((db) => {
    db.roomScans.push({
      id: newId("room"),
      userId: user.id,
      roomType: attrs.roomType,
      styleTags: attrs.styleTags,
      palette: attrs.palette,
      confidence: attrs.confidence,
      createdAt: new Date().toISOString(),
    });
  });

  return NextResponse.json({
    lowConfidence: false,
    roomType: attrs.roomType,
    confidence: attrs.confidence,
    styleTags: attrs.styleTags,
    palette: attrs.palette,
    recommendations,
  });
}
