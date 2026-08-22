"use client";

import { useRef } from "react";
import { gsap, useGSAP, EXIT } from "@/lib/gsap";
import { SectionHeading } from "@/components/ui/section-heading";
import { AccordionItem } from "@/components/ui/accordion";
import { TraceSegment } from "@/components/ui/trace-line";
import { faqs } from "@/lib/content/faq";
import { JsonLd, faqJsonLd } from "@/lib/seo";

/*
 * FAQ block. A narrow heading rail on the left, the accordion stack on the
 * right, and the FAQPage structured data emitted from the very same `faqs`
 * array that renders the questions, so the markup can never drift from the
 * copy. Several answers may sit open at once: each AccordionItem owns its own
 * state, nothing coordinates them.
 *
 * Motion recipe:
 *   enter  items  gsap.from opacity 0, y 30, duration 0.8, stagger 0.07,
 *                 expo.out, ScrollTrigger trigger=list start "top 78%" once
 *          rail   MaskedText line reveal, owned by SectionHeading
 *   exit   one scrubbed timeline over EXIT.start -> EXIT.end on the section:
 *          the list runs at position 0 and the heading rail at HEAD_LAG, so
 *          the questions leave first and the rail peels away behind them.
 *   trace  right-rail run down x 1800, handed to Contact at the same x. The
 *          list and the rail are .trace-occlude (opaque page bg) so the cord
 *          passes behind them instead of across the copy.
 *   open   the question slides 8px right and the plus mark turns accent while
 *          it rotates; both are CSS off aria-expanded, so pointer and touch
 *          behave identically and AccordionItem stays untouched.
 * Reduced motion sets the resting state and creates no ScrollTriggers.
 *
 * Surface: no card here on purpose. The stack is rules on the page, not a box,
 * so the rule above the first question and the separators between the answers
 * stay 1px themed hairlines rather than taking the 2px card outline, and there
 * is no radius, no fill and no shadow on the block at all.
 */

const HEADING = "Questions";

/* Right rail: straight down x 1800, overshooting both artboard edges so the
 * neighbouring segments join without a seam. Contact picks it up at 1800. */
const TRACE_D = "M 1800 -40 V 869";
const TRACE_D_MOBILE = "M 24 -40 V 743";

const ITEM = "[data-faq-item]";

/* Rail offset inside the scrubbed exit timeline: the list is already lifting
 * while the heading is still holding, which reads as the section peeling. */
const HEAD_LAG = 0.1;

/*
 * Open-state emphasis. AccordionItem is a shared primitive and is not edited
 * here: the open state is read straight off the button's `aria-expanded` from
 * this wrapper, so the FAQ adds its own accent without forking the component.
 * The plus already rotates 45deg inside the primitive and keeps doing so; the
 * transition is restated at this specificity because the arbitrary variant
 * outranks the primitive's own duration and easing.
 */
const ITEM_OPEN = [
  /* Question label: eased 8px slide to the right while the answer is open. */
  "[&_button>span:first-child]:transition-transform",
  "[&_button>span:first-child]:duration-700",
  "[&_button>span:first-child]:ease-osmo",
  "[&_button[aria-expanded=true]>span:first-child]:translate-x-8",
  "motion-reduce:[&_button>span:first-child]:transition-none",
  /* Plus mark: accent while open, colour riding the same 400ms as the turn. */
  "[&_button>span[aria-hidden]]:transition",
  "[&_button>span[aria-hidden]]:duration-400",
  "[&_button>span[aria-hidden]]:ease-out",
  "[&_button[aria-expanded=true]>span[aria-hidden]]:text-accent",
  "motion-reduce:[&_button>span[aria-hidden]]:transition-none",
].join(" ");

export function Faq() {
  const root = useRef<HTMLElement | null>(null);
  const rail = useRef<HTMLDivElement | null>(null);
  const list = useRef<HTMLDivElement | null>(null);

  useGSAP(
    () => {
      const section = root.current;
      const head = rail.current;
      const stack = list.current;
      if (!section || !head || !stack) return;

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        gsap.set(ITEM, { opacity: 1, y: 0 });
        return;
      }

      gsap.from(ITEM, {
        opacity: 0,
        y: 30,
        duration: 0.8,
        stagger: 0.07,
        ease: "expo.out",
        scrollTrigger: { trigger: stack, start: "top 78%", once: true },
      });

      /* One timeline, two offsets: the whole block leaves, the rail last. */
      const exit = gsap.timeline({
        defaults: { duration: 1, ease: "none", immediateRender: false },
        scrollTrigger: {
          trigger: section,
          start: EXIT.start,
          end: EXIT.end,
          scrub: true,
        },
      });

      exit
        .to(stack, { opacity: EXIT.opacity, y: EXIT.y }, 0)
        .to(head, { opacity: EXIT.opacity, y: EXIT.y }, HEAD_LAG);
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      id="faq"
      className="relative px-64 py-140 max-md:px-20 max-md:py-90"
    >
      <TraceSegment
        d={TRACE_D}
        dMobile={TRACE_D_MOBILE}
        height={829}
        heightMobile={703}
        anchor="top"
      />

      <div className="relative z-10">
        <div className="grid grid-cols-[26.25rem_1fr] gap-64 max-md:grid-cols-1 max-md:gap-40">
          <div ref={rail} className="trace-occlude self-start">
            <SectionHeading>{HEADING}</SectionHeading>
          </div>

          <div ref={list} className="trace-occlude themed-border border-t">
            {faqs.map((faq) => (
              <div key={faq.q} data-faq-item className={ITEM_OPEN}>
                <AccordionItem question={faq.q}>
                  <p className="text-p2 max-md:text-mp2">{faq.a}</p>
                </AccordionItem>
              </div>
            ))}
          </div>
        </div>

        <JsonLd data={faqJsonLd(faqs)} />
      </div>
    </section>
  );
}
