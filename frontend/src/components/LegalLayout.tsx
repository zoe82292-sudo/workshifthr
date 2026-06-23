import type { ReactNode } from "react";
import { Link } from "react-router-dom";
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
        <Link className="legal-back-link" to="/">
          ← Back to ShiftWorksHR
        </Link>
        <h1>{title}</h1>
        <p className="legal-updated">Last updated: June 2026</p>
        <div className="legal-content">{children}</div>
        <LegalFooter />
      </div>
    </div>
  );
}
