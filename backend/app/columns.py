from __future__ import annotations

import re
from datetime import datetime
from typing import Any

import pandas as pd

COLUMN_ALIASES: dict[str, list[str]] = {
    "employee_id": [
        "employee id",
        "emp id",
        "employee_id",
        "ee id",
        "worker id",
        "employee number",
        "emp no",
        "emp #",
        "empid",
        "eeid",
        "workerid",
        "employeenumber",
    ],
    "employee_name": [
        "employee name",
        "name",
        "full name",
        "employee",
        "ee name",
        "employeename",
        "fullname",
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
        "basesalary",
        "currentsalary",
        "annualsalary",
        "basepay",
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
        "rangemin",
        "salaryrangemin",
        "compmin",
        "grademin",
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
        "rangemax",
        "salaryrangemax",
        "compmax",
        "grademax",
    ],
    "range_midpoint": [
        "range midpoint",
        "range mid",
        "salary range midpoint",
        "comp midpoint",
        "pay midpoint",
        "midpoint",
        "range middle",
        "salary midpoint",
        "rangemidpoint",
        "rangemid",
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
        "joblevel",
        "jobgrade",
        "paygrade",
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
    "location": [
        "location",
        "work location",
        "office location",
        "office",
        "site",
        "work site",
        "city",
        "work city",
        "state",
        "region",
        "geo",
        "country",
        "campus",
        "physical location",
        "loc",
    ],
    "manager_id": [
        "manager id",
        "manager employee id",
        "supervisor id",
        "reports to id",
        "mgr id",
        "manager emp id",
        "supervisor employee id",
        "managerid",
        "supervisorid",
        "reportstoid",
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
        "bonustarget",
        "targetbonus",
        "bonus pct",
        "target bonus percent",
        "variable target",
    ],
    "effective_date": [
        "effective date",
        "comp effective date",
        "salary effective date",
        "pay effective date",
        "effective dt",
        "comp date",
        "effectivedate",
        "salaryeffectivedate",
    ],
    "hire_date": [
        "hire date",
        "start date",
        "original hire date",
        "date of hire",
        "employment start",
        "service date",
        "tenure start",
        "hiredate",
        "startdate",
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
        "meritincrease",
        "meritpercent",
    ],
    "promotion_increase": [
        "promotion increase",
        "promotion increase %",
        "promotion %",
        "promo increase",
        "promo %",
        "promotion percent",
        "promotionincrease",
    ],
    "equity_grant": [
        "equity grant",
        "equity grant %",
        "equity %",
        "lti grant",
        "stock grant",
        "equity award",
        "equity percent",
        "equitygrant",
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
    "employee_type": [
        "employee type",
        "worker type",
        "employment type",
        "ee type",
        "worker category",
        "employee category",
        "employeetype",
        "employmenttype",
        "worker type desc",
    ],
    "pay_zone": [
        "pay zone",
        "geo zone",
        "geographic zone",
        "payzone",
        "geo pay zone",
        "location zone",
        "comp zone",
    ],
    "geo_differential": [
        "geo differential",
        "geographic differential",
        "location differential",
        "geo diff",
        "geo adjustment",
        "cola",
        "cost of living adjustment",
        "location pay differential",
        "geodifferential",
    ],
    "currency": [
        "currency",
        "pay currency",
        "salary currency",
        "comp currency",
        "local currency",
        "currency code",
    ],
}

REQUIRED_FIELDS = ["employee_id", "salary", "range_min", "range_max"]
NUMERIC_OPTIONAL_FIELDS = [
    "bonus_target",
    "merit_increase",
    "range_midpoint",
    "promotion_increase",
    "equity_grant",
]

GENDER_VALUES = {
    "male",
    "female",
    "m",
    "f",
    "man",
    "woman",
    "non-binary",
    "nonbinary",
    "other",
    "prefer not to say",
    "unknown",
}

COMP_MIN_MEDIAN = 5_000
COMP_MAX_MEDIAN = 2_000_000


def normalize_header(value: Any) -> str:
    text = str(value).strip().lower()
    text = re.sub(r"[_\-]+", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text


def compact_header(value: Any) -> str:
    return re.sub(r"[^a-z0-9]", "", normalize_header(value))


def coerce_numeric(series: pd.Series) -> pd.Series:
    cleaned = (
        series.astype(str)
        .str.replace(r"[$,\s]", "", regex=True)
        .str.replace(r"\((.*)\)", r"-\1", regex=True)
        .replace({"": pd.NA, "nan": pd.NA, "None": pd.NA, "-": pd.NA})
    )
    return pd.to_numeric(cleaned, errors="coerce")


def _header_lookup(columns: list[Any]) -> dict[str, str]:
    normalized = {normalize_header(col): str(col) for col in columns}
    compact = {compact_header(col): str(col) for col in columns}
    lookup: dict[str, str] = {}
    for field, aliases in COLUMN_ALIASES.items():
        for alias in aliases:
            if alias in normalized:
                lookup[field] = normalized[alias]
                break
            compact_alias = compact_header(alias)
            if compact_alias and compact_alias in compact:
                lookup[field] = compact[compact_alias]
                break
    return lookup


def detect_column_mapping(columns: list[Any], df: pd.DataFrame | None = None) -> dict[str, str | None]:
    mapping: dict[str, str | None] = {field: None for field in COLUMN_ALIASES}
    header_matches = _header_lookup(columns)
    for field, column in header_matches.items():
        mapping[field] = column

    if df is not None and not df.empty:
        inferred = _infer_column_mapping(df, mapping)
        for field, column in inferred.items():
            if mapping.get(field) is None and column is not None:
                mapping[field] = column

    return mapping


def mapping_has_required(mapping: dict[str, str | None]) -> bool:
    return all(mapping.get(field) for field in REQUIRED_FIELDS)


def resolve_column_mapping(
    columns: list[Any],
    df: pd.DataFrame,
    override: dict[str, str | None] | None = None,
) -> dict[str, str | None]:
    detected = detect_column_mapping(columns, df)
    if not override:
        return detected

    merged = {**detected}
    for field in COLUMN_ALIASES:
        value = override.get(field)
        if value:
            merged[field] = value
    return merged


def _column_name_looks_like_data_value(value: Any) -> bool:
    text = str(value).strip()
    if not text:
        return False
    if re.fullmatch(r"[A-Za-z]{0,4}\d[\w\-]*", text):
        return True
    numeric = coerce_numeric(pd.Series([text]))
    if numeric.notna().iloc[0]:
        number = float(numeric.iloc[0])
        if COMP_MIN_MEDIAN <= number <= COMP_MAX_MEDIAN:
            return True
        if 0 < number <= 100:
            return True
    return False


def _columns_match_known_headers(columns: list[Any]) -> bool:
    header_matches = _header_lookup(columns)
    return any(field in header_matches for field in REQUIRED_FIELDS)


def _first_row_looks_like_headers(df: pd.DataFrame) -> bool:
    if len(df) < 2:
        return False

    matches = 0
    has_id = False
    has_comp = False
    for value in df.iloc[0]:
        normalized = normalize_header(value)
        compact = compact_header(value)
        for field, aliases in COLUMN_ALIASES.items():
            if normalized in aliases or compact in {compact_header(alias) for alias in aliases}:
                matches += 1
                if field == "employee_id":
                    has_id = True
                if field in {"salary", "range_min", "range_max"}:
                    has_comp = True
                break

    return matches >= 3 and has_id and has_comp


def _should_use_headerless_layout(df: pd.DataFrame) -> bool:
    columns = [str(col) for col in df.columns]
    if _columns_match_known_headers(columns):
        return False

    unnamed_or_numeric = sum(
        1
        for column in columns
        if column.startswith("Unnamed:")
        or re.fullmatch(r"\d+\.?\d*", column)
    )
    if unnamed_or_numeric >= max(2, len(columns) // 2):
        return True

    data_like_headers = sum(1 for column in columns if _column_name_looks_like_data_value(column))
    return data_like_headers >= max(2, int(len(columns) * 0.4))


def normalize_upload_dataframe(df: pd.DataFrame) -> tuple[pd.DataFrame, list[str]]:
    warnings: list[str] = []
    if df.empty or len(df.columns) < 2:
        return df, warnings

    working = df.copy()
    working.columns = [str(col).strip() for col in working.columns]

    if (
        mapping_has_required(detect_column_mapping(list(working.columns), working))
        and _columns_match_known_headers(list(working.columns))
    ):
        return working, warnings

    if _first_row_looks_like_headers(working):
        promoted = working.copy()
        promoted.columns = [str(value).strip() for value in promoted.iloc[0]]
        promoted = promoted.iloc[1:].reset_index(drop=True)
        promoted.columns = [str(col).strip() for col in promoted.columns]
        if mapping_has_required(detect_column_mapping(list(promoted.columns), promoted)):
            warnings.append(
                "Detected column headers in the first row of the file and adjusted automatically."
            )
            return promoted, warnings

    if _should_use_headerless_layout(working):
        headerless = working.copy()
        headerless.columns = [f"Column_{index + 1}" for index in range(len(headerless.columns))]
        if mapping_has_required(detect_column_mapping(list(headerless.columns), headerless)):
            warnings.append(
                "No header row detected — required columns were inferred from your data patterns."
            )
            return headerless, warnings

    return working, warnings


def _used_columns(mapping: dict[str, str | None]) -> set[str]:
    return {column for column in mapping.values() if column}


def _infer_column_mapping(
    df: pd.DataFrame,
    existing: dict[str, str | None],
) -> dict[str, str | None]:
    inferred = {field: None for field in COLUMN_ALIASES}
    used = _used_columns(existing)
    available = [col for col in df.columns if str(col) not in used]

    comp_triple = _infer_compensation_triple(df, available)
    if comp_triple:
        inferred["salary"], inferred["range_min"], inferred["range_max"] = comp_triple
        used.update(comp_triple)

    if existing.get("employee_id") is None:
        id_col = _infer_employee_id_column(df, [c for c in available if c not in used])
        if id_col:
            inferred["employee_id"] = id_col
            used.add(id_col)

    employee_id_col = existing.get("employee_id") or inferred.get("employee_id")

    optional_inferrers = [
        ("employee_name", lambda cols: _infer_employee_name_column(df, cols)),
        ("gender", lambda cols: _infer_gender_column(df, cols)),
        ("race_ethnicity", lambda cols: _infer_race_column(df, cols)),
        ("job_level", lambda cols: _infer_job_level_column(df, cols)),
        ("department", lambda cols: _infer_department_column(df, cols)),
        ("location", lambda cols: _infer_location_column(df, cols)),
        ("merit_increase", lambda cols: _infer_merit_column(df, cols)),
        ("promotion_increase", lambda cols: _infer_percent_column(df, cols, "promotion")),
        ("equity_grant", lambda cols: _infer_percent_column(df, cols, "equity")),
        ("bonus_target", lambda cols: _infer_bonus_column(df, cols)),
        ("effective_date", lambda cols: _infer_date_column(df, cols)),
        ("hire_date", lambda cols: _infer_hire_date_column(df, cols)),
        (
            "manager_id",
            lambda cols: _infer_manager_id_column(df, cols, employee_id_col),
        ),
    ]

    for field, inferrer in optional_inferrers:
        if existing.get(field) is not None:
            continue
        cols = [c for c in available if c not in used]
        match = inferrer(cols)
        if match:
            inferred[field] = match
            used.add(match)

    return inferred


def _infer_compensation_triple(
    df: pd.DataFrame,
    columns: list[Any],
) -> tuple[str, str, str] | None:
    numeric_cols: list[str] = []
    for col in columns:
        series = coerce_numeric(df[col])
        if series.notna().sum() < max(3, len(df) * 0.4):
            continue
        median = series.median()
        if pd.isna(median) or median < COMP_MIN_MEDIAN or median > COMP_MAX_MEDIAN:
            continue
        numeric_cols.append(str(col))

    if len(numeric_cols) < 3:
        return None

    best: tuple[str, str, str] | None = None
    best_score = 0.0

    for min_col in numeric_cols:
        min_series = coerce_numeric(df[min_col])
        for max_col in numeric_cols:
            if max_col == min_col:
                continue
            max_series = coerce_numeric(df[max_col])
            valid_pair = (max_series > min_series) & min_series.notna() & max_series.notna()
            if valid_pair.sum() < max(3, len(df) * 0.4):
                continue

            for salary_col in numeric_cols:
                if salary_col in {min_col, max_col}:
                    continue
                salary_series = coerce_numeric(df[salary_col])
                aligned = min_series.notna() & max_series.notna() & salary_series.notna()
                if aligned.sum() < max(3, len(df) * 0.4):
                    continue

                in_range = (
                    (salary_series >= min_series)
                    & (salary_series <= max_series)
                    & aligned
                )
                score = in_range.sum() / aligned.sum()
                if score > best_score:
                    best_score = score
                    best = (salary_col, min_col, max_col)

    if best is None or best_score < 0.35:
        return None
    return best


def _infer_employee_id_column(df: pd.DataFrame, columns: list[Any]) -> str | None:
    best_col: str | None = None
    best_score = 0.0

    for col in columns:
        raw = df[col].dropna().astype(str).str.strip()
        raw = raw[raw != ""]
        if len(raw) < max(3, len(df) * 0.4):
            continue

        unique_ratio = raw.nunique() / len(raw)
        if unique_ratio < 0.75:
            continue

        numeric = coerce_numeric(df[col])
        numeric_ratio = numeric.notna().mean()
        if numeric_ratio > 0.95:
            # Large sequential integers are less likely to be IDs when salary columns exist.
            if numeric.median(skipna=True) > 10_000:
                continue

        token_like = raw.str.match(r"^[A-Za-z0-9\-]+$").mean()
        score = unique_ratio * 0.6 + token_like * 0.4
        if score > best_score:
            best_score = score
            best_col = str(col)

    return best_col if best_score >= 0.7 else None


def _infer_employee_name_column(df: pd.DataFrame, columns: list[Any]) -> str | None:
    best_col: str | None = None
    best_score = 0.0

    for col in columns:
        raw = df[col].dropna().astype(str).str.strip()
        raw = raw[raw != ""]
        if len(raw) < max(3, len(df) * 0.4):
            continue

        has_space = raw.str.contains(r"\s").mean()
        alpha = raw.str.match(r"^[A-Za-z ,.'\-]+$").mean()
        unique_ratio = raw.nunique() / len(raw)
        if unique_ratio > 0.98:
            continue

        score = has_space * 0.5 + alpha * 0.5
        if score > best_score:
            best_score = score
            best_col = str(col)

    return best_col if best_score >= 0.6 else None


def _infer_gender_column(df: pd.DataFrame, columns: list[Any]) -> str | None:
    best_col: str | None = None
    best_score = 0.0

    for col in columns:
        raw = df[col].dropna().astype(str).str.strip().str.lower()
        raw = raw[raw != ""]
        if len(raw) < max(3, len(df) * 0.4):
            continue

        unique_count = raw.nunique()
        if unique_count < 2 or unique_count > 8:
            continue

        gender_hits = raw.isin(GENDER_VALUES).mean()
        if gender_hits < 0.5:
            continue

        score = gender_hits
        if score > best_score:
            best_score = score
            best_col = str(col)

    return best_col if best_score >= 0.5 else None


def _infer_race_column(df: pd.DataFrame, columns: list[Any]) -> str | None:
    best_col: str | None = None
    best_score = 0.0

    for col in columns:
        if col == best_col:
            continue
        raw = df[col].dropna().astype(str).str.strip()
        raw = raw[raw != ""]
        if len(raw) < max(3, len(df) * 0.4):
            continue

        unique_count = raw.nunique()
        if unique_count < 2 or unique_count > 20:
            continue

        numeric_ratio = coerce_numeric(df[col]).notna().mean()
        if numeric_ratio > 0.5:
            continue

        alpha = raw.str.match(r"^[A-Za-z ,./\-]+$").mean()
        avg_len = raw.str.len().mean()
        if alpha < 0.7 or avg_len < 4:
            continue

        score = alpha * 0.6 + min(unique_count / 10, 1.0) * 0.4
        if score > best_score:
            best_score = score
            best_col = str(col)

    return best_col if best_score >= 0.55 else None


def _infer_job_level_column(df: pd.DataFrame, columns: list[Any]) -> str | None:
    best_col: str | None = None
    best_score = 0.0

    for col in columns:
        raw = df[col].dropna().astype(str).str.strip()
        raw = raw[raw != ""]
        if len(raw) < max(3, len(df) * 0.4):
            continue

        unique_count = raw.nunique()
        if unique_count < 2 or unique_count > 25:
            continue

        numeric = coerce_numeric(df[col])
        if numeric.notna().mean() > 0.8:
            median = numeric.median(skipna=True)
            if pd.notna(median) and 1 <= median <= 20:
                score = 0.85
            else:
                continue
        else:
            short_tokens = raw.str.match(r"^[A-Za-z0-9\-]+$").mean()
            if short_tokens < 0.6 or raw.str.len().mean() > 12:
                continue
            score = 0.7

        if score > best_score:
            best_score = score
            best_col = str(col)

    return best_col if best_score >= 0.65 else None


def _infer_department_column(df: pd.DataFrame, columns: list[Any]) -> str | None:
    best_col: str | None = None
    best_score = 0.0

    for col in columns:
        raw = df[col].dropna().astype(str).str.strip()
        raw = raw[raw != ""]
        if len(raw) < max(3, len(df) * 0.4):
            continue

        unique_count = raw.nunique()
        if unique_count < 2 or unique_count > 40:
            continue

        numeric_ratio = coerce_numeric(df[col]).notna().mean()
        if numeric_ratio > 0.2:
            continue

        alpha = raw.str.match(r"^[A-Za-z0-9 ,./&\-]+$").mean()
        if alpha < 0.75:
            continue

        score = alpha * 0.5 + min(unique_count / 15, 1.0) * 0.5
        if score > best_score:
            best_score = score
            best_col = str(col)

    return best_col if best_score >= 0.55 else None


def _infer_location_column(df: pd.DataFrame, columns: list[Any]) -> str | None:
    best_col: str | None = None
    best_score = 0.0

    for col in columns:
        raw = df[col].dropna().astype(str).str.strip()
        raw = raw[raw != ""]
        if len(raw) < max(3, len(df) * 0.4):
            continue

        unique_count = raw.nunique()
        if unique_count < 2 or unique_count > 25:
            continue

        numeric_ratio = coerce_numeric(df[col]).notna().mean()
        if numeric_ratio > 0.15:
            continue

        remote_hits = raw.str.lower().isin(
            {"remote", "hybrid", "onsite", "on-site", "office", "wfh", "home"}
        ).mean()
        alpha = raw.str.match(r"^[A-Za-z0-9 ,./\-]+$").mean()
        if alpha < 0.7:
            continue

        score = alpha * 0.45 + min(unique_count / 10, 1.0) * 0.35 + remote_hits * 0.2
        if score > best_score:
            best_score = score
            best_col = str(col)

    return best_col if best_score >= 0.5 else None


def _infer_merit_column(df: pd.DataFrame, columns: list[Any]) -> str | None:
    best_col: str | None = None
    best_score = 0.0

    for col in columns:
        series = coerce_numeric(df[col]).dropna()
        if len(series) < max(3, len(df) * 0.3):
            continue

        as_percent = series.copy()
        if as_percent.quantile(0.9) <= 1:
            as_percent = as_percent * 100

        if as_percent.median() < 0 or as_percent.quantile(0.95) > 30:
            continue

        in_band = ((as_percent >= 0) & (as_percent <= 20)).mean()
        if in_band < 0.6:
            continue

        if in_band > best_score:
            best_score = in_band
            best_col = str(col)

    return best_col if best_score >= 0.6 else None


def _infer_bonus_column(df: pd.DataFrame, columns: list[Any]) -> str | None:
    best_col: str | None = None
    best_score = 0.0

    for col in columns:
        series = coerce_numeric(df[col]).dropna()
        if len(series) < max(3, len(df) * 0.3):
            continue

        as_percent = series.copy()
        if as_percent.quantile(0.9) <= 1:
            as_percent = as_percent * 100

        if as_percent.median() < 0 or as_percent.quantile(0.95) > 100:
            continue

        in_band = ((as_percent >= 0) & (as_percent <= 60)).mean()
        if in_band < 0.6:
            continue

        if in_band > best_score:
            best_score = in_band
            best_col = str(col)

    return best_col if best_score >= 0.6 else None


def _infer_date_column(df: pd.DataFrame, columns: list[Any]) -> str | None:
    best_col: str | None = None
    best_score = 0.0

    for col in columns:
        parsed = pd.to_datetime(df[col], errors="coerce", format="mixed")
        valid_ratio = parsed.notna().mean()
        if valid_ratio < 0.6:
            continue

        years = parsed.dt.year.dropna()
        if years.empty:
            continue
        if years.min() < 1990 or years.max() > 2100:
            continue

        if valid_ratio > best_score:
            best_score = valid_ratio
            best_col = str(col)

    return best_col if best_score >= 0.6 else None


def _infer_percent_column(df: pd.DataFrame, columns: list[Any], kind: str) -> str | None:
    """Infer promotion or equity percent columns (similar shape to merit)."""
    max_q95 = 50 if kind == "promotion" else 80
    best_col: str | None = None
    best_score = 0.0

    for col in columns:
        series = coerce_numeric(df[col]).dropna()
        if len(series) < max(3, len(df) * 0.2):
            continue

        as_percent = series.copy()
        if as_percent.quantile(0.9) <= 1:
            as_percent = as_percent * 100

        if as_percent.median() < 0 or as_percent.quantile(0.95) > max_q95:
            continue

        in_band = ((as_percent >= 0) & (as_percent <= max_q95)).mean()
        if in_band < 0.5:
            continue

        if in_band > best_score:
            best_score = in_band
            best_col = str(col)

    return best_col if best_score >= 0.5 else None


def _infer_hire_date_column(df: pd.DataFrame, columns: list[Any]) -> str | None:
    best_col: str | None = None
    best_score = 0.0

    for col in columns:
        parsed = pd.to_datetime(df[col], errors="coerce", format="mixed")
        valid_ratio = parsed.notna().mean()
        if valid_ratio < 0.5:
            continue

        years = parsed.dt.year.dropna()
        if years.empty:
            continue
        if years.min() < 1970 or years.max() > 2100:
            continue

        # Hire dates skew older than effective dates (more past dates).
        today = pd.Timestamp(datetime.now().date())
        past_ratio = (parsed <= today).mean()
        score = valid_ratio * (0.5 + past_ratio * 0.5)
        if score > best_score:
            best_score = score
            best_col = str(col)

    return best_col if best_score >= 0.55 else None


def _infer_manager_id_column(
    df: pd.DataFrame,
    columns: list[Any],
    employee_id_col: str | None,
) -> str | None:
    if not employee_id_col:
        return None

    employee_ids = set(df[employee_id_col].dropna().astype(str).str.strip())
    if not employee_ids:
        return None

    best_col: str | None = None
    best_score = 0.0

    for col in columns:
        if str(col) == employee_id_col:
            continue

        raw = df[col].dropna().astype(str).str.strip()
        raw = raw[raw != ""]
        if len(raw) < max(3, len(df) * 0.3):
            continue

        overlap = raw.isin(employee_ids).mean()
        unique_ratio = raw.nunique() / len(raw)
        if overlap < 0.25 or unique_ratio > 0.95:
            continue

        if overlap > best_score:
            best_score = overlap
            best_col = str(col)

    return best_col if best_score >= 0.25 else None
