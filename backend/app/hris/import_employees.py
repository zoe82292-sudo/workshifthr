from __future__ import annotations

import io
from typing import Any

import pandas as pd

from app.analyzer import analyze_file
from app.models import AnalysisResult


def records_to_dataframe(records: list[dict[str, Any]]) -> pd.DataFrame:
    rows: list[dict[str, Any]] = []
    for record in records:
        salary = record.get("salary")
        if salary is None:
            continue
        rows.append(
            {
                "Employee ID": record.get("employee_id"),
                "Employee Name": record.get("employee_name"),
                "Department": record.get("department"),
                "Job Level": record.get("job_level"),
                "Manager ID": record.get("manager_id"),
                "Gender": record.get("gender"),
                "Race/Ethnicity": record.get("race_ethnicity"),
                "Salary": salary,
            }
        )
    return pd.DataFrame(rows)


def analyze_hris_records(records: list[dict[str, Any]], provider_name: str) -> AnalysisResult:
    if not records:
        raise ValueError("No employee records were returned from your HRIS.")

    df = records_to_dataframe(records)
    if df.empty:
        raise ValueError(
            "Your HRIS connection succeeded, but no usable salary data was returned. "
            "Try uploading a compensation spreadsheet with pay ranges instead."
        )

    buffer = io.BytesIO()
    df.to_csv(buffer, index=False)
    result = analyze_file(buffer.getvalue(), f"{provider_name.lower()}-hris.csv")

    missing_required = result.missing_required_columns or []
    if missing_required:
        result.warnings.insert(
            0,
            (
                f"Connected to {provider_name}, but pay range minimum/maximum columns were not "
                "available from the HRIS export. Range penetration, below-minimum, and "
                "above-maximum checks need range data — upload a comp report with grade bands "
                "or add Range Min and Range Max columns to your export."
            ),
        )

    result.warnings.insert(
        0,
        (
            f"Imported {len(df)} employees from {provider_name}. "
            "HRIS integrations typically provide salary and demographics; pay grade ranges "
            "may still need to come from your comp spreadsheet."
        ),
    )
    return result
