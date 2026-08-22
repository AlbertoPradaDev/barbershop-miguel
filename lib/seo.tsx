/*
 * JSON-LD builders. Injected from server components as
 * <script type="application/ld+json"> so crawlers see them in the HTML.
 * Everything is derived from lib/content so the markup can never drift from
 * the copy shown on the page.
 */
import { SITE } from "@/lib/content/site";
import type { Faq } from "@/lib/content/faq";

/* Placeholder origin. Swap for the real domain before launch. */
export const SITE_URL = "https://example.com";

/*
 * The `days` labels in SITE.hours are written for humans; schema.org wants
 * explicit day names, so the mapping lives here instead of polluting the
 * content module with markup concerns.
 */
const SCHEMA_DAYS: Record<string, string[]> = {
  "Tue to Fri": ["Tuesday", "Wednesday", "Thursday", "Friday"],
  Sat: ["Saturday"],
  "Sun and Mon": ["Sunday", "Monday"],
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
    telephone: SITE.phone,
    email: `mailto:${SITE.email}`,
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

export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
