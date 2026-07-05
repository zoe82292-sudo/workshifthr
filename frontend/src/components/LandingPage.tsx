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
  trialAvailable?: boolean;
  trialMaxRows?: number;
  onTryTrial?: () => void;
  onTryDemo?: () => void;
};

const SOCIAL_PROOF = {
  stat: "15+",
  statLabel: "merit cycles reviewed in beta",
  quotes: [
    {
      quote:
        "We used to burn two days building comp QA formulas before every leadership readout. ShiftWorksHR got us to a first-pass review in under an hour.",
      role: "Comp analyst",
      context: "Mid-size technology company",
    },
    {
      quote:
        "The review queue alone paid for the cycle pass — it told us exactly which employees to look at first before merit committee.",
      role: "Total rewards manager",
      context: "Professional services firm (~400 employees)",
    },
    {
      quote:
        "I run this on client exports before deliverables. The Excel and PDF exports are presentation-ready without extra formatting.",
      role: "Independent comp consultant",
      context: "Multiple client engagements",
    },
  ],
};

const FEATURES = [
  {
    title: "HRIS export upload",
    copy: "Export from Workday, UKG, or ADP and upload as-is — columns are auto-detected from headers or data patterns. No API connection or template required.",
  },
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
    title: "Multi-file merge",
    copy: "Upload multiple files — merged on Employee ID when salary, ranges, and merit live in separate exports.",
  },
  {
    title: "Tenure, location & equity grants",
    copy: "Review pay by tenure band, compare median pay across offices, and flag outlier LTI grant values.",
  },
  {
    title: "Summary & export",
    copy: "Shareable insights plus Excel and PDF exports for comp cycles.",
  },
];

const AUDIENCES = [
  {
    title: "In-house HR & total rewards",
    copy: "Run a first-pass comp QA before merit meetings — spot range and compression issues without rebuilding formulas every cycle.",
  },
  {
    title: "Comp analysts & HRBPs",
    copy: "Upload your HRIS or comp spreadsheet export — one file or several merged on Employee ID — then export summaries for leadership.",
  },
  {
    title: "HR & comp consultants",
    copy: "Speed up client deliverables with a focused analysis pass at $249 per cycle — not per employee row.",
  },
];

const TRUST_POINTS = [
  { stat: "< 30 sec", label: "Typical time to first insights" },
  { stat: "15+", label: "Merit cycles in beta" },
  { stat: "$249", label: "Cycle pass vs. $10k+ platforms" },
  { stat: "Same day", label: "Export from HRIS and analyze" },
];

const SAMPLE_REVIEW = MARKETING_DEMO_DATA;

function buildSteps(trialMaxRows: number) {
  return [
    {
      title: "Try or purchase",
      copy: `Upload up to ${trialMaxRows.toLocaleString()} rows free (one analyze per day), or pick monthly, annual, or a one-time Cycle Pass — login details appear instantly after checkout.`,
    },
    {
      title: "Upload your file",
      copy: "Drop one or more Excel or CSV files — columns are detected automatically and merged on Employee ID.",
    },
    {
      title: "Add your team",
      copy: "Share the org password with authorized HR and comp teammates — each signs in with their own work email.",
    },
    {
      title: "Act on findings",
      copy: "Review flagged issues, budget impact, pay equity, tenure, location pay, equity grants, and export reports.",
    },
  ];
}

function buildFaqBase(trialMaxRows: number): Array<{ q: string; a: string }> {
  return [
    {
      q: "Can I try it on my own file before paying?",
      a: `Yes — use Try free with your file on the homepage. Upload one Excel or CSV (up to ${trialMaxRows.toLocaleString()} rows, one analyze per day), run the full analysis, and export watermarked PDF/Excel reports. Employee names are blurred in the trial UI. Purchase a plan for unlimited rows, multi-file merge, team access, full names, and unwatermarked exports.`,
    },
  {
    q: "Do you connect to Workday or other HRIS systems?",
    a: "Not today — ShiftWorksHR works with spreadsheet exports you download from your HRIS or comp tool. Export to Excel or CSV, upload as-is, and columns are detected automatically. No API integration or IT project required.",
  },
  {
    q: "Can I upload more than one file?",
    a: "Yes — up to 5 files per analysis. Map Employee ID on each file, then ShiftWorksHR merges rows by ID. Salary can live in one export, ranges in another, and merit or hire date in a third — useful when HRIS data is split across downloads.",
  },
  {
    q: "What file format do I need?",
    a: "Excel (.xlsx) or CSV up to 25 MB — upload your HRIS or comp export as-is; no template required. Columns are detected automatically from headers or data patterns. Gender and race unlock pay equity; hire date and location unlock tenure and location pay; merit and bonus columns unlock budget and compa projections.",
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
}

function buildFaq(scrollTo: (id: string) => void, trialMaxRows: number): Array<{ q: string; a: ReactNode }> {
  return [
    ...buildFaqBase(trialMaxRows).map((item) => ({ q: item.q, a: item.a as ReactNode })),
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
      "Full analysis + pay equity, tenure, location & LTI",
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
      "Full analysis + pay equity, tenure, location & LTI",
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
      "Full analysis + pay equity, tenure, location & LTI",
      "Excel & PDF exports",
      "Email support",
    ],
    cta: "Get monthly access",
    mailSubject: "ShiftWorksHR Monthly Plan",
    featured: false,
  },
];

export function LandingPage({
  onLogin,
  showLogin,
  trialAvailable = false,
  trialMaxRows = 250,
  onTryTrial,
  onTryDemo,
}: LandingPageProps) {
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

  const faqItems = buildFaq(scrollTo, trialMaxRows);
  const steps = buildSteps(trialMaxRows);

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
            Built for HR and total rewards teams — upload one file or several merged on
            Employee ID for a first-pass comp analysis.
          </p>
          <h1>Find pay issues before leadership review.</h1>
          <p>
            ShiftWorksHR flags below-minimum pay, compression, manager inversions, and
            budget gaps — then exports leadership-ready summaries your team can act on.
          </p>
          <div className="landing-hero-actions">
            {trialAvailable && onTryTrial ? (
              <button className="button button-primary" type="button" onClick={onTryTrial}>
                Try free with your file
              </button>
            ) : (
              <button
                className="button button-primary"
                type="button"
                onClick={() => scrollTo("pricing")}
              >
                Start analysis
              </button>
            )}
            <button
              className="button button-secondary"
              type="button"
              onClick={() => scrollTo("see-it-in-action")}
            >
              View sample analysis
            </button>
            {showLogin ? (
              <button
                className="button button-secondary"
                type="button"
                onClick={() => scrollTo("pricing")}
              >
                See pricing
              </button>
            ) : onTryDemo ? (
              <button className="button button-secondary" type="button" onClick={onTryDemo}>
                Try the analyzer
              </button>
            ) : null}
          </div>
          {trialAvailable ? (
            <p className="landing-hero-trial-note">
              Free trial: one file, up to {trialMaxRows.toLocaleString()} rows, one analyze per day —
              no credit card. Names are blurred in the UI; exports include a trial watermark until
              you purchase.
            </p>
          ) : null}
        </div>

        <div className="landing-hero-card panel">
          <h2>What you get on every upload</h2>
          <ul className="landing-checklist">
            <li>Below / above range flags</li>
            <li>Range penetration & compa-ratio</li>
            <li>Salary compression analysis</li>
            <li>Manager vs. report pay checks</li>
            <li>Overview + PDF &amp; Excel exports</li>
            <li>Gender & race pay equity views</li>
            <li>Multi-file upload merged on Employee ID</li>
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
          {trialAvailable && onTryTrial ? (
            <button className="button button-secondary" type="button" onClick={onTryTrial}>
              Try with your file
            </button>
          ) : (
            <button className="button button-secondary" type="button" onClick={() => scrollTo("pricing")}>
              See pricing
            </button>
          )}
        </div>
        <p className="landing-preview-note">
          Sample file for illustration. {trialAvailable ? "Use Try free with your file" : "Upload your own export after purchase"}{" "}
          to confirm column mapping on your HRIS export.
        </p>
      </section>

      <section className="landing-section landing-social-proof" id="social-proof">
        <div className="landing-section-header">
          <span className="hero-badge">Early customers</span>
          <h2>Trusted during merit season beta</h2>
          <p>
            Used in <strong>{SOCIAL_PROOF.stat}</strong> {SOCIAL_PROOF.statLabel}. Feedback from
            comp practitioners who ran real cycle prep — roles only, not endorsements.
          </p>
        </div>
        <div className="landing-testimonial-grid">
          {SOCIAL_PROOF.quotes.map((item) => (
            <blockquote className="landing-testimonial panel" key={item.role}>
              <p>&ldquo;{item.quote}&rdquo;</p>
              <footer>
                <strong>{item.role}</strong>
                <span>{item.context}</span>
              </footer>
            </blockquote>
          ))}
        </div>
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
          <span className="hero-badge">Built by a comp analyst</span>
          <h2>The tool I wished I had every merit season</h2>
          <p>
            I&apos;m a compensation analyst. Before every merit cycle, I used to spend days
            in Excel — range checks, compression flags, manager inversions — before I could
            walk into leadership with confidence. ShiftWorksHR runs that first pass in under
            30 seconds.
          </p>
          <p>
            Same rigor I applied by hand, without the formula archaeology — flags, budget
            impact, and exports ready for the room where decisions get made.
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
          {steps.map((step, index) => (
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
            Big comp platforms often cost $10,000+ per year or require consultants at $5,000–$15,000
            per cycle. ShiftWorksHR is a focused spreadsheet QA tool for HR teams who need fast,
            practical answers — try up to {trialMaxRows.toLocaleString()} rows free, then upgrade
            when you&apos;re ready.
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
          <p>Compensation spreadsheet QA for HR and total rewards teams.</p>
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
