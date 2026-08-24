import type { Metadata } from "next";
import { Instrument_Sans, IBM_Plex_Mono } from "next/font/google";
import { SmoothScrollProvider } from "@/components/providers/smooth-scroll-provider";
import { OpeningSequence } from "@/components/layout/opening-sequence";
import { JsonLd, barberShopJsonLd, SITE_URL, SHARE_IMAGE } from "@/lib/seo";
import { SITE } from "@/lib/content/site";
import { ANTI_FLASH_SCRIPT } from "@/lib/anti-flash";
import "./globals.css";

const instrument = Instrument_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

/* The city is the shop's real one. AGENTS.md reserves this file for the
   orchestrator, but it carried "Austin TX" from the placeholder set and the
   studio is in Raleigh, NC, so it could not be left as it was. */
const TITLE = `${SITE.name}, Raleigh NC`;
const DESCRIPTION =
  "Precision cuts, beard work and head shaves with Miguel Rangel in Raleigh, North Carolina. Book your chair.";

export const metadata: Metadata = {
  /*
   * metadataBase is what turns every relative URL below into an absolute one,
   * and it is why the canonical and the Open Graph image resolve correctly
   * without repeating the domain in five places. It reads the same SITE_URL the
   * structured data uses, so the page can never disagree with its own schema
   * about where it lives.
   */
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/" },

  /*
   * Open Graph is not optional for this business. Its traffic arrives from an
   * Instagram bio link and gets forwarded over WhatsApp, and both render a
   * preview card from these tags. With none present the preview was a bare URL:
   * no image, no name, nothing that looks like a barbershop. The share card IS
   * the shopfront for most of the people who will ever see this site.
   */
  openGraph: {
    type: "website",
    siteName: SITE.name,
    title: TITLE,
    description: DESCRIPTION,
    url: "/",
    locale: "en_US",
    images: [
      {
        url: SHARE_IMAGE,
        width: 1008,
        height: 672,
        alt: "Miguel lining up a client's hair at MR Society Barber Studio",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [SHARE_IMAGE],
  },

  /* Everything here is public and should be indexed; spelled out rather than
     left to a default so the intent is on the record. */
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${instrument.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-page-bg text-page-text">
        {/* Runs before first paint: hides [data-masked] text until the reveal
            animation takes over. Injected as a style tag so no React-managed
            attribute is touched; with JS off the text stays visible.

            The source lives in lib/anti-flash.ts because next.config.ts hashes
            it for the Content-Security-Policy. Inline the string here again and
            the next edit silently breaks the policy. */}
        <script dangerouslySetInnerHTML={{ __html: ANTI_FLASH_SCRIPT }} />
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-16 focus:left-16 focus:z-[70] focus:bg-page-bg focus:text-page-text focus:px-20 focus:py-12 focus:rounded-full focus:border focus:border-line"
        >
          Skip to content
        </a>
        <SmoothScrollProvider>{children}</SmoothScrollProvider>
        {/* The opening sequence. Mounted here and not in page.tsx because it
            covers the whole document, navbar included, and because it drives
            the hero's own reveal as part of one timeline. Renders nothing at
            all under reduced motion or once a session has seen it. */}
        <OpeningSequence />
        <div className="grain" aria-hidden />
        <JsonLd data={barberShopJsonLd()} />
      </body>
    </html>
  );
}
