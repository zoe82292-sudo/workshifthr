from __future__ import annotations

import re
from typing import Any

import pandas as pd

from app.models import (
    DemographicGroupStats,
    LevelPayEquityBreakdown,
    PayEquityGap,
    PayEquityReport,
)

MIN_GROUP_SIZE = 5

GENDER_ALIASES: dict[str, str] = {
    "m": "Male",
    "male": "Male",
    "man": "Male",
    "f": "Female",
    "female": "Female",
    "woman": "Female",
    "non binary": "Non-Binary",
    "nonbinary": "Non-Binary",
    "nb": "Non-Binary",
    "non-binary": "Non-Binary",
}

DISCLAIMER = (
    "Descriptive pay comparisons by gender and race/ethnicity for decision support only. "
    "These summaries do not control for job level, tenure, performance, location, or other "
    "legitimate factors. They are not legal pay equity or EEO compliance determinations. "
    "Groups with fewer than five employees are hidden to reduce re-identification risk."
)


def _normalize_demographic(value: Any) -> str | None:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return None
    text = str(value).strip()
    if not text or text.lower() in {"nan", "none", "n/a", "na", "unknown", ""}:
        return None
    return re.sub(r"\s+", " ", text)


def _normalize_gender(value: Any) -> str | None:
    raw = _normalize_demographic(value)
    if raw is None:
        return None
    mapped = GENDER_ALIASES.get(raw.lower())
    if mapped:
        return mapped
    return raw.title()


def _normalize_race(value: Any) -> str | None:
    raw = _normalize_demographic(value)
    if raw is None:
        return None
    lowered = raw.lower()
    eeo_map = {
        "white": "White",
        "black": "Black or African American",
        "african american": "Black or African American",
        "black or african american": "Black or African American",
        "asian": "Asian",
        "hispanic": "Hispanic or Latino",
        "latino": "Hispanic or Latino",
        "latina": "Hispanic or Latino",
        "hispanic or latino": "Hispanic or Latino",
        "native american": "American Indian or Alaska Native",
        "american indian": "American Indian or Alaska Native",
        "alaska native": "American Indian or Alaska Native",
        "pacific islander": "Native Hawaiian or Pacific Islander",
        "native hawaiian": "Native Hawaiian or Pacific Islander",
        "two or more": "Two or More Races",
        "multiracial": "Two or More Races",
        "two or more races": "Two or More Races",
    }
    return eeo_map.get(lowered, raw.title())


def _median_or_none(values: pd.Series) -> float | None:
    clean = values.dropna()
    if clean.empty:
        return None
    return round(float(clean.median()), 2)


def _mean_or_none(values: pd.Series) -> float | None:
    clean = values.dropna()
    if clean.empty:
        return None
    return round(float(clean.mean()), 2)


def _group_stats(
    df: pd.DataFrame,
    dimension: str,
    group_col: str,
    salary_col: str,
    total_with_data: int,
) -> list[DemographicGroupStats]:
    stats: list[DemographicGroupStats] = []
    for group_name, group_df in df.groupby(group_col, dropna=True):
        count = len(group_df)
        if count == 0:
            continue
        suppressed = count < MIN_GROUP_SIZE
        stats.append(
            DemographicGroupStats(
                dimension=dimension,
                group_name=str(group_name),
                headcount=count,
                median_salary=None if suppressed else _median_or_none(group_df[salary_col]),
                mean_salary=None if suppressed else _mean_or_none(group_df[salary_col]),
                median_compa_ratio=None
                if suppressed or "compa_ratio" not in group_df.columns
                else _median_or_none(group_df["compa_ratio"]),
                workforce_percent=round((count / total_with_data) * 100, 1) if total_with_data else 0,
                suppressed=suppressed,
            )
        )
    return sorted(stats, key=lambda item: item.headcount, reverse=True)


def _build_gaps(
    groups: list[DemographicGroupStats],
    dimension: str,
    scope: str,
) -> list[PayEquityGap]:
    visible = [group for group in groups if not group.suppressed and group.median_salary is not None]
    gaps: list[PayEquityGap] = []

    for i, higher in enumerate(visible):
        for lower in visible[i + 1 :]:
            if higher.median_salary is None or lower.median_salary is None:
                continue
            high_median = higher.median_salary
            low_median = lower.median_salary
            if high_median == low_median:
                continue

            if high_median > low_median:
                top_group, bottom_group = higher.group_name, lower.group_name
                top_median, bottom_median = high_median, low_median
            else:
                top_group, bottom_group = lower.group_name, higher.group_name
                top_median, bottom_median = low_median, high_median

            gap_amount = round(top_median - bottom_median, 2)
            gap_percent = round((gap_amount / bottom_median) * 100, 1) if bottom_median else None

            gaps.append(
                PayEquityGap(
                    dimension=dimension,
                    higher_paid_group=top_group,
                    lower_paid_group=bottom_group,
                    higher_median=top_median,
                    lower_median=bottom_median,
                    gap_amount=gap_amount,
                    gap_percent=gap_percent,
                    scope=scope,
                )
            )

    return sorted(gaps, key=lambda item: item.gap_percent or 0, reverse=True)


def _level_breakdowns(
    df: pd.DataFrame,
    level_col: str,
    gender_col: str | None,
    race_col: str | None,
    salary_col: str,
) -> list[LevelPayEquityBreakdown]:
    breakdowns: list[LevelPayEquityBreakdown] = []

    for level_value, level_df in df.groupby(level_col, dropna=True):
        level_label = str(level_value)
        if len(level_df) < MIN_GROUP_SIZE:
            continue

        gender_groups: list[DemographicGroupStats] = []
        gender_gaps: list[PayEquityGap] = []
        if gender_col:
            gender_groups = _group_stats(level_df, "gender", gender_col, salary_col, len(level_df))
            gender_gaps = _build_gaps(gender_groups, "gender", f"Job level {level_label}")

        race_groups: list[DemographicGroupStats] = []
        race_gaps: list[PayEquityGap] = []
        if race_col:
            race_groups = _group_stats(level_df, "race", race_col, salary_col, len(level_df))
            race_gaps = _build_gaps(race_groups, "race", f"Job level {level_label}")

        if gender_groups or race_groups:
            breakdowns.append(
                LevelPayEquityBreakdown(
                    job_level=level_label,
                    headcount=len(level_df),
                    gender_groups=gender_groups,
                    race_groups=race_groups,
                    gender_gaps=gender_gaps,
                    race_gaps=race_gaps,
                )
            )

    return breakdowns


def build_pay_equity_report(
    df: pd.DataFrame,
    mapping: dict[str, str | None],
    warnings: list[str],
) -> PayEquityReport:
    gender_col = mapping.get("gender")
    race_col = mapping.get("race_ethnicity")
    salary_col = mapping["salary"]
    level_col = mapping.get("job_level")

    has_gender = bool(gender_col and gender_col in df.columns)
    has_race = bool(race_col and race_col in df.columns)

    if not has_gender and not has_race:
        warnings.append(
            "No gender or race/ethnicity columns detected. Skipping pay equity analysis."
        )
        return PayEquityReport(available=False, disclaimer=DISCLAIMER)

    if not has_gender:
        warnings.append("No gender column detected. Gender pay equity analysis skipped.")
    if not has_race:
        warnings.append("No race/ethnicity column detected. Race pay equity analysis skipped.")

    working = df.copy()
    working = working[working[salary_col].notna()]

    if gender_col and has_gender:
        working["_gender"] = working[gender_col].map(_normalize_gender)
    if race_col and has_race:
        working["_race"] = working[race_col].map(_normalize_race)

    if "range_min" in mapping and "range_max" in mapping:
        min_col = mapping["range_min"]
        max_col = mapping["range_max"]
        if min_col and max_col and min_col in working.columns and max_col in working.columns:
            midpoint = (working[min_col] + working[max_col]) / 2
            working["compa_ratio"] = (working[salary_col] / midpoint.replace(0, pd.NA)) * 100

    gender_groups: list[DemographicGroupStats] = []
    race_groups: list[DemographicGroupStats] = []
    gender_gaps: list[PayEquityGap] = []
    race_gaps: list[PayEquityGap] = []
    level_breakdowns: list[LevelPayEquityBreakdown] = []

    employees_missing_gender = 0
    employees_missing_race = 0

    if has_gender:
        gender_df = working[working["_gender"].notna()]
        employees_missing_gender = int(working["_gender"].isna().sum())
        if gender_df.empty:
            warnings.append("Gender column detected but no usable gender values were found.")
        else:
            gender_groups = _group_stats(
                gender_df, "gender", "_gender", salary_col, len(gender_df)
            )
            gender_gaps = _build_gaps(gender_groups, "gender", "Overall workforce")

    if has_race:
        race_df = working[working["_race"].notna()]
        employees_missing_race = int(working["_race"].isna().sum())
        if race_df.empty:
            warnings.append("Race/ethnicity column detected but no usable values were found.")
        else:
            race_groups = _group_stats(race_df, "race", "_race", salary_col, len(race_df))
            race_gaps = _build_gaps(race_groups, "race", "Overall workforce")

    if level_col and level_col in working.columns:
        level_df = working[working[level_col].notna() & (working[level_col].astype(str).str.strip() != "")]
        if not level_df.empty:
            level_breakdowns = _level_breakdowns(
                level_df,
                level_col,
                "_gender" if has_gender else None,
                "_race" if has_race else None,
                salary_col,
            )

    return PayEquityReport(
        available=True,
        gender_groups=gender_groups,
        race_groups=race_groups,
        gender_gaps=gender_gaps,
        race_gaps=race_gaps,
        level_breakdowns=level_breakdowns,
        employees_missing_gender=employees_missing_gender,
        employees_missing_race=employees_missing_race,
        disclaimer=DISCLAIMER,
    )
