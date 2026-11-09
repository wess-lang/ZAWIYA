"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Pops its children in — fade, lift and a slight overshoot scale —
 * the moment they actually enter the viewport while scrolling, instead
 * of everything below the fold being instantly visible on load or
 * easing in flatly. The overshoot (scale past 100% then settle) via a
 * springy cubic-bezier is the deliberately "funkier" choice over a
 * plain ease-out fade. Plain IntersectionObserver, no library — fires
 * once per mount and then disconnects, so it costs nothing after the
 * first reveal. Respects prefers-reduced-motion via globals.css's
 * existing blanket rule (it zeroes all animation/transition durations),
 * so this degrades to "just visible" automatically rather than needing
 * its own check.
 */
export default function Reveal({
  children,
  className = "",
  delayMs = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delayMs?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${visible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-8 scale-95"} ${className}`}
      style={{
        transitionDelay: visible ? `${delayMs}ms` : "0ms",
        transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      }}
    >
      {children}
    </div>
  );
}
