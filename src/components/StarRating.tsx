import { Star } from "lucide-react";

export default function StarRating({
  rating,
  count,
  size = 14,
  className = "",
}: {
  rating: number;
  count?: number;
  size?: number;
  className?: string;
}) {
  const rounded = Math.round(rating);
  return (
    <span className={`inline-flex items-center gap-1.5 text-sm ${className}`}>
      <span className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            size={size}
            className={i < rounded ? "fill-warning text-warning" : "fill-transparent text-border-strong"}
          />
        ))}
      </span>
      {count !== undefined && (
        <span className="text-xs text-muted-foreground">
          {rating > 0 ? rating.toFixed(1) : "No ratings"}
          {count > 0 && ` (${count})`}
        </span>
      )}
    </span>
  );
}
