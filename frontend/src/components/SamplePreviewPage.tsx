import { Link } from "react-router-dom";
import { BrandLogo } from "./BrandLogo";
import { InteractiveDemoPreview } from "./InteractiveDemoPreview";

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
        <span className="hero-badge">Interactive demo</span>
        <h1>Explore a real comp analysis</h1>
        <p>
          Sample data from a 20-employee file. Click tabs, scroll tables, and review the same
          output customers see after upload.
        </p>
      </div>
      <InteractiveDemoPreview variant="full" />
    </div>
  );
}
