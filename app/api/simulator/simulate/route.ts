import { NextRequest, NextResponse } from "next/server";
import type { SimulateRequest, SimulateResponse } from "@/lib/simulator/types";
import { styleById } from "@/lib/simulator/catalog";
import { getImageProviders } from "@/lib/simulator/providers";
import { saveSim, storeEnabled } from "@/lib/simulator/history";

export const maxDuration = 300;

/*
 * One generated view per request, fanned out by the client so each lands the
 * moment it is ready. Attempt plan: primary provider, primary again, then the
 * fallback provider when one is configured. One flaky task or a dry quota must
 * never cost the visitor a view.
 *
 * TEST-ONLY failure injection, so the recovery ladder stays provable without
 * paid calls. Both are inert unless explicitly set; never set them in a real
 * serve:
 *   SIM_FAIL_ONCE=1     the FIRST request per (cut,angle) returns 502
 *   SIM_FAIL_PROVIDER=1 the FIRST provider attempt per (cut,angle) throws
 */
const failedRequests = new Set<string>();
const failedAttempts = new Set<string>();

export async function POST(req: NextRequest) {
  let body: SimulateRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid request body" }, { status: 400 });
  }
  const style = styleById(body?.hairstyleId || "");
  if (!style) {
    return NextResponse.json({ error: "unknown style" }, { status: 404 });
  }
  const angle = body.angle || "front";
  const isData = (s?: string) => Boolean(s?.startsWith("data:image/"));

  let photos: string[];
  if (angle === "back") {
    if (!isData(body.photos?.left) || !isData(body.photos?.right)) {
      return NextResponse.json({ error: "the back view needs both profile photos" }, { status: 400 });
    }
    photos = [body.photos.left!, body.photos.right!];
  } else {
    const src = body.photos?.[angle];
    if (!isData(src)) {
      return NextResponse.json({ error: `missing ${angle} photo` }, { status: 400 });
    }
    photos = [src!];
  }

  const key = `${style.id}/${angle}`;
  if (process.env.SIM_FAIL_ONCE === "1" && !failedRequests.has(key)) {
    failedRequests.add(key);
    return NextResponse.json({ error: "injected failure (test)" }, { status: 502 });
  }

  const providers = getImageProviders();
  const plan = providers.length > 1 ? [providers[0], providers[0], providers[1]] : [providers[0], providers[0]];

  let attempts = 0;
  let lastErr = "generation failed";
  for (const provider of plan) {
    attempts++;
    try {
      if (process.env.SIM_FAIL_PROVIDER === "1" && !failedAttempts.has(key)) {
        failedAttempts.add(key);
        throw new Error("injected provider failure (test)");
      }
      const image = await provider.simulate(photos, style, body.hairTexture, angle);
      if (storeEnabled() && body.sessionId) {
        try {
          /* awaited: a serverless function may be frozen the moment it responds */
          await saveSim(body.sessionId, style.id, angle, image, { provider: provider.name, attempts });
        } catch (e) {
          console.warn("history store failed:", e);
        }
      }
      const out: SimulateResponse = {
        mock: provider.mock,
        provider: provider.name,
        hairstyleId: style.id,
        angle,
        image,
        attempts,
      };
      return NextResponse.json(out);
    } catch (e) {
      lastErr = e instanceof Error ? e.message : "generation failed";
      console.warn(`simulate ${key} attempt ${attempts} via ${provider.name} failed: ${lastErr.slice(0, 160)}`);
    }
  }
  return NextResponse.json({ error: lastErr }, { status: 502 });
}
