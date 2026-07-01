import type { ColumnMapping } from "../types";
import { MAPPING_FIELDS } from "./ColumnMappingStep";

type ColumnMappingSummaryProps = {
  mapping: ColumnMapping;
  detectedColumns: string[];
};

export function ColumnMappingSummary({ mapping, detectedColumns }: ColumnMappingSummaryProps) {
  const mapped = MAPPING_FIELDS.filter((field) => mapping[field.key]);

  return (
    <section className="mapping-summary" aria-label="Column mapping used for this analysis">
      <h3>Columns mapped from your file</h3>
      <p className="mapping-summary__meta">
        {detectedColumns.length} columns detected · {mapped.length} fields mapped
      </p>
      <dl className="mapping-summary__list">
        {mapped.map((field) => (
          <div className="mapping-summary__item" key={field.key}>
            <dt>{field.label}</dt>
            <dd>{mapping[field.key]}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
