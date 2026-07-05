from __future__ import annotations

from typing import Any

import pandas as pd

from app.models import (
    BonusTargetOutlierRecord,
    BonusTargetReview,
    DepartmentMeritStats,
    MeritByDepartmentReport,
    PeerSpreadFlag,
    PeerSpreadReport,
    PostMeritCompaRecord,
    PostMeritCompaReport,
)

PEER_SPREAD_THRESHOLD = 15.0
BONUS_OUTLIER_IQR = 1.5


def _string_value(value: Any) -> str | None:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return None
    text = str(value).strip()
    if not text or text.lower() in {"nan", "none", "n/a", "na"}:
        return None
    return text


def build_merit_by_department(
    range_penetration: list[Any],
) -> MeritByDepartmentReport:
    groups: dict[str, list[Any]] = {}
    for employee in range_penetration:
        department = (employee.department or "").strip() or "Unknown"
        groups.setdefault(department, []).append(employee)

    departments: list[DepartmentMeritStats] = []
    all_merits: list[float] = []

    for department, employees in sorted(groups.items(), key=lambda item: item[0].lower()):
        payroll_base = 0.0
        pool = 0.0
        merits: list[float] = []
        for employee in employees:
            if employee.salary is None:
                continue
            payroll_base += employee.salary
            if employee.merit_increase is not None:
                merits.append(employee.merit_increase)
                all_merits.append(employee.merit_increase)
                pool += employee.salary * (employee.merit_increase / 100)

        avg_merit = round(sum(merits) / len(merits), 2) if merits else None
        departments.append(
            DepartmentMeritStats(
                department=department,
                headcount=len(employees),
                employees_with_merit=len(merits),
                average_merit_percent=avg_merit,
                projected_merit_pool=round(pool, 2),
                payroll_base=round(payroll_base, 2),
            )
        )

    file_average = round(sum(all_merits) / len(all_merits), 2) if all_merits else None
    return MeritByDepartmentReport(
        available=bool(all_merits),
        departments=departments,
        file_average_merit=file_average,
        disclaimer=(
            "Department merit averages use uploaded merit increase values only. "
            "They do not adjust for level mix, performance, or eligibility rules."
        ),
    )


def build_bonus_target_review(
    df: pd.DataFrame,
    mapping: dict[str, str | None],
    warnings: list[str],
) -> BonusTargetReview:
    bonus_col = mapping.get("bonus_target")
    level_col = mapping.get("job_level")
    id_col = mapping["employee_id"]
    name_col = mapping.get("employee_name")
    dept_col = mapping.get("department")

    if not bonus_col or bonus_col not in df.columns:
        warnings.append("No bonus target column detected. Skipping bonus target review.")
        return BonusTargetReview(available=False)

    working = df.copy()
    working["_bonus"] = pd.to_numeric(
        working[bonus_col].astype(str).str.replace(r"[$,\s%]", "", regex=True),
        errors="coerce",
    )
    if working["_bonus"].quantile(0.9) <= 1:
        working["_bonus"] = working["_bonus"] * 100

    outliers: list[BonusTargetOutlierRecord] = []
    level_groups: dict[str, pd.Series] = {}

    if level_col and level_col in working.columns:
        for level_value, group in working.groupby(level_col, dropna=True):
            bonuses = group["_bonus"].dropna()
            if len(bonuses) >= 4:
                level_groups[str(level_value)] = bonuses

    for index, row in working.iterrows():
        employee_id = _string_value(row.get(id_col))
        raw_bonus = row.get("_bonus")
        row_number = int(index) + 2
        job_level = _string_value(row.get(level_col)) if level_col else None
        department = _string_value(row.get(dept_col)) if dept_col else None

        if pd.isna(raw_bonus):
            continue

        bonus = float(raw_bonus)
        level_key = job_level or ""
        level_series = level_groups.get(level_key)

        if level_series is None or len(level_series) < 4:
            continue

        q1 = float(level_series.quantile(0.25))
        q3 = float(level_series.quantile(0.75))
        iqr = q3 - q1
        lower = q1 - BONUS_OUTLIER_IQR * iqr
        upper = q3 + BONUS_OUTLIER_IQR * iqr
        level_median = float(level_series.median())

        if bonus < lower or bonus > upper:
            direction = "high" if bonus > upper else "low"
            outliers.append(
                BonusTargetOutlierRecord(
                    row_number=row_number,
                    employee_id=employee_id,
                    employee_name=_string_value(row.get(name_col)) if name_col else None,
                    department=department,
                    job_level=job_level,
                    bonus_target=round(bonus, 2),
                    level_median_bonus=round(level_median, 2),
                    reason=(
                        f"Bonus target {bonus:.1f}% is unusually {direction} for level "
                        f"{level_key} (level median {level_median:.1f}%, expected "
                        f"{lower:.1f}%–{upper:.1f}%)."
                    ),
                )
            )

    return BonusTargetReview(
        available=True,
        outliers=outliers,
        disclaimer=(
            "Bonus target outliers compare each employee to others at the same job level. "
            "Levels with fewer than four employees are skipped."
        ),
    )


def build_post_merit_compa(
    range_penetration: list[Any],
    mapping: dict[str, str | None],
) -> PostMeritCompaReport:
    records: list[PostMeritCompaRecord] = []
    current_ratios: list[float] = []
    projected_ratios: list[float] = []
    below_90_after = 0
    above_110_after = 0

    for employee in range_penetration:
        if (
            employee.salary is None
            or employee.compa_ratio is None
            or employee.merit_increase is None
        ):
            continue

        midpoint = None
        if employee.range_min is not None and employee.range_max is not None:
            midpoint = (employee.range_min + employee.range_max) / 2
        if midpoint is None or midpoint <= 0:
            continue

        merit = employee.merit_increase
        projected_salary = round(employee.salary * (1 + merit / 100), 2)
        projected_compa = round((projected_salary / midpoint) * 100, 1)
        delta = round(projected_compa - employee.compa_ratio, 1)

        current_ratios.append(employee.compa_ratio)
        projected_ratios.append(projected_compa)
        if projected_compa < 90:
            below_90_after += 1
        elif projected_compa > 110:
            above_110_after += 1

        records.append(
            PostMeritCompaRecord(
                row_number=employee.row_number,
                employee_id=employee.employee_id,
                employee_name=employee.employee_name,
                department=employee.department,
                job_level=employee.job_level,
                salary=employee.salary,
                merit_increase=merit,
                current_compa_ratio=employee.compa_ratio,
                projected_compa_ratio=projected_compa,
                compa_change=delta,
                projected_salary=projected_salary,
            )
        )

    records.sort(key=lambda item: item.compa_change, reverse=True)

    return PostMeritCompaReport(
        available=bool(records),
        employees=records,
        average_current_compa=round(sum(current_ratios) / len(current_ratios), 1)
        if current_ratios
        else None,
        average_projected_compa=round(sum(projected_ratios) / len(projected_ratios), 1)
        if projected_ratios
        else None,
        employees_below_90_after=below_90_after,
        employees_above_110_after=above_110_after,
        disclaimer=(
            "Projected compa-ratio assumes the uploaded merit increase is applied to current "
            "base salary with no range changes. Use for planning only."
        ),
    )


def build_peer_spread_report(
    df: pd.DataFrame,
    mapping: dict[str, str | None],
    warnings: list[str],
) -> PeerSpreadReport:
    level_col = mapping.get("job_level")
    dept_col = mapping.get("department")
    salary_col = mapping["salary"]
    id_col = mapping["employee_id"]
    name_col = mapping.get("employee_name")

    if not level_col or level_col not in df.columns:
        warnings.append("No job level column detected. Skipping peer pay spread checks.")
        return PeerSpreadReport(available=False)

    if not dept_col or dept_col not in df.columns:
        warnings.append("No department column detected. Skipping peer pay spread checks.")
        return PeerSpreadReport(available=False)

    working = df[
        df[salary_col].notna()
        & df[level_col].notna()
        & df[dept_col].notna()
        & (df[dept_col].astype(str).str.strip() != "")
    ].copy()

    if working.empty:
        return PeerSpreadReport(available=False)

    flags: list[PeerSpreadFlag] = []

    for (level_value, dept_value), group in working.groupby([level_col, dept_col], dropna=True):
        if len(group) < 2:
            continue

        salaries = group[salary_col].astype(float)
        min_salary = float(salaries.min())
        max_salary = float(salaries.max())
        if min_salary <= 0:
            continue

        spread_percent = round(((max_salary - min_salary) / min_salary) * 100, 1)
        if spread_percent <= PEER_SPREAD_THRESHOLD:
            continue

        level_label = str(level_value)
        dept_label = str(dept_value)

        for index, row in group.iterrows():
            salary = float(row[salary_col])
            flags.append(
                PeerSpreadFlag(
                    row_number=int(index) + 2,
                    employee_id=_string_value(row.get(id_col)),
                    employee_name=_string_value(row.get(name_col)) if name_col else None,
                    job_level=level_label,
                    department=dept_label,
                    salary=salary,
                    group_min_salary=min_salary,
                    group_max_salary=max_salary,
                    spread_percent=spread_percent,
                    headcount=len(group),
                    reason=(
                        f"Level {level_label} in {dept_label} has a {spread_percent}% pay spread "
                        f"(${min_salary:,.0f}–${max_salary:,.0f}) across {len(group)} employees."
                    ),
                )
            )

    flags.sort(key=lambda item: item.spread_percent, reverse=True)

    return PeerSpreadReport(
        available=bool(flags),
        flags=flags,
        spread_threshold=PEER_SPREAD_THRESHOLD,
        disclaimer=(
            f"Peer spread flags groups with the same job level and department where pay spans "
            f"more than {PEER_SPREAD_THRESHOLD:.0f}%. Review role scope and recent hires before adjusting."
        ),
    )
