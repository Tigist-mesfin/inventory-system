"use client";

import { useState } from "react";
import Link from "next/link";
import { Phone, Rocket } from "lucide-react";
import { FeatureGrid } from "@/components/feature-grid";
import { StartNowModal } from "@/components/start-now-modal";
import { Reveal } from "@/components/reveal";
import { COMPANY } from "@/lib/site";

export default function FeaturesPageClient() {
  const [startOpen, setStartOpen] = useState(false);

  return (
    <>
      <section className="section">
        <div className="container-page">
          <Reveal>
            <p className="eyebrow">Features</p>
            <h1 className="section-title text-[clamp(2rem,4vw,2.8rem)]">
              Nigd Stock inventory management features
            </h1>
            <p className="section-lead mt-3">
              Explore each capability as an animated card. These features are
              present in the Nigd Stock product today.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                className="btn btn-primary btn-pulse"
                onClick={() => setStartOpen(true)}
              >
                <Rocket size={18} aria-hidden />
                Start Now
              </button>
              <a href={`tel:${COMPANY.phoneTel}`} className="btn btn-call">
                <Phone size={18} aria-hidden />
                Call Now
              </a>
            </div>
          </Reveal>

          <div className="mt-10">
            <FeatureGrid />
          </div>

          <Reveal delayMs={120}>
            <div className="mt-12 rounded-3xl border border-green-100 bg-gradient-to-br from-green-50 to-white p-6 sm:p-8">
              <h2 className="text-xl font-semibold text-navy-900">
                Ready to use these features?
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-muted">
                Start on the web app, download Android or iPhone, or contact our
                team for a walkthrough.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  className="btn btn-primary btn-pulse"
                  onClick={() => setStartOpen(true)}
                >
                  Start Now
                </button>
                <Link href="/contact/#demo" className="btn btn-secondary">
                  Request a Demo
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
      <StartNowModal open={startOpen} onClose={() => setStartOpen(false)} />
    </>
  );
}
