"use client";

import { useRef } from "react";
import { gsap, useGSAP, EXIT } from "@/lib/gsap";
import { SectionHeading } from "@/components/ui/section-heading";
import { PillButton } from "@/components/ui/pill-button";
import { TraceSegment } from "@/components/ui/trace-line";
import { SITE } from "@/lib/content/site";

/*
 * Contact: a half and half band. One half stacks everything there is to read
 * (the heading, the tappable phone and email, the opening hours and the
 * booking card), the other is a real interactive OpenStreetMap embed stretched
 * to the full height of its column, so the two halves weigh the same and the
 * map reads as a tall plate rather than a letterbox. The written address is
 * gone: the map is the address now, with a directions link under it so a touch
 * visitor is never stuck inside the iframe. On phones the halves fall into one
 * column and the map follows the text.
 *
 * Typography: the site is set in one family. The hours and the booking note
 * used to be mono, which is exactly the typewriter look the client banned;
 * their functional register is carried now by size, medium weight, a little
 * tracking and themed-muted, with tabular numerals holding the times in line.
 *
 * Motion recipe (transform + opacity, plus one clip-path on the map):
 *   text     gsap.from y 40, opacity 0, 0.9s expo.out, trigger "top 78%" once,
 *            with the hours rows staggering 0.06 inside the same timeline.
 *   card     the same from, delayed 0.15s off its own "top 78%" trigger.
 *   map      one timeline at "top 85%": the block rises 40 while the figure
 *            wipes open on clip-path inset(8% round 1.5rem) -> inset(0% round
 *            1.5rem) over 1s expo.out (the radius rides along so the corners
 *            never square off mid tween), then the directions link rises 16
 *            behind it.
 *   exit     the standard EXIT scrub (opacity 0.15, y -40) on the inner wrapper.
 * Rows lift onto a bg-panel field on hover, gated to fine pointers in CSS.
 * Reduced motion creates no tweens and no triggers at all: every block is
 * already in its resting state.
 *
 * The old pulsing accent marker is gone. OSM draws its own pin at the exact
 * bbox centre, which is where that overlay sat, so it read as two markers on
 * one spot rather than as an accent.
 *
 * Surface: the booking panel is a card (20px radius) with a 2px outline, the
 * map is a media plate (24px) with none, because images carry no border. No
 * shadow anywhere. The hours are a list, not a card, so their separators stay
 * 1px hairlines, and the only fill left in the section is the bg-panel hover
 * field, which is meant to recede.
 */

const BOOKING_LINE =
  "The calendar is open 24 hours a day on Booksy. Pick a slot and the chair is yours.";
const BOOKING_NOTE = "Booking opens in a new tab";
const MAP_TITLE = "Map of the shop location";
const DIRECTIONS_LABEL = "Get directions";

/* tel: needs digits and the country plus, never the display formatting.
   Null while the client still owes us a real number. */
const TEL_HREF = SITE.phone ? `tel:${SITE.phone.replace(/[^\d+]/g, "")}` : null;

/*
 * OSM's embed wants bbox as min lng, min lat, max lng, max lat. A 0.012 x 0.006
 * degree window is about a four block view around the shop, which is the scale
 * where street names stay readable. OSM fits that window to whatever aspect the
 * plate has, so the taller half column simply shows more sky and more ground
 * around the same four blocks.
 */
const { lat, lng } = SITE.geo;
const BBOX = [lng - 0.006, lat - 0.003, lng + 0.006, lat + 0.003]
  .map((degrees) => degrees.toFixed(4))
  .join("%2C");
const MAP_SRC = `https://www.openstreetmap.org/export/embed.html?bbox=${BBOX}&layer=mapnik&marker=${lat}%2C${lng}`;

/* Opens the visitor's own maps app on a phone, the web planner on a desktop. */
const DIRECTIONS_HREF = `https://www.google.com/maps/dir/?api=1&destination=${lat}%2C${lng}`;

const LINK = "underline-link is-drawn w-fit text-p1 max-md:text-mp1";

/*
 * The booking card's outline: 2px in line-strong, no shadow. themed-border is
 * deliberately absent, since its hairline colour would outrank
 * border-line-strong and quietly undo the chunky outline. Nothing transitions:
 * a band's scheme is fixed for the life of the page.
 */
const OUTLINE = "border-2 border-line-strong";

/* The hover field: a panel that fades in just outside the row's text box. */
const ROW_FIELD = [
  "pointer-events-none absolute -inset-x-12 inset-y-0 rounded-btn bg-panel",
  "opacity-0 transition-opacity duration-500 ease-osmo",
  "pointer-fine:group-hover:opacity-100",
  "motion-reduce:transition-none",
].join(" ");

/* Applied to the single permitted <div> inside the <dl>, so it carries both the
   row's positioning context and the flex line. */
const ROW_LINE = [
  "relative flex items-baseline justify-between gap-24 py-14",
  "transition-transform duration-500 ease-osmo",
  "pointer-fine:group-hover:-translate-y-2",
  "motion-reduce:transition-none",
].join(" ");

const MAP_FIGURE = [
  /* trace-occlude paints an opaque page-bg plate so the cord passes behind. */
  "trace-occlude relative overflow-hidden rounded-media",
  /*
   * Desktop: no aspect ratio at all. The plate is a flex child that takes every
   * pixel the directions link leaves in its half, so its height is set by the
   * text half opposite and the two columns end level. min-h keeps it a plate
   * rather than a slot on the short viewports where the text half collapses.
   */
  "flex-1 min-h-560",
  /* Phones stack, so there is no column to match: back to a picture shape. */
  "max-md:flex-none max-md:min-h-0 max-md:aspect-[4/3]",
  /* Media plate: 24px radius and nothing else. Images carry no outline, so the
     tiles meet the page directly. The GSAP wipe tweens clip-path at the
     matching 1.5rem, so nothing squares off mid tween. */
].join(" ");

/*
 * Black and white, not half desaturated. OSM's raster tiles ship their own
 * green, beige and blue palette, and the old saturate(0.35) left enough of it
 * to read as a washed out colour map next to a page whose only colour is the
 * accent. grayscale(1) takes the hue out completely and the contrast lift puts
 * back the separation that the colour was doing: road casings, water and park
 * fill all land on the same grey ramp otherwise, and the street names sit on
 * top of it.
 *
 * scheme-dark: still inverts, because a white map is a hole in a black band.
 * Inverting a monochrome image cannot shift hue, so the old hue-rotate and
 * saturate pair is gone; the contrast comes back down a little because
 * inversion already hardens the tile ink.
 */
const MAP_FRAME = [
  "absolute inset-0 h-full w-full border-0",
  "[filter:grayscale(1)_contrast(1.12)]",
  "scheme-dark:[filter:grayscale(1)_invert(0.92)_contrast(0.92)]",
].join(" ");

export function Contact() {
  const section = useRef<HTMLElement | null>(null);
  const inner = useRef<HTMLDivElement | null>(null);
  const left = useRef<HTMLDivElement | null>(null);
  const right = useRef<HTMLDivElement | null>(null);
  const mapBlock = useRef<HTMLDivElement | null>(null);
  const map = useRef<HTMLElement | null>(null);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      const column = left.current;
      const panel = right.current;
      const block = mapBlock.current;
      const figure = map.current;
      const body = inner.current;
      if (!column || !panel || !block || !figure || !body) return;

      const enter = { y: 40, opacity: 0, ease: "expo.out" } as const;

      /* Left column rises, then its hours rows cascade in behind it. */
      gsap
        .timeline({
          scrollTrigger: { trigger: column, start: "top 78%", once: true },
        })
        .from(column, { ...enter, duration: 0.9 })
        .from(
          "[data-hours-row]",
          { y: 20, opacity: 0, duration: 0.7, ease: "expo.out", stagger: 0.06 },
          "-=0.55",
        );

      gsap.from(panel, {
        ...enter,
        duration: 0.9,
        delay: 0.15,
        scrollTrigger: { trigger: panel, start: "top 78%", once: true },
      });

      /* Map block: rise and wipe together, directions link trailing behind. */
      gsap
        .timeline({
          scrollTrigger: { trigger: block, start: "top 85%", once: true },
        })
        .from(block, { ...enter, duration: 0.9 })
        .fromTo(
          figure,
          { clipPath: "inset(8% round 1.5rem)" },
          { clipPath: "inset(0% round 1.5rem)", duration: 1, ease: "expo.out" },
          0,
        )
        .from(
          "[data-map-link]",
          { y: 16, opacity: 0, duration: 0.7, ease: "expo.out" },
          "-=0.6",
        );

      gsap.to(body, {
        opacity: EXIT.opacity,
        y: EXIT.y,
        ease: "none",
        immediateRender: false,
        scrollTrigger: {
          trigger: section.current,
          start: EXIT.start,
          end: EXIT.end,
          scrub: true,
        },
      });
    },
    { scope: section },
  );

  return (
    <section id="contact" ref={section} className="relative">
      {/*
        Re-measured in the browser at 1440 after the half and half split, in
        artboard px off the top of the section: the band is now 983 tall (it was
        about 1500 while the map was a full width letterbox), the map plate runs
        992..1856 across and 140..789 down, and the directions link under it ends
        at 843. So the run comes down the right at 1800 as it did before, passes
        behind the plate (trace-occlude), re-emerges in the 73px below it, turns
        on the same 28px corner at 862 and sweeps left at 890, clear of the link
        and of the booking card, to park the plug at 960: dead centre of the
        column gutter, 93 above the foot of the band. The cord is desktop only,
        so this segment carries no mobile path and no mobile plug.
        Previous values: height 640, V 548, turn 576, plug 960/576.
      */}
      <TraceSegment
        d="M 1800 -40 V 862 Q 1800 890 1772 890 H 960"
        height={980}
        anchor="top"
        plug
        plugAt={{ x: 960, y: 890 }}
      />

      <div
        ref={inner}
        className="relative z-10 px-64 py-140 max-md:px-20 max-md:py-90"
      >
        {/*
          Half and half: everything you read in one column, the map plate in
          the other. Both halves are grid items, so they are the same height by
          default and the map simply takes whatever the text half sets. Phones
          drop to one column and the map lands after the text.
        */}
        <div className="grid grid-cols-2 gap-64 max-md:grid-cols-1 max-md:gap-56">
          {/*
            The reading half. A flex column rather than a stack of margins, so
            the booking card can push itself to the bottom edge with mt-auto
            whenever the map half is the taller of the two and the row stretches
            this one to match. Both entrance triggers keep their own element:
            `left` for the heading and hours, `right` for the card.
          */}
          <div className="flex flex-col gap-48 max-md:gap-32">
            <div ref={left}>
              <SectionHeading>Visit us</SectionHeading>

              {/*
                Renders nothing at all while both are null, rather than an empty
                gap: the address and hours below carry the section on their own,
                and a heading over blank space reads as a broken page.
              */}
              {(TEL_HREF || SITE.email) && (
                <div className="mt-40 max-md:mt-28 flex flex-col items-start gap-12">
                  {TEL_HREF && (
                    <a href={TEL_HREF} className={LINK}>
                      {SITE.phone}
                    </a>
                  )}
                  {SITE.email && (
                    <a href={`mailto:${SITE.email}`} className={LINK}>
                      {SITE.email}
                    </a>
                  )}
                </div>
              )}

              {/*
                ONE div between the <dl> and its <dt>/<dd>, never two. HTML
                allows exactly one wrapper there, and this had a styling div
                inside the row div: that second level broke the association, so
                a screen reader announced ten loose fragments instead of five
                day-and-time pairs. Opening hours are the single most likely
                reason someone is using assistive tech on this page at all.

                The two wrappers are merged rather than one being deleted: the
                row needs `group relative` for the hover field and the flex line
                needs its own layout, so both sets of classes live on the one
                permitted div and the hover field is positioned against it
                directly.

                Set in the page's own family, like everything else. What marks
                the list as functional is the smaller size, the medium weight
                and the open tracking, not a second typeface; the day labels
                take themed-muted so the times read first.
              */}
              <dl className="trace-occlude mt-48 max-md:mt-32 text-p2 max-md:text-mp2 font-medium tracking-[0.02em]">
                {SITE.hours.map((row) => (
                  <div
                    key={row.days}
                    data-hours-row
                    className={`group border-b border-line themed-border ${ROW_LINE}`}
                  >
                    <span aria-hidden className={ROW_FIELD} />
                    <dt className="themed-muted">{row.days}</dt>
                    {/* Tabular figures: without them 1pm and 10:30am set to
                        different widths and the right edge of the column
                        wanders row to row. */}
                    <dd className="[font-variant-numeric:tabular-nums]">
                      {row.closed ? "Closed" : `${row.open} to ${row.close}`}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            {/*
              An outlined card now, not a tint, so plate and surface are the
              same node: .trace-occlude is the opaque page-bg the cord passes
              behind and the 2px outline carries the depth. The tint used to
              need a second element underneath purely because .trace-occlude is
              unlayered CSS and would have flattened a bg-panel sitting on the
              same node.
            */}
            <div
              ref={right}
              className={`mt-auto trace-occlude rounded-card ${OUTLINE} p-48 max-md:p-24`}
            >
              <p className="text-p1 max-md:text-mp1 max-w-460">{BOOKING_LINE}</p>

              <div className="mt-32 max-md:mt-24 w-fit">
                <PillButton variant="solid" href={SITE.bookingUrl}>
                  Book now
                </PillButton>
              </div>

              {/* The same functional register as the hours, one step down:
                  size, weight, tracking and themed-muted, no second family.
                  14 artboard px against the list's 16, in rem like everything
                  else, so it scales with the artboard instead of sitting at a
                  fixed device size the way the old mono note did. */}
              <p className="mt-16 text-[0.875rem] max-md:text-[0.8125rem] font-medium tracking-[0.03em] themed-muted">
                {BOOKING_NOTE}
              </p>
            </div>
          </div>

          {/* The map half. A flex column so the plate can take every pixel the
              directions link leaves, which is what makes it a tall plate. */}
          <div ref={mapBlock} className="flex flex-col">
            {/*
              data-lenis-prevent hands the wheel to the map instead of the page,
              and overscroll-behavior: contain (globals.css) stops the scroll
              chaining back out mid gesture.
            */}
            <figure ref={map} data-lenis-prevent className={MAP_FIGURE}>
              <iframe
                title={MAP_TITLE}
                src={MAP_SRC}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className={MAP_FRAME}
              />
            </figure>

            <a
              data-map-link
              href={DIRECTIONS_HREF}
              target="_blank"
              rel="noopener noreferrer"
              className={`${LINK} block mt-24 max-md:mt-18`}
            >
              {DIRECTIONS_LABEL}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
