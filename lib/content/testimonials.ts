/*
 * Review wall content. `initial` is stored rather than derived so the avatar
 * chip never depends on string slicing at render time, and every review is a
 * five star review by design of the placeholder set.
 */

export interface Review {
  id: string;
  author: string;
  initial: string;
  timeAgo: string;
  rating: 5;
  text: string;
}

export const reviews: Review[] = [
  {
    id: "review-1",
    author: "Jordan Miller",
    initial: "J",
    timeAgo: "2 months ago",
    rating: 5,
    text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor. Incididunt ut labore et dolore magna aliqua enim ad minim veniam.",
  },
  {
    id: "review-2",
    author: "Alicia Barnes",
    initial: "A",
    timeAgo: "3 weeks ago",
    rating: 5,
    text: "Quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum.",
  },
  {
    id: "review-3",
    author: "Marcus Webb",
    initial: "M",
    timeAgo: "1 month ago",
    rating: 5,
    text: "Excepteur sint occaecat cupidatat non proident sunt in culpa qui officia. Deserunt mollit anim id est laborum sed ut perspiciatis unde omnis.",
  },
  {
    id: "review-4",
    author: "Rachel Nguyen",
    initial: "R",
    timeAgo: "5 months ago",
    rating: 5,
    text: "Iste natus error sit voluptatem accusantium doloremque laudantium totam rem. Aperiam eaque ipsa quae ab illo inventore veritatis et quasi architecto.",
  },
  {
    id: "review-5",
    author: "Ethan Brooks",
    initial: "E",
    timeAgo: "6 days ago",
    rating: 5,
    text: "Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit. Sed quia consequuntur magni dolores eos qui ratione voluptatem sequi.",
  },
  {
    id: "review-6",
    author: "Sofia Ramirez",
    initial: "S",
    timeAgo: "4 months ago",
    rating: 5,
    text: "Neque porro quisquam est qui dolorem ipsum quia dolor sit amet consectetur. Adipisci velit sed quia non numquam eius modi tempora incidunt ut labore.",
  },
];
