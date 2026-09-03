/*
 * Client-side photo intake: EXIF-aware decode with fallbacks for older Safari,
 * downscale, cheap exposure and sharpness gates, then the real gate, MediaPipe
 * face detection: a real face must be present, exactly one, close enough, sharp,
 * and turned the way the slot demands. Accepted photos are normalised to a 3:4
 * crop centred on the face so the 3:4 generations always register with the
 * source. The vision model's per-photo verdicts at analyze time remain the
 * backstop and catch drawings and screen photos the landmarker cannot.
 */

import type { Angle } from "../types";
import { getLandmarker } from "./landmarker";
import { judge, normalizeTo34 } from "./measure";

export interface Shot {
  dataUrl: string;
  width: number;
  height: number;
  yaw?: number;
}

async function decode(file: File): Promise<ImageBitmap | HTMLImageElement | null> {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {}
  try {
    return await createImageBitmap(file);
  } catch {}
  try {
    const url = URL.createObjectURL(file);
    const img = new Image();
    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej();
      img.src = url;
    });
    URL.revokeObjectURL(url);
    return img;
  } catch {
    return null;
  }
}

export async function fileToShot(file: File, angle: Angle): Promise<{ shot?: Shot; error?: string }> {
  const bitmap = await decode(file);
  if (!bitmap) {
    return { error: "We could not read that image. Try another photo (JPG or PNG)." };
  }
  const bw = bitmap instanceof HTMLImageElement ? bitmap.naturalWidth : bitmap.width;
  const bh = bitmap instanceof HTMLImageElement ? bitmap.naturalHeight : bitmap.height;
  if (Math.max(bw, bh) < 400) {
    return { error: "Resolution is too low. Use a larger photo." };
  }

  const scale = Math.min(1, 1024 / Math.max(bw, bh));
  const cv = document.createElement("canvas");
  cv.width = Math.round(bw * scale);
  cv.height = Math.round(bh * scale);
  const ctx = cv.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, cv.width, cv.height);

  const q = measureQuality(ctx, cv.width, cv.height);
  if (q.brightness < 40) return { error: "Too dark. Find light facing you." };
  if (q.brightness > 238) return { error: "Too bright or washed out. Avoid backlight." };
  if (q.sharpness < 2.2) return { error: "It is blurry. Hold the phone steady and try again." };

  try {
    const lm = await getLandmarker();
    const res = lm.detect(cv);
    const v = judge(res, cv, angle);
    if (!v.ok) return { error: v.why };

    const norm = normalizeTo34(cv, res) as HTMLCanvasElement;
    const res2 = lm.detect(norm);
    const v2 = judge(res2, norm, angle);
    if (!v2.ok) return { error: v2.why };

    return {
      shot: { dataUrl: norm.toDataURL("image/jpeg", 0.85), width: norm.width, height: norm.height, yaw: v2.metrics?.yaw },
    };
  } catch (e) {
    /* Validator unavailable (offline, blocked wasm). Do not strand the visitor;
       the vision model's per-photo verdicts still gate at analyze time. */
    console.warn("face validator unavailable:", e);
    return {
      shot: { dataUrl: cv.toDataURL("image/jpeg", 0.85), width: cv.width, height: cv.height },
    };
  }
}

function measureQuality(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const s = 192;
  const off = document.createElement("canvas");
  off.width = s;
  off.height = s;
  const octx = off.getContext("2d")!;
  octx.drawImage(ctx.canvas, 0, 0, w, h, 0, 0, s, s);
  const { data } = octx.getImageData(0, 0, s, s);
  const luma = new Float32Array(s * s);
  let sum = 0;
  for (let i = 0; i < s * s; i++) {
    const l = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
    luma[i] = l;
    sum += l;
  }
  let grad = 0;
  let n = 0;
  for (let y = 1; y < s - 1; y++) {
    for (let x = 1; x < s - 1; x++) {
      const i = y * s + x;
      grad += Math.abs(luma[i] - luma[i + 1]) + Math.abs(luma[i] - luma[i + s]);
      n += 2;
    }
  }
  return { brightness: sum / (s * s), sharpness: grad / n };
}
