import type { Angle, Hairstyle, PhotoVerdict, SimAngle, VisualProfile } from "../types";
import { geminiAnalyze, geminiConfigured, geminiSimulate } from "./gemini";
import { kieConfigured, kieSimulate } from "./kie";
import { mockAnalyze, mockSimulate } from "./mock";

/*
 * Provider seams. All AI calls are server side; keys never reach the client.
 * Image generation exposes an ORDERED list (primary plus the other configured
 * backend as fallback): a missing view is a broken promise, so any view that
 * fails on the primary after a retry re-runs once on the fallback.
 */

export interface VisionProvider {
  name: string;
  mock: boolean;
  analyze(photos: Record<Angle, string>): Promise<{ profile: VisualProfile; perPhoto: PhotoVerdict[] }>;
}

export interface ImageGenerationProvider {
  name: string;
  mock: boolean;
  simulate(photos: string[], style: Hairstyle, hairTexture?: string, angle?: SimAngle): Promise<string>;
}

const mockMode = () => process.env.MOCK_AI === "1" || !geminiConfigured();

export function getVisionProvider(): VisionProvider {
  if (mockMode()) {
    return { name: "mock", mock: true, analyze: async () => mockAnalyze() };
  }
  return {
    name: `gemini/${process.env.GOOGLE_VISION_MODEL || "gemini-3.5-flash"}`,
    mock: false,
    analyze: geminiAnalyze,
  };
}

const kieProvider = (): ImageGenerationProvider => ({ name: "kie/gpt-image-2", mock: false, simulate: kieSimulate });
const geminiProvider = (): ImageGenerationProvider => ({
  name: `gemini/${process.env.GOOGLE_IMAGE_MODEL || "gemini-3-pro-image"}`,
  mock: false,
  simulate: geminiSimulate,
});

export function getImageProviders(): ImageGenerationProvider[] {
  if (process.env.MOCK_AI === "1" || (!kieConfigured() && !geminiConfigured())) {
    return [{ name: "mock", mock: true, simulate: async (photos) => mockSimulate(photos[0]) }];
  }
  const pref = process.env.IMAGE_PROVIDER || (kieConfigured() ? "kie" : "google");
  const list: ImageGenerationProvider[] = [];
  if (pref === "kie" && kieConfigured()) {
    list.push(kieProvider());
    if (geminiConfigured()) list.push(geminiProvider());
  } else {
    if (geminiConfigured()) list.push(geminiProvider());
    if (kieConfigured()) list.push(kieProvider());
  }
  return list;
}
