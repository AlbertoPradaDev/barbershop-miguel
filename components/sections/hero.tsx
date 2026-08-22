"use client";

import { useRef, type MouseEvent } from "react";
import Image from "next/image";
import { gsap, useGSAP, REVEAL } from "@/lib/gsap";
import { MaskedText } from "@/components/ui/masked-text";
import { PillButton } from "@/components/ui/pill-button";
import { useLenis } from "@/components/providers/smooth-scroll-provider";
import { SITE } from "@/lib/content/site";
import { pexels } from "@/lib/content/photos";

/*
 * Hero: an edge to edge two column split, no page gutter. The left 45% is the
 * black band itself, carrying four short display lines and the CTA row and
 * nothing else above or beside them; the right 55% is one full bleed
 * photograph running flush to the top, right and bottom of the viewport. On
 * phones the panel stacks over the photo. The section stays transparent and
 * token driven: it is the dark band in page.tsx that paints the panel black.
 *
 * The panel keeps the site gutter (px-64) instead of a wider one on purpose:
 * the longest headline line, "Meets Tradition", measures 713 artboard px at
 * text-h0, and 45% of the 1920 artboard less that gutter leaves 736, so the
 * four authored lines hold without wrapping and without shrinking the type.
 *
 * Motion recipe:
 *   title   one MaskedText per line, mode "mount", delays stepped by
 *           REVEAL.stagger (0 / 0.07 / 0.14 / 0.21) on top of REVEAL.introDelay,
 *           so the four lines rise as one cascade. No x drift and no hover
 *           nudge: the reference block is static type.
 *   ctas    yPercent 100 -> 0 inside an overflow-hidden slot, duration 1,
 *           expo.out, delay 0.75. No fade. On complete the slot is handed back
 *           overflow: visible so a focus ring never clips. Neither button
 *           follows the pointer: no magnetic wrapper anywhere in the hero.
 *   photo   scale 1.06 -> 1 over 1.2s expo.out on mount, plus a scrubbed
 *           parallax on its frame (yPercent -2 -> 2) over the same range as the
 *           exit. The frame is 108% tall and inset 4% top and bottom, so the
 *           drift can never expose an edge, and the column clips it regardless.
 *   exit    one scrubbed ScrollTrigger ("top top" -> "bottom top") lifting the
 *           panel content y -120 to opacity 0.1 while the photo holds its own
 *           column.
 * The CTA row carries data-masked, so the head script's
 * `[data-masked]{visibility:hidden}` holds it until this effect hands it back:
 * no flash of the pre-animation state above the fold. Reduced motion restores
 * visibility, opens the slot and builds no tweens at all.
 */

/* Client reference copy, verbatim, four lines. No italics, no styled spans. */
const TITLE_LINES = [
  "Where Style",
  "Meets Tradition",
  "One Cut at a",
  "Time",
] as const;

/* Barber working a comb through the top while a low fade sits underneath: the
   same framing as the reference photograph. LCP image, so it ships at 1600. */
const PHOTO_SRC = pexels(2076930, 1600);
const PHOTO_ALT = "Barber combing and cutting a client's hair at the chair";
const PHOTO_SIZES = "(max-width: 767px) 100vw, 55vw";

/* Mount: the frame settles out of a 6% push in. */
const PHOTO_SCALE = 1.06;
const PHOTO_DURATION = 1.2;

/* Scrub: the photo lags the panel by 2% of its frame in each direction. */
const PHOTO_DRIFT = 2;

/* The panel content lifts and dims as the hero leaves; the photo does not. */
const EXIT_OPACITY = 0.1;
const EXIT_Y = -120;

export function Hero() {
  const root = useRef<HTMLElement>(null);
  const lenis = useLenis();

  /*
   * Delegated so the CTA row keeps real anchors (crawlable, keyboard native)
   * while Lenis, not the browser's disabled native smooth scroll, does the run.
   */
  const handleHashClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey) return;
    if (event.shiftKey || event.altKey) return;

    const link = (event.target as HTMLElement).closest("a[href^='#']");
    const id = link?.getAttribute("href")?.slice(1);
    const target = id ? document.getElementById(id) : null;
    if (!target) return;

    event.preventDefault();
    if (lenis) lenis.scrollTo(target);
    else target.scrollIntoView({ behavior: "smooth" });
  };

  useGSAP(
    () => {
      const section = root.current;
      if (!section) return;

      /* Hand the deferred copy back from the anti-flash style, always. */
      gsap.set("[data-hero-cta]", { visibility: "visible" });

      /*
       * The slot only clips while its content is still travelling; once it has
       * landed it must not cut off a focus ring.
       */
      const slot = section.querySelector("[data-hero-slot]");
      const openSlot = () => {
        gsap.set(slot, { overflow: "visible" });
      };

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        openSlot();
        return;
      }

      gsap.from("[data-hero-cta]", {
        yPercent: 100,
        duration: REVEAL.duration,
        ease: REVEAL.ease,
        delay: 0.75,
        onComplete: openSlot,
      });

      gsap.from("[data-hero-photo]", {
        scale: PHOTO_SCALE,
        duration: PHOTO_DURATION,
        ease: "expo.out",
      });

      const range = {
        trigger: section,
        start: "top top",
        end: "bottom top",
        scrub: true,
      } as const;

      gsap.to("[data-hero-content]", {
        y: EXIT_Y,
        opacity: EXIT_OPACITY,
        ease: "none",
        scrollTrigger: { ...range },
      });

      gsap.fromTo(
        "[data-hero-frame]",
        { yPercent: -PHOTO_DRIFT },
        {
          yPercent: PHOTO_DRIFT,
          ease: "none",
          scrollTrigger: { ...range },
        },
      );
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      className="relative grid min-h-[100svh] grid-cols-[45fr_55fr] max-md:grid-cols-1"
    >
      <div className="relative z-10 flex flex-col justify-center px-64 py-120 max-md:min-h-[62svh] max-md:px-20 max-md:py-90">
        <div data-hero-content>
          <h1 data-hero-title className="text-h0 max-md:text-mh1 font-semibold">
            {TITLE_LINES.map((line, index) => (
              <MaskedText
                key={line}
                as="span"
                mode="mount"
                delay={index * REVEAL.stagger}
                className="block w-fit"
              >
                {line}
              </MaskedText>
            ))}
          </h1>

          <div data-hero-slot className="mt-48 overflow-hidden max-md:mt-32">
            <div
              data-masked
              data-hero-cta
              onClick={handleHashClick}
              className="flex w-fit flex-wrap items-center gap-32"
            >
              <PillButton variant="solid" href={SITE.bookingUrl}>
                Book now
              </PillButton>
              <PillButton variant="draw" href="#services">
                View services
              </PillButton>
            </div>
          </div>
        </div>
      </div>

      {/*
        The photo column clips its own frame, so neither the mount scale nor the
        scrub drift can ever push the picture past the split or the viewport
        edges. The frame runs 8% taller than the column and is hung 4% above it,
        which is the slack the drift travels in.
      */}
      <div className="relative overflow-hidden max-md:aspect-[4/5]">
        <div
          data-hero-frame
          className="absolute inset-x-0 top-[-4%] bottom-[-4%]"
        >
          <Image
            data-hero-photo
            src={PHOTO_SRC}
            alt={PHOTO_ALT}
            fill
            sizes={PHOTO_SIZES}
            priority
            className="object-cover"
          />
        </div>
      </div>
    </section>
  );
}
