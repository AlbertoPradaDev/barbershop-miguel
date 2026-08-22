/*
 * Photography source of truth. Every frame is a hotlinked Pexels photo built by
 * `pexels(id, width)`, so swapping a picture means swapping one number. Each
 * entry is commented with what the frame actually shows, and every id below has
 * been opened and looked at, not just status checked.
 *
 * URL shape: images.pexels.com/photos/<id>/pexels-photo-<id>.jpeg?...&w=<width>
 * The CDN scales on width only, so intrinsic ratios vary. Consumers use
 * next/image `fill` plus a container aspect ratio, and the `orientation` field
 * says which way a frame leans so it can be placed where it will crop well.
 */

export type Orientation = "portrait" | "landscape";

export interface Photo {
  /** Pexels photo id, the only value you need to change to swap the image. */
  id: number;
  src: string;
  /** Real English, read aloud by screen readers, so never lorem ipsum. */
  alt: string;
  orientation: Orientation;
}

/** Builds a width scaled Pexels CDN url for a photo id. */
export function pexels(id: number, w: number): string {
  return `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`;
}

/**
 * About section. Two uprights and one wide, so a layout can pair the tall
 * frames and let the wide one run full bleed underneath.
 */
export const aboutPhotos: Photo[] = [
  {
    // Vintage red leather barber chair beside a storefront window, wood floor.
    id: 12505400,
    src: pexels(12505400, 900),
    alt: "Vintage red leather barber chair beside the shop window",
    orientation: "portrait",
  },
  {
    // Barber and caped client at a mirror station, CUT BARBERSHOP window sign.
    id: 4625617,
    src: pexels(4625617, 900),
    alt: "Barber standing with a caped client at the mirror station",
    orientation: "portrait",
  },
  {
    // Wide shop floor: exposed brick, two chairs, wash basin, framed prints.
    id: 7518739,
    src: pexels(7518739, 1600),
    alt: "Wide view of the shop floor with brick walls and two barber chairs",
    orientation: "landscape",
  },
];

/**
 * Mobile menu backdrop. Dark, texture heavy frames with no faces, so nav labels
 * stay readable on top of them.
 */
export const menuPhotos: Photo[] = [
  {
    // Row of barber scissors hanging on a dark walnut wall rack.
    id: 1319460,
    src: pexels(1319460, 720),
    alt: "Barber scissors hanging in a row on a wooden rack",
    orientation: "landscape",
  },
  {
    // Station counter laid with clippers, guards, combs and brushes on a towel.
    id: 7518717,
    src: pexels(7518717, 720),
    alt: "Clippers, guards and combs laid out on a station towel",
    orientation: "portrait",
  },
  {
    // Clippers on white subway tile above shave soap, neon glow at the edge.
    id: 11213193,
    src: pexels(11213193, 720),
    alt: "Clippers hanging on white tile above shave soap tins",
    orientation: "portrait",
  },
];

/** Street level shopfront, used where the map cannot load. */
export const mapFallback: Photo = {
  // Painted BARBER SHOP fascia with a spinning pole and a price board.
  id: 37514899,
  src: pexels(37514899, 1200),
  alt: "Painted barber shop sign above the door with a barber pole beside it",
  orientation: "landscape",
};
