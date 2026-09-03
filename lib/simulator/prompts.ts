import type { Angle, Hairstyle, SimAngle } from "./types";

/*
 * Prompt builders for the vision analysis and the image generation. Each view is
 * anchored on the visitor's OWN photo of that angle (a fade is only visible from
 * the side), and the retouch framing measured several times less identity drift
 * than open-ended edit prompts.
 */

const ANGLE_NOTE: Record<Angle, string> = {
  front: "Keep the exact same head angle and framing as the reference photo.",
  left: `Keep the exact same head angle and framing as the reference photo, which shows the LEFT
side of the head. The taper on this side must be clearly visible and correctly graduated. This
view exists specifically to show the fade.`,
  right: `Keep the exact same head angle and framing as the reference photo, which shows the RIGHT
side of the head. The taper on this side must be clearly visible and correctly graduated. This
view exists specifically to show the fade.`,
};

function textureLine(hairTexture?: string): string {
  const en: Record<string, string> = { liso: "straight", ondulado: "wavy", rizado: "curly", "muy-rizado": "coily" };
  const t = hairTexture ? en[hairTexture] : undefined;
  return t ? `The natural hair texture is ${t}. The new cut must clearly keep ${t} hair texture.` : "";
}

export function buildSimulationPrompt(style: Hairstyle, hairTexture?: string, angle: SimAngle = "front"): string {
  if (angle === "back") return buildBackPrompt(style, hairTexture);
  return [
    "RETOUCH the attached photograph. This is a photo edit, not a new image.",
    "Every pixel outside the hair must stay as in the original. Edit ONLY the hair region:",
    `replace the current hair with ${style.gen}.`,
    "Where hair is removed from the sides and nape, reveal the scalp and neck underneath and",
    "blend into the skin already present in the photo. Leave the face, neck, shoulders,",
    "clothing, background and lighting untouched.",
    `Top: ${style.barber.top}. Sides: ${style.barber.sides}. Fade: ${style.barber.fade}.`,
    `Fringe: ${style.barber.fringe}. Finish: ${style.barber.finish}.`,
    ANGLE_NOTE[angle],
    textureLine(hairTexture),
    "Keep every mole and blemish in the same place. Keep the same stubble, ears, and the same",
    "phone-camera look with real pores. Do not slim, smooth, beautify or de-age the person.",
    "No text, no labels, no watermark.",
  ]
    .filter(Boolean)
    .join("\n");
}

/* The one angle where generating without the person's own source frame is honest:
   there is no face in it. Derived from both profile photos and labelled as an
   illustrative view in the UI. */
export function buildBackPrompt(style: Hairstyle, hairTexture?: string): string {
  return [
    "The two reference photos show the LEFT and RIGHT sides of the same person's head.",
    "Show the BACK of that head, camera directly behind, after the haircut.",
    "Match the real hair colour and texture from the references exactly, same clothing,",
    "same setting, same lighting, same phone-camera look.",
    `The hair is ${style.gen}. The nape taper and its gradient must be clearly visible.`,
    textureLine(hairTexture),
    "Photorealistic, not CGI, no beauty smoothing, no text, no watermark.",
  ]
    .filter(Boolean)
    .join("\n");
}

export const ANALYZE_PROMPT = `You are a master barber and computer-vision analyst.
You receive THREE photos of the SAME person: front, left profile, right profile (in that order).
Analyze them TOGETHER as one combined visual profile. Do not treat them independently.

Estimate visually (no exact physical measurements, there is no scale reference):
- face shape: primary plus optional secondary category (oval, rectangular, square, round, heart, diamond, triangular). People rarely fit one category perfectly.
- head: overall proportion (corta / media / alargada), lateral volume (bajo/medio/alto), forehead size (baja/media/alta).
- hair: texture (liso/ondulado/rizado/muy-rizado), apparent density (baja/media/alta), current volume (bajo/medio/alto), current length (muy-corto/corto/medio/largo), hairline (normal/entradas/retroceso).
- per-photo quality verdict: is each photo usable (face visible, lit, sharp, roughly the right angle)? If a photo is unusable, say which and why in English, briefly.
- per-photo AUTHENTICITY: each photo must be a REAL photograph of a live person. Mark ok=false (with a brief English issue) for drawings, cartoons, anime, video-game renders, statues, mannequins, dolls, pets, AI-generated faces you can identify as such, or photos of screens or printed photos. All three photos must show the SAME person. If they clearly do not, mark the mismatching photo ok=false.

Be honest about confidence (0-1). Do not identify the person. Do not guess ethnicity, age or name.
Return ONLY the JSON described by the schema.`;

export const ANALYZE_SCHEMA = {
  type: "object",
  properties: {
    face: {
      type: "object",
      properties: {
        primaryShape: { type: "string", enum: ["oval", "rectangular", "square", "round", "heart", "diamond", "triangular"] },
        secondaryShape: { type: "string", enum: ["oval", "rectangular", "square", "round", "heart", "diamond", "triangular"] },
        confidence: { type: "number" },
      },
      required: ["primaryShape", "confidence"],
    },
    head: {
      type: "object",
      properties: {
        overallShape: { type: "string", enum: ["corta", "media", "alargada"] },
        lateralVolume: { type: "string", enum: ["bajo", "medio", "alto"] },
        foreheadSize: { type: "string", enum: ["baja", "media", "alta"] },
        confidence: { type: "number" },
      },
      required: ["overallShape", "lateralVolume", "foreheadSize", "confidence"],
    },
    hair: {
      type: "object",
      properties: {
        texture: { type: "string", enum: ["liso", "ondulado", "rizado", "muy-rizado"] },
        density: { type: "string", enum: ["baja", "media", "alta"] },
        volume: { type: "string", enum: ["bajo", "medio", "alto"] },
        length: { type: "string", enum: ["muy-corto", "corto", "medio", "largo"] },
        hairline: { type: "string", enum: ["normal", "entradas", "retroceso"] },
        confidence: { type: "number" },
      },
      required: ["texture", "density", "volume", "length", "hairline", "confidence"],
    },
    visualQuality: { type: "number" },
    perPhoto: {
      type: "array",
      items: {
        type: "object",
        properties: {
          angle: { type: "string", enum: ["front", "left", "right"] },
          ok: { type: "boolean" },
          issue: { type: "string" },
        },
        required: ["angle", "ok"],
      },
    },
  },
  required: ["face", "head", "hair", "visualQuality", "perPhoto"],
} as const;
