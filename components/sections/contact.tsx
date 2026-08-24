"use client";

import { useRef } from "react";
import { gsap, useGSAP, EXIT } from "@/lib/gsap";
import { SectionHeading } from "@/components/ui/section-heading";
import { PillButton } from "@/components/ui/pill-button";
import { Magnetic } from "@/components/ui/magnetic";
import { TraceSegment } from "@/components/ui/trace-line";
import { SITE } from "@/lib/content/site";

/*
 * Contact: the ways to reach the shop on the left (tappable phone and email,
 * opening hours), a booking panel on the right, and a real interactive
 * OpenStreetMap embed as the centrepiece underneath. The written address is
 * gone: the map is the address now, with a directions link under it so a touch
 * visitor is never stuck inside the iframe.
 *
 * Motion recipe (transform + opacity, plus one clip-path on the map):
 *   left     gsap.from y 40, opacity 0, 0.9s expo.out, trigger "top 78%" once,
 *            with the hours rows staggering 0.06 inside the same timeline.
 *   right    the same from, delayed 0.15s off its own "top 78%" trigger.
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
 * Surface: the booking panel is a card (20px radius) with a 2px outline; the
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
 * where street names are readable at the 21/9 plate size.
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
  "aspect-[21/9] max-md:aspect-[4/3]",
  /* Media plate: 24px radius and nothing else. Images carry no outline, so the
     tiles meet the page directly. The GSAP wipe tweens clip-path at the
     matching 1.5rem, so nothing squares off mid tween. */
].join(" ");

/*
 * OSM's raster tiles are a light map, and Contact is a white band, so the frame
 * only needs the edge taken off the tile colour to sit with the page. The dark
 * inversion the old toggle needed is gone with it: a band never changes scheme
 * at runtime, so one grade is correct for the whole life of the page.
 *
 * scheme-dark: is kept as a safety net in case this section is ever moved into
 * a black band, where raw white tiles would blow a hole in the page.
 */
const MAP_FRAME = [
  "absolute inset-0 h-full w-full border-0",
  "[filter:saturate(0.35)_contrast(1.05)]",
  "scheme-dark:[filter:invert(0.92)_hue-rotate(180deg)_saturate(0.5)_contrast(0.95)]",
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
        Re-measured after the address came out. The columns end at 549 on the
        1920 artboard and the map plate starts at 639, so the run drops behind
        the booking panel, turns in the 90px gap below the grid and parks the
        plug at 576, dead centre of the column gutter and clear of the map. On
        the 390 artboard the hours end at 417 and the panel starts at 464, so
        the plug sits at 440, in that gap rather than under the now opaque
        panel. Previous values: 640/668/732 and 560/600.
      */}
      <TraceSegment
        d="M 1800 -40 V 548 Q 1800 576 1772 576 H 960"
        dMobile="M 24 -40 V 440"
        height={640}
        heightMobile={480}
        anchor="top"
        plug
        plugAt={{ x: 960, y: 576 }}
        plugAtMobile={{ x: 24, y: 440 }}
      />

      <div
        ref={inner}
        className="relative z-10 px-64 py-140 max-md:px-20 max-md:py-90"
      >
        <div className="grid grid-cols-2 gap-64 max-md:grid-cols-1 max-md:gap-48">
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
              ONE div between the <dl> and its <dt>/<dd>, never two. HTML allows
              exactly one wrapper there, and this had a styling div inside the
              row div: that second level broke the association, so a screen
              reader announced ten loose fragments instead of five day-and-time
              pairs. Opening hours are the single most likely reason someone is
              using assistive tech on this page at all.

              The two wrappers are merged rather than one being deleted: the row
              needs `group relative` for the hover field and the flex line needs
              its own layout, so both sets of classes live on the one permitted
              div and the hover field is positioned against it directly.
            */}
            <dl className="trace-occlude mt-48 max-md:mt-32 font-mono text-p2 max-md:text-mp2">
              {SITE.hours.map((row) => (
                <div
                  key={row.days}
                  data-hours-row
                  className={`group border-b border-line themed-border ${ROW_LINE}`}
                >
                  <span aria-hidden className={ROW_FIELD} />
                  <dt className="themed-muted">{row.days}</dt>
                  <dd>{row.closed ? "Closed" : `${row.open} to ${row.close}`}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/*
            An outlined card now, not a tint, so plate and surface are the same
            node: .trace-occlude is the opaque page-bg the cord passes behind
            and the 2px outline carries the depth. The tint used to need a
            second element underneath purely because .trace-occlude is unlayered
            CSS and would have flattened a bg-panel sitting on the same node.
          */}
          <div
            ref={right}
            className={`self-start trace-occlude rounded-card ${OUTLINE} p-48 max-md:p-24`}
          >
            <p className="text-p1 max-md:text-mp1 max-w-460">{BOOKING_LINE}</p>

            <Magnetic className="mt-32 max-md:mt-24 w-fit">
              <PillButton variant="solid" href={SITE.bookingUrl}>
                Book now
              </PillButton>
            </Magnetic>

            <p className="mt-16 font-mono text-[12px] themed-muted">
              {BOOKING_NOTE}
            </p>
          </div>
        </div>

        <div ref={mapBlock} className="mt-90 max-md:mt-56">
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
    </section>
  );
}
