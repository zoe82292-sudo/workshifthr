import { useState, type FormEvent } from "react";
import { login } from "../api";
import { storeSession } from "../auth";

type LoginPageProps = {
  onLogin: (email: string) => void;
};

export function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const session = await login(email.trim(), password);
      storeSession(session.token, session.email);
      onLogin(session.email);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-shell">
      <section className="login-card panel">
        <span className="hero-badge">WorkShiftHR</span>
        <h1>Sign in to continue</h1>
        <p className="login-copy">
          Enter your email and password to access the compensation analyzer.
        </p>

        <form className="login-form" onSubmit={(event) => void handleSubmit(event)}>
          <label className="field">
            <span>Email</span>
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
            <span>Password</span>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Your password"
            />
          </label>

          {error ? <div className="alert alert-error">{error}</div> : null}

          <button className="button button-primary login-button" disabled={loading} type="submit">
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </section>
    </div>
  );
}
