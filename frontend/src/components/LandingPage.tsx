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
    title: "Pay equity by gender & race",
    copy: "Median pay comparisons by demographic group, with same-level breakdowns.",
  },
  {
    title: "Excel & PDF export",
    copy: "Download results for comp cycles and stakeholder meetings.",
  },
];

const STEPS = [
  {
    title: "Choose a plan",
    copy: "Pick monthly, annual, or a one-time comp cycle pass — we send your login within one business day.",
  },
  {
    title: "Upload your file",
    copy: "Drop an Excel or CSV — columns are detected automatically.",
  },
  {
    title: "Act on findings",
    copy: "Review flagged issues, budget impact, pay equity, and export reports.",
  },
];

const PRICING_PLANS = [
  {
    id: "cycle",
    name: "Comp Cycle Pass",
    price: "$249",
    period: "one-time · 90 days",
    description: "Best for a single merit or annual review season.",
    features: [
      "Unlimited uploads for 90 days",
      "Full analysis + pay equity views",
      "Excel & PDF exports",
      "Email support",
    ],
    cta: "Get comp cycle pass",
    mailSubject: "ShiftWorksHR Comp Cycle Pass",
    featured: false,
  },
  {
    id: "annual",
    name: "Annual",
    price: "$899",
    period: "per year",
    description: "Best value — about $75/month, billed annually.",
    features: [
      "Unlimited uploads all year",
      "All features included",
      "Priority email support",
      "Great for ongoing comp work",
    ],
    cta: "Get annual access",
    mailSubject: "ShiftWorksHR Annual Plan",
    featured: true,
  },
  {
    id: "monthly",
    name: "Monthly",
    price: "$99",
    period: "per month",
    description: "Flexible month-to-month access. Cancel anytime.",
    features: [
      "Unlimited uploads",
      "All features included",
      "Email support",
      "No long-term contract",
    ],
    cta: "Get monthly access",
    mailSubject: "ShiftWorksHR Monthly Plan",
    featured: false,
  },
];

export function LandingPage({ onLogin, showLogin, onTryDemo }: LandingPageProps) {
  function scrollTo(id: string) {
    const target = document.getElementById(id);
    if (!target) return;

    const nav = document.querySelector(".landing-nav");
    const navHeight = nav instanceof HTMLElement ? nav.offsetHeight : 72;
    const top = target.getBoundingClientRect().top + window.scrollY - navHeight - 16;

    window.scrollTo({ top: Math.max(top, 0), behavior: "smooth" });
  }

  return (
    <div className="landing-page">
      <header className="landing-nav">
        <div className="landing-nav-inner">
          <div className="landing-brand">
            <button
              className="landing-logo"
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            >
              ShiftWorksHR
            </button>
            <span className="landing-domain">shiftworkshr.com</span>
          </div>
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
            ShiftWorksHR helps HR teams spot out-of-range pay, compression, manager
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
            <li>Gender & race pay equity views</li>
          </ul>
        </div>
      </section>

      <section className="landing-section landing-preview" id="see-it-in-action">
        <div className="landing-section-header landing-preview-header">
          <span className="hero-badge">See it in action</span>
          <h2>Real output from a 20-employee comp file</h2>
          <p>
            Upload your spreadsheet and get an executive summary, budget impact, compa-ratio
            trends, and pay equity signals — in seconds, not weeks.
          </p>
        </div>
        <figure className="landing-preview-frame panel">
          <img
            src="/sample-output.png"
            alt="ShiftWorksHR analysis results showing executive summary, budget impact calculators, and flagged compensation issues"
            width={1280}
            height={900}
            loading="lazy"
          />
          <figcaption className="landing-preview-caption">
            Sample analysis from our demo compensation file — executive summary, cost to
            minimum, merit pool, and compa-ratio at a glance.
          </figcaption>
        </figure>
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
            ShiftWorksHR was built by an HR professional with hands-on experience in
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

      <section className="landing-section landing-pricing-section" id="pricing">
        <div className="landing-section-header">
          <span className="hero-badge">Introductory pricing</span>
          <h2>Enterprise comp analysis without the enterprise price tag</h2>
          <p>
            ShiftWorksHR is new — you may not have heard of us yet. Big comp platforms
            often cost $10,000+ per year or require consultants at $5,000–$15,000 per
            cycle. We built a focused tool for HR teams who need fast, practical answers
            at a fraction of that cost.
          </p>
        </div>

        <div className="landing-pricing-grid">
          {PRICING_PLANS.map((plan) => (
            <article
              className={`landing-price-card panel ${plan.featured ? "featured" : ""}`}
              key={plan.id}
            >
              {plan.featured ? <span className="landing-price-badge">Best value</span> : null}
              <h3>{plan.name}</h3>
              <p className="landing-price-amount">{plan.price}</p>
              <p className="landing-price-period">{plan.period}</p>
              <p className="landing-price-description">{plan.description}</p>
              <ul className="landing-checklist">
                {plan.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              <a
                className={`button ${plan.featured ? "button-primary" : "button-secondary"} landing-price-button`}
                href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(plan.mailSubject)}`}
              >
                {plan.cta}
              </a>
            </article>
          ))}
        </div>

        <div className="landing-pricing-footnote panel">
          <p>
            <strong>One company, one secure login.</strong> Pricing is per organization
            (not per employee row). Your compensation data is processed in memory and
            not stored on our servers after analysis. Questions? Email{" "}
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
          </p>
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
          <p className="landing-footer-brand">ShiftWorksHR</p>
          <p className="landing-footer-domain">shiftworkshr.com</p>
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
