"use client";

/*
 * Live camera with auto-capture. You cannot take a decent photo of the side of
 * your own head while looking at the screen: by the time you are turned 45
 * degrees the phone is out of view. So the phone watches your yaw in real time,
 * speaks the correction, and fires by itself the moment the slot's gate holds
 * for 700ms, with a beep and a vibration so you know without looking.
 *
 * Ordering is the point: the sheet and the camera open in the tap itself, the
 * face model (already warming since the capture step mounted) arms in the
 * background, and the HUD says which half is still pending. The preview is
 * mirrored so turning feels natural, but the FRAME we grab is never mirrored:
 * yaw sign must match the upload path exactly. The shot is handed back as a
 * File and goes through the identical fileToShot gates as an upload.
 *
 * Motion: none beyond a CSS opacity transition on the shutter flash and the
 * stroke of the hold ring, which is state, not decoration. Needs a secure
 * context; the caller falls back to the file input otherwise.
 */

import { useEffect, useRef, useState } from "react";
import type { Angle } from "@/lib/simulator/types";
import { getLandmarker } from "@/lib/simulator/client/landmarker";
import { ANGLES, judge } from "@/lib/simulator/client/measure";
import { PillButton } from "@/components/ui/pill-button";

const HOLD_MS = 700;
const TICK_MS = 90;
const RING = 289; /* 2πr for r=46 */

const TITLES: Record<Angle, string> = { front: "Front photo", left: "Left profile", right: "Right profile" };

export const cameraAvailable = () =>
  typeof window !== "undefined" && Boolean(window.isSecureContext && navigator.mediaDevices?.getUserMedia);

function beep() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ac = new Ctx();
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.connect(g);
    g.connect(ac.destination);
    o.frequency.value = 880;
    g.gain.value = 0.07;
    o.start();
    o.stop(ac.currentTime + 0.12);
    setTimeout(() => ac.close(), 300);
  } catch {}
  try {
    navigator.vibrate?.(60);
  } catch {}
}

export function SimCamera({ angle, onShot, onClose }: { angle: Angle; onShot: (file: File) => void; onClose: (reason?: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lmRef = useRef<{ detectForVideo: (i: HTMLCanvasElement, t: number) => unknown; setOptions: (o: unknown) => Promise<void> } | null>(null);
  const closedRef = useRef(false);
  const firingRef = useRef(false); /* a shot is in flight: the loop must not fire again */
  const failReasonRef = useRef<string | null>(null); /* stream failure: keep the reason on screen and hand it to the slot */
  const holdRef = useRef(0);
  const lastTsRef = useRef(0);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [guide, setGuide] = useState("Opening the camera");
  const [yawText, setYawText] = useState("");
  const [held, setHeld] = useState(0);
  const [armed, setArmed] = useState(false);
  const [flash, setFlash] = useState(false);
  const cfg = ANGLES[angle];

  /* the frame we analyse and hand back: never mirrored, capped at 1024px */
  const grab = () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth || !v.videoHeight) return null;
    const scale = Math.min(1, 1024 / Math.max(v.videoWidth, v.videoHeight));
    const cv = document.createElement("canvas");
    cv.width = Math.round(v.videoWidth * scale);
    cv.height = Math.round(v.videoHeight * scale);
    cv.getContext("2d")!.drawImage(v, 0, 0, cv.width, cv.height);
    return cv;
  };

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const finish = async (cv: HTMLCanvasElement | null, reason?: string) => {
    if (closedRef.current) return;
    closedRef.current = true;
    stopStream();
    /* restore IMAGE mode before the upload-path gates run on the shot. Through
       the shared singleton, not lmRef: a cancel BEFORE arming must still leave
       the model in IMAGE mode once the pending VIDEO switch lands. */
    try {
      const lm = await getLandmarker();
      await lm.setOptions({ runningMode: "IMAGE" });
    } catch {}
    if (!cv) {
      onClose(reason);
      return;
    }
    cv.toBlob(
      (blob) => {
        if (!blob) {
          onClose();
          return;
        }
        onShot(new File([blob], `camera-${angle}.jpg`, { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.85
    );
  };

  const shoot = (cv: HTMLCanvasElement, manual: boolean) => {
    const lm = lmRef.current;
    if (!lm || firingRef.current) return;
    const res = lm.detectForVideo(cv, performance.now()) as Parameters<typeof judge>[0];
    const verdict = judge(res, cv, angle);
    if (!verdict.ok) {
      if (manual) setGuide(verdict.why || "That frame did not pass. Try again.");
      return;
    }
    firingRef.current = true;
    /* the full-screen flash is motion; the beep and vibration carry the cue for
       anyone who asked for less movement */
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) setFlash(true);
    beep();
    setTimeout(() => setFlash(false), 220);
    setTimeout(() => finish(cv), 260);
  };

  /* camera stream; re-runs when the facing flips (and the hold restarts: the
     first passing frame from the other camera must not fire instantly) */
  useEffect(() => {
    let cancelled = false;
    holdRef.current = 0; /* the loop re-derives the ring from this within a tick */
    (async () => {
      stopStream();
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 1706 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const v = videoRef.current;
        if (v) {
          v.srcObject = stream;
          await v.play().catch(() => {});
        }
        if (!lmRef.current && !failReasonRef.current) setGuide("Camera ready, preparing the face check");
      } catch (e) {
        const denied = e instanceof DOMException && e.name === "NotAllowedError";
        const reason = denied ? "Camera permission was not given. You can upload a photo instead." : "The camera could not be opened. You can upload a photo instead.";
        failReasonRef.current = reason;
        setGuide(reason);
        setTimeout(() => finish(null, reason), 2200);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facing]);

  /* arm the analyser in VIDEO mode, run the sampling loop, tear down on unmount */
  useEffect(() => {
    closedRef.current = false;
    firingRef.current = false;
    const prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    /* dialog focus: move in on open, Escape closes, hand focus back on close */
    const opener = document.activeElement as HTMLElement | null;
    sheetRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        finish(null);
      }
    };
    document.addEventListener("keydown", onKey);
    let loop: ReturnType<typeof setInterval> | null = null;
    (async () => {
      let lm: typeof lmRef.current = null;
      try {
        lm = await getLandmarker();
        if (closedRef.current) return; /* cancelled while the model loaded: never flip the singleton */
        await lm!.setOptions({ runningMode: "VIDEO" });
      } catch {
        const reason = "The face check is not available here. You can upload a photo instead.";
        failReasonRef.current = reason;
        setGuide(reason);
        setTimeout(() => finish(null, reason), 2500);
        return;
      }
      if (closedRef.current) {
        try {
          await lm!.setOptions({ runningMode: "IMAGE" });
        } catch {}
        return;
      }
      lmRef.current = lm;
      setArmed(true);
      if (!failReasonRef.current) setGuide("Looking for your face");

      loop = setInterval(() => {
        if (closedRef.current || firingRef.current || !streamRef.current) return;
        const v = videoRef.current;
        if (!v || v.readyState < 2) return;
        const cv = grab();
        if (!cv) return;
        const ts = performance.now();
        if (ts <= lastTsRef.current) return; /* detectForVideo demands a rising timestamp */
        lastTsRef.current = ts;
        let res: Parameters<typeof judge>[0];
        try {
          res = lm!.detectForVideo(cv, ts) as Parameters<typeof judge>[0];
        } catch {
          return;
        }
        if (!res.faceLandmarks?.length) {
          setGuide("I cannot see you. Come closer and find some light.");
          setYawText("");
          holdRef.current = 0;
          setHeld(0);
          return;
        }
        const verdict = judge(res, cv, angle);
        const yaw = verdict.metrics?.yaw ?? 0;
        setYawText(`turn ${yaw.toFixed(0)} deg`);
        if (!verdict.ok) {
          /* yaw is what the live line coaches; distance, blur or a second face
             are the gate's own words, or the guide would say "hold still" forever */
          setGuide(cfg.test(yaw) && verdict.why ? verdict.why : cfg.live(yaw));
          holdRef.current = 0;
          setHeld(0);
          return;
        }
        if (!holdRef.current) holdRef.current = ts;
        const h = Math.min(1, (ts - holdRef.current) / HOLD_MS);
        setGuide("Perfect, hold still");
        setHeld(h);
        if (h >= 1) shoot(cv, false);
      }, TICK_MS);
    })();
    return () => {
      if (loop) clearInterval(loop);
      closedRef.current = true;
      document.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = prevOverflow;
      opener?.focus?.();
      stopStream();
      if (lmRef.current) lmRef.current.setOptions({ runningMode: "IMAGE" }).catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={sheetRef}
      tabIndex={-1}
      className="fixed inset-0 z-[90] flex flex-col bg-page-bg text-page-text outline-none"
      data-scheme="dark"
      data-camera-sheet={angle}
      role="dialog"
      aria-modal="true"
      aria-label={`${TITLES[angle]}, live camera`}
    >
      <div className="relative flex-1 overflow-hidden">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="h-full w-full object-cover"
          style={{ transform: facing === "user" ? "scaleX(-1)" : "none" }}
        />
        {/* the hold ring: fills while the gate holds, resets when it breaks */}
        <svg viewBox="0 0 100 100" aria-hidden className="pointer-events-none absolute inset-0 m-auto h-[62%] w-auto" data-hold={held.toFixed(2)}>
          <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.5" />
          <circle
            cx="50"
            cy="50"
            r="46"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={RING}
            strokeDashoffset={RING * (1 - held)}
            transform="rotate(-90 50 50)"
          />
        </svg>
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-0 bg-bone transition-opacity duration-200 ${flash ? "opacity-80" : "opacity-0"}`}
        />
      </div>

      <div className="px-24 pt-16 max-md:px-16">
        <p className="text-p1 max-md:text-mp1 font-semibold">{TITLES[angle]}</p>
        <p className="mt-4 text-p2 max-md:text-mp2" data-camera-guide aria-live="polite">
          {guide}
        </p>
        {/* rewritten every tick: kept out of the live region on purpose */}
        <p className="mt-4 text-p2 max-md:text-mp2 text-muted" aria-hidden="true">
          {yawText}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-12 px-24 pb-32 pt-16 max-md:px-16 max-md:pb-24">
        {armed ? (
          <PillButton
            variant="solid"
            onClick={() => {
              const cv = grab();
              if (cv) shoot(cv, true);
            }}
          >
            Take now
          </PillButton>
        ) : (
          <span className="text-p2 max-md:text-mp2 font-medium uppercase tracking-[0.08em] text-muted" aria-live="polite">
            Preparing
          </span>
        )}
        <PillButton variant="outline" onClick={() => finish(null)}>
          Cancel
        </PillButton>
        <PillButton variant="outline" onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))}>
          Switch camera
        </PillButton>
      </div>
    </div>
  );
}
