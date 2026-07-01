import type { ColumnMapping, PreviewResponse } from "../types";

export const MAPPING_FIELDS: Array<{
  key: keyof ColumnMapping;
  label: string;
  required: boolean;
  hint?: string;
}> = [
  { key: "employee_id", label: "Employee ID", required: true },
  { key: "employee_name", label: "Employee name", required: false },
  { key: "salary", label: "Base salary", required: true },
  { key: "range_min", label: "Range minimum", required: true },
  { key: "range_max", label: "Range maximum", required: true },
  { key: "job_level", label: "Job level / grade", required: false, hint: "Improves compression checks" },
  { key: "department", label: "Department", required: false },
  { key: "manager_id", label: "Manager ID", required: false, hint: "Required for manager inversion checks" },
  { key: "bonus_target", label: "Bonus target %", required: false },
  { key: "merit_increase", label: "Merit increase %", required: false },
  { key: "effective_date", label: "Effective date", required: false },
  { key: "gender", label: "Gender", required: false, hint: "Required for pay equity views" },
  { key: "race_ethnicity", label: "Race / ethnicity", required: false, hint: "Required for pay equity views" },
];

export function mappingIsComplete(mapping: ColumnMapping): boolean {
  return MAPPING_FIELDS.filter((field) => field.required).every((field) => mapping[field.key]);
}

type ColumnMappingStepProps = {
  fileName: string;
  preview: PreviewResponse;
  mapping: ColumnMapping;
  sheetName: string | null;
  loading: boolean;
  onMappingChange: (mapping: ColumnMapping) => void;
  onSheetChange: (sheetName: string | null) => void;
  onAnalyze: () => void;
  onCancel: () => void;
};

export function ColumnMappingStep({
  fileName,
  preview,
  mapping,
  sheetName,
  loading,
  onMappingChange,
  onSheetChange,
  onAnalyze,
  onCancel,
}: ColumnMappingStepProps) {
  const complete = mappingIsComplete(mapping);

  return (
    <section className="panel mapping-step">
      <div className="panel-header">
        <h2>Confirm column mapping</h2>
        <span className="pill">{fileName}</span>
      </div>

      <p className="mapping-step__intro">
        We detected columns in your file. Confirm each field is mapped correctly before running
        the analysis — especially salary and range min/max.
      </p>

      {preview.sheet_names.length > 1 ? (
        <div className="field mapping-step__sheet">
          <label htmlFor="sheet-select">Worksheet</label>
          <select
            id="sheet-select"
            value={sheetName ?? preview.sheet_names[0] ?? ""}
            onChange={(event) => onSheetChange(event.target.value || null)}
          >
            {preview.sheet_names.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="mapping-grid">
        {MAPPING_FIELDS.map((field) => (
          <div className="field" key={field.key}>
            <label htmlFor={`map-${field.key}`}>
              {field.label}
              {field.required ? " *" : ""}
            </label>
            <select
              id={`map-${field.key}`}
              value={mapping[field.key] ?? ""}
              onChange={(event) =>
                onMappingChange({
                  ...mapping,
                  [field.key]: event.target.value || null,
                })
              }
            >
              <option value="">— Not mapped —</option>
              {preview.columns.map((column) => (
                <option key={column} value={column}>
                  {column}
                </option>
              ))}
            </select>
            {field.hint ? <span className="field-hint">{field.hint}</span> : null}
          </div>
        ))}
      </div>

      {!complete ? (
        <div className="alert alert-warning">
          Map all required fields (employee ID, salary, range min, range max) to continue.
        </div>
      ) : null}

      {preview.preview_rows.length > 0 ? (
        <div className="mapping-preview-table">
          <h3>Preview (first rows)</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {preview.columns.map((column) => (
                    <th key={column}>{column}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.preview_rows.slice(0, 3).map((row, index) => (
                  <tr key={index}>
                    {preview.columns.map((column) => (
                      <td key={column}>{row[column] ?? "—"}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <div className="mapping-step__actions">
        <button
          className="button button-primary"
          type="button"
          disabled={!complete || loading}
          onClick={onAnalyze}
        >
          {loading ? "Analyzing…" : "Run analysis"}
        </button>
        <button className="button button-secondary" type="button" disabled={loading} onClick={onCancel}>
          Choose a different file
        </button>
      </div>
    </section>
  );
}
