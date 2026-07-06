import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { checkBillingStatus, type PlanId } from "../api";
import { trackEvent } from "../analytics";
import { useIsMobile } from "../useMediaQuery";
import { BrandLogo } from "./BrandLogo";
import { CheckoutButton } from "./CheckoutButton";
import { LandingSamplePreview } from "./SampleAnalysisEmbed";
import { LegalConsentLinks } from "./LegalConsentLinks";
import { LegalFooter } from "./LegalFooter";
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

type LandingTab = "sample" | "product" | "pricing" | "faq";

const TRUST_POINTS = [
  { stat: "< 30 sec", label: "To first insights" },
  { stat: "$249", label: "Per merit cycle" },
  { stat: "No API", label: "HRIS export upload" },
  { stat: "PDF + Excel", label: "Leadership exports" },
];

const FEATURES = [
  "Below / above range flags",
  "Compression & manager inversions",
  "Range penetration & compa-ratio",
  "Pay equity by level",
  "Budget & merit impact",
  "Multi-file merge on Employee ID",
  "Tenure, location & LTI checks",
  "Cycle history & comparison",
];

const FAQ_ITEMS = (trialMaxRows: number) => [
  {
    q: "Free trial?",
    a: `One file, ${trialMaxRows.toLocaleString()} rows, one analyze/day. Names blurred; exports watermarked until purchase.`,
  },
  {
    q: "Workday / UKG / ADP integration?",
    a: "No API — upload Excel or CSV exports as-is. Columns auto-detect.",
  },
  {
    q: "Multiple files?",
    a: "Up to 5 files merged on Employee ID (paid plans).",
  },
  {
    q: "Data stored?",
    a: "Processed in memory by default. Optional save-to-history for your account only.",
  },
  {
    q: "Team access?",
    a: "One org password; teammates sign in with work email.",
  },
  {
    q: "Consultants?",
    a: (
      <>
        Cycle Pass per client — see <Link to="/for-consultants">consultant guide</Link>.
      </>
    ),
  },
  {
    q: "Invoices?",
    a: `Email ${CONTACT_EMAIL} for procurement.`,
  },
];

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
    period: "90 days",
    description: "One merit season.",
    features: ["Unlimited uploads", "Full analysis & exports", "Email support"],
    cta: "Get cycle pass",
    mailSubject: "ShiftWorksHR Comp Cycle Pass",
    featured: false,
  },
  {
    id: "annual",
    name: "Annual",
    price: "$899",
    period: "per year",
    description: "Best value.",
    features: ["Unlimited uploads", "Full analysis & exports", "Priority support"],
    cta: "Get annual",
    mailSubject: "ShiftWorksHR Annual Plan",
    featured: true,
  },
  {
    id: "monthly",
    name: "Monthly",
    price: "$99",
    period: "per month",
    description: "Cancel anytime.",
    features: ["Unlimited uploads", "Full analysis & exports", "Email support"],
    cta: "Get monthly",
    mailSubject: "ShiftWorksHR Monthly Plan",
    featured: false,
  },
];

function defaultLandingTab(): LandingTab {
  if (typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches) {
    return "product";
  }
  return "sample";
}

export function LandingPage({
  onLogin,
  showLogin,
  trialAvailable = false,
  trialMaxRows = 250,
  onTryTrial,
  onTryDemo,
}: LandingPageProps) {
  const [availablePlans, setAvailablePlans] = useState<PlanId[]>([]);
  const [activeTab, setActiveTab] = useState<LandingTab>(defaultLandingTab);
  const isMobile = useIsMobile();

  useEffect(() => {
    void checkBillingStatus().then(({ plans }) => {
      setAvailablePlans(plans);
    });
  }, []);

  function selectTab(tab: LandingTab) {
    setActiveTab(tab);
    trackEvent("landing_tab", { tab });
    document.getElementById("landing-tabs")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function tryTrial(source: string) {
    trackEvent("landing_cta", { action: "try_trial", location: source });
    onTryTrial?.();
  }

  const faqItems = FAQ_ITEMS(trialMaxRows);

  return (
    <div className="landing-page">
      <header className="landing-nav">
        <div className="landing-nav-inner">
          <div className="landing-brand">
            <BrandLogo
              size="nav"
              layout="lockup"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            />
          </div>
          {showLogin ? (
            <button
              type="button"
              className="landing-sign-in-btn"
              onClick={() => document.getElementById("sign-in")?.scrollIntoView({ behavior: "smooth" })}
            >
              Sign in
            </button>
          ) : null}
        </div>
      </header>

      <section className="landing-hero landing-hero--compact">
        <div className="landing-hero-copy">
          <span className="hero-badge">Comp spreadsheet QA</span>
          <h1>Find pay issues before leadership review.</h1>
          <p className="landing-hero-lead">
            Upload your HRIS export. Get range flags, compression checks, and a leadership PDF — in under a minute.
          </p>
          <div className="landing-hero-actions">
            {trialAvailable && onTryTrial ? (
              <button className="button button-primary" type="button" onClick={() => tryTrial("hero")}>
                Try free with your file
              </button>
            ) : (
              <button className="button button-primary" type="button" onClick={() => selectTab("pricing")}>
                See pricing
              </button>
            )}
            <button className="button button-secondary" type="button" onClick={() => selectTab("sample")}>
              View sample
            </button>
            {!showLogin && onTryDemo ? (
              <button className="button button-secondary" type="button" onClick={onTryDemo}>
                Try analyzer
              </button>
            ) : null}
          </div>
          {trialAvailable ? (
            <p className="landing-hero-trial-note">
              Trial: 1 file, {trialMaxRows.toLocaleString()} rows/day — no card required.
            </p>
          ) : null}
          <div className="landing-hero-stats" aria-label="Highlights">
            {TRUST_POINTS.map((point) => (
              <div className="landing-hero-stat" key={point.label}>
                <strong>{point.stat}</strong>
                <span>{point.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-tabs-section" id="landing-tabs">
        <div className="landing-tabs-card panel">
        <div className="landing-tab-bar" role="tablist" aria-label="Learn more">
          {(
            [
              ["sample", "Sample"],
              ["product", "Product"],
              ["pricing", "Pricing"],
              ["faq", "FAQ"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              id={`tab-${id}`}
              aria-selected={activeTab === id}
              aria-controls={`panel-${id}`}
              className={`landing-tab ${activeTab === id ? "landing-tab--active" : ""}`}
              onClick={() => selectTab(id)}
            >
              {label}
            </button>
          ))}
        </div>

        {activeTab === "sample" ? (
          <div className="landing-tab-panel" role="tabpanel" id="panel-sample" aria-labelledby="tab-sample">
            <p className="landing-tab-intro">Live demo — same dashboard you get after upload.</p>
            <LandingSamplePreview />
            {!isMobile ? (
              <div className="landing-preview-actions">
                <Link className="button button-primary" to="/sample-preview">
                  Full screen sample
                </Link>
                {trialAvailable && onTryTrial ? (
                  <button className="button button-secondary" type="button" onClick={() => tryTrial("sample_tab")}>
                    Try your file
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        {activeTab === "product" ? (
          <div className="landing-tab-panel" role="tabpanel" id="panel-product" aria-labelledby="tab-product">
            <p className="landing-tab-intro">
              For in-house comp teams, HRBPs, and consultants — export from Workday, UKG, or ADP and upload as-is.
            </p>
            <ul className="landing-feature-compact">
              {FEATURES.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
            <ol className="landing-steps-compact">
              <li>Upload Excel/CSV (columns auto-detect)</li>
              <li>Review prioritized queue</li>
              <li>Export PDF or Excel for leadership</li>
              <li>Re-upload after merit — compare cycles</li>
            </ol>
            <div className="landing-resource-links">
              <Link to="/checklist">Merit checklist</Link>
              <Link to="/guides/workday-comp-export-qa">Export QA guide</Link>
              <Link to="/for-consultants">For consultants</Link>
            </div>
          </div>
        ) : null}

        {activeTab === "pricing" ? (
          <div className="landing-tab-panel" role="tabpanel" id="panel-pricing" aria-labelledby="tab-pricing">
            <p className="landing-tab-intro">
              Focused comp QA — not a $10k platform. Per organization, not per row.
            </p>
            <div className="landing-pricing-grid">
              {PRICING_PLANS.map((plan) => (
                <article
                  className={`landing-price-card panel ${plan.featured ? "featured" : ""}`}
                  key={plan.id}
                >
                  {plan.featured ? <span className="landing-price-badge">Best value</span> : null}
                  <h3 className="landing-price-card__title">{plan.name}</h3>
                  <p className="landing-price-amount">{plan.price}</p>
                  <p className="landing-price-period">{plan.period}</p>
                  <p className="landing-price-description">{plan.description}</p>
                  <ul className="landing-checklist landing-price-card__features">
                    {plan.features.map((feature) => (
                      <li key={feature}>{feature}</li>
                    ))}
                  </ul>
                  <CheckoutButton
                    planId={plan.id}
                    label={plan.cta}
                    variant={plan.featured ? "primary" : "secondary"}
                    checkoutEnabled={availablePlans.includes(plan.id)}
                    fallbackHref={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(plan.mailSubject)}`}
                  />
                </article>
              ))}
            </div>
            <p className="landing-pricing-note">
              One org password · teammates use work email · Stripe checkout ·{" "}
              <Link to="/terms">terms</Link>
            </p>
          </div>
        ) : null}

        {activeTab === "faq" ? (
          <div className="landing-tab-panel" role="tabpanel" id="panel-faq" aria-labelledby="tab-faq">
            <div className="landing-faq-list">
              {faqItems.map((item) => (
                <details className="landing-faq-item panel" key={item.q}>
                  <summary>{item.q}</summary>
                  <div className="landing-faq-answer">{item.a}</div>
                </details>
              ))}
            </div>
            <p className="landing-tab-intro">
              More detail: <Link to="/sample-preview">sample analysis</Link>
              {" · "}
              <Link to="/security">security</Link>
              {" · "}
              <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            </p>
          </div>
        ) : null}
        </div>
      </section>

      {showLogin ? (
        <section className="landing-section landing-sign-in" id="sign-in">
          <div className="landing-sign-in-card panel">
            <h2>Sign in</h2>
            <p className="landing-sign-in-blurb">Work email + your org password.</p>
            <LoginForm onLogin={onLogin} compact />
            <p className="legal-agreement">
              By signing in, you agree to our <LegalConsentLinks />.
            </p>
          </div>
        </section>
      ) : null}

      <footer className="landing-footer">
        <div className="landing-footer-copy">
          <p className="landing-footer-brand">ShiftWorksHR</p>
          <p>
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            {" · "}
            <Link to="/checklist">Checklist</Link>
          </p>
          <LegalFooter />
        </div>
      </footer>
    </div>
  );
}
