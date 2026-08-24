/*
 * JSON-LD builders. Injected from server components as
 * <script type="application/ld+json"> so crawlers see them in the HTML.
 * Everything is derived from lib/content so the markup can never drift from
 * the copy shown on the page.
 */
import { SITE } from "@/lib/content/site";
import type { Faq } from "@/lib/content/faq";

/*
 * The canonical origin, and the only place it is written down.
 *
 * It used to be a hard-coded example.com, which then went out in the JSON-LD as
 * the business's official URL. Now it reads NEXT_PUBLIC_SITE_URL, so the real
 * domain is set once in the deployment environment and every canonical, every
 * Open Graph URL and the structured data all follow it.
 *
 * The localhost fallback is deliberately obvious. If it ever appears in
 * production output, the environment variable was not set, and that is easier
 * to spot in a share preview than a plausible-looking placeholder domain.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "http://localhost:3000";

/*
 * The `days` labels in SITE.hours are written for humans; schema.org wants
 * explicit day names, so the mapping lives here instead of polluting the
 * content module with markup concerns.
 */
const SCHEMA_DAYS: Record<string, string[]> = {
  "Wed and Thu": ["Wednesday", "Thursday"],
  Fri: ["Friday"],
  Sat: ["Saturday"],
  Sun: ["Sunday"],
  "Mon and Tue": ["Monday", "Tuesday"],
};

/* "9am" and "5:30pm" become the "09:00" / "17:30" schema.org wants. */
function to24h(value: string): string {
  const match = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i.exec(value.trim());
  if (!match) return "";
  const hour = Number(match[1]) % 12;
  const shifted = match[3].toLowerCase() === "pm" ? hour + 12 : hour;
  const minutes = match[2] ?? "00";
  return `${String(shifted).padStart(2, "0")}:${minutes}`;
}

export function barberShopJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "BarberShop",
    name: SITE.name,
    url: SITE_URL,
    /*
     * telephone and email are emitted ONLY when they are real.
     *
     * They used to always be present, carrying a placeholder from the reserved
     * 555 range. Structured data is read as fact: Google treats name, address
     * and phone as the identity of a local business, and an inconsistent NAP
     * actively suppresses local ranking. A missing field is neutral; a wrong one
     * is worse than nothing. So the moment SITE.phone is filled in, this
     * reappears on its own.
     */
    ...(SITE.phone ? { telephone: SITE.phone } : {}),
    ...(SITE.email ? { email: `mailto:${SITE.email}` } : {}),
    image: `${SITE_URL}${SHARE_IMAGE}`,
    sameAs: SITE.socials.map((s) => s.href).filter((h) => h.startsWith("http")),
    priceRange: "$$",
    address: {
      "@type": "PostalAddress",
      streetAddress: SITE.address.street,
      addressLocality: SITE.address.city,
      addressRegion: SITE.address.state,
      postalCode: SITE.address.zip,
      addressCountry: "US",
    },
    openingHoursSpecification: SITE.hours
      .filter((entry) => !entry.closed)
      .map((entry) => ({
        "@type": "OpeningHoursSpecification",
        dayOfWeek: SCHEMA_DAYS[entry.days] ?? [],
        opens: to24h(entry.open),
        closes: to24h(entry.close),
      })),
  };
}

export function faqJsonLd(items: Faq[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}

/*
 * The frame used for Open Graph and for the structured data's `image`. The
 * barber at work is the only landscape photograph on the site, which is also
 * the shape a share card wants.
 */
export const SHARE_IMAGE = "/photos/miguel-at-work.jpg";

export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      /*
       * The `<` escape is not decoration. JSON.stringify happily emits the
       * characters "</script>" inside a string value, which closes this block
       * early and turns everything after it into markup: the textbook shape of
       * an XSS hole. Every value here is author-controlled today, so it is not
       * exploitable — but this file is one CMS field or one client-supplied
       * description away from it being live, and by then nobody is looking at
       * this line. JSON parses \u003c back to "<", so the payload is identical
       * and the tag can no longer be closed from inside a string.
       */
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
