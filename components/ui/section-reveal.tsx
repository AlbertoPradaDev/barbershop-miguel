"use client";

import { useRef, type ElementType, type ReactNode } from "react";
import { gsap, useGSAP, EXIT } from "@/lib/gsap";

/*
 * The standard section enter + exit wrapper. Every block on the page uses it
 * so the whole site breathes on one rhythm.
 *
 * Motion recipe (all on the inner element, transform + opacity only):
 *   enter  gsap.from opacity 0, y 46, duration 1, expo.out,
 *          ScrollTrigger trigger=wrapper start "top 80%" once
 *   exit   gsap.to opacity EXIT.opacity, y EXIT.y, ease "none",
 *          ScrollTrigger trigger=wrapper start EXIT.start end EXIT.end scrub
 * The exit tween is immediateRender:false on purpose: it must read its start
 * values only once the section has already entered, otherwise it would record
 * the entrance's hidden state and fade from 0 to 0.15.
 * Reduced motion creates no tweens at all, so the content is simply visible.
 */
interface SectionRevealProps {
  children: ReactNode;
  className?: string;
  /** Seconds added to the enter tween once its trigger fires. */
  enterDelay?: number;
  /** Keeps the section fully opaque as it leaves (footer, sticky blocks). */
  disableExit?: boolean;
  /** Element type of the outer wrapper. */
  as?: ElementType;
}

export function SectionReveal({
  children,
  className,
  enterDelay = 0,
  disableExit = false,
  as: Tag = "div",
}: SectionRevealProps) {
  const wrapper = useRef<HTMLElement | null>(null);
  const inner = useRef<HTMLDivElement | null>(null);

  useGSAP(
    () => {
      const trigger = wrapper.current;
      const target = inner.current;
      if (!trigger || !target) return;

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      gsap.from(target, {
        opacity: 0,
        y: 46,
        duration: 1,
        ease: "expo.out",
        delay: enterDelay,
        scrollTrigger: { trigger, start: "top 80%", once: true },
      });

      if (disableExit) return;

      gsap.to(target, {
        opacity: EXIT.opacity,
        y: EXIT.y,
        ease: "none",
        immediateRender: false,
        scrollTrigger: {
          trigger,
          start: EXIT.start,
          end: EXIT.end,
          scrub: true,
        },
      });
    },
    { scope: wrapper, dependencies: [enterDelay, disableExit] },
  );

  return (
    <Tag ref={wrapper as never} className={className}>
      <div ref={inner}>{children}</div>
    </Tag>
  );
}
