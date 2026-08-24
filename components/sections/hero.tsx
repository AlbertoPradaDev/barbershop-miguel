"use client";

import { useRef, type MouseEvent } from "react";
import Image from "next/image";
import { gsap, useGSAP, ScrollTrigger, REVEAL } from "@/lib/gsap";
import { MaskedText } from "@/components/ui/masked-text";
import { PillButton } from "@/components/ui/pill-button";
import { useLenis } from "@/components/providers/smooth-scroll-provider";
import { SITE } from "@/lib/content/site";
import { miguelAtWork } from "@/lib/content/photos";

/*
 * Hero: editorial expand. The display lines sit on the band's own ink ground
 * with the photograph below them in a rounded framed window. While the section
 * is pinned, scrolling melts the frame - margins, top edge and corner radius all
 * run to zero - until the picture is full bleed, the image de-zooms into place,
 * a scrim settles over it and the type drifts up and out. Then the pin releases.
 *
 * Ported from the Editorial Expand card in animations-hub (hero/01), which was
 * measured on Barberia Achraf at Lighthouse 97 / CLS 0. Four things the card
 * ships were dropped here because this project bans them: the scroll cue (no
 * scroll indicators), the outlined accent line (no styled spans in the hero
 * title), the star chip above the headline (no eyebrow, no meaningless
 * metrics), and the button hover lift (no bounce anywhere).
 *
 * The pin is CSS sticky, not ScrollTrigger pin: the effect needs no pin
 * spacer, and sticky costs nothing on a coarse pointer where the spec forbids
 * pinning outright.
 *
 * Motion recipe:
 *   title   one MaskedText per line, mode "mount", delays stepped by
 *           REVEAL.stagger on top of REVEAL.introDelay, so the lines cascade.
 *   ctas    yPercent 100 -> 0 inside an overflow-hidden slot, duration 1,
 *           expo.out, delay 0.75. On complete the slot is handed back
 *           overflow: visible so a focus ring never clips.
 *   media   opacity 0 -> 1, 0.9s expo.out, delay 0.5, so the frame arrives
 *           under a headline that is already moving.
 *   scrub   ONE ScrollTrigger over the pinwrap, "top top" -> "bottom bottom",
 *           driving five quickSetters per frame: the frame's clip-path, the
 *           image scale (1.16 -> 1.02), the scrim (0 -> 0.85) and the type's
 *           opacity and lift. Linear on purpose - the finger is the easing, and
 *           an ease here front-loads the reveal badly.
 *   exit    none of its own. The expanding frame is the exit.
 * Reduced motion drops the extra scroll length, unsticks the pin and builds no
 * tweens at all, leaving the static framed state the stylesheet already paints.
 */

/* Client reference copy, verbatim, four lines. No italics, no styled spans. */
const TITLE_LINES = [
  "Where Style",
  "Meets Tradition",
  "One Cut at a",
  "Time",
] as const;

/*
 * Wide frame at rest, full screen at p=1, so it is sized at 100vw.
 *
 * This is the client's own photograph and the only landscape frame he
 * publishes, which is why it is here and not in the gallery: it is the one shot
 * with the barber, his hands and a client in it. NOTE for the client ask, it is
 * 1008x672, so it upscales about 1.9x when the frame reaches full bleed on a
 * 1920 screen. The scrim covers for it, but a larger original is worth asking
 * for since this is the LCP image and the first thing anyone sees.
 */
const PHOTO_SRC = miguelAtWork.src;
const PHOTO_ALT = miguelAtWork.alt;
const PHOTO_SIZES = "100vw";

/*
 * Frame geometry, as fractions of the pin box. The side and bottom margins are
 * the card's measured defaults; the frame's TOP edge is not, see deriveTop().
 */
const SIDE_FRAC = 0.05;
const BOTTOM_FRAC = 0.04;

/*
 * Corner radius at rest, in artboard px, mirroring --radius-media. One artboard
 * px is 1/16 rem by the --spacing token, so 24 * (rootPx / 16) resolves to
 * exactly the 1.5rem the stylesheet paints: the CSS fallback and the first JS
 * frame cannot disagree.
 */
const RADIUS_ARTBOARD = 24;

/* Inner de-zoom across the expand, and the veil that lands with it. */
const IMG_SCALE_FROM = 1.16;
const IMG_SCALE_TO = 1.02;
const SCRIM_MAX = 0.85;

/* The type clears out over the back half, once the photo has taken the screen. */
const TYPE_FADE_START = 0.35;
const TYPE_FADE_LENGTH = 0.45;
const TYPE_LIFT = 30;

/*
 * Breathing room between the last CTA and the top edge of the frame, in
 * artboard px, and the fractions of the pin the derived top edge is held
 * between so neither a very short nor a very tall viewport can look wrong.
 */
const TYPE_GAP_ARTBOARD = 56;
const TOP_MIN_FRAC = 0.42;
const TOP_MAX_FRAC = 0.72;

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

      const pinwrap =
        section.querySelector<HTMLDivElement>("[data-hero-pinwrap]");
      const pin = section.querySelector<HTMLDivElement>("[data-hero-pin]");
      const top = section.querySelector<HTMLDivElement>("[data-hero-top]");
      const media = section.querySelector<HTMLDivElement>("[data-hero-media]");
      const scrim = section.querySelector<HTMLDivElement>("[data-hero-scrim]");
      const image = section.querySelector<HTMLImageElement>("[data-hero-photo]");
      if (!pinwrap || !pin || !top || !media || !scrim || !image) return;

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

      gsap.from(media, {
        opacity: 0,
        duration: 0.9,
        ease: "expo.out",
        delay: 0.5,
      });

      /*
       * Per-frame writes go through quickSetters: they resolve the property
       * once here instead of parsing a vars object on every scroll tick.
       *
       * The image scale is the exception and uses gsap.set. quickSetter(el,
       * "scale") silently does nothing on this element: it is the first gsap
       * call to touch the image, so the element's _gsap cache is still bare and
       * the setter it hands back writes nowhere. It throws no error, which is
       * the dangerous part - the scrub simply runs with a frozen image. Caught
       * by the QA harness reading the computed transform; do not "simplify" it
       * back to a quickSetter without re-running that check.
       */
      const setClip = gsap.quickSetter(media, "clipPath");
      const setScrim = gsap.quickSetter(scrim, "opacity");
      const setTypeFade = gsap.quickSetter(top, "opacity");
      const setTypeLift = gsap.quickSetter(top, "y", "px");

      /*
       * The frame's resting geometry, resolved to px once per refresh and held
       * in the closure. Everything here is a layout read, and a layout read on
       * every scroll tick is a forced reflow in the middle of the one animation
       * that has to stay at 60fps.
       *
       * Nothing it measures moves between refreshes: the pin resolves 100svh,
       * which is the SMALLEST viewport height and so is deliberately immune to
       * the mobile browser bars hiding and returning. ScrollTrigger refreshes on
       * resize and orientation change, which is exactly when these do change.
       */
      let restTop = 0;
      let restSide = 0;
      let restBottom = 0;
      let restRadius = 0;

      const measure = () => {
        /* Read the box off the pin, never off window.innerHeight, which tracks
           the browser bars and would jog the frame's top edge mid-scroll. */
        const height = pin.clientHeight;
        const width = pin.clientWidth;
        const artboardPx =
          parseFloat(getComputedStyle(document.documentElement).fontSize) / 16;

        /*
         * Where the frame's top edge sits at rest. The card hard-codes this at
         * 64% of the viewport, which only holds for copy the length the card
         * was measured with: four display lines plus a CTA row overrun 64% of a
         * 900px-tall laptop and collide with the frame. So it is derived from
         * the measured type block and only clamped by those fractions.
         */
        const wanted = top.offsetHeight + TYPE_GAP_ARTBOARD * artboardPx;
        restTop = Math.min(
          Math.max(wanted, height * TOP_MIN_FRAC),
          height * TOP_MAX_FRAC,
        );
        restSide = SIDE_FRAC * width;
        restBottom = BOTTOM_FRAC * height;
        restRadius = RADIUS_ARTBOARD * artboardPx;
      };

      const render = (progress: number) => {
        const inv = 1 - progress;

        setClip(
          `inset(${restTop * inv}px ${restSide * inv}px ${restBottom * inv}px ${restSide * inv}px round ${restRadius * inv}px)`,
        );
        gsap.set(image, {
          scale: IMG_SCALE_FROM - (IMG_SCALE_FROM - IMG_SCALE_TO) * progress,
        });
        setScrim(SCRIM_MAX * progress);
        setTypeFade(
          Math.max(
            1 - Math.max((progress - TYPE_FADE_START) / TYPE_FADE_LENGTH, 0),
            0,
          ),
        );
        setTypeLift(-TYPE_LIFT * progress);
      };

      /*
       * start/end span exactly the pinwrap's overhang, which is the 100svh the
       * sticky child does not occupy, so progress is the sticky travel itself.
       * Both callbacks take their progress off `self`: onRefresh fires
       * synchronously inside create(), so a `const st = ScrollTrigger.create()`
       * binding referenced in here would still be in its temporal dead zone.
       */
      ScrollTrigger.create({
        trigger: pinwrap,
        start: "top top",
        end: "bottom bottom",
        onUpdate: (self) => render(self.progress),
        onRefresh: (self) => {
          measure();
          render(self.progress);
        },
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} className="relative">
      {/*
        200svh tall with a 100svh sticky child, so the scrub distance is exactly
        one screen. Under reduced motion the extra length collapses and the
        child unsticks, leaving a single static screen.
      */}
      <div
        data-hero-pinwrap
        className="h-[200svh] max-md:h-[170svh] motion-reduce:h-auto"
      >
        <div
          data-hero-pin
          className="sticky top-0 h-[100svh] isolate overflow-hidden motion-reduce:relative"
        >
          <div
            data-hero-top
            className="relative z-10 px-64 pt-160 max-md:px-20 max-md:pt-120"
          >
            <h1
              data-hero-title
              className="text-h0 max-md:text-mh1 max-w-[1180px] font-semibold"
            >
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

          {/*
            The photo layer, revealed through an animated clip-path window. The
            class below is the p=0 frame AND the no-JS fallback: JS replaces it
            on the first ScrollTrigger refresh with the measured top edge. It
            sits above the type on purpose, so the expanding frame swallows the
            headline rather than sliding under it.
          */}
          <div
            data-hero-media
            className="absolute inset-0 z-20 bg-ink [clip-path:inset(64svh_5vw_4svh_5vw_round_var(--radius-media))] max-md:[clip-path:inset(54svh_5vw_4svh_5vw_round_var(--radius-media))]"
          >
            <Image
              data-hero-photo
              src={PHOTO_SRC}
              alt={PHOTO_ALT}
              fill
              sizes={PHOTO_SIZES}
              priority
              /*
               * Arbitrary transform, not the scale utility: GSAP writes the
               * transform property, so the two can never compose.
               *
               * object-position is biased UP because the resting frame is a
               * letterbox roughly 3.9:1 while the photograph is 3:2, so at p=0
               * only about 38% of its height survives the crop. Centred, that
               * band lands on a torso and a forearm and cuts both heads off.
               * At 30% it lands on the barber's face and the client's, which is
               * the whole subject of the frame. Full bleed is barely affected:
               * at p=1 the crop keeps 94% of the height either way.
               */
              className="object-cover object-[50%_30%] [transform:scale(1.16)]"
            />
            <div
              data-hero-scrim
              aria-hidden
              className="absolute inset-0 bg-linear-to-t from-ink/55 via-ink/15 to-ink/25 opacity-0"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
