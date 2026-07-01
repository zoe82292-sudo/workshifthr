import { LegalLayout } from "./LegalLayout";

export function PrivacyPolicy() {
  return (
    <LegalLayout title="Privacy Policy">
      <p>
        This Privacy Policy describes how ShiftWorksHR (“we,” “us,” “our”) handles
        information when you use shiftworkshr.com (the “Service”). The Service is
        operated by the owner of ShiftWorksHR. We have not yet formed a separate legal
        entity; when we do, we will update this policy to identify that entity.
      </p>

      <h2>1. Summary</h2>
      <ul>
        <li>
          <strong>We do not keep your uploaded spreadsheets</strong> in a database or
          file store after analysis completes.
        </li>
        <li>
          <strong>We do not sell</strong> your compensation data or use it to train
          machine-learning models.
        </li>
        <li>
          <strong>Your organization controls employee data.</strong> You upload it; we
          process it only to return analysis to your browser.
        </li>
      </ul>

      <h2>2. Roles: you and us</h2>
      <p>
        When you upload files containing employee compensation information,{" "}
        <strong>your organization is the data controller</strong> (or equivalent under
        applicable law). You decide what data to upload and must have a lawful basis to
        process it, including providing any required notices to employees.
      </p>
      <p>
        ShiftWorksHR acts as a <strong>service provider / data processor</strong> on your
        behalf: we process uploads only to perform the analysis you request and operate
        the Service. We do not use employee compensation data for our own marketing or
        unrelated purposes.
      </p>

      <h2>3. Information we process</h2>

      <h3>Compensation files you upload</h3>
      <p>
        When you upload an Excel or CSV file, our servers read the file in memory to
        perform analysis. Depending on your file, this may include:
      </p>
      <ul>
        <li>Employee identifiers and names</li>
        <li>Salary, bonus, and range data</li>
        <li>Job level, department, manager relationships</li>
        <li>
          <strong>Gender and race/ethnicity</strong>, if you include those columns for
          descriptive pay comparisons
        </li>
        <li>Other columns you choose to include</li>
      </ul>
      <p>
        After the analysis request finishes, the uploaded file is{" "}
        <strong>not intentionally stored</strong> in a database or long-term file storage
        on our systems. Processing occurs in server memory during the active request and
        is discarded when the request completes.
      </p>
      <p>
        <strong>Limitations.</strong> We cannot guarantee that memory is instantly
        overwritten. Our hosting provider may retain standard technical logs (see below)
        that do not include the contents of your spreadsheet.
      </p>
      <p>
        Analysis results are sent back to your browser. They may remain visible in your
        current session until you refresh, navigate away, or sign out. Excel or PDF
        exports are saved on your device, not on our servers.
      </p>

      <h3>Demographic and pay equity data</h3>
      <p>
        If you upload gender or race/ethnicity fields, we use them only to produce{" "}
        <strong>descriptive statistical comparisons</strong> (for example, median pay by
        group). These outputs are decision-support only — not legal pay equity audits,
        EEO determinations, or compliance conclusions. Groups with fewer than five
        employees are hidden to reduce re-identification risk.
      </p>

      <h3>Account and authentication data</h3>
      <p>If you sign in, we process:</p>
      <ul>
        <li>Email address and password (verified securely; passwords are not stored in plaintext in our application)</li>
        <li>
          A session token stored in your browser’s <strong>local storage</strong> so you
          stay signed in (typically up to 24 hours)
        </li>
      </ul>

      <h3>Technical data</h3>
      <p>
        Our service providers may automatically log technical information such as IP
        address, browser type, request timestamps, and error diagnostics for security
        and reliability. These logs are not used to reconstruct the contents of your
        compensation uploads.
      </p>

      <h3>Public demo data</h3>
      <p>
        The Service may expose a public demo analysis endpoint and marketing preview
        using <strong>fictional sample data only</strong>. No customer upload data is used
        for those features.
      </p>

      <h2>4. How we use information</h2>
      <p>We use information only to:</p>
      <ul>
        <li>Authenticate authorized users</li>
        <li>Process uploads and deliver analysis results</li>
        <li>Operate, secure, and maintain the Service (including debugging and reliability)</li>
        <li>Respond to support requests you send us</li>
      </ul>
      <p>
        We do <strong>not</strong> sell personal information, including under the
        California Consumer Privacy Act (CCPA/CPRA) definition of “sale.”
      </p>

      <h2>5. What we do not store long-term (by default)</h2>
      <ul>
        <li>Uploaded spreadsheet files — not retained after processing</li>
        <li>Employee rows from your file — not retained in a customer database unless you opt in</li>
      </ul>
      <h3>5a. Optional saved analysis history</h3>
      <p>
        Signed-in customers may click <strong>Save to history</strong> to store a JSON snapshot of
        a completed analysis on our servers. Saved runs are scoped to your account, limited to 25 per
        organization, and can be deleted from the analyzer at any time. Saved history may include
        employee names, salaries, and demographic fields from your upload.
      </p>

      <h2>6. Service providers (subprocessors)</h2>
      <p>We use trusted providers to run the Service, including:</p>
      <ul>
        <li>
          <strong>Render</strong> — application hosting and infrastructure
        </li>
        <li>
          <strong>Cloudflare</strong> — domain, DNS, and traffic protection (if enabled
          for shiftworkshr.com)
        </li>
        <li>
          <strong>Stripe</strong> — secure payment processing when you purchase a plan on
          shiftworkshr.com
        </li>
        <li>
          <strong>Email provider</strong> — for support correspondence you initiate (for
          example, messages to hello@shiftworkshr.com)
        </li>
      </ul>
      <p>
        These providers process technical and operational data under their own security
        and privacy practices. See our <a href="/security">Security &amp; Data Handling</a>{" "}
        page for how we process uploads. We do not authorize them to use your compensation
        uploads for their own marketing.
      </p>

      <h2>7. Your responsibilities</h2>
      <p>
        You are responsible for ensuring you have a lawful basis to upload employee data,
        including compliance with your internal policies and applicable employment and
        privacy laws. Do not upload data you are not authorized to process. The Service
        is decision-support software — not legal or compliance advice.
      </p>

      <h2>8. Security and incidents</h2>
      <p>
        We use HTTPS for data in transit and password-protected access to the application.
        No method of transmission or storage is completely secure.
      </p>
      <p>
        If we become aware of a security incident that compromises account credentials or
        is reasonably likely to affect uploaded compensation data in our systems, we will
        take reasonable steps to investigate, mitigate, and notify affected customers as
        required by applicable law.
      </p>

      <h2>9. Retention</h2>
      <ul>
        <li>
          <strong>Uploads:</strong> not retained after analysis unless you explicitly save a run to
          history (see section 5a)
        </li>
        <li>
          <strong>Saved analysis history:</strong> retained until you delete it or until older runs
          are removed after the 25-run limit per organization
        </li>
        <li>
          <strong>Login sessions:</strong> until token expiry or sign-out (typically up to
          24 hours)
        </li>
        <li>
          <strong>Support emails:</strong> retained as long as needed to respond and for
          ordinary business records
        </li>
        <li>
          <strong>Technical logs:</strong> retained by our hosting providers according to
          their default schedules (typically days to weeks unless extended for security
          investigations)
        </li>
      </ul>

      <h2>10. Your privacy rights</h2>
      <p>
        Depending on where you live, you may have rights to access, correct, delete, or
        restrict certain personal information we hold about you (such as your account
        email). California residents may have additional rights under the CCPA/CPRA,
        including the right to know what categories of personal information we collect and
        the right to request deletion of account information we maintain.
      </p>
      <p>
        To exercise rights, contact{" "}
        <a href="mailto:hello@shiftworkshr.com">hello@shiftworkshr.com</a>. Because we do
        not store uploaded compensation files, we cannot retrieve a past upload after your
        session ends. Employee data in uploads should be directed to your employer (the
        data controller).
      </p>

      <h2>11. Children</h2>
      <p>
        The Service is for business use by HR and compensation professionals. It is not
        directed to children under 13, and we do not knowingly collect information from
        children.
      </p>

      <h2>12. International users</h2>
      <p>
        The Service is operated from the United States. If you upload data about
        individuals in other countries, you are responsible for any cross-border transfer
        requirements. Contact us if you need information about our processing for vendor
        diligence.
      </p>

      <h2>13. Changes</h2>
      <p>
        We may update this Privacy Policy. The “Last updated” date will change when we do.
        Continued use after updates means you accept the revised policy. Material changes
        may also be communicated by email to registered users when practicable.
      </p>

      <h2>14. Contact</h2>
      <p>
        Privacy questions:{" "}
        <a href="mailto:hello@shiftworkshr.com">hello@shiftworkshr.com</a>
      </p>

      <p className="legal-disclaimer">
        This policy describes our current practices. It is not legal advice. Have a
        qualified attorney review it before relying on it for regulated or high-risk
        processing — especially employee compensation and demographic data.
      </p>
    </LegalLayout>
  );
}
