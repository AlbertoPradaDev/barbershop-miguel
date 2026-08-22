"use client";

import { useRef, type ReactNode } from "react";
import { gsap, useGSAP } from "@/lib/gsap";

/*
 * Magnetic wrapper: the element leans toward the pointer while hovered and
 * settles straight back on leave, with no overshoot (strength 80/100 damped by
 * 0.35, follow with power3.out over 0.6s, release with power3.out over 0.7s
 * then clearProps). The release must not bounce. A child marked
 * data-magnetic-inner magnetizes harder for the layered pull.
 * Only active on fine pointers without reduced motion; on touch the wrapper
 * is an inert div and costs nothing.
 */
interface MagneticProps {
  children: ReactNode;
  strength?: number;
  innerStrength?: number;
  rotate?: boolean;
  className?: string;
}

export function Magnetic({
  children,
  strength = 80,
  innerStrength = 25,
  rotate = true,
  className,
}: MagneticProps) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
      if (!fine.matches || reduced.matches) return;

      const inner = el.querySelector<HTMLElement>("[data-magnetic-inner]");

      const onMove = (e: PointerEvent) => {
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        gsap.to(el, {
          x: dx * (strength / 100) * 0.35,
          y: dy * (strength / 100) * 0.35,
          rotate: rotate ? dx * 0.008 : 0,
          duration: 0.6,
          ease: "power3.out",
        });
        if (inner) {
          gsap.to(inner, {
            x: dx * (innerStrength / 100),
            y: dy * (innerStrength / 100),
            duration: 0.6,
            ease: "power3.out",
          });
        }
      };

      const onLeave = () => {
        const release = {
          x: 0,
          y: 0,
          rotate: 0,
          duration: 0.7,
          ease: "power3.out",
          clearProps: "all",
        } as const;
        gsap.to(el, { ...release });
        if (inner) gsap.to(inner, { ...release });
      };

      el.addEventListener("pointermove", onMove);
      el.addEventListener("pointerleave", onLeave);
      return () => {
        el.removeEventListener("pointermove", onMove);
        el.removeEventListener("pointerleave", onLeave);
      };
    },
    { scope: ref },
  );

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
