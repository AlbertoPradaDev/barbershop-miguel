import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

/*
 * Everything is public and everything should be indexed, so this file is not
 * about blocking. It exists to point at the sitemap, which is where the
 * canonical host is declared, and to answer a request that currently 404s.
 *
 * The AI crawlers are ALLOWED on purpose, and that is a decision rather than a
 * default. A growing share of "barber near me" is answered inside an assistant
 * before anyone clicks a result, and this site is exactly the kind of page that
 * should be quotable there: real hours, real prices, real policies, marked up in
 * schema.org. Blocking them would hide the shop from the fastest-growing way
 * people look for one.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
