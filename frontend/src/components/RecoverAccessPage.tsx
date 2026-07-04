import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { recoverAccess } from "../api";
import { LegalLayout } from "./LegalLayout";

export function RecoverAccessPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      const response = await recoverAccess(email.trim());
      setMessage(response.message);
      setEmail("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to process your request.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <LegalLayout title="Recover access">
      <p>
        Enter the work email you use to sign in. If that email is authorized for your
        organization, we&apos;ll email your login details, including a new shared password.
      </p>

      <form className="recover-access-form" onSubmit={(event) => void handleSubmit(event)}>
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

        {error ? <div className="alert alert-error">{error}</div> : null}
        {message ? <div className="alert alert-success">{message}</div> : null}

        <button className="button button-primary" disabled={loading} type="submit">
          {loading ? "Sending..." : "Email my login details"}
        </button>
      </form>

      <p>
        <Link to="/#sign-in">Back to sign in</Link>
      </p>
    </LegalLayout>
  );
}
