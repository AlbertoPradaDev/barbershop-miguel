import { NextRequest, NextResponse } from "next/server";
import { saveFicha, storeEnabled } from "@/lib/simulator/history";

export async function POST(req: NextRequest) {
  if (!storeEnabled()) return NextResponse.json({ stored: false });
  let body: { sessionId?: string; cutId?: string; image?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid request body" }, { status: 400 });
  }
  if (!body.sessionId || !body.cutId || !body.image?.startsWith("data:image/")) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }
  try {
    await saveFicha(body.sessionId, body.cutId, body.image);
  } catch (e) {
    console.warn("ficha store failed:", e);
    return NextResponse.json({ stored: false }, { status: 500 });
  }
  return NextResponse.json({ stored: true });
}
