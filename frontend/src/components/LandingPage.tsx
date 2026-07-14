import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { checkBillingStatus, fetchDemoAnalysis, type PlanId } from "../api";
import { trackEvent } from "../analytics";
import { BrandLogo } from "./BrandLogo";
import { CheckoutButton } from "./CheckoutButton";
import { LandingSamplePreview } from "./SampleAnalysisEmbed";
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

const LANDING_TABS: { id: LandingTab; label: string }[] = [
  { id: "sample", label: "Sample" },
  { id: "product", label: "Product" },
  { id: "pricing", label: "Pricing" },
  { id: "faq", label: "FAQ" },
];

const HERO_PAIN_POINTS = [
  "Below-minimum employees flagged before the exec deck",
  "Manager-paid-below-report surprises surfaced early",
  "Cost-to-minimum and merit pool exposure for finance",
];

const TRUST_POINTS = [
  { stat: "Under 1 min", label: "To first insights" },
  { stat: "$249", label: "Per merit cycle" },
  { stat: "No API", label: "HRIS export upload" },
  { stat: "PDF + Excel", label: "Leadership exports" },
];

/** Outcome-oriented copy for the Product tab */
const PRODUCT_OUTCOMES = [
  {
    title: "Catch pay floor violations early",
    detail: "Flag below-minimum and above-maximum employees before leadership review.",
  },
  {
    title: "Stop manager inversions",
    detail: "Surface managers paid below direct reports — a common exec-meeting surprise.",
  },
  {
    title: "Quantify budget exposure",
    detail: "Show finance the cost-to-minimum and merit pool impact before the pool is locked.",
  },
  {
    title: "Validate merit alignment",
    detail: "Spot merit matrix outliers and performance × pay misalignment in one pass.",
  },
  {
    title: "Merge messy HRIS exports",
    detail: "Combine up to five files on Employee ID when base pay, equity, and ratings export separately.",
  },
  {
    title: "Compare cycles after merit",
    detail: "Re-upload after changes and see what's still open vs. last run.",
  },
  {
    title: "Pay equity signals by level",
    detail: "Median gaps by gender and race/ethnicity at the same job level — decision support, not legal audit.",
  },
  {
    title: "Leadership-ready exports",
    detail: "PDF summary for execs; full Excel workbook for your working file.",
  },
];

const FAQ_ITEMS = (trialMaxRows: number) => [
  {
    id: "trial",
    q: "Is there a free trial?",
    a: `Yes. Run one analysis per day on a single file (up to ${trialMaxRows.toLocaleString()} rows) with no credit card required. Names are masked in the trial view, and PDF and Excel exports include a watermark until you purchase a plan.`,
  },
  {
    id: "integrations",
    q: "Does ShiftWorksHR integrate with Workday, UKG, or ADP?",
    a: "We do not connect via API. Export compensation data from your HRIS as Excel or CSV and upload it directly. Standard export columns are detected automatically.",
  },
  {
    id: "multi-file",
    q: "Can I upload multiple files?",
    a: "Paid plans support merging up to five files on Employee ID—useful when base pay, equity, and performance data live in separate exports.",
  },
  {
    id: "data",
    q: "How is my compensation data handled?",
    a: "Files are processed in memory during analysis and are not retained on our servers by default. If you choose Save to history, results are stored in your organization account only.",
  },
  {
    id: "team",
    q: "How does team access work?",
    a: "Your organization shares one password. Each teammate signs in with their work email—no per-seat licensing.",
  },
  {
    id: "consultants",
    q: "Do you support compensation consultants?",
    a: (
      <>
        Yes. The Cycle Pass is priced per client engagement. See our{" "}
        <Link to="/for-consultants">consultant guide</Link> for deliverables and workflow
        recommendations.
      </>
    ),
  },
  {
    id: "invoices",
    q: "Can we pay by invoice or purchase order?",
    a: (
      <>
        Yes. Email{" "}
        <a href={`mailto:${CONTACT_EMAIL}?subject=ShiftWorksHR%20procurement`}>
          {CONTACT_EMAIL}
        </a>{" "}
        for procurement, PO, and invoice billing.
      </>
    ),
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
    description: "One merit season — no subscription.",
    features: [
      "Unlimited uploads for 90 days",
      "Full analysis & unwatermarked exports",
      "Multi-file merge (up to 5 files)",
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
    description: "Best for teams that run multiple cycles or mid-year checks.",
    features: [
      "Everything in Cycle Pass, full year",
      "Cycle history & side-by-side comparison",
      "Saved column mappings per org",
      "Priority support",
    ],
    cta: "Get annual",
    mailSubject: "ShiftWorksHR Annual Plan",
    featured: true,
  },
  {
    id: "monthly",
    name: "Monthly",
    price: "$99",
    period: "per month",
    description: "Short engagements — cancel anytime.",
    features: [
      "Unlimited uploads while active",
      "Full analysis & unwatermarked exports",
      "Multi-file merge (up to 5 files)",
      "Email support",
    ],
    cta: "Get monthly",
    mailSubject: "ShiftWorksHR Monthly Plan",
    featured: false,
  },
];

const SEO_RESOURCES = [
  {
    title: "Merit season comp checklist",
    description: "Prep your HRIS export, pay equity review, and leadership readout before merit lock.",
    href: "/checklist",
  },
  {
    title: "Workday comp export QA guide",
    description: "Which columns to export, how to merge files, and what to check before upload.",
    href: "/guides/workday-comp-export-qa",
  },
  {
    title: "Security summary for procurement",
    description: "Data handling, retention, and what IT needs before your first HRIS upload.",
    href: "/security-summary",
  },
  {
    title: "For compensation consultants",
    description: "Per-client Cycle Pass, client-ready PDF exports, no HRIS integration project.",
    href: "/for-consultants",
  },
];

function defaultLandingTab(): LandingTab {
  return "sample";
}

function isLandingTab(value: string): value is LandingTab {
  return LANDING_TABS.some((tab) => tab.id === value);
}

function scrollToActiveTabPanel(_tab: LandingTab) {
  const target =
    document.getElementById("landing-tabs") ??
    document.getElementById("landing-tab-content");
  if (!target) return;
  const nav = document.querySelector<HTMLElement>(".landing-nav");
  const offset = (nav?.offsetHeight ?? 72) + 12;
  const top = target.getBoundingClientRect().top + window.scrollY - offset;
  window.scrollTo({ top: Math.max(0, top), behavior: "auto" });
}

function scrollToSignIn() {
  const section = document.getElementById("sign-in");
  if (!section) return;
  const nav = document.querySelector<HTMLElement>(".landing-nav");
  const offset = (nav?.offsetHeight ?? 72) + 12;
  const top = section.getBoundingClientRect().top + window.scrollY - offset;
  window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
}

function syncTabFromHash(): LandingTab | null {
  const hash = window.location.hash.replace("#", "");
  return isLandingTab(hash) ? hash : null;
}

export function LandingPage({
  onLogin,
  showLogin,
  trialAvailable = false,
  trialMaxRows = 250,
  onTryTrial,
}: LandingPageProps) {
  const [availablePlans, setAvailablePlans] = useState<PlanId[]>([]);
  const [activeTab, setActiveTab] = useState<LandingTab>(() => syncTabFromHash() ?? defaultLandingTab());
  const pendingTabScroll = useRef(false);
  const [tabFlash, setTabFlash] = useState(false);
  const [outcomeStats, setOutcomeStats] = useState<{
    belowMinimum: number;
    managerInversions: number;
    reviewQueue: number;
    headcount: number;
  } | null>(null);

  useEffect(() => {
    void checkBillingStatus().then(({ plans }) => {
      setAvailablePlans(plans);
    });
  }, []);

  useEffect(() => {
    void fetchDemoAnalysis().then((result) => {
      setOutcomeStats({
        belowMinimum: result.summary.below_minimum,
        managerInversions: result.summary.managers_below_reports,
        reviewQueue: result.review_queue.total_items,
        headcount: result.summary.valid_rows,
      });
    });
  }, []);

  useEffect(() => {
    const previousScrollRestoration = history.scrollRestoration;
    history.scrollRestoration = "manual";

    const hash = window.location.hash.replace("#", "");
    if (hash === "sign-in") {
      window.setTimeout(() => scrollToSignIn(), 80);
    } else if (isLandingTab(hash)) {
      pendingTabScroll.current = true;
    } else if (!hash) {
      window.scrollTo(0, 0);
    }

    function onHashChange() {
      const nextHash = window.location.hash.replace("#", "");
      if (nextHash === "sign-in") {
        window.setTimeout(() => scrollToSignIn(), 80);
        return;
      }
      if (isLandingTab(nextHash)) {
        setActiveTab(nextHash);
        pendingTabScroll.current = true;
      }
    }

    window.addEventListener("hashchange", onHashChange);
    return () => {
      window.removeEventListener("hashchange", onHashChange);
      history.scrollRestoration = previousScrollRestoration;
    };
  }, []);

  useEffect(() => {
    if (!pendingTabScroll.current) return;
    pendingTabScroll.current = false;
    const timer = window.setTimeout(() => {
      requestAnimationFrame(() => scrollToActiveTabPanel(activeTab));
    }, 80);
    return () => window.clearTimeout(timer);
  }, [activeTab]);

  function selectTab(tab: LandingTab) {
    const alreadyActive = activeTab === tab;
    setActiveTab(tab);
    pendingTabScroll.current = true;
    trackEvent("landing_tab", { tab });
    setTabFlash(true);
    window.setTimeout(() => setTabFlash(false), 1400);
    if (window.location.hash !== `#${tab}`) {
      window.history.replaceState(null, "", `#${tab}`);
    }
    // useEffect only runs when activeTab changes — still scroll if already on this tab
    if (alreadyActive) {
      window.setTimeout(() => {
        requestAnimationFrame(() => scrollToActiveTabPanel(tab));
      }, 80);
    }
  }

  function tryTrial(source: string) {
    trackEvent("landing_cta", { action: "try_trial", location: source });
    onTryTrial?.();
  }

  const faqItems = FAQ_ITEMS(trialMaxRows);

  return (
    <div className="landing-page">
      <header className="landing-nav">
        <div className="landing-shell landing-nav-inner">
          <div className="landing-brand">
            <BrandLogo
              size="nav"
              layout="lockup"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            />
          </div>
          <nav className="landing-tab-bar--header" role="tablist" aria-label="Learn more">
            {LANDING_TABS.map(({ id, label }) => (
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
          </nav>
          {showLogin ? (
            <button
              type="button"
              className="landing-sign-in-btn"
              onClick={() => scrollToSignIn()}
            >
              Sign in
            </button>
          ) : (
            <span className="landing-nav-spacer" aria-hidden />
          )}
        </div>
      </header>

      <div className="landing-shell">
      <section className="landing-hero landing-hero--compact">
        <div className="landing-hero-panel panel">
        <div className="landing-hero-copy">
          <span className="hero-badge">Merit-cycle comp QA · not a $10k HRIS platform</span>
          <h1>Catch below-minimum pay and manager inversions before merit week.</h1>
          <p className="landing-hero-lead">
            Upload your Workday, UKG, or ADP export. Get a prioritized review queue and leadership-ready
            PDF in under a minute — no API, no implementation project.
          </p>
          <ul className="landing-hero-pain">
            {HERO_PAIN_POINTS.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
          <div className="landing-hero-actions">
            {trialAvailable && onTryTrial ? (
              <button className="button button-primary button-large" type="button" onClick={() => tryTrial("hero")}>
                Try free with your file
              </button>
            ) : (
              <button className="button button-primary button-large" type="button" onClick={() => selectTab("pricing")}>
                See pricing — from $249/cycle
              </button>
            )}
            <Link
              className="button button-secondary"
              to="/sample-preview"
              onClick={() => trackEvent("landing_cta", { action: "see_sample", location: "hero" })}
            >
              See sample analysis
            </Link>
          </div>
          {trialAvailable ? (
            <p className="landing-hero-trial-note">
              Free trial: 1 file, {trialMaxRows.toLocaleString()} rows/day — no card required.
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
        </div>
      </section>

      {outcomeStats ? (
        <section className="landing-outcomes" aria-label="Sample analysis outcomes">
          <div className="landing-outcomes-inner">
            <p className="landing-outcomes-eyebrow">What a first pass surfaces</p>
            <div className="landing-outcomes-grid">
              <article className="landing-outcome-card">
                <strong>{outcomeStats.belowMinimum}</strong>
                <span>Below minimum</span>
              </article>
              <article className="landing-outcome-card">
                <strong>{outcomeStats.managerInversions}</strong>
                <span>Mgr inversions</span>
              </article>
              <article className="landing-outcome-card">
                <strong>{outcomeStats.reviewQueue}</strong>
                <span>Review queue</span>
              </article>
              <article className="landing-outcome-card">
                <strong>{outcomeStats.headcount || "—"}</strong>
                <span>Employees</span>
              </article>
            </div>
            <p className="landing-outcomes-note">
              Sample file results — your HRIS export gets the same checks in under a minute.
            </p>
          </div>
        </section>
      ) : null}

      <section className="landing-tabs-section" id="landing-tabs">
        <div
          className={`landing-tabs-card panel${tabFlash ? " landing-tabs-card--flash" : ""}`}
          id="landing-tab-content"
        >
        {activeTab === "sample" ? (
          <div className="landing-tab-panel landing-tab-panel--sample" role="tabpanel" id="panel-sample" aria-labelledby="tab-sample">
            <p className="landing-tab-intro">Interactive sample — same checks on your merit spreadsheet.</p>
            <LandingSamplePreview />
          </div>
        ) : null}

        {activeTab === "product" ? (
          <div className="landing-tab-panel" role="tabpanel" id="panel-product" aria-labelledby="tab-product">
            <p className="landing-tab-intro">
              For in-house comp teams, HRBPs, and consultants — export from Workday, UKG, or ADP and upload as-is.
            </p>
            <ul className="landing-outcome-list">
              {PRODUCT_OUTCOMES.map((item) => (
                <li key={item.title} className="landing-outcome-list__item panel">
                  <strong>{item.title}</strong>
                  <span>{item.detail}</span>
                </li>
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
              <Link to="/security-summary">Security summary</Link>
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
            <div className="landing-pricing-procurement panel">
              <div>
                <strong>Need PO or invoice billing?</strong>
                <p>We support procurement for HR and finance teams.</p>
              </div>
              <a
                className="button button-secondary"
                href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("ShiftWorksHR procurement / invoice")}&body=${encodeURIComponent("Organization:\nApprox. employee count:\nPlan interested in (Cycle / Annual / Monthly):\nPO required? Y/N:\n")}`}
              >
                Request invoice
              </a>
            </div>
          </div>
        ) : null}

        {activeTab === "faq" ? (
          <div className="landing-tab-panel landing-tab-panel--faq" role="tabpanel" id="panel-faq" aria-labelledby="tab-faq">
            <header className="landing-faq-header">
              <h2 className="landing-faq-title">Frequently asked questions</h2>
              <p className="landing-faq-lead">
                What comp teams and HR leaders ask before their first merit cycle.
              </p>
            </header>
            <div className="landing-faq-list panel">
              {faqItems.map((item) => (
                <details className="landing-faq-item" key={item.id}>
                  <summary>
                    <span className="landing-faq-question">{item.q}</span>
                    <span className="landing-faq-chevron" aria-hidden />
                  </summary>
                  <div className="landing-faq-answer">{item.a}</div>
                </details>
              ))}
            </div>
            <footer className="landing-faq-footer">
              <p>Still have questions?</p>
              <div className="landing-faq-footer-links">
                <button type="button" className="landing-faq-footer-link" onClick={() => selectTab("pricing")}>
                  See pricing
                </button>
                <Link to="/security">Security overview</Link>
                <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
              </div>
            </footer>
          </div>
        ) : null}
        </div>
      </section>
      </div>

      <div className="landing-below-tabs">
        <div className="landing-shell">
      <section className="landing-resources" aria-labelledby="landing-resources-title">
        <p className="landing-below-tabs__eyebrow">Free guides</p>
        <h2 id="landing-resources-title" className="landing-resources__title">
          Merit season resources
        </h2>
        <p className="landing-resources__lead">
          Free guides for comp analysts and HRBPs running range review, merit planning, and leadership
          readouts — whether or not you use ShiftWorksHR.
        </p>
        <div className="landing-resources__grid">
          {SEO_RESOURCES.map((resource) => (
            <Link className="landing-resource-card panel" key={resource.href} to={resource.href}>
              <strong>{resource.title}</strong>
              <span>{resource.description}</span>
            </Link>
          ))}
        </div>
      </section>

      {showLogin ? (
        <section className="landing-sign-in" id="sign-in">
          <div className="landing-sign-in-card panel">
            <h2>Sign in</h2>
            <LoginForm onLogin={onLogin} compact />
          </div>
        </section>
      ) : null}
        </div>
      </div>

      <footer className="landing-footer">
        <div className="landing-shell landing-footer-inner">
          <p className="landing-footer-brand">ShiftWorksHR</p>
          <nav className="landing-footer-links" aria-label="Resources">
            <Link to="/sample-preview">Sample analysis</Link>
            <Link to="/checklist">Merit checklist</Link>
            <Link to="/guides/workday-comp-export-qa">Workday export guide</Link>
            <Link to="/for-consultants">Consultants</Link>
            <Link to="/security-summary">Security summary</Link>
            <Link to="/customer-stories">Customer stories</Link>
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
          </nav>
          <LegalFooter />
        </div>
      </footer>
    </div>
  );
}
