import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { checkBillingStatus, type PlanId } from "../api";
import { BrandLogo } from "./BrandLogo";
import { CheckoutButton } from "./CheckoutButton";
import { ProductDemoShowcase } from "./ProductDemoShowcase";
import { LegalConsentLinks } from "./LegalConsentLinks";
import { LegalFooter } from "./LegalFooter";
import { MARKETING_DEMO_DATA } from "../data/marketingDemoData";
import { LoginForm } from "./LoginForm";

const CONTACT_EMAIL = "hello@shiftworkshr.com";

type LandingPageProps = {
  onLogin: (email: string, organization?: string) => void;
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
    title: "Demographic pay equity",
    copy: "Median pay by gender and race, with same-level breakdowns.",
  },
  {
    title: "Summary & export",
    copy: "Shareable insights plus Excel and PDF exports for comp cycles.",
  },
];

const AUDIENCES = [
  {
    title: "In-house HR & total rewards",
    copy: "Run a first-pass comp QA before merit meetings — without living in Excel for a week.",
  },
  {
    title: "Comp analysts & HRBPs",
    copy: "Validate exports from your HRIS, spot range and compression issues, and export summaries for leadership.",
  },
  {
    title: "HR & comp consultants",
    copy: "Speed up client deliverables with a focused analysis pass at $249 per cycle — not per employee row.",
  },
];

const TRUST_POINTS = [
  { stat: "< 30 sec", label: "Typical time to first insights" },
  { stat: "HR teams", label: "Built for comp spreadsheet QA" },
  { stat: "$249", label: "Cycle pass vs. $10k+ platforms" },
  { stat: "HR-built", label: "Designed by a comp practitioner" },
];

const SAMPLE_REVIEW = MARKETING_DEMO_DATA;

const STEPS = [
  {
    title: "Choose a plan",
    copy: "Pick monthly, annual, or a one-time Cycle Pass — login details appear instantly after checkout.",
  },
  {
    title: "Upload your file",
    copy: "Drop an Excel or CSV — columns are detected automatically.",
  },
  {
    title: "Add your team",
    copy: "Share the org password with authorized HR and comp teammates — each signs in with their own work email.",
  },
  {
    title: "Act on findings",
    copy: "Review flagged issues, budget impact, pay equity, and export reports.",
  },
];

const FAQ_BASE: Array<{ q: string; a: string }> = [
  {
    q: "What file format do I need?",
    a: "Excel (.xlsx) or CSV up to 25 MB. Include employee ID, salary, and range min/mid/max when possible. Gender and race columns unlock pay equity views.",
  },
  {
    q: "Is my compensation data stored?",
    a: "Uploads are processed in memory and not kept after analysis by default. If you click Save to history while signed in, that run is stored as JSON on our server for your account only (up to 25 saved runs, deletable anytime). See our Security page for details.",
  },
  {
    q: "How do teammates get access?",
    a: "One organization, one shared password. After purchase, each authorized person signs in with their work email and that password. Add teammates anytime from Team access in the analyzer.",
  },
  {
    q: "How is this different from a full comp platform?",
    a: "ShiftWorksHR complements the tools you already have — it’s built for the spreadsheet work every comp cycle still runs through. You get fast flags, budget impact, and leadership-ready exports without a long rollout or enterprise price tag. Many teams use it for merit season; others pair it with their HRIS or comp platform for a focused first-pass review.",
  },
];

function buildFaq(scrollTo: (id: string) => void): Array<{ q: string; a: ReactNode }> {
  return [
    ...FAQ_BASE.map((item) => ({ q: item.q, a: item.a as ReactNode })),
    {
      q: "Can I try it before buying?",
      a: (
        <>
          Yes.{" "}
          <button
            type="button"
            className="landing-text-link"
            onClick={() => scrollTo("see-it-in-action")}
          >
            View the sample analysis
          </button>{" "}
          on this page, or open the{" "}
          <Link to="/sample-preview">full-screen preview</Link> for tabs, filters, and exports —
          both use our demo comp file and do not require an account. To upload your own
          own spreadsheet, choose a plan (login is instant after checkout). Prefer a walkthrough
          first? Email{" "}
          <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Sample walkthrough request")}`}>
            {CONTACT_EMAIL}
          </a>
          .
        </>
      ),
    },
  ];
}

const PRICING_PLANS: Array<{
  id: PlanId;
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  mailSubject: string;
  featured: boolean;
}> = [
  {
    id: "cycle",
    name: "Cycle Pass",
    price: "$249",
    period: "one-time · 90 days",
    description: "One merit or annual review season.",
    features: [
      "90 days of unlimited uploads",
      "Full analysis + pay equity",
      "Excel & PDF exports",
      "Email support",
    ],
    cta: "Get cycle pass",
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
      "Full analysis + pay equity",
      "Excel & PDF exports",
      "Priority email support",
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
      "Unlimited uploads each month",
      "Full analysis + pay equity",
      "Excel & PDF exports",
      "Email support",
    ],
    cta: "Get monthly access",
    mailSubject: "ShiftWorksHR Monthly Plan",
    featured: false,
  },
];

export function LandingPage({ onLogin, showLogin, onTryDemo }: LandingPageProps) {
  const [availablePlans, setAvailablePlans] = useState<PlanId[]>([]);

  useEffect(() => {
    void checkBillingStatus().then(({ plans }) => {
      setAvailablePlans(plans);
    });
  }, []);

  function scrollTo(id: string) {
    const target = document.getElementById(id);
    if (!target) return;

    const nav = document.querySelector(".landing-nav");
    const navHeight = nav instanceof HTMLElement ? nav.offsetHeight : 72;
    const top = target.getBoundingClientRect().top + window.scrollY - navHeight - 16;

    window.scrollTo({ top: Math.max(top, 0), behavior: "smooth" });
  }

  const faqItems = buildFaq(scrollTo);

  return (
    <div className="landing-page">
      <header className="landing-nav">
        <div className="landing-nav-inner">
          <div className="landing-brand">
            <BrandLogo
              size="nav"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            />
            <div className="landing-brand-copy">
              <span className="landing-logo-text">
                ShiftWorks<span className="landing-logo-text-hr">HR</span>
              </span>
              <span className="landing-domain">shiftworkshr.com</span>
            </div>
          </div>
          <nav className="landing-links">
            <button type="button" onClick={() => scrollTo("see-it-in-action")}>
              Sample analysis
            </button>
            <button type="button" onClick={() => scrollTo("features")}>
              Features
            </button>
            <button type="button" onClick={() => scrollTo("who-its-for")}>
              Who it&apos;s for
            </button>
            <button type="button" onClick={() => scrollTo("faq")}>
              FAQ
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
          <BrandLogo size="hero" className="landing-hero-logo" />
          <span className="hero-badge">Compensation spreadsheet QA</span>
          <p className="hero-positioning">
            Built for HR and total rewards teams — upload Excel or CSV and get a
            first-pass comp analysis in under 30 seconds.
          </p>
          <h1>Find pay issues before leadership review.</h1>
          <p>
            ShiftWorksHR flags below-minimum pay, compression, manager inversions, and
            budget gaps — then exports leadership-ready summaries. Skip the week in Excel
            before your next comp cycle.
          </p>
          <div className="landing-hero-actions">
            <button
              className="button button-primary"
              type="button"
              onClick={() => scrollTo("pricing")}
            >
              Start analysis
            </button>
            {showLogin ? (
              <button
                className="button button-secondary"
                type="button"
                onClick={() => scrollTo("see-it-in-action")}
              >
                View sample analysis
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

      <section className="landing-trust-strip" aria-label="Why teams choose ShiftWorksHR">
        {TRUST_POINTS.map((point) => (
          <div className="landing-trust-item" key={point.label}>
            <span className="landing-trust-stat">{point.stat}</span>
            <span className="landing-trust-label">{point.label}</span>
          </div>
        ))}
      </section>

      <section className="landing-section landing-preview" id="see-it-in-action">
        <div className="landing-section-header landing-preview-header">
          <span className="hero-badge">Sample analysis</span>
          <h2>See what you get before you buy</h2>
          <p>
            Real output from our bundled sample file ({SAMPLE_REVIEW.summary.valid_rows}{" "}
            employees). Scroll the preview below or open the full analyzer for every tab and
            export.
          </p>
        </div>

        <div className="landing-preview-stats" aria-label="Sample analysis highlights">
          <article className="landing-preview-stat">
            <strong className="landing-preview-stat__value">
              {SAMPLE_REVIEW.summary.below_minimum}
            </strong>
            <span className="landing-preview-stat__label">Below range minimum</span>
            <span className="landing-preview-stat__meta">
              ${SAMPLE_REVIEW.insights.cost_metrics.total_gap_to_minimum.toLocaleString()} to floor
            </span>
          </article>
          <article className="landing-preview-stat">
            <strong className="landing-preview-stat__value">
              {SAMPLE_REVIEW.summary.compression_issues + SAMPLE_REVIEW.summary.managers_below_reports}
            </strong>
            <span className="landing-preview-stat__label">Structural issues</span>
            <span className="landing-preview-stat__meta">
              {SAMPLE_REVIEW.summary.compression_issues} compression ·{" "}
              {SAMPLE_REVIEW.summary.managers_below_reports} inversions
            </span>
          </article>
          <article className="landing-preview-stat">
            <strong className="landing-preview-stat__value">
              ${Math.round(SAMPLE_REVIEW.insights.budget_impact.total_budget_impact / 1000)}k
            </strong>
            <span className="landing-preview-stat__label">Budget exposure</span>
            <span className="landing-preview-stat__meta">Adjustments + projected merit pool</span>
          </article>
        </div>

        <figure
          className="product-demo-frame"
          aria-label="ShiftWorksHR sample analysis with overview, flagged issues, pay equity, and budget tabs"
        >
          <div className="product-demo-frame__scroll">
            <ProductDemoShowcase variant="embedded" />
          </div>
        </figure>

        <div className="landing-preview-actions">
          <Link className="button button-primary" to="/sample-preview">
            Open full sample analysis
          </Link>
          <button className="button button-secondary" type="button" onClick={() => scrollTo("pricing")}>
            See pricing
          </button>
        </div>
        <p className="landing-preview-note">
          Sample file only — not a customer case study. Upload your own export after purchase for
          the same analysis on your data.
        </p>
      </section>

      <section className="landing-section" id="features">
        <div className="landing-section-header">
          <h2>Built for comp review, not generic HR reporting</h2>
          <p>Every check is designed around real compensation cycle workflows.</p>
        </div>
        <div className="landing-feature-grid">
          {FEATURES.map((feature) => (
            <article className="landing-feature" key={feature.title}>
              <h3>{feature.title}</h3>
              <p>{feature.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section" id="who-its-for">
        <div className="landing-section-header">
          <h2>Who it&apos;s for</h2>
          <p>HR teams and consultants who need fast answers from a comp spreadsheet — not a six-month rollout.</p>
        </div>
        <div className="landing-audience-grid">
          {AUDIENCES.map((audience) => (
            <article className="landing-audience panel" key={audience.title}>
              <h3>{audience.title}</h3>
              <p>{audience.copy}</p>
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

      <section className="landing-section landing-lead-magnet">
        <div className="landing-lead-magnet-card panel">
          <div>
            <span className="hero-badge">Free resource</span>
            <h2>Merit season comp checklist</h2>
            <p>
              A printable prep list for exports, first-pass QA, pay equity review, and
              leadership readouts — use it with or without ShiftWorksHR.
            </p>
          </div>
          <Link className="button button-secondary" to="/checklist">
            Download checklist
          </Link>
        </div>
      </section>

      <section className="landing-section landing-steps">
        <div className="landing-section-header">
          <h2>How it works</h2>
          <p>From purchase to insights in four steps.</p>
        </div>
        <div className="landing-step-grid">
          {STEPS.map((step, index) => (
            <article className="landing-step panel" key={step.title}>
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
              <div className="landing-price-card__badge-row">
                {plan.featured ? (
                  <span className="landing-price-badge">Best value</span>
                ) : (
                  <span
                    className="landing-price-badge landing-price-badge--placeholder"
                    aria-hidden="true"
                  />
                )}
              </div>
              <h3 className="landing-price-card__title">{plan.name}</h3>
              <p className="landing-price-amount">{plan.price}</p>
              <p className="landing-price-period">{plan.period}</p>
              <p className="landing-price-description">{plan.description}</p>
              <ul className="landing-checklist landing-price-card__features">
                {plan.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              <div className="landing-price-card__grow" aria-hidden="true" />
              <div className="landing-price-card__cta">
                <CheckoutButton
                  planId={plan.id}
                  label={plan.cta}
                  variant={plan.featured ? "primary" : "secondary"}
                  checkoutEnabled={availablePlans.includes(plan.id)}
                  fallbackHref={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(plan.mailSubject)}`}
                />
              </div>
            </article>
          ))}
        </div>

        <div className="landing-pricing-footnote panel">
          <p>
            <strong>One organization, one shared password.</strong> Pricing is per organization
            (not per employee row). Teammates sign in with their own work email and the same
            password — add teammates anytime from <strong>Team access</strong> after you sign in.
            Payments are processed securely by Stripe and are non-refundable once
            access credentials are delivered (see Terms). Uploads are processed in memory by default.
            Optional Save to history stores a JSON snapshot for your account only.
          </p>
        </div>
      </section>

      <section className="landing-section landing-faq" id="faq">
        <div className="landing-section-header">
          <h2>Frequently asked questions</h2>
        </div>
        <div className="landing-faq-list">
          {faqItems.map((item) => (
            <details className="landing-faq-item panel" key={item.q}>
              <summary>{item.q}</summary>
              <div className="landing-faq-answer">{item.a}</div>
            </details>
          ))}
        </div>
      </section>

      {showLogin ? (
        <section className="landing-section landing-sign-in" id="sign-in">
          <div className="landing-sign-in-card panel">
            <div className="landing-sign-in-copy">
              <span className="hero-badge">Customer sign in</span>
              <h2>Already a customer?</h2>
              <p>
                Sign in with your work email and your organization&apos;s shared password.
                Login details appear on the confirmation page right after checkout — share
                them with authorized HR and comp teammates.
              </p>
            </div>
            <div className="landing-sign-in-form">
              <LoginForm onLogin={onLogin} compact />
              <p className="legal-agreement">
                By signing in, you agree to our <LegalConsentLinks />.
              </p>
            </div>
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
            {" · "}
            <Link to="/checklist">Merit checklist</Link>
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
