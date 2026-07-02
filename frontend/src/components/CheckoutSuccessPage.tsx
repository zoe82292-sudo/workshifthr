import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { fetchCheckoutSession } from "../api";
import { BrandLogo } from "./BrandLogo";
import { LegalFooter } from "./LegalFooter";

const CONTACT_EMAIL = "hello@shiftworkshr.com";
const MAX_POLL_ATTEMPTS = 10;
const POLL_INTERVAL_MS = 2000;

export function CheckoutSuccessPage() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [planName, setPlanName] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [organization, setOrganization] = useState<string | null>(null);
  const [password, setPassword] = useState<string | null>(null);
  const [credentialsEmailed, setCredentialsEmailed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(sessionId));
  const [copied, setCopied] = useState(false);
  const [savedWarning, setSavedWarning] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      setError("Missing checkout session.");
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function pollSession(attempt: number) {
      try {
        const session = await fetchCheckoutSession(sessionId!);
        if (cancelled) return;

        setPlanName(session.plan_name);
        setEmail(session.email);
        setOrganization(session.organization);
        setCredentialsEmailed(Boolean(session.credentials_emailed));
        if (session.password) {
          setPassword(session.password);
          setLoading(false);
          return;
        }

        if (attempt + 1 < MAX_POLL_ATTEMPTS) {
          window.setTimeout(() => void pollSession(attempt + 1), POLL_INTERVAL_MS);
          return;
        }

        setLoading(false);
      } catch (caught) {
        if (cancelled) return;
        if (attempt + 1 < MAX_POLL_ATTEMPTS) {
          window.setTimeout(() => void pollSession(attempt + 1), POLL_INTERVAL_MS);
          return;
        }
        setError(caught instanceof Error ? caught.message : "Unable to verify payment.");
        setLoading(false);
      }
    }

    void pollSession(0);

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  useEffect(() => {
    if (!password) return;
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (savedWarning) return;
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [password, savedWarning]);

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

  function markCredentialsSaved() {
    setSavedWarning(true);
  }

  const credentialsBlock = password && email ? (
    <>
      <div className="alert alert-warning checkout-credentials-warning">
        <strong>Save these credentials now.</strong> For security, your shared password is shown
        only once and cannot be retrieved from this page after you leave.
        {credentialsEmailed ? (
          <>
            {" "}
            We also emailed them to <strong>{email}</strong>.
          </>
        ) : null}
      </div>
      <div className="checkout-credentials panel">
        <h2>Your login credentials</h2>
        <p className="checkout-copy">
          Your organization shares one password. Teammates with an authorized work email on the
          same domain can sign in with this password.
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
              <button
                className="button button-secondary button-small"
                type="button"
                onClick={() => void copyPassword()}
              >
                {copied ? "Copied" : "Copy password"}
              </button>
            </dd>
          </div>
        </dl>
        <div className="checkout-credentials__actions">
          <button
            className="button button-primary"
            type="button"
            onClick={markCredentialsSaved}
          >
            I saved my credentials
          </button>
          <a
            className="button button-secondary"
            href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("ShiftWorksHR login help")}&body=${encodeURIComponent(
              `Hi — I completed checkout but need help with login.\n\nSession: ${sessionId ?? ""}\nEmail: ${email}\n`,
            )}`}
          >
            Email support
          </a>
        </div>
      </div>
    </>
  ) : null;

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
              {loading ? (
                <>Setting up your account…</>
              ) : planName ? (
                <>
                  Your <strong>{planName}</strong> plan is confirmed.
                </>
              ) : (
                <>Your plan is confirmed.</>
              )}
            </p>

            {credentialsBlock}

            {!loading && !password ? (
              <p className="checkout-copy">
                {credentialsEmailed && email ? (
                  <>
                    Login details were emailed to <strong>{email}</strong>. Check spam if you
                    don&apos;t see it within a few minutes, or email{" "}
                    <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
                  </>
                ) : (
                  <>
                    Credentials are still provisioning. Wait a moment, refresh this page, or email{" "}
                    <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> with your checkout email.
                    We respond within one business day.
                  </>
                )}
              </p>
            ) : null}
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
