"use client";

import { useState } from "react";

// Maps a shop name to a real logo file served from `public/brand-logos/`.
// Mirrors mobile/lib/widgets/shop_logo.dart so the web and mobile clients
// show the same artwork. These shops are not actually partnered with this
// app — see "Placeholder data" in the root README. Only shops with a logo
// file saved appear here; anything else (missing mapping, or the image
// failing to load) falls back to a plain colour badge with the shop's
// initial, same as the mobile client.
const SHOP_LOGOS: Record<string, string> = {
  IKEA: "/brand-logos/ikea.png",
  "Ashley Furniture HomeStore": "/brand-logos/ashley-furniture-homestore.png",
  "Shahwan Furniture": "/brand-logos/shahwan-furniture.jpeg",
  "Midas Home & Office Furniture": "/brand-logos/midas-home-office-furniture.jpeg",
};

export default function ShopLogo({
  name,
  accent,
  size = 40,
  className = "",
}: {
  name: string;
  accent: string;
  size?: number;
  className?: string;
}) {
  const path = SHOP_LOGOS[name];
  const [failed, setFailed] = useState(false);
  // App-icon proportioned corner radius rather than a hard circle — most of
  // these are wordmarks or landscape marks (Ashley's is a 2:1 wordmark), and
  // a circle either shrinks them to a sliver or clips their corners for no
  // reason. A soft square is how most marketplaces frame store logos.
  const radius = Math.round(size * 0.26);

  if (!path || failed) {
    return (
      <div
        style={{ width: size, height: size, backgroundColor: accent, borderRadius: radius }}
        className={`flex shrink-0 items-center justify-center font-semibold text-white shadow-[0_1px_2px_rgba(0,0,0,0.08)] ${className}`}
      >
        <span style={{ fontSize: size * 0.42 }}>{name.charAt(0)}</span>
      </div>
    );
  }

  return (
    <div
      style={{ width: size, height: size, borderRadius: radius }}
      className={`flex shrink-0 items-center justify-center overflow-hidden border border-border bg-white shadow-[0_1px_2px_rgba(0,0,0,0.08)] ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- tiny static brand marks; needs a plain onError fallback to the colour badge */}
      <img
        src={path}
        alt={`${name} logo`}
        onError={() => setFailed(true)}
        className="h-full w-full object-contain p-[9%]"
      />
    </div>
  );
}
