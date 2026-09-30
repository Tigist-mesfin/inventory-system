"use client";

import { useEffect } from "react";
import { Globe, Smartphone, TabletSmartphone, X } from "lucide-react";
import {
  APP_STORE_URL,
  PLAY_STORE_URL,
  WEB_APP_URL,
} from "@/lib/site";

type StartNowModalProps = {
  open: boolean;
  onClose: () => void;
};

const options = [
  {
    id: "web",
    title: "Web app",
    subtitle: "Open Nigd Stock in your browser",
    href: WEB_APP_URL,
    icon: Globe,
    cta: "Start with web app",
  },
  {
    id: "android",
    title: "Android app",
    subtitle: "Download and start on Google Play",
    href: PLAY_STORE_URL,
    icon: TabletSmartphone,
    cta: "Download Android app",
  },
  {
    id: "iphone",
    title: "iPhone app",
    subtitle: "Download and start on the App Store",
    href: APP_STORE_URL,
    icon: Smartphone,
    cta: "Download iPhone app",
  },
] as const;

export function StartNowModal({ open, onClose }: StartNowModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="start-now-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow mb-2">Get started</p>
            <h2
              id="start-now-title"
              className="text-2xl font-semibold text-navy-900"
            >
              Choose how to start
            </h2>
            <p className="mt-2 text-sm text-muted">
              Open the web app or download Nigd Stock for Android or iPhone.
            </p>
          </div>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white text-navy-900"
            aria-label="Close"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-6 grid gap-3">
          {options.map((option) => {
            const Icon = option.icon;
            return (
              <a
                key={option.id}
                href={option.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-4 rounded-2xl border border-line bg-green-50/50 p-4 transition hover:-translate-y-0.5 hover:border-green-500 hover:bg-green-50 hover:shadow-[var(--shadow-md)]"
              >
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-green-600 text-white shadow-[0_8px_20px_rgb(15_122_74_/_0.25)]">
                  <Icon size={22} aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-navy-900">
                    {option.title}
                  </span>
                  <span className="block text-sm text-muted">
                    {option.subtitle}
                  </span>
                </span>
                <span className="text-sm font-semibold text-green-700 group-hover:underline">
                  {option.cta}
                </span>
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}
