import type { Angle, Hairstyle, PhotoVerdict, SimAngle, VisualProfile } from "../types";
import { ANALYZE_PROMPT, ANALYZE_SCHEMA, buildSimulationPrompt } from "../prompts";

// All AI calls happen server-side; the key never reaches the client (spec §33).
const KEY = process.env.GOOGLE_AI_STUDIO_KEY || "";
const VISION_MODEL = process.env.GOOGLE_VISION_MODEL || "gemini-3.5-flash";
const IMAGE_MODEL = process.env.GOOGLE_IMAGE_MODEL || "gemini-3-pro-image";

export const geminiConfigured = () => Boolean(KEY);

const API = "https://generativelanguage.googleapis.com/v1beta/models";

function inlinePart(dataUrl: string) {
  /* [\s\S] instead of the dotAll flag: the repo targets ES2017 */
  const m = dataUrl.match(/^data:(image\/\w+);base64,([\s\S]+)$/);
  if (!m) throw new Error("photo is not a base64 data URL");
  return { inlineData: { mimeType: m[1], data: m[2] } };
}

export async function geminiAnalyze(
  photos: Record<Angle, string>
): Promise<{ profile: VisualProfile; perPhoto: PhotoVerdict[] }> {
  const parts = [
    { text: ANALYZE_PROMPT },
    inlinePart(photos.front),
    inlinePart(photos.left),
    inlinePart(photos.right),
  ];
  const res = await fetch(`${API}/${VISION_MODEL}:generateContent?key=${KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(30000),
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: ANALYZE_SCHEMA,
      },
    }),
  });
  const j = await res.json();
  if (j.error) throw new Error(`vision ${j.error.code}: ${String(j.error.message).slice(0, 160)}`);
  const text = j.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("vision model returned no JSON");
  const out = JSON.parse(text);
  const { perPhoto, ...profile } = out;
  return { profile: profile as VisualProfile, perPhoto: perPhoto as PhotoVerdict[] };
}

export async function geminiSimulate(
  photos: string[],
  style: Hairstyle,
  hairTexture?: string,
  angle: SimAngle = "front"
): Promise<string> {
  // One anchor photo per front/side generation keeps the output aligned to the source
  // frame; only the derived back view takes both profiles as references.
  const parts = [...photos.map(inlinePart), { text: buildSimulationPrompt(style, hairTexture, angle) }];
  const res = await fetch(`${API}/${IMAGE_MODEL}:generateContent?key=${KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(180000),
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
    }),
  });
  const j = await res.json();
  if (j.error) throw new Error(`image ${j.error.code}: ${String(j.error.message).slice(0, 160)}`);
  const img = (j.candidates?.[0]?.content?.parts || []).find(
    (p: { inlineData?: { data: string } }) => p.inlineData
  )?.inlineData?.data;
  if (!img) throw new Error("image model returned no image");
  return "data:image/png;base64," + img;
}
