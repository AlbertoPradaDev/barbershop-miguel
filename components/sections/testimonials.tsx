"use client";

import { useEffect, useRef, useState } from "react";
import type {
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import { gsap, useGSAP, EXIT } from "@/lib/gsap";
import { SectionHeading } from "@/components/ui/section-heading";
import { StarRating } from "@/components/ui/star-rating";
import { TraceSegment } from "@/components/ui/trace-line";
import { reviews } from "@/lib/content/testimonials";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useFinePointer } from "@/hooks/use-media-query";

/*
 * Review carousel: ONE Google shaped review on screen, centred, advancing on
 * its own every 6 seconds and steerable by the reader. The old two row marquee
 * (duplicated card sets, velocity reactive ScrollTrigger, ticker cruise easing,
 * hover gates, the mobile row fold) is gone entirely; what stays is the
 * section entrance and the EXIT scrub.
 *
 * The card is opaque (page ground plus a 2px `border-line-strong` outline, plus
 * .trace-occlude), so the signature trace cord runs behind it and only shows
 * above and below.
 *
 * Motion recipe:
 *   swap   two pieces of state: `index` is what the reader asked for, `shown`
 *          is what the card currently renders. When they disagree the card
 *          tweens out (opacity 0, y -8, 0.3s power2.in) and commits `shown` on
 *          complete; that commit re-runs the same useGSAP, which now sees them
 *          agree and tweens the fresh content in (y 16 to 0, opacity, 0.5s
 *          expo.out). Vertical only: a horizontal slide would fight the page.
 *          It all lives in one useGSAP keyed on the pair, and the first run
 *          only gsap.sets the resting state so nothing animates on mount.
 *   clock  a real setInterval, restarted whenever `clock` ticks (every manual
 *          change) so a reader who just picked a review keeps the full 6
 *          seconds, and cleared on unmount, on hover with a fine pointer, on
 *          focus inside the carousel, and while the document is hidden.
 *   pager  one centred row under the card: previous button, the six dots, next
 *          button. All three routes call the same show(), so the arrows restart
 *          the clock exactly like a dot and wrap in both directions (previous
 *          from the first lands on the last). The arrows are the one place on
 *          the site allowed to draw an arrow glyph, granted by the client for
 *          this carousel; they are colour only on hover, never scale.
 *   enter  gsap.from the carousel wrapper: y 40, opacity 0, once at "top 80%".
 *          The wrapper carries the entrance and the card inside carries the
 *          swap, so the two never write the same transform.
 *   exit   gsap.to the section inner: opacity EXIT.opacity, y EXIT.y, ease
 *          "none", immediateRender:false, scrubbed across EXIT.start/end.
 * Reduced motion creates no tweens at all and never autoplays: the first review
 * sits on screen and the dots switch instantly.
 *
 * Announcements: the card is aria-live="off" (and aria-atomic), so six silent
 * auto advances never interrupt a screen reader. State is carried by the dots,
 * which are real buttons labelled "Show review N of 6" with aria-current on the
 * active one, plus a polite sr-only status line written ONLY on a manual
 * change; auto advances blank it, and an empty string announces nothing.
 */

const INTRO =
  "Rated 5.0 from 123 reviews on Booksy. A few of them, in the words they were written in.";

/* Functional microcopy: real English. The reviews are real, so the source line
   has to name where they were actually posted. It said Google, which would be a
   false claim about their provenance; every one of them is from Booksy. */
const SOURCE_LINE = "Posted on Booksy";
const CAROUSEL_LABEL = "Client reviews";

/*
 * Pager buttons. Round like the site's other floating controls, borderless
 * (only cards carry an outline), bg-panel at rest so they read as a control and
 * not as a second card. Hover is gated to fine pointers: the capsule floods
 * accent and the glyph flips to bone over 0.4s ease-osmo, no scale and no
 * bounce. :active mirrors it so a thumb gets the same confirmation on a screen
 * that cannot hover.
 */
const PAGER_BUTTON = [
  "grid size-48 shrink-0 place-items-center rounded-full bg-panel",
  "transition-colors duration-400 ease-osmo",
  "active:bg-accent active:text-bone",
  "pointer-fine:hover:bg-accent pointer-fine:hover:text-bone",
  "max-md:size-44",
].join(" ");

/*
 * Trace routing, artboard units, re-measured in the browser at 1440 (root font
 * 12px, so one artboard px is 0.75 css px) after the pager row landed. The
 * section measures 863.58, rounded to 864: it was 847.58 before the arrows,
 * which the old 808 here never caught up with after the card's min-h went from
 * 336 to 376. The run resumes at x 650 after the gallery gap and drops past the
 * card, which sits at x 510 to 1410 and y 350 to 726 and occludes the cord over
 * that stretch; the cord shows above it, then again in the gutter beside the
 * pager row (that row is 729 to 777 but its buttons and dots only span x 792 to
 * 1128, so the cord clears them), then elbows right at y 792 into a horizontal
 * run at y 820, the middle of the clear band between the pager and the section
 * end, and drops at x 1800 into the FAQ, which picks the cord up at that same x.
 * The cord is desktop only, so there is no mobile path. The run overshoots the
 * artboard by 95, which the svg clips, so it always reaches the seam.
 */
const TRACE_HEIGHT = 864;
const TRACE_D =
  "M 650 -40 V 792 Q 650 820 678 820 H 1772 Q 1800 820 1800 848 V 959";

/* Autoplay period, in ms. */
const AUTOPLAY_MS = 6000;
/* How far a finger must travel across the card before it counts as a swipe. */
const SWIPE_PX = 40;
/* Past this much vertical travel the gesture is a scroll, not a swipe. */
const SWIPE_CANCEL_PX = 16;

const COUNT = reviews.length;

export function Testimonials() {
  const section = useRef<HTMLElement | null>(null);
  const inner = useRef<HTMLDivElement | null>(null);
  const carousel = useRef<HTMLDivElement | null>(null);
  const card = useRef<HTMLElement | null>(null);
  /* Live swipe: pointer id plus the origin of the gesture. */
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);
  const firstRun = useRef(true);

  const reduced = useReducedMotion();
  const finePointer = useFinePointer();

  /* What the reader asked for, and what the card is currently rendering. */
  const [index, setIndex] = useState(0);
  const [shown, setShown] = useState(0);
  /* Bumped on every manual change purely to restart the autoplay interval. */
  const [clock, setClock] = useState(0);
  const [status, setStatus] = useState("");
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pageHidden, setPageHidden] = useState(false);

  const paused = hovered || focused || pageHidden;
  const review = reviews[shown];

  /* Every manual route in: dots, swipe, arrow keys. Announces once, then
     restarts the clock so nobody gets yanked 200ms after they chose. */
  const show = (next: number) => {
    const target = ((next % COUNT) + COUNT) % COUNT;
    setIndex(target);
    setStatus(`Review ${target + 1} of ${COUNT}, ${reviews[target].author}`);
    setClock((tick) => tick + 1);
  };

  /* Autoplay. Reduced motion never starts it, and any pause reason stops it. */
  useEffect(() => {
    if (reduced || paused) return;
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % COUNT);
      /* Auto advances stay out of the live region: an empty string is silent. */
      setStatus("");
    }, AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [reduced, paused, clock]);

  /* A backgrounded tab must not burn through all six reviews unread. */
  useEffect(() => {
    const sync = () => setPageHidden(document.hidden);
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);

  /* Section entrance and exit. Kept out of the index keyed context below so an
     advance can never re-fire the entrance or rebuild the scrub. */
  useGSAP(
    () => {
      const sectionEl = section.current;
      const innerEl = inner.current;
      const carouselEl = carousel.current;
      if (!sectionEl || !innerEl || !carouselEl) return;
      if (reduced) return;

      gsap.from(carouselEl, {
        y: 40,
        opacity: 0,
        duration: 0.9,
        ease: "expo.out",
        scrollTrigger: { trigger: carouselEl, start: "top 80%", once: true },
      });

      /* immediateRender:false so the scrub reads its start values only after
         the carousel has entered, never the hidden state of the tween above. */
      gsap.to(innerEl, {
        opacity: EXIT.opacity,
        y: EXIT.y,
        ease: "none",
        immediateRender: false,
        scrollTrigger: {
          trigger: sectionEl,
          start: EXIT.start,
          end: EXIT.end,
          scrub: true,
        },
      });
    },
    { scope: section, dependencies: [reduced], revertOnUpdate: true },
  );

  /* The swap, in one place. overwrite:"auto" means a reader who hits three dots
     in a row gets one continuous fade instead of stacked tweens. */
  useGSAP(
    () => {
      const cardEl = card.current;
      if (!cardEl) return;

      if (reduced) {
        /* overwrite kills a fade that was in flight when the preference
           flipped, so the card can never be left stranded at opacity 0. */
        gsap.set(cardEl, { opacity: 1, y: 0, overwrite: true });
        if (shown !== index) setShown(index);
        return;
      }

      if (firstRun.current) {
        firstRun.current = false;
        gsap.set(cardEl, { opacity: 1, y: 0 });
        return;
      }

      if (shown !== index) {
        gsap.to(cardEl, {
          opacity: 0,
          y: -8,
          duration: 0.3,
          ease: "power2.in",
          overwrite: "auto",
          onComplete: () => setShown(index),
          /* A fade out that never finishes would leave the card stranded at
             opacity 0 with the reader looking at nothing: the commit lives in
             onComplete, so anything that kills the tween mid flight (a second
             dot, a re-render, a ticker that stopped while the tab was hidden)
             would swallow it. Interrupting therefore commits too, and snaps the
             card back to visible so the next run has a clean slate. */
          onInterrupt: () => {
            setShown(index);
            gsap.set(cardEl, { opacity: 1, y: 0 });
          },
        });
        return;
      }

      gsap.fromTo(
        cardEl,
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.5, ease: "expo.out", overwrite: "auto" },
      );
    },
    { scope: section, dependencies: [index, shown, reduced] },
  );

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      show(index - 1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      show(index + 1);
    }
  };

  /* Touch swipe. touch-action: pan-y leaves vertical scrolling to the browser,
     which also fires pointercancel the moment a scroll starts, so a flick down
     the page can never be read as a review change. */
  const onPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType === "mouse") return;
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const start = drag.current;
    if (!start || start.id !== event.pointerId) return;
    const dx = Math.abs(event.clientX - start.x);
    const dy = Math.abs(event.clientY - start.y);
    if (dy > SWIPE_CANCEL_PX && dy >= dx) drag.current = null;
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLElement>) => {
    const start = drag.current;
    drag.current = null;
    if (!start || start.id !== event.pointerId) return;
    const dx = event.clientX - start.x;
    if (Math.abs(dx) < SWIPE_PX) return;
    show(index + (dx < 0 ? 1 : -1));
  };

  const onPointerCancel = () => {
    drag.current = null;
  };

  return (
    <section
      id="reviews"
      ref={section}
      className="relative px-64 py-140 max-md:px-20 max-md:py-90"
    >
      <TraceSegment
        d={TRACE_D}
        height={TRACE_HEIGHT}
        anchor="top"
      />

      <div ref={inner} className="relative z-10">
        <SectionHeading intro={INTRO}>What clients say</SectionHeading>

        <div
          ref={carousel}
          role="group"
          aria-label={CAROUSEL_LABEL}
          tabIndex={0}
          onKeyDown={onKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="mt-72 focus-visible:outline-offset-8 max-md:mt-40"
        >
          <article
            ref={card}
            aria-live="off"
            aria-atomic="true"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerCancel}
            onMouseEnter={finePointer ? () => setHovered(true) : undefined}
            onMouseLeave={finePointer ? () => setHovered(false) : undefined}
            /* min-h holds the card at the tallest of the six, so an advance
               never nudges the dots or the trace elbow half a line up the page.
               Re-measured against the REAL reviews, which run longer than the
               placeholder set this was first tuned to: the longest (Zach) needs
               364 artboard px on desktop and 354 on mobile, where 336 gave it
               only 252px and 336px and the dots jumped 21px on that one slide.
               376 is the next step of 8 that clears both with headroom. */
            className="trace-occlude mx-auto min-h-376 max-w-900 touch-pan-y rounded-card border-2 border-line-strong bg-page-bg p-48 max-md:w-full max-md:p-28"
          >
            <div className="flex items-center gap-16">
              <span
                aria-hidden
                className="grid size-48 shrink-0 place-items-center rounded-full bg-panel text-p1 font-medium max-md:size-40 max-md:text-mp1"
              >
                {review.initial}
              </span>
              <span className="text-p1 font-medium max-md:text-mp1">
                {review.author}
              </span>
              <span className="themed-muted ml-auto text-p2 max-md:text-mp2">
                {review.date}
              </span>
            </div>

            <StarRating className="mt-24" />

            <p className="mt-24 text-p1 max-md:mt-16 max-md:text-mp1">
              {review.text}
            </p>

            <p className="themed-muted mt-32 text-p2 tracking-[0.08em] uppercase max-md:mt-24 max-md:text-mp2">
              {SOURCE_LINE}
            </p>
          </article>

          {/* Pager. Centred with a wide gap on desktop; on mobile the row
              spans the card and the two arrows sit flush with its edges, which
              is the only way 344 artboard px of controls read as deliberate
              inside a 350 wide column. */}
          <div className="mt-24 flex items-center justify-center gap-24 max-md:mt-16 max-md:justify-between max-md:gap-8">
            <button
              type="button"
              onClick={() => show(index - 1)}
              aria-label="Previous review"
              className={PAGER_BUTTON}
            >
              <Chevron back />
            </button>

            <div className="flex">
              {reviews.map((item, position) => {
                const active = position === index;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => show(position)}
                    aria-label={`Show review ${position + 1} of ${COUNT}`}
                    aria-current={active ? "true" : undefined}
                    className="grid size-32 place-items-center max-md:size-40"
                  >
                    <span
                      className={`size-10 rounded-full border border-line-strong transition-colors duration-300 ease-osmo ${
                        active ? "border-accent bg-accent" : ""
                      }`}
                    />
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => show(index + 1)}
              aria-label="Next review"
              className={PAGER_BUTTON}
            >
              <Chevron />
            </button>
          </div>

          <p className="sr-only" aria-live="polite">
            {status}
          </p>
        </div>
      </div>
    </section>
  );
}

/*
 * Pager chevron, 16 artboard px, drawn inline: one stroked polyline in
 * currentColor, so it inherits the flip to bone when the button floods accent.
 * No icon library and no fill.
 */
function Chevron({ back = false }: { back?: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className="size-16 flex-none"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={back ? "M10 3 5 8 10 13" : "M6 3 11 8 6 13"} />
    </svg>
  );
}
