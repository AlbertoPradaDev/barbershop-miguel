"use client";

/*
 * Five optional preference questions as flat selectable chips (panel fill,
 * selected flips to ink on bone). Chips are form controls, not CTAs, so they
 * carry no outline per the surface rules. Functional updates only: rapid taps
 * on several questions must not clobber each other through a stale closure.
 */

import type { Preferences } from "@/lib/simulator/types";
import { PillButton } from "@/components/ui/pill-button";

const QUESTIONS: {
  id: keyof Preferences;
  label: string;
  options: { value: string; label: string }[];
}[] = [
  {
    id: "style",
    label: "What style are you after?",
    options: [
      { value: "modern", label: "Modern" },
      { value: "classic", label: "Classic" },
      { value: "elegant", label: "Elegant" },
      { value: "casual", label: "Casual" },
      { value: "youthful", label: "Youthful" },
      { value: "professional", label: "Professional" },
      { value: "bold", label: "Bold" },
    ],
  },
  {
    id: "maintenance",
    label: "How much upkeep do you want?",
    options: [
      { value: "minimal", label: "As little as possible" },
      { value: "low", label: "Low" },
      { value: "medium", label: "Medium" },
      { value: "any", label: "No preference" },
    ],
  },
  {
    id: "length",
    label: "What length do you prefer?",
    options: [
      { value: "muy-corto", label: "Very short" },
      { value: "corto", label: "Short" },
      { value: "medio", label: "Medium" },
      { value: "largo", label: "Long" },
      { value: "any", label: "No preference" },
    ],
  },
  {
    id: "fade",
    label: "Do you want a fade?",
    options: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" },
      { value: "any", label: "No preference" },
    ],
  },
  {
    id: "goal",
    label: "What are you going for?",
    options: [
      { value: "modern", label: "A more modern look" },
      { value: "sharper", label: "A sharper look" },
      { value: "change", label: "A complete change" },
      { value: "similar", label: "Keep it similar" },
      { value: "no-idea", label: "No idea yet" },
    ],
  },
];

export function SimQuestions({
  prefs,
  onChange,
  onSubmit,
  onBack,
  error,
}: {
  prefs: Preferences;
  onChange: (up: (p: Preferences) => Preferences) => void;
  onSubmit: () => void;
  onBack: () => void;
  error: string | null;
}) {
  return (
    <section>
      <h2 className="text-h2 max-md:text-mh2 font-semibold">Five quick questions</h2>
      <p className="mt-16 max-w-[560px] text-p1 max-md:text-mp1 text-muted">
        A photo cannot guess these. All of them are optional, and the more you tell us the finer
        the recommendation.
      </p>

      <div className="mt-32 flex flex-col gap-32 max-md:gap-24">
        {QUESTIONS.map((q) => (
          <fieldset key={q.id} className="q">
            <legend className="mb-12 text-h4 font-semibold">{q.label}</legend>
            <div className="flex flex-wrap gap-8">
              {q.options.map((o) => {
                const active = prefs[q.id] === o.value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onChange((p) => ({ ...p, [q.id]: active ? "" : o.value }))}
                    className={`chip cursor-pointer rounded-full px-16 py-8 text-p2 max-md:text-mp2 transition-colors duration-200 ${
                      active ? "bg-ink text-bone" : "bg-panel text-page-text hover:bg-ink hover:text-bone"
                    }`}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>

      {error && (
        <p className="mt-24 rounded-card border-2 border-line-strong p-16 text-p2 max-md:text-mp2 text-accent" role="alert">
          {error} Please try again.
        </p>
      )}

      <div className="mt-40 flex flex-wrap items-center justify-between gap-16">
        <PillButton variant="outline" onClick={onBack}>
          My photos
        </PillButton>
        <PillButton variant="solid" onClick={onSubmit}>
          See my recommendation
        </PillButton>
      </div>
    </section>
  );
}
