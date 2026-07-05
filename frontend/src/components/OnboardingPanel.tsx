import { useState } from "react";
import { Link } from "react-router-dom";

const STORAGE_KEY = "shiftworkshr:onboardingDismissed";

type OnboardingPanelProps = {
  hasResult: boolean;
};

export function OnboardingPanel({ hasResult }: OnboardingPanelProps) {
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(STORAGE_KEY) === "1");

  if (dismissed) {
    return null;
  }

  const stepUpload = hasResult;

  return (
    <section className="panel onboarding-panel">
      <div className="panel-header">
        <div>
          <h2>Get started</h2>
          <p className="onboarding-panel__copy">
            Three steps to your first comp review — most teams finish in under five minutes.
          </p>
        </div>
        <button
          className="button button-secondary button-small"
          type="button"
          onClick={() => {
            localStorage.setItem(STORAGE_KEY, "1");
            setDismissed(true);
          }}
        >
          Dismiss
        </button>
      </div>
      <ol className="onboarding-steps">
        <li className={stepUpload ? "onboarding-step onboarding-step--done" : "onboarding-step"}>
          <strong>Download the template</strong>
          <span>
            Use our column layout or your HRIS export with employee ID, salary, range min/max.{" "}
            <a href="/api/sample-template" download>
              Download template
            </a>
          </span>
        </li>
        <li className={stepUpload ? "onboarding-step onboarding-step--done" : "onboarding-step"}>
          <strong>Upload your spreadsheet</strong>
          <span>Drop an .xlsx or .csv below, map columns if needed, then run analysis.</span>
        </li>
        <li className={stepUpload ? "onboarding-step onboarding-step--done" : "onboarding-step"}>
          <strong>Export for leadership</strong>
          <span>
            Use the PDF summary or Excel report from results. See a{" "}
            <Link to="/sample-preview">sample analysis</Link> anytime.
          </span>
        </li>
      </ol>
    </section>
  );
}
