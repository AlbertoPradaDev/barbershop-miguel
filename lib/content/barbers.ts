/*
 * The barber. The shop is a one chair operation, so this module carries a
 * single person: `barber` is the canonical record and `barbers` is the same
 * record in an array, kept so anything that wants to map over the roster still
 * can.
 *
 * Name, role, portrait and Instagram are all real, from the shop's Booksy
 * profile on 2026-08-24. `bio` is the client's OWN "About us" text, verbatim,
 * so it is not to be rewritten or "improved" without asking him.
 *
 * The portrait was filed on Booksy as the business LOGO, which is why it did
 * not look like an available headshot at first: the slot is named for a mark
 * and the file is a photograph of him.
 */

import { miguelPortrait } from "@/lib/content/photos";

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
  image: miguelPortrait.src,
  instagram: "https://www.instagram.com/mrangel13._/",
};

/** The roster, one entry long. Kept so list consumers keep working. */
export const barbers: Barber[] = [barber];
