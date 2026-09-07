"use client";

/*
 * Photo capture: three outlined cards (front, left profile, right profile),
 * each with a camera button and a gallery button feeding ONE input so both
 * paths run the identical validation (MediaPipe face gate, angle check, 3:4
 * face crop). The validator model pre-warms in the background the moment this
 * mounts. Motion: CSS color transitions only.
 */

import { useEffect, useRef, useState } from "react";
import type { Angle } from "@/lib/simulator/types";
import { fileToShot, type Shot } from "@/lib/simulator/client/photo";
import { getLandmarker } from "@/lib/simulator/client/landmarker";
import { PillButton } from "@/components/ui/pill-button";
import { SimCamera, cameraAvailable } from "@/components/simulator/sim-camera";

const SLOTS: { angle: Angle; title: string; hint: string }[] = [
  { angle: "front", title: "Front", hint: "Look straight at the camera" },
  { angle: "left", title: "Left profile", hint: "Turn until your left ear is visible" },
  { angle: "right", title: "Right profile", hint: "Turn the other way, until your right ear shows" },
];

export function SimCapture({
  photos,
  issues,
  consent,
  onConsent,
  onPhoto,
  onReady,
}: {
  photos: Partial<Record<Angle, Shot>>;
  issues: Partial<Record<Angle, string | undefined>>;
  consent: boolean;
  onConsent: (v: boolean) => void;
  onPhoto: (angle: Angle, shot: Shot | null) => void;
  onReady: () => void;
}) {
  const [busy, setBusy] = useState<Partial<Record<Angle, boolean>>>({});
  const [localErr, setLocalErr] = useState<Partial<Record<Angle, string>>>({});
  const inputs = useRef<Partial<Record<Angle, HTMLInputElement | null>>>({});
  const [camAngle, setCamAngle] = useState<Angle | null>(null);
  /* once the in-page camera has failed (permission refused, no webcam, camera
     busy, model unavailable) every later Take photo goes to the OS camera
     through the file input instead of reopening a sheet that will fail again */
  const camFailed = useRef(false);
  const count = SLOTS.filter((s) => photos[s.angle]).length;

  /* warm the face validator while the visitor reads the instructions */
  useEffect(() => {
    getLandmarker().catch(() => {});
  }, []);

  /* Take photo: the live auto-capture sheet where the browser allows it (secure
     context + getUserMedia), otherwise the native camera through the file input.
     Upload: the file picker. Both hand a File to the same gates. */
  const open = (angle: Angle, camera: boolean) => {
    if (camera && cameraAvailable() && !camFailed.current) {
      setCamAngle(angle);
      return;
    }
    const input = inputs.current[angle];
    if (!input) return;
    if (camera) input.setAttribute("capture", "user");
    else input.removeAttribute("capture");
    input.click();
  };

  async function handle(angle: Angle, file: File | undefined) {
    if (!file) return;
    setBusy((b) => ({ ...b, [angle]: true }));
    setLocalErr((e) => ({ ...e, [angle]: undefined }));
    const { shot, error } = await fileToShot(file, angle);
    setBusy((b) => ({ ...b, [angle]: false }));
    if (error) {
      setLocalErr((e) => ({ ...e, [angle]: error }));
      onPhoto(angle, null);
      return;
    }
    onPhoto(angle, shot!);
  }

  return (
    <section>
      {camAngle && (
        <SimCamera
          angle={camAngle}
          onShot={(file) => {
            const a = camAngle;
            setCamAngle(null);
            handle(a, file);
          }}
          onClose={(reason) => {
            const a = camAngle;
            setCamAngle(null);
            if (reason && a) {
              camFailed.current = true;
              setLocalErr((e) => ({ ...e, [a]: reason + " Tap Take photo again to use your phone's own camera." }));
            }
          }}
        />
      )}
      <h2 className="text-h2 max-md:text-mh2 font-semibold">Three photos, better recommendation</h2>
      <p className="mt-16 max-w-[560px] text-p1 max-md:text-mp1 text-muted">
        A fade only shows from the side, which is why we ask for both profiles as well as the
        front. Tap Take photo and the camera fires by itself once you are turned the right way;
        find light facing you and take off any cap or sunglasses.
      </p>

      <div className="mt-32 grid grid-cols-3 gap-16 max-md:grid-cols-1">
        {SLOTS.map(({ angle, title, hint }) => {
          const shot = photos[angle];
          const issue = issues[angle] || localErr[angle];
          return (
            <div
              key={angle}
              data-angle={angle}
              data-state={shot ? "ok" : issue ? "bad" : "empty"}
              className="slot rounded-card border-2 border-line-strong p-16"
            >
              <div className="rounded-media relative mb-16 aspect-[3/4] overflow-hidden bg-panel">
                {shot ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={shot.dataUrl} alt={`Your ${title.toLowerCase()} photo`} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center px-16 text-center text-p2 max-md:text-mp2 text-muted">
                    {hint}
                  </div>
                )}
              </div>
              <h3 className="text-h4 font-semibold">{title}</h3>
              {issue && (
                <p className="slot-issue mt-8 text-p2 max-md:text-mp2 text-accent" role="alert">
                  {issue}
                </p>
              )}
              {shot && !issue && shot.yaw !== undefined && (
                <p className="mt-8 text-p2 max-md:text-mp2 text-muted">Face verified, turn {Math.round(shot.yaw)} deg</p>
              )}
              <div className={`mt-16 flex flex-wrap items-center gap-12 ${busy[angle] ? "pointer-events-none opacity-40" : ""}`}>
                <span data-open="camera">
                  <PillButton variant="solid" onClick={() => open(angle, true)}>
                    {busy[angle] ? "Validating" : shot ? "Retake" : "Take photo"}
                  </PillButton>
                </span>
                <span data-open="gallery">
                  <PillButton variant="outline" onClick={() => open(angle, false)}>
                    Upload
                  </PillButton>
                </span>
                <input
                  ref={(el) => {
                    inputs.current[angle] = el;
                  }}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => {
                    handle(angle, e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-32 flex flex-wrap items-center justify-between gap-16">
        <p className="text-p2 max-md:text-mp2 text-muted" data-capture-status={count === 3 ? "ready" : "waiting"}>
          {count === 3 ? "Ready." : "Add your front photo and both profiles to continue."}
        </p>
        <span className={count < 3 ? "pointer-events-none opacity-40" : ""} aria-disabled={count < 3}>
          <PillButton variant="solid" onClick={onReady}>
            Continue
          </PillButton>
        </span>
      </div>
      {process.env.NEXT_PUBLIC_SIM_STORE === "1" ? (
        <label className="mt-24 flex max-w-[620px] cursor-pointer items-start gap-12" data-consent>
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => onConsent(e.target.checked)}
            className="mt-4 h-16 w-16 cursor-pointer accent-[color:var(--page-accent)]"
          />
          <span className="text-p2 max-md:text-mp2 text-muted">
            Save my photos and the generated previews to the private improvement log, so the
            simulator gets better. Optional: leave it unticked and nothing is stored.
          </span>
        </label>
      ) : (
        <p className="mt-24 text-p2 max-md:text-mp2 text-muted">
          Privacy: your photos are encrypted in transit, analyzed and discarded. They are not
          stored and they are not used to train models.
        </p>
      )}
    </section>
  );
}
