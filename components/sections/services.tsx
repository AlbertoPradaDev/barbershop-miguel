"use client";

import { useRef } from "react";
import { gsap, useGSAP, EXIT } from "@/lib/gsap";
import { SectionHeading } from "@/components/ui/section-heading";
import { PillButton } from "@/components/ui/pill-button";
import { TraceSegment } from "@/components/ui/trace-line";
import { services } from "@/lib/content/services";
import { SITE } from "@/lib/content/site";

/*
 * The service menu as a card grid: six outlined cards, three per row on
 * desktop and one per row on mobile, no numbering and no shadow. Each card
 * reads top to bottom as name, blurb, hairline, then price and duration on one
 * baseline row pinned to the bottom by mt-auto, so all six price rows line up
 * however long the blurb runs.
 *
 * Typography is all sans, on purpose: the mono price and duration made the
 * menu read as a spec sheet. The price is now the loudest thing in the card
 * (text-h3, semibold, tabular numerals so the six prices align optically), the
 * name sits a step below it at text-h4, and the duration is a quiet text-p2
 * muted qualifier sharing the price's baseline.
 *
 * Occlusion: every card is an opaque .trace-occlude plate, so the signature
 * cord runs behind the cards and flashes through the grid gaps.
 *
 * Motion recipe:
 *   enter  one ScrollTrigger for the whole grid (trigger = the ul, "top 78%",
 *          once) drives gsap.from on the list items: y 40, opacity 0, duration
 *          0.8, expo.out, stagger 0.08. The trailing Book now button has its
 *          own trigger ("top 92%", once): y 24, opacity 0, duration 0.8,
 *          expo.out.
 *   exit   the standard EXIT scrub reproduced by hand on the section inner
 *          (opacity 0.15, y -40, "bottom 45%" to "bottom 5%", scrub), so the
 *          heading, the grid and the button all leave together. It is not
 *          SectionReveal because that wrapper's own entrance would double fire
 *          against the card stagger; immediateRender is false so the tween
 *          reads its start values only after the cards have already landed.
 *   hover  pure CSS on the card surface, transform and color only: translate
 *          y -6 and the 2px outline warming from border-line-strong to the
 *          accent over 0.4s ease-out, with the price crossfading to the accent
 *          on the same curve. Tailwind v4 gates `hover:` behind (hover: hover),
 *          and every hover rule is mirrored on :active so touch gets the same
 *          feedback. motion-reduce drops the transitions.
 *
 * Why the hover lift lives on an inner div and not on the <li>: the li is the
 * gsap.from target, and the moment GSAP touches an element it folds Tailwind's
 * standalone `translate` property into its own matrix and sets it to none, so a
 * hover translate on the same element would be dead after the entrance runs.
 * The li stays a bare grid cell, the card inside it owns the hover.
 *
 * Reduced motion creates no tweens at all: gsap.from leaves the resting state
 * as the final state, so the cards are simply visible.
 */

const INTRO =
  "Lorem ipsum dolor sit amet consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna.";

/* The trace enters top right, elbows to the left rail and hands x 120 to About. */
const TRACE_D = "M 1180 -40 V 210 Q 1180 238 1152 238 H 148 Q 120 238 120 266 V 1150";
const TRACE_D_MOBILE = "M 24 -40 V 1930";

/*
 * The card surface: opaque plate (so it occludes the cord), 2px outline, no
 * shadow, and the whole lift/warm hover in one transition. h-full makes every
 * card fill its stretched grid cell so the bottom rows align.
 */
const CARD = [
  "trace-occlude group flex h-full flex-col bg-page-bg",
  "rounded-card border-2 border-line-strong p-40 max-md:p-28",
  "transition-[translate,border-color] duration-400 ease-out",
  "hover:-translate-y-6 hover:border-accent",
  "active:-translate-y-6 active:border-accent",
  "motion-reduce:transition-none",
].join(" ");

/* The loudest line in the card: sans, tabular figures, accent on hover. */
const PRICE = [
  "text-h3 max-md:text-mh3 font-semibold [font-variant-numeric:tabular-nums]",
  "transition-colors duration-400 ease-out",
  "group-hover:text-accent group-active:text-accent",
  "motion-reduce:transition-none",
].join(" ");

export function Services() {
  const section = useRef<HTMLElement | null>(null);
  const inner = useRef<HTMLDivElement | null>(null);
  const list = useRef<HTMLUListElement | null>(null);
  const cta = useRef<HTMLDivElement | null>(null);

  useGSAP(
    () => {
      const root = section.current;
      const content = inner.current;
      const grid = list.current;
      const button = cta.current;
      if (!root || !content || !grid || !button) return;

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      gsap.from("[data-service-card]", {
        y: 40,
        opacity: 0,
        duration: 0.8,
        ease: "expo.out",
        stagger: 0.08,
        scrollTrigger: { trigger: grid, start: "top 78%", once: true },
      });

      gsap.from(button, {
        y: 24,
        opacity: 0,
        duration: 0.8,
        ease: "expo.out",
        scrollTrigger: { trigger: button, start: "top 92%", once: true },
      });

      gsap.to(content, {
        opacity: EXIT.opacity,
        y: EXIT.y,
        ease: "none",
        immediateRender: false,
        scrollTrigger: {
          trigger: root,
          start: EXIT.start,
          end: EXIT.end,
          scrub: true,
        },
      });
    },
    { scope: section },
  );

  return (
    <section
      id="services"
      ref={section}
      className="relative px-64 py-140 max-md:px-20 max-md:py-90"
    >
      <TraceSegment
        d={TRACE_D}
        dMobile={TRACE_D_MOBILE}
        height={1110}
        heightMobile={1890}
        anchor="top"
      />

      <div ref={inner} className="relative z-10">
        <SectionHeading intro={INTRO}>Services</SectionHeading>

        <ul
          ref={list}
          className="mt-70 grid grid-cols-3 gap-24 max-md:mt-40 max-md:grid-cols-1 max-md:gap-16"
        >
          {services.map((service) => (
            <li key={service.id} data-service-card className="flex">
              <div className={CARD}>
                <h3 className="text-h4 max-md:text-mh3 font-semibold tracking-tight">
                  {service.name}
                </h3>

                <p className="themed-muted text-p2 max-md:text-mp2 mt-12 mb-32 max-w-none max-md:mt-8 max-md:mb-24">
                  {service.blurb}
                </p>

                <div className="mt-auto flex items-baseline gap-10 border-t border-line themed-border pt-24 max-md:pt-20">
                  <p className={PRICE}>{service.price}</p>
                  <p className="themed-muted text-p2 max-md:text-mp2">
                    {service.duration}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <div ref={cta} className="mt-60 w-fit max-md:mt-36">
          <PillButton variant="draw" href={SITE.bookingUrl}>
            Book now
          </PillButton>
        </div>
      </div>
    </section>
  );
}
