import { NextRequest, NextResponse } from "next/server";
import { sessionFile, storeEnabled } from "@/lib/simulator/history";

/* params are async in Next 15 and later */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ session: string; name: string }> }) {
  if (!storeEnabled()) return new NextResponse("history disabled", { status: 404 });
  const { session, name } = await ctx.params;
  const f = await sessionFile(session, name);
  if (!f) return new NextResponse("not found", { status: 404 });
  return new NextResponse(new Uint8Array(f.buf), {
    headers: { "Content-Type": f.type, "Cache-Control": "private, max-age=3600" },
  });
}
