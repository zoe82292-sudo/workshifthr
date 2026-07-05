import { Link } from "react-router-dom";
import { LegalLayout } from "./LegalLayout";

const CONTACT_EMAIL = "hello@shiftworkshr.com";

export function ConsultantsPage() {
  return (
    <LegalLayout title="For comp consultants & fractional HR">
      <div className="resource-intro">
        <p>
          ShiftWorksHR is built for the spreadsheet QA pass every merit cycle still runs through —
          whether you&apos;re advising one client or ten. Share this page with HR leaders who need
          a fast first pass without a six-figure platform rollout.
        </p>
      </div>

      <section className="resource-section">
        <h2>Why consultants use it</h2>
        <ul className="resource-list">
          <li>
            <strong>$249 Cycle Pass</strong> per client season — not per employee row or seat
          </li>
          <li>
            Upload client HRIS exports as-is — Workday, UKG, ADP, or comp spreadsheets; columns
            auto-detect
          </li>
          <li>
            Review queue, pay equity signals, budget impact, and leadership PDF/Excel in one pass
          </li>
          <li>
            Re-upload after merit changes and compare cycles side-by-side (Annual plan)
          </li>
          <li>
            One org password — add teammates with work emails for client delivery
          </li>
        </ul>
      </section>

      <section className="resource-section">
        <h2>Typical client workflow</h2>
        <ol className="resource-steps">
          <li>Client exports comp data from HRIS (no API or IT project)</li>
          <li>You upload, confirm column mapping, and run analysis in under a minute</li>
          <li>Work the review queue — range, compression, manager inversions, merit alignment</li>
          <li>Export PDF summary for client leadership; Excel for your working file</li>
          <li>Re-run after merit adjustments to validate what&apos;s still open</li>
        </ol>
      </section>

      <section className="resource-section">
        <h2>What to tell your client</h2>
        <blockquote className="resource-quote">
          &ldquo;Before we finalize merit, I run your comp export through a focused QA tool that
          flags below-minimum pay, compression, manager inversions, and budget exposure — then we
          review the prioritized list together. No new HRIS integration required.&rdquo;
        </blockquote>
      </section>

      <section className="resource-section">
        <h2>Billing &amp; procurement</h2>
        <ul className="resource-list">
          <li>Purchase a Cycle Pass per client engagement or Annual for your practice</li>
          <li>
            Need an invoice instead of card checkout? Email{" "}
            <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Consultant invoice request")}`}>
              {CONTACT_EMAIL}
            </a>
          </li>
          <li>
            Security summary and DPA available for client procurement —{" "}
            <Link to="/security-summary">security summary</Link>, <Link to="/dpa">DPA</Link>
          </li>
        </ul>
      </section>

      <div className="checklist-cta panel">
        <h2>Try it on a client file</h2>
        <p>
          Free trial: one file, up to 250 rows, one analyze per day — or{" "}
          <Link to="/sample-preview">view the sample analysis</Link> first.
        </p>
        <div className="resource-cta-row">
          <Link className="button button-primary" to="/try">
            Start free trial
          </Link>
          <Link className="button button-secondary" to="/#pricing">
            See pricing
          </Link>
        </div>
      </div>
    </LegalLayout>
  );
}
