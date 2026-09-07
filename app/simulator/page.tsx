import type { Metadata } from "next";
import Link from "next/link";
import { SITE } from "@/lib/content/site";
import { PillButton } from "@/components/ui/pill-button";
import { SimulatorFlow } from "@/components/simulator/simulator-flow";

/*
 * The haircut simulator, on its own route. Three photos, an on-device face
 * check, an AI read of face, head and hair, a ranked recommendation with its
 * reasons, and photoreal previews of any cut in four views, ending in a card
 * the visitor can hand to Miguel. Booking stays on Booksy; this page's only
 * outbound push is the same Book now the rest of the site uses.
 */

const TITLE = `Try a haircut, ${SITE.name}`;
const DESCRIPTION =
  "Upload three photos and see yourself with the cut before you book the chair. AI recommendation, four view previews and a card you can show your barber.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/simulator" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/simulator" },
};

export default function SimulatorPage() {
  return (
    <main className="min-h-svh bg-page-bg text-page-text">
      <header className="mx-auto flex w-full max-w-[1400px] items-center justify-between px-48 py-24 max-md:px-16 max-md:py-16">
        <Link href="/" className="cursor-pointer text-p1 max-md:text-mp1 font-semibold whitespace-nowrap">
          {SITE.shortName}
        </Link>
        <PillButton variant="solid" href={SITE.bookingUrl} external>
          Book now
        </PillButton>
      </header>

      <div className="mx-auto w-full max-w-[1400px] px-48 pb-96 max-md:px-16 max-md:pb-64">
        <h1 className="sr-only">Haircut simulator</h1>
        <SimulatorFlow />
      </div>

      <footer className="mx-auto w-full max-w-[1400px] px-48 pb-48 max-md:px-16 max-md:pb-32">
        <p className="text-p2 max-md:text-mp2 text-muted">
          Previews are AI generated images and are marked as such. Suggestions are a guide, the
          final word belongs to the mirror and your barber.
        </p>
      </footer>
    </main>
  );
}
