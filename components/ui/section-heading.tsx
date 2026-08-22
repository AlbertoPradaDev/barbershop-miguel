import type { ReactNode } from "react";
import { MaskedText } from "@/components/ui/masked-text";

/*
 * Section opener: the h2 at display scale, with an optional intro paragraph
 * parked on the right of the same baseline. No kicker labels, no eyebrows, no
 * numbering, and no rule of any kind above it.
 *
 * Motion recipe: the h2 (and the intro, when present) reveal line by line
 * through MaskedText in scroll mode, firing once at "top 85%".
 *
 * Surface: no border, no shadow, no fill. The heading sits straight on the
 * colour band it lands in and inherits that band's tokens, so the seam between
 * two sections is carried by the change of ground alone and never by a line.
 */
interface SectionHeadingProps {
  children: ReactNode;
  /** Optional supporting paragraph, right aligned on desktop. */
  intro?: ReactNode;
  className?: string;
}

export function SectionHeading({
  children,
  intro,
  className = "",
}: SectionHeadingProps) {
  return (
    <div className={className}>
      <div className="flex items-end justify-between gap-80 max-md:flex-col max-md:items-start max-md:gap-16">
        <MaskedText
          as="h2"
          className="text-h2 max-md:text-mh2 font-medium max-w-1100"
        >
          {children}
        </MaskedText>
        {intro ? (
          <MaskedText className="themed-muted text-p1 max-md:text-mp1 max-w-520 text-right max-md:text-left">
            {intro}
          </MaskedText>
        ) : null}
      </div>
    </div>
  );
}
