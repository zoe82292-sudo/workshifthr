import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import type { AnalysisResult } from "./types";
import { resolveMeritScenario } from "./meritScenario";
import {
  BRAND,
  buildDataSheet,
  buildOverviewSheet,
  displayEmployeeName,
  drawPdfHeader,
  drawTrialWatermark,
  formatMoney,
  formatPercent,
  pdfFooter,
  riskColor,
  triggerDownload,
  type ExportOptions,
} from "./exportFormatters";

export type { ExportOptions };

const REPORT_FILENAME = "shiftworkshr-report";
const SUMMARY_FILENAME = "shiftworkshr-summary";

function exportFilename(base: string, ext: "xlsx" | "pdf", trial?: boolean) {
  if (trial) {
    return ext === "pdf" ? "shiftworkshr-trial-summary.pdf" : "shiftworkshr-trial-report.xlsx";
  }
  return `${base}.${ext}`;
}

const TABLE_THEME = {
  styles: {
    fontSize: 9,
    cellPadding: 5,
    lineColor: [210, 221, 214] as [number, number, number],
    lineWidth: 0.5,
  },
  headStyles: {
    fillColor: BRAND.primary,
    textColor: 255,
    fontStyle: "bold" as const,
    halign: "left" as const,
  },
  alternateRowStyles: {
    fillColor: BRAND.surface,
  },
  margin: { left: 48, right: 48 },
};

function appendSheet(
  workbook: XLSX.WorkBook,
  name: string,
  headers: string[],
  rows: Array<Array<string | number | null | undefined>>,
  options?: Parameters<typeof buildDataSheet>[2],
) {
  XLSX.utils.book_append_sheet(workbook, buildDataSheet(headers, rows, options), name.slice(0, 31));
}

function employeeRows(result: AnalysisResult, options?: ExportOptions) {
  return result.range_penetration.map((row) => [
    row.row_number,
    row.employee_id ?? "",
    displayEmployeeName(row.employee_id, row.employee_name, options),
    row.department ?? "",
    row.job_level ?? "",
    row.salary ?? "",
    row.range_min ?? "",
    row.range_max ?? "",
    row.compa_ratio != null ? row.compa_ratio / 100 : "",
    row.range_penetration != null ? row.range_penetration / 100 : "",
    row.gap_to_minimum ?? "",
    row.merit_increase != null ? row.merit_increase / 100 : "",
  ]);
}

export function downloadReportExcel(
  result: AnalysisResult,
  filename = `${REPORT_FILENAME}.xlsx`,
  options?: ExportOptions,
) {
  const workbook = XLSX.utils.book_new();
  const resolvedName = options?.trialMode ? exportFilename(REPORT_FILENAME, "xlsx", true) : filename;

  XLSX.utils.book_append_sheet(workbook, buildOverviewSheet(result, options), "Overview");

  if (result.review_queue?.items?.length) {
    appendSheet(
      workbook,
      "Review Queue",
      ["Priority", "Severity", "Category", "Employee", "Department", "Reason"],
      result.review_queue.items.map((item) => [
        item.priority,
        item.severity,
        item.category,
        displayEmployeeName(item.employee_id, item.employee_name, options),
        item.department ?? "",
        item.reason,
      ]),
      { columnWidths: [10, 12, 18, 22, 16, 48], freezeHeader: true },
    );
  }

  if (result.below_minimum.length > 0) {
    appendSheet(
      workbook,
      "Below Minimum",
      ["Row", "Employee ID", "Name", "Department", "Level", "Salary", "Range Min", "Gap to Minimum"],
      result.below_minimum.map((row) => [
        row.row_number,
        row.employee_id ?? "",
        displayEmployeeName(row.employee_id, row.employee_name, options),
        row.department ?? "",
        row.job_level ?? "",
        row.salary ?? "",
        row.range_min ?? "",
        row.gap_to_minimum ?? "",
      ]),
      {
        columnWidths: [8, 14, 22, 18, 10, 12, 12, 14],
        currencyColumns: [5, 6, 7],
        freezeHeader: true,
      },
    );
  }

  if (result.above_maximum.length > 0) {
    appendSheet(
      workbook,
      "Above Maximum",
      ["Row", "Employee ID", "Name", "Department", "Salary", "Range Max", "Range Penetration %"],
      result.above_maximum.map((row) => [
        row.row_number,
        row.employee_id ?? "",
        displayEmployeeName(row.employee_id, row.employee_name, options),
        row.department ?? "",
        row.salary ?? "",
        row.range_max ?? "",
        row.range_penetration != null ? row.range_penetration / 100 : "",
      ]),
      { columnWidths: [8, 14, 22, 18, 12, 12, 16], currencyColumns: [4, 5], percentColumns: [6], freezeHeader: true },
    );
  }

  appendSheet(
    workbook,
    "All Employees",
    [
      "Row",
      "Employee ID",
      "Name",
      "Department",
      "Level",
      "Salary",
      "Range Min",
      "Range Max",
      "Compa Ratio",
      "Range Penetration",
      "Gap to Minimum",
      "Merit Increase",
    ],
    employeeRows(result, options),
    {
      columnWidths: [8, 14, 22, 16, 10, 12, 12, 12, 12, 14, 14, 12],
      currencyColumns: [5, 6, 7, 10],
      percentColumns: [8, 9, 11],
      freezeHeader: true,
    },
  );

  if (result.compression.length > 0) {
    appendSheet(
      workbook,
      "Compression",
      ["Type", "Description", "Employee", "Row"],
      result.compression.map((issue) => [
        issue.issue_type,
        issue.description,
        displayEmployeeName(issue.employee_id, issue.employee_name, options),
        issue.row_number ?? "",
      ]),
      { columnWidths: [16, 48, 22, 8], freezeHeader: true },
    );
  }

  if (result.managers_below_reports.length > 0) {
    appendSheet(
      workbook,
      "Managers Below Reports",
      ["Manager ID", "Manager", "Manager Pay", "Report ID", "Report", "Report Pay", "Gap"],
      result.managers_below_reports.map((row) => [
        row.manager_id,
        displayEmployeeName(row.manager_id, row.manager_name, options),
        row.manager_salary,
        row.report_id,
        displayEmployeeName(row.report_id, row.report_name, options),
        row.report_salary,
        row.pay_gap,
      ]),
      { columnWidths: [14, 22, 14, 14, 22, 14, 12], currencyColumns: [2, 5, 6], freezeHeader: true },
    );
  }

  if (result.compa_penetration_summary?.available) {
    const summaryData = result.compa_penetration_summary;
    appendSheet(
      workbook,
      "Compa Summary",
      ["Group", "Headcount", "Avg Compa", "Median Compa", "Below 90%", "90-110%", "Above 110%"],
      [
        ...summaryData.by_level.map((row) => [
          `Level: ${row.group_key}`,
          row.headcount,
          row.average_compa != null ? row.average_compa / 100 : "",
          row.median_compa != null ? row.median_compa / 100 : "",
          row.below_90,
          row.between_90_110,
          row.above_110,
        ]),
        ...summaryData.by_department.map((row) => [
          `Dept: ${row.group_key}`,
          row.headcount,
          row.average_compa != null ? row.average_compa / 100 : "",
          row.median_compa != null ? row.median_compa / 100 : "",
          row.below_90,
          row.between_90_110,
          row.above_110,
        ]),
      ],
      { columnWidths: [24, 12, 12, 12, 12, 12, 12], percentColumns: [2, 3], freezeHeader: true },
    );
  }

  if (result.merit_matrix?.flags?.length) {
    appendSheet(
      workbook,
      "Merit Matrix",
      ["Employee", "Department", "Compa", "Merit %", "Band", "Guideline Min", "Guideline Max", "Reason"],
      result.merit_matrix.flags.map((row) => [
        displayEmployeeName(row.employee_id, row.employee_name, options),
        row.department ?? "",
        row.compa_ratio != null ? row.compa_ratio / 100 : "",
        row.merit_increase != null ? row.merit_increase / 100 : "",
        row.matrix_band,
        row.expected_merit_min != null ? row.expected_merit_min / 100 : "",
        row.expected_merit_max != null ? row.expected_merit_max / 100 : "",
        row.reason,
      ]),
      { columnWidths: [22, 16, 10, 10, 14, 12, 12, 40], percentColumns: [2, 3, 5, 6], freezeHeader: true },
    );
  }

  if (result.pay_equity.available) {
    const equity = result.pay_equity;
    appendSheet(
      workbook,
      "Pay Equity",
      ["Section", "Group / Scope", "Headcount", "Metric", "Value", "Notes"],
      [
        ["Disclaimer", equity.disclaimer, "", "", "", ""],
        ...equity.gender_groups.flatMap((group) => [
          ["Gender", group.group_name, group.headcount, "Median salary", group.median_salary ?? "", group.suppressed ? "Suppressed" : ""],
          ["Gender", group.group_name, group.headcount, "Median compa", group.median_compa_ratio ?? "", ""],
        ]),
        ...equity.gender_gaps.map((gap) => [
          "Gender gap",
          `${gap.higher_paid_group} vs ${gap.lower_paid_group}`,
          "",
          gap.scope,
          gap.gap_amount,
          gap.gap_percent != null ? `${gap.gap_percent}%` : "",
        ]),
        ...equity.race_groups.flatMap((group) => [
          ["Race", group.group_name, group.headcount, "Median salary", group.median_salary ?? "", group.suppressed ? "Suppressed" : ""],
        ]),
        ...equity.race_gaps.map((gap) => [
          "Race gap",
          `${gap.higher_paid_group} vs ${gap.lower_paid_group}`,
          "",
          gap.scope,
          gap.gap_amount,
          gap.gap_percent != null ? `${gap.gap_percent}%` : "",
        ]),
      ],
      { columnWidths: [14, 28, 12, 16, 14, 14], currencyColumns: [4], freezeHeader: true },
    );
  }

  if (result.tenure.available) {
    const tenure = result.tenure;
    appendSheet(
      workbook,
      "Tenure",
      ["Section", "Band / Employee", "Headcount", "Metric", "Value"],
      [
        ["Disclaimer", tenure.disclaimer, "", "", ""],
        ...tenure.bands.flatMap((band) => [
          ["Band", band.band_label, band.headcount, "Median salary", band.median_salary ?? ""],
          ["Band", band.band_label, band.headcount, "Median tenure (yrs)", band.median_tenure_years ?? ""],
        ]),
        ...tenure.flags.map((flag) => [
          "Flag",
          displayEmployeeName(flag.employee_id, flag.employee_name, options),
          "",
          flag.flag_type,
          flag.salary,
        ]),
      ],
      { columnWidths: [12, 28, 12, 18, 14], currencyColumns: [4], freezeHeader: true },
    );
  }

  if (result.location_pay.available) {
    const location = result.location_pay;
    appendSheet(
      workbook,
      "Location Pay",
      ["Section", "Location / Scope", "Headcount", "Metric", "Value"],
      [
        ["Disclaimer", location.disclaimer, "", "", ""],
        ...location.location_groups.map((group) => [
          "Location",
          group.group_name,
          group.headcount,
          "Median salary",
          group.suppressed ? "Hidden" : group.median_salary ?? "",
        ]),
        ...location.location_gaps.map((gap) => [
          "Gap",
          `${gap.higher_paid_group} vs ${gap.lower_paid_group}`,
          "",
          gap.scope,
          gap.gap_amount,
        ]),
      ],
      { columnWidths: [12, 28, 12, 18, 14], currencyColumns: [4], freezeHeader: true },
    );
  }

  if (result.duplicate_ids.length > 0) {
    appendSheet(
      workbook,
      "Duplicate IDs",
      ["Employee ID", "Occurrences", "Rows"],
      result.duplicate_ids.map((group) => [group.employee_id, group.count, group.rows.join(", ")]),
      { columnWidths: [18, 14, 40], freezeHeader: true },
    );
  }

  if (result.missing_data.length > 0) {
    appendSheet(
      workbook,
      "Missing Data",
      ["Row", "Employee ID", "Name", "Missing Fields"],
      result.missing_data.map((row) => [
        row.row_number,
        row.employee_id ?? "",
        displayEmployeeName(row.employee_id, row.employee_name, options),
        row.missing_fields.join(", "),
      ]),
      { columnWidths: [8, 14, 22, 48], freezeHeader: true },
    );
  }

  if (result.missing_bonus_targets.length > 0) {
    appendSheet(
      workbook,
      "Missing Bonus Targets",
      ["Row", "Employee ID", "Name"],
      result.missing_bonus_targets.map((row) => [
        row.row_number,
        row.employee_id ?? "",
        displayEmployeeName(row.employee_id, row.employee_name, options),
      ]),
      { columnWidths: [8, 14, 28], freezeHeader: true },
    );
  }

  if (result.missing_salary_ranges.length > 0) {
    appendSheet(
      workbook,
      "Missing Salary Ranges",
      ["Row", "Employee ID", "Name", "Missing Fields"],
      result.missing_salary_ranges.map((row) => [
        row.row_number,
        row.employee_id ?? "",
        displayEmployeeName(row.employee_id, row.employee_name, options),
        row.missing_fields.join(", "),
      ]),
      { columnWidths: [8, 14, 22, 36], freezeHeader: true },
    );
  }

  if (result.invalid_effective_dates.length > 0) {
    appendSheet(
      workbook,
      "Invalid Effective Dates",
      ["Row", "Employee ID", "Name", "Effective Date", "Issue"],
      result.invalid_effective_dates.map((row) => [
        row.row_number,
        row.employee_id ?? "",
        displayEmployeeName(row.employee_id, row.employee_name, options),
        row.effective_date ?? "",
        row.reason,
      ]),
      { columnWidths: [8, 14, 22, 16, 40], freezeHeader: true },
    );
  }

  if (result.compa_ratios.length > 0) {
    appendSheet(
      workbook,
      "Compa-Ratio",
      ["Row", "Employee ID", "Name", "Salary", "Range Midpoint", "Compa Ratio"],
      result.compa_ratios.map((row) => [
        row.row_number,
        row.employee_id ?? "",
        displayEmployeeName(row.employee_id, row.employee_name, options),
        row.salary,
        row.range_midpoint,
        row.compa_ratio != null ? row.compa_ratio / 100 : "",
      ]),
      { columnWidths: [8, 14, 22, 12, 14, 12], currencyColumns: [3, 4], percentColumns: [5], freezeHeader: true },
    );
  }

  if (result.total_cash_comp?.available) {
    appendSheet(
      workbook,
      "Total Cash Comp",
      ["Employee", "Base", "Bonus Target", "Target Bonus", "Total Cash", "Base Compa", "TCC Compa"],
      result.total_cash_comp.employees.map((row) => [
        displayEmployeeName(row.employee_id, row.employee_name, options),
        row.base_salary,
        row.bonus_target_percent != null ? row.bonus_target_percent / 100 : "",
        row.target_bonus_amount,
        row.total_cash_comp,
        row.base_compa_ratio != null ? row.base_compa_ratio / 100 : "",
        row.tcc_compa_ratio != null ? row.tcc_compa_ratio / 100 : "",
      ]),
      {
        columnWidths: [22, 12, 12, 14, 14, 12, 12],
        currencyColumns: [1, 3, 4],
        percentColumns: [2, 5, 6],
        freezeHeader: true,
      },
    );
  }

  if (result.new_hire_placement?.available) {
    appendSheet(
      workbook,
      "New Hire Placement",
      ["Employee", "Hire Date", "Days", "Salary", "Compa", "Penetration", "Placement Issue"],
      result.new_hire_placement.employees.map((row) => [
        displayEmployeeName(row.employee_id, row.employee_name, options),
        row.hire_date ?? "",
        row.tenure_days,
        row.salary,
        row.compa_ratio != null ? row.compa_ratio / 100 : "",
        row.range_penetration != null ? row.range_penetration / 100 : "",
        row.placement_issue,
      ]),
      {
        columnWidths: [22, 12, 8, 12, 10, 12, 36],
        currencyColumns: [3],
        percentColumns: [4, 5],
        freezeHeader: true,
      },
    );
  }

  if (result.outlier_merit_increases.length > 0) {
    appendSheet(
      workbook,
      "Outlier Merit",
      ["Row", "Employee ID", "Name", "Merit Increase", "Reason"],
      result.outlier_merit_increases.map((row) => [
        row.row_number,
        row.employee_id ?? "",
        displayEmployeeName(row.employee_id, row.employee_name, options),
        row.merit_increase != null ? row.merit_increase / 100 : "",
        row.reason,
      ]),
      { columnWidths: [8, 14, 24, 14, 48], percentColumns: [3], freezeHeader: true },
    );
  }

  if ((result.equity_grants ?? []).length > 0) {
    appendSheet(
      workbook,
      "Equity Grants",
      ["Row", "Employee ID", "Name", "Department", "Equity Grant", "Outlier", "Reason"],
      result.equity_grants.map((row) => [
        row.row_number,
        row.employee_id ?? "",
        displayEmployeeName(row.employee_id, row.employee_name, options),
        row.department ?? "",
        row.equity_grant != null ? row.equity_grant / 100 : "",
        row.is_outlier ? "Yes" : "No",
        row.reason ?? "",
      ]),
      { columnWidths: [8, 14, 22, 16, 12, 10, 36], percentColumns: [4], freezeHeader: true },
    );
  }

  XLSX.writeFile(workbook, resolvedName);
}

/** Leadership-ready PDF: branded summary for comp cycle readouts. */
export function downloadSummaryPdf(
  result: AnalysisResult,
  filename = `${SUMMARY_FILENAME}.pdf`,
  options?: ExportOptions,
) {
  const resolvedName = options?.trialMode ? exportFilename(SUMMARY_FILENAME, "pdf", true) : filename;
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });
  const { insights, summary } = result;
  const margin = 48;
  const meritPercent = options?.targetMeritPercent;
  const scenario = resolveMeritScenario(insights);
  const activeMeritPercent =
    meritPercent != null && Number.isFinite(meritPercent)
      ? meritPercent
      : scenario.reference_merit_percent;
  const projectedMeritPool =
    meritPercent != null && Number.isFinite(meritPercent)
      ? (insights.merit_calculator.payroll_base * meritPercent) / 100
      : scenario.reference_merit_pool;
  const totalBudgetImpact = scenario.cost_to_minimum + projectedMeritPool;
  const generatedAt = new Date().toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  let y = drawPdfHeader(doc, "Compensation Cycle Summary", [
    `Generated ${generatedAt}`,
    `${summary.valid_rows} employees analyzed · ${summary.total_rows} rows in source file`,
    options?.anonymize ? "Anonymized export" : "Confidential — internal use only",
  ], margin);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...riskColor(insights.executive_summary.risk_level));
  doc.text(`Cycle risk: ${insights.executive_summary.risk_level.toUpperCase()}`, margin, y);
  doc.setTextColor(0, 0, 0);
  y += 18;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  const headlineLines = doc.splitTextToSize(insights.executive_summary.headline, 516);
  doc.text(headlineLines, margin, y);
  y += headlineLines.length * 14 + 12;

  autoTable(doc, {
    startY: y,
    head: [["Merit scenario", "Amount"]],
    body: [
      [
        "Cost to range minimum",
        `${formatMoney(scenario.cost_to_minimum)} (${scenario.employees_below_minimum} employees)`,
      ],
      ["Eligible payroll base", formatMoney(scenario.payroll_base)],
      [
        `Merit pool at ${activeMeritPercent.toFixed(1).replace(/\.0$/, "")}%`,
        formatMoney(projectedMeritPool),
      ],
      ["Total budget exposure", formatMoney(totalBudgetImpact)],
      ...(scenario.uploaded_merit_pool != null
        ? [["Uploaded file merit pool", formatMoney(scenario.uploaded_merit_pool)]]
        : []),
      ...scenario.scenarios.map((row) => [
        `Scenario: ${row.merit_percent.toFixed(1).replace(/\.0$/, "")}% merit`,
        formatMoney(row.projected_pool),
      ]),
    ],
    ...TABLE_THEME,
    columnStyles: { 1: { halign: "right" } },
  });

  y = ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y) + 18;

  autoTable(doc, {
    startY: y,
    head: [["Compa-ratio metric", "Value"]],
    body: [
      [
        "Average compa-ratio",
        insights.compa_ratio.average_compa_ratio != null
          ? formatPercent(insights.compa_ratio.average_compa_ratio)
          : "—",
      ],
      ["Employees below 90% compa", String(insights.compa_ratio.below_90_percent)],
      ["Employees above 110% compa", String(insights.compa_ratio.above_110_percent)],
    ],
    ...TABLE_THEME,
    columnStyles: { 1: { halign: "right" } },
  });

  y = ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y) + 18;

  autoTable(doc, {
    startY: y,
    head: [["Priority issue", "Count"]],
    body: [
      ["Review queue items", String(summary.review_queue_items ?? result.review_queue?.total_items ?? 0)],
      ["Below range minimum", String(summary.below_minimum)],
      ["Above range maximum", String(summary.above_maximum)],
      ["New hires below range", String(summary.new_hire_placement_flags ?? 0)],
      ["Managers below reports", String(summary.managers_below_reports)],
      ["Merit matrix flags", String(summary.merit_matrix_flags ?? 0)],
      ["Peer pay spread flags", String(summary.peer_spread_flags ?? 0)],
      ["Compression issues", String(summary.compression_issues)],
      ["Pay equity gaps", String(summary.pay_equity_gaps)],
    ].filter((row) => row[1] !== "0"),
    ...TABLE_THEME,
    columnStyles: { 1: { halign: "right" } },
  });

  y = ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y) + 18;

  if (result.penetration_distribution?.available) {
    autoTable(doc, {
      startY: y,
      head: [["Range penetration band", "Employees", "Share"]],
      body: result.penetration_distribution.bands.map((band) => [
        band.label,
        String(band.count),
        formatPercent(band.percent, 1),
      ]),
      ...TABLE_THEME,
      columnStyles: { 1: { halign: "right" }, 2: { halign: "right" } },
    });
    y = ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y) + 18;
  }

  if (y > 620) {
    doc.addPage();
    y = margin;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Key findings", margin, y);
  y += 14;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  for (const bullet of insights.executive_summary.bullets.slice(0, 8)) {
    const lines = doc.splitTextToSize(`• ${bullet}`, 516);
    if (y + lines.length * 12 > 720) {
      doc.addPage();
      y = margin;
    }
    doc.text(lines, margin, y);
    y += lines.length * 12 + 4;
  }

  if (result.review_queue?.items?.length) {
    if (y > 640) {
      doc.addPage();
      y = margin;
    }
    y += 8;
    autoTable(doc, {
      startY: y,
      head: [["Top review queue items", "Severity", "Category"]],
      body: result.review_queue.items.slice(0, 12).map((item) => [
        item.reason.length > 72 ? `${item.reason.slice(0, 69)}…` : item.reason,
        item.severity,
        item.category,
      ]),
      ...TABLE_THEME,
    });
  }

  pdfFooter(doc, margin);
  if (options?.trialMode) {
    drawTrialWatermark(doc);
  }

  triggerDownload(doc.output("blob"), resolvedName);
}

/** @deprecated Use downloadReportExcel */
export const downloadAnalysisExcel = downloadReportExcel;

/** @deprecated Use downloadSummaryPdf */
export const downloadExecutiveSummaryPdf = downloadSummaryPdf;

export { displayEmployeeName, formatMoney, triggerDownload };
