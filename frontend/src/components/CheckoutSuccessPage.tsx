import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { fetchCheckoutSession } from "../api";
import { BrandLogo } from "./BrandLogo";
import { LegalFooter } from "./LegalFooter";

export function CheckoutSuccessPage() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [planName, setPlanName] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setError("Missing checkout session.");
      return;
    }

    void fetchCheckoutSession(sessionId)
      .then((session) => {
        setPlanName(session.plan_name);
        setEmail(session.email);
      })
      .catch((caught) => {
        setError(caught instanceof Error ? caught.message : "Unable to verify payment.");
      });
  }, [sessionId]);

  return (
    <div className="checkout-page">
      <div className="checkout-card panel">
        <BrandLogo size="nav" />
        <span className="hero-badge">Payment received</span>
        <h1>Thank you for your purchase</h1>
        {error ? (
          <p className="checkout-copy checkout-copy--error">{error}</p>
        ) : (
          <>
            <p className="checkout-copy">
              {planName ? (
                <>
                  Your <strong>{planName}</strong> plan is confirmed.
                </>
              ) : (
                <>Your plan is confirmed.</>
              )}
            </p>
            <p className="checkout-copy">
              We&apos;ll email your organization&apos;s shared login credentials
              {email ? (
                <>
                  {" "}
                  to <strong>{email}</strong>
                </>
              ) : null}{" "}
              within one business day. Teammates can then sign in with their work email and the
              shared password.
            </p>
          </>
        )}
        <div className="checkout-actions">
          <Link className="button button-primary" to="/#sign-in">
            Go to sign in
          </Link>
          <Link className="button button-secondary" to="/">
            Back to home
          </Link>
        </div>
        <LegalFooter />
      </div>
    </div>
  );
}
