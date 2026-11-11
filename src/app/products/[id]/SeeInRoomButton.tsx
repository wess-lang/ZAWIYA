"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, RotateCcw, X } from "lucide-react";
import Button from "@/components/ui/Button";

interface GeneratedImage {
  data: string; // base64
  mimeType: string;
}

interface Props {
  productId: string;
  productName: string;
  signedIn: boolean;
  /** Only products with a real photo (not the generated SVG placeholder)
   *  can actually be composited — see /api/rooms/compose's own 422 for
   *  this same check. Gated here too so clicking doesn't cost a wasted
   *  photo upload before finding out. */
  hasRealPhoto: boolean;
}

function fileToBase64(file: File): Promise<{ data: string; mediaType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const [, base64] = result.split(",");
      resolve({ data: base64, mediaType: file.type });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * The product-page half of AI Room-Fit: "see this one product in your
 * room" without running the full room-scan flow first. The button only
 * reveals a result once the customer has actually uploaded a room
 * photo — there's nothing to preview before that.
 */
export default function SeeInRoomButton({ productId, productName, signedIn, hasRealPhoto }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const pendingRoom = useRef<{ data: string; mediaType: string } | null>(null);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GeneratedImage | null>(null);
  const [roomPreview, setRoomPreview] = useState<string | null>(null);

  function handleOpenClick() {
    if (!hasRealPhoto) {
      setOpen(true);
      return;
    }
    if (!signedIn) {
      router.push(`/login?next=/products/${productId}`);
      return;
    }
    fileRef.current?.click();
  }

  async function handleFile(file: File) {
    setOpen(true);
    setError(null);
    setResult(null);
    setRoomPreview(URL.createObjectURL(file));
    setLoading(true);
    try {
      const { data, mediaType } = await fileToBase64(file);
      pendingRoom.current = { data, mediaType };
      await generate(data, mediaType);
    } catch {
      setError("Couldn't read that photo. Try a different file.");
      setLoading(false);
    }
  }

  async function generate(roomImage: string, roomMediaType: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/rooms/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomImage,
          roomMediaType,
          items: [{ productId }],
        }),
      });
      const json = await res.json();
      if (res.status === 401) {
        router.push(`/login?next=/products/${productId}`);
        return;
      }
      if (!res.ok) {
        setError(json.error ?? "Could not generate the preview.");
        return;
      }
      setResult({ data: json.image, mimeType: json.mimeType });
    } catch {
      setError("Couldn't reach the AI service. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  function retry() {
    const room = pendingRoom.current;
    if (!room) return;
    generate(room.data, room.mediaType);
  }

  function close() {
    setOpen(false);
    setResult(null);
    setError(null);
    setRoomPreview(null);
    pendingRoom.current = null;
  }

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      <Button variant="outline" onClick={handleOpenClick}>
        <Camera size={15} /> See it in your room
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={close}
        >
          <div
            className="relative w-full max-w-lg rounded-2xl bg-card p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground hover:bg-muted"
            >
              <X size={16} />
            </button>

            {!hasRealPhoto ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                <Camera size={24} className="mx-auto mb-3 text-border-strong" />A room preview isn&apos;t
                available for {productName} yet — this product only has a catalogue illustration, not a
                real photo.
              </div>
            ) : !roomPreview ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                <Loader2 size={20} className="mx-auto mb-3 animate-spin text-border-strong" />
                Reading your photo...
              </div>
            ) : (
              <>
                <p className="mb-3 text-sm font-medium text-foreground">
                  {productName} in your room
                </p>
                <div className="relative mx-auto aspect-[4/3] w-full overflow-hidden rounded-xl bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element -- base64/blob data URIs can't go through the Image optimizer */}
                  <img
                    src={result ? `data:${result.mimeType};base64,${result.data}` : roomPreview}
                    alt={result ? `${productName} placed in your room` : "Your room"}
                    className="h-full w-full object-cover"
                  />
                  {loading && (
                    <div className="absolute inset-0 flex items-center justify-center gap-2 bg-background/70 text-sm font-medium text-foreground">
                      <Loader2 size={18} className="animate-spin" /> Generating a realistic preview...
                    </div>
                  )}
                </div>

                {error && (
                  <p className="mt-3 rounded-xl bg-destructive-soft px-3 py-2 text-xs text-destructive">
                    {error}
                  </p>
                )}

                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => fileRef.current?.click()}
                    disabled={loading}
                  >
                    <Camera size={13} /> Try a different photo
                  </Button>
                  {error && (
                    <Button variant="secondary" size="sm" onClick={retry} disabled={loading}>
                      <RotateCcw size={13} /> Retry
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
