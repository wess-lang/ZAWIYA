"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Camera,
  AlertTriangle,
  ScanSearch,
  Send,
  RotateCcw,
  Loader2,
  Eye,
  X,
  Repeat2,
  ArrowLeft,
  Palette,
} from "lucide-react";
import AddToCartButton from "@/components/AddToCartButton";
import Button from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Card, Container } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";

interface PlacementProduct {
  id: string;
  name: string;
  price: number;
  image: string;
  shopId: string;
  stock: number;
  category?: string;
}

interface NormalizedBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Placement {
  spaceId: string;
  description: string;
  category: string;
  /** Which way this piece should face, decided during analysis the
   *  way a human arranging the room would — shown as a caption only;
   *  the deterministic compositing step below doesn't rotate artwork. */
  orientation: string;
  /** Where this piece goes, as fractions (0-1) of the room photo's
   *  width/height — fed straight into the compositing step so each
   *  product gets pasted at the spot (and roughly the scale) analysis
   *  actually found for it, instead of a generic default position. */
  boundingBox: NormalizedBoundingBox;
  matchConfidence: number;
  fallback: { used: boolean; reason?: string };
  product: PlacementProduct | null;
  shopName: string | null;
}

interface AnalyzeResponse {
  lowConfidence: boolean;
  message?: string;
  roomType?: string;
  styleTags?: string[];
  placements?: Placement[];
}

interface GeneratedImage {
  data: string; // base64
  mimeType: string;
}

// A short, curated style list — the vocabulary that actually exists
// across the real catalogue (see src/lib/seed.ts's styleTags), plus a
// couple of customer-facing synonyms ("Vintage", "Comfort") mapped to
// the closest real tag so the AI's search queries still land on real
// matches rather than a word nothing in the catalogue uses.
const STYLE_OPTIONS = [
  { value: "", label: "No preference" },
  { value: "modern", label: "Modern" },
  { value: "scandinavian", label: "Scandinavian" },
  { value: "minimalist", label: "Minimalist" },
  { value: "traditional, vintage", label: "Traditional / Vintage" },
  { value: "farmhouse", label: "Farmhouse" },
  { value: "comfort, recliner, cozy", label: "Comfort / Cozy" },
  { value: "premium, statement", label: "Luxury / Premium" },
];

// A small swatch set, not an exhaustive colour picker — enough to steer
// the AI's search queries and the generated image's palette without
// turning this into a full colour-theory form.
const COLOR_OPTIONS = [
  { value: "white", label: "White", swatch: "#ffffff" },
  { value: "beige", label: "Beige", swatch: "#e8dcc8" },
  { value: "grey", label: "Grey", swatch: "#9a9a9a" },
  { value: "black", label: "Black", swatch: "#1c1c1c" },
  { value: "walnut, brown", label: "Walnut/Brown", swatch: "#6b4a30" },
  { value: "oak, natural wood", label: "Natural Oak", swatch: "#c9a876" },
  { value: "charcoal", label: "Charcoal", swatch: "#3a3a3a" },
  { value: "navy, blue", label: "Navy/Blue", swatch: "#2c3e63" },
];

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

function itemsToPayload(items: Placement[]) {
  return items
    .filter((p): p is Placement & { product: PlacementProduct } => p.product !== null)
    .map((p) => ({
      productId: p.product.id,
      placementHint: p.description,
      orientation: p.orientation,
      boundingBox: p.boundingBox,
    }));
}

export default function RoomFitPage() {
  const router = useRouter();
  const [preview, setPreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);

  // The matched products, editable after the scan — swapping or
  // removing a piece below only changes this list; it doesn't touch
  // `result` (which still holds the room-type/style-tag summary).
  const [items, setItems] = useState<Placement[]>([]);

  // One photo, one generated result — no separate "analysis overlay" +
  // "generated preview" sections. Once a composite exists, it's the
  // only photo shown; the original upload is only ever shown before
  // that, or if nothing could be matched to generate from.
  const [composing, setComposing] = useState(false);
  const [composeError, setComposeError] = useState<string | null>(null);
  const [generated, setGenerated] = useState<GeneratedImage | null>(null);
  const [instruction, setInstruction] = useState("");

  // "Preview this one product alone" — a separate slot from the
  // full-room composite so switching back and forth never throws the
  // full result away.
  const [singlePreview, setSinglePreview] = useState<{ spaceId: string; name: string; image: GeneratedImage } | null>(null);
  const [viewMode, setViewMode] = useState<"full" | "single">("full");

  // Style/colour preference, collected before the scan runs.
  const [style, setStyle] = useState("");
  const [colors, setColors] = useState<string[]>([]);

  // Swap-a-product picker state.
  const [swapOpenFor, setSwapOpenFor] = useState<string | null>(null);
  const [swapCandidates, setSwapCandidates] = useState<Record<string, PlacementProduct[]>>({});
  const [swapLoading, setSwapLoading] = useState(false);

  const [shopsById, setShopsById] = useState<Record<string, string>>({});

  const fileRef = useRef<HTMLInputElement>(null);
  const pendingFile = useRef<File | null>(null);
  const roomImageRef = useRef<{ data: string; mediaType: string } | null>(null);

  useEffect(() => {
    fetch("/api/shops")
      .then((r) => r.json())
      .then((json: { shops?: { id: string; name: string }[] }) => {
        const map: Record<string, string> = {};
        for (const s of json.shops ?? []) map[s.id] = s.name;
        setShopsById(map);
      })
      .catch(() => {});
  }, []);

  function styleNoteText(): string | undefined {
    const parts: string[] = [];
    if (style) parts.push(`${STYLE_OPTIONS.find((s) => s.value === style)?.label.toLowerCase() ?? style} style`);
    if (colors.length > 0) {
      const labels = colors.map((c) => COLOR_OPTIONS.find((co) => co.value === c)?.label ?? c);
      parts.push(`a palette of ${labels.join(", ")}`);
    }
    return parts.length > 0 ? parts.join(" with ") : undefined;
  }

  function toggleColor(value: string) {
    setColors((prev) => (prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value]));
  }

  function handleFile(file: File) {
    pendingFile.current = file;
    setPreview(URL.createObjectURL(file));
    setResult(null);
    setItems([]);
    setAnalyzeError(null);
    setComposeError(null);
    setGenerated(null);
    setSinglePreview(null);
    setViewMode("full");
    setSwapOpenFor(null);
    roomImageRef.current = null;
  }

  async function runScan() {
    const file = pendingFile.current;
    if (!file) return;
    setAnalyzing(true);
    setAnalyzeError(null);
    setGenerated(null);
    setSinglePreview(null);
    setViewMode("full");
    setComposeError(null);
    try {
      const { data, mediaType } = await fileToBase64(file);
      roomImageRef.current = { data, mediaType };
      // AI Room-Fit now runs on RoomVisionService (Gemini's free-tier
      // vision model) via /analyze-v2, matched only against products
      // that have a real photo (see zawiyaCatalogAdapter's hard gate on
      // the /products/real/ path) — every match below is guaranteed
      // compositable, not just a generated placeholder illustration.
      const res = await fetch("/api/rooms/analyze-v2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: data,
          mediaType,
          style: style || undefined,
          colors: colors.length > 0 ? colors : undefined,
        }),
      });
      const json = await res.json();
      if (res.status === 401) {
        router.push("/login?next=/room-fit");
        return;
      }
      if (!res.ok) {
        setAnalyzeError(json.error ?? "Something went wrong analyzing the photo.");
        return;
      }
      setResult(json);

      const matched = ((json.placements as Placement[] | undefined) ?? []).filter((p) => p.product);
      setItems(matched);
      if (!json.lowConfidence && matched.length > 0) {
        await generateComposite(matched);
      }
    } catch {
      setAnalyzeError("Couldn't reach the AI service. Check your connection and try again.");
    } finally {
      setAnalyzing(false);
    }
  }

  async function generateComposite(forItems: Placement[]) {
    const room = roomImageRef.current;
    if (!room) return;
    setComposing(true);
    setComposeError(null);
    try {
      const res = await fetch("/api/rooms/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomImage: room.data,
          roomMediaType: room.mediaType,
          items: itemsToPayload(forItems),
          styleNote: styleNoteText(),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setComposeError(json.error ?? "Could not generate the preview.");
        return;
      }
      setGenerated({ data: json.image, mimeType: json.mimeType });
      setViewMode("full");
    } catch {
      setComposeError("Couldn't reach the AI service. Check your connection and try again.");
    } finally {
      setComposing(false);
    }
  }

  async function previewAlone(item: Placement) {
    const room = roomImageRef.current;
    if (!room || !item.product) return;
    setComposing(true);
    setComposeError(null);
    try {
      const res = await fetch("/api/rooms/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomImage: room.data,
          roomMediaType: room.mediaType,
          items: itemsToPayload([item]),
          styleNote: styleNoteText(),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setComposeError(json.error ?? "Could not generate that preview.");
        return;
      }
      setSinglePreview({ spaceId: item.spaceId, name: item.product.name, image: { data: json.image, mimeType: json.mimeType } });
      setViewMode("single");
    } catch {
      setComposeError("Couldn't reach the AI service. Check your connection and try again.");
    } finally {
      setComposing(false);
    }
  }

  async function refine() {
    if (!generated || !instruction.trim()) return;
    setComposing(true);
    setComposeError(null);
    try {
      const res = await fetch("/api/rooms/compose/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseImage: generated.data,
          baseMediaType: generated.mimeType,
          instruction: instruction.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setComposeError(json.error ?? "Could not apply that edit.");
        return;
      }
      setGenerated({ data: json.image, mimeType: json.mimeType });
      setInstruction("");
    } catch {
      setComposeError("Couldn't reach the AI service. Check your connection and try again.");
    } finally {
      setComposing(false);
    }
  }

  function removeItem(spaceId: string) {
    setItems((prev) => prev.filter((p) => p.spaceId !== spaceId));
    if (swapOpenFor === spaceId) setSwapOpenFor(null);
  }

  async function openSwap(item: Placement) {
    if (swapOpenFor === item.spaceId) {
      setSwapOpenFor(null);
      return;
    }
    setSwapOpenFor(item.spaceId);
    if (swapCandidates[item.category]) return;
    setSwapLoading(true);
    try {
      const res = await fetch(`/api/products?category=${encodeURIComponent(item.category)}`);
      const json = await res.json();
      const real = ((json.products as (PlacementProduct & { image: string })[] | undefined) ?? []).filter((p) =>
        p.image.startsWith("/products/real/")
      );
      setSwapCandidates((prev) => ({ ...prev, [item.category]: real }));
    } catch {
      // Swap picker just shows "no alternatives found" below if this fails.
    } finally {
      setSwapLoading(false);
    }
  }

  // Swapping used to just update the list and leave the photo stale
  // until a separate "Update room with changes" click; now it
  // regenerates immediately, the same instant feedback "Preview alone"
  // already gives for a single item.
  function chooseSwap(item: Placement, candidate: PlacementProduct) {
    const updated = items.map((p) =>
      p.spaceId === item.spaceId
        ? { ...p, product: candidate, shopName: shopsById[candidate.shopId] ?? p.shopName, fallback: { used: false } }
        : p
    );
    setItems(updated);
    setSwapOpenFor(null);
    if (generated) {
      generateComposite(updated);
    }
  }

  const busy = analyzing || composing;
  const totalPrice = items.reduce((sum, p) => sum + (p.product?.price ?? 0), 0);
  const mainImage =
    viewMode === "single" && singlePreview
      ? `data:${singlePreview.image.mimeType};base64,${singlePreview.image.data}`
      : generated
        ? `data:${generated.mimeType};base64,${generated.data}`
        : preview;

  return (
    <Container size="lg" className="py-10">
      <p className="mb-1 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
        <Sparkles size={13} /> AI Room-Fit
      </p>
      <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        Let&apos;s see your space.
      </h1>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
        Upload a photo of your room — we&apos;ll place real pieces from our
        partner shops into it, generated right into your own photo.
      </p>

      {/* The one photo: your upload until a composite exists, then the
          generated result takes its place here — never shown side by
          side with the original. */}
      <Card className="mt-6 border-dashed text-center" padding="lg">
        {preview ? (
          <div className="relative mx-auto aspect-[4/3] w-full max-w-3xl overflow-hidden rounded-xl">
            {/* eslint-disable-next-line @next/next/no-img-element -- blob/base64 data URIs can't go through the Image optimizer */}
            <img
              src={mainImage ?? preview}
              alt={generated ? "Your room with matched products placed in it" : "Room preview"}
              className="h-full w-full object-cover"
            />
            {viewMode === "single" && singlePreview && !busy && (
              <div className="absolute left-3 top-3 flex items-center gap-2">
                <Badge tone="accent">Previewing: {singlePreview.name}</Badge>
                <Button variant="secondary" size="sm" onClick={() => setViewMode("full")}>
                  <ArrowLeft size={13} /> Back to full room
                </Button>
              </div>
            )}
            {busy && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/70 text-sm font-medium text-foreground">
                <Loader2 size={22} className="animate-spin" />
                {analyzing ? "Analyzing your room..." : generated || singlePreview ? "Applying edit..." : "Generating a realistic preview..."}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center py-10 text-sm text-muted-foreground">
            <Camera size={28} className="mb-3 text-border-strong" />
            No photo selected yet
          </div>
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

        {/* Style/colour preference — collected before the scan runs, so
            it steers which products the AI even looks for, not just how
            the final image is rendered. */}
        {preview && !result && (
          <div className="mx-auto mt-5 max-w-xl rounded-xl border border-border bg-muted/40 p-4 text-left">
            <p className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Palette size={13} /> What look are you going for? (optional)
            </p>
            <Select value={style} onChange={(e) => setStyle(e.target.value)} disabled={busy}>
              {STYLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
            <div className="mt-3 flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((c) => {
                const active = colors.includes(c.value);
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => toggleColor(c.value)}
                    disabled={busy}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                      active ? "border-accent bg-accent-soft text-accent-soft-foreground" : "border-border bg-card text-foreground hover:border-border-strong"
                    }`}
                  >
                    <span
                      className="h-3 w-3 shrink-0 rounded-full border border-border-strong/40"
                      style={{ backgroundColor: c.swatch }}
                    />
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={busy}>
            <Camera size={15} /> {preview ? "Choose a different photo" : "Take or choose a photo"}
          </Button>
          {preview && !result && (
            <Button onClick={runScan} disabled={busy}>
              <ScanSearch size={15} /> {analyzing ? "Analyzing..." : "Analyze my room"}
            </Button>
          )}
        </div>

        {generated && viewMode === "full" && (
          <div className="mx-auto mt-5 flex max-w-3xl gap-2">
            <Input
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="Describe a change, e.g. 'move the sofa closer to the window'"
              disabled={busy}
              onKeyDown={(e) => {
                if (e.key === "Enter") refine();
              }}
            />
            <Button size="sm" onClick={refine} disabled={busy || !instruction.trim()}>
              <Send size={13} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => generateComposite(items)}
              disabled={busy}
              title="Regenerate"
            >
              <RotateCcw size={13} />
            </Button>
          </div>
        )}
      </Card>

      {analyzeError && (
        <p className="mt-4 rounded-xl bg-destructive-soft px-4 py-3 text-sm text-destructive">{analyzeError}</p>
      )}
      {composeError && (
        <div className="mt-4 flex items-start justify-between gap-2 rounded-xl bg-destructive-soft px-4 py-3 text-sm text-destructive">
          <span>{composeError}</span>
          <Button variant="ghost" size="sm" onClick={() => generateComposite(items)}>
            <RotateCcw size={13} /> Retry
          </Button>
        </div>
      )}

      {result?.lowConfidence && (
        <div className="mt-6 flex gap-3 rounded-xl bg-warning-soft px-4 py-4 text-sm text-warning">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Couldn&apos;t read this photo confidently.</p>
            <p className="mt-1">{result.message}</p>
          </div>
        </div>
      )}

      {result && !result.lowConfidence && (
        <div className="mt-8 animate-fade-up">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="text-sm text-foreground/85">
              Room type: <strong className="capitalize text-foreground">{result.roomType}</strong>
            </span>
            {result.styleTags?.map((t) => (
              <Badge key={t} tone="neutral">{t}</Badge>
            ))}
          </div>

          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No products with a real photo matched this room yet.
            </p>
          ) : (
            <>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-lg font-semibold text-foreground">
                  Products placed in your room
                </h2>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">
                    Total: <strong className="text-base text-foreground">JD {totalPrice.toFixed(2)}</strong>
                  </span>
                  <Button variant="secondary" size="sm" onClick={() => generateComposite(items)} disabled={busy}>
                    <RotateCcw size={13} /> Update room with changes
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {items.map((p) => (
                  <Card key={p.spaceId} padding="sm" className="flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/products/${p.product!.id}`}
                        className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted"
                      >
                        <Image src={p.product!.image} alt={p.product!.name} fill className="object-cover" sizes="64px" />
                      </Link>
                      <div className="flex-1">
                        <Link
                          href={`/products/${p.product!.id}`}
                          className="text-sm font-semibold text-foreground hover:underline"
                        >
                          {p.product!.name}
                        </Link>
                        <div className="text-xs text-muted-foreground">{p.shopName}</div>
                        <div className="text-sm font-semibold text-accent-soft-foreground">
                          JD {p.product!.price.toFixed(2)}
                        </div>
                      </div>
                      <AddToCartButton
                        productId={p.product!.id}
                        name={p.product!.name}
                        price={p.product!.price}
                        image={p.product!.image}
                        shopId={p.product!.shopId}
                        shopName={p.shopName ?? "Shop"}
                        disabled={p.product!.stock <= 0}
                        size="sm"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-2 border-t border-border pt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => previewAlone(p)}
                        disabled={busy || !generated}
                        title="See only this product placed in your room"
                      >
                        <Eye size={13} /> Preview alone
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openSwap(p)} disabled={busy}>
                        <Repeat2 size={13} /> Change
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(p.spaceId)}
                        disabled={busy}
                        className="ml-auto text-destructive hover:bg-destructive-soft"
                      >
                        <X size={13} /> Remove
                      </Button>
                    </div>

                    {swapOpenFor === p.spaceId && (
                      <div className="rounded-lg border border-border bg-muted/40 p-2">
                        {swapLoading && !swapCandidates[p.category] ? (
                          <div className="flex items-center gap-2 px-1 py-2 text-xs text-muted-foreground">
                            <Loader2 size={13} className="animate-spin" /> Loading alternatives...
                          </div>
                        ) : (
                          <div className="flex gap-2 overflow-x-auto pb-1">
                            {(swapCandidates[p.category] ?? [])
                              .filter((c) => c.id !== p.product!.id)
                              .map((c) => (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={() => chooseSwap(p, c)}
                                  className="group shrink-0 text-left"
                                  title={c.name}
                                >
                                  <div className="relative h-14 w-14 overflow-hidden rounded-lg bg-card ring-1 ring-border group-hover:ring-accent">
                                    <Image src={c.image} alt={c.name} fill className="object-cover" sizes="56px" />
                                  </div>
                                  <div className="mt-1 w-14 truncate text-[10px] text-muted-foreground">{c.name}</div>
                                </button>
                              ))}
                            {!swapLoading && (swapCandidates[p.category] ?? []).filter((c) => c.id !== p.product!.id).length === 0 && (
                              <p className="px-1 py-2 text-xs text-muted-foreground">No other real-photo products in this category yet.</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </Container>
  );
}
