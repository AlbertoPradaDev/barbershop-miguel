"use client";

/*
 * The result: combined profile, best-match viewer with a before and after pair,
 * the other three generated views, a per-angle before and after drag comparator
 * (clip-path sweep), a try-any-cut grid, a compare picker for two to four cuts,
 * the barber card with copy, and the shareable canvas card. Overlays sit on
 * bg-ink; motion is CSS transitions plus the built-in pulse on loading lines.
 * Internal profile enums are translated for display here and nowhere else.
 */

import { useRef, useState } from "react";
import type { Angle, AnalyzeResponse, ScoredStyleDTO, SimAngle } from "@/lib/simulator/types";
import type { Shot } from "@/lib/simulator/client/photo";
import { renderCard } from "@/lib/simulator/client/card";
import { HAIRSTYLES, styleById } from "@/lib/simulator/catalog";
import { PillButton } from "@/components/ui/pill-button";

export interface SimState {
  status: "loading" | "done" | "error";
  images: Partial<Record<SimAngle, string>>;
  failed: SimAngle[];
  mock?: boolean;
  error?: string;
  retried?: boolean;
}

const SHAPE_EN: Record<string, string> = {
  oval: "oval",
  rectangular: "rectangular",
  square: "square",
  round: "round",
  heart: "heart",
  diamond: "diamond",
  triangular: "triangular",
};
const TEXTURE_EN: Record<string, string> = { liso: "straight", ondulado: "wavy", rizado: "curly", "muy-rizado": "coily" };
const LEVEL_EN: Record<string, string> = { baja: "low", media: "medium", alta: "high", bajo: "low", medio: "medium", alto: "high" };
const LENGTH_EN: Record<string, string> = { "muy-corto": "very short", corto: "short", medio: "medium", largo: "long" };
const HAIRLINE_EN: Record<string, string> = { normal: "even", entradas: "receding corners", retroceso: "receding" };
const HEAD_EN: Record<string, string> = { corta: "compact", media: "balanced", alargada: "elongated" };

function barberText(styleId: string): string {
  const s = styleById(styleId)!;
  return [
    s.name.toUpperCase(),
    "",
    `Top: ${s.barber.top}`,
    `Sides: ${s.barber.sides}`,
    `Fade: ${s.barber.fade}`,
    `Texture: ${s.barber.texture}`,
    `Fringe: ${s.barber.fringe}`,
    `Finish: ${s.barber.finish}`,
  ].join("\n");
}

export function SimResults({
  analysis,
  photos,
  sims,
  onSimulate,
  onRestart,
}: {
  analysis: AnalyzeResponse;
  photos: Record<Angle, Shot>;
  sims: Record<string, SimState>;
  onSimulate: (styleId: string) => void;
  onRestart: () => void;
}) {
  const [currentId, setCurrentId] = useState(analysis.recommendation.id);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [ficha, setFicha] = useState<{ forId: string; url: string; blob: Blob } | null>(null);
  const [fichaBusy, setFichaBusy] = useState(false);
  const [cmpView, setCmpView] = useState<SimAngle | null>(null);
  const [cmpPct, setCmpPct] = useState(50);
  const cmpDrag = useRef(false);
  /* per-view human verdicts, keyed cutId/angle; the teach signal for the log */
  const [marks, setMarks] = useState<Record<string, "good" | "off">>({});

  const p = analysis.profile;
  const current = styleById(currentId)!;
  const currentScore: ScoredStyleDTO | undefined =
    analysis.recommendation.id === currentId
      ? analysis.recommendation
      : analysis.alternatives.find((a) => a.id === currentId);
  const sim = sims[currentId];
  const gotAngles = sim ? (Object.keys(sim.images) as SimAngle[]).length : 0;
  const doneIds = Object.keys(sims).filter((id) => sims[id].status === "done" && sims[id].images.front);

  const view = (id: string) => {
    setCurrentId(id);
    onSimulate(id);
  };

  const toggleCompare = (id: string) =>
    setCompareIds((c) => (c.includes(id) ? c.filter((x) => x !== id) : c.length < 4 ? [...c, id] : c));

  const copyBarber = async () => {
    const text = barberText(currentId);
    let ok = false;
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        ok = document.execCommand("copy");
      } catch {
        ok = false;
      }
      ta.remove();
    }
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const makeFicha = async () => {
    if (!sim?.images.front) return;
    setFichaBusy(true);
    try {
      const dataUrl = await renderCard(
        { hero: sim.images.front, left: sim.images.left, right: sim.images.right, back: sim.images.back },
        current,
        { mock: sim.mock }
      );
      /* blob URL, not the data URL: iOS Safari silently ignores a download of a
         data: URL, and a half-megabyte href bloats the DOM. Decoded by hand:
         fetch() of a data: URL falls under connect-src 'self' and the site's
         CSP rightly refuses it. */
      const b64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const blob = new Blob([bytes], { type: "image/jpeg" });
      setFicha((prev) => {
        if (prev) URL.revokeObjectURL(prev.url);
        return { forId: currentId, url: URL.createObjectURL(blob), blob };
      });
      if (analysis.sessionId) {
        fetch("/api/simulator/history/ficha", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: analysis.sessionId, cutId: currentId, image: dataUrl }),
        }).catch(() => {});
      }
    } catch (e) {
      /* the button re-enables for a retry; never swallow the reason */
      console.warn("card composition failed:", e);
    }
    setFichaBusy(false);
  };

  const sendFeedback = (angle: SimAngle, verdict: "good" | "off") => {
    if (!analysis.sessionId) return;
    setMarks((m) => ({ ...m, [`${currentId}/${angle}`]: verdict }));
    fetch("/api/simulator/history/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: analysis.sessionId, cutId: currentId, angle, verdict }),
    }).catch(() => {});
  };

  const feedbackChips = (angle: SimAngle) => {
    if (!analysis.stored || !sim?.images[angle]) return null;
    const mark = marks[`${currentId}/${angle}`];
    const chip = (v: "good" | "off", label: string) => (
      <button
        type="button"
        data-feedback={v}
        aria-pressed={mark === v}
        onClick={() => sendFeedback(angle, v)}
        className={`cursor-pointer rounded-full px-10 py-4 text-[0.75rem] transition-colors duration-200 ${
          mark === v ? "bg-ink text-bone" : "bg-panel text-muted hover:bg-ink hover:text-bone"
        }`}
      >
        {label}
      </button>
    );
    return (
      <div className="mt-6 flex justify-center gap-6" data-feedback-row={angle}>
        {chip("good", "Looks right")}
        {chip("off", "Looks off")}
      </div>
    );
  };

  const openCmp = (a: SimAngle) => {
    if (!sim?.images[a]) return;
    setCmpPct(50);
    setCmpView(a);
  };
  const cmpDragTo = (clientX: number, el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    setCmpPct(Math.max(2, Math.min(98, ((clientX - r.left) / r.width) * 100)));
  };

  return (
    <section>
      {analysis.mock && (
        <p className="mock-banner mb-24 rounded-card border-2 border-line-strong p-16 text-p2 max-md:text-mp2 text-accent" role="status">
          TEST MODE. This analysis is a fixed example (no AI provider configured). It is not your
          real profile.
        </p>
      )}

      <h2 className="text-h2 max-md:text-mh2 font-semibold">Your analysis</h2>
      <div className="mt-16 flex flex-wrap gap-8" data-profile-chips>
        <span className="rounded-full bg-panel px-16 py-8 text-p2 max-md:text-mp2">
          Face: leans {SHAPE_EN[p.face.primaryShape]}
          {p.face.secondaryShape ? ` and ${SHAPE_EN[p.face.secondaryShape]}` : ""}, {Math.round(p.face.confidence * 100)}%
        </span>
        <span className="rounded-full bg-panel px-16 py-8 text-p2 max-md:text-mp2">
          Hair: {TEXTURE_EN[p.hair.texture]}, {LEVEL_EN[p.hair.density]} density, {LEVEL_EN[p.hair.volume]} volume
        </span>
        <span className="rounded-full bg-panel px-16 py-8 text-p2 max-md:text-mp2">
          Current length: {LENGTH_EN[p.hair.length]}, hairline {HAIRLINE_EN[p.hair.hairline]}
        </span>
        <span className="rounded-full bg-panel px-16 py-8 text-p2 max-md:text-mp2">
          Forehead {LEVEL_EN[p.head.foreheadSize]}, proportions {HEAD_EN[p.head.overallShape]}
        </span>
      </div>

      {/* best match viewer */}
      <div className="mt-40 rounded-card border-2 border-line-strong p-24 max-md:p-16">
        <div className="flex flex-wrap items-baseline justify-between gap-12">
          <h2 className="text-h3 max-md:text-mh3 font-semibold" data-match-name>
            {currentId === analysis.recommendation.id ? `Your best match: ${current.name}` : `Trying: ${current.name}`}
          </h2>
          {currentScore && (
            <span className="text-p1 max-md:text-mp1 font-semibold text-accent" data-match-score>
              {Math.round(currentScore.score * 100)}% match
            </span>
          )}
        </div>
        <p className="mt-8 text-p2 max-md:text-mp2 text-muted">
          The percentage is an internal compatibility score, not a scientific claim.
        </p>

        <div className="mt-24 grid grid-cols-2 gap-16 max-md:gap-8">
          <figure>
            <div className="rounded-media relative aspect-[3/4] overflow-hidden bg-panel">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photos.front.dataUrl} alt="Your front photo now" className="h-full w-full object-cover" />
            </div>
            <figcaption className="mt-8 text-center text-p2 max-md:text-mp2 text-muted">Now</figcaption>
          </figure>
          <figure>
            <div className="rounded-media relative aspect-[3/4] overflow-hidden bg-panel" data-sim-state={sim?.status || "idle"}>
              {sim?.images.front && (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={sim.images.front}
                    alt={`Preview with ${current.name}`}
                    className="h-full w-full cursor-zoom-in object-cover"
                    onClick={() => openCmp("front")}
                  />
                  <span className="absolute left-8 top-8 rounded-btn bg-ink/80 px-8 py-4 text-[0.75rem] font-semibold text-bone">
                    AI
                  </span>
                  {sim.mock && (
                    <span className="mock-stamp absolute inset-x-0 top-1/2 -translate-y-1/2 rotate-[-12deg] bg-accent/80 py-8 text-center text-p2 max-md:text-mp2 font-bold text-bone">
                      TEST PREVIEW, UNCHANGED PHOTO
                    </span>
                  )}
                </>
              )}
              {!sim?.images.front && sim?.status === "loading" && (
                <div className="flex h-full flex-col items-center justify-center gap-12 px-16 text-center">
                  <div className="h-px w-64 animate-pulse bg-accent" />
                  <p className="text-p2 max-md:text-mp2 text-muted">
                    Generating your four views ({gotAngles} of 4). It can take a minute.
                  </p>
                </div>
              )}
              {sim?.status === "error" && !sim.images.front && (
                <div className="flex h-full flex-col items-center justify-center gap-12 px-16 text-center">
                  <p className="text-p2 max-md:text-mp2 text-accent">{sim.error}</p>
                  <PillButton variant="outline" onClick={() => onSimulate(currentId)}>
                    Retry
                  </PillButton>
                </div>
              )}
              {!sim && (
                <div className="flex h-full items-center justify-center px-16 text-center text-p2 max-md:text-mp2 text-muted">
                  Preview pending
                </div>
              )}
            </div>
            <figcaption className="mt-8 text-center text-p2 max-md:text-mp2 text-muted">
              With {current.name}. AI preview, tap to compare
            </figcaption>
            {feedbackChips("front")}
          </figure>
        </div>

        {/* the other three views */}
        {sim && (
          <div className="mt-12 grid grid-cols-3 gap-16 max-md:gap-8" data-angle-strip>
            {(
              [
                ["left", "Left"],
                ["right", "Right"],
                ["back", "Back, illustrative"],
              ] as const
            ).map(([a, label]) => (
              <figure key={a}>
                <div className="rounded-media relative aspect-[3/4] overflow-hidden bg-panel" data-angle-cell={a}>
                  {sim.images[a] ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={sim.images[a]}
                        alt={`${label} view with ${current.name}`}
                        className="h-full w-full cursor-zoom-in object-cover"
                        data-ready="1"
                        onClick={() => openCmp(a)}
                      />
                      <span className="absolute left-8 top-8 rounded-btn bg-ink/80 px-8 py-4 text-[0.6875rem] font-semibold text-bone">
                        AI
                      </span>
                    </>
                  ) : sim.failed.includes(a) ? (
                    <div className="flex h-full items-center justify-center px-8 text-center text-p2 max-md:text-mp2 text-muted">
                      not available
                    </div>
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <div className="h-px w-40 animate-pulse bg-accent" />
                    </div>
                  )}
                </div>
                <figcaption className="mt-8 text-center text-p2 max-md:text-mp2 text-muted">
                  {label}
                  {sim.images[a] && a !== "back" ? ", tap to compare" : ""}
                </figcaption>
                {feedbackChips(a)}
              </figure>
            ))}
          </div>
        )}

        <div className="mt-24 flex flex-wrap items-center gap-12">
          <span className={!sim?.images.front || fichaBusy ? "pointer-events-none opacity-40" : ""}>
            <PillButton variant="solid" onClick={makeFicha} ariaLabel="Create my card">
              {fichaBusy ? "Composing" : "Create my card"}
            </PillButton>
          </span>
          {sim && sim.failed.length > 0 && (
            <PillButton variant="outline" onClick={() => onSimulate(currentId)}>
              Retry missing views
            </PillButton>
          )}
        </div>

        {ficha && ficha.forId === currentId && (
          <div className="mt-24" data-ficha-block>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ficha.url} alt={`Your card with ${current.name}`} className="rounded-media w-full max-w-[420px]" />
            <div className="mt-16 flex flex-wrap items-center gap-12">
              <a
                data-ficha-dl
                href={ficha.url}
                download={`mrsociety-${currentId}.jpg`}
                className="cursor-pointer text-p2 max-md:text-mp2 font-medium uppercase tracking-[0.08em] underline-link"
              >
                Download
              </a>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const file = new File([ficha.blob], `mrsociety-${currentId}.jpg`, { type: "image/jpeg" });
                    if (navigator.canShare?.({ files: [file] })) {
                      await navigator.share({ files: [file], title: "My cut" });
                      return;
                    }
                  } catch {}
                  document.querySelector<HTMLAnchorElement>("[data-ficha-dl]")?.click();
                }}
                className="cursor-pointer text-p2 max-md:text-mp2 font-medium uppercase tracking-[0.08em] underline-link"
              >
                Share
              </button>
            </div>
            <p className="mt-12 text-p2 max-md:text-mp2 text-muted">
              On iPhone, if the download does not appear, use Share and pick Save Image.
            </p>
          </div>
        )}

        {currentScore && currentScore.reasons.length > 0 && (
          <div className="mt-24">
            <h3 className="text-h4 font-semibold">Why it can work</h3>
            <ul className="mt-12 flex flex-col gap-8" data-reasons>
              {currentScore.reasons.map((r, i) => (
                <li key={i} className="border-l-2 border-line-strong pl-12 text-p2 max-md:text-mp2">
                  {r}
                </li>
              ))}
            </ul>
          </div>
        )}
        {currentScore && currentScore.cautions.length > 0 && (
          <div className="mt-16">
            <h3 className="text-h4 font-semibold text-muted">Worth knowing</h3>
            <ul className="mt-12 flex flex-col gap-8">
              {currentScore.cautions.map((r, i) => (
                <li key={i} className="border-l-2 border-line pl-12 text-p2 max-md:text-mp2 text-muted">
                  {r}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* comparator overlay */}
      {cmpView && sim?.images[cmpView] && (
        <div
          className="fixed inset-0 z-50 flex cursor-zoom-out flex-col items-center justify-center gap-12 bg-ink/95 p-16"
          data-cmp-box
          role="dialog"
          aria-label="Before and after comparison"
          onClick={() => setCmpView(null)}
        >
          <div
            className="rounded-media relative aspect-[3/4] max-w-[92vw] touch-none cursor-default overflow-hidden"
            style={{ height: "min(80svh, 122vw)" }}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => {
              if (cmpView === "back") return;
              cmpDrag.current = true;
              e.currentTarget.setPointerCapture(e.pointerId);
              cmpDragTo(e.clientX, e.currentTarget);
            }}
            onPointerMove={(e) => {
              if (cmpDrag.current) cmpDragTo(e.clientX, e.currentTarget);
            }}
            onPointerUp={() => {
              cmpDrag.current = false;
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={sim.images[cmpView]} alt="After" data-role="after" className="h-full w-full object-cover" />
            {cmpView !== "back" && photos[cmpView as Angle] && (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photos[cmpView as Angle].dataUrl}
                  alt="Before"
                  data-role="before"
                  className="absolute inset-0 h-full w-full object-cover"
                  style={{ clipPath: `inset(0 ${100 - cmpPct}% 0 0)` }}
                />
                <div className="pointer-events-none absolute inset-y-0 w-2 bg-bone" style={{ left: cmpPct + "%" }} />
                <span className="pointer-events-none absolute left-8 top-8 rounded-btn bg-ink/75 px-8 py-4 text-[0.75rem] font-semibold text-bone">
                  BEFORE
                </span>
                <span className="pointer-events-none absolute right-8 top-8 rounded-btn bg-ink/75 px-8 py-4 text-[0.75rem] font-semibold text-bone">
                  AFTER
                </span>
              </>
            )}
          </div>
          <p className="text-p2 max-md:text-mp2 text-bone/70">
            {cmpView === "back"
              ? "Illustrative back view. Tap outside to close"
              : "Drag to compare before and after. Tap outside to close"}
          </p>
        </div>
      )}

      {/* alternatives */}
      <h2 className="mt-48 text-h3 max-md:text-mh3 font-semibold">Alternatives for you</h2>
      <div className="mt-16 grid grid-cols-3 gap-16 max-md:grid-cols-1 max-md:gap-8" data-alternatives>
        {analysis.alternatives.map((a) => {
          const s = styleById(a.id);
          if (!s) return null;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => view(a.id)}
              aria-pressed={currentId === a.id}
              className={`cursor-pointer rounded-card border-2 p-16 text-left transition-colors duration-200 ${
                currentId === a.id ? "border-line-strong bg-panel" : "border-line-strong hover:bg-panel"
              }`}
            >
              <span className="flex items-baseline justify-between gap-8">
                <span className="text-p1 max-md:text-mp1 font-semibold">{s.name}</span>
                <span className="text-p2 max-md:text-mp2 text-accent">{Math.round(a.score * 100)}%</span>
              </span>
              <span className="mt-4 block text-p2 max-md:text-mp2 text-muted">{LENGTH_EN[s.lengthClass]}</span>
            </button>
          );
        })}
      </div>

      {/* try any cut */}
      <h2 className="mt-48 text-h3 max-md:text-mh3 font-semibold">Try any cut</h2>
      <p className="mt-8 text-p2 max-md:text-mp2 text-muted">
        {analysis.mock
          ? "Test mode: previews return your original photos with a test stamp."
          : "Every cut is generated for real on your photos, in four views. It takes about a minute."}
      </p>
      <div className="mt-16 grid grid-cols-4 gap-8 max-md:grid-cols-2" data-try-grid>
        {HAIRSTYLES.map((s) => {
          const st = sims[s.id];
          return (
            <button
              key={s.id}
              type="button"
              data-cut={s.id}
              onClick={() => view(s.id)}
              aria-pressed={currentId === s.id}
              className={`trybtn cursor-pointer rounded-card border-2 px-12 py-10 text-left transition-colors duration-200 ${
                currentId === s.id ? "border-line-strong bg-panel" : "border-line-strong hover:bg-panel"
              }`}
            >
              <span className="block text-p2 max-md:text-mp2 font-medium">{s.name}</span>
              <span className="block text-p2 max-md:text-mp2 text-muted">
                {LENGTH_EN[s.lengthClass]}
                {st?.status === "done" && <span className="text-page-text"> · ready</span>}
                {st?.status === "loading" && <span className="animate-pulse text-accent"> · generating</span>}
              </span>
            </button>
          );
        })}
      </div>

      {/* compare picker */}
      {doneIds.length >= 2 && (
        <div className="mt-48" data-compare-block>
          <h2 className="text-h3 max-md:text-mh3 font-semibold">Compare</h2>
          <p className="mt-8 text-p2 max-md:text-mp2 text-muted">Pick two to four cuts you have already generated.</p>
          <div className="mt-16 flex flex-wrap items-center gap-8">
            {doneIds.map((id) => (
              <button
                key={id}
                type="button"
                aria-pressed={compareIds.includes(id)}
                onClick={() => toggleCompare(id)}
                className={`cursor-pointer rounded-full px-16 py-8 text-p2 max-md:text-mp2 transition-colors duration-200 ${
                  compareIds.includes(id) ? "bg-ink text-bone" : "bg-panel hover:bg-ink hover:text-bone"
                }`}
              >
                {styleById(id)?.name}
              </button>
            ))}
            <span className={compareIds.length < 2 ? "pointer-events-none opacity-40" : ""}>
              <PillButton variant="solid" onClick={() => setCompareOpen(true)} ariaLabel="Compare side by side">
                Side by side
              </PillButton>
            </span>
          </div>
        </div>
      )}

      {compareOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-16 overflow-auto bg-ink/95 p-16"
          data-compare-modal
          role="dialog"
          aria-label="Cut comparison"
          onClick={() => setCompareOpen(false)}
        >
          <div className="grid w-full max-w-[1100px] grid-cols-5 gap-12 max-md:grid-cols-2" onClick={(e) => e.stopPropagation()}>
            <figure>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photos.front.dataUrl} alt="Now" className="rounded-media aspect-[3/4] w-full object-cover" />
              <figcaption className="mt-6 text-center text-p2 max-md:text-mp2 text-bone/70">Now</figcaption>
            </figure>
            {compareIds.map((id) => (
              <figure key={id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={sims[id]?.images.front}
                  alt={`Preview ${styleById(id)?.name}`}
                  className="rounded-media aspect-[3/4] w-full object-cover"
                />
                <figcaption className="mt-6 text-center text-p2 max-md:text-mp2 text-bone/70">
                  {styleById(id)?.name}, AI
                </figcaption>
              </figure>
            ))}
          </div>
          <PillButton variant="solid" onClick={() => setCompareOpen(false)}>
            Close
          </PillButton>
        </div>
      )}

      {/* barber card */}
      <div className="mt-48 rounded-card border-2 border-line-strong p-24 max-md:p-16" data-barber-card>
        <h2 className="text-h3 max-md:text-mh3 font-semibold">Show this to your barber</h2>
        <p className="mt-4 text-p1 max-md:text-mp1 text-accent">{current.name}</p>
        <dl className="mt-20 grid grid-cols-2 gap-x-32 gap-y-12 max-md:grid-cols-1">
          {(
            [
              ["Top", current.barber.top],
              ["Sides", current.barber.sides],
              ["Fade", current.barber.fade],
              ["Texture", current.barber.texture],
              ["Fringe", current.barber.fringe],
              ["Finish", current.barber.finish],
            ] as const
          ).map(([k, v]) => (
            <div key={k} className="flex justify-between gap-16 border-b border-line pb-8 text-p2 max-md:text-mp2">
              <dt className="text-muted">{k}</dt>
              <dd className="text-right">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-24">
          <PillButton variant="solid" onClick={copyBarber} ariaLabel="Copy barber instructions">
            {copied ? "Copied" : "Copy instructions"}
          </PillButton>
        </div>
      </div>

      <div className="mt-48 flex flex-wrap items-center justify-between gap-16">
        <p className="max-w-[520px] text-p2 max-md:text-mp2 text-muted">
          A guide based on what is visible in your photos. The mirror and your barber have the
          final word.{" "}
          {analysis.stored ? (
            <>
              This session was saved to the local{" "}
              <a href="/simulator/history" className="cursor-pointer text-accent underline-link">
                improvement log
              </a>
              , and the Looks right and Looks off marks under each view train our reviews.
            </>
          ) : (
            "Your photos were not stored."
          )}
        </p>
        <PillButton variant="outline" onClick={onRestart}>
          Start over
        </PillButton>
      </div>
    </section>
  );
}
