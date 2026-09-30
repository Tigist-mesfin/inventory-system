"use client";

import { Feature3DCarousel } from "./feature-3d-carousel";

export function Hero() {
  return (
    <section className="hero-fullscreen relative w-full min-h-screen overflow-x-hidden">
      <div className="hero-orbits" aria-hidden />
      <div className="relative z-[1] flex min-h-screen w-full items-center">
        <div className="w-full">
          <Feature3DCarousel />
        </div>
      </div>
    </section>
  );
}
