import type { Hairstyle, SimAngle } from "../types";
import { buildSimulationPrompt } from "../prompts";

// KIE gpt-image-2 image-to-image — the provider that proved reliable in production on
// the Cutprint build. Photos go to KIE's own file store first (their documented fix for
// "image fetch failed ... use our file upload api instead"); KIE auto-deletes uploads
// after 3 days — disclosed in the privacy copy.
// Retry discipline learned the hard way: a paid task must never be lost to one flaky
// socket — every request retries, and a failed poll is retried, never treated as a
// failed job.

const API = "https://api.kie.ai/api/v1";
const KEY = process.env.KIE_API_KEY || "";

export const kieConfigured = () => Boolean(KEY);

async function fetchRetry(url: string, opts: RequestInit = {}, tries = 4, label = "request"): Promise<Response> {
  let last: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { ...opts, signal: AbortSignal.timeout(60000) });
      if (res.status >= 500) throw new Error(`HTTP ${res.status}`);
      return res;
    } catch (e) {
      last = e;
      if (i < tries - 1) await new Promise((r) => setTimeout(r, 1200 * 2 ** i));
    }
  }
  throw new Error(`${label} failed after ${tries} tries: ${last instanceof Error ? last.message : last}`);
}

const UPLOAD_HOSTS = [
  "https://api.kie.ai/api/file-stream-upload",
  "https://kieai.redpandaai.co/api/file-stream-upload",
];

async function uploadFile(buffer: Buffer, fileName: string): Promise<string> {
  let last: unknown;
  for (const host of UPLOAD_HOSTS) {
    try {
      const form = new FormData();
      form.append("file", new Blob([new Uint8Array(buffer)], { type: "image/jpeg" }), fileName);
      form.append("uploadPath", "corteai");
      form.append("fileName", fileName);
      const res = await fetchRetry(host, { method: "POST", headers: { Authorization: "Bearer " + KEY }, body: form }, 3, "file upload");
      const j = await res.json();
      if (!j.success || !j.data) throw new Error(`upload ${j.code}: ${j.msg}`);
      return j.data.downloadUrl || j.data.fileUrl;
    } catch (e) {
      last = e;
    }
  }
  throw new Error("KIE upload failed on all hosts: " + (last instanceof Error ? last.message : last));
}

export async function kieSimulate(
  photos: string[],
  style: Hairstyle,
  hairTexture?: string,
  angle: SimAngle = "front"
): Promise<string> {
  const urls = await Promise.all(
    photos.map((p, i) =>
      uploadFile(
        Buffer.from(p.replace(/^data:image\/\w+;base64,/, ""), "base64"),
        `corteai-${style.id}-${angle}-${i}-${Date.now()}.jpg`
      )
    )
  );

  const createRes = await fetchRetry(
    `${API}/jobs/createTask`,
    {
      method: "POST",
      headers: { Authorization: "Bearer " + KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-image-2-image-to-image",
        input: {
          prompt: buildSimulationPrompt(style, hairTexture, angle),
          input_urls: urls,
          aspect_ratio: "3:4",
          resolution: "1K",
        },
      }),
    },
    4,
    "createTask"
  );
  const created = await createRes.json();
  if (created.code !== 200) throw new Error(`createTask ${created.code}: ${created.msg || ""}`);
  const taskId: string = created.data.taskId;

  const t0 = Date.now();
  let pollFailures = 0;
  while (Date.now() - t0 < 280000) {
    await new Promise((r) => setTimeout(r, 4000));
    let d: { state: string; resultJson: string; failCode?: string; failMsg?: string };
    try {
      const res = await fetchRetry(`${API}/jobs/recordInfo?taskId=${taskId}`, { headers: { Authorization: "Bearer " + KEY } }, 3, "recordInfo");
      d = (await res.json()).data;
      pollFailures = 0;
    } catch (e) {
      if (++pollFailures > 8) throw new Error(`polling lost for ${taskId}: ${e instanceof Error ? e.message : e}`);
      continue;
    }
    if (d.state === "success") {
      // resultJson is a STRING, not an object
      const resultUrl: string = JSON.parse(d.resultJson).resultUrls[0];
      const img = await fetchRetry(resultUrl, {}, 5, "result download");
      return "data:image/png;base64," + Buffer.from(await img.arrayBuffer()).toString("base64");
    }
    if (d.state === "fail") throw new Error(`${d.failCode}: ${d.failMsg}`);
  }
  throw new Error(`taskId ${taskId} still running after 280s`);
}
