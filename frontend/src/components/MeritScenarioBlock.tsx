import { useMemo } from "react";
import type { AnalysisInsights } from "../types";
import { poolForMeritPercent, resolveMeritScenario } from "../meritScenario";

function formatCurrency(value: number | null | undefined) {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number) {
  return `${value.toFixed(1).replace(/\.0$/, "")}%`;
}

interface MeritScenarioBlockProps {
  insights: AnalysisInsights;
  targetMeritPercent: number;
  onTargetMeritChange: (percent: number) => void;
}

export function MeritScenarioBlock({
  insights,
  targetMeritPercent,
  onTargetMeritChange,
}: MeritScenarioBlockProps) {
  const scenario = resolveMeritScenario(insights);

  const activePercent = useMemo(() => {
    return Number.isFinite(targetMeritPercent) && targetMeritPercent >= 0
      ? targetMeritPercent
      : scenario.reference_merit_percent;
  }, [scenario.reference_merit_percent, targetMeritPercent]);

  const activePool = useMemo(
    () => poolForMeritPercent(insights, activePercent),
    [activePercent, insights],
  );

  const totalExposure = scenario.cost_to_minimum + activePool;

  return (
    <section className="merit-scenario" aria-label="Merit scenario">
      <div className="merit-scenario__header">
        <div>
          <h3 className="merit-scenario__title">Merit scenario</h3>
          <p className="merit-scenario__subtitle">
            Quick budget view for finance and leadership — cost to minimum plus merit pool at your
            target %.
          </p>
        </div>
        <label className="merit-scenario__input-wrap" htmlFor="merit-scenario-percent">
          <span>Target merit %</span>
          <input
            id="merit-scenario-percent"
            className="merit-input merit-scenario__input"
            type="number"
            min="0"
            step="0.1"
            value={Number.isFinite(targetMeritPercent) ? targetMeritPercent : ""}
            onChange={(event) => {
              const parsed = Number(event.target.value);
              if (Number.isFinite(parsed)) {
                onTargetMeritChange(parsed);
              }
            }}
          />
        </label>
      </div>

      <div className="merit-scenario__grid">
        <article className="merit-scenario__metric">
          <span className="merit-scenario__label">Cost to range minimum</span>
          <strong className="merit-scenario__value">{formatCurrency(scenario.cost_to_minimum)}</strong>
          <p className="merit-scenario__meta">
            {scenario.employees_below_minimum} employee
            {scenario.employees_below_minimum === 1 ? "" : "s"} below floor
          </p>
        </article>

        <article className="merit-scenario__metric">
          <span className="merit-scenario__label">Eligible payroll base</span>
          <strong className="merit-scenario__value">{formatCurrency(scenario.payroll_base)}</strong>
          <p className="merit-scenario__meta">Salary base for merit pool math</p>
        </article>

        <article className="merit-scenario__metric merit-scenario__metric--highlight">
          <span className="merit-scenario__label">
            Merit pool at {formatPercent(activePercent)}
          </span>
          <strong className="merit-scenario__value">{formatCurrency(activePool)}</strong>
          <p className="merit-scenario__meta">
            {scenario.uploaded_merit_pool != null
              ? `Uploaded file implies ${formatCurrency(scenario.uploaded_merit_pool)}`
              : `Reference ${formatPercent(scenario.reference_merit_percent)} when no merit column`}
          </p>
        </article>

        <article className="merit-scenario__metric">
          <span className="merit-scenario__label">Total budget exposure</span>
          <strong className="merit-scenario__value">{formatCurrency(totalExposure)}</strong>
          <p className="merit-scenario__meta">Minimum adjustments + merit pool</p>
        </article>
      </div>

      <div className="merit-scenario__chips" role="list" aria-label="Merit pool scenarios">
        {scenario.scenarios.map((row) => (
          <button
            key={row.merit_percent}
            type="button"
            role="listitem"
            className={
              Math.abs(row.merit_percent - activePercent) < 0.05
                ? "merit-scenario__chip merit-scenario__chip--active"
                : "merit-scenario__chip"
            }
            onClick={() => onTargetMeritChange(row.merit_percent)}
          >
            {formatPercent(row.merit_percent)} → {formatCurrency(row.projected_pool)}
          </button>
        ))}
      </div>
    </section>
  );
}
