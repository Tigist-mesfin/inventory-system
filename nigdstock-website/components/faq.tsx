"use client";

import { ChevronDown } from "lucide-react";
import { faqs, type FaqItem } from "@/content/faqs";

export function Faq({ items = faqs }: { items?: FaqItem[] }) {
  return (
    <section id="faq" className="section scroll-mt-24">
      <div className="container-page">
        <p className="eyebrow">FAQ</p>
        <h2 className="section-title">
          Questions about inventory software and Nigd Stock
        </h2>
        <p className="section-lead">
          Straightforward answers based on verified product information. Where a
          capability is not confirmed, we say so.
        </p>

        <div className="mt-10 space-y-3">
          {items.map((item, index) => (
            <details
              key={item.id}
              className="faq-item group overflow-hidden rounded-2xl border border-line bg-white"
              open={index === 0}
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-left text-base font-semibold text-navy-900 marker:content-none [&::-webkit-details-marker]:hidden">
                <h3 className="m-0 text-base font-semibold">{item.question}</h3>
                <ChevronDown
                  className="shrink-0 text-muted transition group-open:rotate-180"
                  size={18}
                  aria-hidden
                />
              </summary>
              <div className="border-t border-line px-5 pb-5 pt-3 text-sm leading-relaxed text-muted">
                {item.answer}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
