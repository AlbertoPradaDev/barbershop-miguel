import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { listSessions, storeEnabled, type FeedbackEntry } from "@/lib/simulator/history";
import { styleById } from "@/lib/simulator/catalog";
import { SITE } from "@/lib/content/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Simulator improvement log, ${SITE.name}`,
  robots: { index: false, follow: false },
};

/*
 * The improvement log, read straight off the filesystem: every stored session
 * with its input photos, generated views, cards and the human verdicts. This
 * page exists only where NEXT_PUBLIC_SIM_STORE=1 (a local test install); on a
 * normal build it 404s.
 */

/* latest verdict per cut/angle wins; the jsonl keeps the full history */
function latestMarks(feedback: FeedbackEntry[]): Map<string, "good" | "off"> {
  const m = new Map<string, "good" | "off">();
  for (const f of feedback) m.set(`${f.cutId}-${f.angle}`, f.verdict);
  return m;
}

export default async function SimulatorHistory() {
  if (!storeEnabled()) notFound();
  const sessions = await listSessions();

  return (
    <main className="min-h-svh bg-page-bg text-page-text">
      <header className="mx-auto flex w-full max-w-[1400px] items-center justify-between px-48 py-24 max-md:px-16 max-md:py-16">
        <Link href="/" className="cursor-pointer text-p1 max-md:text-mp1 font-semibold whitespace-nowrap">
          {SITE.shortName}
        </Link>
        <Link
          href="/simulator"
          className="cursor-pointer text-p2 max-md:text-mp2 font-medium uppercase tracking-[0.08em] underline-link"
        >
          New session
        </Link>
      </header>

      <section className="mx-auto w-full max-w-[1400px] px-48 pb-96 max-md:px-16 max-md:pb-64">
        <h1 className="text-h2 max-md:text-mh2 font-semibold">Improvement log</h1>
        <p className="mt-16 max-w-[620px] text-p1 max-md:text-mp1 text-muted">
          Every stored session: the input photos, what the model generated, and the Looks right or
          Looks off verdicts. Data lives in data/simulator-sessions on this machine and nowhere
          else.
        </p>

        {sessions.length === 0 && (
          <p className="mt-40 text-p2 max-md:text-mp2 text-muted">No sessions yet. Complete a run in the simulator and it will appear here.</p>
        )}

        <div className="mt-40 flex flex-col gap-40">
          {sessions.map((s) => {
            const cut = styleById(s.topCut);
            const date = s.ts
              ? new Date(s.ts).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })
              : s.id;
            const marks = latestMarks(s.feedback);
            const goods = [...marks.values()].filter((v) => v === "good").length;
            const offs = [...marks.values()].filter((v) => v === "off").length;
            return (
              <article key={s.id} className="session rounded-card border-2 border-line-strong p-24 max-md:p-16" data-session={s.id}>
                <div className="flex flex-wrap items-baseline justify-between gap-8">
                  <h2 className="text-h4 font-semibold">
                    {date}, best match <span className="text-accent">{cut?.name || s.topCut}</span>
                  </h2>
                  <span className="text-p2 max-md:text-mp2 text-muted">
                    {Math.round(s.score * 100)}% · {s.sims.length} generated view{s.sims.length === 1 ? "" : "s"}
                    {marks.size > 0 ? ` · verdicts: ${goods} right, ${offs} off` : ""}
                  </span>
                </div>

                <h3 className="mt-20 text-p2 max-md:text-mp2 font-semibold">Input photos</h3>
                <div className="mt-8 flex flex-wrap gap-8">
                  {s.inputs.map((f) => (
                    <a key={f} href={`/api/simulator/history/file/${s.id}/${f}`} target="_blank" rel="noopener" className="cursor-pointer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/simulator/history/file/${s.id}/${f}`}
                        alt={f}
                        loading="lazy"
                        className="rounded-btn h-112 object-cover"
                        style={{ aspectRatio: "3/4" }}
                      />
                    </a>
                  ))}
                </div>

                {s.sims.length > 0 && (
                  <>
                    <h3 className="mt-20 text-p2 max-md:text-mp2 font-semibold">Generated views</h3>
                    <div className="mt-8 flex flex-wrap gap-8">
                      {s.sims.map((f) => {
                        const key = f.replace(/^sim-/, "").replace(/\.\w+$/, "");
                        const mark = marks.get(key);
                        return (
                          <a key={f} href={`/api/simulator/history/file/${s.id}/${f}`} target="_blank" rel="noopener" className="cursor-pointer">
                            <span className="block">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={`/api/simulator/history/file/${s.id}/${f}`}
                                alt={key}
                                title={key}
                                loading="lazy"
                                className="rounded-btn h-112 object-cover"
                                style={{ aspectRatio: "3/4" }}
                              />
                              <span
                                className={`mt-4 block text-center text-[0.6875rem] ${
                                  mark === "good" ? "text-page-text" : mark === "off" ? "text-accent" : "text-muted"
                                }`}
                              >
                                {mark === "good" ? "right" : mark === "off" ? "off" : key.split("-").slice(-1)[0]}
                              </span>
                            </span>
                          </a>
                        );
                      })}
                    </div>
                  </>
                )}

                {s.fichas.length > 0 && (
                  <>
                    <h3 className="mt-20 text-p2 max-md:text-mp2 font-semibold">Cards</h3>
                    <div className="mt-8 flex flex-wrap gap-8">
                      {s.fichas.map((f) => (
                        <a key={f} href={`/api/simulator/history/file/${s.id}/${f}`} target="_blank" rel="noopener" className="cursor-pointer">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={`/api/simulator/history/file/${s.id}/${f}`}
                            alt={f}
                            loading="lazy"
                            className="rounded-btn h-144 object-cover"
                            style={{ aspectRatio: "2/3" }}
                          />
                        </a>
                      ))}
                    </div>
                  </>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
