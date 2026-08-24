"use client";

import { useRef } from "react";
import { gsap, useGSAP, SplitText, HOP } from "@/lib/gsap";
import { SITE } from "@/lib/content/site";

/*
 * Hero: one screen, one word. The shop name is set at display size across the
 * centre of the ink band and posts itself up through a mask character by
 * character in random order, with three words along the bottom edge following
 * it. No photograph and no card: the type is the whole composition, and the
 * band's own ground is the background.
 *
 * Ported from the Awwwards card awwwards/hero/26, whose hero is the second half
 * of the opening sequence: the panel in components/layout/preloader.tsx wipes
 * upward and this is what it uncovers. The two are one animation split across
 * two components, which is why this one waits for the "mrs:intro-done" event
 * instead of running on mount.
 *
 * The card is black type on cream. This runs inverted, bone on ink, because the
 * hero is the dark band in page.tsx and the alternation is not this section's to
 * change. The accent red was tried and rejected for the wordmark: it measures
 * 3.5:1 against the page, which clears AA for display sizes but leaves the one
 * element the whole screen is built around as the weakest thing on it.
 *
 * The CTA row is gone with the card's layout, which has no buttons. Booking is
 * not lost above the fold: the navbar carries the solid "Book now" pill at every
 * scroll position, including this one.
 *
 * Motion recipe:
 *   word    chars y 100% -> 0%, duration 1, HOP, stagger 0.075 from "random",
 *           inside SplitText's own per character masks.
 *   meta    the three bottom words rise the same way, stagger 0.075, 0.1 behind
 *           the wordmark so the eye finishes on them.
 *   start   held until the opening sequence dispatches "mrs:intro-done". If the
 *           panel never ran (reduced motion, or already seen this session) the
 *           event never fires, so a fallback timer starts it anyway.
 * Reduced motion: no tweens at all, everything set to its resting state.
 */

/*
 * The three words the barber uses himself, from his Booksy "About us": focused
 * on "precision, comfort, and customer care". Not invented brand values.
 */
const META = ["Precision", "Comfort", "Care"] as const;

/* If the opening panel is not going to run, do not wait on it forever. */
const FALLBACK_START_MS = 260;

export function Hero() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const section = root.current;
      if (!section) return;

      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      /* Hand the deferred copy back from the anti-flash style, always. */
      gsap.set("[data-masked]", { visibility: "visible" });

      if (reduced) return;

      const word = SplitText.create("[data-hero-word]", {
        type: "chars",
        mask: "chars",
        charsClass: "hero-char",
      });
      const meta = SplitText.create("[data-hero-meta]", {
        type: "words",
        mask: "words",
        wordsClass: "hero-meta-word",
      });

      gsap.set([...word.chars, ...meta.words], { yPercent: 100 });

      let started = false;
      const start = () => {
        if (started) return;
        started = true;

        const tl = gsap.timeline();
        tl.to(word.chars, {
          yPercent: 0,
          duration: 1,
          ease: HOP,
          stagger: { each: 0.075, from: "random" },
        });
        tl.to(
          meta.words,
          { yPercent: 0, duration: 1, ease: HOP, stagger: 0.075 },
          0.1,
        );
      };

      window.addEventListener("mrs:intro-done", start, { once: true });
      const fallback = gsap.delayedCall(FALLBACK_START_MS / 1000, start);

      return () => {
        window.removeEventListener("mrs:intro-done", start);
        fallback.kill();
        word.revert();
        meta.revert();
      };
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      className="relative flex h-[100svh] w-full flex-col justify-center overflow-hidden"
    >
      {/*
        The wordmark is sized off the viewport rather than the artboard: it is
        the one element meant to run edge to edge at every width, and an artboard
        px value would leave a gutter on a wide screen and overflow on a narrow
        one. 15vw holds "MR Society" on one line from 320px up.
      */}
      <h1
        data-masked
        data-hero-word
        className="px-64 text-center text-[15vw] leading-[0.85] font-semibold tracking-[-0.03em] uppercase max-md:px-20"
      >
        {SITE.shortName}
      </h1>

      {/*
        The right hand padding clears the floating WhatsApp control, which is
        fixed at right-32 bottom-32 and 52 artboard px across, so it owns the
        bottom right corner of every screen on the site. Without it the third
        word runs underneath the button: measured at 1440, "Care" was clipped by
        it. 144 = the control's 84 of reach plus a 60 gap; the mobile control is
        smaller and sits closer in, so 96 covers it there.
      */}
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between px-64 py-48 pr-144 max-md:px-20 max-md:py-28 max-md:pr-96">
        {META.map((item) => (
          <p
            key={item}
            data-masked
            data-hero-meta
            className="text-p2 max-md:text-mp2 font-medium"
          >
            {item}
          </p>
        ))}
      </div>
    </section>
  );
}
