"use client";

/*
 * Gallery: eight recent cuts. On desktop they ride a rail the page scroll drives
 * sideways, the heading parked top left while the rail slides under it. Every
 * card is the same plate: 420 wide, 4:5 tall, one gap between them, so the row
 * reads as an even filmstrip and the eye compares the photographs instead of
 * the boxes. Below 768 the rail becomes a deck: the same eight figures keep the
 * same 4:5 frame at full column width, and each one sticks at the same offset
 * under the header, so the next photo climbs up the screen and comes to rest ON
 * TOP of the one before it. The pile grows as you scroll and leaves as one.
 * Nothing scrolls sideways on a phone, ever.
 *
 * Motion recipe (everything created inside gsap.matchMedia, so a resize or a
 * pointer change re-evaluates and reverts cleanly):
 *   >= 768, fine pointer + hover + no reduced motion
 *     pin   ScrollTrigger trigger=section, pin=the h-screen inner block,
 *           start "top top", end "+=" + (rail.scrollWidth - viewport width),
 *           scrub 1, anticipatePin 1, invalidateOnRefresh,
 *           refreshPriority 1 so the pin lays out its spacing before the exit
 *           trigger below it measures the section's bottom.
 *     rail  gsap.to(rail, x: -(rail.scrollWidth - viewport width)), ease none.
 *   >= 768 + no reduced motion
 *     enter first three cards gsap.from opacity 0, x 60, stagger 0.08 on the
 *           REVEAL duration/ease, trigger=section start "top 70%", once.
 *     exit  gsap.to(content, opacity EXIT.opacity, y EXIT.y, ease none)
 *           scrubbed from EXIT.start to EXIT.end on the section. The section is
 *           as tall as the pin spacing, so that range sits entirely below the
 *           pinned range: pin and exit never overlap. The tween targets a node
 *           INSIDE the pinned block, never an ancestor of it, so its transform
 *           can never become the containing block for the pin.
 *   < 768 (the deck, no pin anywhere)
 *     stack pure CSS, no script: the column is a flex column and every figure is
 *           position: sticky at top 90, clear of the 72 tall mobile header, with
 *           a z-index rising by index so a later plate paints over an earlier
 *           one. A 240 tall spacer closes the column so the last photo holds at
 *           the top before the whole pile scrolls off together. That room has to
 *           be a box in the flow: a sticky box is clamped by its container's
 *           CONTENT box, so trailing padding on the rail would extend nothing.
 *           Gated on motion-safe, so under reduced motion the same markup lays
 *           out as the plain vertical column it was before.
 *   < 768 + no reduced motion
 *     enter ScrollTrigger.batch over the figures still below the reveal line,
 *           start "top 85%", once per card, batched on a 0.1s interval so cards
 *           that cross together animate together: opacity 0 -> 1, y 32 -> 0,
 *           0.8s expo.out, stagger 0.08. It moves the photograph inside the
 *           plate, never the plate itself, so the enter and the recede below
 *           never write the same property on the same node. The title chip rides
 *           the same batch 0.15s behind, opacity 0 -> 1 and y 8 -> 0. Cards
 *           already above that line when the context builds are never hidden, so
 *           a mid page reload can never leave a photo blank.
 *     recede ONE scrubbed tween per covered figure, ease none: scale 1 -> 0.94
 *           and opacity 1 -> 0.4 across exactly the card height of scroll its
 *           successor needs to climb over it, so a covered plate sinks back and
 *           dims into the band instead of being flatly overlapped. Transform and
 *           opacity only. Start and end are absolute scroll positions computed
 *           from the rail, a box that never sticks, plus the card index: a
 *           figure measured while it is stuck reports the offset it is held at
 *           rather than its place in the column, so triggers built from the
 *           figures themselves would land in the wrong place after a reload part
 *           way down the deck. That geometry is measured ONCE per refresh (a
 *           refreshInit listener clears the cache), not once per card, and none
 *           of these triggers pins, so none of them queues a refresh of its own.
 *   coarse pointer: no pin is ever created, on any width.
 *   hover, fine pointer only: image grayscale(1) -> grayscale(0) plus scale
 *           1.05 over 0.5s, CSS only and user initiated.
 *   reduced motion: no tweens, no pin, no deck, every card rests opaque in place
 *           (the hidden start state is set in JS, so the CSS resting state is
 *           final).
 *
 * The figures carry `trace-occlude`, the opaque page-colored plate, so the
 * signature cord is hidden behind the photos and only shows in the gaps. That
 * plate is also what makes the deck read: a stuck photo has to hide the one
 * underneath it completely. Each one is a media plate in the Revolut register:
 * `rounded-media`, no border and no shadow at any breakpoint, the photograph
 * meeting the page directly.
 *
 * Colour comes from the band. The section paints nothing of its own: it sits in
 * a data-scheme="dark" wrapper, so `trace-occlude` resolves to black here and
 * would resolve to white unchanged in a light band. The only fixed values are
 * the caption chip's ink plate and bone label, which have to hold against a
 * photograph rather than against the page. The chip is set in the page's one
 * family at 0.75rem, uppercase on 0.08em of tracking: the house treatment for a
 * small functional label, so it reads as a tag on the photograph and never as a
 * sentence.
 */

import Image from "next/image";
import { useRef } from "react";
import { gsap, useGSAP, ScrollTrigger, REVEAL, EXIT } from "@/lib/gsap";
import { SectionHeading } from "@/components/ui/section-heading";
import { cuts } from "@/lib/content/gallery";

const HEADING = "Recent cuts";

/*
 * The rail is a rail only where the layout draws one: the `max-md:` column and
 * the media gates below flip at the same 768 boundary, so a narrow window can
 * never pin a stack that has nothing to slide.
 */
const DESKTOP =
  "(min-width: 768px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)";
const DESKTOP_MOTION =
  "(min-width: 768px) and (prefers-reduced-motion: no-preference)";
const STACK_MOTION =
  "(max-width: 767px) and (prefers-reduced-motion: no-preference)";

/* Deck numbers in one place so the recipe above stays true to the code. */
const STACK = {
  enterY: 32,
  duration: 0.8,
  ease: "expo.out",
  stagger: 0.08,
  chipY: 8,
  chipDuration: 0.6,
  chipDelay: 0.15,
  /* Where a plate settles once the next one has covered it completely. */
  coveredScale: 0.94,
  coveredOpacity: 0.4,
} as const;

/* Flow geometry of the deck, in document scroll positions. */
interface Deck {
  /* Scroll position at which the first plate comes to rest. */
  first: number;
  /* Scroll between one plate coming to rest and the next doing the same. */
  step: number;
  /* Height of a plate, which is also the climb its successor makes over it. */
  height: number;
}

export function Gallery() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const pinRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const railRef = useRef<HTMLDivElement | null>(null);

  useGSAP(
    () => {
      const section = sectionRef.current;
      const pin = pinRef.current;
      const content = contentRef.current;
      const viewport = viewportRef.current;
      const rail = railRef.current;
      if (!section || !pin || !content || !viewport || !rail) return;

      /* Re-read on every refresh: the artboard rescales with the viewport. */
      const distance = () =>
        Math.max(0, rail.scrollWidth - viewport.clientWidth);

      const figures = () => gsap.utils.toArray<HTMLElement>("[data-cut]", rail);
      const partsOf = (cards: Element[], selector: string) =>
        cards
          .map((card) => card.querySelector<HTMLElement>(selector))
          .filter((part): part is HTMLElement => part !== null);

      const mm = gsap.matchMedia();

      mm.add(DESKTOP, () => {
        gsap.to(rail, {
          x: () => -distance(),
          ease: "none",
          scrollTrigger: {
            trigger: section,
            pin,
            start: "top top",
            end: () => "+=" + distance(),
            scrub: 1,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            refreshPriority: 1,
          },
        });
      });

      mm.add(DESKTOP_MOTION, () => {
        const lead = figures().slice(0, 3);

        gsap.from(lead, {
          opacity: 0,
          x: 60,
          duration: REVEAL.duration,
          stagger: 0.08,
          ease: REVEAL.ease,
          scrollTrigger: { trigger: section, start: "top 70%", once: true },
        });

        gsap.to(content, {
          opacity: EXIT.opacity,
          y: EXIT.y,
          ease: "none",
          immediateRender: false,
          scrollTrigger: {
            trigger: section,
            start: EXIT.start,
            end: EXIT.end,
            scrub: true,
            invalidateOnRefresh: true,
          },
        });
      });

      mm.add(STACK_MOTION, () => {
        const cards = figures();
        if (!cards.length) return;

        const photosOf = (batch: Element[]) =>
          partsOf(batch, "[data-cut-inner]");
        const chipsOf = (batch: Element[]) => partsOf(batch, "[data-cut-chip]");

        /*
         * Only cards still below the reveal line get hidden and batched. A
         * reload part way down the page (or a hot reload while the deck is on
         * screen) builds the triggers already past their start, and a trigger
         * created past its start never fires onEnter: those photos would sit at
         * opacity 0 forever. Left alone they simply render, which is the only
         * safe failure mode for photographs.
         */
        const line = window.innerHeight * 0.85;
        const pending = cards.filter(
          (card) => card.getBoundingClientRect().top > line,
        );

        /* Hidden state lives here, not in CSS: reduced motion never sees it. */
        gsap.set(photosOf(pending), { opacity: 0, y: STACK.enterY });
        gsap.set(chipsOf(pending), { opacity: 0, y: STACK.chipY });

        /* One batch for every card that still has to arrive. */
        if (pending.length) {
          ScrollTrigger.batch(pending, {
            start: "top 85%",
            once: true,
            interval: 0.1,
            batchMax: 3,
            onEnter: (batch) => {
              gsap.to(photosOf(batch), {
                opacity: 1,
                y: 0,
                duration: STACK.duration,
                stagger: STACK.stagger,
                ease: STACK.ease,
              });
              gsap.to(chipsOf(batch), {
                opacity: 1,
                y: 0,
                duration: STACK.chipDuration,
                stagger: STACK.stagger,
                delay: STACK.chipDelay,
                ease: STACK.ease,
              });
            },
          });
        }

        /*
         * Measured from the rail and from computed style, never from a figure's
         * box: the figures are the sticky ones, and a stuck box reports where it
         * is being held rather than where it sits in the column. Cached until
         * the next refresh, so seven triggers cost one measurement and not seven.
         */
        let deck: Deck | null = null;
        const measure = (): Deck => {
          const rails = getComputedStyle(rail);
          const height = cards[0].offsetHeight;
          const gap = parseFloat(rails.rowGap) || 0;
          /* Computed `top` on a sticky box is the offset it was asked to hold
             at, so this reads the same whether or not the deck is stacked. */
          const hold = parseFloat(getComputedStyle(cards[0]).top) || 0;
          const columnTop =
            rail.getBoundingClientRect().top +
            window.scrollY +
            (parseFloat(rails.paddingTop) || 0);

          return { first: columnTop - hold, step: height + gap, height };
        };
        const deckAt = () => (deck ??= measure());
        const invalidate = () => {
          deck = null;
        };
        ScrollTrigger.addEventListener("refreshInit", invalidate);

        /* The last plate is never covered, so it never recedes. */
        cards.slice(0, -1).forEach((card, index) => {
          gsap.to(card, {
            scale: STACK.coveredScale,
            opacity: STACK.coveredOpacity,
            ease: "none",
            immediateRender: false,
            scrollTrigger: {
              /* Absolute scroll positions: the successor spends exactly one
                 card height climbing over this plate before it rests on it. */
              start: () => {
                const at = deckAt();
                return at.first + (index + 1) * at.step - at.height;
              },
              end: () => {
                const at = deckAt();
                return at.first + (index + 1) * at.step;
              },
              scrub: true,
            },
          });
        });

        return () =>
          ScrollTrigger.removeEventListener("refreshInit", invalidate);
      });

      return () => mm.kill();
    },
    { scope: sectionRef },
  );

  return (
    <section
      ref={sectionRef}
      id="gallery"
      aria-label={HEADING}
      className="relative min-h-screen max-md:min-h-0"
    >
      <div className="relative z-10">
        <div
          ref={pinRef}
          className="flex h-screen max-md:h-auto flex-col justify-center py-80 max-md:py-90"
        >
          <div ref={contentRef}>
            <div className="px-64 max-md:px-20">
              <SectionHeading>{HEADING}</SectionHeading>
            </div>

            {/* Desktop: not a scroll container, GSAP moves the rail. Below 768
                the same element holds the deck: nothing overflows, so there is
                no sideways scroll to contain. */}
            <div
              ref={viewportRef}
              className="mt-56 max-md:mt-40 overflow-x-visible"
            >
              <div
                ref={railRef}
                className="flex w-max items-center gap-24 px-64 py-24 max-md:w-full max-md:flex-col max-md:items-stretch max-md:gap-32 max-md:px-20 max-md:py-16"
              >
                {/* One size for all eight: 420 wide and 4:5 on the rail, the
                    same 4:5 at full column width in the deck. The `tall` flag in
                    the data module is deliberately not read. */}
                {cuts.map((cut, index) => (
                  <figure
                    key={cut.id}
                    data-cut
                    /* Later plates paint over earlier ones, which is the whole
                       trick: without this the deck would build backwards. */
                    style={{ zIndex: index + 1 }}
                    className="trace-occlude group relative aspect-[4/5] w-420 shrink-0 overflow-hidden rounded-media max-md:w-full max-md:motion-safe:sticky max-md:motion-safe:top-90"
                  >
                    <div data-cut-inner className="absolute inset-0">
                      <Image
                        src={cut.image}
                        alt=""
                        fill
                        sizes="(max-width:767px) 90vw, 22vw"
                        className="object-cover grayscale pointer-coarse:grayscale-0 pointer-fine:transition-[filter,scale] pointer-fine:duration-500 pointer-fine:ease-osmo pointer-fine:group-hover:grayscale-0 pointer-fine:group-hover:scale-105"
                      />
                    </div>
                    <figcaption
                      data-cut-chip
                      className="absolute bottom-12 left-12 z-10 rounded-btn bg-ink/70 px-10 py-4 text-[0.75rem] font-medium tracking-[0.08em] text-bone uppercase"
                    >
                      {cut.title}
                    </figcaption>
                  </figure>
                ))}
                {/* Scroll room for the last plate to hold at the top before the
                    pile leaves as one. It has to be a box in the flow: sticky is
                    clamped by the column's content box, so trailing padding on
                    the rail would extend nothing. */}
                <div
                  aria-hidden
                  className="hidden max-md:h-240 max-md:motion-safe:block"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
