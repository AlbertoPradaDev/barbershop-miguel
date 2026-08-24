"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { gsap, useGSAP, SplitText, ScrollTrigger, HOP } from "@/lib/gsap";
import { SITE } from "@/lib/content/site";

/*
 * Opening sequence, ported from the Awwwards card awwwards/hero/10.
 *
 * The shop name posts itself up letter by letter on an ink panel. Every letter
 * but the first then drops away, a second glyph flies in beside the survivor,
 * the two slide together and settle into the monogram. At that point the panel
 * TEARS ALONG THE MIDDLE: the top half and the bottom half are two separate
 * fixed panels carrying the same lockup, one clipped to each half, and they
 * part like doors while the hero opens through the gap between them.
 *
 * That tear is the whole trick and it is worth stating plainly, because the
 * markup looks redundant otherwise: `top` and `bottom` are IDENTICAL panels.
 * The bottom one is set to the finished lockup from the start and never
 * animates its type at all; it only has to match what the top panel has
 * arrived at by the time the two are clipped apart, so that one lockup appears
 * to split rather than two appearing to swap.
 *
 * It also drives the hero, which is a different component: see the note in
 * components/sections/hero.tsx. One continuous move, one timeline, one owner.
 *
 * Not ported: the card's ~7s runtime. This runs once per session, skips
 * entirely under reduced motion, and is compressed to a little over four
 * seconds. Its footer ("Scroll Down") is a scroll indicator and banned by hard
 * ban 3; the hero carries standing detail instead.
 */

/*
 * The lockup. The card morphs "Nullspace Studio" down to its studio number; the
 * equivalent here is the shop's own monogram, which is also the barber's
 * initials: Miguel Rangel, MR Society. INTRO is set, all of it but the first
 * letter is dropped, and OUTRO arrives to complete the pair.
 */
const INTRO = SITE.shortName; // "MR Society"
const OUTRO = "R";

/* Corner labels, in the barber's own words. Not a heading kicker: these float
   at the edges of the loading panel, they do not sit above a section title. */
const TAGS = ["Precision", "Comfort", "Care"] as const;

/*
 * How much larger the finished monogram is than the type it grew out of.
 *
 * The card hard-codes this entire move in rem: x 18rem, font-size 14rem and so
 * on. Those numbers only work on its own fixed 16px root. This site's root font
 * is FLUID (globals.css scales it with the viewport, so 1rem is 12px at 1440 and
 * 16px at 1920), which means every one of the card's offsets lands somewhere
 * different at every width. The lockup is therefore MEASURED at run time: read
 * where the glyphs actually are, work out where the pair has to sit to be
 * centred, and tween the difference.
 */
const LOCKUP_SCALE = { desktop: 3, mobile: 2 } as const;

const SEEN_KEY = "mrs-intro";

function alreadySeen(): boolean {
  try {
    return sessionStorage.getItem(SEEN_KEY) === "seen";
  } catch {
    return false;
  }
}

type Phase = "deciding" | "run" | "skip";

/* One panel's worth of type. Rendered twice, identically, see the note above. */
function Lockup({ side }: { side: "top" | "bottom" }): ReactNode {
  return (
    <>
      <div
        data-seq-intro
        data-side={side}
        className="absolute top-1/2 left-1/2 w-full -translate-x-1/2 -translate-y-1/2 text-center"
      >
        <p className="text-h1 max-md:text-mh1 leading-none font-semibold uppercase">
          {INTRO}
        </p>
      </div>
      <div
        data-seq-outro
        data-side={side}
        className="absolute top-1/2 left-[calc(50%+10rem)] -translate-x-1/2 -translate-y-1/2 max-md:left-[calc(50%+4rem)]"
      >
        <p className="text-h1 max-md:text-mh1 leading-none font-semibold uppercase">
          {OUTRO}
        </p>
      </div>
    </>
  );
}

export function OpeningSequence() {
  const root = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>("deciding");

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- matchMedia and sessionStorage do not exist on the server, so the decision cannot be made until after mount; exactly one post-mount render, same pattern as SmoothScrollProvider
    setPhase(reduced || alreadySeen() ? "skip" : "run");
  }, []);

  useGSAP(
    () => {
      if (phase !== "run" || !root.current) return;

      const top = root.current.querySelector<HTMLElement>('[data-panel="top"]');
      const bottom = root.current.querySelector<HTMLElement>(
        '[data-panel="bottom"]',
      );
      /*
       * The hero lives in another component, so it may legitimately not be
       * there (a route without it, an unmount mid animation). Bail rather than
       * throw: a missing hero must not leave the page under a black panel.
       */
      const hero = document.querySelector<HTMLElement>("[data-hero-container]");
      const card = document.querySelector<HTMLElement>("[data-hero-card]");
      const cardTitle = document.querySelector<HTMLElement>(
        "[data-hero-card-title]",
      );
      if (!top || !bottom || !hero || !card || !cardTitle) return;

      document.documentElement.style.overflow = "hidden";

      const isMobile = window.innerWidth <= 1000;
      const BIG = isMobile ? LOCKUP_SCALE.mobile : LOCKUP_SCALE.desktop;

      /*
       * Split every line into characters, each wrapped in its own overflow mask,
       * so a character can be slid out of sight without moving its neighbours.
       */
      const splits = [
        ...root.current.querySelectorAll<HTMLElement>("[data-seq-intro] p"),
        ...root.current.querySelectorAll<HTMLElement>("[data-seq-outro] p"),
      ].map((el) =>
        SplitText.create(el, {
          type: "chars",
          mask: "chars",
          charsClass: "seq-char",
        }),
      );
      /*
       * The ELEMENT, not a selector string. Inside useGSAP's scope a selector
       * resolves against this component's root, and the card title lives in the
       * hero, so a string here matched nothing: SplitText made no characters,
       * the closing tween got an empty target list, and GSAP tolerated it
       * silently. The title simply appeared instead of posting up, and every
       * other assertion still passed. Anything reaching outside this component
       * must be passed as a node.
       */
      const cardSplit = SplitText.create(cardTitle, {
        type: "chars",
        mask: "chars",
        charsClass: "seq-char",
      });

      const q = (sel: string) =>
        Array.from(root.current!.querySelectorAll<HTMLElement>(sel));

      const introChars = (side: string) =>
        q('[data-seq-intro][data-side="' + side + '"] .seq-char');
      const outroChars = (side: string) =>
        q('[data-seq-outro][data-side="' + side + '"] .seq-char');

      const firstOf = (side: string) => introChars(side).slice(0, 1);
      const restOf = (side: string) => introChars(side).slice(1);

      /*
       * TWO ELEMENTS PER LETTER, and which one you move matters.
       * SplitText builds `.seq-char-mask` (overflow: clip) wrapping `.seq-char`.
       * The reveal slides the CHAR inside its mask, which is what makes it look
       * posted through a slot. The lockup travels much further than the mask is
       * wide, so it moves the MASK, carrying the char with it; moving the char
       * there would simply clip it against its own wrapper.
       */
      const maskOf = (el: HTMLElement) => (el.parentElement ?? el) as HTMLElement;

      /*
       * Where the pair has to sit to read as one centred monogram at a given
       * scale. Measured off the live rects, so it is right at any width and any
       * root font size. Transform origin is the default centre, so moving a
       * box's centre to X and then scaling about that centre keeps it there.
       */
      const lockupAt = (side: string, scale: number) => {
        const a = maskOf(firstOf(side)[0]);
        const b = maskOf(outroChars(side)[0]);
        const ra = a.getBoundingClientRect();
        const rb = b.getBoundingClientRect();
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        const wa = ra.width * scale;
        const wb = rb.width * scale;
        const left = cx - (wa + wb) / 2;
        return {
          a: {
            x: left + wa / 2 - (ra.left + ra.width / 2),
            y: cy - (ra.top + ra.height / 2),
            scale,
          },
          b: {
            x: left + wa + wb / 2 - (rb.left + rb.width / 2),
            y: cy - (rb.top + rb.height / 2),
            scale,
          },
        };
      };

      /* Measure BEFORE anything moves, while every glyph is still at rest. */
      const met = lockupAt("top", 1);
      const big = lockupAt("top", BIG);
      const bigB = lockupAt("bottom", BIG);

      /* Starting state: type parked above its masks, hero shut to a hairline. */
      gsap.set([...introChars("top"), ...outroChars("top")], { yPercent: -100 });
      gsap.set(cardSplit.chars, { yPercent: 100 });
      gsap.set(q("[data-seq-tag] p"), { yPercent: 100 });

      /*
       * The hero is elevated ABOVE the panels and shut at the same instant. Both
       * together, never apart: elevated while still open would paint the hero
       * over the panels, and shut in CSS would hide it from anyone who skips.
       */
      gsap.set(hero, {
        position: "relative",
        zIndex: 90,
        clipPath: "polygon(0 48%, 0 48%, 0 52%, 0 52%)",
      });
      gsap.set(card, { clipPath: "polygon(0% 50%, 100% 50%, 100% 50%, 0% 50%)" });

      /*
       * The bottom panel is pre-set to the FINISHED lockup and never animates
       * its type: by the time the panels are clipped apart it only has to MATCH
       * what the top panel has arrived at, so that one monogram appears to tear
       * rather than two appearing to swap.
       */
      gsap.set([...firstOf("bottom"), ...outroChars("bottom")], { yPercent: 0 });
      gsap.set(restOf("bottom"), { yPercent: -100 });
      gsap.set(maskOf(firstOf("bottom")[0]), bigB.a);
      gsap.set(maskOf(outroChars("bottom")[0]), bigB.b);

      const release = () => {
        document.documentElement.style.overflow = "";
        window.scrollTo(0, 0);
        /* Give the hero back to the document: a section left at z-index 90
           would sit above the navbar for the rest of the visit. */
        gsap.set(hero, { clearProps: "position,zIndex,clipPath" });
        gsap.set(card, { clearProps: "clipPath" });
        ScrollTrigger.refresh();
        try {
          sessionStorage.setItem(SEEN_KEY, "seen");
        } catch {
          /* Nothing to do; it simply plays again next load. */
        }
        gsap.set(root.current, { display: "none" });
      };

      /* Timeline, compressed from the card's ~7s. Beats kept in proportion. */
      const tl = gsap.timeline({ defaults: { ease: HOP }, onComplete: release });

      TAGS.forEach((_, i) => {
        tl.to(
          q(`[data-seq-tag="${i}"] p`),
          { yPercent: 0, duration: 0.5 },
          0.25 + i * 0.07,
        );
      });

      tl.to(
        introChars("top"),
        { yPercent: 0, duration: 0.5, stagger: 0.035 },
        0.25,
      )
        /* Everything but the first letter drops back out of its mask. */
        .to(restOf("top"), { yPercent: 100, duration: 0.5, stagger: 0.035 }, 1.2)
        .to(outroChars("top"), { yPercent: 0, duration: 0.5, stagger: 0.05 }, 1.5)
        /* The survivor and the arrival slide together at their own size... */
        .to(maskOf(firstOf("top")[0]), { ...met.a, duration: 0.65 }, 2.1)
        .to(maskOf(outroChars("top")[0]), { ...met.b, duration: 0.65 }, 2.1)
        /* ...then the pair grows into the monogram. Scale, never font-size: a
           font-size tween reflows the glyph inside a mask that does not grow
           with it, so the letter ends up clipped by its own wrapper. */
        .to(maskOf(firstOf("top")[0]), { ...big.a, duration: 0.5 }, 2.75)
        .to(
          maskOf(outroChars("top")[0]),
          {
            ...big.b,
            duration: 0.5,
            onComplete: () => {
              /* THE TEAR. One lockup becomes two halves. */
              gsap.set(top, { clipPath: "polygon(0 0, 100% 0, 100% 50%, 0 50%)" });
              gsap.set(bottom, {
                clipPath: "polygon(0 50%, 100% 50%, 100% 100%, 0 100%)",
              });
            },
          },
          2.75,
        )
        /* The hero opens as a full width hairline along the tear. */
        .to(
          hero,
          {
            clipPath: "polygon(0% 48%, 100% 48%, 100% 52%, 0% 52%)",
            duration: 0.65,
          },
          3.15,
        );

      TAGS.forEach((_, i) => {
        tl.to(
          q(`[data-seq-tag="${i}"] p`),
          { yPercent: 100, duration: 0.5 },
          3.45 + i * 0.07,
        );
      });

      /* The doors part, the hero opens the rest of the way behind them. */
      tl.to(top, { yPercent: -50, duration: 0.7 }, 3.8)
        .to(bottom, { yPercent: 50, duration: 0.7 }, 3.8)
        .to(
          hero,
          {
            clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
            duration: 0.7,
          },
          3.8,
        )
        .to(
          card,
          {
            clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
            duration: 0.5,
          },
          4.0,
        )
        .to(
          cardSplit.chars,
          { yPercent: 0, duration: 0.5, stagger: 0.035 },
          4.15,
        );

      return () => {
        /* Unmounting mid sequence must never leave the page unscrollable, the
           hero clipped shut, or the hero stranded above the navbar. */
        document.documentElement.style.overflow = "";
        gsap.set(hero, { clearProps: "position,zIndex,clipPath" });
        gsap.set(card, { clearProps: "clipPath" });
        splits.forEach((s) => s.revert());
        cardSplit.revert();
      };
    },
    { scope: root, dependencies: [phase] },
  );

  return (
    <div
      ref={root}
      aria-hidden
      data-opening-sequence
      data-phase={phase}
      /* motion-reduce:hidden is the accessibility path in CSS, so a reduced
         motion visitor never sees the panels even for the single frame before
         the effect runs. data-phase="skip" covers the already-seen case. */
      className="contents motion-reduce:hidden data-[phase=skip]:hidden"
    >
      {phase === "run" && (
        <>
          <div
            data-panel="bottom"
            className="fixed inset-0 z-[80] overflow-hidden bg-ink text-bone"
          >
            <Lockup side="bottom" />
          </div>
          <div
            data-panel="top"
            className="fixed inset-0 z-[81] overflow-hidden bg-ink text-bone"
          >
            <Lockup side="top" />
          </div>
          <div className="pointer-events-none fixed inset-0 z-[82]">
            {TAGS.map((tag, i) => (
              <div
                key={tag}
                data-seq-tag={i}
                className={[
                  "absolute w-max overflow-hidden text-muted",
                  i === 0 && "top-[15%] left-[15%]",
                  i === 1 && "bottom-[15%] left-[25%]",
                  i === 2 && "right-[15%] bottom-[30%]",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <p className="text-mp2 font-medium tracking-[0.08em] uppercase">
                  {tag}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
