from __future__ import annotations

import io
from datetime import datetime
from typing import Any

import pandas as pd

from app.columns import (
    COLUMN_ALIASES,
    NUMERIC_OPTIONAL_FIELDS,
    REQUIRED_FIELDS,
    coerce_numeric,
    detect_column_mapping,
)
from app.equity import build_pay_equity_report
from app.insights import build_insights, empty_insights
from app.models import (
    AnalysisResult,
    AnalysisSummary,
    ColumnMapping,
    CompaRatioRecord,
    CompressionIssue,
    DuplicateGroup,
    EmployeeRecord,
    InvalidEffectiveDateRecord,
    ManagerBelowReportIssue,
    MissingBonusTargetRecord,
    MissingSalaryRangeRecord,
    OutlierMeritIncreaseRecord,
    PayEquityReport,
    PreviewResponse,
)

MERIT_OUTLIER_IQR_MULTIPLIER = 1.5


def _read_csv(content: bytes) -> pd.DataFrame:
    if content.startswith(b"\xff\xfe") or content.startswith(b"\xfe\xff"):
        encodings = ["utf-16"]
    else:
        encodings = ["utf-8-sig", "utf-8", "latin-1", "cp1252"]

    for encoding in encodings:
        try:
            text = content.decode(encoding)
        except UnicodeDecodeError:
            continue

        for separator in [",", ";", "\t"]:
            try:
                df = pd.read_csv(io.StringIO(text), sep=separator)
            except Exception:
                continue
            if len(df.columns) >= 2:
                df.columns = [str(col).strip() for col in df.columns]
                return df

    raise ValueError(
        "Could not read this CSV. In Excel, use File → Save As → CSV UTF-8 (Comma delimited), "
        "or upload the original .xlsx file instead."
    )


def read_upload(content: bytes, filename: str, sheet_name: str | None = None) -> tuple[pd.DataFrame, list[str]]:
    lower_name = filename.lower()
    if lower_name.endswith(".csv"):
        df = _read_csv(content)
        return df, ["CSV"]

    workbook = pd.ExcelFile(io.BytesIO(content))
    sheet_names = workbook.sheet_names
    selected = sheet_name if sheet_name in sheet_names else sheet_names[0]
    df = pd.read_excel(workbook, sheet_name=selected)
    df.columns = [str(col).strip() for col in df.columns]
    return df, sheet_names


def preview_file(content: bytes, filename: str, sheet_name: str | None = None) -> PreviewResponse:
    df, sheet_names = read_upload(content, filename, sheet_name)
    mapping = detect_column_mapping(list(df.columns))
    preview_rows = df.head(5).fillna("").astype(str).to_dict(orient="records")
    return PreviewResponse(
        columns=list(df.columns),
        suggested_mapping=ColumnMapping(**mapping),
        preview_rows=preview_rows,
        sheet_names=sheet_names,
    )


def _value(row: pd.Series, column: str | None) -> Any:
    if not column or column not in row.index:
        return None
    value = row[column]
    if pd.isna(value):
        return None
    return value


def _string_value(value: Any) -> str | None:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return None
    text = str(value).strip()
    return text or None


def _float_value(value: Any) -> float | None:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _calculate_penetration(salary: float, range_min: float, range_max: float) -> float | None:
    spread = range_max - range_min
    if spread <= 0:
        return None
    return round(((salary - range_min) / spread) * 100, 1)


def _penetration_band(penetration: float | None) -> str | None:
    if penetration is None:
        return None
    if penetration < 0:
        return "below_range"
    if penetration > 100:
        return "above_range"
    if penetration < 25:
        return "bottom_quartile"
    if penetration < 75:
        return "mid_range"
    return "top_quartile"


def _calculate_compa_ratio(salary: float, range_min: float, range_max: float) -> float | None:
    midpoint = (range_min + range_max) / 2
    if midpoint <= 0:
        return None
    return round((salary / midpoint) * 100, 1)


def _employee_record(
    row: pd.Series,
    row_number: int,
    mapping: dict[str, str | None],
    penetration: float | None = None,
    missing_fields: list[str] | None = None,
) -> EmployeeRecord:
    salary = _float_value(_value(row, mapping.get("salary")))
    range_min = _float_value(_value(row, mapping.get("range_min")))
    range_max = _float_value(_value(row, mapping.get("range_max")))
    compa_ratio = None
    gap_to_minimum = None
    if salary is not None and range_min is not None and range_max is not None:
        compa_ratio = _calculate_compa_ratio(salary, range_min, range_max)
        gap_to_minimum = round(max(range_min - salary, 0), 2)

    merit_raw = _float_value(_value(row, mapping.get("merit_increase")))
    merit_increase = _normalize_merit_percent(merit_raw) if merit_raw is not None else None

    return EmployeeRecord(
        row_number=row_number,
        employee_id=_string_value(_value(row, mapping.get("employee_id"))),
        employee_name=_string_value(_value(row, mapping.get("employee_name"))),
        salary=salary,
        range_min=range_min,
        range_max=range_max,
        job_level=_string_value(_value(row, mapping.get("job_level"))),
        department=_string_value(_value(row, mapping.get("department"))),
        range_penetration=penetration,
        penetration_band=_penetration_band(penetration),
        compa_ratio=compa_ratio,
        merit_increase=merit_increase,
        gap_to_minimum=gap_to_minimum,
        missing_fields=missing_fields or [],
    )


def _empty_summary(total_rows: int, valid_rows: int = 0) -> AnalysisSummary:
    return AnalysisSummary(
        total_rows=total_rows,
        valid_rows=valid_rows,
        below_minimum=0,
        above_maximum=0,
        duplicate_ids=0,
        missing_data=total_rows if valid_rows == 0 else 0,
        compression_issues=0,
    )


def _empty_result(
    df: pd.DataFrame,
    mapping: dict[str, str | None],
    missing_required: list[str],
    warnings: list[str],
) -> AnalysisResult:
    return AnalysisResult(
        summary=_empty_summary(len(df)),
        column_mapping=ColumnMapping(**mapping),
        detected_columns=list(df.columns),
        missing_required_columns=missing_required,
        below_minimum=[],
        above_maximum=[],
        duplicate_ids=[],
        range_penetration=[],
        compression=[],
        missing_data=[],
        managers_below_reports=[],
        missing_bonus_targets=[],
        missing_salary_ranges=[],
        invalid_effective_dates=[],
        outlier_merit_increases=[],
        compa_ratios=[],
        pay_equity=PayEquityReport(available=False),
        insights=empty_insights(),
        warnings=warnings,
    )


def _prepare_dataframe(
    df: pd.DataFrame,
    mapping_override: ColumnMapping | None = None,
) -> tuple[pd.DataFrame, dict[str, str | None], list[str]]:
    detected = detect_column_mapping(list(df.columns))
    if mapping_override:
        for field in COLUMN_ALIASES:
            override_value = getattr(mapping_override, field)
            if override_value:
                detected[field] = override_value

    missing_required = [field for field in REQUIRED_FIELDS if not detected.get(field)]
    if missing_required:
        return df, detected, missing_required

    prepared = df.copy()
    for field in ["salary", "range_min", "range_max", *NUMERIC_OPTIONAL_FIELDS]:
        column = detected.get(field)
        if column and column in prepared.columns:
            prepared[column] = coerce_numeric(prepared[column])

    id_column = detected["employee_id"]
    if id_column:
        prepared[id_column] = prepared[id_column].astype(str).str.strip()

    manager_col = detected.get("manager_id")
    if manager_col and manager_col in prepared.columns:
        prepared[manager_col] = prepared[manager_col].astype(str).str.strip()

    date_col = detected.get("effective_date")
    if date_col and date_col in prepared.columns:
        prepared[date_col] = pd.to_datetime(prepared[date_col], errors="coerce")

    return prepared, detected, []


def analyze_file(
    content: bytes,
    filename: str,
    sheet_name: str | None = None,
    mapping_override: ColumnMapping | None = None,
) -> AnalysisResult:
    df, _ = read_upload(content, filename, sheet_name)
    prepared, mapping, missing_required = _prepare_dataframe(df, mapping_override)
    warnings: list[str] = []

    if missing_required:
        return _empty_result(
            df,
            mapping,
            missing_required,
            [
                "Could not detect required columns: "
                + ", ".join(missing_required)
                + ". Map columns manually and try again."
            ],
        )

    id_col = mapping["employee_id"]
    salary_col = mapping["salary"]
    min_col = mapping["range_min"]
    max_col = mapping["range_max"]
    name_col = mapping.get("employee_name")

    below_minimum: list[EmployeeRecord] = []
    above_maximum: list[EmployeeRecord] = []
    range_penetration: list[EmployeeRecord] = []
    missing_data: list[EmployeeRecord] = []
    penetration_values: list[float] = []

    for index, row in prepared.iterrows():
        row_number = int(index) + 2
        missing_fields: list[str] = []

        employee_id = _string_value(row.get(id_col))
        salary = _float_value(row.get(salary_col))
        range_min = _float_value(row.get(min_col))
        range_max = _float_value(row.get(max_col))

        if not employee_id:
            missing_fields.append("employee_id")
        if salary is None:
            missing_fields.append("salary")
        if range_min is None:
            missing_fields.append("range_min")
        if range_max is None:
            missing_fields.append("range_max")

        penetration = None
        if salary is not None and range_min is not None and range_max is not None:
            penetration = _calculate_penetration(salary, range_min, range_max)
            if penetration is not None:
                penetration_values.append(penetration)

        record = _employee_record(
            row,
            row_number,
            mapping,
            penetration=penetration,
            missing_fields=missing_fields,
        )

        if missing_fields:
            missing_data.append(record)
            continue

        range_penetration.append(record)

        if salary < range_min:
            below_minimum.append(record)
        if salary > range_max:
            above_maximum.append(record)

    duplicate_ids = _find_duplicate_ids(prepared, id_col)
    compression = _find_compression_issues(prepared, mapping, warnings)
    missing_salary_ranges = _find_missing_salary_ranges(prepared, mapping)
    missing_bonus_targets = _find_missing_bonus_targets(prepared, mapping, warnings)
    invalid_effective_dates = _find_invalid_effective_dates(prepared, mapping, warnings)
    outlier_merit_increases = _find_outlier_merit_increases(prepared, mapping, warnings)
    managers_below_reports = _find_managers_below_reports(prepared, mapping, warnings)
    pay_equity = build_pay_equity_report(prepared, mapping, warnings)

    valid_rows = len(prepared) - len(missing_data)
    average_penetration = (
        round(sum(penetration_values) / len(penetration_values), 1)
        if penetration_values
        else None
    )

    compa_ratios: list[CompaRatioRecord] = []
    for employee in range_penetration:
        if (
            employee.salary is not None
            and employee.range_min is not None
            and employee.range_max is not None
            and employee.compa_ratio is not None
        ):
            compa_ratios.append(
                CompaRatioRecord(
                    row_number=employee.row_number,
                    employee_id=employee.employee_id,
                    employee_name=employee.employee_name,
                    salary=employee.salary,
                    range_midpoint=round((employee.range_min + employee.range_max) / 2, 2),
                    compa_ratio=employee.compa_ratio,
                )
            )

    compa_ratios.sort(key=lambda item: item.compa_ratio)

    result = AnalysisResult(
        summary=AnalysisSummary(
            total_rows=len(prepared),
            valid_rows=valid_rows,
            below_minimum=len(below_minimum),
            above_maximum=len(above_maximum),
            duplicate_ids=len(duplicate_ids),
            missing_data=len(missing_data),
            compression_issues=len(compression),
            average_penetration=average_penetration,
            managers_below_reports=len(managers_below_reports),
            missing_bonus_targets=len(missing_bonus_targets),
            missing_salary_ranges=len(missing_salary_ranges),
            invalid_effective_dates=len(invalid_effective_dates),
            outlier_merit_increases=len(outlier_merit_increases),
            pay_equity_gaps=len(pay_equity.gender_gaps) + len(pay_equity.race_gaps),
        ),
        column_mapping=ColumnMapping(**mapping),
        detected_columns=list(df.columns),
        missing_required_columns=[],
        below_minimum=below_minimum,
        above_maximum=above_maximum,
        duplicate_ids=duplicate_ids,
        range_penetration=sorted(
            range_penetration,
            key=lambda item: item.range_penetration if item.range_penetration is not None else -1,
            reverse=True,
        ),
        compression=compression,
        missing_data=missing_data,
        managers_below_reports=managers_below_reports,
        missing_bonus_targets=missing_bonus_targets,
        missing_salary_ranges=missing_salary_ranges,
        invalid_effective_dates=invalid_effective_dates,
        outlier_merit_increases=outlier_merit_increases,
        compa_ratios=compa_ratios,
        pay_equity=pay_equity,
        insights=empty_insights(),
        warnings=warnings,
    )
    result.insights = build_insights(result)
    return result


def _find_duplicate_ids(df: pd.DataFrame, id_col: str) -> list[DuplicateGroup]:
    non_empty = df[df[id_col].notna() & (df[id_col].astype(str).str.strip() != "")]
    counts = non_empty[id_col].value_counts()
    duplicates = counts[counts > 1]

    groups: list[DuplicateGroup] = []
    for employee_id, count in duplicates.items():
        row_numbers = [int(idx) + 2 for idx in non_empty.index[non_empty[id_col] == employee_id]]
        groups.append(
            DuplicateGroup(
                employee_id=str(employee_id),
                count=int(count),
                rows=row_numbers,
            )
        )
    return sorted(groups, key=lambda group: group.count, reverse=True)


def _find_missing_salary_ranges(
    df: pd.DataFrame,
    mapping: dict[str, str | None],
) -> list[MissingSalaryRangeRecord]:
    id_col = mapping["employee_id"]
    min_col = mapping["range_min"]
    max_col = mapping["range_max"]
    name_col = mapping.get("employee_name")
    records: list[MissingSalaryRangeRecord] = []

    for index, row in df.iterrows():
        employee_id = _string_value(row.get(id_col))
        if not employee_id:
            continue

        missing_fields: list[str] = []
        if _float_value(row.get(min_col)) is None:
            missing_fields.append("range_min")
        if _float_value(row.get(max_col)) is None:
            missing_fields.append("range_max")

        if missing_fields:
            records.append(
                MissingSalaryRangeRecord(
                    row_number=int(index) + 2,
                    employee_id=employee_id,
                    employee_name=_string_value(row.get(name_col)) if name_col else None,
                    missing_fields=missing_fields,
                )
            )

    return records


def _find_missing_bonus_targets(
    df: pd.DataFrame,
    mapping: dict[str, str | None],
    warnings: list[str],
) -> list[MissingBonusTargetRecord]:
    bonus_col = mapping.get("bonus_target")
    if not bonus_col or bonus_col not in df.columns:
        warnings.append("No bonus target column detected. Skipping missing bonus target checks.")
        return []

    id_col = mapping["employee_id"]
    name_col = mapping.get("employee_name")
    records: list[MissingBonusTargetRecord] = []

    for index, row in df.iterrows():
        employee_id = _string_value(row.get(id_col))
        if not employee_id:
            continue

        bonus_value = row.get(bonus_col)
        if pd.isna(bonus_value) or str(bonus_value).strip() == "":
            records.append(
                MissingBonusTargetRecord(
                    row_number=int(index) + 2,
                    employee_id=employee_id,
                    employee_name=_string_value(row.get(name_col)) if name_col else None,
                )
            )

    return records


def _find_invalid_effective_dates(
    df: pd.DataFrame,
    mapping: dict[str, str | None],
    warnings: list[str],
) -> list[InvalidEffectiveDateRecord]:
    date_col = mapping.get("effective_date")
    if not date_col or date_col not in df.columns:
        warnings.append("No effective date column detected. Skipping effective date validation.")
        return []

    id_col = mapping["employee_id"]
    name_col = mapping.get("employee_name")
    today = pd.Timestamp(datetime.now().date())
    records: list[InvalidEffectiveDateRecord] = []

    for index, row in df.iterrows():
        employee_id = _string_value(row.get(id_col))
        raw_value = row.get(date_col)
        if employee_id is None and (pd.isna(raw_value) or str(raw_value).strip() == ""):
            continue

        parsed = pd.to_datetime(raw_value, errors="coerce")
        display_value = None if pd.isna(raw_value) else str(raw_value).strip()

        if pd.isna(raw_value) or str(raw_value).strip() == "":
            records.append(
                InvalidEffectiveDateRecord(
                    row_number=int(index) + 2,
                    employee_id=employee_id,
                    employee_name=_string_value(row.get(name_col)) if name_col else None,
                    effective_date=display_value,
                    reason="Missing effective date",
                )
            )
            continue

        if pd.isna(parsed):
            records.append(
                InvalidEffectiveDateRecord(
                    row_number=int(index) + 2,
                    employee_id=employee_id,
                    employee_name=_string_value(row.get(name_col)) if name_col else None,
                    effective_date=display_value,
                    reason="Effective date could not be parsed",
                )
            )
            continue

        if parsed > today:
            records.append(
                InvalidEffectiveDateRecord(
                    row_number=int(index) + 2,
                    employee_id=employee_id,
                    employee_name=_string_value(row.get(name_col)) if name_col else None,
                    effective_date=parsed.strftime("%Y-%m-%d"),
                    reason="Effective date is in the future",
                )
            )
            continue

        if parsed.year < 2000:
            records.append(
                InvalidEffectiveDateRecord(
                    row_number=int(index) + 2,
                    employee_id=employee_id,
                    employee_name=_string_value(row.get(name_col)) if name_col else None,
                    effective_date=parsed.strftime("%Y-%m-%d"),
                    reason="Effective date is unusually old (before 2000)",
                )
            )

    return records


def _normalize_merit_percent(value: float) -> float:
    if -1 <= value <= 1:
        return round(value * 100, 2)
    return round(value, 2)


def _find_outlier_merit_increases(
    df: pd.DataFrame,
    mapping: dict[str, str | None],
    warnings: list[str],
) -> list[OutlierMeritIncreaseRecord]:
    merit_col = mapping.get("merit_increase")
    if not merit_col or merit_col not in df.columns:
        warnings.append("No merit increase column detected. Skipping outlier merit checks.")
        return []

    id_col = mapping["employee_id"]
    name_col = mapping.get("employee_name")
    merit_values: list[tuple[int, str | None, str | None, float]] = []

    for index, row in df.iterrows():
        employee_id = _string_value(row.get(id_col))
        merit_raw = _float_value(row.get(merit_col))
        if merit_raw is None:
            continue
        merit_values.append(
            (
                int(index) + 2,
                employee_id,
                _string_value(row.get(name_col)) if name_col else None,
                _normalize_merit_percent(merit_raw),
            )
        )

    if len(merit_values) < 4:
        warnings.append(
            "Too few merit increase values to run outlier detection (need at least 4 populated rows)."
        )
        return []

    percents = pd.Series([value[3] for value in merit_values])
    q1 = float(percents.quantile(0.25))
    q3 = float(percents.quantile(0.75))
    iqr = q3 - q1
    lower_bound = q1 - MERIT_OUTLIER_IQR_MULTIPLIER * iqr
    upper_bound = q3 + MERIT_OUTLIER_IQR_MULTIPLIER * iqr

    records: list[OutlierMeritIncreaseRecord] = []
    for row_number, employee_id, employee_name, merit_percent in merit_values:
        if merit_percent < lower_bound or merit_percent > upper_bound:
            direction = "high" if merit_percent > upper_bound else "low"
            records.append(
                OutlierMeritIncreaseRecord(
                    row_number=row_number,
                    employee_id=employee_id,
                    employee_name=employee_name,
                    merit_increase=merit_percent,
                    reason=(
                        f"Unusually {direction} merit increase outside the expected range "
                        f"({lower_bound:.1f}% to {upper_bound:.1f}%)."
                    ),
                )
            )

    return sorted(records, key=lambda item: abs(item.merit_increase - percents.median()), reverse=True)


def _find_managers_below_reports(
    df: pd.DataFrame,
    mapping: dict[str, str | None],
    warnings: list[str],
) -> list[ManagerBelowReportIssue]:
    manager_col = mapping.get("manager_id")
    if not manager_col or manager_col not in df.columns:
        warnings.append(
            "No manager ID column detected. Skipping manager vs. direct report pay checks."
        )
        return []

    id_col = mapping["employee_id"]
    salary_col = mapping["salary"]
    name_col = mapping.get("employee_name")

    employee_lookup: dict[str, dict[str, Any]] = {}
    for index, row in df.iterrows():
        employee_id = _string_value(row.get(id_col))
        salary = _float_value(row.get(salary_col))
        if not employee_id or salary is None:
            continue
        employee_lookup[employee_id] = {
            "salary": salary,
            "name": _string_value(row.get(name_col)) if name_col else None,
            "row_number": int(index) + 2,
        }

    issues: list[ManagerBelowReportIssue] = []
    for index, row in df.iterrows():
        report_id = _string_value(row.get(id_col))
        manager_id = _string_value(row.get(manager_col))
        report_salary = _float_value(row.get(salary_col))

        if not report_id or not manager_id or report_salary is None:
            continue
        if manager_id == report_id:
            continue

        manager = employee_lookup.get(manager_id)
        if not manager:
            continue

        manager_salary = float(manager["salary"])
        if manager_salary < report_salary:
            issues.append(
                ManagerBelowReportIssue(
                    row_number=int(index) + 2,
                    manager_id=manager_id,
                    manager_name=manager.get("name"),
                    manager_salary=manager_salary,
                    report_id=report_id,
                    report_name=_string_value(row.get(name_col)) if name_col else None,
                    report_salary=report_salary,
                    pay_gap=round(report_salary - manager_salary, 2),
                )
            )

    return sorted(issues, key=lambda item: item.pay_gap, reverse=True)


def _find_compression_issues(
    df: pd.DataFrame,
    mapping: dict[str, str | None],
    warnings: list[str],
) -> list[CompressionIssue]:
    issues: list[CompressionIssue] = []
    level_col = mapping.get("job_level")
    salary_col = mapping["salary"]
    name_col = mapping.get("employee_name")
    id_col = mapping["employee_id"]

    valid = df[
        df[salary_col].notna()
        & df[id_col].notna()
        & (df[id_col].astype(str).str.strip() != "")
    ].copy()

    if level_col and level_col in valid.columns:
        valid = valid[valid[level_col].notna() & (valid[level_col].astype(str).str.strip() != "")]
        if valid.empty:
            warnings.append(
                "Job level column was detected but contains no usable values for compression analysis."
            )
            return issues

        valid["_level_sort"] = pd.to_numeric(valid[level_col], errors="coerce")
        if valid["_level_sort"].notna().any():
            valid = valid.sort_values("_level_sort")
            level_key = "_level_sort"
        else:
            valid = valid.sort_values(level_col.astype(str))
            level_key = level_col

        grouped = valid.groupby(level_key, sort=False)
        level_stats: list[tuple[Any, float, float, str]] = []
        for level, group in grouped:
            level_label = str(level)
            level_stats.append(
                (
                    level,
                    float(group[salary_col].median()),
                    float(group[salary_col].max()),
                    level_label,
                )
            )

        for index in range(len(level_stats) - 1):
            _, lower_median, lower_max, lower_label = level_stats[index]
            _, higher_median, _, higher_label = level_stats[index + 1]

            if lower_median >= higher_median:
                issues.append(
                    CompressionIssue(
                        issue_type="level_inversion",
                        description=(
                            f"Median pay in level {lower_label} (${lower_median:,.0f}) "
                            f"meets or exceeds level {higher_label} (${higher_median:,.0f})."
                        ),
                        lower_level=lower_label,
                        higher_level=higher_label,
                        lower_salary=lower_median,
                        higher_salary=higher_median,
                    )
                )

            if lower_max >= higher_median:
                issues.append(
                    CompressionIssue(
                        issue_type="overlap",
                        description=(
                            f"Top of range in level {lower_label} (${lower_max:,.0f}) "
                            f"overlaps median pay in level {higher_label} (${higher_median:,.0f})."
                        ),
                        lower_level=lower_label,
                        higher_level=higher_label,
                        lower_salary=lower_max,
                        higher_salary=higher_median,
                    )
                )

        for _, row in valid.iterrows():
            row_number = int(row.name) + 2
            if level_key == "_level_sort":
                current_level = row[level_key]
                higher_levels = valid[valid[level_key] > current_level]
            else:
                level_order = list(dict.fromkeys(valid[level_col].astype(str)))
                try:
                    current_index = level_order.index(str(row[level_col]))
                except ValueError:
                    continue
                higher_levels = valid[
                    valid[level_col].astype(str).isin(level_order[current_index + 1 :])
                ]

            if higher_levels.empty:
                continue

            lower_salary = float(row[salary_col])
            compressed = higher_levels[higher_levels[salary_col] <= lower_salary]
            for _, higher_row in compressed.iterrows():
                issues.append(
                    CompressionIssue(
                        issue_type="employee_inversion",
                        description=(
                            f"Employee earns ${lower_salary:,.0f}, which is equal to or above "
                            f"someone in a higher level ({higher_row[level_col]})."
                        ),
                        employee_id=str(row[id_col]),
                        employee_name=_string_value(row.get(name_col)) if name_col else None,
                        row_number=row_number,
                        lower_level=str(row[level_col]),
                        higher_level=str(higher_row[level_col]),
                        lower_salary=lower_salary,
                        higher_salary=float(higher_row[salary_col]),
                    )
                )
    else:
        warnings.append(
            "No job level column detected. Salary compression checks used pay-range overlap only."
        )
        grouped = valid.groupby([mapping["range_min"], mapping["range_max"]], dropna=False)
        range_groups = []
        for (range_min, range_max), group in grouped:
            if pd.isna(range_min) or pd.isna(range_max):
                continue
            range_groups.append(
                (
                    float(range_min),
                    float(range_max),
                    float(group[salary_col].median()),
                    str(group[name_col].iloc[0]) if name_col and name_col in group.columns else "Range group",
                )
            )

        range_groups.sort(key=lambda item: item[0])
        for index in range(len(range_groups) - 1):
            lower_min, lower_max, _, _ = range_groups[index]
            higher_min, _, _, _ = range_groups[index + 1]
            if lower_max >= higher_min:
                issues.append(
                    CompressionIssue(
                        issue_type="range_overlap",
                        description=(
                            f"Pay range ${lower_min:,.0f}-${lower_max:,.0f} overlaps the next range "
                            f"${higher_min:,.0f}-${float(range_groups[index + 1][1]):,.0f}."
                        ),
                        lower_level=f"${lower_min:,.0f}-${lower_max:,.0f}",
                        higher_level=f"${higher_min:,.0f}-${float(range_groups[index + 1][1]):,.0f}",
                        lower_salary=lower_max,
                        higher_salary=higher_min,
                    )
                )

    return issues[:100]
