/*
 * Photography source of truth.
 *
 * Every frame is the CLIENT'S OWN photograph, published on his Booksy profile
 * and pulled down on 2026-08-24, re-encoded once and served from /public/photos
 * rather than hotlinked. Self hosted on purpose: hotlinking Booksy's CDN would
 * put the site's imagery on a third party's storage, break the moment they move
 * a key, and lean on bandwidth that is not ours.
 *
 * The thirteen review photos on the Booksy profile are deliberately NOT here.
 * Those were uploaded by clients writing reviews, so they are the reviewers'
 * pictures to license, not the shop's.
 *
 * Alt text is real English, read aloud by screen readers, so never lorem ipsum,
 * and it describes the CUT, since that is the information a sighted visitor is
 * getting from these frames.
 */

export type Orientation = "portrait" | "landscape" | "square";

export interface Photo {
  /** Stable key. Consumers render lists off this rather than off the path. */
  id: string;
  src: string;
  /** Real English, read aloud by screen readers, so never lorem ipsum. */
  alt: string;
  orientation: Orientation;
}

/** Everything lives under /public/photos, so a path is all a consumer needs. */
const p = (name: string) => `/photos/${name}.jpg`;

/* The barber himself. Both of these are photographs of Miguel, and they are the
   only two frames on the site with a recognisable face doing the work. */
export const miguelPortrait: Photo = {
  id: "miguel-portrait",
  src: p("miguel-portrait"),
  alt: "Miguel Rangel, arms folded, in a black cap and t-shirt",
  orientation: "square",
};

export const miguelAtWork: Photo = {
  id: "miguel-at-work",
  src: p("miguel-at-work"),
  alt: "Miguel lining up a client's hair, clippers in a gloved hand",
  orientation: "landscape",
};

/*
 * About section. The layout destructures this as [upright, upright, wide], so
 * the ORDER here is the layout: change it and the plates change places. The
 * third frame carries the room itself (chairs, mirrors, the ceiling lights),
 * which is what the wide plate is there to show.
 */
export const aboutPhotos: Photo[] = [
  {
    id: "cut-braids-beard",
    src: p("cut-braids-beard"),
    alt: "Braided cornrows finished with a lined beard",
    orientation: "portrait",
  },
  {
    id: "cut-locs-design",
    src: p("cut-locs-design"),
    alt: "Locs tied up above a shaved design at the temple",
    orientation: "portrait",
  },
  {
    id: "cut-design-kid",
    src: p("cut-design-kid"),
    alt: "A freehand design cut into a young client's fade, the shop floor behind",
    orientation: "portrait",
  },
];

/*
 * Backdrop layers behind the mobile menu's ink panel: three frames that ken
 * burns and crossfade under the nav links. Purely decorative, rendered
 * aria-hidden with empty alt, which is why these reuse frames that already
 * appear elsewhere on the page. There are twelve business owned photographs in
 * total and every one is doing a job; borrowing three for a blurred backdrop
 * behind a menu costs nothing, where padding a visible gallery with repeats
 * would have been obvious.
 */
export const menuPhotos: Photo[] = [
  miguelAtWork,
  {
    id: "menu-braids",
    src: p("cut-braids-beard"),
    alt: "",
    orientation: "portrait",
  },
  {
    id: "menu-crop",
    src: p("cut-textured-crop"),
    alt: "",
    orientation: "square",
  },
];

/*
 * The six plates that fan out in the opening sequence. A spread rather than a
 * theme: the barber at work, two designs, a beard, a kid and a crop, so the
 * stack reads as a body of work in the couple of seconds it is on screen.
 * Decorative and rendered aria-hidden inside the panel, so these repeat frames
 * that appear elsewhere without competing with them.
 */
export const preloaderPhotos: Photo[] = [
  miguelAtWork,
  { id: "pre-locs", src: p("cut-locs-design"), alt: "", orientation: "portrait" },
  { id: "pre-logo", src: p("cut-logo-design"), alt: "", orientation: "portrait" },
  { id: "pre-taper", src: p("cut-beard-taper"), alt: "", orientation: "square" },
  { id: "pre-kid", src: p("cut-kid-hard-part"), alt: "", orientation: "square" },
  { id: "pre-crop", src: p("cut-textured-crop"), alt: "", orientation: "square" },
];
