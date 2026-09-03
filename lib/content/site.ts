/*
 * Single source of truth for shop identity, contact details, opening hours and
 * navigation. Header, footer, contact section and the JSON-LD builder all read
 * from here, so any real detail is changed in exactly one place.
 *
 * Everything below is the real business except `phone`, `whatsapp` and `email`,
 * which are still placeholders. Sourced 2026-08-24 from the shop's Booksy
 * profile (the `bookingUrl`), which is where the client publishes hours, prices
 * and reviews. Booksy puts phone and email behind a login, so those three
 * fields are the outstanding ask, see the note above them.
 */

export interface Address {
  street: string;
  city: string;
  state: string;
  zip: string;
}

export interface Hours {
  days: string;
  open: string;
  close: string;
  closed?: boolean;
}

export interface SocialLink {
  label: string;
  href: string;
}

export interface NavLink {
  label: string;
  href: string;
}

/** Map centre for the contact section, in decimal degrees. */
export interface Geo {
  lat: number;
  lng: number;
}

export interface Site {
  name: string;
  /** Display form for the giant hero wordmark, where the full name is too long. */
  shortName: string;
  bookingUrl: string;
  /**
   * NULL until the client supplies the real one. Every consumer treats null as
   * "do not render this control" rather than rendering a dead link, so filling
   * these in is the only step needed to bring the phone, email and WhatsApp
   * affordances back across the whole site.
   */
  phone: string | null;
  /** wa.me deep link. Null while `phone` is null. */
  whatsapp: string | null;
  email: string | null;
  address: Address;
  geo: Geo;
  hours: Hours[];
  socials: SocialLink[];
  navLinks: NavLink[];
}

/*
 * The WhatsApp deep link is held in its own const because it is read twice: as
 * SITE.whatsapp for the floating button, and again inside SITE.socials, and an
 * object literal cannot refer to itself. While it is null WhatsApp is simply
 * absent from the socials list instead of shipping a dead wa.me href.
 */
const WHATSAPP: string | null = null;

export const SITE: Site = {
  name: "MR Society Barber Studio",

  /* The full name runs to 24 characters and cannot be set at display size
     without shrinking to nothing. The hero and the opening sequence use this. */
  shortName: "MR Society",

  /* Booking runs on Booksy; there is no in-house booking engine to build. */
  bookingUrl:
    "https://booksy.com/en-us/1000069_miguel-mr-society-barber-studio_barber-shop_27100_raleigh",

  /*
   * STILL OWED BY THE CLIENT. Booksy gates the shop's phone and email behind an
   * account, so they have to come from Miguel directly.
   *
   * These held a placeholder from the reserved 555 range, which was worse than
   * holding nothing: it rendered as a real number in four places, the WhatsApp
   * button deep-linked to it, and it went out in the JSON-LD as machine-readable
   * fact. A visitor tapping "call" got a dialler loaded with fiction.
   *
   * Null instead. Every consumer hides its control rather than rendering a dead
   * link, and the structured data omits the field entirely. Fill these three in
   * and the tel: link, the mailto:, the WhatsApp button and the schema.org
   * telephone all come back on their own, with no other edit anywhere.
   */
  phone: null,
  whatsapp: WHATSAPP,
  email: null,

  address: {
    street: "2900 Spring Forest Rd, Ste 108",
    city: "Raleigh",
    state: "NC",
    zip: "27616",
  },

  /* Read off the shop's own "Get directions" link on Booksy. */
  geo: { lat: 35.854843, lng: -78.590817 },

  /*
   * Real trading hours. Grouped for display, and every `days` label here must
   * also exist in SCHEMA_DAYS in lib/seo.tsx: that map is keyed on these exact
   * strings, and a label it does not know silently emits an empty dayOfWeek
   * array into the JSON-LD instead of failing.
   */
  hours: [
    { days: "Wed and Thu", open: "1pm", close: "8pm" },
    { days: "Fri", open: "11am", close: "9pm" },
    { days: "Sat", open: "10am", close: "8pm" },
    { days: "Sun", open: "10:30am", close: "6:30pm" },
    { days: "Mon and Tue", open: "", close: "", closed: true },
  ],

  /*
   * Instagram is the only profile the client has given us. WhatsApp is a real
   * channel we already hold, so it joins the list the moment WHATSAPP above is
   * filled in and stays out while there is no number to link to.
   *
   * To add more: push another { label, href } here and the footer, the mobile
   * menu and the JSON-LD sameAs pick it up with no further edit. Only handles
   * the client has actually confirmed. No invented Facebook, TikTok or X.
   */
  socials: [
    { label: "Instagram", href: "https://www.instagram.com/mrangel13._/" },
    ...(WHATSAPP ? [{ label: "WhatsApp", href: WHATSAPP }] : []),
  ],

  navLinks: [
    { label: "Services", href: "#services" },
    { label: "About", href: "#about" },
    { label: "The barber", href: "#team" },
    { label: "Gallery", href: "#gallery" },
    { label: "Reviews", href: "#reviews" },
    /* A route, not an anchor: every navLink consumer lets non hash hrefs
       navigate normally instead of smooth scrolling. */
    { label: "Try a haircut", href: "/simulator" },
    { label: "FAQ", href: "#faq" },
    { label: "Contact", href: "#contact" },
  ],
};
