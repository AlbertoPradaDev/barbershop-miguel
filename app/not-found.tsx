import Link from "next/link";
import { PillButton } from "@/components/ui/pill-button";
import { SITE } from "@/lib/content/site";

/*
 * 404. This was the framework's unstyled default, which dropped anyone with a
 * mistyped URL out of the site entirely and offered no way back to booking.
 *
 * A server component with no animation on purpose: nothing here is worth
 * shipping GSAP for, and the page has to work when the rest of the site is what
 * failed. It paints the ink ground itself rather than relying on a Band from
 * page.tsx, since it renders outside that stack.
 */
export const metadata = {
  title: `Page not found · ${SITE.name}`,
  /* A 404 must never be indexed as content. */
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <main
      data-scheme="dark"
      className="flex min-h-[100svh] flex-col items-center justify-center bg-page-bg px-64 text-center text-page-text max-md:px-20"
    >
      <p className="font-mono text-p2 max-md:text-mp2 themed-muted">404</p>

      <h1 className="mt-24 text-h1 max-md:text-mh1 font-semibold">
        That page does not exist
      </h1>

      <p className="themed-muted mt-24 max-w-[52ch] text-p1 max-md:text-mp1">
        The link may be old, or the address slightly off. The chair is still
        here.
      </p>

      <div className="mt-48 flex flex-wrap items-center justify-center gap-32">
        <PillButton variant="solid" href={SITE.bookingUrl}>
          Book now
        </PillButton>
        <Link
          href="/"
          className="underline-link text-p2 max-md:text-mp2 font-medium tracking-[0.08em] uppercase"
        >
          Back to the shop
        </Link>
      </div>
    </main>
  );
}
