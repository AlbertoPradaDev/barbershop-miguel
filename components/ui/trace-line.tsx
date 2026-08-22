"use client";

import { useRef } from "react";
import { gsap, useGSAP, TRACE } from "@/lib/gsap";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

/*
 * The site's signature scroll element: a thin clipper-cord trace that weaves
 * down the page while a barber-pole pulse travels along it (botblox-style
 * circuit routing). Authors hand it a `d` string drawn in artboard units; the
 * component only paints, it never measures the DOM.
 *
 * Motion recipe: every stroke shares one `d` and `pathLength="1"`, so dash
 * lengths read as fractions of the run. The accent pulse (dash 0.18) and its
 * soft glow ride a scrubbed stroke-dashoffset from 1 + dash down to -dash
 * across "top 90%" to "bottom 10%" of the wrapper; the bone chaser (dash 0.07)
 * covers the same distance shifted by TRACE.chaserLag, so it sits flush behind
 * the pulse and trails it by 0.07 of the path. Only an attribute changes, so
 * nothing around it lays out or repaints. Reduced motion keeps the base track
 * alone and creates no ScrollTriggers.
 */

/** One artboard px is 1/16 rem, matching the `--spacing` unit in globals.css. */
const artboardRem = (px: number) => `${px / 16}rem`;

/** Rounds away binary-float noise so dash strings stay readable in devtools. */
const gapAfter = (dash: number) => Number((1 - dash).toFixed(4));

const PULSE_DASH = `${TRACE.dash} ${gapAfter(TRACE.dash)}`;
/*
 * The chaser's dash length equals its lag on purpose: that is exactly what
 * parks it flush against the tail of the pulse instead of floating free.
 */
const CHASER_DASH = `${TRACE.chaserLag} ${gapAfter(TRACE.chaserLag)}`;

const PULSE_FROM = 1 + TRACE.dash;
const PULSE_TO = -TRACE.dash;
const CHASER_FROM = PULSE_FROM + TRACE.chaserLag;
const CHASER_TO = PULSE_TO + TRACE.chaserLag;

const SWEEP = "[data-trace-sweep]";
const CHASER = "[data-trace-chaser]";

/** Which strokes an artboard carries. Phones skip the glow and the chaser. */
type Layers = "full" | "pulse" | "base";

interface Point {
  x: number;
  y: number;
}

interface TraceSegmentProps {
  /** Desktop path, drawn on a 1920 x `height` artboard. */
  d: string;
  /**
   * Mobile path on a 390 x `heightMobile ?? height` artboard. Omit it and the
   * trace simply does not render on phones.
   */
  dMobile?: string;
  /** Desktop artboard height, in design px. */
  height: number;
  /** Mobile artboard height, in design px. Defaults to `height`. */
  heightMobile?: number;
  /** Which edge of the positioned parent the segment hangs from. */
  anchor?: "top" | "bottom";
  /** Cap the run with a filled connector dot. Needs `plugAt` to know where. */
  plug?: boolean;
  /** End coordinates of `d`, in desktop artboard units. */
  plugAt?: Point;
  /** End coordinates of `dMobile`, in mobile artboard units. Falls back to `plugAt`. */
  plugAtMobile?: Point;
  className?: string;
}

export function TraceSegment({
  d,
  dMobile,
  height,
  heightMobile,
  anchor = "top",
  plug = false,
  plugAt,
  plugAtMobile,
  className = "",
}: TraceSegmentProps) {
  const wrap = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useGSAP(
    () => {
      if (reduced) return;

      /* A fresh config per tween: two ScrollTriggers must never share one vars object. */
      const range = () => ({
        trigger: wrap.current,
        start: "top 90%",
        end: "bottom 10%",
        scrub: true,
      });

      gsap.fromTo(
        SWEEP,
        { attr: { "stroke-dashoffset": PULSE_FROM } },
        {
          attr: { "stroke-dashoffset": PULSE_TO },
          ease: "none",
          scrollTrigger: range(),
        },
      );

      gsap.fromTo(
        CHASER,
        { attr: { "stroke-dashoffset": CHASER_FROM } },
        {
          attr: { "stroke-dashoffset": CHASER_TO },
          ease: "none",
          scrollTrigger: range(),
        },
      );
    },
    { scope: wrap, dependencies: [reduced, d, dMobile] },
  );

  const mobileHeight = heightMobile ?? height;
  const mobilePlugAt = plugAtMobile ?? plugAt;

  return (
    <div
      ref={wrap}
      aria-hidden
      className={[
        "pointer-events-none absolute inset-x-0 z-0",
        anchor === "bottom" ? "bottom-0" : "top-0",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <svg
        viewBox={`0 0 1920 ${height}`}
        preserveAspectRatio="none"
        style={{ height: artboardRem(height) }}
        className="block w-full max-md:hidden"
      >
        <TracePaths d={d} layers={reduced ? "base" : "full"} />
        {plug && plugAt ? <Plug at={plugAt} /> : null}
      </svg>

      {dMobile ? (
        <svg
          viewBox={`0 0 390 ${mobileHeight}`}
          preserveAspectRatio="none"
          style={{ height: artboardRem(mobileHeight) }}
          className="hidden w-full max-md:block"
        >
          <TracePaths d={dMobile} layers={reduced ? "base" : "pulse"} />
          {plug && mobilePlugAt ? <Plug at={mobilePlugAt} /> : null}
        </svg>
      ) : null}
    </div>
  );
}

function TracePaths({ d, layers }: { d: string; layers: Layers }) {
  return (
    <>
      <path
        d={d}
        pathLength={1}
        fill="none"
        vectorEffect="none"
        stroke="var(--page-line)"
        strokeWidth={1.5}
      />

      {layers === "full" ? (
        <path
          data-trace-sweep
          d={d}
          pathLength={1}
          fill="none"
          vectorEffect="none"
          stroke="var(--page-accent)"
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={PULSE_DASH}
          strokeDashoffset={PULSE_FROM}
          opacity={0.22}
        />
      ) : null}

      {layers !== "base" ? (
        <path
          data-trace-sweep
          d={d}
          pathLength={1}
          fill="none"
          vectorEffect="none"
          stroke="var(--page-accent)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeDasharray={PULSE_DASH}
          strokeDashoffset={PULSE_FROM}
        />
      ) : null}

      {layers === "full" ? (
        <path
          data-trace-chaser
          d={d}
          pathLength={1}
          fill="none"
          vectorEffect="none"
          stroke="var(--page-text)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeDasharray={CHASER_DASH}
          strokeDashoffset={CHASER_FROM}
          opacity={0.85}
        />
      ) : null}
    </>
  );
}

function Plug({ at }: { at: Point }) {
  return <circle cx={at.x} cy={at.y} r={6} fill="var(--page-accent)" />;
}
