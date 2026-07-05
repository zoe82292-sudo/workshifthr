import { useEffect, useState } from "react";

const STORAGE_KEY = "shiftworkshr:firstRunTourComplete";

const STEPS = [
  {
    title: "Review queue first",
    body: "Your prioritized list of range, compression, and merit issues — start here every cycle.",
  },
  {
    title: "Drill into tabs",
    body: "Use the stat cards and tabs below for pay equity, tenure, location pay, and merit matrix detail.",
  },
  {
    title: "Export for leadership",
    body: "Download the PDF summary or full Excel report when you're ready for HRBP or exec review.",
  },
] as const;

export function FirstRunTour() {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY) !== "1") {
      setVisible(true);
    }
  }, []);

  if (!visible) {
    return null;
  }

  function finish() {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  }

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <aside className="first-run-tour" aria-label="Quick tour">
      <div className="first-run-tour__header">
        <span className="first-run-tour__eyebrow">
          Step {step + 1} of {STEPS.length}
        </span>
        <button className="first-run-tour__skip" type="button" onClick={finish}>
          Skip tour
        </button>
      </div>
      <h3 className="first-run-tour__title">{current.title}</h3>
      <p className="first-run-tour__body">{current.body}</p>
      <div className="first-run-tour__actions">
        {step > 0 ? (
          <button
            className="button button-secondary button-small"
            type="button"
            onClick={() => setStep((value) => value - 1)}
          >
            Back
          </button>
        ) : null}
        <button
          className="button button-primary button-small"
          type="button"
          onClick={() => (isLast ? finish() : setStep((value) => value + 1))}
        >
          {isLast ? "Got it" : "Next"}
        </button>
      </div>
    </aside>
  );
}
