export default function StarRating({
  rating,
  count,
  size = "text-sm",
}: {
  rating: number;
  count?: number;
  size?: string;
}) {
  const rounded = Math.round(rating);
  return (
    <span className={`inline-flex items-center gap-1 ${size}`}>
      <span className="text-amber-500">
        {"★".repeat(rounded)}
        <span className="text-stone-300">{"★".repeat(5 - rounded)}</span>
      </span>
      {count !== undefined && (
        <span className="text-stone-500">
          {rating > 0 ? rating.toFixed(1) : "No ratings"}
          {count > 0 && ` (${count})`}
        </span>
      )}
    </span>
  );
}
