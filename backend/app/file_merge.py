from __future__ import annotations

from typing import Any

import pandas as pd

from app.analyzer import analyze_file, read_upload
from app.columns import COLUMN_ALIASES, NUMERIC_OPTIONAL_FIELDS, coerce_numeric, resolve_column_mapping
from app.models import AnalysisOptions, AnalysisResult, ColumnMapping

MAX_MERGE_FILES = 5


def _normalize_employee_id(value: Any) -> str | None:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return None
    text = str(value).strip()
    if not text or text.lower() in {"nan", "none"}:
        return None
    if text.endswith(".0") and text[:-2].isdigit():
        return text[:-2]
    return text


def canonicalize_dataframe(df: pd.DataFrame, mapping: ColumnMapping, source_label: str) -> pd.DataFrame:
    id_col = mapping.employee_id
    if not id_col or id_col not in df.columns:
        raise ValueError(f"{source_label}: Employee ID column is required to merge files.")

    out = pd.DataFrame()
    out["employee_id"] = df[id_col].map(_normalize_employee_id)
    for field in COLUMN_ALIASES:
        if field == "employee_id":
            continue
        column = getattr(mapping, field, None)
        if column and column in df.columns:
            out[field] = df[column]

    out = out[out["employee_id"].notna()].copy()
    if out.empty:
        raise ValueError(f"{source_label}: No rows with a valid Employee ID were found.")

    for field in ["salary", "range_min", "range_max", *NUMERIC_OPTIONAL_FIELDS]:
        if field in out.columns:
            out[field] = coerce_numeric(out[field])

    for date_field in ("effective_date", "hire_date"):
        if date_field in out.columns:
            out[date_field] = pd.to_datetime(out[date_field], errors="coerce")

    if "manager_id" in out.columns:
        out["manager_id"] = out["manager_id"].astype(str).str.strip()

    return out


def merge_canonical_dataframes(frames: list[pd.DataFrame]) -> tuple[pd.DataFrame, list[str]]:
    warnings: list[str] = []
    if not frames:
        raise ValueError("No files to merge.")
    if len(frames) == 1:
        return frames[0], warnings

    result = frames[0].set_index("employee_id")
    known_ids = set(result.index)
    for index, frame in enumerate(frames[1:], start=2):
        other = frame.set_index("employee_id")
        new_ids = set(other.index) - known_ids
        if new_ids:
            warnings.append(
                f"File {index}: added {len(new_ids)} employee ID(s) not present in the first file."
            )
        known_ids |= set(other.index)
        for column in other.columns:
            if column not in result.columns:
                result[column] = other[column]
            else:
                result[column] = result[column].combine_first(other[column])

    merged = result.reset_index()
    warnings.insert(0, f"Merged {len(frames)} files into {len(merged)} employee rows.")
    return merged, warnings


def mapping_for_merged_dataframe(df: pd.DataFrame) -> ColumnMapping:
    payload: dict[str, str | None] = {field: None for field in COLUMN_ALIASES}
    for field in COLUMN_ALIASES:
        if field in df.columns:
            payload[field] = field
    return ColumnMapping(**payload)


def _merged_to_upload_bytes(df: pd.DataFrame) -> bytes:
    export = df.copy()
    for column in export.columns:
        if pd.api.types.is_datetime64_any_dtype(export[column]):
            export[column] = export[column].dt.strftime("%Y-%m-%d")
    return export.to_csv(index=False).encode("utf-8")


def analyze_merged_files(
    sources: list[tuple[bytes, str, str | None, ColumnMapping]],
    options: AnalysisOptions | None = None,
) -> AnalysisResult:
    if not sources:
        raise ValueError("Upload at least one file.")
    if len(sources) > MAX_MERGE_FILES:
        raise ValueError(f"You can merge up to {MAX_MERGE_FILES} files at a time.")

    canonical_frames: list[pd.DataFrame] = []
    read_warnings: list[str] = []

    for content, filename, sheet_name, mapping in sources:
        df, _, file_warnings = read_upload(content, filename, sheet_name)
        read_warnings.extend(f"{filename}: {warning}" for warning in file_warnings)
        resolved = resolve_column_mapping(
            list(df.columns),
            df,
            mapping.model_dump() if hasattr(mapping, "model_dump") else dict(mapping),
        )
        canonical_frames.append(
            canonicalize_dataframe(df, ColumnMapping(**resolved), filename)
        )

    merged, merge_warnings = merge_canonical_dataframes(canonical_frames)
    merged_mapping = mapping_for_merged_dataframe(merged)
    missing_core = [
        field
        for field in ("salary", "range_min", "range_max")
        if not getattr(merged_mapping, field)
    ]
    if missing_core:
        labels = ", ".join(field.replace("_", " ") for field in missing_core)
        raise ValueError(
            f"After merging, these required fields are still missing: {labels}. "
            "Map them on at least one uploaded file."
        )

    merged_bytes = _merged_to_upload_bytes(merged)
    display_name = " + ".join(filename for _, filename, _, _ in sources)
    result = analyze_file(
        merged_bytes,
        display_name,
        mapping_override=merged_mapping,
        options=options,
    )
    result.warnings = merge_warnings + read_warnings + result.warnings
    return result
