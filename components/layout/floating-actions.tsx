"use client";

/*
 * Floating action, pinned to the bottom right corner of the viewport: a single
 * WhatsApp link, 52 artboard px round, no outline and no hover state. It sits at
 * z-50, above the grain overlay (z-40), and it is opaque because it floats over
 * photography as often as over flat page colour.
 *
 * It carries its own ink/bone colours rather than the band tokens, so it never
 * inverts halfway through a scroll between a white and a black section.
 *
 * Motion recipe: mount only. Rises y 20 -> 0 with a fade, duration 0.7,
 * expo.out, delay 1.2 so the corner settles after the hero intro has finished
 * rather than competing with it. Reduced motion: it is simply there.
 *
 * While the mobile curtain menu is open it sets data-menu-open="true" on
 * <html>; the control fades out over 0.2s and drops out of the tab order, so it
 * can never float above the menu.
 */

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { SITE } from "@/lib/content/site";

const MOUNT = { y: 20, duration: 0.7, ease: "expo.out", delay: 1.2 } as const;

const ROOT = [
  "fixed right-32 bottom-32 z-50 flex flex-col items-end",
  "max-md:right-20 max-md:bottom-20",
  "[transition:opacity_0.2s_ease,visibility_0.2s_ease]",
  "[html[data-menu-open=true]_&]:pointer-events-none",
  "[html[data-menu-open=true]_&]:invisible",
  "[html[data-menu-open=true]_&]:opacity-0",
].join(" ");

const CONTROL = [
  "relative grid size-52 max-md:size-46 cursor-pointer place-items-center",
  "rounded-full bg-ink text-bone",
].join(" ");

export function FloatingActions() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        gsap.set("[data-fab-item]", { opacity: 1, y: 0 });
        return;
      }

      gsap.from("[data-fab-item]", {
        opacity: 0,
        y: MOUNT.y,
        duration: MOUNT.duration,
        ease: MOUNT.ease,
        delay: MOUNT.delay,
        clearProps: "opacity,transform",
      });
    },
    { scope: root },
  );

  return (
    <div ref={root} className={ROOT}>
      <a
        data-fab-item
        href={SITE.whatsapp}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat on WhatsApp"
        className={CONTROL}
      >
        <WhatsAppGlyph />
      </a>
    </div>
  );
}

/*
 * The mark, drawn as one path: the speech bubble with its lower left tail, and
 * the handset as a second subpath knocked out with fill-rule evenodd, so the
 * receiver always shows the button's own background.
 */
function WhatsAppGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      fillRule="evenodd"
      aria-hidden
      className="size-22"
    >
      <path d="M12 2.4A9.2 9.2 0 0 0 4.14 16.42L2.5 21.5l5.45-1.6A9.2 9.2 0 1 0 12 2.4ZM8.3 8.6a7.1 7.1 0 0 0 7.1 7.1a1.2 1.2 0 0 0 0-2.4a4.7 4.7 0 0 1-4.7-4.7a1.2 1.2 0 0 0-2.4 0Z" />
    </svg>
  );
}
