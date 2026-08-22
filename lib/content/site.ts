/*
 * Single source of truth for shop identity, contact details, opening hours and
 * navigation. Header, footer, contact section and the JSON-LD builder all read
 * from here, so any real detail is changed in exactly one place.
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
  bookingUrl: string;
  phone: string;
  /** wa.me deep link built from the digits of `phone`. Placeholder number. */
  whatsapp: string;
  email: string;
  address: Address;
  geo: Geo;
  hours: Hours[];
  socials: SocialLink[];
  navLinks: NavLink[];
}

export const SITE: Site = {
  name: "Lorem & Co. Barbershop",
  bookingUrl: "https://example.com/book",
  phone: "+1 (512) 555 0134",
  whatsapp: "https://wa.me/15125550134",
  email: "hello@example.com",
  address: {
    street: "1200 Lorem Ave",
    city: "Austin",
    state: "TX",
    zip: "78701",
  },
  geo: { lat: 30.2672, lng: -97.7431 },
  hours: [
    { days: "Tue to Fri", open: "9am", close: "7pm" },
    { days: "Sat", open: "9am", close: "5pm" },
    { days: "Sun and Mon", open: "", close: "", closed: true },
  ],
  socials: [
    { label: "Instagram", href: "#" },
    { label: "TikTok", href: "#" },
  ],
  navLinks: [
    { label: "Services", href: "#services" },
    { label: "About", href: "#about" },
    { label: "The barber", href: "#team" },
    { label: "Gallery", href: "#gallery" },
    { label: "Reviews", href: "#reviews" },
    { label: "FAQ", href: "#faq" },
    { label: "Contact", href: "#contact" },
  ],
};
