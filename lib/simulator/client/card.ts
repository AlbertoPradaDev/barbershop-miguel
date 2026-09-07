import type { Hairstyle } from "../types";
import { SITE } from "@/lib/content/site";

/*
 * The shareable result card: front hero with a dark rounded spec panel top
 * right, and a three-view strip along the bottom (left side, right profile,
 * back). Pure canvas, no dependencies, no model call: the text is DRAWN, never
 * generated, so the guard numbers are always exactly what the spec says. The
 * visible AI line at the foot is a deliberate disclosure, not decoration.
 * Set in the site's single family (Instrument Sans via --font-body) with the
 * gold from --page-star for the panel headings.
 */

const W = 1080;
const H = 1620;
const STRIP_H = 430;
const GAP = 8;
const PAPER = "#ffffff";
const INKDARK = "rgba(5,5,5,0.84)";

export interface CardImages {
  hero: string;
  left?: string;
  right?: string;
  back?: string;
}

function cover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const s = Math.max(w / img.width, h / img.height);
  const sw = w / s;
  const sh = h / s;
  ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) * 0.35, sw, sh, x, y, w, h);
}

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function load(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error("card: could not load image"));
    i.src = src;
  });
}

/* next/font registers the family under an internal name; resolve the real
   values from the live document instead of hardcoding names canvas cannot see. */
function resolveTheme() {
  const root = getComputedStyle(document.documentElement);
  return {
    body: root.getPropertyValue("--font-body").trim() || "sans-serif",
    gold: root.getPropertyValue("--page-star").trim() || "#a97d18",
  };
}

const MAINT_EN: Record<Hairstyle["maintenance"], string> = {
  low: "Low, holds for weeks",
  "low-medium": "Low to medium",
  medium: "Medium, monthly touch up",
  high: "High, frequent touch ups",
};

export async function renderCard(
  images: CardImages,
  style: Hairstyle,
  opts: { mock?: boolean } = {}
): Promise<string> {
  const [hero, left, right, back] = await Promise.all([
    load(images.hero),
    images.left ? load(images.left) : null,
    images.right ? load(images.right) : null,
    images.back ? load(images.back) : null,
  ]);
  const T = resolveTheme();

  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext("2d")!;

  const heroH = H - STRIP_H - GAP;
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, H);
  cover(ctx, hero, 0, 0, W, heroH);

  const cells: { img: HTMLImageElement | null; label: string | null; missing: string }[] = [
    { img: left, label: "left side", missing: "left side" },
    { img: right, label: "right profile", missing: "right profile" },
    { img: back, label: back ? "back view, illustrative" : null, missing: "back view" },
  ];
  const cw = (W - 2 * GAP) / 3;
  cells.forEach((c, i) => {
    const x = i * (cw + GAP);
    if (c.img) {
      cover(ctx, c.img, x, heroH + GAP, cw, STRIP_H);
      if (c.label) {
        ctx.fillStyle = "rgba(5,5,5,0.62)";
        ctx.fillRect(x, heroH + GAP, cw, 34);
        ctx.fillStyle = "#f2f2f2";
        ctx.font = `500 17px ${T.body}`;
        ctx.textAlign = "center";
        ctx.fillText(c.label, x + cw / 2, heroH + GAP + 23);
      }
    } else {
      ctx.fillStyle = "#e9e9e9";
      ctx.fillRect(x, heroH + GAP, cw, STRIP_H);
      ctx.fillStyle = "#8a8a8a";
      ctx.font = `500 22px ${T.body}`;
      ctx.textAlign = "center";
      ctx.fillText(c.missing, x + cw / 2, heroH + GAP + STRIP_H / 2 - 6);
      ctx.fillText("not available", x + cw / 2, heroH + GAP + STRIP_H / 2 + 24);
    }
  });

  /* spec panel, top right */
  const P = { x: W - 440 - 36, y: 40, w: 440, pad: 30 };
  type Line = { t: string; kind: "head" | "val" };
  const lines: Line[] = [];
  const sec = (t: string) => lines.push({ t, kind: "head" });
  const val = (t: string) => lines.push({ t, kind: "val" });
  const bullet = (t: string) => lines.push({ t: "· " + t, kind: "val" });

  sec("STYLE:");
  val(style.name);
  sec("FADE:");
  val(style.barber.fade);
  sec("LENGTH:");
  val("Top " + style.barber.top);
  val("Sides " + style.barber.sides);
  sec("MAINTENANCE:");
  val(MAINT_EN[style.maintenance]);
  sec("DETAILS:");
  bullet("Fringe: " + style.barber.fringe.toLowerCase());
  bullet("Texture: " + style.barber.texture.toLowerCase());
  bullet("Finish: " + style.barber.finish.toLowerCase());

  /* canvas never wraps text itself: wrap by measurement BEFORE sizing the panel */
  ctx.font = `400 24px ${T.body}`;
  const maxW = P.w - 2 * P.pad;
  const wrapped: Line[] = [];
  for (const l of lines) {
    if (l.kind === "head" || ctx.measureText(l.t).width <= maxW) {
      wrapped.push(l);
      continue;
    }
    const words = l.t.split(" ");
    let curLine = "";
    for (const wd of words) {
      const test = curLine ? curLine + " " + wd : wd;
      if (ctx.measureText(test).width <= maxW) curLine = test;
      else {
        if (curLine) wrapped.push({ t: curLine, kind: "val" });
        curLine = "  " + wd;
      }
    }
    if (curLine) wrapped.push({ t: curLine, kind: "val" });
  }

  const TITLE_H = 96;
  const HEAD_H = 44;
  const VAL_H = 33;
  const SEC_GAP = 10;
  let ph = P.pad + TITLE_H + 8;
  for (const l of wrapped) ph += l.kind === "head" ? HEAD_H + (l === wrapped[0] ? 0 : SEC_GAP) : VAL_H;
  ph += P.pad - 6;

  ctx.save();
  rr(ctx, P.x, P.y, P.w, ph, 20);
  ctx.fillStyle = INKDARK;
  ctx.fill();
  ctx.restore();

  ctx.textAlign = "center";
  ctx.fillStyle = T.gold;
  ctx.font = `700 34px ${T.body}`;
  ctx.fillText("YOUR PERFECT CUT", P.x + P.w / 2, P.y + P.pad + 50);
  ctx.strokeStyle = "rgba(169,125,24,0.45)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(P.x + P.pad + 30, P.y + P.pad + 92);
  ctx.lineTo(P.x + P.w - P.pad - 30, P.y + P.pad + 92);
  ctx.stroke();

  ctx.textAlign = "left";
  let y = P.y + P.pad + TITLE_H + 8;
  for (const l of wrapped) {
    if (l.kind === "head") {
      y += (y === P.y + P.pad + TITLE_H + 8 ? 0 : SEC_GAP) + HEAD_H;
      ctx.fillStyle = T.gold;
      ctx.font = `700 25px ${T.body}`;
      ctx.fillText(l.t, P.x + P.pad, y - 12);
    } else {
      y += VAL_H;
      ctx.fillStyle = "#f4f4f4";
      ctx.font = `400 24px ${T.body}`;
      ctx.fillText(l.t, P.x + P.pad, y - 8);
    }
  }

  /* shop badge, bottom left over the hero */
  ctx.font = `700 27px ${T.body}`;
  ctx.fillStyle = "rgba(5,5,5,0.62)";
  rr(ctx, 24, heroH - 74, 20 + ctx.measureText(SITE.shortName).width * 1.55, 50, 12);
  ctx.fill();
  ctx.fillStyle = "#f4f4f4";
  ctx.fillText(SITE.shortName, 42, heroH - 40);

  /* mock mode composes a card of unmodified photos: brand it so it can never
     pass as a real preview */
  if (opts.mock) {
    ctx.save();
    ctx.translate(W / 2, heroH / 2);
    ctx.rotate(-0.35);
    ctx.font = `800 72px ${T.body}`;
    ctx.fillStyle = "rgba(163,15,34,0.55)";
    ctx.textAlign = "center";
    ctx.fillText("TEST PREVIEW", 0, 0);
    ctx.restore();
  }

  /* visible AI disclosure, on the image itself */
  ctx.fillStyle = "rgba(5,5,5,0.85)";
  ctx.fillRect(0, H - 40, W, 40);
  ctx.fillStyle = "#d9d9d9";
  ctx.font = `500 19px ${T.body}`;
  ctx.textAlign = "center";
  ctx.fillText("AI generated preview, for guidance only · " + SITE.name, W / 2, H - 13);

  return cv.toDataURL("image/jpeg", 0.92);
}
