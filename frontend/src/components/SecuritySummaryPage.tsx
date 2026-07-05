import { LegalLayout } from "./LegalLayout";

export function SecuritySummaryPage() {
  return (
    <LegalLayout title="Security Summary">
      <p className="security-summary-intro">
        One-page overview for IT and procurement reviewers.{" "}
        <button
          type="button"
          className="button button-secondary button-small"
          onClick={() => window.print()}
        >
          Print / Save as PDF
        </button>
      </p>

      <div className="security-summary-sheet">
        <h2>ShiftWorksHR — Security at a glance</h2>

        <h3>Product</h3>
        <p>
          Web-based compensation spreadsheet analyzer for HR and total rewards teams. Customers
          upload Excel/CSV exports; the service returns QA flags, budget impact, and exportable
          reports.
        </p>

        <h3>Data flow</h3>
        <ol>
          <li>User uploads file over HTTPS</li>
          <li>Server processes file in memory for a single analysis request</li>
          <li>JSON results return to the browser; in-memory copy is discarded</li>
          <li>Optional: user saves a JSON snapshot (explicit opt-in) or exports PDF/Excel locally</li>
        </ol>

        <h3>What we do not store by default</h3>
        <ul>
          <li>Uploaded spreadsheet files after analysis completes</li>
          <li>Employee rows in a general-purpose data warehouse</li>
          <li>Automatic server-side analysis history</li>
        </ul>

        <h3>Controls</h3>
        <ul>
          <li>HTTPS encryption in transit</li>
          <li>Password-protected customer access (shared org credential model)</li>
          <li>Rate limiting on analyze and login endpoints</li>
          <li>No ML training on customer uploads</li>
          <li>Pay equity views suppress small groups (n &lt; 5)</li>
        </ul>

        <h3>Sub-processors</h3>
        <ul>
          <li>Cloud hosting (Render)</li>
          <li>Stripe (payments)</li>
          <li>Resend (transactional email, when configured)</li>
        </ul>

        <h3>Compliance status</h3>
        <ul>
          <li>SOC 2: not certified (early-stage product)</li>
          <li>DPA template available at <a href="/dpa">/dpa</a></li>
          <li>Full details: <a href="/security">Security &amp; Data Handling</a></li>
        </ul>

        <h3>Contact</h3>
        <p>
          Security questions:{" "}
          <a href="mailto:hello@shiftworkshr.com">hello@shiftworkshr.com</a>
        </p>
      </div>
    </LegalLayout>
  );
}
