import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  RoomCompositingService,
  type CompositingErrorCode,
} from "@/services/ai-vision/RoomCompositingService";

/**
 * POST { baseImage: base64, baseMediaType: string, instruction: string }
 * -> { image: base64, mimeType } | { error, code, retryable }
 *
 * The "play with it and edit" step: `baseImage` is whatever
 * /api/rooms/compose (or a previous call to this route) last returned,
 * and `instruction` is a plain-language change — "move it closer to the
 * window," "make it a bit smaller," "turn it to face the sofa." There's
 * no fixed menu of edits; it's whatever text you send.
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

let compositingService: RoomCompositingService | null = null;
function getCompositingService(): RoomCompositingService {
  if (!compositingService) compositingService = new RoomCompositingService();
  return compositingService;
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

  let body: { baseImage?: string; baseMediaType?: string; instruction?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const { baseImage, baseMediaType, instruction } = body;
  if (!baseImage || !baseMediaType || !instruction) {
    return NextResponse.json(
      { error: "Expected { baseImage: base64String, baseMediaType: string, instruction: string }." },
      { status: 400 }
    );
  }

  const result = await getCompositingService().refine({
    baseImage: Buffer.from(baseImage, "base64"),
    baseMimeType: baseMediaType,
    instruction,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error.message, code: result.error.code, retryable: result.error.retryable },
      { status: ERROR_STATUS[result.error.code] }
    );
  }

  return NextResponse.json({ image: result.image.data, mimeType: result.image.mimeType });
}
