import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { BrandLogo } from "./BrandLogo";
import { LegalFooter } from "./LegalFooter";

export function LegalLayout({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="legal-page">
      <div className="legal-page-inner">
        <div className="legal-page-brand">
          <BrandLogo size="nav" />
          <Link className="legal-back-link" to="/">
            ← Back to ShiftWorksHR
          </Link>
        </div>
        <h1>{title}</h1>
        <p className="legal-updated">Last updated: July 1, 2026</p>
        <div className="legal-content">{children}</div>
        <LegalFooter />
      </div>
    </div>
  );
}
