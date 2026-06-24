from __future__ import annotations

import re
from typing import Any

import pandas as pd

COLUMN_ALIASES: dict[str, list[str]] = {
    "employee_id": [
        "employee id",
        "emp id",
        "employee_id",
        "ee id",
        "worker id",
        "id",
        "employee number",
        "emp no",
        "emp #",
    ],
    "employee_name": [
        "employee name",
        "name",
        "full name",
        "employee",
        "ee name",
    ],
    "salary": [
        "salary",
        "base salary",
        "current salary",
        "annual salary",
        "pay",
        "base pay",
        "compensation",
        "current pay",
        "base comp",
    ],
    "range_min": [
        "range min",
        "minimum",
        "min",
        "range minimum",
        "salary range min",
        "comp min",
        "pay range min",
        "grade min",
    ],
    "range_max": [
        "range max",
        "maximum",
        "max",
        "range maximum",
        "salary range max",
        "comp max",
        "pay range max",
        "grade max",
    ],
    "job_level": [
        "job level",
        "grade",
        "level",
        "job grade",
        "pay grade",
        "band",
        "job band",
        "pay band",
    ],
    "department": [
        "department",
        "dept",
        "business unit",
        "division",
        "org unit",
        "organization unit",
        "organizational unit",
        "function",
        "cost center",
        "unit",
    ],
    "manager_id": [
        "manager id",
        "manager employee id",
        "supervisor id",
        "reports to id",
        "mgr id",
        "manager emp id",
        "supervisor employee id",
    ],
    "manager_name": [
        "manager name",
        "supervisor name",
        "reports to name",
        "reports to",
        "manager",
        "supervisor",
        "mgr name",
        "direct manager",
        "direct manager name",
    ],
    "bonus_target": [
        "bonus target",
        "target bonus",
        "sti target",
        "incentive target",
        "bonus target percent",
        "target incentive",
        "annual bonus target",
        "bonus %",
    ],
    "effective_date": [
        "effective date",
        "comp effective date",
        "salary effective date",
        "pay effective date",
        "effective dt",
        "comp date",
    ],
    "merit_increase": [
        "merit increase",
        "merit increase %",
        "merit increase pct",
        "merit percent",
        "merit %",
        "merit pct",
        "increase percent",
        "increase %",
        "merit increase percent",
        "merit amount",
    ],
    "gender": [
        "gender",
        "sex",
        "ee gender",
        "employee gender",
        "gender identity",
    ],
    "race_ethnicity": [
        "race",
        "ethnicity",
        "race ethnicity",
        "race/ethnicity",
        "race and ethnicity",
        "eeo race",
        "eeo ethnicity",
        "ethnic group",
        "racial group",
    ],
}

REQUIRED_FIELDS = ["employee_id", "salary", "range_min", "range_max"]
NUMERIC_OPTIONAL_FIELDS = ["bonus_target", "merit_increase"]


def normalize_header(value: Any) -> str:
    text = str(value).strip().lower()
    text = re.sub(r"[_\-]+", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text


def detect_column_mapping(columns: list[Any]) -> dict[str, str | None]:
    normalized = {normalize_header(col): str(col) for col in columns}
    mapping: dict[str, str | None] = {field: None for field in COLUMN_ALIASES}

    for field, aliases in COLUMN_ALIASES.items():
        for alias in aliases:
            if alias in normalized:
                mapping[field] = normalized[alias]
                break

    return mapping


def coerce_numeric(series: pd.Series) -> pd.Series:
    cleaned = (
        series.astype(str)
        .str.replace(r"[$,\s]", "", regex=True)
        .str.replace(r"\((.*)\)", r"-\1", regex=True)
        .replace({"": pd.NA, "nan": pd.NA, "None": pd.NA, "-": pd.NA})
    )
    return pd.to_numeric(cleaned, errors="coerce")
