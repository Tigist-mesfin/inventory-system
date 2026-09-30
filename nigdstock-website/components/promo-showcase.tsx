"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  Layers,
  ShoppingBag,
  Sparkles,
  Truck,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { PROMO_HIGHLIGHTS } from "@/lib/site";
import { Reveal } from "./reveal";

const iconMap: Record<string, LucideIcon> = {
  ai: Sparkles,
  payments: Wallet,
  shops: Building2,
  sales: ShoppingBag,
  purchase: Truck,
  "all-in-one": Layers,
};

export function PromoShowcase() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduceMotion) return;
    const timer = window.setInterval(() => {
      setActive((prev) => (prev + 1) % PROMO_HIGHLIGHTS.length);
    }, 3200);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="section relative overflow-hidden py-12">
      <div className="promo-bg" aria-hidden />
      <div className="container-page relative">
        <Reveal>
          <h2 className="text-center text-2xl font-bold tracking-tight text-white sm:text-3xl md:text-4xl">
            Everything your business needs
          </h2>
        </Reveal>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {PROMO_HIGHLIGHTS.map((item, index) => {
            const Icon = iconMap[item.id] ?? Layers;
            const isActive = active === index;
            return (
              <Reveal key={item.id} delayMs={index * 90} as="article">
                <button
                  type="button"
                  onClick={() => setActive(index)}
                  className={`promo-card w-full text-left ${
                    isActive ? "promo-card-active" : ""
                  }`}
                >
                  <div
                    className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${item.accent} text-white shadow-lg`}
                  >
                    <Icon size={22} aria-hidden />
                  </div>
                  <h3 className="text-lg font-semibold text-white">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/70">
                    {item.description}
                  </p>
                  <span className="promo-card-glow" aria-hidden />
                </button>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
