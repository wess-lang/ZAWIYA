import type {
  InputHTMLAttributes,
  TextareaHTMLAttributes,
  LabelHTMLAttributes,
  SelectHTMLAttributes,
} from "react";

const fieldBase =
  "w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm text-foreground " +
  "placeholder:text-muted-foreground/70 transition-colors duration-150 " +
  "hover:border-border-strong focus:border-ring focus:outline-none " +
  "focus:ring-2 focus:ring-ring/25 disabled:cursor-not-allowed disabled:opacity-60";

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${fieldBase} ${className}`} {...props} />;
}

export function Textarea({ className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${fieldBase} resize-none ${className}`} {...props} />;
}

export function Select({ className = "", ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`${fieldBase} cursor-pointer ${className}`} {...props} />;
}

export function Label({ className = "", ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={`mb-1.5 block text-xs font-medium text-muted-foreground ${className}`}
      {...props}
    />
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function FormError({ children }: { children?: string | null }) {
  if (!children) return null;
  return (
    <p className="rounded-lg bg-destructive-soft px-3 py-2 text-sm text-destructive">
      {children}
    </p>
  );
}
