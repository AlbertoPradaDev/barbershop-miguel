"use client";

import { useCallback, useRef } from "react";
import type { MouseEvent } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { useLenis } from "@/components/providers/smooth-scroll-provider";
import { SITE } from "@/lib/content/site";

/*
 * Curtain footer (ported from the portfolio's footer). The footer is a normal
 * in-flow block at the very end of the page; its inner block starts lifted and
 * slides down to rest as the footer is scrolled into view, so the black plate
 * reads as a curtain sliding out from under the page instead of scrolling up
 * with it. It sits outside the alternating colour bands and is always ink/bone.
 *
 * It carries data-scheme="dark" so the tokens that are not spelled out here
 * (the accent red in the barber pole and the global :focus-visible ring)
 * resolve for a black ground rather than for the page's white default.
 *
 * Motion recipe
 *   curtain   [data-footer-inner] yPercent -35 -> 0, ease none, scrubbed
 *             between "top bottom" and "bottom bottom" of the footer.
 *   ribbon    a 4px barber pole band pinned to the very top edge: a 45deg
 *             striped element, an exact whole number of stripe periods wide,
 *             slides by exactly one period on a looping xPercent tween, so the
 *             stripes travel forever with no visible loop point. Same motif as
 *             the mobile menu. It lives on the footer itself, not inside the
 *             curtain, so the edge stays welded to the seam.
 *   headline  two lines in overflow masks, yPercent 110 -> 0, duration 1,
 *             stagger 0.09, expo.out, once. Its ScrollTrigger fires off the
 *             footer, which never moves, and not off the curtain, whose cached
 *             position would be measured mid parallax.
 *
 * Height. The footer is capped at max-h-[100svh] and its own padding, gaps and
 * wordmark are sized to land inside that box rather than be clipped by it: at
 * 1440x900 the block measures 678px and at 390x844 it measures 731px. svh and
 * not vh, so a mobile browser's collapsing chrome cannot push the cap past the
 * screen. The wordmark is what used to overflow: at 11.5vw the full 24
 * character name wrapped onto a second line and cost 331px on a laptop, so it
 * is set at 7.8vw (7.6 on mobile), the largest size that still holds one line
 * inside the artboard's own side padding at every viewport width. On mobile the
 * three link columns fall to two rather than stacking into one tall strip, and
 * the seven Explore links run two up inside a full width cell. That leaves the
 * block short enough to clear 100svh on a phone whose browser chrome is fully
 * expanded, not only on the nominal 844px artboard.
 *
 * Under prefers-reduced-motion none of it is built: the lines are set to their
 * resting state, the curtain never leaves 0 and the ribbon simply sits still.
 */

/* Echoes the barber's own description of the work: precision, comfort, care. */
const HEADLINE = ["Precision,", "every cut."] as const;
const DESCRIPTOR = "Barbershop, Raleigh NC";
/* Null-safe: no number means no dialler link, not a dead one. */
const TEL = SITE.phone ? `tel:${SITE.phone.replace(/[^\d+]/g, "")}` : null;
const MAILTO = SITE.email ? `mailto:${SITE.email}` : null;

/*
 * Barber pole ribbon.
 * The stripes are a 45deg repeating gradient, so the pattern repeats along the
 * horizontal every `2 * STRIPE * sqrt(2)`. The travelling element is an exact
 * whole number of those periods wide and slides by exactly one of them, which
 * puts the loop point on an identical frame: nothing ever jumps. The travel is
 * a share of the element's own width (xPercent stays a CSS percentage), so it
 * stays exact when the artboard rescales the rem the stripes are drawn in.
 * TILES is sized past the widest rail the artboard can produce: the root font
 * size stops growing at a 2560px viewport, so a wider screen buys rem, and 300
 * periods (about 318rem, a 4px tall gradient) still covers a 6700px display.
 */
const STRIPE = 0.375; // 6 artboard px, in rem
const PERIOD = 2 * STRIPE * Math.SQRT2;
const TILES = 300;
const RIBBON_WIDTH = `${(PERIOD * TILES).toFixed(3)}rem`;
const RIBBON_TRAVEL = -100 / TILES;
/* One period every 2.4s: roughly 7 artboard px a second, a slow drift. */
const RIBBON_CYCLE = 2.4;
const RIBBON_FILL = [
  "repeating-linear-gradient(45deg,",
  `var(--page-accent) 0 ${STRIPE}rem,`,
  `var(--color-bone) ${STRIPE}rem ${STRIPE * 2}rem)`,
].join(" ");

/* Ink is a solid #050505 and bone a pure #ffffff, so anything held back by
   opacity reads as flat grey instead of dimmed white. Every held-back value in
   this footer is expressed as bone alpha and lifted for that ground. */
const COLUMN_LABEL = "text-p2 max-md:text-mp2 font-semibold text-bone/50";
const COLUMN_LIST = "mt-12 flex flex-col gap-8 text-p1 max-md:text-mp1";
/* Seven links stacked one per line is the single tallest thing in the footer on
   a phone. On mobile the Explore cell takes the full width of the two column
   grid and its list runs two up, which turns seven rows into four. */
const EXPLORE_LIST = "max-md:grid max-md:grid-cols-2 max-md:gap-x-24";

export function Footer() {
  const wrap = useRef<HTMLElement>(null);
  const ribbon = useRef<HTMLSpanElement>(null);
  const lenis = useLenis();

  /* In page links go through Lenis so the jump is smoothed and lands clear of
     the fixed header, exactly like the nav does. */
  const onNavClick = useCallback(
    (event: MouseEvent<HTMLAnchorElement>, href: string) => {
      const target = document.querySelector<HTMLElement>(href);
      if (!target) return;
      event.preventDefault();

      const offset =
        document.querySelector<HTMLElement>("header")?.offsetHeight ?? 84;

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        const top =
          target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: "auto" });
        return;
      }
      if (lenis) {
        lenis.scrollTo(target, { offset: -offset, force: true });
        return;
      }
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    [lenis],
  );

  useGSAP(
    () => {
      const el = wrap.current;
      if (!el) return;

      const lines = gsap.utils.toArray<HTMLElement>("[data-footer-line]", el);

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        gsap.set(lines, { yPercent: 0 });
        return;
      }

      if (ribbon.current) {
        gsap.to(ribbon.current, {
          xPercent: RIBBON_TRAVEL,
          duration: RIBBON_CYCLE,
          ease: "none",
          repeat: -1,
        });
      }

      const inner = el.querySelector<HTMLElement>("[data-footer-inner]");
      if (inner) {
        gsap.fromTo(
          inner,
          { yPercent: -35 },
          {
            yPercent: 0,
            ease: "none",
            scrollTrigger: {
              trigger: el,
              start: "top bottom",
              end: "bottom bottom",
              scrub: true,
            },
          },
        );
      }

      if (!lines.length) return;
      gsap.fromTo(
        lines,
        { yPercent: 110 },
        {
          yPercent: 0,
          duration: 1,
          stagger: 0.09,
          ease: "expo.out",
          scrollTrigger: { trigger: el, start: "top 75%", once: true },
        },
      );
    },
    { scope: wrap },
  );

  return (
    <footer
      id="site-footer"
      ref={wrap}
      data-scheme="dark"
      className="relative max-h-[100svh] overflow-hidden bg-ink text-bone"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-10 h-4 overflow-hidden"
      >
        <span
          ref={ribbon}
          className="absolute inset-y-0 left-0 will-change-transform"
          style={{ width: RIBBON_WIDTH, backgroundImage: RIBBON_FILL }}
        />
      </span>

      <div
        data-footer-inner
        className="px-40 pt-88 pb-40 max-md:px-16 max-md:pt-48 max-md:pb-56 will-change-transform"
      >
        <p className="mb-64 max-md:mb-32 text-h2 max-md:text-mh2 font-medium">
          {HEADLINE.map((line) => (
            <span
              key={line}
              className="-mb-[0.14em] block overflow-hidden pb-[0.14em]"
            >
              <span data-footer-line className="block">
                {line}
              </span>
            </span>
          ))}
        </p>

        <div className="grid grid-cols-3 gap-40 max-md:grid-cols-2 max-md:gap-x-24 max-md:gap-y-24">
          <div className="max-md:col-span-2">
            <span className={COLUMN_LABEL}>Explore</span>
            <ul className={`${COLUMN_LIST} ${EXPLORE_LIST}`}>
              {SITE.navLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    onClick={(event) => onNavClick(event, link.href)}
                    className="underline-link"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <span className={COLUMN_LABEL}>Follow</span>
            <ul className={COLUMN_LIST}>
              {SITE.socials.map((social) => {
                /* Every entry in SITE.socials renders, and the http test is
                   what decides the target: a profile URL opens in a new tab, a
                   tel: or mailto: channel added later stays in this one. */
                const external = /^https?:\/\//i.test(social.href);
                return (
                  <li key={social.label}>
                    <a
                      href={social.href}
                      target={external ? "_blank" : undefined}
                      rel={external ? "noopener noreferrer" : undefined}
                      className="underline-link"
                    >
                      {social.label}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>

          <div>
            <span className={COLUMN_LABEL}>Say hello</span>
            <ul className={COLUMN_LIST}>
              {TEL && (
                <li>
                  <a href={TEL} className="underline-link">
                    {SITE.phone}
                  </a>
                </li>
              )}
              {MAILTO && (
                <li>
                  <a href={MAILTO} className="underline-link">
                    {SITE.email}
                  </a>
                </li>
              )}
              <li>
                <a
                  href={SITE.bookingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline-link"
                >
                  Book now
                </a>
              </li>
            </ul>
          </div>
        </div>

        <p
          aria-hidden
          className="mt-80 max-md:mt-32 text-center font-semibold leading-none tracking-tight text-[7.8vw] max-md:text-[7.6vw] select-none text-bone/95"
        >
          {SITE.name}
        </p>

        {/* The floating WhatsApp control parks over the bottom right corner of
            the viewport. On desktop the copyright would run under it, so the
            row keeps its column clear; on mobile the row stacks to the left and the
            72px bottom padding clears the 46px button in the corner. */}
        <div className="mt-32 max-md:mt-20 flex items-center justify-between pr-64 text-p2 max-md:text-mp2 text-bone/50 max-md:flex-col max-md:items-start max-md:gap-8 max-md:pr-0">
          <span>{DESCRIPTOR}</span>
          <span>
            &copy; {new Date().getFullYear()} {SITE.name}
          </span>
        </div>
      </div>
    </footer>
  );
}
