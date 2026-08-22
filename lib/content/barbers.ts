/*
 * The barber. The shop is a one chair operation, so this module carries a
 * single person: `barber` is the canonical record and `barbers` is the same
 * record in an array, kept so anything that wants to map over the roster still
 * can. The portrait is real barbershop photography served from the Pexels CDN
 * through `pexels()`, and the id is commented with what the frame shows so the
 * face can be swapped by changing one number. The Instagram link is a stub
 * until the client supplies the real handle.
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
  id: "marcus-hale",
  name: "Marcus Hale",
  role: "Owner and Master Barber",
  bio: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
  // Bearded barber holding open scissors toward camera, black and white.
  image: pexels(5188606, 900),
  instagram: "#",
};

/** The roster, one entry long. Kept so list consumers keep working. */
export const barbers: Barber[] = [barber];
