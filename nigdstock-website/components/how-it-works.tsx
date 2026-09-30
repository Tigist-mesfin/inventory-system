"use client";

import { useState } from "react";
import { Clapperboard, Route } from "lucide-react";
import { TutorialModal } from "./tutorial-modal";
import { Reveal } from "./reveal";
import { TUTORIAL_YOUTUBE_URL, WORKFLOW_EMBED_URL, WORKFLOW_YOUTUBE_URL, TUTORIAL_EMBED_URL } from "@/lib/site";

const steps = [
  {
    step: "01",
    title: "Organize product and stock information",
    description:
      "Bring product catalogs and stock records into one structured place so teams share the same source of truth.",
  },
  {
    step: "02",
    title: "Manage inventory workflows",
    description:
      "Use Nigd Stock for inventory tracking, warehouse stock, purchasing, sales updates, and transfers as they apply to your business.",
  },
  {
    step: "03",
    title: "Review inventory information",
    description:
      "Consult reports, movement history, and AI-assisted insights to support ordering, stocking, and operational decisions.",
  },
];

export function HowItWorks() {
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [workflowOpen, setWorkflowOpen] = useState(false);

  return (
    <section id="how-it-works" className="section scroll-mt-24">
      <div className="container-page">
        <Reveal>
          <p className="eyebrow">How it works</p>
          <h2 className="section-title">A clear path from records to decisions</h2>
          <p className="section-lead">
            Follow the workflow below, or watch guided videos that show how to use
            Nigd Stock day to day.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              className="btn btn-primary btn-pulse"
              onClick={() => setTutorialOpen(true)}
            >
              <Clapperboard size={18} aria-hidden />
              Watch tutorial video
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setWorkflowOpen(true)}
            >
              <Route size={18} aria-hidden />
              How to use workflow
            </button>
            <a
              href={TUTORIAL_YOUTUBE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
            >
              Open on YouTube
            </a>
          </div>
        </Reveal>

        <ol className="mt-10 grid gap-4 lg:grid-cols-3">
          {steps.map((item, index) => (
            <Reveal key={item.step} delayMs={index * 120} as="li">
              <div className="feature-card relative h-full rounded-2xl border border-line bg-white p-6 shadow-[var(--shadow-sm)]">
                <span className="font-heading text-3xl text-green-600">
                  {item.step}
                </span>
                <h3 className="mt-3 text-lg font-semibold text-navy-900">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm text-muted">{item.description}</p>
              </div>
            </Reveal>
          ))}
        </ol>
      </div>

      <TutorialModal
        open={tutorialOpen}
        onClose={() => setTutorialOpen(false)}
        title="Video tutorial — get started with Nigd Stock"
        youtubeUrl={TUTORIAL_YOUTUBE_URL}
        embedUrl={TUTORIAL_EMBED_URL}
      />
      <TutorialModal
        open={workflowOpen}
        onClose={() => setWorkflowOpen(false)}
        title="Workflow walkthrough — how to use Nigd Stock"
        youtubeUrl={WORKFLOW_YOUTUBE_URL}
        embedUrl={WORKFLOW_EMBED_URL}
      />
    </section>
  );
}
