import type { ElementType, HTMLAttributes, ReactNode } from "react";

export function Card({
  className = "",
  children,
  hover = false,
  padding = "md",
  as,
  ...props
}: HTMLAttributes<HTMLElement> & {
  children: ReactNode;
  hover?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
  as?: ElementType;
}) {
  const Tag = as ?? "div";
  const pad = { none: "", sm: "p-4", md: "p-5 sm:p-6", lg: "p-7 sm:p-9" }[padding];
  return (
    <Tag
      className={`rounded-2xl border border-border bg-card text-card-foreground shadow-[0_1px_2px_rgba(0,0,0,0.04)] ${
        hover ? "transition-all duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md" : ""
      } ${pad} ${className}`}
      {...props}
    >
      {children}
    </Tag>
  );
}

export function Container({
  className = "",
  size = "lg",
  children,
}: {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  children: ReactNode;
}) {
  const width = { sm: "max-w-xl", md: "max-w-3xl", lg: "max-w-6xl", xl: "max-w-7xl" }[size];
  return <div className={`mx-auto ${width} px-4 sm:px-6 ${className}`}>{children}</div>;
}

export function SectionHeading({
  eyebrow,
  title,
  action,
  className = "",
}: {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mb-5 flex items-end justify-between gap-4 ${className}`}>
      <div>
        {eyebrow && (
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {eyebrow}
          </p>
        )}
        <h2 className="font-display text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          {title}
        </h2>
      </div>
      {action}
    </div>
  );
}
