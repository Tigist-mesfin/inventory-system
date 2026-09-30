"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { TUTORIAL_EMBED_URL, TUTORIAL_YOUTUBE_URL } from "@/lib/site";

type TutorialModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  youtubeUrl?: string;
  embedUrl?: string;
};

export function TutorialModal({
  open,
  onClose,
  title = "Nigd Stock tutorial",
  youtubeUrl = TUTORIAL_YOUTUBE_URL,
  embedUrl = TUTORIAL_EMBED_URL,
}: TutorialModalProps) {
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
        className="modal-panel max-w-3xl"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-navy-900">{title}</h2>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white"
            aria-label="Close tutorial"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>
        <div className="aspect-video overflow-hidden rounded-2xl border border-line bg-navy-950">
          <iframe
            src={embedUrl}
            title={title}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
        <p className="mt-3 text-sm text-muted">
          Prefer YouTube directly?{" "}
          <a
            href={youtubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-green-700 hover:underline"
          >
            Open the tutorial video
          </a>
          .
        </p>
      </div>
    </div>
  );
}
