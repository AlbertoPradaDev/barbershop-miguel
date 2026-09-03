import { NextResponse } from "next/server";
import { listSessions, storeEnabled } from "@/lib/simulator/history";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!storeEnabled()) return NextResponse.json({ enabled: false, sessions: [] });
  return NextResponse.json({ enabled: true, sessions: await listSessions() });
}
