"use client";

/*
 * Gallery: ten recent cuts. On desktop they ride a rail the page scroll drives
 * sideways, the heading parked top left while the rail slides under it. Every
 * card is the same plate: 420 wide, 4:5 tall, one gap between them, so the row
 * reads as an even filmstrip and the eye compares the photographs instead of
 * the boxes. Below 768 the rail is gone: the same ten figures keep the same 4:5
 * frame and stack in one full width column that the page scrolls vertically.
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
 *   < 768 + no reduced motion (the stack, no pin anywhere)
 *     enter ScrollTrigger.batch over the figures still below the reveal line,
 *           start "top 85%", once per card, batched on a 0.1s interval so
 *           cards that cross together animate together: opacity 0 -> 1,
 *           y 40 -> 0, 0.8s expo.out, stagger 0.08. The title chip rides the
 *           same batch 0.15s behind its card, opacity 0 -> 1 and y 8 -> 0.
 *           Cards already above that line when the context builds are never
 *           hidden, so a mid page reload can never leave a photo blank.
 *     pass  ONE scrubbed timeline per figure, its own figure as trigger, over
 *           the card's whole travel ("top bottom" to "bottom top"): the image
 *           inner rides yPercent -6 -> 6 for parallax, and the last 22% of that
 *           range is the exit, dimming the card to 0.45 and lifting it 24px as
 *           it clears the top. The inner overhangs the card by 10% top and
 *           bottom while travelling 6% of its own (120%) height, so roughly a
 *           tenth of the card height of cover is always in reserve and no edge
 *           can ever be uncovered. Parallax and exit share one ScrollTrigger
 *           per card instead of two.
 *   coarse pointer: no pin is ever created, on any width.
 *   hover, fine pointer only: image grayscale(1) -> grayscale(0) plus scale
 *           1.05 over 0.5s, CSS only and user initiated.
 *   reduced motion: no tweens, no pin, every card rests opaque in place (the
 *           hidden start state is set in JS, so the CSS resting state is final).
 *
 * The figures carry `trace-occlude`, the opaque page-colored plate, so the
 * signature cord is hidden behind the photos and only shows in the gaps. Each
 * one is a media plate in the Revolut register: `rounded-media`, no border and
 * no shadow at any breakpoint, the photograph meeting the page directly.
 *
 * Colour comes from the band. The section paints nothing of its own: it sits in
 * a data-scheme="dark" wrapper, so `trace-occlude` resolves to black here and
 * would resolve to white unchanged in a light band. The only fixed values are
 * the caption chip's ink plate and bone label, which have to hold against a
 * photograph rather than against the page.
 */

import Image from "next/image";
import { useRef } from "react";
import { gsap, useGSAP, ScrollTrigger, REVEAL, EXIT } from "@/lib/gsap";
import { SectionHeading } from "@/components/ui/section-heading";
import { cuts } from "@/lib/content/gallery";

const HEADING = "Recent cuts";

/*
 * The rail is a rail only where the layout draws one: the `max-md:` grid and
 * the media gates below flip at the same 768 boundary, so a narrow window can
 * never pin a stack that has nothing to slide.
 */
const DESKTOP =
  "(min-width: 768px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)";
const DESKTOP_MOTION =
  "(min-width: 768px) and (prefers-reduced-motion: no-preference)";
const STACK_MOTION =
  "(max-width: 767px) and (prefers-reduced-motion: no-preference)";

/* Stack numbers in one place so the recipe above stays true to the code. */
const STACK = {
  enterY: 40,
  duration: 0.8,
  ease: "expo.out",
  stagger: 0.08,
  chipY: 8,
  chipDuration: 0.6,
  chipDelay: 0.15,
  parallax: 6,
  exitOpacity: 0.45,
  exitY: -24,
  /* Where in the card's travel the exit takes over, as timeline progress. */
  exitAt: 0.78,
} as const;

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
      const chipsOf = (cards: Element[]) =>
        cards
          .map((card) => card.querySelector<HTMLElement>("[data-cut-chip]"))
          .filter((chip): chip is HTMLElement => chip !== null);

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

        /*
         * Only cards still below the reveal line get hidden and batched. A
         * reload part way down the page (or a hot reload while the stack is on
         * screen) builds the triggers already past their start, and a trigger
         * created past its start never fires onEnter: those cards would sit at
         * opacity 0 forever. Left alone they simply render, which is the only
         * safe failure mode for photographs.
         */
        const line = window.innerHeight * 0.85;
        const pending = cards.filter(
          (card) => card.getBoundingClientRect().top > line,
        );

        /* Hidden state lives here, not in CSS: reduced motion never sees it. */
        gsap.set(pending, { opacity: 0, y: STACK.enterY });
        gsap.set(chipsOf(pending), { opacity: 0, y: STACK.chipY });

        /*
         * One batch for every card that still has to arrive. No overwrite: the
         * exit tween below is a parked tween on the same targets and has to
         * survive the enter.
         */
        if (pending.length) {
          ScrollTrigger.batch(pending, {
            start: "top 85%",
            once: true,
            interval: 0.1,
            batchMax: 3,
            onEnter: (batch) => {
              gsap.to(batch, {
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

        cards.forEach((card) => {
          const inner = card.querySelector<HTMLElement>("[data-cut-inner]");

          const pass = gsap.timeline({
            defaults: { ease: "none" },
            scrollTrigger: {
              trigger: card,
              start: "top bottom",
              end: "bottom top",
              scrub: true,
              invalidateOnRefresh: true,
            },
          });

          if (inner) {
            pass.fromTo(
              inner,
              { yPercent: -STACK.parallax },
              { yPercent: STACK.parallax, duration: 1 },
              0,
            );
          }

          pass.to(
            card,
            {
              opacity: STACK.exitOpacity,
              y: STACK.exitY,
              duration: 1 - STACK.exitAt,
            },
            STACK.exitAt,
          );
        });
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
                the same element holds a plain column: nothing overflows, so
                there is no sideways scroll to contain. */}
            <div
              ref={viewportRef}
              className="mt-56 max-md:mt-40 overflow-x-visible"
            >
              <div
                ref={railRef}
                className="flex w-max items-center gap-24 px-64 py-24 max-md:grid max-md:w-full max-md:grid-cols-1 max-md:gap-16 max-md:px-20 max-md:py-16"
              >
                {/* One size for all ten: 420 wide and 4:5 on the rail, the same
                    4:5 at full column width on the stack. The `tall` flag in the
                    data module is deliberately not read. */}
                {cuts.map((cut) => (
                  <figure
                    key={cut.id}
                    data-cut
                    className="trace-occlude group relative aspect-[4/5] w-420 shrink-0 overflow-hidden rounded-media max-md:w-full"
                  >
                    {/* Overhangs the card by 10% top and bottom on phones so
                        the parallax always has cover to travel into. Exactly
                        inset on desktop, where nothing moves it. */}
                    <div
                      data-cut-inner
                      className="absolute inset-0 max-md:-top-[10%] max-md:h-[120%]"
                    >
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
                      className="absolute bottom-12 left-12 z-10 rounded-btn bg-ink/70 px-10 py-4 font-mono text-[0.75rem] text-bone"
                    >
                      {cut.title}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
