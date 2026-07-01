import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  completeHrisConnect,
  HRIS_PROVIDER_STORAGE_KEY,
  HRIS_RESULT_STORAGE_KEY,
} from "../api";
import { BrandLogo } from "./BrandLogo";
import { LegalFooter } from "./LegalFooter";

export function HrisCallbackPage() {
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get("code");
    if (!code) {
      setError("Missing HRIS authorization code. Please try connecting again.");
      return;
    }

    const providerId = sessionStorage.getItem(HRIS_PROVIDER_STORAGE_KEY);

    void completeHrisConnect(code, providerId)
      .then((result) => {
        sessionStorage.setItem(HRIS_RESULT_STORAGE_KEY, JSON.stringify(result));
        sessionStorage.removeItem(HRIS_PROVIDER_STORAGE_KEY);
        window.location.replace("/");
      })
      .catch((caught) => {
        setError(caught instanceof Error ? caught.message : "Unable to import from HRIS.");
      });
  }, [searchParams]);

  return (
    <div className="checkout-page">
      <div className="checkout-card panel">
        <BrandLogo size="nav" />
        {error ? (
          <>
            <span className="hero-badge">Connection failed</span>
            <h1>HRIS import did not complete</h1>
            <p className="checkout-copy checkout-copy--error">{error}</p>
            <div className="checkout-actions">
              <Link className="button button-primary" to="/">
                Back to analyzer
              </Link>
            </div>
          </>
        ) : (
          <>
            <span className="hero-badge">Connecting</span>
            <h1>Importing from your HRIS</h1>
            <p className="checkout-copy">
              Hang tight — we&apos;re securely pulling employee data and running your analysis.
            </p>
          </>
        )}
        <LegalFooter />
      </div>
    </div>
  );
}
