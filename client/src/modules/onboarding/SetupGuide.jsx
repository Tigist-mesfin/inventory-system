import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { isOwner } from "../../auth/access";
import {
  markSetupGuideCompleted,
  OPEN_SETUP_GUIDE_EVENT,
  readSetupGuideState,
  writeSetupGuideState,
} from "./onboardingStorage";

/** Five setup steps — starts with shops + salesmen (no welcome screen). */
const STEPS = [
  {
    id: "shops-team",
    eyebrow: "Step 1 of 5",
    title: "Register shops & salesmen",
    body: "If you have more than one shop or warehouse, register each store. If you have salesmen, register them and give access. Skip what you do not need — one main store is already created.",
    icon: "🏪",
    tip: "You can add more shops or staff later anytime.",
    actionLabel: "Register shop",
    actionTo: "/warehouses",
    secondaryActionLabel: "Register salesman",
    secondaryActionTo: "/team",
  },
  {
    id: "payments",
    eyebrow: "Step 2 of 5",
    title: "Extra payment accounts?",
    body: "Default methods like CBE, Telebirr, Cash, and banks are already ready. Add only other accounts you use that are not in that list.",
    icon: "💳",
    actionLabel: "Register payment methods",
    actionTo: "/payment-methods",
    tip: "Skip if the defaults are enough.",
  },
  {
    id: "parties",
    eyebrow: "Step 3 of 5",
    title: "Customers & suppliers",
    body: "Register regular customers and suppliers if you have them. Skip if most sales are walk-in for now — you can add them later.",
    icon: "🤝",
    actionLabel: "Register customers & suppliers",
    actionTo: "/customers",
    tip: "Helps with unpaid balances and wallets.",
  },
  {
    id: "products",
    eyebrow: "Step 4 of 5",
    title: "Register items you sell",
    body: "Add your products with name, unit, and selling price. You need items before you can purchase stock or make sales.",
    icon: "📦",
    actionLabel: "Register items",
    actionTo: "/catalog",
    tip: "You can edit prices later.",
  },
  {
    id: "done",
    eyebrow: "Step 5 of 5",
    title: "Setup complete",
    body: "Your Nigd Stock desk is ready. You can now purchase stock and make sales.",
    icon: "✅",
    tip: "For any support call 0951 050 364",
    actionLabel: "Go to Purchasing",
    actionTo: "/buy",
    secondaryActionLabel: "Go to Sales",
    secondaryActionTo: "/sell",
    isFinal: true,
  },
];

export default function SetupGuide() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [paused, setPaused] = useState(false);
  const [step, setStep] = useState(0);
  const [incomplete, setIncomplete] = useState(false);

  const owner = isOwner(user);
  const userId = user?.id;

  useEffect(() => {
    if (!userId || !owner) {
      setOpen(false);
      setPaused(false);
      setIncomplete(false);
      return;
    }
    const state = readSetupGuideState(userId);
    if (state.completed && !state.forceShow) {
      setOpen(false);
      setPaused(false);
      setIncomplete(false);
      return;
    }
    // Clamp older 7-step progress into the new 5-step guide
    const start = Math.min(Math.max(Number(state.step) || 0, 0), STEPS.length - 1);
    setStep(start);
    setOpen(true);
    setPaused(false);
    setIncomplete(true);
    writeSetupGuideState(userId, {
      forceShow: false,
      completed: false,
      step: start,
    });
  }, [userId, owner]);

  useEffect(() => {
    if (!owner || !userId) return undefined;
    const onRequestOpen = () => {
      const state = readSetupGuideState(userId);
      const start = Math.min(Math.max(Number(state.step) || 0, 0), STEPS.length - 1);
      setStep(state.completed ? 0 : start);
      setPaused(false);
      setIncomplete(!state.completed);
      setOpen(true);
    };
    window.addEventListener(OPEN_SETUP_GUIDE_EVENT, onRequestOpen);
    return () => window.removeEventListener(OPEN_SETUP_GUIDE_EVENT, onRequestOpen);
  }, [owner, userId]);

  const current = STEPS[step] || STEPS[0];
  const progress = useMemo(() => ((step + 1) / STEPS.length) * 100, [step]);

  if (!owner) return null;

  const persistStep = (nextStep) => {
    writeSetupGuideState(userId, { step: nextStep, completed: false });
    setStep(nextStep);
    setIncomplete(true);
  };

  const finish = () => {
    markSetupGuideCompleted(userId);
    setOpen(false);
    setPaused(false);
    setIncomplete(false);
  };

  const skipAll = () => finish();

  const skipStep = () => {
    if (step >= STEPS.length - 1) {
      finish();
      return;
    }
    persistStep(step + 1);
  };

  const goNext = () => {
    if (current.isFinal) {
      finish();
      return;
    }
    persistStep(step + 1);
  };

  const runAction = (path) => {
    if (current.isFinal) {
      markSetupGuideCompleted(userId);
      setOpen(false);
      setPaused(false);
      setIncomplete(false);
      navigate(path);
      return;
    }
    // Stay on this combined step until they press Continue / Skip
    writeSetupGuideState(userId, { step, completed: false });
    setOpen(false);
    setPaused(true);
    setIncomplete(true);
    navigate(path);
  };

  const resume = () => {
    const state = readSetupGuideState(userId);
    if (state.completed) return;
    setStep(Math.min(Math.max(Number(state.step) || 0, 0), STEPS.length - 1));
    setPaused(false);
    setOpen(true);
  };

  return (
    <>
      {paused && incomplete ? (
        <button type="button" className="setup-guide-fab" onClick={resume}>
          Continue setup
        </button>
      ) : null}

      {open ? (
        <div className="setup-guide-backdrop" role="dialog" aria-modal="true" aria-label="Setup guide">
          <div className="setup-guide-card">
            <div className="setup-guide-progress" aria-hidden="true">
              <span style={{ width: `${progress}%` }} />
            </div>

            <div className="setup-guide-top">
              <span className="setup-guide-eyebrow">{current.eyebrow}</span>
              <button type="button" className="setup-guide-skip-all" onClick={skipAll}>
                Skip tutorial
              </button>
            </div>

            <div className="setup-guide-icon" aria-hidden="true">
              {current.icon}
            </div>
            <h2 className="setup-guide-title">{current.title}</h2>
            <p className="setup-guide-body">{current.body}</p>
            {current.tip ? <p className="setup-guide-tip">{current.tip}</p> : null}

            <div className="setup-guide-dots" aria-hidden="true">
              {STEPS.map((item, index) => (
                <span
                  key={item.id}
                  className={`setup-guide-dot${index === step ? " active" : ""}${index < step ? " done" : ""}`}
                />
              ))}
            </div>

            <div className="setup-guide-actions">
              {current.actionLabel && current.actionTo ? (
                <button
                  type="button"
                  className="btn setup-guide-primary"
                  onClick={() => runAction(current.actionTo)}
                >
                  {current.actionLabel}
                </button>
              ) : null}
              {current.secondaryActionLabel && current.secondaryActionTo ? (
                <button
                  type="button"
                  className="btn secondary setup-guide-secondary"
                  onClick={() => runAction(current.secondaryActionTo)}
                >
                  {current.secondaryActionLabel}
                </button>
              ) : null}
              {!current.isFinal ? (
                <>
                  <button type="button" className="btn secondary setup-guide-secondary" onClick={goNext}>
                    Continue
                  </button>
                  <button type="button" className="setup-guide-skip" onClick={skipStep}>
                    Skip this step
                  </button>
                </>
              ) : (
                <button type="button" className="btn secondary setup-guide-secondary" onClick={finish}>
                  Finish &amp; start using
                </button>
              )}
            </div>

            <p className="setup-guide-support">
              For any support call{" "}
              <a href="tel:0951050364">0951 050 364</a>
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
