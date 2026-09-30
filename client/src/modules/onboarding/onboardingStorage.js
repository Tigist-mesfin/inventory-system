const storageKey = (userId) => `ims_setup_guide_${userId || "anon"}`;
const MARQUEE_HIDDEN_KEY = "ims_help_marquee_hidden";

export const OPEN_SETUP_GUIDE_EVENT = "ims-open-setup-guide";

export function requestOpenSetupGuide() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(OPEN_SETUP_GUIDE_EVENT));
  }
}

export function isHelpMarqueeHidden() {
  try {
    return localStorage.getItem(MARQUEE_HIDDEN_KEY) === "1";
  } catch {
    return false;
  }
}

export function hideHelpMarquee() {
  try {
    localStorage.setItem(MARQUEE_HIDDEN_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function readSetupGuideState(userId) {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return { completed: false, step: 0, forceShow: false };
    return { completed: false, step: 0, forceShow: false, ...JSON.parse(raw) };
  } catch {
    return { completed: false, step: 0, forceShow: false };
  }
}

export function writeSetupGuideState(userId, patch) {
  try {
    const next = { ...readSetupGuideState(userId), ...patch };
    localStorage.setItem(storageKey(userId), JSON.stringify(next));
    return next;
  } catch {
    return patch;
  }
}

/** Call after new company registration so the guide opens on first desk visit. */
export function markSetupGuideNeeded(userId) {
  writeSetupGuideState(userId, { completed: false, step: 0, forceShow: true });
}

export function markSetupGuideCompleted(userId) {
  writeSetupGuideState(userId, { completed: true, forceShow: false });
}
