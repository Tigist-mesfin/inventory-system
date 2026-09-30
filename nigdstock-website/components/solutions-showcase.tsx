"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  ShoppingBag,
  Sparkles,
  Truck,
  Wallet,
  Warehouse,
  type LucideIcon,
} from "lucide-react";
import { solutions, type SolutionItem } from "@/content/solutions";
import { Reveal } from "./reveal";

const iconMap: Record<SolutionItem["icon"], LucideIcon> = {
  sparkles: Sparkles,
  warehouse: Warehouse,
  "shopping-bag": ShoppingBag,
  truck: Truck,
  wallet: Wallet,
  "graduation-cap": GraduationCap,
};

const AUTO_MS = 4500;
const GAP_PX = 16;

export function SolutionsShowcase() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [perView, setPerView] = useState(1);
  const [cardWidthPx, setCardWidthPx] = useState(0);
  const viewportRef = useRef<HTMLDivElement>(null);
  const resumeTimer = useRef<number | null>(null);
  const dragRef = useRef({
    active: false,
    startX: 0,
    deltaX: 0,
  });

  const maxIndex = Math.max(0, solutions.length - perView);
  const safeIndex = Math.min(index, maxIndex);
  const offsetPx = safeIndex * (cardWidthPx + GAP_PX);

  const pauseTemporarily = useCallback(() => {
    setPaused(true);
    if (resumeTimer.current) window.clearTimeout(resumeTimer.current);
    resumeTimer.current = window.setTimeout(() => setPaused(false), 2000);
  }, []);

  const goTo = useCallback(
    (next: number) => {
      setIndex(Math.min(Math.max(next, 0), maxIndex));
    },
    [maxIndex],
  );

  const measure = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const width = window.innerWidth;
    let nextPerView = 1;
    let peek = 0;
    if (width >= 1100) {
      nextPerView = 3;
    } else if (width >= 768) {
      nextPerView = 2;
    } else {
      nextPerView = 1;
      peek = Math.min(56, viewport.clientWidth * 0.12);
    }

    setPerView(nextPerView);
    const usable = viewport.clientWidth - peek;
    const widthPx =
      (usable - GAP_PX * (nextPerView - 1)) / nextPerView;
    setCardWidthPx(Math.max(widthPx, 240));
  }, []);

  useEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  useEffect(() => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduceMotion || paused) return;

    const timer = window.setInterval(() => {
      setIndex((current) => {
        const capped = Math.min(current, maxIndex);
        return capped >= maxIndex ? 0 : capped + 1;
      });
    }, AUTO_MS);

    return () => window.clearInterval(timer);
  }, [maxIndex, paused]);

  useEffect(() => {
    return () => {
      if (resumeTimer.current) window.clearTimeout(resumeTimer.current);
    };
  }, []);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    dragRef.current = {
      active: true,
      startX: event.clientX,
      deltaX: 0,
    };
    setPaused(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;
    dragRef.current.deltaX = event.clientX - dragRef.current.startX;
  };

  const finishPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;
    const { deltaX } = dragRef.current;
    dragRef.current.active = false;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      /* already released */
    }

    if (Math.abs(deltaX) > 48) {
      goTo(deltaX < 0 ? safeIndex + 1 : safeIndex - 1);
    }
    pauseTemporarily();
  };

  return (
    <section
      id="solutions"
      className="section solutions-section scroll-mt-24"
      aria-label="Solutions showcase"
    >
      <div className="container-page">
        <Reveal>
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <p className="eyebrow">Solutions</p>
              <h2 className="section-title">
                Business solutions that move with your workflow
              </h2>
              <p className="section-lead">
                Explore practical Nigd Stock pathways — from AI inventory insights
                to multi-shop control, sales, purchasing, and getting started.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="carousel-nav-btn"
                aria-label="Previous solution"
                onClick={() => {
                  goTo(safeIndex - 1);
                  pauseTemporarily();
                }}
              >
                <ChevronLeft size={20} />
              </button>
              <button
                type="button"
                className="carousel-nav-btn"
                aria-label="Next solution"
                onClick={() => {
                  goTo(safeIndex + 1);
                  pauseTemporarily();
                }}
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </Reveal>

        <div
          ref={viewportRef}
          className="solutions-viewport"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocusCapture={() => setPaused(true)}
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node)) {
              setPaused(false);
            }
          }}
        >
          <div
            className="solutions-track"
            style={{
              gap: `${GAP_PX}px`,
              transform: `translate3d(-${offsetPx}px, 0, 0)`,
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={finishPointer}
            onPointerCancel={finishPointer}
          >
            {solutions.map((item, cardIndex) => {
              const Icon = iconMap[item.icon];
              const isActive =
                cardIndex >= safeIndex && cardIndex < safeIndex + perView;
              return (
                <article
                  key={item.id}
                  className={`solution-card ${isActive ? "is-active" : ""}`}
                  style={{
                    width: cardWidthPx ? `${cardWidthPx}px` : undefined,
                    minWidth: cardWidthPx ? `${cardWidthPx}px` : "16rem",
                    animationDelay: `${(cardIndex % 3) * 0.2}s`,
                  }}
                  aria-roledescription="slide"
                  aria-label={`${cardIndex + 1} of ${solutions.length}: ${item.title}`}
                >
                  <div className="solution-card-shine" aria-hidden />
                  <div className="solution-card-top">
                    <span className="solution-icon">
                      <Icon size={22} aria-hidden />
                    </span>
                    <span className="solution-badge">Solution</span>
                  </div>
                  <h3 className="solution-title">{item.title}</h3>
                  <p className="solution-copy">{item.description}</p>
                  <ul className="solution-list">
                    {item.contents.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                  <Link href={item.href} className="btn btn-primary solution-cta">
                    {item.ctaLabel}
                  </Link>
                </article>
              );
            })}
          </div>
        </div>

        <div
          className="mt-6 flex justify-center gap-2"
          role="tablist"
          aria-label="Solution slides"
        >
          {Array.from({ length: maxIndex + 1 }).map((_, dotIndex) => (
            <button
              key={dotIndex}
              type="button"
              role="tab"
              aria-selected={dotIndex === safeIndex}
              aria-label={`Show solutions group ${dotIndex + 1}`}
              className={`carousel-dot ${dotIndex === safeIndex ? "is-active" : ""}`}
              onClick={() => {
                goTo(dotIndex);
                pauseTemporarily();
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
