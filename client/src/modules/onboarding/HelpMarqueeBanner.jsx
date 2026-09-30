import { useMemo, useState } from "react";
import {
  hideHelpMarquee,
  isHelpMarqueeHidden,
  requestOpenSetupGuide,
} from "../onboarding/onboardingStorage";
import { getTutorialYoutubeUrl } from "../auth/TutorialVideoButton";
import { isOwner } from "../../auth/access";
import { useAuth } from "../../auth/AuthContext";

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

const MARQUEE_TEXT =
  "Open tutorial to learn how to use the system — register shops, salesmen, items, then purchase and sell · ";

/**
 * Top scrolling tip with Open tutorial / Open video / Hide this text.
 */
export default function HelpMarqueeBanner() {
  const { user } = useAuth();
  const [hidden, setHidden] = useState(() => isHelpMarqueeHidden());
  const [videoOpen, setVideoOpen] = useState(false);
  const watchUrl = getTutorialYoutubeUrl();
  const embedUrl = useMemo(() => toEmbedUrl(watchUrl), [watchUrl]);
  const owner = isOwner(user);

  if (hidden) return null;

  const onHide = () => {
    hideHelpMarquee();
    setHidden(true);
  };

  return (
    <>
      <div className="help-marquee-bar">
        <div className="help-marquee-track" aria-hidden="true">
          <div className="help-marquee-text">
            <span>{MARQUEE_TEXT}</span>
            <span>{MARQUEE_TEXT}</span>
          </div>
        </div>
        <div className="help-marquee-actions">
          {owner ? (
            <button
              type="button"
              className="help-marquee-btn primary"
              onClick={() => requestOpenSetupGuide()}
            >
              Open tutorial
            </button>
          ) : null}
          <button
            type="button"
            className="help-marquee-btn"
            onClick={() => setVideoOpen(true)}
            disabled={!embedUrl}
          >
            Open video
          </button>
          <button type="button" className="help-marquee-btn ghost" onClick={onHide}>
            Hide this text
          </button>
        </div>
      </div>

      {videoOpen && embedUrl ? (
        <div
          className="tutorial-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="System tutorial video"
          onClick={() => setVideoOpen(false)}
        >
          <div className="tutorial-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tutorial-modal-head">
              <strong>How to use the system</strong>
              <button type="button" className="btn secondary" onClick={() => setVideoOpen(false)}>
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
