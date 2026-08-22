/*
 * Five filled stars in the star token color, 16 artboard px each. Pure markup,
 * no JS: this is the server rendered version used inside review cards.
 * Motion recipe: none here. The optional pop on scroll lives in
 * components/ui/star-rating-pop.tsx, which wraps this component.
 */

export const STAR_COUNT = 5;

/* A 5 point star inscribed in the 16x16 artboard, outer r 7.4, inner r 2.95. */
const STAR_PATH =
  "M8 0.8 9.73 5.81 15.04 5.91 10.81 9.11 12.35 14.19 8 11.15 3.65 14.19 5.19 9.11 0.96 5.91 6.27 5.81Z";

export function StarRating({ className = "" }: { className?: string }) {
  return (
    <div
      role="img"
      aria-label={`Rated ${STAR_COUNT} out of ${STAR_COUNT}`}
      className={`inline-flex items-center gap-4 text-star ${className}`}
    >
      {Array.from({ length: STAR_COUNT }, (_, i) => (
        <svg
          key={i}
          aria-hidden
          viewBox="0 0 16 16"
          className="size-16 flex-none fill-current"
        >
          <path d={STAR_PATH} />
        </svg>
      ))}
    </div>
  );
}
