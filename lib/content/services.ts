/*
 * Service menu. Read by the services section and by any price list in the
 * footer. Prices and durations are display strings so the layout never has to
 * format numbers at render time.
 *
 * Names, prices and durations are the client's real Booksy menu, read
 * 2026-08-24. Booksy carries no per service description, so the blurbs are
 * written here: they describe only what the service name already says and make
 * no claim about products, technique or guarantees that the client has not
 * made himself.
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
    id: "regular-cut",
    name: "Regular Cut",
    blurb:
      "The haircut on its own, taken at a pace that leaves room to get the shape right and to finish clean.",
    price: "$45",
    duration: "45 min",
  },
  {
    id: "full-cut",
    name: "Full Cut",
    blurb:
      "The haircut with the beard worked in, or with a shave. One appointment, everything squared away.",
    price: "$50",
    duration: "50 min",
  },
  {
    id: "head-shave-beard",
    name: "Head Shave and Beard Trim",
    blurb:
      "A clean head shave with the beard shaped and tidied to match it.",
    price: "$40",
    duration: "40 min",
  },
  {
    id: "kids-cut",
    name: "Kids Cut",
    blurb:
      "For ages 2 to 15, unhurried and relaxed, so a young client leaves happy with it.",
    price: "$40",
    duration: "40 min",
  },
  {
    id: "line-up",
    name: "Line Up or Beard Maintenance",
    blurb:
      "The quick one between cuts: edges put back where they belong, or the beard brought back into line.",
    price: "$25",
    duration: "30 min",
  },
];
