import type { ReactNode } from "react";
import Link from "next/link";

/*
 * The site's CTA button, in two registers.
 *
 *   primary   ("solid") a solid accent capsule with no outline and no shadow.
 *             On hover a circle scales 0 -> 1.5 from the center over 1s on
 *             ease-osmo, flooding the button while the label rides the same
 *             curve over 1.2s. The release is deliberately faster (450ms /
 *             400ms, ease-out) so it never lags.
 *
 *   secondary ("outline" / "draw") no box at all: the label alone, with the
 *             same underline the nav links use (.underline-link, a 1px rule
 *             that wipes in from the left over 0.6s ease-osmo and retracts to
 *             the right on leave). Both names map here so existing call sites
 *             keep compiling; there is one secondary look, not three.
 *
 * Every hover state is mirrored under :active so touch gets the same feedback,
 * and under :focus-visible so the keyboard does too. motion-reduce kills the
 * transitions and snaps straight to the end state. No icons of any kind
 * (arrows are banned site wide) and no bounce anywhere.
 */

type PillVariant = "solid" | "outline" | "draw";

interface PillButtonProps {
  children: ReactNode;
  variant?: PillVariant;
  /** Renders an <a>. Omit and pass onClick to render a <button>. */
  href?: string;
  /** Forces the target/rel treatment; http(s) links are detected automatically. */
  external?: boolean;
  onClick?: () => void;
  ariaLabel?: string;
  className?: string;
}

/* Fully round ends. The primary carries no outline at all: it is a solid accent
   capsule, and the flood is the only thing that changes on hover. */
const RADIUS = "rounded-full";

const LABEL = "text-p2 max-md:text-mp2 font-medium uppercase tracking-[0.08em] whitespace-nowrap";

const PRIMARY_BOX = [
  "group relative inline-flex cursor-pointer items-center justify-center overflow-hidden",
  RADIUS,
  "bg-accent text-bone",
  "px-32 py-16 max-md:px-28 max-md:py-14",
  LABEL,
  /* Slow, luxurious fill in; quick release out. */
  "transition-colors duration-400 ease-out",
  "hover:text-page-bg hover:duration-1200 hover:ease-osmo",
  "active:text-page-bg active:duration-1200 active:ease-osmo",
  "focus-visible:text-page-bg focus-visible:duration-1200 focus-visible:ease-osmo",
  "motion-reduce:transition-none",
].join(" ");

/* Circle floods the button from the center. w-130% + scale 1.5 clears the
   capsule's ends comfortably (the diagonal never exceeds 1.95x the width). */
const CIRCLE = [
  "pointer-events-none absolute top-1/2 left-1/2 aspect-square w-[130%] rounded-full bg-page-text",
  "-translate-x-1/2 -translate-y-1/2 scale-0",
  "transition-transform duration-450 ease-out",
  "group-hover:scale-150 group-hover:duration-1000 group-hover:ease-osmo",
  "group-active:scale-150 group-active:duration-1000 group-active:ease-osmo",
  "group-focus-visible:scale-150 group-focus-visible:duration-1000 group-focus-visible:ease-osmo",
  "motion-reduce:transition-none",
].join(" ");

/* Secondary is a text action, so it carries no padding box of its own: the
   underline must sit tight under the label the way it does in the nav. */
const SECONDARY = [
  "underline-link inline-flex cursor-pointer items-center",
  LABEL,
  "text-page-text transition-colors duration-400 ease-out",
  "hover:text-accent active:text-accent focus-visible:text-accent",
  "motion-reduce:transition-none",
].join(" ");

export function PillButton({
  children,
  variant = "outline",
  href,
  external,
  onClick,
  ariaLabel,
  className = "",
}: PillButtonProps) {
  const isPrimary = variant === "solid";
  const classes = [isPrimary ? PRIMARY_BOX : SECONDARY, className].join(" ");

  const inner = (
    <>
      {isPrimary && <span aria-hidden className={CIRCLE} />}
      {/* Uppercase tracking adds a trailing 0.08em after the last letter, which
          drags the run visually left inside a centered box. Cancelling it on the
          right optically centers the label. */}
      <span className="relative z-10 -mr-[0.08em]">{children}</span>
    </>
  );

  if (href) {
    const isExternal = external ?? /^https?:\/\//i.test(href);
    if (isExternal) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={ariaLabel}
          className={classes}
        >
          {inner}
        </a>
      );
    }
    // Hash anchors, tel: and mailto: stay plain anchors so Lenis and the dialer
    // handle them; real route paths go through next/link for prefetching.
    if (href.startsWith("/")) {
      return (
        <Link href={href} aria-label={ariaLabel} className={classes}>
          {inner}
        </Link>
      );
    }
    return (
      <a href={href} aria-label={ariaLabel} className={classes}>
        {inner}
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={classes}
    >
      {inner}
    </button>
  );
}
