"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  Bot,
  Building2,
  CreditCard,
  Layers,
  Phone,
  Rocket,
  ShoppingBag,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { carouselFeatures, type CarouselFeature } from "@/content/carousel-features";
import { COMPANY } from "@/lib/site";
import { StartNowModal } from "./start-now-modal";

const iconMap: Record<CarouselFeature["icon"], LucideIcon> = {
  bot: Bot,
  card: CreditCard,
  layers: Layers,
  sales: TrendingUp,
  purchase: ShoppingBag,
  branch: Building2,
};

function useOrbitLayout() {
  const [width, setWidth] = useState(1200);

  useEffect(() => {
    const update = () => setWidth(window.innerWidth);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return useMemo(() => {
    if (width < 640) {
      return {
        radiusX: Math.min(width * 0.4, 160),
        radiusZ: 120,
        cardW: Math.min(width * 0.78, 280),
        stageH: 440,
        orbitW: Math.min(width * 0.96, 400),
        orbitH: 150,
        speed: 0.28,
      };
    }
    if (width < 1024) {
      return {
        radiusX: Math.min(width * 0.36, 360),
        radiusZ: 160,
        cardW: Math.min(width * 0.3, 300),
        stageH: 500,
        orbitW: Math.min(width * 0.88, 860),
        orbitH: 210,
        speed: 0.26,
      };
    }
    return {
      radiusX: Math.min(width * 0.36, 640),
      radiusZ: Math.min(width * 0.15, 260),
      cardW: Math.min(Math.max(width * 0.24, 320), 400),
      stageH: Math.min(Math.max(width * 0.4, 540), 640),
      orbitW: Math.min(width * 0.86, 1400),
      orbitH: Math.min(width * 0.2, 320),
      speed: 0.24,
    };
  }, [width]);
}

export function Feature3DCarousel() {
  const items = carouselFeatures;
  const total = items.length;
  const layout = useOrbitLayout();

  const [rotation, setRotation] = useState(0);
  const [paused, setPaused] = useState(false);
  const [startOpen, setStartOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startRotation: 0, moved: false });
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduceMotion || paused || dragging) return;

    let last = performance.now();
    const tick = (now: number) => {
      const delta = now - last;
      last = now;
      setRotation((prev) => (prev + layout.speed * (delta / 16)) % 360);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [paused, dragging, layout.speed]);

  const snapToNearest = useCallback(() => {
    const step = 360 / total;
    setRotation((prev) => {
      const nearest = Math.round(prev / step) * step;
      return ((nearest % 360) + 360) % 360;
    });
  }, [total]);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    dragRef.current = {
      startX: event.clientX,
      startRotation: rotation,
      moved: false,
    };
    setDragging(true);
    setPaused(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    const dx = event.clientX - dragRef.current.startX;
    if (Math.abs(dx) > 8) dragRef.current.moved = true;
    setRotation(
      (((dragRef.current.startRotation - dx * 0.28) % 360) + 360) % 360,
    );
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    setDragging(false);
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      /* already released */
    }
    snapToNearest();
    window.setTimeout(() => setPaused(false), 1600);
  };

  const activeIndex =
    (((Math.round((-rotation / (360 / total)) % total) + total) % total) +
      total) %
    total;

  return (
    <div className="orbit-shell">
      <div className="orbit-frame">
        <div className="orbit-header">
          <h1 className="orbit-title">
            AI-Powered Best Inventory Management System in Ethiopia
          </h1>
          <div className="orbit-header-actions">
            <button
              type="button"
              className="btn btn-primary btn-pulse"
              onClick={() => setStartOpen(true)}
            >
              <Rocket size={16} aria-hidden />
              Start Now
            </button>
            <a href={`tel:${COMPANY.phoneTel}`} className="btn btn-call">
              <Phone size={16} aria-hidden />
              Call Now
            </a>
          </div>
        </div>

        <div
          className="orbit-stage"
          style={{ height: layout.stageH, perspective: "1400px" }}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => {
            if (!dragging) setPaused(false);
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div
            className="orbit-ellipse"
            style={{
              width: layout.orbitW,
              height: layout.orbitH,
            }}
            aria-hidden
          />

          <div className="orbit-ring" style={{ transformStyle: "preserve-3d" }}>
            {items.map((item, index) => {
              const Icon = iconMap[item.icon];
              const baseAngle = (360 / total) * index;
              const currentAngle =
                ((baseAngle + rotation) * Math.PI) / 180;
              const x = Math.sin(currentAngle) * layout.radiusX;
              const z = Math.cos(currentAngle) * layout.radiusZ;
              const depth = (z + layout.radiusZ) / (2 * layout.radiusZ);
              const scale = 0.72 + depth * 0.34;
              const opacity = Math.max(0.35, 0.4 + depth * 0.6);
              const zIndex = Math.round(z + layout.radiusZ + 50);
              const isFront = depth > 0.72;

              return (
                <article
                  key={item.id}
                  className={`orbit-card ${isFront ? "is-front" : ""}`}
                  style={{
                    width: layout.cardW,
                    transform: `translate3d(${x}px, 0, ${z}px) scale(${scale})`,
                    opacity,
                    zIndex,
                  }}
                  onClick={() => {
                    if (dragRef.current.moved) return;
                    const target = ((-index * (360 / total)) % 360) + 360;
                    setRotation(target % 360);
                    setPaused(true);
                    window.setTimeout(() => setPaused(false), 1800);
                  }}
                >
                  <div className="orbit-card-badge">
                    <Icon className="h-6 w-6 text-emerald-400" aria-hidden />
                  </div>
                  <p className="orbit-card-title">{item.title}</p>
                  <p>{item.description}</p>
                  <div className="orbit-card-actions">
                    <button
                      type="button"
                      className="orbit-btn-start"
                      onClick={(event) => {
                        event.stopPropagation();
                        setStartOpen(true);
                      }}
                      onPointerDown={(event) => event.stopPropagation()}
                    >
                      Start Now
                    </button>
                    <a
                      href={`tel:${COMPANY.phoneTel}`}
                      className="orbit-btn-call"
                      onClick={(event) => event.stopPropagation()}
                      onPointerDown={(event) => event.stopPropagation()}
                    >
                      <Phone size={14} aria-hidden />
                      Call Now
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <div className="orbit-footer">
          <p className="orbit-footer-label">Feature Highlight</p>
          <p className="orbit-footer-title">{items[activeIndex]?.title}</p>
          <div className="orbit-dots" role="tablist" aria-label="Feature cards">
            {items.map((item, index) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={index === activeIndex}
                aria-label={item.title}
                className={`carousel-dot ${
                  index === activeIndex ? "is-active" : ""
                }`}
                onClick={() => {
                  const target = ((-index * (360 / total)) % 360) + 360;
                  setRotation(target % 360);
                  setPaused(true);
                  window.setTimeout(() => setPaused(false), 1800);
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <StartNowModal open={startOpen} onClose={() => setStartOpen(false)} />
    </div>
  );
}
