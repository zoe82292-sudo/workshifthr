import { LegalLayout } from "./LegalLayout";

export function DataProcessingAgreement() {
  return (
    <LegalLayout title="Data Processing Agreement (Template)">
      <p>
        This Data Processing Agreement (&quot;DPA&quot;) template describes how ShiftWorksHR
        processes Customer Personal Data when you use shiftworkshr.com. It is intended for HR,
        IT, and legal reviewers. For general privacy terms, see our{" "}
        <a href="/privacy">Privacy Policy</a>.
      </p>

      <h2>1. Roles</h2>
      <ul>
        <li>
          <strong>Customer</strong> is the controller of compensation and workforce data you
          upload.
        </li>
        <li>
          <strong>ShiftWorksHR</strong> acts as a processor, analyzing files at your direction
          and returning results to your browser.
        </li>
      </ul>

      <h2>2. Subject matter & duration</h2>
      <p>
        Processing occurs only to provide compensation spreadsheet analysis during your active
        subscription or trial. Uploads are processed in memory per request unless you explicitly
        click Save to history.
      </p>

      <h2>3. Nature & purpose of processing</h2>
      <ul>
        <li>Parse uploaded spreadsheets and detect column mappings</li>
        <li>Run compensation QA checks (ranges, compa, compression, pay equity signals, etc.)</li>
        <li>Return analysis results and optional exports generated in your browser</li>
        <li>Optionally store JSON analysis snapshots when you choose Save to history</li>
      </ul>

      <h2>4. Categories of data</h2>
      <p>
        Depending on your upload, data may include employee identifiers, job data, base pay,
        ranges, merit/bonus fields, hire dates, locations, and demographic fields used for pay
        equity views.
      </p>

      <h2>5. Security measures</h2>
      <p>
        HTTPS in transit; in-memory processing by default; password-protected customer access;
        no training of ML models on Customer data. See the{" "}
        <a href="/security-summary">Security Summary (PDF-ready)</a> and full{" "}
        <a href="/security">Security page</a>.
      </p>

      <h2>6. Sub-processors</h2>
      <p>
        Hosting and infrastructure providers (e.g. Render), payment processing (Stripe), and
        transactional email (Resend, when enabled). Customer data files are not shared with
        these providers except as necessary for hosting transport and account provisioning.
      </p>

      <h2>7. Customer obligations</h2>
      <ul>
        <li>Upload only data you are authorized to process</li>
        <li>Restrict account credentials to authorized personnel</li>
        <li>Delete saved history or exported files per your retention policies</li>
      </ul>

      <h2>8. Data subject requests</h2>
      <p>
        Because ShiftWorksHR does not maintain a standing database of employee rows, Customer
        remains responsible for responding to workforce data requests. Delete saved history from
        the analyzer or contact <a href="mailto:hello@shiftworkshr.com">hello@shiftworkshr.com</a>{" "}
        for account-level assistance.
      </p>

      <h2>9. Executed DPA</h2>
      <p>
        For a countersigned DPA on annual plans, email{" "}
        <a href="mailto:hello@shiftworkshr.com">hello@shiftworkshr.com</a> with your organization
        name and billing contact.
      </p>
    </LegalLayout>
  );
}
