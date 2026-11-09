import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { readDb } from "@/lib/db";
import { CATEGORY_LABELS } from "@/lib/types";
import { RoomVisionService, type VisionErrorCode } from "@/services/ai-vision/RoomVisionService";
import { searchZawiyaPartnerCatalog } from "@/services/ai-vision/zawiyaCatalogAdapter";

/**
 * Same request contract as /api/rooms/analyze (the original Claude-based
 * route): POST { image: base64String, mediaType: string }. This route
 * runs the same request through the newer, isolated RoomVisionService
 * instead — richer output (real bounding boxes, explicit no-match
 * states) and a provider-swappable implementation (RoomVisionService.ts
 * has now moved between Claude, OpenAI, and Gemini without this route
 * changing). It currently runs on Gemini's free tier, so this route
 * needs GEMINI_API_KEY (or GOOGLE_API_KEY) — the original
 * /api/rooms/analyze route is untouched and still needs ANTHROPIC_API_KEY.
 *
 * Named "v2" rather than naming a vendor, since which AI provider backs
 * it is exactly the thing meant to change without notice here.
 */

const ERROR_STATUS: Record<VisionErrorCode, number> = {
  INVALID_IMAGE: 400,
  TIMEOUT: 504,
  RATE_LIMITED: 429,
  AUTH_ERROR: 500,
  PROVIDER_ERROR: 502,
  MODEL_REFUSED: 422,
  UNPARSEABLE_RESPONSE: 502,
  LOW_CONFIDENCE: 200, // not a server error - a "retake the photo" response
  UNKNOWN: 500,
};

// Constructed lazily, not at module scope: the underlying AI client
// throws immediately if no API key is available, and module-scope code
// runs at import time — including during `next build`'s page-data
// collection, well before any request (or the explicit key check below)
// ever runs. A module-level `new RoomVisionService(...)` here would
// break the build itself whenever the key isn't set yet.
let roomVision: RoomVisionService | null = null;
function getRoomVisionService(): RoomVisionService {
  if (!roomVision) {
    roomVision = new RoomVisionService({
      searchPartnerCatalog: searchZawiyaPartnerCatalog,
      // Constrains the model's category output to ZAWIYA's real
      // taxonomy instead of open free text — see RoomVisionService's
      // own comment on buildDetectedSpaceSchema for why this is the
      // single biggest lever on match quality.
      categoryVocabulary: Object.keys(CATEGORY_LABELS),
    });
  }
  return roomVision;
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not set on the server. Add it to .env.local and restart." },
      { status: 500 }
    );
  }

  let body: { image?: string; mediaType?: string; style?: string; colors?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const { image, mediaType, style, colors } = body;
  if (!image || !mediaType) {
    return NextResponse.json(
      { error: "Expected { image: base64String, mediaType: string }." },
      { status: 400 }
    );
  }

  const imageBuffer = Buffer.from(image, "base64");
  // Style/colors are the customer's own stated direction, collected by
  // the UI before the scan runs — both optional, see RoomVisionService's
  // DesignPreferences comment for how this steers the whole analysis.
  const preferences =
    style || (colors && colors.length > 0) ? { style, colors } : undefined;
  const result = await getRoomVisionService().analyzeRoom(imageBuffer, mediaType, preferences);

  if (!result.ok) {
    if (result.error.code === "LOW_CONFIDENCE") {
      return NextResponse.json({ lowConfidence: true, message: result.error.message });
    }
    return NextResponse.json(
      { error: result.error.message, code: result.error.code, retryable: result.error.retryable },
      { status: ERROR_STATUS[result.error.code] }
    );
  }

  // RoomVisionService only knows productId — it was built decoupled from
  // any specific database on purpose. Resolve each match against the
  // real catalogue here, at the controller/route layer, so the frontend
  // gets full product details (name, price, image) instead of having to
  // make a second round trip per placement.
  const db = readDb();
  const productsById = new Map(db.products.map((p) => [p.id, p]));
  const shopsById = new Map(db.shops.map((s) => [s.id, s]));

  const placements = result.data.placements.map((placement) => {
    const product = placement.productId ? productsById.get(placement.productId) ?? null : null;
    const shop = product ? shopsById.get(product.shopId) ?? null : null;
    return {
      spaceId: placement.spaceId,
      description: placement.description,
      category: placement.category,
      orientation: placement.orientation,
      boundingBox: placement.boundingBox,
      matchConfidence: placement.matchConfidence,
      fallback: placement.fallback,
      product: product
        ? {
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.image,
            shopId: product.shopId,
            stock: product.stock,
          }
        : null,
      shopName: shop?.name ?? null,
    };
  });

  return NextResponse.json({
    lowConfidence: false,
    roomType: result.data.roomType,
    styleTags: result.data.styleTags,
    analysisConfidence: result.data.analysisConfidence,
    roomBoundary: result.data.roomBoundary,
    placements,
  });
}
