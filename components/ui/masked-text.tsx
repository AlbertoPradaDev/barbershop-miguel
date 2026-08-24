"use client";

import { useRef, type ElementType, type ReactNode } from "react";
import { gsap, useGSAP, SplitText, REVEAL } from "@/lib/gsap";

/*
 * Line-masked text reveal. The text is real children in the server HTML (SEO
 * safe); SplitText wraps each line in an overflow mask and the lines rise in
 * with the exact Moyra recipe: yPercent 100 -> 0, duration 1, stagger 0.07,
 * expo.out. "mount" plays once after REVEAL.introDelay (hero), "scroll" fires
 * at top 85% once. `[data-masked]{visibility:hidden}` (injected by the head
 * script in layout.tsx) keeps the copy hidden until the tween takes over, so
 * there is no flash between first paint and hydration. Reduced motion skips
 * the split entirely and only flips visibility back on.
 *
 * ACCESSIBILITY: `aria: "none"`, and nothing else. That took three attempts and
 * the reasoning is worth keeping, because the two wrong answers both looked
 * right.
 *
 * SplitText's default is to put aria-label on the element it splits and hide
 * the fragments. That exists for CHARACTER splits, where a screen reader would
 * otherwise spell a word out letter by letter. This component only ever splits
 * LINES, which read perfectly well as nested elements, so the label buys
 * nothing here — and aria-label is PROHIBITED on <p>, which is what this
 * renders by default, so axe reported seven violations of it.
 *
 * Attempt two was to aria-hide the split element and restate the text in a
 * hidden sibling. That was worse: this component renders the section <h2>s and
 * <h3>s, so hiding them removed every heading from the accessibility tree and
 * the document outline collapsed to an <h1> followed by orphaned <h3>s. One
 * violation traded for another.
 *
 * Attempt three moved the restated copy inside the element. The outline came
 * back and axe went quiet, but every heading then contained its own text twice
 * ("ServicesServices"): duplicated for a crawler, and duplicated for anyone
 * selecting and copying it.
 *
 * So: turn the label off and change nothing else. The element keeps its
 * semantics, its text appears exactly once, and the lines are read in order.
 */
interface MaskedTextProps {
  children: ReactNode;
  as?: ElementType;
  /** "mount" plays after the intro delay; "scroll" fires at top 85%, once. */
  mode?: "mount" | "scroll";
  /** Extra delay in seconds, added on top of the intro delay (mount mode). */
  delay?: number;
  className?: string;
}

export function MaskedText({
  children,
  as: Tag = "p",
  mode = "scroll",
  delay = 0,
  className,
}: MaskedTextProps) {
  const ref = useRef<HTMLElement | null>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        gsap.set(el, { visibility: "visible" });
        return;
      }

      const split = SplitText.create(el, {
        type: "lines",
        mask: "lines",
        autoSplit: true,
        /* See the note above: the label is for character splits, and it is not
           permitted on the elements this renders. */
        aria: "none",
        linesClass: "masked-line",
        onSplit(self) {
          gsap.set(el, { visibility: "visible" });
          const vars = {
            yPercent: 100,
            duration: REVEAL.duration,
            stagger: REVEAL.stagger,
            ease: REVEAL.ease,
          };
          if (mode === "mount") {
            return gsap.from(self.lines, {
              ...vars,
              delay: REVEAL.introDelay + delay,
            });
          }
          return gsap.from(self.lines, {
            ...vars,
            scrollTrigger: { trigger: el, start: "top 85%", once: true },
          });
        },
      });

      return () => split.revert();
    },
    { scope: ref },
  );

  return (
    <Tag ref={ref as never} data-masked className={className}>
      {children}
    </Tag>
  );
}
