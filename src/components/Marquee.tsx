/**
 * An infinitely scrolling text ticker — pure CSS (the `animate-marquee`
 * keyframe in globals.css translates the track by exactly -50%), so
 * this stays a plain server-renderable component, no client JS needed.
 * The track renders its items twice back to back; since the second
 * copy is identical, the -50% translate loops seamlessly with no
 * visible seam or jump.
 */
export default function Marquee({
  items,
  className = "",
}: {
  items: string[];
  className?: string;
}) {
  return (
    <div className={`overflow-hidden ${className}`}>
      <div className="animate-marquee flex w-max items-center gap-8 whitespace-nowrap py-3 text-sm font-medium">
        {[...items, ...items].map((item, i) => (
          <span key={i} className="flex items-center gap-8">
            <span>{item}</span>
            <span aria-hidden className="text-pop">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}
