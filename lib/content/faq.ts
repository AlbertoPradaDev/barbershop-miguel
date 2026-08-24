/*
 * FAQ source. Questions stay in real English because they double as the
 * FAQPage structured data crawlers read.
 *
 * Every answer below is the client's REAL policy, taken from the Booking
 * Policies and Amenities on his Booksy profile on 2026-08-24. The questions
 * were rewritten to match the policies he actually publishes: the previous set
 * asked about walk ins, products and group bookings, and he states nothing
 * about any of those, so answering them would have meant inventing shop policy.
 * If he wants those questions on the page, get the answers from him first.
 */

export interface Faq {
  q: string;
  a: string;
}

export const faqs: Faq[] = [
  {
    q: "Do I need an appointment?",
    a: "Yes, book your chair through Booksy. The calendar is open 24 hours a day, so you can pick a slot whenever it suits you rather than calling during opening hours.",
  },
  {
    q: "What payment do you take?",
    a: "Cash, Apple Pay, Apple Cash and Zelle. Payment is due after the service, so there is nothing to settle when you arrive.",
  },
  {
    q: "What if I need to cancel or reschedule?",
    a: "Cancel or move your appointment at least 2 hours ahead. If something urgent comes up, get in touch as early as you can. A no call, no show carries a $20 fee, and unpaid fees block further bookings.",
  },
  {
    q: "What time should I arrive?",
    a: "On time. Each appointment is booked to the minute it needs, so arriving late runs into the next client's slot.",
  },
  {
    q: "Is there parking?",
    a: "Yes, there is parking at the studio on Spring Forest Road, so you can park and walk straight in.",
  },
  {
    q: "Can I take calls during my cut?",
    a: "No phones during the haircut, please. Precision work needs your head still, and it is the difference between a good line and a crooked one.",
  },
];
