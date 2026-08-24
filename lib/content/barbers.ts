/*
 * The barber. The shop is a one chair operation, so this module carries a
 * single person: `barber` is the canonical record and `barbers` is the same
 * record in an array, kept so anything that wants to map over the roster still
 * can.
 *
 * Name, role and Instagram are real, read from the shop's Booksy profile on
 * 2026-08-24. `bio` is the client's OWN "About us" text, verbatim, so it is not
 * to be rewritten or "improved" without asking him.
 *
 * OUTSTANDING: `image` is still stock. Booksy publishes the shop photo, the
 * logo and around 40 photographs of the work, but no portrait of Miguel
 * himself, and a face is the one thing this section cannot fake. Ask the client
 * for a headshot.
 */

import { pexels } from "@/lib/content/photos";

export interface Barber {
  id: string;
  name: string;
  role: string;
  bio: string;
  image: string;
  instagram: string;
}

export const barber: Barber = {
  id: "miguel-rangel",
  name: "Miguel Rangel",
  role: "Owner and Barber",
  /* The client's own words, from his Booksy "About us". Do not paraphrase. */
  bio: "I'm a dedicated barber focused on precision, comfort, and customer care. Every haircut is done with attention to detail, making sure each client feels confident and relaxed. My goal is to provide quality service and a great experience not just a cut, but a moment to feel your best.",
  // PLACEHOLDER: bearded barber holding open scissors toward camera. Not Miguel.
  image: pexels(5188606, 900),
  instagram: "https://www.instagram.com/mrangel13._/",
};

/** The roster, one entry long. Kept so list consumers keep working. */
export const barbers: Barber[] = [barber];
