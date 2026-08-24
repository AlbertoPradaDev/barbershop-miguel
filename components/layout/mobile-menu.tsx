"use client";

/*
 * Full screen curtain menu, mobile only. Always bone type on an ink panel,
 * whatever colour band it opens over, and driven almost entirely by one
 * data-open attribute on the root: every layer below is a plain CSS transition
 * keyed off that attribute, so opening costs no JavaScript beyond a setState.
 * GSAP only owns the two idle loops (ken burns, barber pole), which exist only
 * while open.
 *
 * Motion recipe:
 *   curtain  two stacked panels drop from above, each 48px short of the
 *            viewport so the hem is visible. The accent underlayer runs
 *            translateY(calc(-100% - 5.5rem)) -> 6px over 0.55s on
 *            cubic-bezier(0.76,0,0.24,1) and the ink panel follows it 0.08s
 *            later, landing at 0, so the accent stays as a 6px rim tracing the
 *            hem. Closing reverses the pair: ink leads, accent trails by 0.08s.
 *   hem      an inline SVG arc hangs off each panel's bottom edge, filled with
 *            that panel's own color. It travels at scaleY(1.55) (a deep, heavy
 *            cape) and settles to scaleY(1) over 0.55s ease-osmo, 0.42s in, so
 *            the curve relaxes just after the panel lands. transform only.
 *   backdrop one menuPhotos frame per layer behind the panel at 0.22 opacity,
 *            drifting scale 1.06 <-> 1.12 over 12s (yoyo, sine.inOut). On fine
 *            pointers, hovering a link crossfades to that link's own frame over
 *            0.6s ease-osmo through a data-active attribute, no re-render.
 *   pole     a 12px rail down the left edge holds a 45deg accent/bone stripe
 *            block that GSAP translates up by one pattern period (20 * sqrt2
 *            device px) on a 1.9s linear loop, so the stripes travel forever
 *            without a seam. transform only, inside overflow-hidden.
 *   links    each sits in its own overflow-hidden mask and rises
 *            translateY(110%) -> 0 over 0.6s on cubic-bezier(0.2,0.7,0.2,1),
 *            staggered 0.25s to 0.67s through a --reveal-delay custom property
 *            so the delay only exists while open. Hover slides the label 16px
 *            right while a 2px accent rule draws scaleX 0 -> 1 from the left,
 *            both 0.45s ease-osmo. The bottom row lands last at 0.75s. Closing
 *            fades the links out in 0.15s and snaps them back once invisible.
 * While open: Lenis is stopped (null checked), <html> overflow is hidden and
 * carries data-menu-open="true" (the floating cluster hides off it), Tab is
 * trapped between the burger and the menu, Escape closes and focus returns to
 * the burger. Closed, the whole panel is inert, so nothing inside it is
 * focusable or clickable, and the photos are not even in the DOM until the menu
 * has been opened once.
 * Reduced motion: every transform is dropped, the ken burns and the pole never
 * start, and the panel simply fades in and out over 0.2s.
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type RefObject,
} from "react";
import Image from "next/image";
import { gsap, useGSAP } from "@/lib/gsap";
import { useLenis } from "@/components/providers/smooth-scroll-provider";
import { PillButton } from "@/components/ui/pill-button";
import { SITE } from "@/lib/content/site";
import { menuPhotos } from "@/lib/content/photos";

const BOOK_LABEL = "Book now";

/* One delay per nav link, in source order. */
const LINK_DELAYS = [0.25, 0.32, 0.39, 0.46, 0.53, 0.6, 0.67];
const LINK_DELAY_STEP = 0.07;

/* Long enough for the ink panel to be on its way out before the page moves. */
const CLOSE_BEFORE_SCROLL = 420;

const FOCUSABLE =
  'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";
const HOVER_QUERY = "(hover: hover) and (pointer: fine)";

/* The 45deg stripe pattern repeats every 20 device px along its own axis, so a
   vertical shift only lands back on itself after 20 / cos(45deg) px. Animating
   exactly that distance makes the loop seamless with no wrap logic. */
const STRIPE_TRAVEL = 20 * Math.SQRT2;
const STRIPE_SECONDS = 1.9;

/* Dialer link: the display number keeps its spacing, the href keeps digits.
   Null while the client still owes us a real number. */
const TEL_HREF = SITE.phone ? `tel:+${SITE.phone.replace(/\D/g, "")}` : null;

const ROOT = [
  "group/menu fixed inset-x-0 top-0 z-[60] h-[100dvh] hidden max-md:block",
  "pointer-events-none data-[open=true]:pointer-events-auto",
  "motion-reduce:opacity-0 motion-reduce:[transition:opacity_0.2s_ease]",
  "motion-reduce:data-[open=true]:opacity-100",
].join(" ");

/* 48px short of the bottom: that strip is where the arc hangs. The closed
   transform clears the panel plus the deepest arc (48 * 1.55 plus the accent's
   6px offset), so nothing peeks below the viewport top while shut. */
const PANEL_BASE = [
  "absolute inset-x-0 top-0 h-[calc(100%-3rem)]",
  "[transform:translateY(calc(-100%_-_5.5rem))]",
  "motion-reduce:[transform:none] motion-reduce:transition-none",
].join(" ");

/* Leads on the way in, trails by 0.08s on the way out, and rests 6px lower so
   it survives as a rim along the hem instead of a one beat flash. */
const PANEL_ACCENT = [
  PANEL_BASE,
  "bg-accent",
  "[transition:transform_0.42s_cubic-bezier(0.76,0,0.24,1)_0.08s]",
  "group-data-[open=true]/menu:[transform:translateY(0.375rem)]",
  "group-data-[open=true]/menu:[transition:transform_0.55s_cubic-bezier(0.76,0,0.24,1)]",
].join(" ");

/* Trails by 0.08s on the way in, leads on the way out. */
const PANEL_INK = [
  PANEL_BASE,
  "flex flex-col bg-ink text-bone",
  "[transition:transform_0.42s_cubic-bezier(0.76,0,0.24,1)]",
  "group-data-[open=true]/menu:[transform:translateY(0)]",
  "group-data-[open=true]/menu:[transition:transform_0.55s_cubic-bezier(0.76,0,0.24,1)_0.08s]",
].join(" ");

/* The hem. Scales from a deep arc to a shallow one once the panel has landed;
   scaleY on the wrapper is one composited property, so no path is re-rasterised. */
const ARC = [
  "pointer-events-none absolute inset-x-0 top-full block h-48 origin-top",
  "[transform:scaleY(1.55)]",
  "[transition:transform_0.3s_ease]",
  "group-data-[open=true]/menu:[transform:scaleY(1)]",
  "group-data-[open=true]/menu:[transition:transform_0.55s_var(--ease-osmo)_0.42s]",
  "motion-reduce:[transform:scaleY(1)] motion-reduce:transition-none",
].join(" ");

/* Photographic backdrop. No blur anywhere: opacity plus a slow scale only. */
const BACKDROP = "absolute inset-0 block overflow-hidden opacity-[0.22]";

const PHOTO_LAYER = [
  "absolute inset-0 block opacity-0",
  "[transition:opacity_0.6s_var(--ease-osmo)]",
  "data-[active=true]:opacity-100",
  "motion-reduce:transition-none",
].join(" ");

/* Barber pole rail down the left edge of the curtain. */
const RAIL = [
  "pointer-events-none absolute bottom-0 left-0 top-72 w-12 overflow-hidden",
  "opacity-0 [transition:opacity_0.3s_ease]",
  "group-data-[open=true]/menu:opacity-100",
  "group-data-[open=true]/menu:[transition:opacity_0.5s_ease_0.3s]",
  "motion-reduce:transition-none",
].join(" ");

const STRIPES = [
  "absolute inset-x-0 -bottom-40 -top-40 block will-change-transform",
  "[background-image:repeating-linear-gradient(45deg,var(--page-accent)_0_10px,var(--color-bone)_10px_20px)]",
].join(" ");

const COLUMN = [
  "relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden",
  "overscroll-contain scrollbar-hide pt-40",
].join(" ");

const LINK = [
  "group/link relative block px-8 py-[0.12em] text-center",
  "text-h1 max-md:text-mh1 font-medium text-bone",
  "opacity-0 [transform:translateY(110%)]",
  "[transition:opacity_0.15s_ease,transform_0s_linear_0.15s]",
  "group-data-[open=true]/menu:opacity-100 group-data-[open=true]/menu:[transform:translateY(0)]",
  "group-data-[open=true]/menu:[transition:transform_0.6s_cubic-bezier(0.2,0.7,0.2,1)_var(--reveal-delay),opacity_0.2s_ease_var(--reveal-delay)]",
  "motion-reduce:opacity-100 motion-reduce:[transform:none] motion-reduce:transition-none",
].join(" ");

/* Hover lives on the label, not the anchor, so it never fights the reveal
   transform the mask depends on. Mirrored under :active for touch. */
const LINK_LABEL = [
  "relative inline-block [transition:transform_0.45s_var(--ease-osmo)]",
  "group-hover/link:[transform:translateX(1rem)]",
  "group-active/link:[transform:translateX(1rem)]",
  "group-focus-visible/link:[transform:translateX(1rem)]",
  "motion-reduce:transition-none",
].join(" ");

const LINK_RULE = [
  "pointer-events-none absolute -bottom-[0.06em] left-0 h-[2px] w-full origin-left bg-accent",
  "[transform:scaleX(0)] [transition:transform_0.45s_var(--ease-osmo)]",
  "group-hover/link:[transform:scaleX(1)]",
  "group-active/link:[transform:scaleX(1)]",
  "group-focus-visible/link:[transform:scaleX(1)]",
  "motion-reduce:transition-none",
].join(" ");

const BOTTOM_ROW = [
  "relative z-10 flex flex-col items-center gap-16 px-24 pb-40",
  "opacity-0 [transform:translateY(1.25rem)]",
  "[transition:opacity_0.15s_ease,transform_0s_linear_0.15s]",
  "group-data-[open=true]/menu:opacity-100 group-data-[open=true]/menu:[transform:translateY(0)]",
  "group-data-[open=true]/menu:[transition:transform_0.6s_cubic-bezier(0.2,0.7,0.2,1)_0.75s,opacity_0.4s_ease_0.75s]",
  "motion-reduce:opacity-100 motion-reduce:[transform:none] motion-reduce:transition-none",
].join(" ");

const META_LINK = [
  "underline-link font-mono text-p2 max-md:text-mp2 uppercase tracking-[0.1em]",
  "text-bone/70 transition-colors duration-400 ease-out",
  "hover:text-accent active:text-accent focus-visible:text-accent",
  "motion-reduce:transition-none",
].join(" ");

/* Shallow arc spanning the full width. The quadratic control point sits at
   twice the depth, so the curve bottoms out at exactly the viewBox height. */
function Hem({ className }: { className: string }) {
  return (
    <span aria-hidden className={className}>
      <svg
        viewBox="0 0 390 48"
        preserveAspectRatio="none"
        focusable="false"
        className="block h-full w-full"
      >
        <path d="M0 0 Q195 96 390 0 Z" fill="currentColor" />
      </svg>
    </span>
  );
}

interface MobileMenuProps {
  id: string;
  open: boolean;
  onClose: () => void;
  onNavigate: (href: string) => void;
  burgerRef: RefObject<HTMLButtonElement | null>;
}

export function MobileMenu({
  id,
  open,
  onClose,
  onNavigate,
  burgerRef,
}: MobileMenuProps) {
  const root = useRef<HTMLDivElement>(null);
  const wasOpen = useRef(false);
  const scrollTimer = useRef<number | null>(null);
  const layers = useRef<(HTMLSpanElement | null)[]>([]);
  const hoverMq = useRef<MediaQueryList | null>(null);

  /* The photos only enter the DOM once the menu has been opened for the first
     time, so a phone that never touches the burger never downloads them. */
  const [armed, setArmed] = useState(false);

  const lenis = useLenis();

  /* Adjusting state during render (React's own pattern for deriving from a
     prop) rather than in an effect: no second commit, no cascading render. */
  if (open && !armed) setArmed(true);

  /* Crossfade by attribute, straight on the nodes: hovering a link must not
     re-render seven big text nodes. */
  const setBackdrop = useCallback((index: number) => {
    layers.current.forEach((node, i) => {
      if (node) node.dataset.active = i === index ? "true" : "false";
    });
  }, []);

  const canHover = useCallback(() => {
    if (typeof window === "undefined") return false;
    hoverMq.current ??= window.matchMedia(HOVER_QUERY);
    return hoverMq.current.matches;
  }, []);

  /* Scroll lock, focus trap and Escape, all torn down together on close. */
  useEffect(() => {
    if (!open) return;

    const html = document.documentElement;
    const previousOverflow = html.style.overflow;
    html.style.overflow = "hidden";
    /* The floating bottom-right cluster hides itself off this attribute. */
    html.setAttribute("data-menu-open", "true");
    lenis?.stop();

    const panel = root.current;
    panel?.focus({ preventScroll: true });

    const focusables = () => {
      const inside = panel
        ? Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE))
        : [];
      const burger = burgerRef.current;
      return burger ? [burger, ...inside] : inside;
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (!active || !items.includes(active)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
        return;
      }
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      html.style.overflow = previousOverflow;
      html.removeAttribute("data-menu-open");
      setBackdrop(0);
      lenis?.start();
    };
  }, [open, lenis, onClose, burgerRef, setBackdrop]);

  /* Hand focus back to the control that opened the menu. */
  useEffect(() => {
    if (wasOpen.current && !open) {
      burgerRef.current?.focus({ preventScroll: true });
    }
    wasOpen.current = open;
  }, [open, burgerRef]);

  useEffect(
    () => () => {
      if (scrollTimer.current !== null) window.clearTimeout(scrollTimer.current);
    },
    [],
  );

  /* The only two GSAP loops in the menu, and they exist only while it is open:
     a closed curtain must not keep a phone's compositor awake. */
  useGSAP(
    () => {
      const scope = root.current;
      if (!scope) return;

      const drifts = gsap.utils.toArray<HTMLElement>("[data-kenburns]", scope);
      const stripes = gsap.utils.toArray<HTMLElement>("[data-stripes]", scope);

      if (drifts.length) gsap.set(drifts, { scale: 1.06 });
      if (stripes.length) gsap.set(stripes, { y: 0 });

      if (!open || window.matchMedia(REDUCED_QUERY).matches) return;

      if (drifts.length) {
        gsap.to(drifts, {
          scale: 1.12,
          duration: 12,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
        });
      }
      if (stripes.length) {
        gsap.to(stripes, {
          y: -STRIPE_TRAVEL,
          duration: STRIPE_SECONDS,
          ease: "none",
          repeat: -1,
        });
      }
    },
    { scope: root, dependencies: [open, armed] },
  );

  const handleLink = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    event.preventDefault();
    onClose();
    const reduced = window.matchMedia(REDUCED_QUERY).matches;
    if (scrollTimer.current !== null) window.clearTimeout(scrollTimer.current);
    scrollTimer.current = window.setTimeout(
      () => onNavigate(href),
      reduced ? 60 : CLOSE_BEFORE_SCROLL,
    );
  };

  return (
    <div
      ref={root}
      id={id}
      role="dialog"
      aria-modal="true"
      aria-label="Site menu"
      tabIndex={-1}
      inert={!open}
      data-open={open ? "true" : "false"}
      className={ROOT}
    >
      <span aria-hidden className={PANEL_ACCENT}>
        <Hem className={`${ARC} text-accent`} />
      </span>

      <div className={PANEL_INK}>
        <span aria-hidden className={BACKDROP}>
          {armed &&
            menuPhotos.map((photo, index) => (
              <span
                key={photo.id}
                ref={(node) => {
                  layers.current[index] = node;
                }}
                data-active={index === 0 ? "true" : "false"}
                className={PHOTO_LAYER}
              >
                <span
                  data-kenburns
                  className="absolute inset-0 block will-change-transform"
                >
                  <Image
                    src={photo.src}
                    alt=""
                    fill
                    sizes="100vw"
                    className="object-cover"
                  />
                </span>
              </span>
            ))}
        </span>

        <Hem className={`${ARC} text-ink`} />

        <span aria-hidden className={RAIL}>
          <span data-stripes className={STRIPES} />
        </span>

        <div className={COLUMN} data-lenis-prevent>
          <nav
            aria-label="Sections"
            className="flex flex-1 flex-col items-center justify-center gap-6 px-24"
          >
            {SITE.navLinks.map((link, index) => {
              const delay =
                LINK_DELAYS[index] ?? LINK_DELAYS[0] + index * LINK_DELAY_STEP;
              return (
                <span key={link.href} className="block overflow-hidden">
                  <a
                    href={link.href}
                    onClick={(event) => handleLink(event, link.href)}
                    onMouseEnter={() => {
                      if (canHover()) setBackdrop(index % menuPhotos.length);
                    }}
                    style={{ "--reveal-delay": `${delay}s` } as CSSProperties}
                    className={LINK}
                  >
                    <span className={LINK_LABEL}>
                      {link.label}
                      <span aria-hidden className={LINK_RULE} />
                    </span>
                  </a>
                </span>
              );
            })}
          </nav>

          <div className={BOTTOM_ROW}>
            <PillButton variant="solid" href={SITE.bookingUrl}>
              {BOOK_LABEL}
            </PillButton>

            {/* Two rows, not one: the mono number alone is 17 characters wide,
                so a single row would wrap mid list on a 390 artboard. */}
            <div className="flex flex-col items-center gap-8">
              <div className="flex flex-wrap items-center justify-center gap-x-24 gap-y-8">
                {SITE.socials.map((social) => {
                  const external = /^https?:\/\//i.test(social.href);
                  return (
                    <a
                      key={social.label}
                      href={social.href}
                      target={external ? "_blank" : undefined}
                      rel={external ? "noopener noreferrer" : undefined}
                      className={META_LINK}
                    >
                      {social.label}
                    </a>
                  );
                })}
              </div>
              {TEL_HREF && (
                <a href={TEL_HREF} className={META_LINK}>
                  {SITE.phone}
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
