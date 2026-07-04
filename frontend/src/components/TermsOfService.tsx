import { LegalLayout } from "./LegalLayout";

export function TermsOfService() {
  return (
    <LegalLayout title="Terms of Service">
      <p>
        These Terms of Service (“Terms”) govern your access to and use of ShiftWorksHR
        (“Service”), available at shiftworkshr.com. The Service is operated by the owner
        of ShiftWorksHR (“we,” “us,” “our”). We have not yet formed a separate legal
        entity; when we do, we will update these Terms to identify that entity. By using
        the Service, you agree to these Terms and our Privacy Policy. If you do not agree,
        do not use the Service.
      </p>

      <h2>1. What ShiftWorksHR is</h2>
      <p>
        ShiftWorksHR is a software tool that analyzes compensation spreadsheets you upload
        and surfaces potential issues such as out-of-range pay, range penetration,
        compression signals, manager pay comparisons, and related metrics.
      </p>
      <p>
        <strong>Decision support only.</strong> The Service provides informational
        analytical output to support HR and compensation review workflows. It does{" "}
        <strong>not</strong> provide legal advice, tax advice, accounting advice, or
        professional compensation consulting. No attorney-client, fiduciary, or professional
        advisory relationship is created by your use of the Service.
      </p>
      <p>
        You are solely responsible for compensation, pay equity, employment, and business
        decisions. You should consult qualified legal, tax, and compensation professionals
        before acting on any output.
      </p>

      <h2>2. Pay equity and demographic analysis</h2>
      <p>
        If you upload gender or race/ethnicity data, the Service may produce descriptive
        pay comparisons by group. You acknowledge that:
      </p>
      <ul>
        <li>
          Outputs are <strong>not</strong> legal pay equity audits, EEO compliance
          determinations, or evidence suitable for litigation or regulatory filings on
          their own
        </li>
        <li>
          Comparisons may not control for tenure, performance, location, role scope, or
          other legitimate factors unless you provide that data and the Service supports
          it
        </li>
        <li>
          Small groups may be hidden to reduce re-identification risk; absence of a flag
          does not mean no issue exists
        </li>
        <li>
          You will not represent ShiftWorksHR outputs as official compliance conclusions
          to employees, regulators, or courts without independent professional review
        </li>
      </ul>

      <h2>3. Eligibility and accounts</h2>
      <p>
        Access is provided to authorized users at your organization (typically after purchase).
        Your organization receives one shared password that you may share with authorized HR
        and compensation teammates. Each person signs in with their own work email and that
        shared password. You must be at least 18 years old and authorized to bind your
        organization to these Terms. After sign-in, authorized users can add or remove
        teammates from Team access in the analyzer.
      </p>
      <p>
        You are responsible for sharing credentials only with authorized teammates and for
        all activity under your organization&apos;s access. Notify us immediately at{" "}
        <a href="mailto:hello@shiftworkshr.com">hello@shiftworkshr.com</a> if you suspect
        unauthorized access.
      </p>

      <h2>4. Your data and uploads</h2>
      <p>
        You retain ownership of the spreadsheets and data you upload. You represent and
        warrant that:
      </p>
      <ul>
        <li>
          You have the right to upload and process that data through the Service, including
          employee compensation and any demographic fields you include
        </li>
        <li>
          Your upload complies with applicable law and your internal policies
        </li>
        <li>
          You will not upload data you are not authorized to process
        </li>
      </ul>
      <p>
        <strong>No long-term storage of uploaded files by default.</strong> Uploaded spreadsheets
        are processed in server memory to generate analysis results and are not saved to persistent
        storage after the request completes unless you explicitly click{" "}
        <strong>Save to history</strong> while signed in.
      </p>
      <p>
        Optional saved analysis history stores a JSON snapshot of results (including employee rows
        from your file) on our servers for your account, up to 25 runs per signed-in user, deletable
        at any time. We do not maintain a general library of your uploads beyond what you choose
        to save.
      </p>
      <p>
        Results may remain visible in your browser until you refresh, navigate away, or
        sign out. Export files (Excel/PDF) you download are stored on your device.
      </p>

      <h2>5. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Use the Service for unlawful purposes or in violation of applicable law</li>
        <li>Upload malware or attempt to disrupt, probe, or reverse engineer the Service</li>
        <li>Share login credentials outside your authorized organization</li>
        <li>Share the organization password with contractors or vendors who are not authorized users</li>
        <li>Misrepresent your authority to process employee data in uploaded files</li>
        <li>
          Use outputs as the sole basis for adverse employment actions without appropriate
          human review and professional advice
        </li>
      </ul>

      <h2>6. Accuracy and limitations</h2>
      <p>
        Analysis depends on the quality, completeness, and correct labeling of columns in
        your upload. Auto-detection of column headers may be incorrect. The Service may not
        identify every compensation issue, and flagged items may include false positives.
        Output is provided <strong>“as is”</strong> and <strong>“as available”</strong>{" "}
        without warranties of any kind, whether express or implied, including
        merchantability, fitness for a particular purpose, accuracy, or non-infringement.
      </p>

      <h2>7. Fees, refunds, and access</h2>
      <p>
        Paid access terms (pricing, duration, number of authorized users, and refund
        policy) are agreed when you purchase or subscribe. Online purchases are processed
        by Stripe; we do not store full payment card numbers on our servers. Unless otherwise
        stated in writing, fees are non-refundable once access credentials are delivered. We may
        suspend or terminate access for violation of these Terms, non-payment, or abuse.
      </p>

      <h2>8. Indemnification</h2>
      <p>
        To the maximum extent permitted by law, you will defend, indemnify, and hold harmless
        ShiftWorksHR and its operator from claims, damages, losses, and expenses (including
        reasonable attorneys’ fees) arising from: (a) your uploads or use of the Service;
        (b) your violation of these Terms or applicable law; (c) your lack of authority to
        process employee data you submit; or (d) employment, pay, or compliance decisions
        you make based on Service output.
      </p>

      <h2>9. Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, ShiftWorksHR and its operator will not be
        liable for any indirect, incidental, special, consequential, or punitive damages, or
        for lost profits, data, or business opportunities, arising from or related to your
        use of the Service — including reliance on analysis results for pay, merit, equity,
        or employment decisions.
      </p>
      <p>
        Our total liability for any claim arising from the Service will not exceed the
        amount you paid us for access in the twelve (12) months before the claim, or one
        hundred U.S. dollars (USD $100) if no fees were paid, whichever is greater.
      </p>

      <h2>10. Disputes and governing law</h2>
      <p>
        These Terms are governed by the laws of the State of California, United States,
        without regard to conflict-of-law rules. You agree that exclusive jurisdiction for
        disputes arising from these Terms or the Service will be in the state or federal
        courts located in California, and you consent to personal jurisdiction there.
      </p>
      <p>
        <strong>Informal resolution.</strong> Before filing a claim, you agree to contact us
        at <a href="mailto:hello@shiftworkshr.com">hello@shiftworkshr.com</a> and attempt
        to resolve the dispute informally for at least thirty (30) days.
      </p>

      <h2>11. Changes and termination</h2>
      <p>
        We may update these Terms from time to time. Continued use after changes are posted
        constitutes acceptance. We may discontinue or modify the Service with reasonable
        notice when practicable. You may stop using the Service at any time.
      </p>

      <h2>12. Contact</h2>
      <p>
        Questions about these Terms:{" "}
        <a href="mailto:hello@shiftworkshr.com">hello@shiftworkshr.com</a>
      </p>

      <p className="legal-disclaimer">
        These Terms are provided for transparency and operational clarity. They are not a
        substitute for advice from a licensed attorney. Have counsel review them before
        relying on them for your business — especially when processing employee
        compensation and demographic data.
      </p>
    </LegalLayout>
  );
}
