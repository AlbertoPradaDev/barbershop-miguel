"use client";

/*
 * Single GSAP registration point. Every animated component imports gsap and
 * plugins from here, never from "gsap" directly, so registration happens once
 * and the motion vocabulary stays consistent across the site.
 */
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText);

/* The site's motion vocabulary (from the Moyra study, kept exact). */
export const EASE_OSMO = "cubic-bezier(0.625, 0.05, 0, 1)"; // button fills
export const EASE_THEME = "cubic-bezier(0.19, 1, 0.22, 1)"; // theme crossfade

/* Line reveal recipe. */
export const REVEAL = {
  duration: 1,
  stagger: 0.07,
  ease: "expo.out",
  introDelay: 0.32,
} as const;

/* Scroll-out recipe: sections fade and lift as they leave the viewport. */
export const EXIT = {
  opacity: 0.15,
  y: -40,
  start: "bottom 45%",
  end: "bottom 5%",
} as const;

/* Drawn-line recipe: stroke dash sweep plus the chaser dot trailing behind. */
export const TRACE = { dash: 0.18, chaserLag: 0.07 } as const;

export { gsap, useGSAP, ScrollTrigger, SplitText };
