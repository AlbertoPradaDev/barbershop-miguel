import type { PhotoVerdict, VisualProfile } from "../types";

/*
 * CLEARLY IDENTIFIED MOCK: used when MOCK_AI=1 or no provider key is configured,
 * so anyone can run the repo without spending money. Never pretends to be a real
 * analysis. Every response is flagged mock:true and the UI must display that
 * provenance; the simulate mock returns the ORIGINAL photo untouched and the
 * client stamps a visible TEST badge over it.
 */

export function mockAnalyze(): { profile: VisualProfile; perPhoto: PhotoVerdict[] } {
  return {
    profile: {
      face: { primaryShape: "oval", secondaryShape: "rectangular", confidence: 0.82 },
      head: { overallShape: "media", lateralVolume: "medio", foreheadSize: "media", confidence: 0.76 },
      hair: { texture: "liso", density: "alta", volume: "alto", length: "medio", hairline: "normal", confidence: 0.89 },
      visualQuality: 0.91,
    },
    perPhoto: [
      { angle: "front", ok: true },
      { angle: "left", ok: true },
      { angle: "right", ok: true },
    ],
  };
}

export function mockSimulate(photo: string): string {
  return photo;
}
