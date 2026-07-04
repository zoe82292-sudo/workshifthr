import { useState } from "react";
import type { ColumnMapping, PreviewResponse } from "../types";
import {
  ColumnMappingStep,
  MAPPING_FIELDS,
  mappingIsComplete,
} from "./ColumnMappingStep";

export type UploadMappingEntry = {
  file: File;
  preview: PreviewResponse;
  mapping: ColumnMapping;
  sheetName: string | null;
};

export function batchMappingIsComplete(entries: UploadMappingEntry[]): boolean {
  if (entries.length === 0) {
    return false;
  }

  if (!entries.every((entry) => entry.mapping.employee_id)) {
    return false;
  }

  if (entries.length === 1) {
    return mappingIsComplete(entries[0].mapping);
  }

  const requiredAcrossFiles: Array<keyof ColumnMapping> = ["salary", "range_min", "range_max"];
  return requiredAcrossFiles.every((field) =>
    entries.some((entry) => Boolean(entry.mapping[field])),
  );
}

type MultiFileMappingStepProps = {
  entries: UploadMappingEntry[];
  loading: boolean;
  onMappingChange: (index: number, mapping: ColumnMapping) => void;
  onSheetChange: (index: number, sheetName: string | null) => void;
  onAnalyze: () => void;
  onCancel: () => void;
  onRemoveFile: (index: number) => void;
};

export function MultiFileMappingStep({
  entries,
  loading,
  onMappingChange,
  onSheetChange,
  onAnalyze,
  onCancel,
  onRemoveFile,
}: MultiFileMappingStepProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const complete = batchMappingIsComplete(entries);
  const active = entries[activeIndex];

  if (!active) {
    return null;
  }

  const coveredFields = new Set<keyof ColumnMapping>();
  for (const entry of entries) {
    for (const field of MAPPING_FIELDS) {
      if (entry.mapping[field.key]) {
        coveredFields.add(field.key);
      }
    }
  }

  const missingAcrossFiles = MAPPING_FIELDS.filter(
    (field) => field.required && !coveredFields.has(field.key),
  );

  return (
    <section className="panel mapping-step multi-file-mapping">
      <div className="panel-header">
        <div>
          <h2>Map columns in each file</h2>
          <p className="multi-file-mapping__intro">
            Files are merged on <strong>Employee ID</strong>. Required fields can live in
            different uploads — salary in one file, ranges in another, merit in a third.
          </p>
        </div>
        <span className="pill">{entries.length} files</span>
      </div>

      <div className="multi-file-mapping__tabs" role="tablist" aria-label="Uploaded files">
        {entries.map((entry, index) => (
          <button
            key={`${entry.file.name}-${index}`}
            type="button"
            role="tab"
            aria-selected={index === activeIndex}
            className={`multi-file-mapping__tab ${index === activeIndex ? "multi-file-mapping__tab--active" : ""}`}
            onClick={() => setActiveIndex(index)}
          >
            {entry.file.name}
          </button>
        ))}
      </div>

      {missingAcrossFiles.length > 0 ? (
        <div className="alert alert-info">
          Still needed across all files:{" "}
          {missingAcrossFiles.map((field) => field.label).join(", ")}.
        </div>
      ) : null}

      <ColumnMappingStep
        fileName={active.file.name}
        preview={active.preview}
        mapping={active.mapping}
        sheetName={active.sheetName}
        loading={loading}
        onMappingChange={(mapping) => onMappingChange(activeIndex, mapping)}
        onSheetChange={(sheetName) => onSheetChange(activeIndex, sheetName)}
        onAnalyze={() => undefined}
        onCancel={onCancel}
        onRemoveFile={() => onRemoveFile(activeIndex)}
        mergeMode
        embedded
      />

      <div className="mapping-step__actions">
        <button
          className="button button-primary"
          type="button"
          disabled={!complete || loading}
          onClick={onAnalyze}
        >
          {loading ? "Analyzing…" : complete ? "Merge & analyze" : "Map required fields to continue"}
        </button>
        <button className="button button-secondary" type="button" disabled={loading} onClick={onCancel}>
          Choose different files
        </button>
      </div>
    </section>
  );
}
