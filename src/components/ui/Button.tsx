import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "dark" | "secondary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg" | "icon";

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold " +
  "transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 " +
  "active:scale-[0.95] select-none";
// A springy, slightly overshooting easing on the bouncy variants below
// (set via inline style since Tailwind has no built-in cubic-bezier
// this extreme) — the deliberately "funkier" alternative to a flat
// ease-out hover.
const bouncy = { transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)" };

const variants: Record<Variant, string> = {
  primary:
    "bg-gradient-to-br from-accent to-brand-800 text-accent-foreground shadow-sm hover:shadow-lg hover:-translate-y-0.5 hover:scale-105 hover:rotate-1",
  dark: "bg-foreground text-background shadow-sm hover:shadow-md hover:opacity-90 hover:-translate-y-0.5 hover:scale-105",
  secondary: "bg-muted text-foreground hover:bg-border-strong/40",
  outline: "border-2 border-border-strong bg-transparent text-foreground hover:border-accent hover:text-accent hover:-rotate-1",
  ghost: "bg-transparent text-foreground hover:bg-muted",
  danger: "bg-destructive text-destructive-foreground shadow-sm hover:brightness-105",
};

// Which variants get the springy easing — the quieter ones (secondary/
// ghost/danger) stay on a plain transition so every button on screen
// isn't visibly bouncing at once.
const BOUNCY_VARIANTS = new Set<Variant>(["primary", "dark", "outline"]);

const sizes: Record<Size, string> = {
  sm: "px-3.5 py-1.5 text-xs",
  md: "px-5 py-2.5 text-sm",
  lg: "px-7 py-3.5 text-base",
  icon: "h-10 w-10 p-0 text-sm",
};

interface SharedProps {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}

type ButtonProps = SharedProps &
  ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };

type LinkButtonProps = SharedProps & {
  href: string;
  target?: string;
  rel?: string;
  title?: string;
};

export default function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  href,
  ...props
}: ButtonProps | LinkButtonProps) {
  const classes = `${base} ${variants[variant]} ${sizes[size]} ${className}`;
  const style = BOUNCY_VARIANTS.has(variant) ? bouncy : undefined;

  if (href) {
    const { target, rel, title } = props as LinkButtonProps;
    return (
      <Link href={href} className={classes} style={style} target={target} rel={rel} title={title}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} style={style} {...(props as ButtonHTMLAttributes<HTMLButtonElement>)}>
      {children}
    </button>
  );
}
