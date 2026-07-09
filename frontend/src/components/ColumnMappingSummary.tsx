import type { ColumnMapping } from "../types";
import { MAPPING_FIELDS } from "./ColumnMappingStep";

type ColumnMappingSummaryProps = {
  mapping: ColumnMapping;
  detectedColumns: string[];
  defaultOpen?: boolean;
};

export function ColumnMappingSummary({
  mapping,
  detectedColumns,
  defaultOpen = false,
}: ColumnMappingSummaryProps) {
  const mapped = MAPPING_FIELDS.filter((field) => mapping[field.key]);
  const meta = `${detectedColumns.length} columns detected · ${mapped.length} fields mapped`;

  return (
    <details className="mapping-summary" open={defaultOpen}>
      <summary className="mapping-summary__summary">
        <span className="mapping-summary__title">Columns mapped from your file</span>
        <span className="mapping-summary__meta">{meta}</span>
      </summary>
      <dl className="mapping-summary__list">
        {mapped.map((field) => (
          <div className="mapping-summary__item" key={field.key}>
            <dt>{field.label}</dt>
            <dd>{mapping[field.key]}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
