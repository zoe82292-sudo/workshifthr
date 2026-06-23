import { LoginForm } from "./LoginForm";
import { LegalFooter } from "./LegalFooter";

const CONTACT_EMAIL = "hello@shiftworkshr.com";

type LandingPageProps = {
  onLogin: (email: string) => void;
  showLogin: boolean;
  onTryDemo?: () => void;
};

const FEATURES = [
  {
    title: "Out-of-range pay",
    copy: "Flag employees below minimum or above maximum in seconds.",
  },
  {
    title: "Range penetration",
    copy: "See where each employee sits in their salary band.",
  },
  {
    title: "Pay equity signals",
    copy: "Catch compression, manager inversions, and duplicate IDs.",
  },
  {
    title: "Budget impact",
    copy: "Estimate cost to minimum, merit pool, and compa-ratio trends.",
  },
  {
    title: "Executive summary",
    copy: "Shareable insights for HR and leadership review.",
  },
  {
    title: "Excel & PDF export",
    copy: "Download results for comp cycles and stakeholder meetings.",
  },
];

const STEPS = [
  {
    title: "Request access",
    copy: "We set up a secure login for your team after purchase.",
  },
  {
    title: "Upload your file",
    copy: "Drop an Excel or CSV — columns are detected automatically.",
  },
  {
    title: "Act on findings",
    copy: "Review flagged issues, budget impact, and export reports.",
  },
];

export function LandingPage({ onLogin, showLogin, onTryDemo }: LandingPageProps) {
  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <div className="landing-page">
      <header className="landing-nav">
        <div className="landing-nav-inner">
          <span className="landing-logo">WorkShiftHR</span>
          <nav className="landing-links">
            <button type="button" onClick={() => scrollTo("features")}>
              Features
            </button>
            <button type="button" onClick={() => scrollTo("pricing")}>
              Pricing
            </button>
            {showLogin ? (
              <button type="button" onClick={() => scrollTo("sign-in")}>
                Sign in
              </button>
            ) : null}
          </nav>
        </div>
      </header>

      <section className="landing-hero">
        <div className="landing-hero-copy">
          <span className="hero-badge">Compensation intelligence</span>
          <p className="hero-positioning">
            Upload your compensation spreadsheet and get an instant comp review in under
            30 seconds.
          </p>
          <h1>Find pay equity issues before review season.</h1>
          <p>
            WorkShiftHR helps HR teams spot out-of-range pay, compression, manager
            inversions, and budget gaps — without weeks of manual spreadsheet review.
          </p>
          <div className="landing-hero-actions">
            <button
              className="button button-primary"
              type="button"
              onClick={() => scrollTo("pricing")}
            >
              Get access
            </button>
            {showLogin ? (
              <button
                className="button button-secondary"
                type="button"
                onClick={() => scrollTo("sign-in")}
              >
                Existing customer sign in
              </button>
            ) : onTryDemo ? (
              <button className="button button-secondary" type="button" onClick={onTryDemo}>
                Try the analyzer
              </button>
            ) : null}
          </div>
        </div>

        <div className="landing-hero-card panel">
          <h2>What you get on every upload</h2>
          <ul className="landing-checklist">
            <li>Below / above range flags</li>
            <li>Range penetration & compa-ratio</li>
            <li>Salary compression analysis</li>
            <li>Manager vs. report pay checks</li>
            <li>Executive summary + exports</li>
          </ul>
        </div>
      </section>

      <section className="landing-section" id="features">
        <div className="landing-section-header">
          <h2>Built for comp review, not generic HR reporting</h2>
          <p>Every check is designed around real compensation cycle workflows.</p>
        </div>
        <div className="landing-feature-grid">
          {FEATURES.map((feature) => (
            <article className="landing-feature panel" key={feature.title}>
              <h3>{feature.title}</h3>
              <p>{feature.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section landing-about" id="about">
        <div className="landing-about-card panel">
          <span className="hero-badge">Built by an HR practitioner</span>
          <h2>Designed by someone who has done the comp work</h2>
          <p>
            WorkShiftHR was built by an HR professional with hands-on experience in
            compensation — range reviews, pay equity analysis, merit planning, and
            the spreadsheet-heavy work that comes with every comp cycle.
          </p>
          <p>
            This tool reflects what compensation teams actually need: fast flags,
            clear budget impact, and exports you can share with leadership — not
            another generic HR dashboard.
          </p>
        </div>
      </section>

      <section className="landing-section landing-steps">
        <div className="landing-section-header">
          <h2>How it works</h2>
          <p>From purchase to insights in three steps.</p>
        </div>
        <div className="landing-step-grid">
          {STEPS.map((step, index) => (
            <article className="landing-step" key={step.title}>
              <span className="landing-step-number">{index + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section" id="pricing">
        <div className="landing-pricing panel">
          <div className="landing-pricing-copy">
            <span className="hero-badge">Simple access</span>
            <h2>One company. One secure login. Instant comp review.</h2>
            <p>
              WorkShiftHR is sold as company access — we create your login after
              purchase. No self-serve signup required. Your compensation data stays
              private and is not stored on our servers after analysis.
            </p>
            <ul className="landing-checklist">
              <li>Unlimited uploads for your organization</li>
              <li>Excel and PDF report downloads</li>
              <li>Secure, password-protected access</li>
              <li>Onboarding support included</li>
            </ul>
          </div>
          <div className="landing-pricing-cta">
            <p className="landing-price-label">Company access</p>
            <p className="landing-price-note">
              Contact us for current pricing and to set up your account.
            </p>
            <a className="button button-primary" href={`mailto:${CONTACT_EMAIL}`}>
              Request access
            </a>
            <p className="landing-contact">
              Email{" "}
              <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            </p>
          </div>
        </div>
      </section>

      {showLogin ? (
        <section className="landing-section landing-sign-in" id="sign-in">
          <div className="landing-sign-in-card panel">
            <div className="landing-sign-in-copy">
              <h2>Already a customer?</h2>
              <p>
                Sign in with the email and password we sent you after purchase to
                open the compensation analyzer.
              </p>
            </div>
            <LoginForm onLogin={onLogin} compact />
            <p className="legal-agreement">
              By signing in, you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>
        </section>
      ) : null}

      <footer className="landing-footer">
        <div className="landing-footer-copy">
          <p className="landing-footer-brand">WorkShiftHR</p>
          <p>Compensation analysis for HR teams — built by an HR professional.</p>
          <p className="landing-footer-contact">
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
          </p>
          <LegalFooter />
        </div>
        {showLogin ? (
          <button className="landing-footer-link" type="button" onClick={() => scrollTo("sign-in")}>
            Customer sign in
          </button>
        ) : null}
      </footer>
    </div>
  );
}
