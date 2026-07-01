import { LegalLayout } from "./LegalLayout";

const SECTIONS = [
  {
    title: "Before you export data",
    items: [
      "Confirm salary ranges and job levels are current for this cycle.",
      "Decide whether merit, bonus, or equity columns are in scope.",
      "Use employee ID (not name) if you need to share files externally.",
      "Include: employee ID, job title or level, base salary, range min/mid/max.",
      "Optional but useful: gender, race/ethnicity, hire date, manager ID, department.",
      "Remove columns you do not need — fewer fields means faster review.",
    ],
  },
  {
    title: "First-pass QA (automated)",
    items: [
      "Run below-minimum and above-maximum flags.",
      "Review range penetration and compa-ratio distribution.",
      "Check for salary compression (same level, wide pay spread).",
      "Flag managers paid below direct reports.",
      "Scan for duplicate employee IDs or missing range data.",
      "Estimate cost to bring everyone to range minimum.",
    ],
  },
  {
    title: "Pay equity review",
    items: [
      "Compare median pay by gender at the same job level.",
      "Compare median pay by race/ethnicity at the same job-by-level.",
      "Investigate outliers — do not auto-adjust without context.",
      "Document business factors (tenure, performance, location) for leadership.",
      "Remember: this is decision support, not a legal pay equity audit.",
    ],
  },
  {
    title: "Merit planning",
    items: [
      "Set merit budget and pool assumptions before changing individual rows.",
      "Prioritize below-minimum employees who are performing.",
      "Watch for new compression after proposed increases.",
      "Re-run analysis after merit changes to validate impact.",
      "Export summary for HRBP and finance review.",
    ],
  },
  {
    title: "Leadership readout",
    items: [
      "Prepare executive summary: headcount, risk level, top themes.",
      "Share cost-to-minimum and merit pool scenarios, not raw employee lists.",
      "Highlight structural issues (ranges, levels) vs. one-off exceptions.",
      "Agree on escalation path for edge cases before final lock.",
      "Archive final file and exports per your retention policy.",
    ],
  },
  {
    title: "After the cycle",
    items: [
      "Update ranges or job architecture if the same flags repeat.",
      "Schedule a mid-year spot check if you made large merit moves.",
      "Collect feedback from HRBPs on what slowed the process.",
      "Note which columns were missing — fix for next export.",
    ],
  },
];

export function MeritChecklistPage() {
  function handlePrint() {
    window.print();
  }

  return (
    <LegalLayout title="Merit Season Comp Checklist">
      <div className="checklist-intro">
        <p>
          A practical prep list for HR and comp teams heading into merit or annual review.
          Use it before you upload to ShiftWorksHR — or on its own. Print or save as PDF
          from your browser.
        </p>
        <button className="button button-primary checklist-print-btn" type="button" onClick={handlePrint}>
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
        <p>
          Upload your spreadsheet at{" "}
          <a href="https://shiftworkshr.com">shiftworkshr.com</a> for automated flags,
          budget impact, and exports. Cycle Pass starts at $249.
        </p>
      </div>
    </LegalLayout>
  );
}
