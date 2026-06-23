import { LegalLayout } from "./LegalLayout";

export function PrivacyPolicy() {
  return (
    <LegalLayout title="Privacy Policy">
      <p>
        This Privacy Policy describes how WorkShiftHR (“we,” “us”) handles information
        when you use shiftworkshr.com (the “Service”). We designed the Service for HR
        and compensation teams who work with sensitive pay data.
      </p>

      <h2>1. Summary</h2>
      <ul>
        <li>
          <strong>We do not keep your uploaded spreadsheets</strong> on our servers
          after analysis completes.
        </li>
        <li>
          <strong>We do not sell</strong> your compensation data.
        </li>
        <li>
          <strong>We use your data only</strong> to run the analysis you request and
          return results to your browser.
        </li>
      </ul>

      <h2>2. Information we process</h2>

      <h3>Compensation files you upload</h3>
      <p>
        When you upload an Excel or CSV file, our servers read the file in memory to
        perform analysis (for example: salary ranges, employee IDs, job levels, and
        other columns present in your file). After the analysis request finishes, the
        uploaded file is <strong>not intentionally stored</strong> in a database or
        long-term file storage on our systems.
      </p>
      <p>
        Analysis results are sent back to your browser. They may remain visible in your
        current session until you clear them, refresh, or sign out. If you export Excel
        or PDF reports, those files are saved on your device.
      </p>

      <h3>Account and authentication data</h3>
      <p>If you sign in, we process:</p>
      <ul>
        <li>Email address and password (password is verified securely; we do not store plaintext passwords in application code)</li>
        <li>
          A session token stored in your browser’s local storage so you stay signed in
        </li>
      </ul>

      <h3>Technical data</h3>
      <p>
        Our hosting provider (Render) and infrastructure may automatically log standard
        technical information such as IP address, browser type, request timestamps, and
        error logs for security and reliability. These logs are not used to build a
        profile of your compensation data.
      </p>

      <h2>3. How we use information</h2>
      <p>We use information only to:</p>
      <ul>
        <li>Authenticate authorized users</li>
        <li>Process uploads and deliver analysis results</li>
        <li>Operate, secure, and improve the Service</li>
        <li>Respond to support requests you send us</li>
      </ul>
      <p>
        We do <strong>not</strong> use your uploaded compensation files to train
        machine-learning models, and we do <strong>not</strong> sell personal
        information to third parties.
      </p>

      <h2>4. What we do not store long-term</h2>
      <p>To be explicit:</p>
      <ul>
        <li>Uploaded spreadsheet files — not retained after processing</li>
        <li>Employee salary rows from your file — not retained in a customer database</li>
        <li>Historical analysis results — not retained on our servers between sessions</li>
      </ul>
      <p>
        Temporary in-memory processing during an active upload request is required for
        the Service to function. That data is discarded when the request completes.
      </p>

      <h2>5. Service providers</h2>
      <p>
        The Service is hosted on third-party infrastructure (including Render for
        application hosting). Those providers process technical data on our behalf under
        their own security and privacy practices. We do not authorize them to use your
        compensation uploads for their own marketing purposes.
      </p>

      <h2>6. Your responsibilities</h2>
      <p>
        You are responsible for ensuring you have a lawful basis to upload employee
        compensation data to the Service, including compliance with your internal
        policies and applicable privacy and employment laws. The Service is decision
        support software — not legal or compliance advice.
      </p>

      <h2>7. Security</h2>
      <p>
        We use HTTPS encryption for data in transit and password-protected access for
        the application. No method of transmission or storage is 100% secure; you use
        the Service at your own risk and should avoid uploading data you are not
        authorized to process.
      </p>

      <h2>8. Retention</h2>
      <ul>
        <li>
          <strong>Uploads:</strong> not retained after analysis (see above)
        </li>
        <li>
          <strong>Login sessions:</strong> until token expiry or sign-out (typically up
          to 24 hours)
        </li>
        <li>
          <strong>Support emails:</strong> retained as long as needed to respond and
          for ordinary business records
        </li>
      </ul>

      <h2>9. Your rights</h2>
      <p>
        Depending on where you live, you may have rights to access, correct, or delete
        personal information we hold about you (such as your account email). Contact us
        at{" "}
        <a href="mailto:hello@shiftworkshr.com">hello@shiftworkshr.com</a>. Because
        we do not store uploaded compensation files, we cannot retrieve a past upload
        after your session ends.
      </p>

      <h2>10. Children</h2>
      <p>
        The Service is for business use by HR and compensation professionals. It is not
        directed to children under 16.
      </p>

      <h2>11. Changes</h2>
      <p>
        We may update this Privacy Policy. The “Last updated” date at the top will
        change when we do. Continued use of the Service after updates means you accept
        the revised policy.
      </p>

      <h2>12. Contact</h2>
      <p>
        Privacy questions:{" "}
        <a href="mailto:hello@shiftworkshr.com">hello@shiftworkshr.com</a>
      </p>

      <p className="legal-disclaimer">
        This policy is intended to accurately describe our current practices. It is not
        legal advice. Consider having it reviewed by a qualified attorney, especially
        if you process data subject to GDPR, CCPA, or other regulations.
      </p>
    </LegalLayout>
  );
}
