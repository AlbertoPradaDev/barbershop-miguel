// Face/angle gates, ported from the battle-tested Cutprint module. One set of rules
// for every intake path — the same photo must never pass one gate and fail another.

export const D = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

// Yaw gates, from measured separation on real photos (Cutprint profile-landmark probe).
// `live` is the guidance the camera sheet speaks while the visitor turns; `target` the
// yaw it aims for. POSITIVE yaw = the camera sees the subject's LEFT side.
//   front -2.7deg · left +49.4deg · right -45.7deg
// POSITIVE yaw = the camera sees the subject's LEFT side.
export const ANGLES = {
  front: {
    label: "front",
    target: 0,
    test: (y) => Math.abs(y) <= 18,
    /* positive yaw = the camera sees the LEFT side = the head is turned to the
       subject's RIGHT, so the correction is back to the LEFT, and vice versa */
    live: (y) => (y > 18 ? "Turn a little back to your left" : y < -18 ? "Turn a little back to your right" : "Perfect, hold still"),
    wrong: "This photo is in profile. For this slot, look straight at the camera.",
  },
  left: {
    label: "left side",
    target: 45,
    test: (y) => y >= 28,
    live: (y) => (y < 28 ? "Keep turning to your right, until your left ear shows" : "Perfect, hold still"),
    wrong: "You have not turned far enough, or you turned the other way. Turn until your left ear is visible.",
  },
  right: {
    label: "right side",
    target: -45,
    test: (y) => y <= -28,
    live: (y) => (y > -28 ? "Keep turning to your left, until your right ear shows" : "Perfect, hold still"),
    wrong: "You have not turned far enough, or you turned the other way. Turn until your right ear is visible.",
  },
};

// Largest 3:4 rect that fits the image, centred on the face (with headroom for hair).
// Every photo is normalised through this BEFORE storage or generation, so the model's
// 3:4 output always registers with the source — Cutprint's white-helmet bug was a 9:16
// phone photo meeting a 3:4 generation.
export function normalizeTo34(cv, res, target = 1024) {
  const p = res.faceLandmarks[0];
  let minX = 1, maxX = 0, minY = 1, maxY = 0;
  for (const pt of p) {
    if (pt.x < minX) minX = pt.x;
    if (pt.x > maxX) maxX = pt.x;
    if (pt.y < minY) minY = pt.y;
    if (pt.y > maxY) maxY = pt.y;
  }
  const W = cv.width, H = cv.height;
  const faceW = (maxX - minX) * W, faceH = (maxY - minY) * H;
  const cx = ((minX + maxX) / 2) * W;
  const cy = ((minY + maxY) / 2) * H - faceH * 0.18; // bias up: hair needs headroom

  let ch = Math.min(H, Math.max(faceH / 0.42, faceW / 0.42 / 0.75));
  let cw = ch * 0.75;
  if (cw > W) { cw = W; ch = cw / 0.75; }
  if (ch > H) { ch = H; cw = ch * 0.75; }
  const x = Math.min(Math.max(cx - cw / 2, 0), W - cw);
  const y = Math.min(Math.max(cy - ch / 2, 0), H - ch);

  const out = document.createElement("canvas");
  out.width = Math.round(target * 0.75);
  out.height = target;
  out.getContext("2d").drawImage(cv, x, y, cw, ch, 0, 0, out.width, out.height);
  return out;
}

export function measure(res, cv) {
  const p = res.faceLandmarks[0];
  const px = (i) => ({ x: p[i].x * cv.width, y: p[i].y * cv.height });

  // yaw from the rotation matrix, not a heuristic
  const M = res.facialTransformationMatrixes?.[0]?.data;
  const yaw = M ? (Math.asin(Math.max(-1, Math.min(1, -M[8]))) * 180) / Math.PI : 0;

  const top = px(10), chin = px(152);
  const faceH = D(top, chin) || 1;
  return {
    yaw: +yaw.toFixed(1),
    faceHeightPct: +((faceH / cv.height) * 100).toFixed(1),
  };
}

export function laplacianVar(cv) {
  const c = document.createElement("canvas");
  const s = 220 / Math.max(cv.width, cv.height);
  c.width = Math.max(1, Math.round(cv.width * s));
  c.height = Math.max(1, Math.round(cv.height * s));
  const cx = c.getContext("2d", { willReadFrequently: true });
  cx.drawImage(cv, 0, 0, c.width, c.height);
  const d = cx.getImageData(0, 0, c.width, c.height).data;
  const g = new Float32Array(c.width * c.height);
  for (let i = 0; i < g.length; i++) g[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
  let sum = 0, sum2 = 0, n = 0;
  for (let y = 1; y < c.height - 1; y++)
    for (let x = 1; x < c.width - 1; x++) {
      const i = y * c.width + x;
      const v = 4 * g[i] - g[i - 1] - g[i + 1] - g[i - c.width] - g[i + c.width];
      sum += v;
      sum2 += v * v;
      n++;
    }
  return sum2 / n - (sum / n) ** 2;
}

// Every gate in one place: real face present, ONE face, close enough, sharp enough,
// and actually turned the way this slot needs.
export function judge(res, cv, angle) {
  if (!res.faceLandmarks?.length)
    return { ok: false, why: "We could not detect a real face in this photo. We need a photo of you, lit from the front, no cap and no sunglasses." };
  if (res.faceLandmarks.length > 1)
    return { ok: false, why: "There is more than one face in the photo. We only need yours." };

  const m = measure(res, cv);
  m.blur = Math.round(laplacianVar(cv));

  if (m.faceHeightPct < 20) return { ok: false, why: "You are too far away. Bring the camera closer.", metrics: m };
  if (m.blur < 12) return { ok: false, why: "The photo came out blurry. Steady your elbow and try again.", metrics: m };
  if (!ANGLES[angle].test(m.yaw))
    return { ok: false, why: `${ANGLES[angle].wrong} (detected turn: ${m.yaw.toFixed(0)}°)`, metrics: m };

  return { ok: true, metrics: m };
}
