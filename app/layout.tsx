import type { Metadata } from "next";
import { Instrument_Sans, IBM_Plex_Mono } from "next/font/google";
import { SmoothScrollProvider } from "@/components/providers/smooth-scroll-provider";
import { JsonLd, barberShopJsonLd } from "@/lib/seo";
import { SITE } from "@/lib/content/site";
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
export const metadata: Metadata = {
  title: `${SITE.name}, Raleigh NC`,
  description:
    "Precision cuts, beard work and head shaves with Miguel Rangel in Raleigh, North Carolina. Book your chair.",
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
            attribute is touched; with JS off the text stays visible. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "document.head.appendChild(Object.assign(document.createElement('style'),{textContent:'[data-masked]{visibility:hidden}'}))",
          }}
        />
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-16 focus:left-16 focus:z-[70] focus:bg-page-bg focus:text-page-text focus:px-20 focus:py-12 focus:rounded-full focus:border focus:border-line"
        >
          Skip to content
        </a>
        <SmoothScrollProvider>{children}</SmoothScrollProvider>
        <div className="grain" aria-hidden />
        <JsonLd data={barberShopJsonLd()} />
      </body>
    </html>
  );
}
