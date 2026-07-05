import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import type { AnalysisResult } from "./types";

const REPORT_FILENAME = "shiftworkshr-report";
const SUMMARY_FILENAME = "shiftworkshr-summary";

export type ExportOptions = {
  targetMeritPercent?: number | null;
  anonymize?: boolean;
};

function displayEmployeeName(
  employeeId: string | null | undefined,
  employeeName: string | null | undefined,
  options?: ExportOptions,
): string {
  if (options?.anonymize) {
    return employeeId ? `Employee ${employeeId}` : "Employee";
  }
  return employeeName ?? employeeId ?? "";
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function formatMoney(value: number | null | undefined): string {
  if (value == null) return "";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function overviewRows(result: AnalysisResult, options?: ExportOptions): Array<Array<string | number>> {
  const { insights, summary } = result;
  const generatedAt = new Date().toLocaleString();
  const meritPercent = options?.targetMeritPercent;
  const projectedMeritPool =
    meritPercent != null && Number.isFinite(meritPercent)
      ? (insights.merit_calculator.payroll_base * meritPercent) / 100
      : insights.budget_impact.projected_merit_pool;
  const totalBudgetImpact = insights.budget_impact.cost_to_minimum + projectedMeritPool;
  return [
    ["ShiftWorksHR Compensation Report"],
    ["Generated", generatedAt],
    [
      "What's in the Excel file",
      "This Overview tab plus separate tabs for flagged issues, pay equity, tenure, location pay, and employee detail.",
    ],
    [],
    ["Key findings"],
    ["Headline", insights.executive_summary.headline],
    ["Risk level", insights.executive_summary.risk_level],
    ...insights.executive_summary.bullets.map((bullet) => ["", bullet]),
    [],
    ["Budget impact"],
    ["Cost to minimum", insights.budget_impact.cost_to_minimum],
    ["Projected merit pool", projectedMeritPool],
    ["Total budget impact", totalBudgetImpact],
    [],
    ["Issue counts"],
    ["Total rows", summary.total_rows],
    ["Below minimum", summary.below_minimum],
    ["Above maximum", summary.above_maximum],
    ["Duplicate IDs", summary.duplicate_ids],
    ["Compression issues", summary.compression_issues],
    ["Managers below reports", summary.managers_below_reports],
    ["Missing bonus targets", summary.missing_bonus_targets],
    ["Missing salary ranges", summary.missing_salary_ranges],
    ["Invalid effective dates", summary.invalid_effective_dates],
    ["Outlier merit increases", summary.outlier_merit_increases],
    ["New-hire merit flags", summary.new_hire_merit_flags ?? 0],
    ["Merit vs compa flags", summary.merit_compa_flags ?? 0],
    ["Unusual comp changes", summary.unusual_comp_changes ?? 0],
    ["Equity grant outliers", summary.equity_grant_outliers ?? 0],
    ["Pay equity gaps", summary.pay_equity_gaps],
    ["Tenure pay flags", summary.tenure_pay_flags ?? 0],
    ["Location pay gaps", summary.location_pay_gaps ?? 0],
    [],
    ["Compa-ratio"],
    ["Average compa-ratio", insights.compa_ratio.average_compa_ratio ?? ""],
    ["Below 90%", insights.compa_ratio.below_90_percent],
    ["90% to 110%", insights.compa_ratio.between_90_and_110],
    ["Above 110%", insights.compa_ratio.above_110_percent],
  ];
}

function employeeRows(result: AnalysisResult, options?: ExportOptions): Array<Array<string | number | null>> {
  return result.range_penetration.map((row) => [
    row.row_number,
    row.employee_id ?? "",
    displayEmployeeName(row.employee_id, row.employee_name, options),
    row.department ?? "",
    row.job_level ?? "",
    row.salary ?? "",
    row.range_min ?? "",
    row.range_max ?? "",
    row.compa_ratio ?? "",
    row.range_penetration ?? "",
    row.gap_to_minimum ?? "",
    row.merit_increase ?? "",
  ]);
}

export function downloadReportExcel(
  result: AnalysisResult,
  filename = `${REPORT_FILENAME}.xlsx`,
  options?: ExportOptions,
) {
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet(overviewRows(result, options)),
    "Overview",
  );

  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet([
      [
        "Row",
        "Employee ID",
        "Name",
        "Department",
        "Level",
        "Salary",
        "Range Min",
        "Range Max",
        "Compa Ratio %",
        "Range Penetration %",
        "Gap to Minimum",
        "Merit Increase %",
      ],
      ...employeeRows(result, options),
    ]),
    "All Employees",
  );

  if (result.below_minimum.length > 0) {
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([
        ["Row", "Employee ID", "Name", "Salary", "Range Min", "Gap to Minimum"],
        ...result.below_minimum.map((row) => [
          row.row_number,
          row.employee_id ?? "",
          displayEmployeeName(row.employee_id, row.employee_name, options),
          row.salary ?? "",
          row.range_min ?? "",
          row.gap_to_minimum ?? "",
        ]),
      ]),
      "Below Minimum",
    );
  }

  if (result.above_maximum.length > 0) {
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([
        ["Row", "Employee ID", "Name", "Salary", "Range Max", "Range Penetration %"],
        ...result.above_maximum.map((row) => [
          row.row_number,
          row.employee_id ?? "",
          displayEmployeeName(row.employee_id, row.employee_name, options),
          row.salary ?? "",
          row.range_max ?? "",
          row.range_penetration ?? "",
        ]),
      ]),
      "Above Maximum",
    );
  }

  if (result.compression.length > 0) {
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([
        ["Type", "Description", "Employee", "Row"],
        ...result.compression.map((issue) => [
          issue.issue_type,
          issue.description,
          displayEmployeeName(issue.employee_id, issue.employee_name, options),
          issue.row_number ?? "",
        ]),
      ]),
      "Compression",
    );
  }

  if (result.managers_below_reports.length > 0) {
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([
        [
          "Manager ID",
          "Manager Name",
          "Manager Salary",
          "Report ID",
          "Report Name",
          "Report Salary",
          "Pay Gap",
        ],
        ...result.managers_below_reports.map((row) => [
          row.manager_id,
          displayEmployeeName(row.manager_id, row.manager_name, options),
          row.manager_salary,
          row.report_id,
          displayEmployeeName(row.report_id, row.report_name, options),
          row.report_salary,
          row.pay_gap,
        ]),
      ]),
      "Managers Below Reports",
    );
  }

  if (result.duplicate_ids.length > 0) {
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([
        ["Employee ID", "Occurrences", "Rows"],
        ...result.duplicate_ids.map((group) => [
          group.employee_id,
          group.count,
          group.rows.join(", "),
        ]),
      ]),
      "Duplicate IDs",
    );
  }

  if (result.missing_data.length > 0) {
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([
        ["Row", "Employee ID", "Name", "Missing Fields"],
        ...result.missing_data.map((row) => [
          row.row_number,
          row.employee_id ?? "",
          displayEmployeeName(row.employee_id, row.employee_name, options),
          row.missing_fields.join(", "),
        ]),
      ]),
      "Missing Data",
    );
  }

  if (result.outlier_merit_increases.length > 0) {
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([
        ["Row", "Employee ID", "Name", "Merit Increase %", "Reason"],
        ...result.outlier_merit_increases.map((row) => [
          row.row_number,
          row.employee_id ?? "",
          displayEmployeeName(row.employee_id, row.employee_name, options),
          row.merit_increase,
          row.reason,
        ]),
      ]),
      "Outlier Merit",
    );
  }

  if ((result.equity_grants ?? []).length > 0) {
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([
        ["Row", "Employee ID", "Name", "Department", "Equity Grant %", "Outlier", "Reason"],
        ...result.equity_grants.map((row) => [
          row.row_number,
          row.employee_id ?? "",
          displayEmployeeName(row.employee_id, row.employee_name, options),
          row.department ?? "",
          row.equity_grant,
          row.is_outlier ? "Yes" : "No",
          row.reason ?? "",
        ]),
      ]),
      "Equity Grants",
    );
  }

  if (result.missing_bonus_targets.length > 0) {
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([
        ["Row", "Employee ID", "Name"],
        ...result.missing_bonus_targets.map((row) => [
          row.row_number,
          row.employee_id ?? "",
          displayEmployeeName(row.employee_id, row.employee_name, options),
        ]),
      ]),
      "Missing Bonus Targets",
    );
  }

  if (result.missing_salary_ranges.length > 0) {
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([
        ["Row", "Employee ID", "Name", "Missing Fields"],
        ...result.missing_salary_ranges.map((row) => [
          row.row_number,
          row.employee_id ?? "",
          displayEmployeeName(row.employee_id, row.employee_name, options),
          row.missing_fields.join(", "),
        ]),
      ]),
      "Missing Salary Ranges",
    );
  }

  if (result.invalid_effective_dates.length > 0) {
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([
        ["Row", "Employee ID", "Name", "Effective Date", "Issue"],
        ...result.invalid_effective_dates.map((row) => [
          row.row_number,
          row.employee_id ?? "",
          displayEmployeeName(row.employee_id, row.employee_name, options),
          row.effective_date ?? "",
          row.reason,
        ]),
      ]),
      "Invalid Effective Dates",
    );
  }

  if (result.compa_ratios.length > 0) {
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([
        ["Row", "Employee ID", "Name", "Salary", "Range Midpoint", "Compa Ratio %"],
        ...result.compa_ratios.map((row) => [
          row.row_number,
          row.employee_id ?? "",
          displayEmployeeName(row.employee_id, row.employee_name, options),
          row.salary,
          row.range_midpoint,
          row.compa_ratio,
        ]),
      ]),
      "Compa-Ratio",
    );
  }

  if (result.pay_equity.available) {
    const equity = result.pay_equity;
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([
        ["Pay Equity Disclaimer"],
        [equity.disclaimer],
        [],
        ["Gender Groups"],
        ["Group", "Headcount", "% Workforce", "Median Salary", "Mean Salary", "Median Compa %"],
        ...equity.gender_groups.map((group) => [
          group.group_name,
          group.headcount,
          group.workforce_percent,
          group.suppressed ? "Hidden" : group.median_salary ?? "",
          group.suppressed ? "" : group.mean_salary ?? "",
          group.suppressed ? "" : group.median_compa_ratio ?? "",
        ]),
        [],
        ["Gender Gaps"],
        ["Scope", "Higher Group", "Lower Group", "Higher Median", "Lower Median", "Gap", "Gap %"],
        ...equity.gender_gaps.map((gap) => [
          gap.scope,
          gap.higher_paid_group,
          gap.lower_paid_group,
          gap.higher_median,
          gap.lower_median,
          gap.gap_amount,
          gap.gap_percent ?? "",
        ]),
        [],
        ["Race Groups"],
        ["Group", "Headcount", "% Workforce", "Median Salary", "Mean Salary", "Median Compa %"],
        ...equity.race_groups.map((group) => [
          group.group_name,
          group.headcount,
          group.workforce_percent,
          group.suppressed ? "Hidden" : group.median_salary ?? "",
          group.suppressed ? "" : group.mean_salary ?? "",
          group.suppressed ? "" : group.median_compa_ratio ?? "",
        ]),
        [],
        ["Race Gaps"],
        ["Scope", "Higher Group", "Lower Group", "Higher Median", "Lower Median", "Gap", "Gap %"],
        ...equity.race_gaps.map((gap) => [
          gap.scope,
          gap.higher_paid_group,
          gap.lower_paid_group,
          gap.higher_median,
          gap.lower_median,
          gap.gap_amount,
          gap.gap_percent ?? "",
        ]),
      ]),
      "Pay Equity",
    );
  }

  if (result.tenure.available) {
    const tenure = result.tenure;
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([
        ["Tenure Disclaimer"],
        [tenure.disclaimer],
        [],
        ["Tenure Bands"],
        ["Band", "Headcount", "Median Salary", "Median Tenure (years)", "Median Compa %"],
        ...tenure.bands.map((band) => [
          band.band_label,
          band.headcount,
          band.median_salary ?? "",
          band.median_tenure_years ?? "",
          band.median_compa_ratio ?? "",
        ]),
        [],
        ["Tenure Pay Flags"],
        ["Row", "Employee", "Hire Date", "Tenure (years)", "Salary", "Flag", "Reason"],
        ...tenure.flags.map((flag) => [
          flag.row_number,
          flag.employee_name ?? flag.employee_id ?? "",
          flag.hire_date ?? "",
          flag.tenure_years,
          flag.salary,
          flag.flag_type,
          flag.reason,
        ]),
        [],
        ["Employee Tenure Detail"],
        [
          "Row",
          "Employee",
          "Location",
          "Department",
          "Level",
          "Hire Date",
          "Tenure (years)",
          "Band",
          "Salary",
          "Compa %",
        ],
        ...tenure.employees.map((row) => [
          row.row_number,
          row.employee_name ?? row.employee_id ?? "",
          row.location ?? "",
          row.department ?? "",
          row.job_level ?? "",
          row.hire_date ?? "",
          row.tenure_years,
          row.tenure_band,
          row.salary ?? "",
          row.compa_ratio ?? "",
        ]),
      ]),
      "Tenure",
    );
  }

  if (result.location_pay.available) {
    const location = result.location_pay;
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([
        ["Location Pay Disclaimer"],
        [location.disclaimer],
        [],
        ["Location Groups"],
        ["Location", "Headcount", "% Workforce", "Median Salary", "Mean Salary"],
        ...location.location_groups.map((group) => [
          group.group_name,
          group.headcount,
          group.workforce_percent,
          group.suppressed ? "Hidden" : group.median_salary ?? "",
          group.suppressed ? "" : group.mean_salary ?? "",
        ]),
        [],
        ["Location Gaps"],
        ["Scope", "Higher Location", "Lower Location", "Higher Median", "Lower Median", "Gap", "Gap %"],
        ...location.location_gaps.map((gap) => [
          gap.scope,
          gap.higher_paid_group,
          gap.lower_paid_group,
          gap.higher_median,
          gap.lower_median,
          gap.gap_amount,
          gap.gap_percent ?? "",
        ]),
      ]),
      "Location Pay",
    );
  }

  XLSX.writeFile(workbook, filename);
}

/** Leadership-ready PDF: key findings and metrics only (no employee-level detail). */
export function downloadSummaryPdf(
  result: AnalysisResult,
  filename = `${SUMMARY_FILENAME}.pdf`,
  options?: ExportOptions,
) {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });
  const { insights, summary } = result;
  const meritPercent = options?.targetMeritPercent;
  const projectedMeritPool =
    meritPercent != null && Number.isFinite(meritPercent)
      ? (insights.merit_calculator.payroll_base * meritPercent) / 100
      : insights.budget_impact.projected_merit_pool;
  const totalBudgetImpact = insights.budget_impact.cost_to_minimum + projectedMeritPool;
  const margin = 48;
  let y = margin;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("ShiftWorksHR Summary Report", margin, y);
  y += 22;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(`Generated ${new Date().toLocaleString()} · PDF summary for leadership`, margin, y);
  doc.setTextColor(0, 0, 0);
  y += 26;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Key findings", margin, y);
  y += 16;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  const headlineLines = doc.splitTextToSize(insights.executive_summary.headline, 520);
  doc.text(headlineLines, margin, y);
  y += headlineLines.length * 14 + 6;

  for (const bullet of insights.executive_summary.bullets) {
    const lines = doc.splitTextToSize(`• ${bullet}`, 520);
    doc.text(lines, margin, y);
    y += lines.length * 14 + 4;
    if (y > 720) {
      doc.addPage();
      y = margin;
    }
  }

  if (insights.budget_impact.note) {
    const noteLines = doc.splitTextToSize(insights.budget_impact.note, 520);
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text(noteLines, margin, y + 4);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    y += noteLines.length * 12 + 8;
  }

  autoTable(doc, {
    startY: y + 8,
    head: [["Budget & issue counts", "Value"]],
    body: [
      ["Risk level", insights.executive_summary.risk_level],
      ["Cost to minimum", formatMoney(insights.budget_impact.cost_to_minimum)],
      ["Projected merit pool", formatMoney(projectedMeritPool)],
      ["Total budget impact", formatMoney(totalBudgetImpact)],
      [
        "Average compa-ratio",
        insights.compa_ratio.average_compa_ratio != null
          ? `${insights.compa_ratio.average_compa_ratio}%`
          : "—",
      ],
      ["Below minimum", String(summary.below_minimum)],
      ["Above maximum", String(summary.above_maximum)],
      ["Compression issues", String(summary.compression_issues)],
      ["Managers below reports", String(summary.managers_below_reports)],
      ["Pay equity gaps", String(summary.pay_equity_gaps)],
      ["Tenure pay flags", String(summary.tenure_pay_flags ?? 0)],
      ["Location pay gaps", String(summary.location_pay_gaps ?? 0)],
      ["Outlier merit increases", String(summary.outlier_merit_increases)],
    ],
    styles: { fontSize: 10, cellPadding: 6 },
    headStyles: { fillColor: [15, 118, 110] },
    margin: { left: margin, right: margin },
  });

  const footerY = ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y) + 20;
  if (footerY < 720) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(
      "For employee-level detail and all flagged rows, download the Excel report from the analyzer.",
      margin,
      footerY,
    );
  }

  triggerDownload(doc.output("blob"), filename);
}

/** @deprecated Use downloadReportExcel */
export const downloadAnalysisExcel = downloadReportExcel;

/** @deprecated Use downloadSummaryPdf */
export const downloadExecutiveSummaryPdf = downloadSummaryPdf;
