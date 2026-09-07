import { HAIRSTYLES } from "./catalog";
import type { Hairstyle, Preferences, ScoredStyle, VisualProfile } from "./types";

/*
 * Compatibility scoring. The weights live here, in one configurable place. A
 * stated length preference is a CONTRACT, not a five percent nudge: the weighted
 * score ranks within the requested length pool, and distance from the pool is a
 * hard penalty that only lets neighbours surface when the pool runs dry.
 */
export const WEIGHTS = {
  faceShape: 0.25,
  headShape: 0.2,
  hairTexture: 0.2,
  hairDensity: 0.15,
  proportion: 0.1,
  maintenance: 0.05,
  userPreference: 0.05,
} as const;

const LENGTH_ORDER = ["muy-corto", "corto", "medio", "largo"] as const;

const TEXTURE_EN: Record<string, string> = {
  liso: "straight",
  ondulado: "wavy",
  rizado: "curly",
  "muy-rizado": "coily",
};

const SHAPE_EN: Record<string, string> = {
  oval: "oval",
  rectangular: "rectangular",
  square: "square",
  round: "round",
  heart: "heart shaped",
  diamond: "diamond shaped",
  triangular: "triangular",
};

function lengthPenalty(style: Hairstyle, prefs: Preferences): number {
  if (!prefs.length || prefs.length === "any") return 0;
  const want = LENGTH_ORDER.indexOf(prefs.length as (typeof LENGTH_ORDER)[number]);
  const have = LENGTH_ORDER.indexOf(style.lengthClass);
  return Math.abs(want - have) * 0.35;
}

function faceShapeMatch(style: Hairstyle, p: VisualProfile): number {
  if (style.recommendedFaceShapes.includes(p.face.primaryShape)) return 1;
  if (p.face.secondaryShape && style.recommendedFaceShapes.includes(p.face.secondaryShape)) return 0.6;
  return 0.25;
}

function headShapeMatch(style: Hairstyle, p: VisualProfile): number {
  if (p.head.overallShape === "alargada") {
    return style.volume === "high" ? 0.3 : style.volume === "medium" ? 0.75 : 1;
  }
  if (p.head.overallShape === "corta") {
    return style.volume === "high" ? 1 : style.volume === "medium" ? 0.8 : 0.5;
  }
  return 0.85;
}

function hairTextureMatch(style: Hairstyle, p: VisualProfile): number {
  return style.hairTypes.includes(p.hair.texture) ? 1 : 0.3;
}

function hairDensityMatch(style: Hairstyle, p: VisualProfile): number {
  const order = { baja: 0, media: 1, alta: 2 } as const;
  const need = order[style.needsDensity];
  const have = order[p.hair.density];
  if (have >= need) return 1;
  return need - have === 1 ? 0.55 : 0.2;
}

function proportionMatch(style: Hairstyle, p: VisualProfile): number {
  let s = 0.8;
  const hasFringe = !/none/i.test(style.barber.fringe);
  if (p.head.foreheadSize === "alta" && hasFringe) s = 1;
  if (p.head.foreheadSize === "baja" && hasFringe) s = 0.5;
  if (p.hair.hairline !== "normal" && hasFringe) s = Math.max(s, 0.95);
  if (p.hair.hairline === "retroceso" && /back/i.test(style.gen)) s = 0.35;
  return s;
}

function maintenanceMatch(style: Hairstyle, prefs: Preferences): number {
  if (!prefs.maintenance || prefs.maintenance === "any") return 0.8;
  const cost = { low: 0, "low-medium": 1, medium: 2, high: 3 }[style.maintenance];
  const budget = { minimal: 0, low: 1, medium: 2 }[prefs.maintenance] ?? 3;
  return cost <= budget ? 1 : Math.max(0, 1 - (cost - budget) * 0.4);
}

function userPreferenceMatch(style: Hairstyle, prefs: Preferences): number {
  let s = 0.5;
  if (prefs.style && style.vibes.includes(prefs.style)) s += 0.35;
  if (prefs.fade === "yes") s += style.hasFade ? 0.15 : -0.3;
  if (prefs.fade === "no") s += style.hasFade ? -0.3 : 0.15;
  return Math.max(0, Math.min(1, s));
}

/* Explanations cite the profile and stay hedged. Never an absolute claim. */
function reasonsFor(style: Hairstyle, p: VisualProfile, parts: Record<string, number>): { reasons: string[]; cautions: string[] } {
  const reasons: string[] = [];
  const cautions: string[] = [];
  const tex = TEXTURE_EN[p.hair.texture] || p.hair.texture;

  if (parts.faceShape === 1)
    reasons.push(`From what is visible, your face leans ${SHAPE_EN[p.face.primaryShape]}, and this cut tends to suit that shape.`);
  if (p.head.overallShape === "alargada" && style.volume !== "high")
    reasons.push("Your face reads a little longer than it is wide, so keeping vertical volume in check helps balance it.");
  if (p.head.overallShape === "corta" && style.volume === "high")
    reasons.push("Some height on top will likely stretch the overall shape and sharpen it.");
  if (parts.hairTexture === 1)
    reasons.push(`Your ${tex} hair works with this cut instead of fighting it every morning.`);
  if (parts.hairDensity === 1 && style.needsDensity !== "baja")
    reasons.push("You have enough density to keep this style looking full.");
  if (p.head.foreheadSize === "alta" && parts.proportion === 1)
    reasons.push("A fringe can visually balance a taller forehead.");
  if (style.maintenance === "low")
    reasons.push("Minimal upkeep: it holds its shape for weeks.");

  if (parts.hairDensity <= 0.55)
    cautions.push("This cut asks for more density than your photos suggest, so it may sit flatter than expected.");
  if (parts.hairTexture <= 0.3)
    cautions.push(`It is designed for other textures; with ${tex} hair it would need more product or daily work.`);
  if (p.hair.hairline === "retroceso" && /back/i.test(style.gen))
    cautions.push("Styling backwards exposes the hairline. Worth discussing with your barber.");

  return { reasons: reasons.slice(0, 3), cautions: cautions.slice(0, 2) };
}

export function rankStyles(profile: VisualProfile, prefs: Preferences, catalogue: Hairstyle[] = HAIRSTYLES): ScoredStyle[] {
  return catalogue
    .map((style) => {
      const parts = {
        faceShape: faceShapeMatch(style, profile),
        headShape: headShapeMatch(style, profile),
        hairTexture: hairTextureMatch(style, profile),
        hairDensity: hairDensityMatch(style, profile),
        proportion: proportionMatch(style, profile),
        maintenance: maintenanceMatch(style, prefs),
        userPreference: userPreferenceMatch(style, prefs),
      };
      const weighted =
        parts.faceShape * WEIGHTS.faceShape +
        parts.headShape * WEIGHTS.headShape +
        parts.hairTexture * WEIGHTS.hairTexture +
        parts.hairDensity * WEIGHTS.hairDensity +
        parts.proportion * WEIGHTS.proportion +
        parts.maintenance * WEIGHTS.maintenance +
        parts.userPreference * WEIGHTS.userPreference;
      const score = Math.max(0.05, Math.min(0.99, weighted - lengthPenalty(style, prefs)));
      const { reasons, cautions } = reasonsFor(style, profile, parts);
      return { style, score, reasons, cautions };
    })
    .sort((a, b) => b.score - a.score);
}
