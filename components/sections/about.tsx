"use client";

import { useRef } from "react";
import Image from "next/image";
import { gsap, useGSAP, EXIT } from "@/lib/gsap";
import { MaskedText } from "@/components/ui/masked-text";
import { SectionHeading } from "@/components/ui/section-heading";
import { TraceSegment } from "@/components/ui/trace-line";
import { aboutPhotos } from "@/lib/content/photos";

/*
 * "The shop": the room itself. Copy on the left, two overlapping portraits on
 * the right, one wide plate underneath, with the trace cord running down the
 * left gutter and elbowing across into the photo column.
 *
 * Photography is real, and it comes from lib/content/photos.ts (aboutPhotos:
 * two uprights, then the wide shop interior). Alt text travels with the photo,
 * so swapping an id there swaps the picture and its description together.
 *
 * Motion recipe (one useGSAP, scoped to the section). Everything that enters
 * also leaves:
 *   enter   block    inner y 32 -> 0, 1.1s expo.out, once at "top 82%".
 *           copy     both paragraphs rise line by line through MaskedText.
 *           figures  clip-path inset(12% 8%) -> inset(0% 0%) and scale
 *                    1.08 -> 1, 1.1s expo.out, stagger 0.15, once at "top 75%"
 *                    of the figures wrapper.
 *   ambient each photo layer yPercent -8 -> 8, ease none, scrub, triggered by
 *           its own figure across "top bottom" to "bottom top". The layer is
 *           inset by -12% vertically, so the travel never uncovers an edge.
 *   hover   fine pointers only: the layer scales to 1.04 in 0.6s, back on leave.
 *   exit    ONE scrubbed timeline across EXIT.start -> EXIT.end, length 1:
 *             inner    opacity -> EXIT.opacity, y -> EXIT.y
 *             quote    y -> EXIT.y * 0.4, so the lead copy leaves first
 *             body     y -> EXIT.y * 0.25, trailing just behind it
 *             figures  y -> EXIT.y and scale -> 0.98, stagger 0.06 in DOM
 *                      order, so the plates shrink back as they drift
 *           The differing drift rates are the point: the block recedes in
 *           depth instead of flatly fading out. immediateRender:false means the
 *           scrub reads its start values only once the entrances have settled.
 *
 * Why the overlapping portrait is offset with `-left-40 top-90` and not with
 * translate utilities: Tailwind v4 writes those to the standalone `translate`
 * property, and the moment GSAP touches an element's transform it folds
 * translate/rotate/scale into its own matrix and sets them to `none`. The
 * offset would then live inside the same y channel the exit tween animates, so
 * a figure sitting at y 90 would be yanked to y -40 instead of drifting by 40.
 * Offsetting a positioned element through inset keeps it out of that channel,
 * costs no layout (same as translate did), and lets all three figures share one
 * absolute y target.
 *
 * clip-path is the one non transform/opacity property here: it is a once-only
 * paint level tween on three elements, and it is what gives the plates their
 * "developing print" open. Reduced motion creates no tweens at all; the served
 * markup is already the final state.
 *
 * Occlusion: the heading, both copy blocks and all three figures carry
 * .trace-occlude, an opaque page-bg plate, so the cord is hidden behind content
 * and reads only in the gaps between blocks.
 */

/* The barber's own line, lifted straight from his Booksy profile. */
const PULL_QUOTE =
  "Not just a cut, but a moment to feel your best.";

const BODY =
  "One chair on Spring Forest Road, in Raleigh. Appointments are booked for the time the work actually takes, so nobody is rushed out of the seat and the finish gets the attention it needs. Some clients have been coming since high school, and plenty bring their kids. English or Spanish, whichever you are more comfortable in.";

/* aboutPhotos is ordered upright, upright, wide, which is exactly the layout. */
const [PORTRAIT_A, PORTRAIT_B, WIDE] = aboutPhotos;

/*
 * Measured off the artboard, not guessed. Desktop content box is 1792 wide
 * (1920 less px-64 either side); the photo column is (1792 - 80) / 2 = 856, so
 * the taller plate at 78% is about 668px, or 36vw. On the 390 artboard the
 * column is 350 and the plate at 86% is about 301px, or 77vw. The wide plate
 * spans the whole content box: 1792 of 1920 is 94vw, 350 of 390 is 90vw.
 */
const PORTRAIT_SIZES = "(max-width: 767px) 80vw, 36vw";
const WIDE_SIZES = "(max-width: 767px) 90vw, 94vw";

/* All three plates share one surface recipe: rounded-media (24 artboard px, the
   image plate step of the radius scale). Images carry no outline.
   No shadow anywhere; the opaque plate is all the depth they get.
   trace-occlude is that opaque plate, and it also keeps the cord from reading
   through the corners while a frame is still decoding. */
const FIGURE_BASE =
  "trace-occlude relative overflow-hidden rounded-media";

/* The oversized inner layer: what the parallax and the hover zoom actually move. */
function PhotoLayer({
  src,
  alt,
  sizes,
}: {
  src: string;
  alt: string;
  sizes: string;
}) {
  return (
    <div
      data-parallax
      className="absolute inset-x-0 -inset-y-[12%] will-change-transform"
    >
      <Image src={src} alt={alt} fill sizes={sizes} className="object-cover" />
    </div>
  );
}

export function About() {
  const section = useRef<HTMLElement | null>(null);
  const inner = useRef<HTMLDivElement | null>(null);
  const figures = useRef<HTMLDivElement | null>(null);

  useGSAP(
    () => {
      const root = section.current;
      const target = inner.current;
      const wrap = figures.current;
      if (!root || !target || !wrap) return;

      /* Reduced motion: the markup already reads as the finished state. */
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      const figs = gsap.utils.toArray<HTMLElement>("[data-figure]", wrap);

      /* Enter: the block settles first, then the plates develop open. */
      gsap.fromTo(
        target,
        { y: 32 },
        {
          y: 0,
          duration: 1.1,
          ease: "expo.out",
          scrollTrigger: { trigger: root, start: "top 82%", once: true },
        },
      );

      gsap.fromTo(
        figs,
        { clipPath: "inset(12% 8%)", scale: 1.08 },
        {
          clipPath: "inset(0% 0%)",
          scale: 1,
          duration: 1.1,
          ease: "expo.out",
          stagger: 0.15,
          scrollTrigger: { trigger: wrap, start: "top 75%", once: true },
        },
      );

      figs.forEach((fig) => {
        const layer = fig.querySelector<HTMLElement>("[data-parallax]");
        if (!layer) return;
        gsap.fromTo(
          layer,
          { yPercent: -8 },
          {
            yPercent: 8,
            ease: "none",
            scrollTrigger: {
              trigger: fig,
              start: "top bottom",
              end: "bottom top",
              scrub: true,
            },
          },
        );
      });

      /*
       * Exit: one scrubbed timeline, total length 1. The figures run 0.88 with
       * a 0.06 stagger, so the last plate lands exactly on the block's own
       * finish (0.12 + 0.88) rather than trailing past the end of the scrub.
       */
      gsap
        .timeline({
          defaults: { ease: "none", immediateRender: false, duration: 1 },
          scrollTrigger: {
            trigger: root,
            start: EXIT.start,
            end: EXIT.end,
            scrub: true,
          },
        })
        .to(target, { opacity: EXIT.opacity, y: EXIT.y }, 0)
        .to("[data-copy-lead]", { y: EXIT.y * 0.4 }, 0)
        .to("[data-copy-body]", { y: EXIT.y * 0.25 }, 0)
        .to(figs, { y: EXIT.y, scale: 0.98, duration: 0.88, stagger: 0.06 }, 0);

      if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
        return;
      }

      const teardown = figs.map((fig) => {
        const layer = fig.querySelector<HTMLElement>("[data-parallax]");
        if (!layer) return () => {};
        const zoom = (scale: number) => () => {
          gsap.to(layer, { scale, duration: 0.6, ease: "expo.out" });
        };
        const enter = zoom(1.04);
        const leave = zoom(1);
        fig.addEventListener("pointerenter", enter);
        fig.addEventListener("pointerleave", leave);
        return () => {
          fig.removeEventListener("pointerenter", enter);
          fig.removeEventListener("pointerleave", leave);
        };
      });

      return () => teardown.forEach((off) => off());
    },
    { scope: section },
  );

  return (
    <section id="about" ref={section} className="relative">
      <TraceSegment
        anchor="top"
        height={2901}
        heightMobile={1510}
        d="M 120 -40 V 1372 Q 120 1400 148 1400 H 1432 Q 1460 1400 1460 1428 V 2941"
        dMobile="M 24 -40 V 1550"
      />

      <div
        ref={inner}
        className="relative z-10 px-64 py-140 max-md:px-20 max-md:py-90"
      >
        <SectionHeading className="trace-occlude">The shop</SectionHeading>

        <div ref={figures} className="mt-90 max-md:mt-50">
          <div className="grid grid-cols-2 gap-80 max-md:grid-cols-1 max-md:gap-50">
            <div className="flex flex-col gap-40 max-md:gap-24">
              {/*
                The plate lives on the wrapper, not on MaskedText itself: the
                split copy is visibility:hidden until GSAP takes over, and a
                hidden element paints no background, which would let the cord
                flash through before hydration.
              */}
              <div data-copy-lead className="trace-occlude max-w-700">
                <MaskedText
                  mode="scroll"
                  className="text-h3 max-md:text-mh3 font-medium"
                >
                  {PULL_QUOTE}
                </MaskedText>
              </div>
              <div data-copy-body className="trace-occlude max-w-520">
                <MaskedText
                  mode="scroll"
                  className="themed-muted text-p1 max-md:text-mp1"
                >
                  {BODY}
                </MaskedText>
              </div>
            </div>

            <div className="relative pb-90 max-md:pb-40">
              <figure
                data-figure
                className={`${FIGURE_BASE} ml-auto aspect-[3/4] w-[78%] max-md:w-[86%]`}
              >
                <PhotoLayer
                  src={PORTRAIT_A.src}
                  alt={PORTRAIT_A.alt}
                  sizes={PORTRAIT_SIZES}
                />
              </figure>

              <figure
                data-figure
                className={`${FIGURE_BASE} z-[1] -mt-[30%] aspect-[3/4] w-[52%] -left-40 top-90 max-md:w-[58%] max-md:-left-12 max-md:top-40`}
              >
                <PhotoLayer
                  src={PORTRAIT_B.src}
                  alt={PORTRAIT_B.alt}
                  sizes={PORTRAIT_SIZES}
                />
              </figure>
            </div>
          </div>

          <figure
            data-figure
            className={`${FIGURE_BASE} mt-140 aspect-video w-full max-md:mt-70`}
          >
            <PhotoLayer src={WIDE.src} alt={WIDE.alt} sizes={WIDE_SIZES} />
          </figure>
        </div>
      </div>
    </section>
  );
}
