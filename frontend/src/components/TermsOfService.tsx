import { LegalLayout } from "./LegalLayout";

export function TermsOfService() {
  return (
    <LegalLayout title="Terms of Service">
      <p>
        These Terms of Service (“Terms”) govern your access to and use of WorkShiftHR
        (“Service”), operated at shiftworkshr.com. By using the Service, you agree to
        these Terms. If you do not agree, do not use the Service.
      </p>

      <h2>1. What WorkShiftHR is</h2>
      <p>
        WorkShiftHR is a software tool that analyzes compensation spreadsheets you
        upload and surfaces potential issues such as out-of-range pay, range
        penetration, compression signals, and related metrics.
      </p>
      <p>
        <strong>Decision support only.</strong> The Service provides informational
        and analytical output to support HR and compensation review workflows. It
        does <strong>not</strong> provide legal advice, tax advice, accounting advice,
        or professional compensation consulting. No attorney-client, fiduciary, or
        professional advisory relationship is created by your use of the Service.
      </p>
      <p>
        You are solely responsible for compensation, pay equity, employment, and
        business decisions. You should consult qualified legal, tax, and compensation
        professionals before acting on any output from the Service.
      </p>

      <h2>2. Eligibility and accounts</h2>
      <p>
        Access is provided to authorized users at the discretion of WorkShiftHR
        (typically after purchase or invitation). You are responsible for keeping
        your login credentials confidential and for all activity under your account.
        Notify us immediately at{" "}
        <a href="mailto:hello@shiftworkshr.com">hello@shiftworkshr.com</a> if you
        suspect unauthorized access.
      </p>

      <h2>3. Your data and uploads</h2>
      <p>
        You retain ownership of the spreadsheets and data you upload. You represent
        that you have the right to upload and process that data through the Service,
        including any employee compensation information contained in your files.
      </p>
      <p>
        <strong>No long-term storage of uploaded files.</strong> Uploaded
        spreadsheets are processed in server memory to generate analysis results and
        are not intentionally saved to a database or persistent file storage after
        the request completes. Analysis output is returned to your browser session;
        we do not maintain a library of your historical uploads on our servers.
      </p>
      <p>
        Results may remain visible in your browser until you refresh, navigate away,
        or sign out. Export files (Excel/PDF) you download are stored on your device,
        not on our servers.
      </p>

      <h2>4. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Use the Service for unlawful purposes or in violation of applicable law</li>
        <li>Upload malware or attempt to disrupt, probe, or reverse engineer the Service</li>
        <li>Share login credentials outside your authorized organization</li>
        <li>Misrepresent your authority to process employee data in uploaded files</li>
      </ul>

      <h2>5. Accuracy and limitations</h2>
      <p>
        Analysis depends on the quality, completeness, and correct labeling of columns
        in your upload. Auto-detection of column headers may be incorrect. The Service
        may not identify every compensation issue, and flagged items may include
        false positives. Output is provided <strong>“as is”</strong> and{" "}
        <strong>“as available”</strong> without warranties of any kind, whether
        express or implied, including merchantability, fitness for a particular
        purpose, or non-infringement.
      </p>

      <h2>6. Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, WorkShiftHR and its operator will not
        be liable for any indirect, incidental, special, consequential, or punitive
        damages, or for lost profits, data, or business opportunities, arising from or
        related to your use of the Service — including reliance on analysis results
        for pay, merit, equity, or employment decisions.
      </p>
      <p>
        Our total liability for any claim arising from the Service will not exceed the
        amount you paid us for access in the twelve (12) months before the claim, or
        one hundred U.S. dollars (USD $100) if no fees were paid, whichever is greater.
      </p>

      <h2>7. Fees and access</h2>
      <p>
        Paid access terms (pricing, duration, and number of authorized users) are
        agreed separately when you purchase or subscribe. We may suspend or terminate
        access for violation of these Terms or non-payment.
      </p>

      <h2>8. Changes</h2>
      <p>
        We may update these Terms from time to time. Continued use after changes are
        posted constitutes acceptance of the revised Terms. Material changes will be
        reflected by updating the “Last updated” date above.
      </p>

      <h2>9. Contact</h2>
      <p>
        Questions about these Terms:{" "}
        <a href="mailto:hello@shiftworkshr.com">hello@shiftworkshr.com</a>
      </p>

      <p className="legal-disclaimer">
        This document is provided for transparency and operational clarity. It is not
        a substitute for advice from a licensed attorney. Consider having these Terms
        reviewed by counsel before relying on them for your business.
      </p>
    </LegalLayout>
  );
}
