import type { NextConfig } from "next";

/*
 * Content-Security-Policy.
 *
 * The site loads no third-party CODE, and the only third-party origin it
 * touches at all is the OpenStreetMap embed in the contact section, so
 * default-src 'self' still costs next to nothing. Four deliberate
 * relaxations, and the first one is a real trade rather than a shrug:
 *
 *   script-src 'unsafe-inline'
 *     The App Router streams its RSC payload through INLINE bootstrap scripts
 *     (self.__next_f.push(...)) that are generated per build and per page.
 *     There is no supported way to hash them. The first version of this file
 *     hashed only our own inline script, which meant Next's were refused,
 *     hydration died with React error #412, and the page shipped as dead
 *     markup: the hero copy stayed hidden behind its own anti-flash rule
 *     because nothing was left running to reveal it.
 *
 *     The alternative is a per-request nonce, which forces this page out of
 *     static prerendering and onto a server render for every visitor. For a
 *     brochure site with no user input, no CMS, no query parameters reaching
 *     the DOM and no authenticated state, that is a poor trade: it gives up
 *     CDN-served static HTML to defend against an injection vector that has no
 *     route in. So: inline scripts are allowed, and 'self' still refuses any
 *     EXTERNAL script origin, which is the vector that actually exists here.
 *
 *     Revisit the moment this site accepts input of any kind — a form, a CMS
 *     field, a search parameter rendered into the page. Then the nonce is worth
 *     the dynamic render.
 *
 *     Note a browser rule that makes this all-or-nothing: when a hash or nonce
 *     is present, 'unsafe-inline' is IGNORED. The two cannot be combined as a
 *     belt-and-braces fallback.
 *
 *   style-src 'unsafe-inline'
 *     next/font injects a <style> block and next/image writes inline style
 *     attributes on every fill image. Not script execution, and there is no way
 *     to hash React's generated style attributes.
 *
 *   img-src data: blob:
 *     next/image emits data: placeholders; canvas work can produce blob: URLs.
 *
 *   frame-src https://www.openstreetmap.org
 *     The contact section embeds an OpenStreetMap map. A frame with no
 *     frame-src of its own falls back to default-src, so 'self' refused the
 *     embed outright and the map rendered as a blank plate. This names that one
 *     origin and nothing else: the tiles inside the map come from
 *     tile.openstreetmap.org, but the framed document fetches those under ITS
 *     policy, never ours, so no img-src or connect-src allowance follows.
 *
 *     This is unrelated to frame-ancestors and X-Frame-Options below, which
 *     govern who may frame US and stay at DENY.
 *
 * JSON-LD needs no allowance: a type="application/ld+json" block is a data
 * island, not executable script.
 */
const csp = [
  "default-src 'self'",
  /*
   * 'wasm-unsafe-eval' exists for the haircut simulator's on-device face
   * validator (MediaPipe, self-hosted under /public/vendor). Compiling ANY
   * WebAssembly requires it; without it the wasm is refused silently and the
   * photo gates never arm. It permits wasm compilation only, not JS eval, and
   * script-src still refuses every external origin.
   */
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "frame-src https://www.openstreetmap.org",
  "font-src 'self'",
  "connect-src 'self'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  /* frame-ancestors above already covers modern browsers; this is the fallback
     for the ones that do not honour it. */
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  /* The site links out to Booksy and Instagram. Send the origin, never the full
     path, so outbound clicks cannot leak what the visitor was reading. */
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  /* The haircut simulator's live capture is the one legitimate camera user, so
     camera is allowed for this origin only; the rest stay refused outright
     rather than leaving the door open for whatever gets added later. */
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(), geolocation=(), interest-cohort=()",
  },
  /* Two years, subdomains included. Harmless locally (HSTS is ignored over
     plain http) and correct the moment this is on a real domain. */
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
];

const nextConfig: NextConfig = {
  /*
   * No remotePatterns. Every frame on the site is the client's own photograph
   * served from /public/photos, so the Pexels and picsum allowances the
   * placeholder set needed are gone: an image host left in this list is an
   * origin the site is still allowed to load from.
   */
  images: {
    formats: ["image/avif", "image/webp"],
  },

  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        /*
         * The photographs are content-addressed by name and never edited in
         * place; a new picture arrives under a new filename. They are normally
         * requested through /_next/image, which caches separately, but anything
         * linking a raw file was being told not to cache it at all.
         */
        source: "/photos/:file*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;
