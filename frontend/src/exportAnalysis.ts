import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import type { AnalysisResult } from "./types";

const BASE_FILENAME = "shiftworkshr-analysis";

export type ExportOptions = {
  targetMeritPercent?: number | null;
};

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

function summaryRows(result: AnalysisResult, options?: ExportOptions): Array<Array<string | number>> {
  const { insights, summary } = result;
  const generatedAt = new Date().toLocaleString();
  const meritPercent = options?.targetMeritPercent;
  const projectedMeritPool =
    meritPercent != null && Number.isFinite(meritPercent)
      ? (insights.merit_calculator.payroll_base * meritPercent) / 100
      : insights.budget_impact.projected_merit_pool;
  const totalBudgetImpact = insights.budget_impact.cost_to_minimum + projectedMeritPool;
  return [
    ["ShiftWorksHR Compensation Analysis"],
    ["Generated", generatedAt],
    [],
    ["Executive Summary"],
    ["Headline", insights.executive_summary.headline],
    ["Risk Level", insights.executive_summary.risk_level],
    ...insights.executive_summary.bullets.map((bullet) => ["", bullet]),
    [],
    ["Budget Impact"],
    ["Cost to Minimum", insights.budget_impact.cost_to_minimum],
    ["Projected Merit Pool", projectedMeritPool],
    ["Total Budget Impact", totalBudgetImpact],
    [],
    ["Issue Counts"],
    ["Total Rows", summary.total_rows],
    ["Below Minimum", summary.below_minimum],
    ["Above Maximum", summary.above_maximum],
    ["Duplicate IDs", summary.duplicate_ids],
    ["Compression Issues", summary.compression_issues],
    ["Managers Below Reports", summary.managers_below_reports],
    ["Missing Bonus Targets", summary.missing_bonus_targets],
    ["Missing Salary Ranges", summary.missing_salary_ranges],
    ["Invalid Effective Dates", summary.invalid_effective_dates],
    ["Outlier Merit Increases", summary.outlier_merit_increases],
    ["Pay Equity Gaps", summary.pay_equity_gaps],
    [],
    ["Compa-Ratio Summary"],
    ["Average Compa-Ratio", insights.compa_ratio.average_compa_ratio ?? ""],
    ["Below 90%", insights.compa_ratio.below_90_percent],
    ["90% to 110%", insights.compa_ratio.between_90_and_110],
    ["Above 110%", insights.compa_ratio.above_110_percent],
  ];
}

function employeeRows(result: AnalysisResult): Array<Array<string | number | null>> {
  return result.range_penetration.map((row) => [
    row.row_number,
    row.employee_id ?? "",
    row.employee_name ?? "",
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

export function downloadAnalysisExcel(
  result: AnalysisResult,
  filename = `${BASE_FILENAME}.xlsx`,
  options?: ExportOptions,
) {
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet(summaryRows(result, options)),
    "Executive Summary",
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
      ...employeeRows(result),
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
          row.employee_name ?? "",
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
          row.employee_name ?? "",
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
          issue.employee_name ?? issue.employee_id ?? "",
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
          row.manager_name ?? "",
          row.manager_salary,
          row.report_id,
          row.report_name ?? "",
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
          row.employee_name ?? "",
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
          row.employee_name ?? "",
          row.merit_increase,
          row.reason,
        ]),
      ]),
      "Outlier Merit",
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
          row.employee_name ?? "",
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
          row.employee_name ?? "",
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
          row.employee_name ?? "",
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
          row.employee_name ?? "",
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

  XLSX.writeFile(workbook, filename);
}

export function downloadAnalysisPdf(
  result: AnalysisResult,
  filename = `${BASE_FILENAME}.pdf`,
  options?: ExportOptions,
) {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });
  const { insights, summary, pay_equity: payEquity } = result;
  const meritPercent = options?.targetMeritPercent;
  const projectedMeritPool =
    meritPercent != null && Number.isFinite(meritPercent)
      ? (insights.merit_calculator.payroll_base * meritPercent) / 100
      : insights.budget_impact.projected_merit_pool;
  const totalBudgetImpact = insights.budget_impact.cost_to_minimum + projectedMeritPool;
  const margin = 48;
  let y = margin;

  type AutoTableDoc = jsPDF & { lastAutoTable?: { finalY: number } };

  function nextY(fallback = margin) {
    return (doc as AutoTableDoc).lastAutoTable?.finalY ?? fallback;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("ShiftWorksHR Compensation Analysis", margin, y);
  y += 24;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`Generated ${new Date().toLocaleString()}`, margin, y);
  y += 28;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Executive Summary", margin, y);
  y += 16;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  const headlineLines = doc.splitTextToSize(insights.executive_summary.headline, 520);
  doc.text(headlineLines, margin, y);
  y += headlineLines.length * 14 + 8;

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
    doc.text(noteLines, margin, y + 4);
    y += noteLines.length * 14 + 8;
  }

  autoTable(doc, {
    startY: y + 8,
    head: [["Metric", "Value"]],
    body: [
      ["Risk Level", insights.executive_summary.risk_level],
      ["Cost to Minimum", formatMoney(insights.budget_impact.cost_to_minimum)],
      ["Projected Merit Pool", formatMoney(projectedMeritPool)],
      ["Total Budget Impact", formatMoney(totalBudgetImpact)],
      [
        "Average Compa-Ratio",
        insights.compa_ratio.average_compa_ratio != null
          ? `${insights.compa_ratio.average_compa_ratio}%`
          : "—",
      ],
      ["Below Minimum", String(summary.below_minimum)],
      ["Above Maximum", String(summary.above_maximum)],
      ["Duplicate IDs", String(summary.duplicate_ids)],
      ["Compression Issues", String(summary.compression_issues)],
      ["Managers Below Reports", String(summary.managers_below_reports)],
      ["Pay Equity Gaps", String(summary.pay_equity_gaps)],
      ["Missing Salary Ranges", String(summary.missing_salary_ranges)],
      ["Outlier Merit Increases", String(summary.outlier_merit_increases)],
    ],
    styles: { fontSize: 10, cellPadding: 6 },
    headStyles: { fillColor: [15, 118, 110] },
    margin: { left: margin, right: margin },
  });

  let sectionY = nextY(y + 120) + 24;

  const issueSections: Array<{
    title: string;
    head: string[];
    body: string[][];
    color: [number, number, number];
  }> = [];

  if (result.below_minimum.length > 0) {
    issueSections.push({
      title: "Below Minimum",
      head: ["Row", "Employee ID", "Name", "Salary", "Range Min", "Gap to Minimum"],
      body: result.below_minimum.map((row) => [
        String(row.row_number),
        row.employee_id ?? "",
        row.employee_name ?? "",
        formatMoney(row.salary),
        formatMoney(row.range_min),
        formatMoney(row.gap_to_minimum),
      ]),
      color: [180, 35, 24],
    });
  }

  if (result.above_maximum.length > 0) {
    issueSections.push({
      title: "Above Maximum",
      head: ["Row", "Employee ID", "Name", "Salary", "Range Max"],
      body: result.above_maximum.map((row) => [
        String(row.row_number),
        row.employee_id ?? "",
        row.employee_name ?? "",
        formatMoney(row.salary),
        formatMoney(row.range_max),
      ]),
      color: [180, 95, 24],
    });
  }

  if (result.compression.length > 0) {
    issueSections.push({
      title: "Salary Compression",
      head: ["Type", "Description", "Employee", "Row"],
      body: result.compression.map((issue) => [
        issue.issue_type,
        issue.description,
        issue.employee_name ?? issue.employee_id ?? "",
        issue.row_number != null ? String(issue.row_number) : "",
      ]),
      color: [120, 90, 20],
    });
  }

  if (result.managers_below_reports.length > 0) {
    issueSections.push({
      title: "Managers Below Reports",
      head: ["Manager", "Manager Pay", "Report", "Report Pay", "Gap"],
      body: result.managers_below_reports.map((issue) => [
        issue.manager_name ?? issue.manager_id,
        formatMoney(issue.manager_salary),
        issue.report_name ?? issue.report_id,
        formatMoney(issue.report_salary),
        formatMoney(issue.pay_gap),
      ]),
      color: [24, 78, 119],
    });
  }

  if (result.duplicate_ids.length > 0) {
    issueSections.push({
      title: "Duplicate IDs",
      head: ["Employee ID", "Occurrences", "Excel Rows"],
      body: result.duplicate_ids.map((group) => [
        group.employee_id,
        String(group.count),
        group.rows.join(", "),
      ]),
      color: [90, 90, 90],
    });
  }

  if (payEquity.available && (payEquity.gender_gaps.length > 0 || payEquity.race_gaps.length > 0)) {
    const combinedGaps = [...payEquity.gender_gaps, ...payEquity.race_gaps];
    issueSections.push({
      title: "Pay Equity Gaps",
      head: ["Dimension", "Scope", "Higher Paid", "Lower Paid", "Gap %", "Gap Amount"],
      body: combinedGaps.map((gap) => [
        gap.dimension,
        gap.scope,
        gap.higher_paid_group,
        gap.lower_paid_group,
        gap.gap_percent != null ? `${gap.gap_percent}%` : "",
        formatMoney(gap.gap_amount),
      ]),
      color: [15, 118, 110],
    });
  }

  for (const section of issueSections) {
    if (sectionY > 680) {
      doc.addPage();
      sectionY = margin;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(section.title, margin, sectionY);
    autoTable(doc, {
      startY: sectionY + 10,
      head: [section.head],
      body: section.body,
      styles: { fontSize: 9, cellPadding: 5 },
      headStyles: { fillColor: section.color },
      margin: { left: margin, right: margin },
      theme: "grid",
    });
    sectionY = nextY(sectionY + 40) + 24;
  }

  if (payEquity.disclaimer) {
    if (sectionY > 640) {
      doc.addPage();
      sectionY = margin;
    }
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    const disclaimerLines = doc.splitTextToSize(payEquity.disclaimer, 520);
    doc.text(disclaimerLines, margin, sectionY);
  }

  const pdfBlob = doc.output("blob");
  triggerDownload(pdfBlob, filename);
}

/** Leadership-ready export: executive summary and key metrics only. */
export function downloadExecutiveSummaryPdf(
  result: AnalysisResult,
  filename = "shiftworkshr-executive-summary.pdf",
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
  doc.text("ShiftWorksHR Executive Summary", margin, y);
  y += 24;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`Analysis · ${new Date().toLocaleDateString()}`, margin, y);
  y += 28;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Overview", margin, y);
  y += 16;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  const headlineLines = doc.splitTextToSize(insights.executive_summary.headline, 520);
  doc.text(headlineLines, margin, y);
  y += headlineLines.length * 14 + 8;

  for (const bullet of insights.executive_summary.bullets) {
    const lines = doc.splitTextToSize(`• ${bullet}`, 520);
    doc.text(lines, margin, y);
    y += lines.length * 14 + 4;
  }

  autoTable(doc, {
    startY: y + 8,
    head: [["Metric", "Value"]],
    body: [
      ["Risk Level", insights.executive_summary.risk_level],
      ["Cost to Minimum", formatMoney(insights.budget_impact.cost_to_minimum)],
      ["Projected Merit Pool", formatMoney(projectedMeritPool)],
      ["Total Budget Impact", formatMoney(totalBudgetImpact)],
      [
        "Average Compa-Ratio",
        insights.compa_ratio.average_compa_ratio != null
          ? `${insights.compa_ratio.average_compa_ratio}%`
          : "—",
      ],
      ["Below Minimum", String(summary.below_minimum)],
      ["Above Maximum", String(summary.above_maximum)],
      ["Compression Issues", String(summary.compression_issues)],
      ["Managers Below Reports", String(summary.managers_below_reports)],
      ["Pay Equity Gaps", String(summary.pay_equity_gaps)],
    ],
    styles: { fontSize: 10, cellPadding: 6 },
    headStyles: { fillColor: [15, 118, 110] },
    margin: { left: margin, right: margin },
  });

  const pdfBlob = doc.output("blob");
  triggerDownload(pdfBlob, filename);
}

export function downloadExecutiveSummaryExcel(
  result: AnalysisResult,
  filename = "shiftworkshr-executive-summary.xlsx",
  options?: ExportOptions,
) {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet(summaryRows(result, options)),
    "Executive Summary",
  );
  XLSX.writeFile(workbook, filename);
}
