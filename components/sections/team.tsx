"use client";

import Image from "next/image";
import { useRef } from "react";
import { gsap, useGSAP, EXIT } from "@/lib/gsap";
import { MaskedText } from "@/components/ui/masked-text";
import { SectionHeading } from "@/components/ui/section-heading";
import { TraceSegment } from "@/components/ui/trace-line";
import { barber } from "@/lib/content/barbers";

/*
 * The barber. The shop runs on one chair and one pair of hands, so this is not
 * a roster grid: it is a single feature block, portrait on the left at 45 of
 * the 100 columns and the whole introduction on the right at 55. A lone card in
 * a four column grid reads as a mistake, a feature block reads as a person.
 *
 * The portrait is whatever lib/content/barbers.ts hands over (real photography
 * on the Pexels CDN); this file never names an image URL of its own.
 *
 * Surface: the portrait is a rounded-media plate (24 artboard px) with no
 * border and no shadow, exactly like the About plates, and the copy sits
 * straight on the band with no card around it. Nothing in here is filled.
 *
 * Motion recipe (one useGSAP, scoped to the section)
 *   enter  portrait  clip-path inset(10%) to inset(0%) with scale 1.06 to 1,
 *                    1.1s expo.out, once at "top 75%" of the feature block, so
 *                    the frame opens outward from its own centre.
 *          copy      name, role and bio rise line by line through MaskedText,
 *                    and the Instagram link lifts in behind them.
 *   ambient fine pointers only: the inner layer of the plate runs yPercent -6
 *          to 6, ease none, scrub, across "top bottom" to "bottom top" of the
 *          figure, the same parallax the About plates use. That layer is inset
 *          by -12% vertically, so the travel never uncovers an edge.
 *   exit   ONE scrubbed timeline across EXIT.start to EXIT.end, length 1:
 *            inner    opacity to EXIT.opacity, y to EXIT.y
 *            heading  y to EXIT.y * 0.4, leading the block out
 *            portrait y to EXIT.y * 0.5 with scale to 0.98
 *            copy     y to EXIT.y * 0.25, trailing just behind the plate
 *          ease "none" and immediateRender:false throughout, so the scrub reads
 *          its start values only after the entrance has finished.
 *   occlusion  the heading plate, the portrait and every copy block carry
 *          .trace-occlude, an opaque page-bg surface, so the trace cord is
 *          hidden behind them and reads only in the gaps.
 *
 * clip-path is the one non transform/opacity property here: a once only paint
 * level tween on a single element, and it is what gives the plate its
 * developing print open. Reduced motion creates no tweens at all; the served
 * markup is already the final state.
 */

const INTRO =
  "One chair, one barber. You book with Miguel, and Miguel is who cuts your hair.";

/*
 * Measured off the artboard. The content box is 1792 wide (1920 less px-64
 * either side); the portrait column is (1792 - 64) * 0.45 = 778, which is 41vw
 * of 1920, so 42vw covers it. On the 390 artboard the plate spans the whole 350
 * content box, which is 90vw.
 */
const PORTRAIT_SIZES = "(max-width:767px) 90vw, 42vw";

export function Team() {
  const root = useRef<HTMLElement | null>(null);
  const inner = useRef<HTMLDivElement | null>(null);
  const feature = useRef<HTMLDivElement | null>(null);
  const portrait = useRef<HTMLElement | null>(null);

  useGSAP(
    () => {
      const section = root.current;
      const target = inner.current;
      const block = feature.current;
      const plate = portrait.current;
      if (!section || !target || !block || !plate) return;

      /* Reduced motion: the markup already reads as the finished state. */
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      /* Enter: the plate develops open while the copy rises beside it. */
      gsap.fromTo(
        plate,
        { clipPath: "inset(10%)", scale: 1.06 },
        {
          clipPath: "inset(0%)",
          scale: 1,
          duration: 1.1,
          ease: "expo.out",
          scrollTrigger: { trigger: block, start: "top 75%", once: true },
        },
      );

      gsap.from("[data-team-link]", {
        y: 20,
        opacity: 0,
        duration: 0.9,
        ease: "expo.out",
        delay: 0.35,
        scrollTrigger: { trigger: block, start: "top 75%", once: true },
      });

      /* Exit: one scrubbed timeline, heading first, then the plate and copy. */
      gsap
        .timeline({
          defaults: { ease: "none", immediateRender: false, duration: 1 },
          scrollTrigger: {
            trigger: section,
            start: EXIT.start,
            end: EXIT.end,
            scrub: true,
          },
        })
        .to(target, { opacity: EXIT.opacity, y: EXIT.y }, 0)
        .to("[data-team-head]", { y: EXIT.y * 0.4 }, 0)
        .to(plate, { y: EXIT.y * 0.5, scale: 0.98 }, 0)
        .to("[data-team-copy]", { y: EXIT.y * 0.25 }, 0);

      /* Ambient drift, precise pointers only. */
      if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
        return;
      }

      const layer = plate.querySelector<HTMLElement>("[data-parallax]");
      if (!layer) return;

      gsap.fromTo(
        layer,
        { yPercent: -6 },
        {
          yPercent: 6,
          ease: "none",
          scrollTrigger: {
            trigger: plate,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
        },
      );
    },
    { scope: root },
  );

  return (
    <section
      id="team"
      ref={root}
      className="relative px-64 py-140 max-md:px-20 max-md:py-90"
    >
      {/*
        Re-measured in the browser after the grid became one feature block: the
        section is 1475 artboard units tall at 1440 (1106 CSS px). The cord is
        desktop only now, so this segment carries no mobile path at all. The
        cord comes in at x 1460 from About, which ends 40 past its own artboard,
        and runs the full drop, stopping 40 short of the bottom because Gallery
        carries no segment and the run has to finish inside the white band.
      */}
      <TraceSegment
        anchor="top"
        height={1475}
        d="M 1460 -40 V 1435"
      />

      <div ref={inner} className="relative z-10">
        {/* One node doing two jobs: the opaque plate that hides the cord, and
            the handle the exit timeline drifts. */}
        <div data-team-head className="trace-occlude">
          <SectionHeading intro={INTRO}>The barber</SectionHeading>
        </div>

        <div
          ref={feature}
          className="mt-80 grid grid-cols-[45fr_55fr] gap-64 max-md:mt-48 max-md:grid-cols-1 max-md:gap-32"
        >
          <figure
            ref={portrait}
            className="trace-occlude relative aspect-[3/4] overflow-hidden rounded-media will-change-transform"
          >
            {/* The oversized inner layer: what the parallax actually moves. */}
            <div
              data-parallax
              className="absolute inset-x-0 -inset-y-[12%] will-change-transform"
            >
              <Image
                src={barber.image}
                alt={`Portrait of ${barber.name}`}
                fill
                sizes={PORTRAIT_SIZES}
                className="object-cover"
              />
            </div>
          </figure>

          <div
            data-team-copy
            className="flex flex-col justify-center max-md:justify-start"
          >
            {/*
              The opaque plate lives on each wrapper, not on MaskedText itself:
              the split copy is visibility:hidden until GSAP takes over, and a
              hidden element paints no background, which would let the cord
              flash through before hydration.
            */}
            <div className="trace-occlude">
              <MaskedText as="h3" className="text-h2 max-md:text-mh2 font-medium">
                {barber.name}
              </MaskedText>
            </div>

            <div className="trace-occlude mt-16 max-md:mt-12">
              <MaskedText className="themed-muted text-p1 max-md:text-mp1">
                {barber.role}
              </MaskedText>
            </div>

            <div className="trace-occlude mt-32 max-w-620 max-md:mt-24">
              <MaskedText className="text-p1 max-md:text-mp1">
                {barber.bio}
              </MaskedText>
            </div>

            <div
              data-team-link
              className="trace-occlude mt-40 w-fit max-md:mt-28"
            >
              <a
                href={barber.instagram}
                aria-label={`${barber.name} on Instagram`}
                className="underline-link inline-block text-p1 max-md:text-mp1"
              >
                Instagram
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
