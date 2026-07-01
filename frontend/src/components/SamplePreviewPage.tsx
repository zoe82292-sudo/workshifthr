import { Link } from "react-router-dom";
import { BrandLogo } from "./BrandLogo";
import { ProductDemoShowcase } from "./ProductDemoShowcase";

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
        <span className="hero-badge">Product preview</span>
        <h1>Sample compensation analysis</h1>
        <p>
          Switch tabs to explore overview, flagged issues, pay equity, and budget impact — the same
          core views available after upload.
        </p>
      </div>
      <ProductDemoShowcase variant="full" />
    </div>
  );
}
