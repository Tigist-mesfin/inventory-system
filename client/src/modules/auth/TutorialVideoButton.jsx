import { useMemo, useState } from "react";

const DEFAULT_TUTORIAL_URL = "https://www.youtube.com/watch?v=83gqImG-sS0";

function toEmbedUrl(raw) {
  const value = String(raw || "").trim();
  if (!value) return "";
  try {
    const url = new URL(value);
    if (url.hostname.includes("youtu.be")) {
      const id = url.pathname.replace(/^\//, "").split("/")[0];
      return id ? `https://www.youtube.com/embed/${id}?autoplay=1&rel=0` : "";
    }
    if (url.hostname.includes("youtube.com")) {
      const id = url.searchParams.get("v") || url.pathname.split("/embed/")[1]?.split("/")[0];
      return id ? `https://www.youtube.com/embed/${id}?autoplay=1&rel=0` : "";
    }
  } catch {
    /* fall through */
  }
  return "";
}

export function getTutorialYoutubeUrl() {
  return (
    String(import.meta.env.VITE_TUTORIAL_YOUTUBE_URL || "").trim() || DEFAULT_TUTORIAL_URL
  );
}

/** Animated CTA + modal with embedded YouTube tutorial. */
export default function TutorialVideoButton({ className = "" }) {
  const [open, setOpen] = useState(false);
  const watchUrl = getTutorialYoutubeUrl();
  const embedUrl = useMemo(() => toEmbedUrl(watchUrl), [watchUrl]);

  if (!embedUrl) return null;

  return (
    <>
      <button
        type="button"
        className={`tutorial-cta ${className}`.trim()}
        onClick={() => setOpen(true)}
      >
        <span className="tutorial-cta-icon" aria-hidden="true">
          ▶
        </span>
        <span className="tutorial-cta-copy">
          <strong>See tutorial</strong>
          <small>How to use the system</small>
        </span>
        <span className="tutorial-cta-shine" aria-hidden="true" />
      </button>

      {open ? (
        <div
          className="tutorial-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="System tutorial video"
          onClick={() => setOpen(false)}
        >
          <div className="tutorial-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tutorial-modal-head">
              <strong>How to use the system</strong>
              <button type="button" className="btn secondary" onClick={() => setOpen(false)}>
                Close
              </button>
            </div>
            <div className="tutorial-iframe-wrap">
              <iframe
                title="System tutorial"
                src={embedUrl}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
            <p className="muted" style={{ margin: "10px 0 0", fontSize: 13 }}>
              Watch on YouTube:{" "}
              <a href={watchUrl} target="_blank" rel="noreferrer">
                open in new tab
              </a>
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
