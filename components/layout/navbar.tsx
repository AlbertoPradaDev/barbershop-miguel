"use client";

/*
 * Fixed site header. Three zones on desktop (wordmark / section links / booking
 * CTA); on mobile only the wordmark and the burger stay, and the links move
 * into the full screen curtain menu (mobile-menu.tsx).
 *
 * The bar reads the band it floats over. The page is a stack of [data-scheme]
 * bands and the header carries the same attribute, copied from whichever band
 * is crossing the bar. Everything inside (wordmark, links, burger, booking capsule) then
 * inherits the inverted tokens on its own: white type over the black bands,
 * near black over the white ones, and the scrolled plate paints the band's own
 * bg-page-bg, so the bar reads as a tint of what is behind it. Nothing in here
 * names a colour.
 *
 * Motion recipe:
 *   mount     every [data-nav-item] fades up from y 12, duration 0.7,
 *             stagger 0.06, expo.out, delayed by REVEAL.introDelay so the bar
 *             settles together with the hero lines.
 *   scheme    a throttled scroll sampler (90ms) reads the live rect of every
 *             band and takes the scheme of the last one whose top has passed
 *             the middle of the bar, where the type sits. NOT ScrollTrigger:
 *             the gallery pins, and cached trigger ranges go stale against a
 *             pin spacer created by another component. Colour and plate cross
 *             over 0.35s on ease-osmo. State and not motion, so it runs under
 *             reduced motion too; only the crossfade is dropped there.
 *   scrolled  ONE ScrollTrigger (start 40px, end max) toggles .is-scrolled on
 *             the header. A separate absolutely positioned layer fades its
 *             background in over 0.5s on ease-osmo, so nothing in the bar ever
 *             shifts. There is no rule under the plate: the wash alone carries
 *             the legibility over photography. Backdrop blur is fine pointer
 *             only: coarse pointers get an opaque 95% wash instead, because a
 *             full width blur is a per frame cost phones should not pay.
 *   burger    a single data-open attribute drives pure CSS transitions: the
 *             inner wrapper spins 180deg to the right over 0.5s on ease-osmo
 *             while bar 1 and bar 3 rotate to +/-45deg over 0.45s and bar 2
 *             fades out over 0.2s. Closing runs the same transition backwards,
 *             so the wrapper spins back to the left.
 * While the curtain menu is open the header floats over an always ink panel,
 * so it is pinned to the dark scheme for exactly as long as the menu is open
 * (the same condition that puts data-menu-open on <html>) and handed back to
 * the band underneath on close; the burger's own 0.4s colour transition walks
 * it back down while the curtain is still retracting, so it stays visible for
 * the whole close.
 * Reduced motion: no mount tween and no crossfade, only the state changes.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { gsap, useGSAP, ScrollTrigger, REVEAL } from "@/lib/gsap";
import { useLenis } from "@/components/providers/smooth-scroll-provider";
import { PillButton } from "@/components/ui/pill-button";
import { MobileMenu } from "@/components/layout/mobile-menu";
import { SITE } from "@/lib/content/site";

const BOOK_LABEL = "Book now";
const MENU_ID = "site-mobile-menu";

/* Toggled by the single ScrollTrigger; only used as a styling hook. */
const SCROLLED_CLASS = "is-scrolled";
const SCROLLED_AT = 40;

/* Matches the max-md: breakpoint (media query rem is always 16px). */
const MOBILE_QUERY = "(max-width: 767px)";

type Scheme = "dark" | "light";

/* The page opens on the hero, which is a dark band, so the server already
   paints the bar right on the very first frame. Mount then corrects it from
   the real scroll position, because a reload can land mid page. */
const INITIAL_SCHEME: Scheme = "dark";

const schemeOf = (band: HTMLElement): Scheme =>
  band.dataset.scheme === "dark" ? "dark" : "light";

/* Every band the page paints, in document order: the eight section wrappers
   plus the footer. Anything inside the header is skipped (the header carries
   the attribute itself now), and so is any band nested inside another one, so
   only the outermost grounds can own the bar. */
function readBands(header: HTMLElement): HTMLElement[] {
  const all = Array.from(
    document.querySelectorAll<HTMLElement>("[data-scheme]"),
  ).filter((band) => band !== header && !header.contains(band));

  return all.filter(
    (band) => !all.some((other) => other !== band && other.contains(band)),
  );
}

/* No background and no rule of its own: the scrolled plate is the only thing
   that paints. The colour crosses on the same curve as the plate, so a band
   seam reads as a fade and never as a snap. */
const HEADER = [
  "group/nav fixed inset-x-0 top-0 z-50 h-84 max-md:h-72",
  "text-page-text",
  "[transition:color_0.35s_var(--ease-osmo)]",
  "motion-reduce:transition-none",
].join(" ");

/* Coarse pointers get the opaque wash; the blur is fine pointer only, gated in
   CSS (written out in full, Tailwind only sees literal class strings) so no
   hydration pass ever has to swap the class. bg-page-bg resolves against the
   header's own scheme, so the plate is always the colour of the band under it
   and crosses over on the same 0.35s as the type. */
const BACKDROP = [
  "pointer-events-none absolute inset-0 bg-page-bg/95",
  "[@media(hover:hover)_and_(pointer:fine)]:bg-page-bg/70",
  "[@media(hover:hover)_and_(pointer:fine)]:backdrop-blur-[12px]",
  "invisible opacity-0",
  "[transition:opacity_0.5s_var(--ease-osmo),visibility_0.5s_var(--ease-osmo),background-color_0.35s_var(--ease-osmo)]",
  "motion-reduce:transition-none",
  "[.is-scrolled_&]:visible [.is-scrolled_&]:opacity-100",
].join(" ");

const NAV_LINK =
  "underline-link text-p2 font-medium text-page-text/80 transition-colors duration-500 ease-osmo hover:text-page-text";

const BURGER_BAR = [
  "absolute left-0 top-1/2 h-1.5 w-24 rounded-btn bg-current",
  "[transition:transform_0.45s_var(--ease-osmo),opacity_0.2s_ease,background-color_0.4s_ease]",
  "motion-reduce:transition-none",
].join(" ");

/* One token, two jobs: the bars follow the band while the menu is shut, and
   the header is pinned dark for as long as it is open, so they go bone for the
   whole open and walk back down over 0.4s as the curtain retracts. */
const BURGER = [
  /* -mr-10 lets the 44px tap target overhang the gutter so the bars
     themselves line up with the wordmark's left edge. */
  "relative z-[70] -mr-10 hidden size-44 cursor-pointer place-items-center max-md:grid",
  "text-page-text [transition:color_0.4s_ease]",
].join(" ");

export function Navbar() {
  const root = useRef<HTMLElement>(null);
  const burger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  /* The band currently under the bar, and whether the curtain has taken the
     bar off it. Refs and not state: the scheme is a DOM attribute, and
     re-rendering the whole header at every seam would buy nothing. */
  const bandScheme = useRef<Scheme>(INITIAL_SCHEME);
  const menuOpen = useRef(false);

  const lenis = useLenis();

  const paint = useCallback((scheme: Scheme) => {
    const header = root.current;
    if (header) header.dataset.scheme = scheme;
  }, []);

  /* The burger only exists under max-md:, so a resize past it must not leave
     the page scroll locked by a menu nobody can see any more. */
  useEffect(() => {
    const mobile = window.matchMedia(MOBILE_QUERY);
    const onChange = (event: MediaQueryListEvent) => {
      if (!event.matches) setOpen(false);
    };
    mobile.addEventListener("change", onChange);
    return () => mobile.removeEventListener("change", onChange);
  }, []);

  /* The curtain is always an ink panel, so while it is open the bar is pinned
     dark whatever band it happens to sit over, then given straight back. */
  useEffect(() => {
    menuOpen.current = open;
    paint(open ? "dark" : bandScheme.current);
  }, [open, paint]);

  const closeMenu = useCallback(() => setOpen(false), []);

  const scrollToSection = useCallback(
    (href: string) => {
      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      const headerHeight = root.current?.offsetHeight ?? 84;

      if (href === "#") {
        if (reduced) window.scrollTo({ top: 0, behavior: "auto" });
        else if (lenis) lenis.scrollTo(0, { force: true });
        else window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      const target = document.querySelector<HTMLElement>(href);
      if (!target) return;

      if (reduced) {
        const top =
          target.getBoundingClientRect().top + window.scrollY - headerHeight;
        window.scrollTo({ top, behavior: "auto" });
        return;
      }
      if (lenis) {
        lenis.scrollTo(target, { offset: -headerHeight, force: true });
        return;
      }
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    [lenis],
  );

  useGSAP(
    () => {
      const header = root.current;
      if (!header) return;

      /* Background state. Not motion, so it runs under reduced motion too. */
      ScrollTrigger.create({
        start: SCROLLED_AT,
        end: "max",
        toggleClass: { targets: header, className: SCROLLED_CLASS },
      });

      /*
         Colour band tracking. Deliberately NOT ScrollTrigger: the gallery pins,
         and a pin spacer changes the height of everything below it. Trigger
         ranges are cached at refresh time, so whichever of the two components
         mounts first ends up holding pre pin geometry, and every band after the
         gallery then flips about 1980px early and the last band never wins the
         bar at all. Reading the live rect on each scroll cannot go stale,
         because there is nothing to invalidate.

         The cost is nine getBoundingClientRect calls per sample, throttled to
         one sample per 90ms, which is the same budget the Moyra theme swap ran
         on. It is state and not motion, so it runs under reduced motion too. */
      const line = () => (root.current?.offsetHeight ?? 84) / 2;
      const bands = readBands(header);

      const adopt = (band: HTMLElement) => {
        bandScheme.current = schemeOf(band);
        /* An open curtain owns the bar; closing it hands the band back. */
        if (!menuOpen.current) paint(bandScheme.current);
      };

      const THROTTLE_MS = 90;
      let lastSample = 0;

      /* The band the bar sits on is the last one whose top has already passed
         the bar's middle line. Bands tile the page, so exactly one qualifies. */
      const sync = () => {
        const edge = line();
        let landed = bands[0];
        for (const band of bands) {
          if (band.getBoundingClientRect().top <= edge) landed = band;
          else break;
        }
        if (landed) adopt(landed);
      };

      const onScroll = (event?: Event) => {
        const now = event?.timeStamp ?? 0;
        if (now && now - lastSample < THROTTLE_MS) return;
        lastSample = now;
        sync();
      };

      sync();
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", sync);

      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        gsap.from("[data-nav-item]", {
          opacity: 0,
          y: 12,
          duration: 0.7,
          stagger: 0.06,
          ease: "expo.out",
          delay: REVEAL.introDelay,
          clearProps: "opacity,transform",
        });
      }

      return () => {
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", sync);
      };
    },
    { scope: root },
  );

  return (
    <header
      ref={root}
      data-scheme={INITIAL_SCHEME}
      data-open={open ? "true" : "false"}
      className={HEADER}
    >
      <span aria-hidden className={BACKDROP} />

      {/* The centre zone is display:none under max-md:, which drops it out of
          the grid entirely, so mobile explicitly falls back to two columns. */}
      <div className="relative grid h-full grid-cols-[1fr_auto_1fr] max-md:grid-cols-[1fr_auto] items-center px-64 max-md:px-20">
        {/* No colour of its own: the wordmark rides the header's, so it
            crosses a seam on the header's curve instead of snapping. */}
        <a
          data-nav-item
          href="#"
          onClick={(event) => {
            event.preventDefault();
            scrollToSection("#");
          }}
          className="min-w-0 justify-self-start text-p1 max-md:text-mp1 font-semibold whitespace-nowrap"
        >
          {SITE.name}
        </a>

        <nav aria-label="Sections" className="max-md:hidden">
          <ul className="flex items-center gap-32">
            {SITE.navLinks.map((link) => (
              <li key={link.href}>
                <a
                  data-nav-item
                  href={link.href}
                  onClick={(event) => {
                    /* route links (the simulator) navigate normally; only in
                       page anchors go through the smooth scroll */
                    if (!link.href.startsWith("#")) return;
                    event.preventDefault();
                    scrollToSection(link.href);
                  }}
                  className={NAV_LINK}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex min-w-0 items-center justify-end gap-16">
          <div data-nav-item className="max-md:hidden">
            <PillButton variant="solid" href={SITE.bookingUrl}>
              {BOOK_LABEL}
            </PillButton>
          </div>

          <button
            ref={burger}
            data-nav-item
            type="button"
            aria-expanded={open}
            aria-controls={MENU_ID}
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((value) => !value)}
            className={BURGER}
          >
            <span
              aria-hidden
              className={[
                "relative block h-16 w-24",
                "[transform:rotate(0deg)] [transition:transform_0.5s_var(--ease-osmo)]",
                "group-data-[open=true]/nav:[transform:rotate(180deg)]",
                "motion-reduce:transition-none",
              ].join(" ")}
            >
              <span
                className={`${BURGER_BAR} [transform:translateY(-50%)_translateY(-0.4375rem)] group-data-[open=true]/nav:[transform:translateY(-50%)_rotate(45deg)]`}
              />
              <span
                className={`${BURGER_BAR} [transform:translateY(-50%)] group-data-[open=true]/nav:opacity-0`}
              />
              <span
                className={`${BURGER_BAR} [transform:translateY(-50%)_translateY(0.4375rem)] group-data-[open=true]/nav:[transform:translateY(-50%)_rotate(-45deg)]`}
              />
            </span>
          </button>
        </div>
      </div>

      <MobileMenu
        id={MENU_ID}
        open={open}
        onClose={closeMenu}
        onNavigate={scrollToSection}
        burgerRef={burger}
      />
    </header>
  );
}
