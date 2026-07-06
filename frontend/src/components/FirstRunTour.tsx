import { useEffect, useState } from "react";
import { useIsMobile } from "../useMediaQuery";

const STORAGE_KEY = "shiftworkshr:firstRunTourComplete";

const STEPS = [
  {
    title: "Review queue first",
    body: "Your prioritized list of range, compression, and merit issues — start here every cycle.",
    mobileBody: "Open the review queue for your prioritized issue list.",
  },
  {
    title: "Drill into tabs",
    body: "Use the stat cards and tabs below for pay equity, tenure, location pay, and merit matrix detail.",
    mobileBody: "Use the tabs below for pay equity, tenure, location, and merit detail.",
  },
  {
    title: "Export for leadership",
    body: "Download the PDF summary or full Excel report when you're ready for HRBP or exec review.",
    mobileBody: "Export PDF or Excel when you're ready for leadership review.",
  },
] as const;

type FirstRunTourProps = {
  /** When the start-here banner is showing, skip the floating tour on mobile. */
  reviewQueueCount?: number;
};

export function FirstRunTour({ reviewQueueCount = 0 }: FirstRunTourProps) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY) !== "1") {
      setVisible(true);
    }
  }, []);

  if (!visible) {
    return null;
  }

  if (isMobile && reviewQueueCount > 0) {
    return null;
  }

  function finish() {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  }

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const body = isMobile ? current.mobileBody : current.body;

  return (
    <aside
      className={`first-run-tour panel ${isMobile ? "first-run-tour--inline" : "first-run-tour--floating"}`}
      aria-label="Quick tour"
    >
      <div className="first-run-tour__header">
        <div className="first-run-tour__progress" aria-hidden="true">
          {STEPS.map((_, index) => (
            <span
              key={index}
              className={`first-run-tour__dot ${index === step ? "first-run-tour__dot--active" : ""} ${
                index < step ? "first-run-tour__dot--done" : ""
              }`}
            />
          ))}
        </div>
        <button className="first-run-tour__skip" type="button" onClick={finish}>
          Skip
        </button>
      </div>
      <h3 className="first-run-tour__title">{current.title}</h3>
      <p className="first-run-tour__body">{body}</p>
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
