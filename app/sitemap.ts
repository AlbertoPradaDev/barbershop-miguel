import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

/*
 * One route, so this is not about discovery: a crawler finds a single page site
 * without help. It is about stating the CANONICAL host. Without it a crawler
 * that reaches the site through any other hostname (a preview deployment, a
 * parked domain, the www/apex pair) has nothing telling it which one is the
 * real one, and can index the wrong host as the business.
 *
 * Generated statically at build, so it costs one file and no runtime.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${SITE_URL}/`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
