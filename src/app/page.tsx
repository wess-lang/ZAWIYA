import Link from "next/link";
import {
  Armchair, Lamp, Sofa, UtensilsCrossed, BedDouble, Trees, Box, Blinds,
  Sparkles, ArrowRight, Search, Store,
} from "lucide-react";
import type { ComponentType } from "react";
import { readDb } from "@/lib/db";
import { CATEGORY_LABELS, type Category } from "@/lib/types";
import { swatchColor, FEATURED_MATERIALS } from "@/lib/materialColors";
import { CATEGORY_COLORS } from "@/lib/categoryColors";
import ProductCard from "@/components/ProductCard";
import ShopLogo from "@/components/ShopLogo";
import Reveal from "@/components/Reveal";
import Marquee from "@/components/Marquee";
import Button from "@/components/ui/Button";
import { Card, Container, SectionHeading } from "@/components/ui/Card";

const MARQUEE_ITEMS = [
  "Independent Jordanian furniture shops",
  "AI-powered Room-Fit",
  "One cart, every shop",
  "Real pieces for real rooms",
];

const CATEGORY_ICONS: Record<Category, ComponentType<{ size?: number; className?: string }>> = {
  sofa: Sofa,
  bed: BedDouble,
  dining: UtensilsCrossed,
  chair: Armchair,
  storage: Box,
  lighting: Lamp,
  outdoor: Trees,
  decor: Blinds,
  office: Box,
};

export default function Home() {
  const db = readDb();
  const activeShops = db.shops.filter((s) => s.status === "active");
  const activeShopIds = new Set(activeShops.map((s) => s.id));
  const products = db.products.filter((p) => activeShopIds.has(p.shopId));
  const featured = products.slice(0, 8);
  const shopsById = new Map(activeShops.map((s) => [s.id, s]));
  const categories = Object.keys(CATEGORY_LABELS) as Category[];

  return (
    <div>
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-brand-50 to-background px-4 py-16 sm:py-24">
        {/* Slow-morphing organic blobs — olive, pop coral, brass — in
            place of static blurred circles, for a livelier, trendier
            backdrop than a flat brand wash. */}
        <div
          aria-hidden
          className="animate-blob pointer-events-none absolute -top-24 right-[-10%] h-80 w-80 bg-brand-200/50 blur-3xl"
        />
        <div
          aria-hidden
          className="animate-blob-delay pointer-events-none absolute top-10 left-[8%] h-56 w-56 blur-3xl"
          style={{ backgroundColor: "var(--color-pop-soft)" }}
        />
        <div
          aria-hidden
          className="animate-blob pointer-events-none absolute -bottom-32 left-[-5%] h-72 w-72 bg-brass-50/70 blur-3xl"
        />
        <Container size="md" className="relative animate-fade-up text-center">
          <p className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-card/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
            <Sparkles size={13} /> Design your space
          </p>

          <div className="relative inline-block">
            <h1 className="font-display bg-gradient-to-r from-brand-700 via-brand-600 to-pop bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-6xl">
              Find your perfect fit.
            </h1>
            {/* A floating decorative sparkle, bobbing idly — a small,
                unmistakably "funky" touch rather than a static icon. */}
            <Sparkles
              aria-hidden
              size={28}
              className="animate-float absolute -right-6 -top-4 hidden text-pop sm:block"
            />
          </div>

          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
            Browse furniture from shops across Jordan in one cart, or
            photograph your room and let ZAWIYA place pieces that actually
            fit it.
          </p>

          <form action="/shop" className="mx-auto mt-7 flex max-w-lg gap-2">
            <div className="relative flex-1">
              <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                name="q"
                placeholder="Search sofas, lighting, dining sets..."
                className="w-full rounded-full border border-border bg-card py-3.5 pl-11 pr-4 text-sm text-foreground shadow-sm placeholder:text-muted-foreground/70 transition-colors hover:border-border-strong focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25"
              />
            </div>
            <Button type="submit" size="lg">
              Search
            </Button>
          </form>

          <div className="relative mt-5 inline-flex flex-wrap items-center justify-center gap-3">
            <Button href="/room-fit" variant="outline" size="md">
              <Sparkles size={15} /> Try AI Room-Fit
            </Button>
            {/* A rotated "sticker" badge — thick border, flat hard
                shadow, no blur — the neo-brutalist touch that reads as
                trendy rather than corporate. */}
            <span
              aria-hidden
              className="pointer-events-none absolute -right-4 -top-7 hidden -rotate-6 rounded-full border-2 border-foreground bg-pop px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-[3px_3px_0_var(--foreground)] sm:block"
            >
              AI-powered
            </span>
          </div>
        </Container>
      </section>

      <div className="border-b border-border bg-brand-800 text-background">
        <Marquee items={MARQUEE_ITEMS} />
      </div>

      <Reveal>
        <Container size="lg" className="py-10">
          <SectionHeading eyebrow="Find what you need" title="Shop by room" />
          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-5 sm:gap-3 sm:overflow-visible sm:px-0 md:grid-cols-9">
            {categories.map((c) => {
              const Icon = CATEGORY_ICONS[c] ?? Box;
              const color = CATEGORY_COLORS[c];
              return (
                <Link
                  key={c}
                  href={`/shop?category=${c}`}
                  className="group flex w-20 shrink-0 flex-col items-center justify-center gap-2.5 rounded-2xl border border-border bg-card px-2 py-5 text-center transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:[border-color:var(--chip-color)] sm:w-auto"
                  style={{ "--chip-color": color } as React.CSSProperties}
                >
                  <span
                    className="flex h-11 w-11 items-center justify-center rounded-full transition-colors duration-200 group-hover:scale-110 group-hover:text-white group-hover:[background-color:var(--chip-color)]"
                    style={{ backgroundColor: `${color}1f`, color }}
                  >
                    <Icon size={19} className="group-hover:animate-wiggle" />
                  </span>
                  <span className="text-xs font-medium leading-tight text-foreground">{CATEGORY_LABELS[c]}</span>
                </Link>
              );
            })}
          </div>
        </Container>
      </Reveal>

      <Reveal>
        <Container size="lg" className="py-6">
          <SectionHeading eyebrow="Find your finish" title="Shop by colour & material" />
          <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:gap-5 sm:overflow-visible sm:px-0">
            {FEATURED_MATERIALS.map((tag) => (
              <Link
                key={tag}
                href={`/shop?q=${tag}`}
                className="group flex shrink-0 flex-col items-center gap-2"
              >
                <span
                  className="h-14 w-14 rounded-full shadow-sm ring-1 ring-black/5 transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110 group-hover:shadow-md"
                  style={{ backgroundColor: swatchColor(tag), transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)" }}
                />
                <span className="text-xs font-medium capitalize text-muted-foreground transition-colors group-hover:text-foreground">
                  {tag}
                </span>
              </Link>
            ))}
          </div>
        </Container>
      </Reveal>

      <Reveal>
        <Container size="lg" className="py-6">
          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0">
            <Link
              href="/room-fit"
              className="group flex w-72 shrink-0 items-center gap-4 overflow-hidden rounded-2xl bg-gradient-to-br from-brand-700 to-brand-900 p-5 text-white shadow-lg transition-transform duration-300 hover:-translate-y-1 hover:-rotate-1 sm:w-auto"
              style={{ transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)" }}
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/15">
                <Sparkles size={22} />
              </span>
              <span>
                <span className="font-display block text-base font-semibold">AI Room-Fit</span>
                <span className="block text-xs text-white/80">
                  Snap a photo, get furniture sized for your space
                </span>
              </span>
              <ArrowRight size={18} className="ml-auto shrink-0 opacity-80 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/shops/register"
              className="group flex w-72 shrink-0 items-center gap-4 overflow-hidden rounded-2xl bg-gradient-to-br from-brass-600 to-brass-700 p-5 text-white shadow-lg transition-transform duration-300 hover:-translate-y-1 hover:rotate-1 sm:w-auto"
              style={{ transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)" }}
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/15">
                <Store size={22} />
              </span>
              <span>
                <span className="font-display block text-base font-semibold">List your shop</span>
                <span className="block text-xs text-white/80">
                  Reach every ZAWIYA customer from one dashboard
                </span>
              </span>
              <ArrowRight size={18} className="ml-auto shrink-0 opacity-80 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </Container>
      </Reveal>

      <Reveal>
        <Container size="lg" className="py-10">
          <SectionHeading
            eyebrow="Independent & local"
            title="Partner shops"
            action={
              <Link href="/shops" className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline">
                See all <ArrowRight size={14} />
              </Link>
            }
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-5">
            {activeShops.map((s) => (
              <Link key={s.id} href={`/shops/${s.id}`}>
                <Card hover padding="sm">
                  <ShopLogo name={s.name} accent={s.accent} size={44} className="mb-3" />
                  <div className="text-sm font-semibold text-foreground">{s.name}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{s.tagline}</div>
                </Card>
              </Link>
            ))}
          </div>
        </Container>
      </Reveal>

      <Reveal>
        <Container size="lg" className="py-10">
          <SectionHeading
            eyebrow="Fresh picks"
            title="Featured pieces"
            action={
              <Link href="/shop" className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline">
                See all <ArrowRight size={14} />
              </Link>
            }
          />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {featured.map((p) => (
              <ProductCard key={p.id} product={p} shop={shopsById.get(p.shopId)} />
            ))}
          </div>
        </Container>
      </Reveal>

      <Reveal>
        <Container size="md" className="py-16">
          <Card padding="lg" className="text-center">
            <h2 className="font-display text-2xl font-semibold text-foreground">
              Curate your space
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
              Explore the full collection of pieces from every partner shop,
              designed to elevate your environment.
            </p>
            <Button href="/shop" variant="primary" size="lg" className="mt-6">
              Browse Marketplace
            </Button>
          </Card>
        </Container>
      </Reveal>
    </div>
  );
}
