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
    normalize_upload_dataframe,
    resolve_column_mapping,
)
from app.comp_tier1 import (
    build_compa_penetration_summary,
    build_currency_report,
    build_employee_type_report,
    build_geo_pay_policy_report,
    build_merit_matrix_report,
    build_midpoint_progression_report,
    build_new_hire_placement_report,
    build_range_structure_report,
    build_total_cash_comp_report,
    filter_core_workforce,
    is_excluded_employee_type,
)
from app.comp_extensions import (
    build_bonus_target_review,
    build_merit_by_department,
    build_peer_spread_report,
    build_post_merit_compa,
)
from app.cycle_readiness import (
    build_merit_budget_variance_report,
    build_penetration_distribution,
    build_performance_merit_report,
    build_review_queue,
)
from app.equity import build_pay_equity_report
from app.tenure_location import build_location_pay_report, build_tenure_report
from app.insights import build_insights, empty_insights
from app.models import (
    AnalysisOptions,
    AnalysisResult,
    AnalysisSummary,
    ColumnMapping,
    CompaRatioRecord,
    CompressionIssue,
    DuplicateGroup,
    EmployeeRecord,
    EquityGrantRecord,
    InvalidEffectiveDateRecord,
    ManagerBelowReportIssue,
    LocationPayReport,
    MissingBonusTargetRecord,
    MissingSalaryRangeRecord,
    MeritByDepartmentReport,
    MeritCompaFlag,
    BonusTargetReview,
    CompaPenetrationSummary,
    CurrencyReport,
    EmployeeTypeReport,
    GeoPayPolicyReport,
    MeritMatrixReport,
    MidpointProgressionReport,
    PenetrationDistribution,
    PerformanceMeritReport,
    ReviewQueueReport,
    MeritBudgetVarianceReport,
    NewHirePlacementReport,
    PeerSpreadReport,
    PostMeritCompaReport,
    RangeStructureReport,
    TotalCashCompReport,
    NewHireMeritFlag,
    OutlierMeritIncreaseRecord,
    PayEquityReport,
    PreviewResponse,
    TenureReport,
    UnusualCompChangeRecord,
)

MERIT_OUTLIER_IQR_MULTIPLIER = 1.5
PLANNED_EFFECTIVE_HORIZON_MONTHS = 18
NEW_HIRE_TENURE_DAYS = 90
NEW_HIRE_RANGE_DAYS = 365
LOW_COMPA_THRESHOLD = 90.0
HIGH_COMPA_THRESHOLD = 110.0
MERIT_COMPA_SPREAD = 1.0


def _looks_like_export_file(content: bytes, filename: str) -> bool:
    lower_name = filename.lower()
    if "shiftworkshr-analysis" in lower_name or "workshifthhr-analysis" in lower_name or "analysis-export" in lower_name:
        return True
    preview = content[:800].decode("utf-8", errors="ignore").upper()
    return "EXECUTIVE SUMMARY" in preview and "BUDGET IMPACT" in preview


def _estimate_skipped_csv_rows(text: str, parsed_rows: int) -> int:
    data_lines = [line for line in text.splitlines() if line.strip()]
    if len(data_lines) <= 1:
        return 0
    return max(0, len(data_lines) - 1 - parsed_rows)


def _read_csv(content: bytes, filename: str = "upload.csv") -> tuple[pd.DataFrame, int]:
    if _looks_like_export_file(content, filename):
        raise ValueError(
            "This file looks like a ShiftWorksHR results export, not an employee compensation "
            "spreadsheet. Upload your original HR comp file (employee ID, salary, range min/max, "
            "gender, race, etc.) — not a downloaded analysis report."
        )

    if content.startswith(b"PK\x03\x04"):
        raise ValueError(
            "This file appears to be an Excel workbook saved with a .csv extension. "
            "Upload the .xlsx file directly instead."
        )

    if content.startswith(b"\xff\xfe") or content.startswith(b"\xfe\xff"):
        encodings = ["utf-16", "utf-16-le", "utf-16-be"]
    else:
        encodings = ["utf-8-sig", "utf-8", "latin-1", "cp1252"]

    skipped_rows = 0

    for encoding in encodings:
        try:
            text = content.decode(encoding)
        except UnicodeDecodeError:
            continue

        for separator in [",", ";", "\t"]:
            try:
                df = pd.read_csv(
                    io.StringIO(text),
                    sep=separator,
                    engine="python",
                    on_bad_lines="skip",
                )
            except Exception:
                continue
            if len(df.columns) >= 2:
                df.columns = [str(col).strip() for col in df.columns]
                skipped_rows = _estimate_skipped_csv_rows(text, len(df))
                return df, skipped_rows

        header_index = _find_compensation_header_row(text)
        if header_index is not None:
            subset = "\n".join(text.splitlines()[header_index:])
            for separator in [",", ";", "\t"]:
                try:
                    df = pd.read_csv(
                        io.StringIO(subset),
                        sep=separator,
                        engine="python",
                        on_bad_lines="skip",
                    )
                except Exception:
                    continue
                if len(df.columns) >= 4:
                    df.columns = [str(col).strip() for col in df.columns]
                    skipped_rows = _estimate_skipped_csv_rows(subset, len(df))
                    return df, skipped_rows

    raise ValueError(
        "Could not read this CSV. Upload your original employee compensation spreadsheet "
        "(not a ShiftWorksHR export). In Excel: File → Save As → CSV UTF-8, or upload .xlsx."
    )


def _find_compensation_header_row(text: str) -> int | None:
    for index, line in enumerate(text.splitlines()):
        normalized = line.strip().lower().replace("_", " ")
        if not normalized:
            continue
        has_id = any(token in normalized for token in ("employee id", "emp id", "ee id", "employee number"))
        has_salary = any(token in normalized for token in ("salary", "base pay", "base salary", "current salary"))
        has_range = "range" in normalized or ("min" in normalized and "max" in normalized)
        if has_id and has_salary and has_range:
            return index
    return None


def read_upload(content: bytes, filename: str, sheet_name: str | None = None) -> tuple[pd.DataFrame, list[str], list[str]]:
    read_warnings: list[str] = []
    lower_name = filename.lower()
    if lower_name.endswith(".csv"):
        df, skipped_rows = _read_csv(content, filename)
        if skipped_rows:
            read_warnings.append(
                f"Skipped {skipped_rows} malformed CSV row(s) while reading the file."
            )
        df, normalize_warnings = normalize_upload_dataframe(df)
        read_warnings.extend(normalize_warnings)
        return df, ["CSV"], read_warnings

    workbook = pd.ExcelFile(io.BytesIO(content))
    sheet_names = workbook.sheet_names
    selected = sheet_name if sheet_name in sheet_names else sheet_names[0]
    df = pd.read_excel(workbook, sheet_name=selected)
    df.columns = [str(col).strip() for col in df.columns]
    df, normalize_warnings = normalize_upload_dataframe(df)
    read_warnings.extend(normalize_warnings)
    return df, sheet_names, read_warnings


def preview_file(content: bytes, filename: str, sheet_name: str | None = None) -> PreviewResponse:
    df, sheet_names, _ = read_upload(content, filename, sheet_name)
    mapping = detect_column_mapping(list(df.columns), df)
    preview_rows = df.head(5).fillna("").astype(str).to_dict(orient="records")
    return PreviewResponse(
        columns=list(df.columns),
        suggested_mapping=ColumnMapping(**mapping),
        preview_rows=preview_rows,
        sheet_names=sheet_names,
        total_rows=len(df),
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


def _calculate_compa_ratio(
    salary: float,
    range_min: float,
    range_max: float,
    range_midpoint: float | None = None,
) -> float | None:
    if range_midpoint is not None and range_midpoint > 0:
        midpoint = range_midpoint
    else:
        midpoint = (range_min + range_max) / 2
    if midpoint <= 0:
        return None
    return round((salary / midpoint) * 100, 1)


def _row_midpoint(row: pd.Series, mapping: dict[str, str | None]) -> float | None:
    mid_col = mapping.get("range_midpoint")
    if mid_col and mid_col in row.index:
        midpoint = _float_value(row.get(mid_col))
        if midpoint is not None and midpoint > 0:
            return midpoint
    range_min = _float_value(_value(row, mapping.get("range_min")))
    range_max = _float_value(_value(row, mapping.get("range_max")))
    if range_min is not None and range_max is not None and range_min <= range_max:
        return round((range_min + range_max) / 2, 2)
    return None


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
        midpoint_override = _float_value(_value(row, mapping.get("range_midpoint")))
        compa_ratio = _calculate_compa_ratio(
            salary,
            range_min,
            range_max,
            midpoint_override,
        )
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
        new_hire_merit_flags=[],
        merit_compa_flags=[],
        unusual_comp_changes=[],
        equity_grants=[],
        compa_ratios=[],
        pay_equity=PayEquityReport(available=False),
        tenure=TenureReport(available=False),
        location_pay=LocationPayReport(available=False),
        merit_by_department=MeritByDepartmentReport(available=False),
        bonus_target_review=BonusTargetReview(available=False),
        post_merit_compa=PostMeritCompaReport(available=False),
        peer_spread=PeerSpreadReport(available=False),
        merit_matrix=MeritMatrixReport(available=False),
        range_structure=RangeStructureReport(available=False),
        compa_penetration_summary=CompaPenetrationSummary(available=False),
        total_cash_comp=TotalCashCompReport(available=False),
        new_hire_placement=NewHirePlacementReport(available=False),
        geo_pay_policy=GeoPayPolicyReport(available=False),
        currency_report=CurrencyReport(available=False),
        employee_type_report=EmployeeTypeReport(available=False),
        midpoint_progression=MidpointProgressionReport(available=False),
        penetration_distribution=PenetrationDistribution(available=False),
        review_queue=ReviewQueueReport(available=False),
        merit_budget_variance=MeritBudgetVarianceReport(available=False),
        performance_merit=PerformanceMeritReport(available=False),
        excluded_employee_ids=[],
        insights=empty_insights(),
        warnings=warnings,
    )


def _prepare_dataframe(
    df: pd.DataFrame,
    mapping_override: ColumnMapping | None = None,
) -> tuple[pd.DataFrame, dict[str, str | None], list[str]]:
    override_dict = None
    if mapping_override:
        override_dict = (
            mapping_override.model_dump()
            if hasattr(mapping_override, "model_dump")
            else dict(mapping_override)
        )
    detected = resolve_column_mapping(list(df.columns), df, override_dict)

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

    hire_col = detected.get("hire_date")
    if hire_col and hire_col in prepared.columns:
        prepared[hire_col] = pd.to_datetime(prepared[hire_col], errors="coerce")

    return prepared, detected, []


def analyze_file(
    content: bytes,
    filename: str,
    sheet_name: str | None = None,
    mapping_override: ColumnMapping | None = None,
    options: AnalysisOptions | None = None,
) -> AnalysisResult:
    analysis_options = options or AnalysisOptions()
    df, _, read_warnings = read_upload(content, filename, sheet_name)
    prepared, mapping, missing_required = _prepare_dataframe(df, mapping_override)
    warnings: list[str] = list(read_warnings)

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

        if (
            salary is not None
            and range_min is not None
            and range_max is not None
            and range_min > range_max
        ):
            invalid_record = _employee_record(
                row,
                row_number,
                mapping,
                penetration=None,
                missing_fields=["invalid_range"],
            )
            missing_data.append(invalid_record)
            continue

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
    outlier_merit_increases = _find_outlier_merit_increases(
        prepared,
        mapping,
        warnings,
        iqr_multiplier=analysis_options.merit_iqr_multiplier,
    )
    new_hire_merit_flags = _find_new_hire_merit_flags(prepared, mapping, warnings)
    merit_compa_flags = _find_merit_compa_flags(range_penetration, mapping, warnings)
    unusual_comp_changes = _find_unusual_comp_changes(
        prepared,
        mapping,
        warnings,
        iqr_multiplier=analysis_options.merit_iqr_multiplier,
    )
    equity_grants = _build_equity_grant_records(prepared, mapping, unusual_comp_changes, warnings)
    equity_grant_outliers = sum(1 for record in equity_grants if record.is_outlier)
    managers_below_reports = _find_managers_below_reports(prepared, mapping, warnings)
    pay_equity = build_pay_equity_report(prepared, mapping, warnings)
    tenure = build_tenure_report(prepared, mapping, warnings)
    location_pay = build_location_pay_report(prepared, mapping, warnings)

    core_prepared = filter_core_workforce(prepared, mapping)
    type_col = mapping.get("employee_type")
    if type_col and type_col in prepared.columns:
        excluded_count = sum(
            1
            for _, row in prepared.iterrows()
            if is_excluded_employee_type(_string_value(row.get(type_col)))
        )
        if excluded_count:
            warnings.append(
                f"{excluded_count} intern/contractor/temporary employees excluded from "
                "aggregate merit and peer-spread calculations."
            )
    core_range_penetration = [
        employee
        for employee in range_penetration
        if employee.row_number
        not in {
            int(index) + 2
            for index, row in prepared.iterrows()
            if type_col
            and is_excluded_employee_type(_string_value(row.get(type_col)))
        }
    ] if type_col and type_col in prepared.columns else range_penetration

    merit_by_department = build_merit_by_department(core_range_penetration)
    bonus_target_review = build_bonus_target_review(prepared, mapping, warnings)
    post_merit_compa = build_post_merit_compa(range_penetration, mapping)
    peer_spread = build_peer_spread_report(core_prepared, mapping, warnings)
    merit_matrix = build_merit_matrix_report(range_penetration)
    range_structure = build_range_structure_report(prepared, mapping)
    compa_penetration_summary = build_compa_penetration_summary(range_penetration)
    total_cash_comp = build_total_cash_comp_report(prepared, mapping, range_penetration)
    new_hire_placement = build_new_hire_placement_report(
        prepared, mapping, range_penetration, below_minimum
    )
    geo_pay_policy = build_geo_pay_policy_report(prepared, mapping)
    currency_report = build_currency_report(prepared, mapping, range_penetration)
    employee_type_report = build_employee_type_report(prepared, mapping)
    midpoint_progression = build_midpoint_progression_report(prepared, mapping)
    penetration_distribution = build_penetration_distribution(range_penetration)
    performance_merit = build_performance_merit_report(prepared, mapping, range_penetration)

    excluded_employee_ids: list[str] = []
    if type_col and type_col in prepared.columns:
        id_col = mapping["employee_id"]
        for _, row in prepared.iterrows():
            if is_excluded_employee_type(_string_value(row.get(type_col))):
                employee_id = _string_value(row.get(id_col))
                if employee_id:
                    excluded_employee_ids.append(employee_id)

    valid_rows = len(prepared) - len(missing_data)
    average_penetration = (
        round(sum(penetration_values) / len(penetration_values), 1)
        if penetration_values
        else None
    )

    compa_ratios: list[CompaRatioRecord] = []
    row_lookup = {int(index) + 2: row for index, row in prepared.iterrows()}
    for employee in range_penetration:
        if (
            employee.salary is not None
            and employee.range_min is not None
            and employee.range_max is not None
            and employee.compa_ratio is not None
        ):
            source_row = row_lookup.get(employee.row_number)
            midpoint = (
                _row_midpoint(source_row, mapping)
                if source_row is not None
                else round((employee.range_min + employee.range_max) / 2, 2)
            )
            compa_ratios.append(
                CompaRatioRecord(
                    row_number=employee.row_number,
                    employee_id=employee.employee_id,
                    employee_name=employee.employee_name,
                    salary=employee.salary,
                    range_midpoint=midpoint or round((employee.range_min + employee.range_max) / 2, 2),
                    compa_ratio=employee.compa_ratio,
                )
            )

    compa_ratios.sort(key=lambda item: item.compa_ratio)

    new_hires_below_range = _count_new_hires_below_minimum(
        below_minimum, prepared, mapping
    )

    result = AnalysisResult(
        summary=AnalysisSummary(
            total_rows=len(prepared),
            valid_rows=valid_rows,
            below_minimum=len(below_minimum),
            above_maximum=len(above_maximum),
            new_hires_below_range=new_hires_below_range,
            duplicate_ids=len(duplicate_ids),
            missing_data=len(missing_data),
            compression_issues=len(compression),
            average_penetration=average_penetration,
            managers_below_reports=len(managers_below_reports),
            missing_bonus_targets=len(missing_bonus_targets),
            missing_salary_ranges=len(missing_salary_ranges),
            invalid_effective_dates=len(invalid_effective_dates),
            outlier_merit_increases=len(outlier_merit_increases),
            new_hire_merit_flags=len(new_hire_merit_flags),
            merit_compa_flags=len(merit_compa_flags),
            unusual_comp_changes=len(unusual_comp_changes),
            equity_grant_outliers=equity_grant_outliers,
            pay_equity_gaps=len(pay_equity.gender_gaps) + len(pay_equity.race_gaps),
            tenure_pay_flags=len(tenure.flags),
            location_pay_gaps=len(location_pay.location_gaps),
            bonus_target_outliers=len(bonus_target_review.outliers),
            peer_spread_flags=len(peer_spread.flags),
            post_merit_compa_rows=len(post_merit_compa.employees),
            merit_matrix_flags=len(merit_matrix.flags),
            range_structure_issues=len(range_structure.issues),
            new_hire_placement_flags=new_hire_placement.below_range_count,
            geo_pay_policy_flags=len(geo_pay_policy.flags),
            midpoint_progression_issues=len(midpoint_progression.issues),
            review_queue_items=0,
            performance_merit_flags=len(performance_merit.flags),
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
        new_hire_merit_flags=new_hire_merit_flags,
        merit_compa_flags=merit_compa_flags,
        unusual_comp_changes=unusual_comp_changes,
        equity_grants=equity_grants,
        compa_ratios=compa_ratios,
        pay_equity=pay_equity,
        tenure=tenure,
        location_pay=location_pay,
        merit_by_department=merit_by_department,
        bonus_target_review=bonus_target_review,
        post_merit_compa=post_merit_compa,
        peer_spread=peer_spread,
        merit_matrix=merit_matrix,
        range_structure=range_structure,
        compa_penetration_summary=compa_penetration_summary,
        total_cash_comp=total_cash_comp,
        new_hire_placement=new_hire_placement,
        geo_pay_policy=geo_pay_policy,
        currency_report=currency_report,
        employee_type_report=employee_type_report,
        midpoint_progression=midpoint_progression,
        penetration_distribution=penetration_distribution,
        review_queue=ReviewQueueReport(available=False),
        merit_budget_variance=MeritBudgetVarianceReport(available=False),
        performance_merit=performance_merit,
        excluded_employee_ids=excluded_employee_ids,
        insights=empty_insights(),
        warnings=warnings,
    )
    result.insights = build_insights(result)
    result.review_queue = build_review_queue(result)
    result.merit_budget_variance = build_merit_budget_variance_report(result)
    result.summary.review_queue_items = result.review_queue.total_items
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
    horizon = today + pd.DateOffset(months=PLANNED_EFFECTIVE_HORIZON_MONTHS)
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

        if parsed > horizon:
            records.append(
                InvalidEffectiveDateRecord(
                    row_number=int(index) + 2,
                    employee_id=employee_id,
                    employee_name=_string_value(row.get(name_col)) if name_col else None,
                    effective_date=parsed.strftime("%Y-%m-%d"),
                    reason=(
                        f"Effective date is more than {PLANNED_EFFECTIVE_HORIZON_MONTHS} months "
                        "in the future"
                    ),
                )
            )
            continue

        if parsed > today:
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
    iqr_multiplier: float = MERIT_OUTLIER_IQR_MULTIPLIER,
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
    lower_bound = q1 - iqr_multiplier * iqr
    upper_bound = q3 + iqr_multiplier * iqr

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


def _find_new_hire_merit_flags(
    df: pd.DataFrame,
    mapping: dict[str, str | None],
    warnings: list[str],
) -> list[NewHireMeritFlag]:
    hire_col = mapping.get("hire_date")
    merit_col = mapping.get("merit_increase")
    if not hire_col or hire_col not in df.columns:
        return []
    if not merit_col or merit_col not in df.columns:
        warnings.append("No merit increase column detected. Skipping new-hire merit checks.")
        return []

    id_col = mapping["employee_id"]
    name_col = mapping.get("employee_name")
    today = pd.Timestamp(datetime.now().date())
    records: list[NewHireMeritFlag] = []

    for index, row in df.iterrows():
        employee_id = _string_value(row.get(id_col))
        hire_raw = row.get(hire_col)
        merit_raw = _float_value(row.get(merit_col))
        if pd.isna(hire_raw) or merit_raw is None:
            continue

        parsed = pd.to_datetime(hire_raw, errors="coerce")
        if pd.isna(parsed):
            continue

        tenure_days = int((today - parsed).days)
        if tenure_days < 0 or tenure_days > NEW_HIRE_TENURE_DAYS:
            continue

        merit_percent = _normalize_merit_percent(merit_raw)
        if merit_percent <= 0:
            continue

        records.append(
            NewHireMeritFlag(
                row_number=int(index) + 2,
                employee_id=employee_id,
                employee_name=_string_value(row.get(name_col)) if name_col else None,
                hire_date=parsed.strftime("%Y-%m-%d"),
                tenure_days=tenure_days,
                merit_increase=merit_percent,
                reason=(
                    f"Employee hired within {NEW_HIRE_TENURE_DAYS} days has a "
                    f"{merit_percent}% merit increase — verify eligibility."
                ),
            )
        )

    return records


def _find_percent_outliers(
    df: pd.DataFrame,
    mapping: dict[str, str | None],
    column_key: str,
    change_type: str,
    warnings: list[str],
    iqr_multiplier: float,
    min_rows: int = 4,
) -> list[UnusualCompChangeRecord]:
    column = mapping.get(column_key)
    if not column or column not in df.columns:
        return []

    id_col = mapping["employee_id"]
    name_col = mapping.get("employee_name")
    values: list[tuple[int, str | None, str | None, float]] = []

    for index, row in df.iterrows():
        raw = _float_value(row.get(column))
        if raw is None:
            continue
        values.append(
            (
                int(index) + 2,
                _string_value(row.get(id_col)),
                _string_value(row.get(name_col)) if name_col else None,
                _normalize_merit_percent(raw),
            )
        )

    if len(values) < min_rows:
        return []

    percents = pd.Series([value[3] for value in values])
    q1 = float(percents.quantile(0.25))
    q3 = float(percents.quantile(0.75))
    iqr = q3 - q1
    lower_bound = q1 - iqr_multiplier * iqr
    upper_bound = q3 + iqr_multiplier * iqr

    records: list[UnusualCompChangeRecord] = []
    for row_number, employee_id, employee_name, percent in values:
        if percent < lower_bound or percent > upper_bound:
            direction = "high" if percent > upper_bound else "low"
            records.append(
                UnusualCompChangeRecord(
                    row_number=row_number,
                    employee_id=employee_id,
                    employee_name=employee_name,
                    change_type=change_type,
                    value_percent=percent,
                    reason=(
                        f"Unusually {direction} {change_type} change outside the expected range "
                        f"({lower_bound:.1f}% to {upper_bound:.1f}%)."
                    ),
                )
            )

    return records


def _find_merit_compa_flags(
    range_penetration: list[EmployeeRecord],
    mapping: dict[str, str | None],
    warnings: list[str],
) -> list[MeritCompaFlag]:
    merit_col = mapping.get("merit_increase")
    if not merit_col:
        return []

    eligible = [
        employee
        for employee in range_penetration
        if employee.merit_increase is not None and employee.compa_ratio is not None
    ]
    if len(eligible) < 4:
        if eligible:
            warnings.append(
                "Merit vs. compa alignment checks require at least 4 employees with both "
                "merit increase and compa-ratio data."
            )
        return []

    average_merit = sum(employee.merit_increase for employee in eligible) / len(eligible)
    records: list[MeritCompaFlag] = []

    for employee in eligible:
        merit = employee.merit_increase
        compa = employee.compa_ratio
        assert merit is not None and compa is not None

        if compa <= LOW_COMPA_THRESHOLD and merit < average_merit - MERIT_COMPA_SPREAD:
            records.append(
                MeritCompaFlag(
                    row_number=employee.row_number,
                    employee_id=employee.employee_id,
                    employee_name=employee.employee_name,
                    department=employee.department,
                    compa_ratio=compa,
                    merit_increase=merit,
                    file_average_merit=round(average_merit, 2),
                    flag_type="under_correction",
                    reason=(
                        f"Compa-ratio {compa}% is below {LOW_COMPA_THRESHOLD:.0f}% but merit "
                        f"({merit}%) is below the file average ({average_merit:.1f}%) — "
                        "consider a larger increase to close the gap."
                    ),
                )
            )
        elif compa >= HIGH_COMPA_THRESHOLD and merit > average_merit + MERIT_COMPA_SPREAD:
            records.append(
                MeritCompaFlag(
                    row_number=employee.row_number,
                    employee_id=employee.employee_id,
                    employee_name=employee.employee_name,
                    department=employee.department,
                    compa_ratio=compa,
                    merit_increase=merit,
                    file_average_merit=round(average_merit, 2),
                    flag_type="over_rewarding",
                    reason=(
                        f"Compa-ratio {compa}% is above {HIGH_COMPA_THRESHOLD:.0f}% but merit "
                        f"({merit}%) exceeds the file average ({average_merit:.1f}%) — "
                        "verify alignment with pay-for-performance guidance."
                    ),
                )
            )

    return sorted(records, key=lambda item: item.compa_ratio)


def _count_new_hires_below_minimum(
    below_minimum: list[EmployeeRecord],
    df: pd.DataFrame,
    mapping: dict[str, str | None],
) -> int:
    hire_col = mapping.get("hire_date")
    if not hire_col or hire_col not in df.columns or not below_minimum:
        return 0

    below_rows = {employee.row_number for employee in below_minimum}
    today = pd.Timestamp(datetime.now().date())
    count = 0

    for index, row in df.iterrows():
        row_number = int(index) + 2
        if row_number not in below_rows:
            continue
        parsed = pd.to_datetime(row.get(hire_col), errors="coerce")
        if pd.isna(parsed):
            continue
        if 0 <= (today - parsed).days <= NEW_HIRE_RANGE_DAYS:
            count += 1

    return count


def _find_unusual_comp_changes(
    df: pd.DataFrame,
    mapping: dict[str, str | None],
    warnings: list[str],
    iqr_multiplier: float = MERIT_OUTLIER_IQR_MULTIPLIER,
) -> list[UnusualCompChangeRecord]:
    records: list[UnusualCompChangeRecord] = []
    records.extend(
        _find_percent_outliers(
            df,
            mapping,
            "promotion_increase",
            "promotion",
            warnings,
            iqr_multiplier,
        )
    )
    records.extend(
        _find_percent_outliers(
            df,
            mapping,
            "equity_grant",
            "equity",
            warnings,
            iqr_multiplier,
        )
    )
    return sorted(records, key=lambda item: item.value_percent, reverse=True)


def _build_equity_grant_records(
    df: pd.DataFrame,
    mapping: dict[str, str | None],
    unusual_comp_changes: list[UnusualCompChangeRecord],
    warnings: list[str],
) -> list[EquityGrantRecord]:
    column = mapping.get("equity_grant")
    if not column or column not in df.columns:
        return []

    id_col = mapping["employee_id"]
    name_col = mapping.get("employee_name")
    dept_col = mapping.get("department")
    outlier_by_row = {
        record.row_number: record
        for record in unusual_comp_changes
        if record.change_type == "equity"
    }

    records: list[EquityGrantRecord] = []
    for index, row in df.iterrows():
        employee_id = _string_value(row.get(id_col))
        if not employee_id:
            continue

        raw = _float_value(row.get(column))
        if raw is None:
            continue

        row_number = int(index) + 2
        percent = _normalize_merit_percent(raw)
        outlier = outlier_by_row.get(row_number)
        records.append(
            EquityGrantRecord(
                row_number=row_number,
                employee_id=employee_id,
                employee_name=_string_value(row.get(name_col)) if name_col else None,
                department=_string_value(row.get(dept_col)) if dept_col else None,
                equity_grant=percent,
                is_outlier=outlier is not None,
                reason=outlier.reason if outlier else None,
            )
        )

    if not records:
        warnings.append(
            "Equity grant column is mapped but no populated values were found in the file."
        )
    elif len(records) < 4:
        row_label = "row" if len(records) == 1 else "rows"
        warnings.append(
            f"Equity grant column has {len(records)} populated {row_label} — "
            "statistical outlier detection requires at least 4."
        )

    return sorted(records, key=lambda item: item.equity_grant, reverse=True)


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

    return issues
