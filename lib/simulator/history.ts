import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { del, list, put } from "@vercel/blob";
import type { Angle, AnalyzeResponse, SimAngle } from "./types";

/*
 * The improvement log: every CONSENTED session's input photos, analysis,
 * generated views, card and per-view human verdicts, so prompts, gates and
 * scoring can be reviewed against real results.
 *
 * Two backends behind one async seam, chosen at runtime:
 *   blob  when BLOB_READ_WRITE_TOKEN is present (the Vercel Blob store
 *         mrsociety-simulator-log, access PRIVATE: bare URLs answer 403 and
 *         every read goes through the token). Local serves and the deployed
 *         site then write to the SAME dataset.
 *   fs    data/simulator-sessions on the local disk, the no-credentials
 *         fallback. SIM_STORE_BACKEND=fs forces it.
 *
 * NEXT_PUBLIC_SIM_STORE=1 (BUILD-time) gates the whole feature and flips the
 * privacy copy with it, and the analyze route only ever stores a session the
 * visitor ticked consent for. Blob has no append, so verdicts and generation
 * metadata are one small JSON object per event.
 */

const FS_DIR = path.join(process.cwd(), "data", "simulator-sessions");
const PREFIX = "sessions/";

export const storeEnabled = () => process.env.NEXT_PUBLIC_SIM_STORE === "1";

const token = () => process.env.BLOB_READ_WRITE_TOKEN || "";
const blobBackend = () => process.env.SIM_STORE_BACKEND !== "fs" && Boolean(token());

/* The store host is derivable from the token (vercel_blob_rw_<StoreId>_...,
   subdomain is the id lowercased); private stores live under .private. Saves a
   list() round trip on every file read. */
function blobHost(): string {
  const id = token().split("_")[3] || "";
  return `https://${id.toLowerCase()}.private.blob.vercel-storage.com`;
}

const SAFE = /^[A-Za-z0-9._-]+$/;

function decodeImage(dataUrl: string): { buf: Buffer; ext: string; type: string } | null {
  const m = dataUrl.match(/^data:image\/(\w+);base64,([\s\S]+)$/);
  if (!m) return null;
  return { buf: Buffer.from(m[2], "base64"), ext: m[1] === "jpeg" ? "jpg" : m[1], type: `image/${m[1]}` };
}

async function putObject(pathname: string, body: Buffer | string, contentType: string) {
  if (blobBackend()) {
    await put(pathname, body, {
      token: token(),
      access: "private",
      addRandomSuffix: false,
      contentType,
    } as never);
    return;
  }
  const file = path.join(FS_DIR, pathname.replace(PREFIX, "").split("/").join(path.sep));
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, body);
}

export async function createSession(
  inputs: Record<Angle, string>,
  analysis: Omit<AnalyzeResponse, "sessionId" | "stored">,
  preferences: unknown
): Promise<string> {
  const id = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-") + "-" + crypto.randomBytes(3).toString("hex");
  for (const angle of ["front", "left", "right"] as const) {
    const img = decodeImage(inputs[angle]);
    if (img) await putObject(`${PREFIX}${id}/input-${angle}.${img.ext}`, img.buf, img.type);
  }
  await putObject(
    `${PREFIX}${id}/analysis.json`,
    JSON.stringify({ ts: new Date().toISOString(), preferences, ...analysis }, null, 2),
    "application/json"
  );
  return id;
}

export async function saveSim(
  sessionId: string,
  cutId: string,
  angle: SimAngle,
  dataUrl: string,
  meta?: { provider?: string; attempts?: number }
) {
  if (!SAFE.test(sessionId) || !SAFE.test(cutId)) return;
  const img = decodeImage(dataUrl);
  if (!img) return;
  await putObject(`${PREFIX}${sessionId}/sim-${cutId}-${angle}.${img.ext}`, img.buf, img.type);
  if (meta) {
    await putObject(
      `${PREFIX}${sessionId}/generations/${Date.now()}-${crypto.randomBytes(2).toString("hex")}.json`,
      JSON.stringify({ ts: new Date().toISOString(), cutId, angle, ...meta }),
      "application/json"
    );
  }
}

export async function saveFicha(sessionId: string, cutId: string, dataUrl: string) {
  if (!SAFE.test(sessionId) || !SAFE.test(cutId)) return;
  const img = decodeImage(dataUrl);
  if (!img) return;
  await putObject(`${PREFIX}${sessionId}/ficha-${cutId}.${img.ext}`, img.buf, img.type);
}

export async function saveFeedback(sessionId: string, cutId: string, angle: SimAngle, verdict: "good" | "off") {
  if (!SAFE.test(sessionId) || !SAFE.test(cutId)) return;
  await putObject(
    `${PREFIX}${sessionId}/feedback/${Date.now()}-${crypto.randomBytes(2).toString("hex")}.json`,
    JSON.stringify({ ts: new Date().toISOString(), cutId, angle, verdict }),
    "application/json"
  );
}

export interface FeedbackEntry {
  ts: string;
  cutId: string;
  angle: SimAngle;
  verdict: "good" | "off";
}

export interface SessionSummary {
  id: string;
  ts: string;
  topCut: string;
  score: number;
  inputs: string[];
  sims: string[];
  fichas: string[];
  feedback: FeedbackEntry[];
}

async function readBlobJson(pathname: string): Promise<unknown | null> {
  try {
    const res = await fetch(`${blobHost()}/${pathname}`, { headers: { authorization: `Bearer ${token()}` } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/* Capped: every blob list is a billed operation, and the review page does one
   per session shown. Twelve is plenty to review at a time. */
export async function listSessions(limit = 12): Promise<SessionSummary[]> {
  if (blobBackend()) {
    const folded = await list({ token: token(), prefix: PREFIX, mode: "folded" });
    const ids = (folded.folders || [])
      .map((f: string) => f.replace(PREFIX, "").replace(/\/$/, ""))
      .filter((d: string) => SAFE.test(d))
      .sort()
      .reverse()
      .slice(0, limit);
    const out: SessionSummary[] = [];
    for (const id of ids) {
      const l = await list({ token: token(), prefix: `${PREFIX}${id}/`, mode: "expanded" });
      const names = l.blobs.map((b: { pathname: string }) => b.pathname.replace(`${PREFIX}${id}/`, ""));
      const a = (await readBlobJson(`${PREFIX}${id}/analysis.json`)) as
        | { ts?: string; recommendation?: { id?: string; score?: number } }
        | null;
      const feedback: FeedbackEntry[] = [];
      for (const n of names.filter((n: string) => n.startsWith("feedback/"))) {
        const f = (await readBlobJson(`${PREFIX}${id}/${n}`)) as FeedbackEntry | null;
        if (f) feedback.push(f);
      }
      feedback.sort((x, y) => (x.ts < y.ts ? -1 : 1));
      out.push({
        id,
        ts: a?.ts || "",
        topCut: a?.recommendation?.id || "?",
        score: a?.recommendation?.score || 0,
        inputs: names.filter((n: string) => n.startsWith("input-")).sort(),
        sims: names.filter((n: string) => n.startsWith("sim-")).sort(),
        fichas: names.filter((n: string) => n.startsWith("ficha-")).sort(),
        feedback,
      });
    }
    return out;
  }

  if (!fs.existsSync(FS_DIR)) return [];
  return fs
    .readdirSync(FS_DIR)
    .filter((d) => SAFE.test(d) && fs.existsSync(path.join(FS_DIR, d, "analysis.json")))
    .sort()
    .reverse()
    .slice(0, limit)
    .map((id) => {
      const dir = path.join(FS_DIR, id);
      const files = fs.readdirSync(dir);
      let ts = "";
      let topCut = "?";
      let score = 0;
      try {
        const a = JSON.parse(fs.readFileSync(path.join(dir, "analysis.json"), "utf8"));
        ts = a.ts || "";
        topCut = a.recommendation?.id || "?";
        score = a.recommendation?.score || 0;
      } catch {}
      let feedback: FeedbackEntry[] = [];
      /* older local sessions used an append-only jsonl; new ones one file per event */
      try {
        feedback = fs
          .readFileSync(path.join(dir, "feedback.jsonl"), "utf8")
          .split("\n")
          .filter(Boolean)
          .map((l) => JSON.parse(l));
      } catch {}
      const fbDir = path.join(dir, "feedback");
      if (fs.existsSync(fbDir)) {
        for (const f of fs.readdirSync(fbDir).sort()) {
          try {
            feedback.push(JSON.parse(fs.readFileSync(path.join(fbDir, f), "utf8")));
          } catch {}
        }
      }
      return {
        id,
        ts,
        topCut,
        score,
        inputs: files.filter((f) => f.startsWith("input-")).sort(),
        sims: files.filter((f) => f.startsWith("sim-")).sort(),
        fichas: files.filter((f) => f.startsWith("ficha-")).sort(),
        feedback,
      };
    });
}

/* Only files inside a known session, only safe names. Never a traversal. */
export async function sessionFile(sessionId: string, name: string): Promise<{ buf: Buffer; type: string } | null> {
  if (!SAFE.test(sessionId) || !SAFE.test(name) || name.includes("..")) return null;
  const type =
    name.endsWith(".jpg") ? "image/jpeg" : name.endsWith(".json") || name.endsWith(".jsonl") ? "application/json" : `image/${path.extname(name).slice(1)}`;
  if (blobBackend()) {
    try {
      const res = await fetch(`${blobHost()}/${PREFIX}${sessionId}/${name}`, {
        headers: { authorization: `Bearer ${token()}` },
      });
      if (!res.ok) return null;
      return { buf: Buffer.from(await res.arrayBuffer()), type };
    } catch {
      return null;
    }
  }
  const file = path.join(FS_DIR, sessionId, name);
  if (!file.startsWith(FS_DIR) || !fs.existsSync(file)) return null;
  return { buf: fs.readFileSync(file), type };
}

/* exported for admin scripts; unused by routes */
export async function deleteSessionBlob(url: string) {
  await del(url, { token: token() });
}
