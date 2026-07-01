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
  const [organization, setOrganization] = useState<string | null>(null);
  const [password, setPassword] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      setError("Missing checkout session.");
      return;
    }

    void fetchCheckoutSession(sessionId)
      .then((session) => {
        setPlanName(session.plan_name);
        setEmail(session.email);
        setOrganization(session.organization);
        setPassword(session.password);
      })
      .catch((caught) => {
        setError(caught instanceof Error ? caught.message : "Unable to verify payment.");
      });
  }, [sessionId]);

  async function copyPassword() {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

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

            {password && email ? (
              <div className="checkout-credentials panel">
                <h2>Your login credentials</h2>
                <p className="checkout-copy">
                  Save these now — your organization shares one password. Teammates with an
                  authorized work email on the same domain can sign in with this password.
                </p>
                <dl className="checkout-credentials__list">
                  {organization ? (
                    <div>
                      <dt>Organization</dt>
                      <dd>{organization}</dd>
                    </div>
                  ) : null}
                  <div>
                    <dt>Email</dt>
                    <dd>{email}</dd>
                  </div>
                  <div>
                    <dt>Shared password</dt>
                    <dd className="checkout-credentials__password">
                      <code>{password}</code>
                      <button className="button button-secondary button-small" type="button" onClick={() => void copyPassword()}>
                        {copied ? "Copied" : "Copy"}
                      </button>
                    </dd>
                  </div>
                </dl>
              </div>
            ) : (
              <p className="checkout-copy">
                We&apos;re setting up your account. Refresh this page in a few seconds or email{" "}
                <a href="mailto:hello@shiftworkshr.com">hello@shiftworkshr.com</a> if credentials
                don&apos;t appear.
              </p>
            )}
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
