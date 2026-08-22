/*
 * Gallery source. `tall` drives the masonry rhythm: tall tiles are 3:4, the
 * rest are square. Photography is real barber work hotlinked from the Pexels
 * CDN through `pexels()`; upright frames sit in the tall slots and wider frames
 * in the square ones so next/image `fill` crops into each card cleanly. Each id
 * is commented with what it shows so a single tile can be swapped later.
 */

import { pexels } from "@/lib/content/photos";

export interface Cut {
  id: string;
  title: string;
  image: string;
  tall: boolean;
}

export const cuts: Cut[] = [
  {
    id: "cut-1",
    title: "Low Fade",
    // Barber working a comb through the top while a low fade sits underneath.
    image: pexels(2076930, 900),
    tall: true,
  },
  {
    id: "cut-2",
    title: "Textured Crop",
    // Scissors over comb cutting into a textured top, hands close on the frame.
    image: pexels(1805600, 900),
    tall: false,
  },
  {
    id: "cut-3",
    title: "Skin Fade",
    // Comb and tattooed hands lifting hair above a tight skin fade.
    image: pexels(1570807, 900),
    tall: false,
  },
  {
    id: "cut-4",
    title: "Classic Taper",
    // Barber in a felt hat throwing a striped cape, mirror bulbs behind.
    image: pexels(3998407, 900),
    tall: true,
  },
  {
    id: "cut-5",
    title: "Slick Back",
    // Clipper and comb finishing the nape on a short back and sides.
    image: pexels(3356174, 900),
    tall: false,
  },
  {
    id: "cut-6",
    title: "Pompadour",
    // Scissors shaping the side of a full beard, client in profile.
    image: pexels(3998429, 900),
    tall: true,
  },
  {
    id: "cut-7",
    title: "Buzz Cut",
    // Clippers running up the back of a short cut, close crop on the neckline.
    image: pexels(33448216, 900),
    tall: false,
  },
  {
    id: "cut-8",
    title: "Mid Fade",
    // Black and white frame of clippers taking down the side of a crop.
    image: pexels(35157693, 900),
    tall: true,
  },
  {
    id: "cut-9",
    title: "Crew Cut",
    // Gloved hands razoring a clean hairline on a short cut.
    image: pexels(897262, 900),
    tall: false,
  },
  {
    id: "cut-10",
    title: "Beard Shape Up",
    // Straight razor laying in a beard line, moody low light.
    image: pexels(2014808, 900),
    tall: true,
  },
];
