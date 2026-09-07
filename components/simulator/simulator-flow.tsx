"use client";

/*
 * Simulator orchestrator: capture, questions, analyzing, result. No motion
 * beyond CSS transitions and the built-in pulse on loading lines, so there is
 * no GSAP here. Every value the async simulate flow reads goes through a ref:
 * the flow schedules its own retries, and a self-scheduled callback that reads
 * closure state re-enters with a stale snapshot and dies silently (learned the
 * hard way on the source build). Four views per cut are fanned out as parallel
 * per-angle requests; failed angles re-fire once automatically, and already
 * generated angles are never paid for twice.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { Angle, AnalyzeResponse, Preferences, SimAngle } from "@/lib/simulator/types";
import type { Shot } from "@/lib/simulator/client/photo";
import { SimCapture } from "@/components/simulator/sim-capture";
import { SimQuestions } from "@/components/simulator/sim-questions";
import { SimResults, type SimState } from "@/components/simulator/sim-results";

type Stage = "capture" | "questions" | "analyzing" | "result";

const ANALYZE_STEPS = [
  "Reading your face shape",
  "Estimating head proportions",
  "Reading your hair",
  "Comparing twenty styles",
  "Preparing your recommendation",
];

export function SimulatorFlow() {
  const [stage, setStage] = useState<Stage>("capture");
  const [photos, setPhotos] = useState<Partial<Record<Angle, Shot>>>({});
  const [slotIssues, setSlotIssues] = useState<Partial<Record<Angle, string>>>({});
  const [prefs, setPrefs] = useState<Preferences>({});
  /* pre-ticked where the improvement log is on: the checkbox is still visible,
     worded plainly, and one tap opts out; the store never writes without it */
  const [consent, setConsent] = useState(process.env.NEXT_PUBLIC_SIM_STORE === "1");
  const consentRef = useRef(consent);
  consentRef.current = consent;
  const [analysis, setAnalysis] = useState<AnalyzeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stepIdx, setStepIdx] = useState(0);
  const [sims, setSims] = useState<Record<string, SimState>>({});

  const simsRef = useRef(sims);
  simsRef.current = sims;
  const photosRef = useRef(photos);
  photosRef.current = photos;
  const analysisRef = useRef(analysis);
  analysisRef.current = analysis;

  /* hydration beacon: the SSR HTML exists before React attaches listeners, so
     automation can only trust interactions after this flips */
  useEffect(() => {
    document.documentElement.dataset.simReady = "1";
    return () => {
      delete document.documentElement.dataset.simReady;
    };
  }, []);

  useEffect(() => {
    if (stage !== "analyzing") return;
    setStepIdx(0);
    const t = setInterval(() => setStepIdx((i) => Math.min(i + 1, ANALYZE_STEPS.length - 1)), 1400);
    return () => clearInterval(t);
  }, [stage]);

  const simulate = useCallback(
    async (styleId: string, p?: Partial<Record<Angle, Shot>>, texture?: string, session?: string) => {
      const ph = p || photosRef.current;
      if (!ph.front) return;
      const cur = simsRef.current[styleId];
      if (cur?.status === "loading") return;
      if (cur?.status === "done" && cur.failed.length === 0) return;
      const tex = texture || analysisRef.current?.profile.hair.texture;
      /* explicit param first: the initial call fires before the analysis state
         commits, so the ref has no sessionId yet */
      const sessionId = session || analysisRef.current?.sessionId;

      const have = cur?.images || {};
      const jobs: { angle: SimAngle; body: Partial<Record<Angle, string>> }[] = [];
      if (!have.front) jobs.push({ angle: "front", body: { front: ph.front.dataUrl } });
      if (ph.left && !have.left) jobs.push({ angle: "left", body: { left: ph.left.dataUrl } });
      if (ph.right && !have.right) jobs.push({ angle: "right", body: { right: ph.right.dataUrl } });
      if (ph.left && ph.right && !have.back)
        jobs.push({ angle: "back", body: { left: ph.left.dataUrl, right: ph.right.dataUrl } });
      if (!jobs.length) return;

      setSims((s) => ({
        ...s,
        [styleId]: { status: "loading", images: { ...have }, failed: [], mock: cur?.mock, retried: cur?.retried },
      }));

      const failedLocal: SimAngle[] = [];

      await Promise.all(
        jobs.map(async ({ angle, body }) => {
          try {
            const res = await fetch("/api/simulator/simulate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ photos: body, hairstyleId: styleId, hairTexture: tex, angle, sessionId }),
            });
            const j = await res.json();
            if (!res.ok) throw new Error(j.error || `error ${res.status}`);
            setSims((s) => {
              const st = s[styleId];
              if (!st) return s;
              return { ...s, [styleId]: { ...st, mock: j.mock, images: { ...st.images, [angle]: j.image } } };
            });
          } catch (e) {
            failedLocal.push(angle);
            setSims((s) => {
              const st = s[styleId];
              if (!st) return s;
              return {
                ...s,
                [styleId]: { ...st, failed: [...st.failed, angle], error: e instanceof Error ? e.message : "generation failed" },
              };
            });
          }
        })
      );

      /* a missing view is a broken promise: re-fire the failed angles once,
         automatically, before falling back to the manual retry button */
      const willRetry = failedLocal.length > 0 && !cur?.retried;
      setSims((s) => {
        const st = s[styleId];
        if (!st) return s;
        return { ...s, [styleId]: { ...st, status: st.images.front ? "done" : "error", retried: st.retried || willRetry } };
      });
      if (willRetry) setTimeout(() => simulate(styleId), 1500);
    },
    []
  );

  const analyze = useCallback(
    async (p: Partial<Record<Angle, Shot>>, prefs2: Preferences) => {
      setStage("analyzing");
      setError(null);
      try {
        /* one silent retry: a large POST from a phone occasionally truncates */
        const post = () =>
          fetch("/api/simulator/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              photos: { front: p.front!.dataUrl, left: p.left!.dataUrl, right: p.right!.dataUrl },
              preferences: prefs2,
              consent: consentRef.current,
            }),
          });
        let res = await post().catch(() => null);
        if (!res || res.status >= 500) {
          await new Promise((r) => setTimeout(r, 900));
          res = await post();
        }
        const j = await res.json();
        if (res.status === 422 && j.perPhoto) {
          const issues: Partial<Record<Angle, string>> = {};
          const next = { ...p };
          for (const v of j.perPhoto as { angle: Angle; ok: boolean; issue?: string }[]) {
            if (!v.ok) {
              issues[v.angle] = v.issue || "This photo did not pass. Please retake it.";
              delete next[v.angle];
            }
          }
          setSlotIssues(issues);
          setPhotos(next);
          setStage("capture");
          return;
        }
        if (!res.ok) throw new Error(j.error || `error ${res.status}`);
        setAnalysis(j as AnalyzeResponse);
        setStage("result");
        simulate(j.recommendation.id, p, (j as AnalyzeResponse).profile.hair.texture, (j as AnalyzeResponse).sessionId);
      } catch (e) {
        setError(e instanceof Error ? e.message : "The analysis could not be completed.");
        setStage("questions");
      }
    },
    [simulate]
  );

  const restart = () => {
    setPhotos({});
    setSlotIssues({});
    setPrefs({});
    setAnalysis(null);
    setSims({});
    setError(null);
    setStage("capture");
  };

  return (
    <div>
      <p className="text-p2 max-md:text-mp2 text-muted" data-stage={stage}>
        {stage === "capture" && "Step one. Your photos"}
        {stage === "questions" && "Step two. Your preferences"}
        {stage === "analyzing" && "Analyzing"}
        {stage === "result" && "Your result"}
      </p>

      <div className="mt-24 max-md:mt-16">
        {stage === "capture" && (
          <SimCapture
            photos={photos}
            issues={slotIssues}
            consent={consent}
            onConsent={setConsent}
            onPhoto={(angle, shot) => {
              setSlotIssues((s) => ({ ...s, [angle]: undefined }));
              setPhotos((p) => {
                const next = { ...p };
                if (shot) next[angle] = shot;
                else delete next[angle];
                return next;
              });
            }}
            onReady={() => setStage("questions")}
          />
        )}

        {stage === "questions" && (
          <SimQuestions
            prefs={prefs}
            onChange={setPrefs}
            error={error}
            onSubmit={() => analyze(photos, prefs)}
            onBack={() => setStage("capture")}
          />
        )}

        {stage === "analyzing" && (
          <section className="flex min-h-[50svh] flex-col items-center justify-center text-center" aria-live="polite">
            <div className="mb-32 h-px w-96 max-md:w-64 animate-pulse bg-accent" />
            <h2 className="text-h3 max-md:text-mh3">{ANALYZE_STEPS[stepIdx]}</h2>
            <p className="mt-16 text-p2 max-md:text-mp2 text-muted">
              {process.env.NEXT_PUBLIC_SIM_STORE === "1"
                ? "Your three photos are analyzed together and saved to the local improvement log."
                : "Your three photos are analyzed together and are not stored."}
            </p>
          </section>
        )}

        {stage === "result" && analysis && (
          <SimResults
            analysis={analysis}
            photos={photos as Record<Angle, Shot>}
            sims={sims}
            onSimulate={(id) => simulate(id)}
            onRestart={restart}
          />
        )}
      </div>
    </div>
  );
}
