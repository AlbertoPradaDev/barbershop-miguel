/*
 * Review wall content. `initial` is stored rather than derived so the avatar
 * chip never depends on string slicing at render time.
 *
 * These are the client's REAL Booksy reviews, copied verbatim on 2026-08-24,
 * including the Spanish ones and the emoji: the shop serves a bilingual
 * clientele and the barber answers in both, so flattening them to English would
 * misrepresent the place. Nothing here is edited for length or tone. The
 * profile stood at 5.0 from 123 reviews, 122 of them five star.
 *
 * `date` is an absolute date, not a "2 months ago" string. Relative time is
 * baked into a static build and starts lying the day after it ships.
 */

export interface Review {
  id: string;
  author: string;
  initial: string;
  /** Absolute, so it cannot go stale in a static build. */
  date: string;
  rating: 5;
  text: string;
}

export const reviews: Review[] = [
  {
    id: "review-zach",
    author: "Zach",
    initial: "Z",
    date: "Aug 10, 2026",
    rating: 5,
    text: "I have been going to Miguel for a few years now and always happy with my cut! He is very professional and friendly and takes great care to make sure I'm happy! 10/10 would recommend!",
  },
  {
    id: "review-miguel",
    author: "Miguel",
    initial: "M",
    date: "Aug 13, 2026",
    rating: 5,
    text: "Miguel does a fantastic job! Pays attention to detail and puts his clients first every time. I would and have recommended him.",
  },
  {
    id: "review-yamalier",
    author: "Yamalier",
    initial: "Y",
    date: "Aug 7, 2026",
    rating: 5,
    text: "Miguel does a great job, very clean enviroment, super nice guy. I will definitely keep coming.",
  },
  {
    id: "review-jda",
    author: "JD.A",
    initial: "J",
    date: "Aug 14, 2026",
    rating: 5,
    text: "Cool dude and he cuts clean and fast been going to him since I was in high school",
  },
  {
    id: "review-krysdalia",
    author: "Krysdalia",
    initial: "K",
    date: "Aug 16, 2026",
    rating: 5,
    text: "My boys always looking forward to getting their haircuts.",
  },
  {
    id: "review-julio",
    author: "Julio",
    initial: "J",
    date: "Aug 12, 2026",
    rating: 5,
    text: "Excelente servicio muy buen corte de cabello",
  },
];
