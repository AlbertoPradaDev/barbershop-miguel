/* Home: the full single-page site.

   There is no dark mode and no toggle. The page alternates bands instead: each
   section is wrapped in a scheme that paints it white or black, and every
   component inside simply inherits the tokens of the band it landed in. The
   order below is therefore both the reading order and the colour rhythm.

   Sections sit directly against each other, with no transition bands and no
   rules between them; the colour change is the seam. */

import type { ReactNode } from "react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { FloatingActions } from "@/components/layout/floating-actions";
import { Hero } from "@/components/sections/hero";
import { Services } from "@/components/sections/services";
import { About } from "@/components/sections/about";
import { Team } from "@/components/sections/team";
import { Gallery } from "@/components/sections/gallery";
import { Testimonials } from "@/components/sections/testimonials";
import { Faq } from "@/components/sections/faq";
import { Contact } from "@/components/sections/contact";

/* One band of the page. The wrapper owns the scheme and paints the ground, so
   the section inside can stay transparent and token driven. */
function Band({
  scheme,
  children,
}: {
  scheme: "light" | "dark";
  children: ReactNode;
}) {
  return (
    <div data-scheme={scheme} className="bg-page-bg text-page-text">
      {children}
    </div>
  );
}

export default function Home() {
  return (
    <>
      <div className="relative z-10 bg-page-bg">
        <Navbar />
        <main id="main-content">
          <Band scheme="dark">
            <Hero />
          </Band>
          <Band scheme="light">
            <Services />
          </Band>
          <Band scheme="dark">
            <About />
          </Band>
          <Band scheme="light">
            <Team />
          </Band>
          <Band scheme="dark">
            <Gallery />
          </Band>
          <Band scheme="light">
            <Testimonials />
          </Band>
          <Band scheme="dark">
            <Faq />
          </Band>
          <Band scheme="light">
            <Contact />
          </Band>
        </main>
      </div>
      <Footer />
      <FloatingActions />
    </>
  );
}
