import { NextRequest, NextResponse } from "next/server";
import { saveFeedback, storeEnabled } from "@/lib/simulator/history";

/* The teach signal: one human verdict per generated view. */
export async function POST(req: NextRequest) {
  if (!storeEnabled()) return NextResponse.json({ stored: false });
  let body: { sessionId?: string; cutId?: string; angle?: string; verdict?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid request body" }, { status: 400 });
  }
  const angles = ["front", "left", "right", "back"];
  if (
    !body.sessionId ||
    !body.cutId ||
    !angles.includes(body.angle || "") ||
    (body.verdict !== "good" && body.verdict !== "off")
  ) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }
  try {
    await saveFeedback(body.sessionId, body.cutId, body.angle as never, body.verdict);
  } catch (e) {
    console.warn("feedback store failed:", e);
    return NextResponse.json({ stored: false }, { status: 500 });
  }
  return NextResponse.json({ stored: true });
}
