import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { readDb } from "@/lib/db";
import {
  RoomCompositingService,
  type CompositingErrorCode,
} from "@/services/ai-vision/RoomCompositingService";

/**
 * POST { roomImage: base64, roomMediaType: string, items: [{ productId, placementHint?, orientation? }] }
 * -> { image: base64, mimeType } | { error, code, retryable }
 *
 * Single image-generation call that places every given product into
 * the uploaded room photo *at once* — not one call per product. A
 * scan that matches three placements sends all three here together and
 * gets back one edited photo, so the cost scales with "did you ask for
 * a composite" (once per room) rather than with how many items the
 * analysis happened to detect. See RoomCompositingService.compose()'s
 * own comment for why that reshape mattered.
 *
 * This is genuinely different from (and much more expensive than)
 * /api/rooms/analyze-v2 — that one reads a photo and returns
 * coordinates; this one generates a brand new photo. See
 * RoomCompositingService's header comment: there is no free tier for
 * this at all, so GEMINI_API_KEY alone isn't enough here — the Google
 * AI Studio project behind it needs Cloud Billing actually linked.
 */

const ERROR_STATUS: Record<CompositingErrorCode, number> = {
  INVALID_IMAGE: 400,
  TIMEOUT: 504,
  RATE_LIMITED: 429,
  AUTH_ERROR: 500,
  PROVIDER_ERROR: 502,
  MODEL_REFUSED: 422,
  NO_IMAGE_RETURNED: 502,
  UNKNOWN: 500,
};

// Lazy, not module-scope: the underlying client can throw on missing
// credentials, and module-scope code runs at `next build` import time —
// see analyze-v2/route.ts's identical comment for why that matters.
let compositingService: RoomCompositingService | null = null;
function getCompositingService(): RoomCompositingService {
  if (!compositingService) compositingService = new RoomCompositingService();
  return compositingService;
}

function mimeTypeForPath(imagePath: string): string {
  if (imagePath.endsWith(".svg")) return "image/svg+xml";
  if (imagePath.endsWith(".png")) return "image/png";
  if (imagePath.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
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

  let body: {
    roomImage?: string;
    roomMediaType?: string;
    items?: Array<{ productId?: string; placementHint?: string; orientation?: string }>;
    styleNote?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const { roomImage, roomMediaType, items, styleNote } = body;
  if (!roomImage || !roomMediaType || !items || items.length === 0) {
    return NextResponse.json(
      {
        error:
          "Expected { roomImage: base64String, roomMediaType: string, items: [{ productId: string, placementHint?: string, orientation?: string }] } with at least one item.",
      },
      { status: 400 }
    );
  }

  const db = readDb();
  const fs = await import("fs/promises");
  const path = await import("path");

  const products: Array<{ image: Buffer; mimeType: string; label: string; placementHint?: string; orientation?: string }> = [];
  for (const item of items) {
    if (!item.productId) {
      return NextResponse.json({ error: "Every item needs a productId." }, { status: 400 });
    }
    const product = db.products.find((p) => p.id === item.productId);
    if (!product) {
      return NextResponse.json({ error: `Unknown product: ${item.productId}` }, { status: 404 });
    }

    const mimeType = mimeTypeForPath(product.image);
    // SVG illustrations (the generated-placeholder path) aren't a
    // supported input type for the image model — only real photos are.
    if (mimeType === "image/svg+xml") {
      return NextResponse.json(
        {
          error: `"${product.name}" only has a generated placeholder illustration, not a real photo, so it can't be composited into a room photo yet.`,
        },
        { status: 422 }
      );
    }

    let imageBuffer: Buffer;
    try {
      const filePath = path.join(process.cwd(), "public", product.image.replace(/^\//, ""));
      imageBuffer = await fs.readFile(filePath);
    } catch {
      return NextResponse.json({ error: `Could not read the image file for "${product.name}".` }, { status: 500 });
    }

    products.push({
      image: imageBuffer,
      mimeType,
      label: product.name,
      placementHint: item.placementHint,
      orientation: item.orientation,
    });
  }

  const roomBuffer = Buffer.from(roomImage, "base64");
  const result = await getCompositingService().compose({
    roomImage: roomBuffer,
    roomMimeType: roomMediaType,
    products,
    styleNote,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error.message, code: result.error.code, retryable: result.error.retryable },
      { status: ERROR_STATUS[result.error.code] }
    );
  }

  return NextResponse.json({ image: result.image.data, mimeType: result.image.mimeType });
}
