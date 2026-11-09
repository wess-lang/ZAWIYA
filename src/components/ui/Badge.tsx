import type { ReactNode } from "react";

type Tone = "neutral" | "accent" | "success" | "warning" | "info" | "plum" | "danger";

const tones: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground",
  accent: "bg-accent-soft text-accent-soft-foreground",
  success: "bg-accent-soft text-accent-soft-foreground",
  warning: "bg-warning-soft text-warning",
  info: "bg-info-soft text-info",
  plum: "bg-plum-soft text-plum",
  danger: "bg-destructive-soft text-destructive",
};

export default function Badge({
  tone = "neutral",
  children,
  className = "",
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
