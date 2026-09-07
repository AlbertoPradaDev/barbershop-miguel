import { NextRequest, NextResponse } from "next/server";
import type { AnalyzeRequest, AnalyzeResponse, ScoredStyleDTO } from "@/lib/simulator/types";
import { getVisionProvider } from "@/lib/simulator/providers";
import { rankStyles } from "@/lib/simulator/recommend";
import { createSession, storeEnabled } from "@/lib/simulator/history";

export const maxDuration = 60;

/*
 * Combined visual analysis over the three photos. Privacy: photos live only
 * inside this request. They are analyzed and discarded, never written to disk
 * or a database, never used for training.
 */
export async function POST(req: NextRequest) {
  let body: AnalyzeRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid request body" }, { status: 400 });
  }
  const { photos, preferences = {} } = body || ({} as AnalyzeRequest);
  for (const angle of ["front", "left", "right"] as const) {
    if (!photos?.[angle]?.startsWith("data:image/")) {
      return NextResponse.json({ error: `missing ${angle} photo` }, { status: 400 });
    }
  }

  const vision = getVisionProvider();
  try {
    const { profile, perPhoto } = await vision.analyze(photos);

    const bad = perPhoto.filter((v) => !v.ok);
    if (bad.length) {
      /* only the failing photo goes back for a retake */
      return NextResponse.json({ mock: vision.mock, provider: vision.name, perPhoto, retake: true }, { status: 422 });
    }

    const ranked = rankStyles(profile, preferences);
    const dto = (s: (typeof ranked)[number]): ScoredStyleDTO => ({
      id: s.style.id,
      score: Math.round(s.score * 100) / 100,
      reasons: s.reasons,
      cautions: s.cautions,
    });

    const out: AnalyzeResponse = {
      mock: vision.mock,
      provider: vision.name,
      profile,
      perPhoto,
      recommendation: dto(ranked[0]),
      alternatives: ranked.slice(1, 4).map(dto),
    };
    /* improvement log: only where the store is enabled AND the visitor ticked
       consent. The UI privacy copy flips with the same flag. */
    if (storeEnabled() && body.consent === true) {
      try {
        out.sessionId = await createSession(photos, out, preferences);
        out.stored = true;
      } catch (e) {
        console.warn("history store failed:", e);
      }
    }
    return NextResponse.json(out);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "analysis failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
