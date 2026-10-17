"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AddToCartButton from "@/components/AddToCartButton";

interface Recommendation {
  product: {
    id: string;
    name: string;
    price: number;
    image: string;
    shopId: string;
    stock: number;
  };
  shopName: string;
  matchScore: number;
  reason: string;
}

interface AnalyzeResponse {
  lowConfidence: boolean;
  confidence: number;
  message?: string;
  roomType?: string;
  styleTags?: string[];
  palette?: string[];
  recommendations?: Recommendation[];
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

export default function RoomFitPage() {
  const router = useRouter();
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pendingFile = useRef<File | null>(null);

  function handleFile(file: File) {
    pendingFile.current = file;
    setPreview(URL.createObjectURL(file));
    setResult(null);
    setError(null);
  }

  async function runScan() {
    const file = pendingFile.current;
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const { data, mediaType } = await fileToBase64(file);
      const res = await fetch("/api/rooms/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: data, mediaType }),
      });
      const json = await res.json();
      if (res.status === 401) {
        router.push("/login?next=/room-fit");
        return;
      }
      if (!res.ok) {
        setError(json.error ?? "Something went wrong analyzing the photo.");
        return;
      }
      setResult(json);
    } catch {
      setError("Couldn't reach the AI service. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-sage-700">
        AI Room-Fit
      </p>
      <h1 className="text-2xl font-semibold text-stone-900">Let&apos;s see your space.</h1>
      <p className="mt-2 text-sm text-stone-600">
        Upload a photo of your room to get furniture recommendations - ranked
        by style, colour and room fit - pulled from every partner shop&apos;s
        live catalogue (FR-04/FR-05).
      </p>

      <div className="mt-6 rounded-xl border border-dashed border-stone-300 bg-white p-6 text-center">
        {preview ? (
          <div className="relative mx-auto aspect-[4/3] w-full max-w-md overflow-hidden rounded-lg">
            {/* eslint-disable-next-line @next/next/no-img-element -- blob: preview URLs can't go through the Image optimizer */}
            <img src={preview} alt="Room preview" className="h-full w-full object-cover" />
          </div>
        ) : (
          <p className="py-10 text-sm text-stone-500">No photo selected yet</p>
        )}

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

        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <button
            onClick={() => fileRef.current?.click()}
            className="rounded-full border border-stone-300 px-5 py-2.5 text-sm font-medium text-stone-800 hover:border-stone-500"
          >
            {preview ? "Choose a different photo" : "Take or choose a photo"}
          </button>
          {preview && (
            <button
              onClick={runScan}
              disabled={loading}
              className="rounded-full bg-sage-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-sage-700 disabled:opacity-60"
            >
              {loading ? "Analyzing architecture..." : "Analyze my room"}
            </button>
          )}
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      {result?.lowConfidence && (
        <div className="mt-6 rounded-lg bg-amber-50 px-4 py-4 text-sm text-amber-800">
          <p className="font-medium">Couldn&apos;t read this photo confidently.</p>
          <p className="mt-1">{result.message}</p>
        </div>
      )}

      {result && !result.lowConfidence && (
        <div className="mt-8">
          <div className="mb-4 rounded-xl border border-stone-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-sage-700">
              Analysis complete
            </p>
            <p className="mt-1 text-sm text-stone-700">
              Room type: <strong className="capitalize">{result.roomType}</strong>
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {result.styleTags?.map((t) => (
                <span key={t} className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] text-stone-600">
                  {t}
                </span>
              ))}
              {result.palette?.map((c) => (
                <span key={c} className="rounded-full bg-sage-50 px-2 py-0.5 text-[11px] text-sage-700">
                  {c}
                </span>
              ))}
            </div>
          </div>

          {(result.recommendations?.length ?? 0) === 0 ? (
            <p className="text-sm text-stone-500">
              No strong matches found in the current catalogue for this room.
            </p>
          ) : (
            <>
              <h2 className="mb-4 text-lg font-semibold text-stone-900">Curated for you</h2>
              <div className="flex flex-col gap-4">
                {result.recommendations!.map(({ product, shopName, matchScore, reason }) => (
                  <div key={product.id} className="flex gap-4 rounded-xl border border-stone-200 bg-white p-3">
                    <Link
                      href={`/products/${product.id}`}
                      className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-stone-100"
                    >
                      <Image src={product.image} alt={product.name} fill className="object-cover" sizes="96px" />
                      <span className="absolute left-1 top-1 rounded-full bg-sage-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                        {Math.round(matchScore * 100)}% Match
                      </span>
                    </Link>
                    <div className="flex-1">
                      <Link
                        href={`/products/${product.id}`}
                        className="text-sm font-semibold text-stone-900 hover:underline"
                      >
                        {product.name}
                      </Link>
                      <div className="text-xs text-stone-500">{shopName}</div>
                      <p className="mt-1 text-xs text-stone-600">
                        AI-verified fit: {reason}.
                      </p>
                      <div className="mt-1 text-sm font-semibold text-sage-700">
                        JD {product.price.toFixed(2)}
                      </div>
                    </div>
                    <div className="w-36 shrink-0 self-center">
                      <AddToCartButton
                        productId={product.id}
                        name={product.name}
                        price={product.price}
                        image={product.image}
                        shopId={product.shopId}
                        shopName={shopName}
                        disabled={product.stock <= 0}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
