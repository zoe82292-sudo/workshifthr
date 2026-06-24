import { useState, type FormEvent } from "react";
import { login } from "../api";
import { storeSession } from "../auth";
import { LegalConsentLinks } from "./LegalConsentLinks";

type LoginFormProps = {
  onLogin: (email: string, organization?: string) => void;
  compact?: boolean;
};

export function LoginForm({ onLogin, compact = false }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!acceptedTerms) {
      setError("Please confirm that you agree to the Terms of Service and Privacy Policy.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const session = await login(email.trim(), password);
      storeSession(session.token, session.email, session.organization);
      onLogin(session.email, session.organization);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      className={compact ? "login-form login-form-compact" : "login-form"}
      onSubmit={(event) => void handleSubmit(event)}
    >
      <p className="login-shared-note">
        Your organization shares one password. Each teammate can sign in with their own work
        email and that shared password.
      </p>

      <label className="field">
        <span>Work email</span>
        <input
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@company.com"
        />
      </label>

      <label className="field">
        <span>Organization password</span>
        <input
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Shared team password"
        />
      </label>

      <label className="legal-consent-checkbox">
        <input
          type="checkbox"
          checked={acceptedTerms}
          onChange={(event) => setAcceptedTerms(event.target.checked)}
        />
        <span>
          I agree to the <LegalConsentLinks />.
        </span>
      </label>

      {error ? <div className="alert alert-error">{error}</div> : null}

      <button
        className="button button-primary login-button"
        disabled={loading || !acceptedTerms}
        type="submit"
      >
        {loading ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
