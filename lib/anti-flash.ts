/*
 * The one inline script on the site, and the single source of its text.
 *
 * It hides [data-masked] copy before first paint so a line-reveal animation
 * never shows its pre-animation state, and it is a SCRIPT rather than a rule in
 * globals.css on purpose: a stylesheet rule would hide that copy permanently
 * for anyone with JavaScript disabled, where a script simply never runs and the
 * text stays visible. That trade is the whole reason this file exists.
 *
 * It lives in its own module so the one piece of inline JavaScript on the site
 * is named, explained and greppable, rather than a string buried in the middle
 * of a layout file.
 *
 * It was briefly hashed for the Content-Security-Policy. That is no longer the
 * case, and the reason is worth keeping: the App Router streams its RSC payload
 * through inline scripts of its own that cannot be hashed, so a hash-based
 * script-src refused THOSE, hydration failed, and the page shipped as dead
 * markup. See the long note in next.config.ts. If this site ever moves to a
 * nonce-based policy, this constant is where the hashing would hook back in.
 */
export const ANTI_FLASH_SCRIPT =
  "document.head.appendChild(Object.assign(document.createElement('style'),{textContent:'[data-masked]{visibility:hidden}'}))";
