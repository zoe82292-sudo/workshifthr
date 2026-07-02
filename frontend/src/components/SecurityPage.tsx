import { LegalLayout } from "./LegalLayout";

export function SecurityPage() {
  return (
    <LegalLayout title="Security & Data Handling">
      <p>
        This page explains how ShiftWorksHR handles compensation data in practice. It is
        meant for HR, IT, and procurement reviewers evaluating shiftworkshr.com. For
        legal terms, see our <a href="/terms">Terms of Service</a> and{" "}
        <a href="/privacy">Privacy Policy</a>.
      </p>

      <h2>1. At a glance</h2>
      <ul>
        <li>
          <strong>Uploads are processed in memory</strong> — spreadsheet files are not kept
          after analysis unless you explicitly save a run to history
        </li>
        <li>
          <strong>Results return to your browser</strong> — optional saved analyses are
          stored only when your organization chooses to save them
        </li>
        <li>
          <strong>HTTPS encryption</strong> for data in transit between your browser and
          our servers
        </li>
        <li>
          <strong>Password-protected access</strong> when authentication is enabled
        </li>
        <li>
          <strong>No training</strong> of machine-learning models on your uploads
        </li>
      </ul>

      <h2>2. How a typical upload works</h2>
      <ol>
        <li>You sign in (if required) over HTTPS.</li>
        <li>
          You confirm you are authorized to upload the file and select an Excel or CSV
          compensation spreadsheet from your device.
        </li>
        <li>
          The file is sent to our application server for a single analysis request.
        </li>
        <li>
          The server reads the file <strong>in memory</strong>, runs compensation checks,
          and builds a JSON result.
        </li>
        <li>
          The result is returned to your browser. The in-memory copy from that request is
          discarded when processing finishes unless you click <strong>Save to history</strong>.
        </li>
        <li>
          If you export Excel or PDF reports, those files are generated in your browser
          and saved on your device.
        </li>
      </ol>
      <p>
        We do not operate a multi-tenant data warehouse of employee rows. Each analysis is
        a discrete request.
      </p>

      <h2>3. What we do not store by default</h2>
      <ul>
        <li>Uploaded spreadsheet files after analysis completes</li>
        <li>Employee salary rows in a general-purpose customer database</li>
        <li>Automatic server-side history — saving is explicit and opt-in per run</li>
      </ul>
      <p>
        Refreshing the page or signing out ends the visible session output unless you saved
        the analysis to your account history or exported a report to your device.
      </p>

      <h2>3a. Optional saved analysis history</h2>
      <p>
        Signed-in customers can click <strong>Save to history</strong> to store a JSON
        snapshot of analysis results for your signed-in account on the server (up to 25 runs per
        user by default). This lets comp teams reopen prior review outputs without
        re-uploading. Saved history can be deleted from the analyzer at any time.
      </p>

      <h2>4. What may exist temporarily or operationally</h2>
      <ul>
        <li>
          <strong>Server memory</strong> during an active analysis request (seconds to a
          minute, depending on file size and server load)
        </li>
        <li>
          <strong>Session token</strong> in your browser’s local storage (typically up to
          24 hours) so you stay signed in
        </li>
        <li>
          <strong>Hosting logs</strong> from our infrastructure provider (for example IP
          address, request time, HTTP status, and error diagnostics). These logs are for
          security and reliability — not for rebuilding spreadsheet contents
        </li>
        <li>
          <strong>Support emails</strong> you send us voluntarily at{" "}
          <a href="mailto:hello@shiftworkshr.com">hello@shiftworkshr.com</a>
        </li>
      </ul>

      <h2>5. Authentication and access control</h2>
      <p>When authentication is enabled in production:</p>
      <ul>
        <li>File upload and analysis endpoints require a valid signed-in session</li>
        <li>Passwords are verified using industry-standard hashing (bcrypt)</li>
        <li>
          Credentials are configured as environment variables on the server — not embedded
          in application source code
        </li>
        <li>
          Login credentials are intended for one organization per account; sharing outside
          your authorized team is prohibited in our Terms
        </li>
      </ul>

      <h2>6. Encryption and network security</h2>
      <ul>
        <li>
          Production traffic is served over <strong>HTTPS (TLS)</strong>
        </li>
        <li>We rely on our hosting and DNS providers for certificate management</li>
        <li>
          No method of transmission or processing is perfectly secure; customers should
          use the Service only on trusted networks and devices
        </li>
      </ul>

      <h2>7. Demographic and pay equity data</h2>
      <p>
        If your file includes gender or race/ethnicity columns, those values are processed
        only to produce <strong>descriptive statistical comparisons</strong> in the app.
        Safeguards include:
      </p>
      <ul>
        <li>Clear in-product disclaimers that outputs are decision support only</li>
        <li>Groups with fewer than five employees are hidden to reduce re-identification risk</li>
        <li>
          No long-term store of demographic fields unless you explicitly save a run to history
        </li>
      </ul>
      <p>
        Your organization remains responsible for lawful collection and use of demographic
        data and for how you act on results.
      </p>

      <h2>8. Infrastructure</h2>
      <p>ShiftWorksHR is hosted on managed cloud infrastructure, including:</p>
      <ul>
        <li>
          <strong>Render</strong> — application hosting
        </li>
        <li>
          <strong>Cloudflare</strong> — domain and traffic protection (when enabled for
          shiftworkshr.com)
        </li>
      </ul>
      <p>
        These providers maintain their own security programs. We select reputable vendors
        but do not control their internal operations.
      </p>

      <h2>9. Demo and marketing features</h2>
      <p>
        Public demo and marketing preview features use <strong>fictional sample data only</strong>.
        They do not expose customer uploads.
      </p>

      <h2>10. Your security responsibilities</h2>
      <p>We recommend customers:</p>
      <ul>
        <li>Limit access to authorized HR/compensation staff</li>
        <li>Use strong, unique passwords and remove access when staff leave</li>
        <li>
          Avoid uploading on shared or public computers; sign out when finished
        </li>
        <li>
          Remove employee identifiers from files when possible for exploratory analysis
        </li>
        <li>Keep downloaded exports on your device protected with your own access controls</li>
        <li>Review outputs with qualified professionals before employment or pay decisions</li>
      </ul>

      <h2>11. Incidents</h2>
      <p>
        If we become aware of a security incident that compromises account access or is
        reasonably likely to affect uploaded compensation data in our systems, we will
        take reasonable steps to investigate, mitigate, and notify affected customers as
        required by applicable law. Report concerns to{" "}
        <a href="mailto:hello@shiftworkshr.com">hello@shiftworkshr.com</a>.
      </p>

      <h2>12. Questions</h2>
      <p>
        Security and data-handling questions:{" "}
        <a href="mailto:hello@shiftworkshr.com">hello@shiftworkshr.com</a>
      </p>

      <p className="legal-disclaimer">
        This page describes our current technical and operational practices. It is not a
        SOC 2 report, penetration test, or legal guarantee. Practices may evolve as the
        Service matures; we will update this page when they do.
      </p>
    </LegalLayout>
  );
}
