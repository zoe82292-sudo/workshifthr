import { useEffect } from "react";
import { Link } from "react-router-dom";
import { LegalLayout } from "./LegalLayout";

const SECTIONS = [
  {
    title: "What to export from Workday (or similar HRIS)",
    items: [
      "Employee ID (required for multi-file merge)",
      "Job title or level, department, base salary",
      "Salary range minimum, midpoint, and maximum",
      "Optional: gender, race/ethnicity, hire date, location, manager ID",
      "For merit season: proposed merit %, performance rating, bonus target",
    ],
  },
  {
    title: "Before you upload",
    items: [
      "Confirm ranges and job levels reflect this cycle — stale bands create false flags",
      "Remove columns you don't need; fewer fields = faster review",
      "If salary and ranges live in separate reports, export both and merge on Employee ID",
      "Use employee ID in external shares — not employee names",
    ],
  },
  {
    title: "First-pass QA checklist",
    items: [
      "Below-minimum and above-maximum flags",
      "Range penetration and compa-ratio distribution",
      "Salary compression at the same job level",
      "Managers paid below direct reports",
      "Duplicate employee IDs or missing range data",
      "Merit vs compa misalignment and merit matrix outliers",
      "Cost to bring everyone to range minimum",
    ],
  },
  {
    title: "After merit changes",
    items: [
      "Re-export from Workday with updated salaries or merit columns",
      "Re-upload and compare against your saved history",
      "Confirm review queue items are resolved before leadership lock",
      "Export PDF summary for exec readout — not raw employee lists",
    ],
  },
];

export function CompExportQaPage() {
  useDocumentMeta(
    "Workday Comp Export QA Checklist | ShiftWorksHR",
    "Practical checklist for QA'ing Workday and HRIS compensation exports before merit review — range flags, compression, and leadership readouts.",
  );

  return (
    <LegalLayout title="Workday & HRIS comp export QA checklist">
      <div className="checklist-intro">
        <p>
          Every merit cycle starts with a spreadsheet export. This checklist covers what to pull
          from Workday, UKG, ADP, or your comp tool — and what to verify before leadership review.
          Run the automated first pass in ShiftWorksHR or use this list on its own.
        </p>
        <button className="button button-primary checklist-print-btn" type="button" onClick={() => window.print()}>
          Print / save as PDF
        </button>
      </div>

      {SECTIONS.map((section) => (
        <section className="checklist-section" key={section.title}>
          <h2>{section.title}</h2>
          <ul className="checklist-items">
            {section.items.map((item) => (
              <li key={item}>
                <span className="checklist-boxed" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </section>
      ))}

      <div className="checklist-cta panel">
        <h2>Run the first pass in under 30 seconds</h2>
        <p>Upload your export as-is — columns are detected automatically. No template required.</p>
        <div className="resource-cta-row">
          <Link className="button button-primary" to="/try">
            Try free with your file
          </Link>
          <Link className="button button-secondary" to="/checklist">
            Full merit season checklist
          </Link>
        </div>
      </div>
    </LegalLayout>
  );
}

function useDocumentMeta(title: string, description: string) {
  useEffect(() => {
    document.title = title;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute("content", description);
    }
  }, [title, description]);
}
