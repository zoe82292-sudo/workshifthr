import { Link } from "react-router-dom";
import { LegalLayout } from "./LegalLayout";

const CONTACT_EMAIL = "hello@shiftworkshr.com";

/** Template structure for real customer stories — fill in when you have permission. */
const STORY_TEMPLATE = {
  headline: "[Company type], ~[X] employees",
  challenge:
    "Before merit review, the comp team spent [X hours/days] manually checking ranges, compression, and manager inversions in Excel.",
  approach:
    "Exported comp data from [HRIS], uploaded to ShiftWorksHR, and worked through the review queue before the leadership deck.",
  results: [
    "[N] below-minimum employees flagged in under 30 minutes",
    "[N] manager inversions caught before exec review",
    "Leadership PDF shared with HRBPs — no formula rebuild next cycle",
  ],
  quote:
    "&ldquo;[One sentence from comp lead or HR director — with permission.]&rdquo; — [Name], [Title]",
};

export function CustomerStoriesPage() {
  return (
    <LegalLayout title="Customer stories">
      <div className="resource-intro">
        <p>
          We&apos;re collecting stories from HR and comp teams using ShiftWorksHR during merit
          season. Below is the format we use — replace the placeholders when you have a real
          customer willing to share (even anonymously).
        </p>
      </div>

      <article className="case-study panel">
        <span className="hero-badge">Story template</span>
        <h2>{STORY_TEMPLATE.headline}</h2>

        <section className="case-study__section">
          <h3>Challenge</h3>
          <p>{STORY_TEMPLATE.challenge}</p>
        </section>

        <section className="case-study__section">
          <h3>Approach</h3>
          <p>{STORY_TEMPLATE.approach}</p>
        </section>

        <section className="case-study__section">
          <h3>Results</h3>
          <ul className="resource-list">
            {STORY_TEMPLATE.results.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <blockquote className="resource-quote case-study__quote">
          <span dangerouslySetInnerHTML={{ __html: STORY_TEMPLATE.quote }} />
        </blockquote>

        <p className="case-study__note">
          <em>Template only — publish a real story here once you have customer permission.</em>
        </p>
      </article>

      <div className="checklist-cta panel">
        <h2>Share your merit season story</h2>
        <p>
          Used ShiftWorksHR this cycle? We&apos;d love a short quote or anonymized summary for
          other HR teams. No fake testimonials — only real permissioned stories.
        </p>
        <a
          className="button button-primary"
          href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Customer story submission")}&body=${encodeURIComponent("Company (or type):\nEmployee count (approx):\nWhat you used ShiftWorksHR for:\nResults (numbers help):\nOK to use quote anonymously? Y/N:\n")}`}
        >
          Submit your story
        </a>
      </div>

      <p className="resource-footer-link">
        <Link to="/sample-preview">View sample analysis</Link>
        {" · "}
        <Link to="/for-consultants">For consultants</Link>
      </p>
    </LegalLayout>
  );
}
