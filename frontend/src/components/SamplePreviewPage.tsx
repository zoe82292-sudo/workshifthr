import { Link } from "react-router-dom";
import { BrandLogo } from "./BrandLogo";
import { SampleAnalysisEmbed } from "./SampleAnalysisEmbed";

export function SamplePreviewPage() {
  return (
    <div className="sample-preview-page">
      <header className="sample-preview-page__header">
        <BrandLogo size="nav" />
        <Link className="legal-back-link" to="/">
          ← Back to ShiftWorksHR
        </Link>
      </header>
      <div className="sample-preview-page__intro">
        <span className="hero-badge">Full product preview</span>
        <h1>The complete analyzer view</h1>
        <p>
          This is the same screen customers see after upload — cycle readiness, review queue,
          all issue tabs, and exports on sample data.
        </p>
        <p className="sample-preview-page__note">
          Looking for the homepage tour?{" "}
          <Link to="/#see-it-in-action">View the embedded sample</Link>.
        </p>
      </div>

      <div className="sample-preview-page__dashboard panel">
        <SampleAnalysisEmbed />
      </div>
    </div>
  );
}
