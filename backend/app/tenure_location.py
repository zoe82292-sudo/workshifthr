from __future__ import annotations

import re
from datetime import datetime
from typing import Any

import pandas as pd

from app.equity import MIN_GROUP_SIZE, _build_gaps, _group_stats, _median_or_none
from app.models import (
    DemographicGroupStats,
    LevelLocationBreakdown,
    LocationPayReport,
    PayEquityGap,
    TenureBandStats,
    TenureEmployeeRow,
    TenurePayFlag,
    TenureReport,
)

TENURE_DISCLAIMER = (
    "Tenure summaries are based on hire date and current base salary. They do not adjust "
    "for job level, location, performance, or promotion history. Use for directional review only."
)

LOCATION_DISCLAIMER = (
    "Location pay comparisons are descriptive medians only. They do not control for job level, "
    "cost of living, tenure, or role mix. Groups with fewer than five employees are hidden."
)

SHORT_TENURE_DAYS = 365
LONG_TENURE_DAYS = 3650
HIGH_COMPA = 110.0
LOW_COMPA = 90.0

TENURE_BANDS: list[tuple[str, float, float | None]] = [
    ("Under 1 year", 0, 1),
    ("1–3 years", 1, 3),
    ("3–5 years", 3, 5),
    ("5–10 years", 5, 10),
    ("10+ years", 10, None),
]


def _normalize_label(value: Any) -> str | None:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return None
    text = str(value).strip()
    if not text or text.lower() in {"nan", "none", "n/a", "na", "unknown", ""}:
        return None
    return re.sub(r"\s+", " ", text)


def _tenure_band(years: float) -> str:
    for label, lower, upper in TENURE_BANDS:
        if upper is None and years >= lower:
            return label
        if upper is not None and lower <= years < upper:
            return label
    return TENURE_BANDS[-1][0]


def _compa_ratio(
    salary: float | None,
    range_min: float | None,
    range_max: float | None,
    midpoint_override: float | None = None,
) -> float | None:
    if salary is None or range_min is None or range_max is None:
        return None
    midpoint = midpoint_override if midpoint_override else (range_min + range_max) / 2
    if midpoint <= 0:
        return None
    return round((salary / midpoint) * 100, 1)


def build_tenure_report(
    df: pd.DataFrame,
    mapping: dict[str, str | None],
    warnings: list[str],
) -> TenureReport:
    hire_col = mapping.get("hire_date")
    salary_col = mapping["salary"]
    min_col = mapping.get("range_min")
    max_col = mapping.get("range_max")
    midpoint_col = mapping.get("range_midpoint")

    if not hire_col or hire_col not in df.columns:
        warnings.append("No hire date column detected. Skipping tenure analysis.")
        return TenureReport(available=False, disclaimer=TENURE_DISCLAIMER)

    id_col = mapping["employee_id"]
    name_col = mapping.get("employee_name")
    level_col = mapping.get("job_level")
    dept_col = mapping.get("department")
    location_col = mapping.get("location")
    today = pd.Timestamp(datetime.now().date())

    employees: list[TenureEmployeeRow] = []
    flags: list[TenurePayFlag] = []
    missing_hire = 0

    for index, row in df.iterrows():
        employee_id = _normalize_label(row.get(id_col))
        hire_raw = row.get(hire_col)
        if pd.isna(hire_raw):
            missing_hire += 1
            continue

        parsed = pd.to_datetime(hire_raw, errors="coerce")
        if pd.isna(parsed):
            missing_hire += 1
            continue

        tenure_days = max(int((today - parsed).days), 0)
        tenure_years = round(tenure_days / 365.25, 1)
        salary = pd.to_numeric(row.get(salary_col), errors="coerce")
        salary_val = float(salary) if pd.notna(salary) else None
        range_min = pd.to_numeric(row.get(min_col), errors="coerce") if min_col else None
        range_max = pd.to_numeric(row.get(max_col), errors="coerce") if max_col else None
        range_min_val = float(range_min) if min_col and pd.notna(range_min) else None
        range_max_val = float(range_max) if max_col and pd.notna(range_max) else None
        midpoint_raw = pd.to_numeric(row.get(midpoint_col), errors="coerce") if midpoint_col else None
        midpoint_val = float(midpoint_raw) if midpoint_col and pd.notna(midpoint_raw) else None
        compa = _compa_ratio(salary_val, range_min_val, range_max_val, midpoint_val)

        row_number = int(index) + 2
        band = _tenure_band(tenure_years)
        employees.append(
            TenureEmployeeRow(
                row_number=row_number,
                employee_id=employee_id,
                employee_name=_normalize_label(row.get(name_col)) if name_col else None,
                hire_date=parsed.strftime("%Y-%m-%d"),
                tenure_days=tenure_days,
                tenure_years=tenure_years,
                tenure_band=band,
                salary=salary_val,
                job_level=_normalize_label(row.get(level_col)) if level_col else None,
                department=_normalize_label(row.get(dept_col)) if dept_col else None,
                location=_normalize_label(row.get(location_col)) if location_col else None,
                compa_ratio=compa,
            )
        )

        if salary_val is None:
            continue

        if tenure_days < SHORT_TENURE_DAYS and (
            (range_max_val is not None and salary_val > range_max_val)
            or (compa is not None and compa >= HIGH_COMPA)
        ):
            flags.append(
                TenurePayFlag(
                    row_number=row_number,
                    employee_id=employee_id,
                    employee_name=_normalize_label(row.get(name_col)) if name_col else None,
                    hire_date=parsed.strftime("%Y-%m-%d"),
                    tenure_years=tenure_years,
                    salary=salary_val,
                    flag_type="short_tenure_high_pay",
                    reason=(
                        f"Employee with {tenure_years} years of tenure is paid above range max "
                        f"or above {HIGH_COMPA:.0f}% compa-ratio."
                    ),
                )
            )
        elif tenure_days >= LONG_TENURE_DAYS and (
            (range_min_val is not None and salary_val < range_min_val)
            or (compa is not None and compa <= LOW_COMPA)
        ):
            flags.append(
                TenurePayFlag(
                    row_number=row_number,
                    employee_id=employee_id,
                    employee_name=_normalize_label(row.get(name_col)) if name_col else None,
                    hire_date=parsed.strftime("%Y-%m-%d"),
                    tenure_years=tenure_years,
                    salary=salary_val,
                    flag_type="long_tenure_low_pay",
                    reason=(
                        f"Employee with {tenure_years} years of tenure is below range min "
                        f"or at/below {LOW_COMPA:.0f}% compa-ratio."
                    ),
                )
            )

    if not employees:
        warnings.append("Hire date column detected but no usable hire dates were found.")
        return TenureReport(available=False, disclaimer=TENURE_DISCLAIMER)

    band_rows: list[TenureBandStats] = []
    employee_df = pd.DataFrame([employee.model_dump() for employee in employees])
    for label, _, _ in TENURE_BANDS:
        subset = employee_df[employee_df["tenure_band"] == label]
        if subset.empty:
            continue
        band_rows.append(
            TenureBandStats(
                band_label=label,
                headcount=len(subset),
                median_salary=_median_or_none(subset["salary"]),
                median_tenure_years=_median_or_none(subset["tenure_years"]),
                median_compa_ratio=_median_or_none(subset["compa_ratio"]),
            )
        )

    return TenureReport(
        available=True,
        bands=band_rows,
        employees=sorted(employees, key=lambda item: item.tenure_years, reverse=True),
        flags=flags,
        employees_missing_hire_date=missing_hire,
        disclaimer=TENURE_DISCLAIMER,
    )


def build_location_pay_report(
    df: pd.DataFrame,
    mapping: dict[str, str | None],
    warnings: list[str],
) -> LocationPayReport:
    location_col = mapping.get("location")
    salary_col = mapping["salary"]
    level_col = mapping.get("job_level")

    if not location_col or location_col not in df.columns:
        warnings.append("No location column detected. Skipping location pay analysis.")
        return LocationPayReport(available=False, disclaimer=LOCATION_DISCLAIMER)

    working = df.copy()
    working["_location"] = working[location_col].map(_normalize_label)
    working = working[working[salary_col].notna() & working["_location"].notna()]

    if working.empty:
        warnings.append("Location column detected but no usable location values were found.")
        return LocationPayReport(available=False, disclaimer=LOCATION_DISCLAIMER)

    missing_location = int(df[location_col].isna().sum() + (df[location_col].astype(str).str.strip() == "").sum())

    location_groups = _group_stats(
        working,
        "location",
        "_location",
        salary_col,
        len(working),
    )
    location_gaps = _build_gaps(location_groups, "location", "Overall workforce")

    level_breakdowns: list[LevelLocationBreakdown] = []
    if level_col and level_col in working.columns:
        for level_value, level_df in working.groupby(level_col, dropna=True):
            level_label = str(level_value)
            if len(level_df) < MIN_GROUP_SIZE:
                continue
            groups = _group_stats(level_df, "location", "_location", salary_col, len(level_df))
            gaps = _build_gaps(groups, "location", f"Job level {level_label}")
            if groups:
                level_breakdowns.append(
                    LevelLocationBreakdown(
                        job_level=level_label,
                        headcount=len(level_df),
                        location_groups=groups,
                        location_gaps=gaps,
                    )
                )

    return LocationPayReport(
        available=True,
        location_groups=location_groups,
        location_gaps=location_gaps,
        level_breakdowns=level_breakdowns,
        employees_missing_location=missing_location,
        disclaimer=LOCATION_DISCLAIMER,
    )
