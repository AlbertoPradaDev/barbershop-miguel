/*
 * Gallery source. `tall` drives the masonry rhythm: tall tiles are 3:4, the
 * rest are square.
 *
 * These are seven of the client's own photographs of his work, from his Booksy
 * profile. The two shot upright fill the tall slots and the five square ones
 * fill the rest, so next/image `fill` crops into each card without cutting a
 * head off. Titles name the actual cut in the frame, not a generic style list.
 *
 * Seven rather than the ten this rail was built with: twelve business owned
 * photographs exist in total, and the other five are doing more useful work as
 * the hero, the portrait and the three About plates. Padding the rail back out
 * would mean either reusing frames or going back to stock, and a shorter rail
 * of real cuts beats a longer one of neither.
 */

import type { Photo } from "@/lib/content/photos";

export interface Cut extends Pick<Photo, "alt"> {
  id: string;
  title: string;
  image: string;
  tall: boolean;
}

export const cuts: Cut[] = [
  {
    id: "cut-taper-beard",
    title: "Taper and Full Beard",
    image: "/photos/cut-beard-taper.jpg",
    alt: "A taper fade blended into a full beard, seen in profile",
    tall: false,
  },
  {
    id: "cut-textured-crop",
    title: "Textured Crop",
    image: "/photos/cut-textured-crop.jpg",
    alt: "A textured curly crop faded at the sides",
    tall: false,
  },
  {
    id: "cut-logo-design",
    title: "Freehand Design",
    image: "/photos/cut-logo-design.jpg",
    alt: "A team logo shaved freehand into the back of a fade",
    tall: true,
  },
  {
    id: "cut-high-fade-beard",
    title: "High Fade and Beard",
    image: "/photos/cut-beard-high-fade.jpg",
    alt: "A high fade with a shaped full beard, seen from the front",
    tall: false,
  },
  {
    id: "cut-hard-part",
    title: "Hard Part",
    image: "/photos/cut-kid-hard-part.jpg",
    alt: "A young client smiling after a fade with a hard part",
    tall: false,
  },
  {
    id: "cut-mid-fade-beard",
    title: "Mid Fade and Beard",
    image: "/photos/cut-beard-mid-fade.jpg",
    alt: "A full beard blended into a mid fade",
    tall: true,
  },
  {
    id: "cut-sharp-line",
    title: "Sharp Line Up",
    image: "/photos/cut-sharp-line.jpg",
    alt: "A clean fade finished with a sharp front line, in profile",
    tall: false,
  },
];
