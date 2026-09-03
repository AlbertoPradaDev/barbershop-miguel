<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Barbershop build spec (read before writing any code)

Premium barbershop marketing site, US client. Mobile-first, dark/light theme with manual toggle, fully animated, performance-critical on phones. Stack: Next.js 16 + React 19 + TS + Tailwind v4 (CSS-first, no tailwind.config) + GSAP + Lenis. GSAP ONLY: framer-motion is forbidden.

## Hard bans (user's explicit list, apply to ALL visible copy and design)

1. No em/en dashes and no `--`/`---` as punctuation in any user-visible copy.
2. No numbered cards (no 01/02/03 labels on cards or list items).
3. No scroll indicators of any kind.
4. No meaningless metrics or stat counters.
5. No small uppercase eyebrow/kicker text above section headings.
6. Hero title: no italics, no styled spans inside it.
7. No arrows inside buttons. ONE exception, granted by the client: the review carousel's previous/next controls are arrow buttons. Nowhere else.
8. No monospace anywhere. The typewriter look is banned: the site is set in one family (Instrument Sans). There is no `font-mono` utility and no mono font loaded.

## Conventions (mirror of C:\Users\alber\Documents\Workspace\portfolio)

- All GSAP imports come from `@/lib/gsap` (single registration point), NEVER from `"gsap"` directly.
- Animation cleanup: `useGSAP(() => {...}, { scope: ref })` from `@gsap/react`. Manual listeners return cleanup inside the callback.
- Guard pattern in every animated component: check `prefers-reduced-motion` (and `(hover: hover) and (pointer: fine)` where hover matters); when guarded, `gsap.set` the final state and return early.
- Only animate transform / opacity (filter only behind a fine-pointer gate). `will-change` narrowly.
- No ScrollTrigger pins on coarse pointers: rails degrade to native `overflow-x-auto`.
- Fluid artboard: spacing utilities are design px on a 1920 (desktop) / 390 (mobile) artboard. ONE breakpoint only: `max-md:` (mobile overrides desktop). Type utilities are used in pairs: `text-h2 max-md:text-mh2`.
- Theme tokens via `html[data-theme="dark|light"]` CSS vars mapped in `@theme inline`: use `bg-page-bg`, `text-page-text`, `text-muted`, `border-line`, `bg-panel`, `text-accent`, `bg-ink`, `text-bone` utilities. NEVER hardcode colors in components.
- kebab-case filenames, PascalCase named exports, no default exports for components. `"use client"` only where GSAP/state/DOM is needed.
- Every component file opens with a short `/* */` comment stating intent + exact motion recipe.
- Content: cross-cutting data in typed modules `lib/content/*.ts`; single-use microcopy as `const` at top of the section file. Copy is lorem ipsum; functional microcopy (nav labels, "Book now") in real English.
- Shared files `app/layout.tsx` and `app/page.tsx` are wired by the orchestrator ONLY. Subagents never edit them; report what needs wiring instead.
- No global CSS edits by section agents; use Tailwind utilities (arbitrary values allowed). Keyframes needed by sections already exist in globals.css.
- next/image with explicit `sizes`; `priority` only in the hero. Placeholder photos: `https://picsum.photos/seed/<seed>/<w>/<h>`.
- Budgets: DOM < 1000 nodes total, first-load JS < 250KB gz.

## Surface style (Revolut register, measured from revolut.com)

The UI language for borders and surfaces, on top of everything above:

- **Zero shadows.** revolut.com has literally no `box-shadow` on any element. Depth comes from outlines and flat color, never from blur.
- **Chunky outlines, not hairlines, on CARDS ONLY.** Cards and panels use a 2px border in `border-line-strong` (`--page-line-strong`: white at 30% on dark, near-black at 26% on light). The 1px `border-line` stays for dividing rules inside a surface (table rows, list separators). **Buttons and images carry no border at all**: photo plates meet the page directly and the primary button is a solid fill.
- **One radius scale**, exposed as utilities: `rounded-btn` (12 artboard px, small chips and fields), `rounded-card` (20, cards and panels), `rounded-media` (24, image plates and the map). Buttons and the floating controls are fully round (`rounded-full`).
- **Outlined cards over filled ones.** Prefer a transparent or `bg-page-bg` surface with the 2px outline; use a filled `bg-panel` only when a block must recede. Full-bleed dark bands run edge to edge with radius 0.
- **Tight display typography**: h0 tracking -0.025em, h1/h2 -0.022em, line-height 1 on the display size.
- **Spacing inside surfaces** in steps of 8: 8 / 16 / 24 / 32 artboard px for gaps, 24 to 48 for card padding.

Buttons follow this too, in two registers only:
- **Primary** = `PillButton variant="solid"`: solid accent capsule (`rounded-full`), no border, circle-fill flood on hover.
- **Secondary** = `PillButton variant="outline"` or `"draw"` (both render the same): no box at all, just the label with the nav's `.underline-link` rule wiping in from the left.
- No bounce/elastic easing on any button or magnetic release.
- The floating theme and WhatsApp controls are round, borderless and have **no hover state at all**: only `:focus-visible` responds.
- **No transition bands between sections.** Sections sit directly against each other; content still animates in and out on scroll, but nothing is inserted at the seams.


## Haircut simulator (/simulator), added 2026-09-02

AI try-on ported from Steven's CorteAI build: three photos with an on-device face gate,
a vision analysis, a ranked recommendation over `lib/simulator/catalog.ts` (twenty
styles), four generated views per cut (front/left/right anchored on that angle's own
photo, back derived from both profiles and labelled illustrative), a drag before/after
comparator, a compare picker, a barber card and a shareable canvas card.

Invariants that look odd but are load bearing:

- `script-src 'wasm-unsafe-eval'` in next.config.ts exists for the MediaPipe validator
  (self-hosted under `public/vendor`, ~23MB, lazy-loaded). Without it the wasm is
  refused silently and the face gate degrades to accepting anything.
- The landmarker loads via a NATIVE dynamic import with `webpackIgnore`/`turbopackIgnore`
  comments and a variable specifier: a Function-wrapped import is eval and the CSP
  rightly refuses it; a bare literal would get bundled or break type checking.
- The card blob is decoded by hand (atob): `fetch()` of a data: URL falls under
  `connect-src 'self'` and is refused by the CSP.
- `decide()` in opening-sequence.tsx gates the intro to `pathname === "/"`: on any
  other route the timeline used to bail on the missing hero AFTER phase was already
  "run", leaving the fixed z-81 panels mounted and silently eating every pointer event.
- navbar/mobile-menu/footer link handlers pass non-hash hrefs through untouched; the
  smooth-scroll interception is for in-page anchors only.
- `simulator-flow.tsx` reads photos/analysis through refs, never closure state: the
  flow schedules its own retries and a stale closure re-enters with empty photos and
  dies silently. Failed views re-fire once automatically; the simulate route tries the
  primary provider twice then the fallback (`SIM_FAIL_ONCE` / `SIM_FAIL_PROVIDER` are
  inert test injectors for proving that ladder, never set them in a real serve).
- Internal profile enum values are Spanish (they are the vision schema contract shared
  with the catalog's hairTypes); the UI translates for display in sim-results only.

Env: see `.env.example`. With no keys the simulator runs in a labelled TEST mode, free.
Live costs money: about $0.01 per analysis and $0.12 per cut (four views via KIE).
QA: `rubric/qa-harnesses/barbershop-miguel/simulator-qa.mjs` (31 checks, MOCK only)
plus `_home-regression.mjs`. On Steven's machine builds need `npx next build --webpack`.

### Improvement log (added 2026-09-03)

`NEXT_PUBLIC_SIM_STORE=1` (BUILD-time flag) saves every CONSENTED simulator
session (the capture step gains an optional checkbox; without the tick nothing
is stored, even with the flag on). Two backends behind one seam in
`lib/simulator/history.ts`: **Vercel Blob** when `BLOB_READ_WRITE_TOKEN` is
present (store `mrsociety-simulator-log`, access PRIVATE so bare URLs answer
403; the token is already connected to this project in all three Vercel
environments, so the deployed site and local serves write to the SAME dataset),
falling back to the local filesystem at `data/simulator-sessions/`
(`SIM_STORE_BACKEND=fs` forces it, which is also how the full QA suite runs so
it does not burn Blob operations). Blob has no append, so verdicts and
generation metadata are one small JSON object per event. Watch the free-tier
operation quota: the review page is capped at twelve sessions per load for
that reason. Each session stores: the three input photos, `analysis.json`
(profile, preferences, ranking), every generated view with provider and attempt
metadata (`generations.jsonl`), the card, and append-only human verdicts
(`feedback.jsonl`, written by the "Looks right / Looks off" chips under each
generated view). Review at `/simulator/history` (404s when the flag is off).
The same flag flips every privacy line in the UI, so copy and behaviour cannot
disagree. It must stay OFF in production: the serverless filesystem is
ephemeral, and storing visitor photos would need a consent flow first. The log
is for improving the product by hand, prompts, gates and scoring reviewed
against real results; nothing retrains automatically.
