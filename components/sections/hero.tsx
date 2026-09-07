"use client";

import { useRef } from "react";
import Image from "next/image";
import { gsap, useGSAP } from "@/lib/gsap";
import { SITE } from "@/lib/content/site";
import { miguelAtWork } from "@/lib/content/photos";
import { PillButton } from "@/components/ui/pill-button";

/*
 * Hero: a full bleed photograph of the barber at work with a single white plate
 * centred on it carrying the shop name and the two things a visitor came to do
 * (book the chair, try a haircut), and two lines of standing detail along the
 * bottom edge.
 *
 * Ported from the Awwwards card awwwards/hero/10. This section is the SECOND
 * half of one animation whose first half lives in
 * components/layout/opening-sequence.tsx, and the join is unusual enough to
 * spell out: the sequence owns the timeline for BOTH halves and reaches in here
 * to drive this section's clip-path and the plate. That is deliberate. The
 * reveal is one continuous move (the lockup tears along the middle, the two
 * halves part like doors, and this section opens through the gap between them),
 * and splitting a single timeline across two components' effects would mean
 * synchronising them frame by frame for no gain.
 *
 * So the hooks below are a contract with that file: [data-hero-container],
 * [data-hero-card] and [data-hero-card-title]. This component handles only the
 * case where the sequence never runs, by leaving everything at rest.
 *
 * NOTHING here is clipped in CSS. A clip written into the stylesheet would
 * leave the hero invisible for anyone whose sequence is skipped (reduced
 * motion, or already seen this session), so the sequence applies its own
 * starting state in JS at the moment it takes ownership, and only then.
 */

/*
 * Left is where the shop is. Right is the barber's own three words, from his
 * Booksy "About us": focused on "precision, comfort, and customer care". The
 * card's own footer read "Scroll Down", which is a scroll indicator and banned
 * outright by hard ban 3, and "Made by Codegrid", which is the tutorial's own
 * credit and not ours to carry.
 */
const STANDING_LEFT = "Raleigh, North Carolina";
const STANDING_RIGHT = "Precision, comfort, care";

export function Hero() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      /*
       * Hand the deferred copy back from the anti-flash style. This runs
       * whether or not the sequence plays, because if it never plays then
       * nothing else will ever make this text visible.
       */
      gsap.set("[data-masked]", { visibility: "visible" });
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      data-hero-container
      className="relative h-[100svh] w-full overflow-hidden"
    >
      <div className="absolute inset-0">
        <Image
          src={miguelAtWork.src}
          alt={miguelAtWork.alt}
          fill
          priority
          sizes="100vw"
          className="object-cover object-[50%_30%]"
        />
        {/* The plate and the standing lines sit on photography, so the frame
            needs a floor under them rather than luck with the exposure. */}
        <div
          aria-hidden
          className="absolute inset-0 bg-linear-to-t from-ink/70 via-ink/25 to-ink/40"
        />
      </div>

      {/*
        The plate: 30% by 70% as measured on the card, a portrait letterbox on
        desktop. On phones it takes 75% of the width, or the name cannot be set
        inside it.
      */}
      {/*
        The hero sits in the dark band, so inside the white plate the tokens
        must flip back: without data-scheme="light" the outline action's label
        (token text) renders white on white and simply vanishes.
      */}
      <div
        data-hero-card
        data-scheme="light"
        className="absolute top-1/2 left-1/2 flex h-[70%] w-[30%] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-32 bg-bone text-ink max-md:h-[62%] max-md:w-[75%] max-md:gap-24"
      >
        <h1
          data-masked
          data-hero-card-title
          className="text-h2 max-md:text-mh2 px-24 text-center font-semibold uppercase"
        >
          {SITE.shortName}
        </h1>
        {/*
          The two actions, on the plate itself so they are the first thing read
          after the name. Booking is the site's one outbound push (Booksy); the
          simulator is the in-house one. Static, not masked: the sequence reveals
          the plate as a whole, and if it never runs they must simply be there.
        */}
        <div
          data-hero-actions
          className="flex flex-wrap items-center justify-center gap-16 px-16 max-md:flex-col max-md:gap-12"
        >
          <PillButton variant="solid" href={SITE.bookingUrl} external>
            Book now
          </PillButton>
          <PillButton variant="outline" href="/simulator">
            Try a haircut
          </PillButton>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-10 flex items-end justify-between px-64 py-48 pr-144 max-md:flex-col max-md:items-start max-md:gap-8 max-md:px-20 max-md:py-28 max-md:pr-96">
        <p data-masked className="text-p2 max-md:text-mp2 font-medium">
          {STANDING_LEFT}
        </p>
        <p data-masked className="text-p2 max-md:text-mp2 font-medium">
          {STANDING_RIGHT}
        </p>
      </div>
    </section>
  );
}
