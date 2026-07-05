from __future__ import annotations

import re
from datetime import datetime
from typing import Any

import pandas as pd

from app.models import (
    CompaPenetrationSummary,
    CurrencyGroupStats,
    CurrencyReport,
    EmployeeTypeCount,
    EmployeeTypeReport,
    GeoPayPolicyFlag,
    GeoPayPolicyReport,
    GeoZoneMedian,
    GroupCompaStats,
    LevelMidpointRow,
    LevelRangeSummary,
    MeritMatrixBand,
    MeritMatrixFlag,
    MeritMatrixReport,
    MidpointProgressionIssue,
    MidpointProgressionReport,
    NewHirePlacementRecord,
    NewHirePlacementReport,
    RangeStructureIssue,
    RangeStructureReport,
    TotalCashCompRecord,
    TotalCashCompReport,
)

NEW_HIRE_LOOKBACK_DAYS = 365
RANGE_WIDTH_IQR = 1.5
GEO_DIFF_TOLERANCE = 2.0

EXCLUDED_EMPLOYEE_TYPES = {
    "intern",
    "internship",
    "contractor",
    "consultant",
    "contingent",
    "temp",
    "temporary",
    "seasonal",
}

DEFAULT_MERIT_MATRIX_BANDS: list[MeritMatrixBand] = [
    MeritMatrixBand(label="Below 85%", compa_min=0, compa_max=85, merit_min=3.0, merit_max=6.0),
    MeritMatrixBand(label="85–95%", compa_min=85, compa_max=95, merit_min=2.5, merit_max=4.5),
    MeritMatrixBand(label="95–105%", compa_min=95, compa_max=105, merit_min=1.5, merit_max=3.5),
    MeritMatrixBand(label="105–115%", compa_min=105, compa_max=115, merit_min=0, merit_max=2.5),
    MeritMatrixBand(label="Above 115%", compa_min=115, compa_max=999, merit_min=0, merit_max=1.5),
]

FX_TO_USD: dict[str, float] = {
    "USD": 1.0,
    "US": 1.0,
    "EUR": 1.08,
    "GBP": 1.27,
    "CAD": 0.74,
    "AUD": 0.65,
    "CHF": 1.12,
    "JPY": 0.0067,
    "INR": 0.012,
    "MXN": 0.058,
    "SGD": 0.74,
    "HKD": 0.13,
    "NZD": 0.60,
    "SEK": 0.095,
    "NOK": 0.092,
    "DKK": 0.14,
    "CNY": 0.14,
    "BRL": 0.19,
    "ILS": 0.27,
    "KRW": 0.00075,
}


def _string_value(value: Any) -> str | None:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return None
    text = str(value).strip()
    if not text or text.lower() in {"nan", "none", "n/a", "na"}:
        return None
    return text


def _float_value(value: Any) -> float | None:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _normalize_percent(value: float) -> float:
    if abs(value) <= 1:
        return round(value * 100, 2)
    return round(value, 2)


def _level_sort_key(level: str) -> tuple[int, str]:
    numbers = re.findall(r"\d+", level)
    if numbers:
        return (int(numbers[0]), level.lower())
    keyword_ranks = {
        "intern": 0,
        "entry": 1,
        "associate": 2,
        "analyst": 3,
        "senior": 4,
        "staff": 5,
        "principal": 6,
        "lead": 6,
        "manager": 7,
        "director": 8,
        "vp": 9,
        "svp": 10,
        "evp": 11,
    }
    lowered = level.lower()
    for keyword, rank in keyword_ranks.items():
        if keyword in lowered:
            return (rank, lowered)
    return (500, lowered)


def is_excluded_employee_type(employee_type: str | None) -> bool:
    if not employee_type:
        return False
    normalized = re.sub(r"[^a-z0-9 ]", " ", employee_type.lower()).strip()
    tokens = normalized.split()
    for token in tokens:
        if token in EXCLUDED_EMPLOYEE_TYPES:
            return True
    return normalized in EXCLUDED_EMPLOYEE_TYPES


def filter_core_workforce(df: pd.DataFrame, mapping: dict[str, str | None]) -> pd.DataFrame:
    type_col = mapping.get("employee_type")
    if not type_col or type_col not in df.columns:
        return df
    mask = df[type_col].apply(
        lambda value: not is_excluded_employee_type(_string_value(value))
    )
    return df[mask].copy()


def _matrix_band_for_compa(compa: float, bands: list[MeritMatrixBand]) -> MeritMatrixBand | None:
    for band in bands:
        if band.compa_min <= compa < band.compa_max:
            return band
    return bands[-1] if bands else None


def build_merit_matrix_report(
    range_penetration: list[Any],
    bands: list[MeritMatrixBand] | None = None,
) -> MeritMatrixReport:
    matrix_bands = bands or DEFAULT_MERIT_MATRIX_BANDS
    flags: list[MeritMatrixFlag] = []

    for employee in range_penetration:
        if employee.merit_increase is None or employee.compa_ratio is None:
            continue
        band = _matrix_band_for_compa(employee.compa_ratio, matrix_bands)
        if band is None:
            continue
        merit = employee.merit_increase
        if merit < band.merit_min - 0.05 or merit > band.merit_max + 0.05:
            if merit < band.merit_min:
                reason = (
                    f"Merit {merit}% is below the {band.label} compa band guideline "
                    f"({band.merit_min}–{band.merit_max}%)."
                )
            else:
                reason = (
                    f"Merit {merit}% exceeds the {band.label} compa band guideline "
                    f"({band.merit_min}–{band.merit_max}%)."
                )
            flags.append(
                MeritMatrixFlag(
                    row_number=employee.row_number,
                    employee_id=employee.employee_id,
                    employee_name=employee.employee_name,
                    department=employee.department,
                    job_level=employee.job_level,
                    compa_ratio=employee.compa_ratio,
                    merit_increase=merit,
                    matrix_band=band.label,
                    expected_merit_min=band.merit_min,
                    expected_merit_max=band.merit_max,
                    reason=reason,
                )
            )

    return MeritMatrixReport(
        available=bool(flags) or any(
            employee.merit_increase is not None and employee.compa_ratio is not None
            for employee in range_penetration
        ),
        flags=sorted(flags, key=lambda item: item.compa_ratio),
        bands=matrix_bands,
        disclaimer=(
            "Merit matrix checks compare uploaded merit increases to default compa-ratio bands. "
            "Adjust guidelines in your comp policy as needed — these are directional QA flags only."
        ),
    )


def _collect_level_ranges(
    df: pd.DataFrame,
    mapping: dict[str, str | None],
) -> dict[str, LevelRangeSummary]:
    level_col = mapping.get("job_level")
    min_col = mapping["range_min"]
    max_col = mapping["range_max"]
    mid_col = mapping.get("range_midpoint")
    if not level_col or level_col not in df.columns:
        return {}

    groups: dict[str, list[dict[str, float | None]]] = {}
    for _, row in df.iterrows():
        level = _string_value(row.get(level_col))
        if not level:
            continue
        range_min = _float_value(row.get(min_col))
        range_max = _float_value(row.get(max_col))
        if range_min is None or range_max is None:
            continue
        range_mid = _float_value(row.get(mid_col)) if mid_col else None
        if range_mid is None:
            range_mid = round((range_min + range_max) / 2, 2)
        groups.setdefault(level, []).append(
            {"min": range_min, "mid": range_mid, "max": range_max}
        )

    summaries: dict[str, LevelRangeSummary] = {}
    for level, ranges in groups.items():
        mins = [item["min"] for item in ranges if item["min"] is not None]
        mids = [item["mid"] for item in ranges if item["mid"] is not None]
        maxs = [item["max"] for item in ranges if item["max"] is not None]
        if not mins or not maxs:
            continue
        representative_min = float(pd.Series(mins).mode().iloc[0])
        representative_mid = float(pd.Series(mids).mode().iloc[0]) if mids else None
        representative_max = float(pd.Series(maxs).mode().iloc[0])
        width = representative_max - representative_min
        width_percent = round((width / representative_mid) * 100, 1) if representative_mid else None
        summaries[level] = LevelRangeSummary(
            job_level=level,
            range_min=representative_min,
            range_mid=representative_mid,
            range_max=representative_max,
            range_width=round(width, 2),
            range_width_percent=width_percent,
            employee_count=len(ranges),
        )
    return summaries


def build_range_structure_report(
    df: pd.DataFrame,
    mapping: dict[str, str | None],
) -> RangeStructureReport:
    level_ranges = _collect_level_ranges(df, mapping)
    if not level_ranges:
        return RangeStructureReport(
            available=False,
            disclaimer="Include Job Level and salary ranges to validate range structure.",
        )

    issues: list[RangeStructureIssue] = []
    summaries = list(level_ranges.values())

    for summary in summaries:
        if summary.range_mid is not None:
            if not (summary.range_min < summary.range_mid < summary.range_max):
                issues.append(
                    RangeStructureIssue(
                        issue_type="invalid_order",
                        job_level=summary.job_level,
                        description=(
                            f"Range order invalid for {summary.job_level}: "
                            f"min {summary.range_min}, mid {summary.range_mid}, max {summary.range_max}."
                        ),
                        range_min=summary.range_min,
                        range_mid=summary.range_mid,
                        range_max=summary.range_max,
                    )
                )
        elif summary.range_min >= summary.range_max:
            issues.append(
                RangeStructureIssue(
                    issue_type="invalid_order",
                    job_level=summary.job_level,
                    description=(
                        f"Range min ≥ max for {summary.job_level}: "
                        f"{summary.range_min} / {summary.range_max}."
                    ),
                    range_min=summary.range_min,
                    range_max=summary.range_max,
                )
            )

    width_percents = [
        summary.range_width_percent
        for summary in summaries
        if summary.range_width_percent is not None
    ]
    if len(width_percents) >= 4:
        series = pd.Series(width_percents)
        q1 = series.quantile(0.25)
        q3 = series.quantile(0.75)
        iqr = q3 - q1
        lower = q1 - RANGE_WIDTH_IQR * iqr
        upper = q3 + RANGE_WIDTH_IQR * iqr
        for summary in summaries:
            width = summary.range_width_percent
            if width is None:
                continue
            if width < lower or width > upper:
                issues.append(
                    RangeStructureIssue(
                        issue_type="width_outlier",
                        job_level=summary.job_level,
                        description=(
                            f"{summary.job_level} range width ({width}% of midpoint) "
                            "is unusual compared to other levels."
                        ),
                        range_min=summary.range_min,
                        range_mid=summary.range_mid,
                        range_max=summary.range_max,
                    )
                )

    ordered_levels = sorted(level_ranges.keys(), key=_level_sort_key)
    for index in range(len(ordered_levels) - 1):
        lower_level = ordered_levels[index]
        higher_level = ordered_levels[index + 1]
        lower = level_ranges[lower_level]
        higher = level_ranges[higher_level]
        if lower.range_max > higher.range_min:
            issues.append(
                RangeStructureIssue(
                    issue_type="level_overlap",
                    job_level=lower_level,
                    related_level=higher_level,
                    description=(
                        f"{lower_level} max ({lower.range_max}) exceeds {higher_level} min "
                        f"({higher.range_min}) — level bands overlap."
                    ),
                    range_min=lower.range_min,
                    range_max=lower.range_max,
                )
            )

    return RangeStructureReport(
        available=True,
        issues=issues,
        level_ranges=sorted(summaries, key=lambda item: _level_sort_key(item.job_level)),
        disclaimer=(
            "Range structure checks use the most common min/mid/max per job level in your file. "
            "Mixed ranges within a level may indicate mapping or grade assignment errors."
        ),
    )


def _group_compa_stats(
    group_type: str,
    group_key: str,
    employees: list[Any],
    job_level: str | None = None,
    department: str | None = None,
) -> GroupCompaStats:
    compas = [employee.compa_ratio for employee in employees if employee.compa_ratio is not None]
    penetrations = [
        employee.range_penetration
        for employee in employees
        if employee.range_penetration is not None
    ]
    below_90 = sum(1 for compa in compas if compa < 90)
    above_110 = sum(1 for compa in compas if compa > 110)
    between = len(compas) - below_90 - above_110

    return GroupCompaStats(
        group_type=group_type,
        group_key=group_key,
        job_level=job_level,
        department=department,
        headcount=len(employees),
        average_compa=round(sum(compas) / len(compas), 1) if compas else None,
        median_compa=round(float(pd.Series(compas).median()), 1) if compas else None,
        average_penetration=round(sum(penetrations) / len(penetrations), 1) if penetrations else None,
        below_90=below_90,
        between_90_110=between,
        above_110=above_110,
    )


def build_compa_penetration_summary(range_penetration: list[Any]) -> CompaPenetrationSummary:
    if not range_penetration:
        return CompaPenetrationSummary(available=False)

    by_level: dict[str, list[Any]] = {}
    by_department: dict[str, list[Any]] = {}
    by_level_department: dict[tuple[str, str], list[Any]] = {}

    for employee in range_penetration:
        level = (employee.job_level or "").strip() or "Unknown"
        department = (employee.department or "").strip() or "Unknown"
        by_level.setdefault(level, []).append(employee)
        by_department.setdefault(department, []).append(employee)
        by_level_department.setdefault((level, department), []).append(employee)

    return CompaPenetrationSummary(
        available=True,
        by_level=[
            _group_compa_stats("level", level, employees, job_level=level)
            for level, employees in sorted(by_level.items(), key=lambda item: _level_sort_key(item[0]))
        ],
        by_department=[
            _group_compa_stats("department", department, employees, department=department)
            for department, employees in sorted(by_department.items(), key=lambda item: item[0].lower())
        ],
        by_level_department=[
            _group_compa_stats(
                "level_department",
                f"{level} · {department}",
                employees,
                job_level=level,
                department=department,
            )
            for (level, department), employees in sorted(
                by_level_department.items(),
                key=lambda item: (_level_sort_key(item[0][0]), item[0][1].lower()),
            )
        ],
        disclaimer=(
            "Aggregate compa and penetration by level and department for cycle readouts. "
            "Does not adjust for performance, tenure, or location."
        ),
    )


def build_total_cash_comp_report(
    df: pd.DataFrame,
    mapping: dict[str, str | None],
    range_penetration: list[Any],
) -> TotalCashCompReport:
    bonus_col = mapping.get("bonus_target")
    if not bonus_col or bonus_col not in df.columns:
        return TotalCashCompReport(
            available=False,
            disclaimer="Map a Bonus Target column to calculate total cash comp (base + target bonus).",
        )

    compa_by_row = {employee.row_number: employee for employee in range_penetration}
    records: list[TotalCashCompRecord] = []

    for index, row in df.iterrows():
        row_number = int(index) + 2
        employee = compa_by_row.get(row_number)
        if employee is None or employee.salary is None:
            continue
        bonus_raw = _float_value(row.get(bonus_col))
        if bonus_raw is None:
            continue
        bonus_percent = _normalize_percent(bonus_raw)
        target_bonus = round(employee.salary * (bonus_percent / 100), 2)
        total_cash = round(employee.salary + target_bonus, 2)
        midpoint = None
        if employee.range_min is not None and employee.range_max is not None:
            midpoint = round((employee.range_min + employee.range_max) / 2, 2)
        tcc_compa = round((total_cash / midpoint) * 100, 1) if midpoint else None
        records.append(
            TotalCashCompRecord(
                row_number=row_number,
                employee_id=employee.employee_id,
                employee_name=employee.employee_name,
                department=employee.department,
                job_level=employee.job_level,
                base_salary=employee.salary,
                bonus_target_percent=bonus_percent,
                target_bonus_amount=target_bonus,
                total_cash_comp=total_cash,
                base_compa_ratio=employee.compa_ratio,
                tcc_compa_ratio=tcc_compa,
            )
        )

    average_tcc = round(sum(record.total_cash_comp for record in records) / len(records), 2) if records else None
    return TotalCashCompReport(
        available=bool(records),
        employees=sorted(records, key=lambda item: item.total_cash_comp, reverse=True),
        average_tcc=average_tcc,
        disclaimer=(
            "Total cash comp = base salary + (base × bonus target %). "
            "TCC compa uses the same salary range midpoint as base compa unless your ranges are TTC-specific."
        ),
    )


def build_new_hire_placement_report(
    df: pd.DataFrame,
    mapping: dict[str, str | None],
    range_penetration: list[Any],
    below_minimum: list[Any],
    lookback_days: int = NEW_HIRE_LOOKBACK_DAYS,
) -> NewHirePlacementReport:
    hire_col = mapping.get("hire_date")
    if not hire_col or hire_col not in df.columns:
        return NewHirePlacementReport(
            available=False,
            lookback_days=lookback_days,
            disclaimer="Include Hire Date to review new hire range placement.",
        )

    below_rows = {employee.row_number for employee in below_minimum}
    today = pd.Timestamp(datetime.now().date())
    records: list[NewHirePlacementRecord] = []

    for employee in range_penetration:
        row_number = employee.row_number
        source = df.iloc[row_number - 2] if row_number - 2 < len(df) else None
        if source is None:
            continue
        parsed = pd.to_datetime(source.get(hire_col), errors="coerce")
        if pd.isna(parsed):
            continue
        tenure_days = int((today - parsed).days)
        if tenure_days < 0 or tenure_days > lookback_days:
            continue

        below_min = row_number in below_rows
        penetration = employee.range_penetration
        if below_min:
            placement_issue = "below_minimum"
        elif penetration is not None and penetration < 25:
            placement_issue = "bottom_quartile"
        elif penetration is not None and penetration > 100:
            placement_issue = "above_maximum"
        else:
            placement_issue = "in_range"

        records.append(
            NewHirePlacementRecord(
                row_number=row_number,
                employee_id=employee.employee_id,
                employee_name=employee.employee_name,
                department=employee.department,
                job_level=employee.job_level,
                hire_date=parsed.strftime("%Y-%m-%d"),
                tenure_days=tenure_days,
                salary=employee.salary or 0,
                range_min=employee.range_min or 0,
                range_max=employee.range_max or 0,
                compa_ratio=employee.compa_ratio,
                range_penetration=penetration,
                below_minimum=below_min,
                placement_issue=placement_issue,
            )
        )

    below_count = sum(1 for record in records if record.below_minimum)
    return NewHirePlacementReport(
        available=bool(records),
        employees=sorted(records, key=lambda item: item.tenure_days),
        lookback_days=lookback_days,
        below_range_count=below_count,
        disclaimer=(
            f"New hires hired within the last {lookback_days} days. "
            "Review placement at hire and whether starting pay still sits below range minimum."
        ),
    )


def build_geo_pay_policy_report(
    df: pd.DataFrame,
    mapping: dict[str, str | None],
) -> GeoPayPolicyReport:
    zone_col = mapping.get("pay_zone")
    diff_col = mapping.get("geo_differential")
    if not zone_col or zone_col not in df.columns or not diff_col or diff_col not in df.columns:
        return GeoPayPolicyReport(
            available=False,
            disclaimer=(
                "Include Pay Zone and Geo Differential columns to compare actual vs expected "
                "location pay adjustments."
            ),
        )

    id_col = mapping["employee_id"]
    salary_col = mapping["salary"]
    location_col = mapping.get("location")

    zone_diffs: dict[str, list[float]] = {}
    rows_data: list[dict[str, Any]] = []

    for index, row in df.iterrows():
        zone = _string_value(row.get(zone_col))
        diff_raw = _float_value(row.get(diff_col))
        salary = _float_value(row.get(salary_col))
        employee_id = _string_value(row.get(id_col))
        if zone is None or diff_raw is None or salary is None or not employee_id:
            continue
        differential = _normalize_percent(diff_raw)
        zone_diffs.setdefault(zone, []).append(differential)
        rows_data.append(
            {
                "row_number": int(index) + 2,
                "employee_id": employee_id,
                "pay_zone": zone,
                "location": _string_value(row.get(location_col)) if location_col else None,
                "differential": differential,
                "salary": salary,
            }
        )

    if not rows_data:
        return GeoPayPolicyReport(available=False)

    zone_expected = {
        zone: round(float(pd.Series(values).median()), 2)
        for zone, values in zone_diffs.items()
        if values
    }

    flags: list[GeoPayPolicyFlag] = []
    for item in rows_data:
        expected = zone_expected.get(item["pay_zone"])
        if expected is None:
            continue
        actual = item["differential"]
        if abs(actual - expected) > GEO_DIFF_TOLERANCE:
            flags.append(
                GeoPayPolicyFlag(
                    row_number=item["row_number"],
                    employee_id=item["employee_id"],
                    pay_zone=item["pay_zone"],
                    location=item["location"],
                    expected_differential=expected,
                    actual_differential=actual,
                    salary=item["salary"],
                    reason=(
                        f"Geo differential {actual}% differs from {item['pay_zone']} zone median "
                        f"({expected}%) by more than {GEO_DIFF_TOLERANCE} points."
                    ),
                )
            )

    return GeoPayPolicyReport(
        available=True,
        flags=sorted(flags, key=lambda item: abs(item.actual_differential - (item.expected_differential or 0)), reverse=True),
        zone_medians=sorted(
            [
                GeoZoneMedian(pay_zone=zone, median_differential=median)
                for zone, median in zone_expected.items()
            ],
            key=lambda item: item.pay_zone,
        ),
        disclaimer=(
            "Geo policy check compares each employee's differential to the median for their pay zone "
            "in this file. Upload expected policy values separately for formal compliance review."
        ),
    )


def build_currency_report(
    df: pd.DataFrame,
    mapping: dict[str, str | None],
    range_penetration: list[Any],
) -> CurrencyReport:
    currency_col = mapping.get("currency")
    if not currency_col or currency_col not in df.columns:
        return CurrencyReport(
            available=False,
            disclaimer="Include a Currency column for multi-currency workforce summaries.",
        )

    salary_by_row = {employee.row_number: employee.salary for employee in range_penetration}
    groups: dict[str, list[float]] = {}
    usd_normalized: dict[str, list[float]] = {}

    for index, row in df.iterrows():
        row_number = int(index) + 2
        salary = salary_by_row.get(row_number)
        if salary is None:
            continue
        currency = _string_value(row.get(currency_col)) or "Unknown"
        currency = currency.upper()
        groups.setdefault(currency, []).append(salary)
        rate = FX_TO_USD.get(currency, 1.0)
        usd_normalized.setdefault(currency, []).append(round(salary * rate, 2))

    if not groups:
        return CurrencyReport(available=False)

    stats: list[CurrencyGroupStats] = []
    for currency, salaries in sorted(groups.items()):
        usd_values = usd_normalized.get(currency, salaries)
        stats.append(
            CurrencyGroupStats(
                currency=currency,
                headcount=len(salaries),
                median_salary=round(float(pd.Series(salaries).median()), 2),
                median_salary_usd=round(float(pd.Series(usd_values).median()), 2),
                fx_rate_to_usd=FX_TO_USD.get(currency, 1.0),
            )
        )

    return CurrencyReport(
        available=True,
        currencies=stats,
        multi_currency=len(stats) > 1,
        disclaimer=(
            "USD normalization uses static reference rates for directional comparison only — "
            "not for payroll or financial reporting."
        ),
    )


def build_employee_type_report(df: pd.DataFrame, mapping: dict[str, str | None]) -> EmployeeTypeReport:
    type_col = mapping.get("employee_type")
    if not type_col or type_col not in df.columns:
        return EmployeeTypeReport(
            available=False,
            excluded_types=sorted(EXCLUDED_EMPLOYEE_TYPES),
            disclaimer="Include Employee Type to summarize workforce mix and exclude non-core populations.",
        )

    counts: dict[str, int] = {}
    excluded_count = 0
    for _, row in df.iterrows():
        employee_type = _string_value(row.get(type_col)) or "Unknown"
        counts[employee_type] = counts.get(employee_type, 0) + 1
        if is_excluded_employee_type(employee_type):
            excluded_count += 1

    return EmployeeTypeReport(
        available=True,
        types=[
            EmployeeTypeCount(
                employee_type=employee_type,
                headcount=headcount,
                excluded_from_aggregates=is_excluded_employee_type(employee_type),
            )
            for employee_type, headcount in sorted(counts.items(), key=lambda item: (-item[1], item[0].lower()))
        ],
        excluded_types=sorted(EXCLUDED_EMPLOYEE_TYPES),
        excluded_count=excluded_count,
        disclaimer=(
            "Interns, contractors, and similar types are excluded from aggregate merit and peer-spread "
            "calculations when Employee Type is mapped. Individual rows remain visible in all tabs."
        ),
    )


def build_midpoint_progression_report(
    df: pd.DataFrame,
    mapping: dict[str, str | None],
) -> MidpointProgressionReport:
    level_ranges = _collect_level_ranges(df, mapping)
    if len(level_ranges) < 2:
        return MidpointProgressionReport(
            available=False,
            disclaimer="Include Job Level and range midpoints to validate level-to-level progression.",
        )

    ordered = sorted(level_ranges.keys(), key=_level_sort_key)
    level_midpoints = [
        LevelMidpointRow(
            job_level=level,
            range_mid=level_ranges[level].range_mid or 0,
            sort_rank=_level_sort_key(level)[0],
        )
        for level in ordered
        if level_ranges[level].range_mid is not None
    ]

    issues: list[MidpointProgressionIssue] = []
    for index in range(len(ordered) - 1):
        lower_level = ordered[index]
        higher_level = ordered[index + 1]
        lower_mid = level_ranges[lower_level].range_mid
        higher_mid = level_ranges[higher_level].range_mid
        if lower_mid is None or higher_mid is None:
            continue
        if lower_mid >= higher_mid:
            issues.append(
                MidpointProgressionIssue(
                    lower_level=lower_level,
                    higher_level=higher_level,
                    lower_midpoint=lower_mid,
                    higher_midpoint=higher_mid,
                    description=(
                        f"{lower_level} midpoint ({lower_mid}) is not below {higher_level} "
                        f"midpoint ({higher_mid}) — review grade progression."
                    ),
                )
            )

    return MidpointProgressionReport(
        available=True,
        issues=issues,
        level_midpoints=level_midpoints,
        disclaimer=(
            "Midpoint progression checks assume job levels sort low-to-high. "
            "Non-numeric level names use keyword ordering when numbers are absent."
        ),
    )
