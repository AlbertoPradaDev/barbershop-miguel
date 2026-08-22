/*
 * Service menu. Read by the services section and by any price list in the
 * footer. Prices and durations are display strings so the layout never has to
 * format numbers at render time.
 */

export interface Service {
  id: string;
  name: string;
  blurb: string;
  price: string;
  duration: string;
}

export const services: Service[] = [
  {
    id: "classic-cut",
    name: "Classic Cut",
    blurb:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore.",
    price: "$45",
    duration: "45 min",
  },
  {
    id: "skin-fade",
    name: "Skin Fade",
    blurb:
      "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo.",
    price: "$50",
    duration: "50 min",
  },
  {
    id: "beard-trim",
    name: "Beard Trim",
    blurb:
      "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
    price: "$30",
    duration: "30 min",
  },
  {
    id: "hot-towel-shave",
    name: "Hot Towel Shave",
    blurb:
      "Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est.",
    price: "$55",
    duration: "45 min",
  },
  {
    id: "cut-and-beard",
    name: "Cut and Beard",
    blurb:
      "Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium totam.",
    price: "$70",
    duration: "75 min",
  },
  {
    id: "kids-cut",
    name: "Kids Cut",
    blurb:
      "Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit sed quia consequuntur magni.",
    price: "$32",
    duration: "30 min",
  },
];
