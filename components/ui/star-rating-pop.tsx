"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { StarRating } from "@/components/ui/star-rating";

/*
 * Opt in pop for the star row. Same markup as StarRating, plus one scroll
 * triggered flourish.
 *
 * Motion recipe: gsap.from on the five stars, scale 0.6 -> 1, stagger 0.05,
 * ease back.out(1.6), duration 0.4, ScrollTrigger "top 85%" once. Transform
 * only. Reduced motion creates no tween, so the row is simply already there.
 */
export function StarRatingPop({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      gsap.from(el.querySelectorAll("svg"), {
        scale: 0.6,
        transformOrigin: "50% 50%",
        duration: 0.4,
        stagger: 0.05,
        ease: "back.out(1.6)",
        scrollTrigger: { trigger: el, start: "top 85%", once: true },
      });
    },
    { scope: ref },
  );

  return (
    <div ref={ref} className={`inline-flex ${className}`}>
      <StarRating />
    </div>
  );
}
