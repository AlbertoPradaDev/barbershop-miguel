"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { gsap, useGSAP, SplitText, ScrollTrigger, HOP, HOP2 } from "@/lib/gsap";
import { SITE } from "@/lib/content/site";
import { preloaderPhotos } from "@/lib/content/photos";

/*
 * Opening sequence. A full bleed ink panel over the whole page: six photographs
 * fan out from the centre, the shop name posts itself up character by character
 * in random order, a counter runs while the page's real assets load, then the
 * stack collapses, the name posts itself back out and the panel wipes upward to
 * hand over to the hero.
 *
 * Ported from the Awwwards card awwwards/hero/26 (the "Outfit" reveal). Two
 * things are deliberately not ported:
 *
 *   counter   the card tweens 0 to 100 on a fixed two second timer regardless
 *             of what is loading, which is a decorative number dressed as
 *             progress and is exactly what hard ban 4 rules out. Here it counts
 *             the page's actual images and webfonts, and the exit waits for
 *             them, so the number means what it says and the wait buys
 *             something. It is also why the sequence has no fixed length: fast
 *             connection, short hold.
 *   duration  the card gates the page for 4.35s every load. This runs once per
 *             session and skips entirely under reduced motion.
 *
 * Motion recipe:
 *   in     photos scale 0 -> 1 with clip-path inset 20% -> 0, 1s, hop,
 *          stagger 0.2, each pre-rotated off PHOTO_ROTATIONS so the stack fans.
 *          Name chars y 100% -> 0%, 1s, hop2, stagger 0.125 from "random".
 *          Counter rides the real load figure, eased so it never jumps.
 *   out    counter and chars y -100% (0.75s, hop2, same random stagger), photos
 *          scale 0 with clip-path closing back to inset 20% on a NEGATIVE
 *          stagger so the fan collapses last in first, then the panel's own
 *          clip-path collapses to its top edge over 1s.
 * Reduced motion: the component renders nothing at all.
 */

/* Each plate's resting angle, in order. Fans the stack instead of squaring it. */
const PHOTO_ROTATIONS = [7.5, -2.5, -10, 12.5, -5, 5];

/* Held open at least this long, so the entrance always completes on a fast
   connection instead of flashing. */
const MIN_VISIBLE_MS = 1900;

/* Safety net: never hold the page hostage to one asset that will not resolve. */
const MAX_WAIT_MS = 6000;

const OPEN = "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)";
const CLOSED = "polygon(20% 20%, 80% 20%, 80% 80%, 20% 80%)";
const WIPED = "polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)";

/*
 * Counts the assets this screen actually needs, plus the webfonts, and reports
 * 0..1. Resolves early rather than never: a decoded-but-errored image still
 * counts, because the point is to stop waiting, not to audit the page.
 *
 * EAGER IMAGES ONLY, and that filter is the whole thing. Counting every entry
 * in document.images waits on next/image's lazy frames further down the page,
 * which cannot load while this panel covers the viewport and scrolling is
 * locked, so the counter parks part way (measured: stuck on 044 for four and a
 * half seconds) and only moves when the timeout fires. That is slower than the
 * fixed timer this replaced and it is not progress, it is a stall. The plates
 * in this panel are marked priority so they land in this set.
 */
function trackAssets(onProgress: (ratio: number) => void): Promise<void> {
  const images = Array.from(document.images).filter(
    (img) => img.loading !== "lazy",
  );
  const total = images.length + 1; // +1 for the font face set
  let done = 0;

  const step = () => {
    done += 1;
    onProgress(Math.min(done / total, 1));
  };

  const waits: Promise<unknown>[] = images.map((img) => {
    if (img.complete) {
      step();
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      const finish = () => {
        step();
        resolve();
      };
      img.addEventListener("load", finish, { once: true });
      img.addEventListener("error", finish, { once: true });
    });
  });

  waits.push(document.fonts.ready.then(step));

  return Promise.race([
    Promise.all(waits).then(() => undefined),
    new Promise<void>((resolve) => window.setTimeout(resolve, MAX_WAIT_MS)),
  ]);
}

/** Once a session. Read through try/catch: private mode throws on access. */
const SEEN_KEY = "mrs-intro";

function alreadySeen(): boolean {
  try {
    return sessionStorage.getItem(SEEN_KEY) === "seen";
  } catch {
    return false;
  }
}

type Phase = "deciding" | "run" | "skip";

export function Preloader() {
  const root = useRef<HTMLDivElement>(null);
  const counter = useRef<HTMLParagraphElement>(null);

  /*
   * "deciding" is what the SERVER renders, so the first client render matches
   * it exactly. The previous version decided on the client only and returned
   * null on the server, so React hit a hydration mismatch on <Preloader> and
   * discarded the subtree. The shell below is therefore always in the server
   * markup, which also means the page is covered from the first paint instead
   * of from hydration; only its contents wait a tick. Nothing is visible in
   * that gap, because every plate starts at scale 0 and every character starts
   * inside its own mask.
   */
  const [phase, setPhase] = useState<Phase>("deciding");

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- matchMedia and sessionStorage do not exist on the server, so the decision cannot be made until after mount; exactly one post-mount render, same pattern as SmoothScrollProvider
    setPhase(reduced || alreadySeen() ? "skip" : "run");
  }, []);

  useGSAP(
    () => {
      if (phase !== "run" || !root.current) return;

      const panel = root.current;
      /* The page underneath must not scroll while the panel covers it. */
      document.documentElement.style.overflow = "hidden";

      const release = () => {
        document.documentElement.style.overflow = "";
        /*
         * The lock above makes <html> a scroll container for as long as it is
         * set, which is exactly the state globals.css avoids with overflow-x:
         * clip because it breaks sticky and every pin. Anything ScrollTrigger
         * measured while it was on is suspect, so re-measure on the way out.
         */
        window.scrollTo(0, 0);
        ScrollTrigger.refresh();
        try {
          sessionStorage.setItem(SEEN_KEY, "seen");
        } catch {
          /* Nothing to do; the sequence simply plays again next load. */
        }
        /* Let the hero know it may run its own entrance now. */
        window.dispatchEvent(new CustomEvent("mrs:intro-done"));
        gsap.set(panel, { display: "none" });
      };

      const split = SplitText.create("[data-pre-word]", {
        type: "chars",
        mask: "chars",
        charsClass: "pre-char",
      });

      /*
       * The plates are centred with GSAP's own xPercent/yPercent, NOT with
       * Tailwind's -translate-x-1/2. GSAP folds a standalone CSS `translate`
       * into its transform and then writes translate:none, so the utility would
       * be silently disabled the moment the first tween touches these elements
       * and the whole stack would jump off centre. One owner for the transform.
       */
      gsap.set("[data-pre-photo]", {
        xPercent: -50,
        yPercent: -50,
        rotate: (i: number) => PHOTO_ROTATIONS[i],
        scale: 0,
        clipPath: CLOSED,
      });
      gsap.set(split.chars, { yPercent: 100 });
      gsap.set("[data-pre-count]", { yPercent: 100 });

      /* ENTRANCE ------------------------------------------------------- */
      const intro = gsap.timeline();

      intro.to("[data-pre-photo]", {
        scale: 1,
        clipPath: OPEN,
        duration: 1,
        ease: HOP,
        stagger: 0.2,
      });

      intro.to(
        split.chars,
        {
          yPercent: 0,
          duration: 1,
          ease: HOP2,
          stagger: { each: 0.125, from: "random" },
        },
        0.35,
      );

      intro.to("[data-pre-count]", { yPercent: 0, duration: 1, ease: HOP2 }, 0.35);

      /* COUNTER -------------------------------------------------------- */
      const shown = { value: 0 };
      const paint = () => {
        if (counter.current) {
          counter.current.textContent = String(
            Math.round(shown.value * 100),
          ).padStart(3, "0");
        }
      };
      paint();

      const loaded = trackAssets((ratio) => {
        /* Ease toward the real figure so a burst of loads does not jump the
           number, and so it never ticks backwards. */
        gsap.to(shown, {
          value: Math.max(shown.value, ratio),
          duration: 0.4,
          ease: "power2.out",
          onUpdate: paint,
        });
      });

      /* EXIT ----------------------------------------------------------- */
      const started = performance.now();
      let exited = false;

      const runExit = () => {
        if (exited) return;
        exited = true;

        const out = gsap.timeline({ onComplete: release });

        /* Land the counter exactly on 100 before it leaves. */
        out.to(shown, {
          value: 1,
          duration: 0.3,
          ease: "power2.out",
          onUpdate: paint,
        });
        out.to(
          ["[data-pre-count]", ...split.chars],
          {
            yPercent: -100,
            duration: 0.75,
            ease: HOP2,
            stagger: { each: 0.125, from: "random" },
          },
          0,
        );
        out.to(
          "[data-pre-photo]",
          {
            scale: 0,
            clipPath: CLOSED,
            duration: 1,
            ease: HOP2,
            stagger: -0.075,
          },
          0.25,
        );
        out.to(panel, { clipPath: WIPED, duration: 1, ease: HOP2 }, 1.1);
      };

      loaded.then(() => {
        const held = performance.now() - started;
        gsap.delayedCall(Math.max(0, MIN_VISIBLE_MS - held) / 1000, runExit);
      });

      return () => {
        /* Unmounting mid sequence must never leave the page unscrollable. */
        document.documentElement.style.overflow = "";
        split.revert();
      };
    },
    { scope: root, dependencies: [phase] },
  );

  return (
    <div
      ref={root}
      aria-hidden
      data-preloader
      data-phase={phase}
      /*
       * motion-reduce:hidden does the accessibility path in CSS, so a reduced
       * motion visitor never sees the ink panel even for the single frame
       * before the effect runs. data-phase="skip" covers the already-seen case.
       */
      className="fixed inset-0 z-[80] overflow-hidden bg-ink text-bone [clip-path:polygon(0%_0%,100%_0%,100%_100%,0%_100%)] motion-reduce:hidden data-[phase=skip]:hidden"
    >
      {phase === "run" && (
        <>
        <div className="absolute inset-0">
          {preloaderPhotos.map((photo) => (
            <span
              key={photo.id}
              data-pre-photo
              /* No translate utilities here: GSAP centres these with
                 xPercent/yPercent, see the gsap.set above. */
              className="absolute top-1/2 left-1/2 block h-300 w-250 origin-center overflow-hidden max-md:h-220 max-md:w-184"
            >
              <Image
                src={photo.src}
                alt=""
                fill
                priority
                sizes="(max-width: 767px) 184px, 250px"
                className="object-cover"
              />
            </span>
          ))}
        </div>

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <p
            data-pre-word
            className="text-h0 max-md:text-mh1 leading-[0.85] font-semibold uppercase"
          >
            {SITE.shortName}
          </p>
          <span className="absolute -top-24 left-[calc(100%+24px)] block overflow-hidden max-md:left-[calc(100%+8px)]">
            <p
              ref={counter}
              data-pre-count
              className="font-mono text-p2 max-md:text-mp2 leading-[0.85]"
            >
              000
            </p>
          </span>
        </div>
        </>
      )}
    </div>
  );
}
