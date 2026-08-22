"use client";

import { useId, useState, type ReactNode } from "react";

/*
 * FAQ accordion item. Open/close animates grid-template-rows from 0fr to 1fr
 * over 0.7s on ease-osmo (height animation with no measured pixels, so it
 * never fights reflow); the hover is the albertopradadev.com field animation:
 * a bg-panel background rises from the bottom over the same 0.7s while the
 * content slides gently to the right. The plus mark rotates 45deg into a
 * close mark. Button carries aria-expanded plus aria-controls on the panel.
 *
 * Surface: the row rule stays a 1px themed hairline on purpose. It is a list
 * separator inside the FAQ panel, not a card outline, so it is one of the few
 * places the thin line survives the 2px outline register. No shadow anywhere;
 * the only fill is the receding bg-panel that rises on hover.
 */
export function AccordionItem({
  question,
  children,
}: {
  question: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <div className="group/field relative isolate themed-border border-b">
      {/* Rising hover fill, exactly like the original portfolio's fields. */}
      <span
        aria-hidden
        className="absolute bottom-0 left-0 -z-10 h-0 w-full bg-panel transition-all duration-700 ease-osmo group-hover/field:h-full"
      />
      <div className="transition-[padding] duration-700 ease-osmo group-hover/field:px-30 max-md:group-hover/field:px-0">
        <h3 className="text-h4 max-md:text-mh3 font-medium">
          <button
            type="button"
            aria-expanded={open}
            aria-controls={`${id}-panel`}
            onClick={() => setOpen((v) => !v)}
            className="flex w-full cursor-pointer items-center justify-between gap-24 py-32 max-md:py-24 text-left"
          >
            <span>{question}</span>
            <span
              aria-hidden
              className={`relative size-20 flex-none transition-transform duration-400 ease-out ${open ? "rotate-45" : ""}`}
            >
              <span className="absolute left-0 top-1/2 h-2 w-full -translate-y-1/2 bg-current" />
              <span className="absolute left-1/2 top-0 h-full w-2 -translate-x-1/2 bg-current" />
            </span>
          </button>
        </h3>
        <div
          id={`${id}-panel`}
          role="region"
          aria-label={question}
          className="grid transition-[grid-template-rows] duration-700 ease-osmo"
          style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
        >
          <div className="overflow-hidden">
            <div className="themed-muted pb-32 max-md:pb-24 text-p1 max-md:text-mp1 max-w-820">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
