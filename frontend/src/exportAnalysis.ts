import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import type { AnalysisResult } from "./types";

const BASE_FILENAME = "shiftworkshr-analysis";

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

function summaryRows(result: AnalysisResult): Array<Array<string | number>> {
  const { insights, summary } = result;
  return [
    ["ShiftWorksHR Compensation Analysis"],
    [],
    ["Executive Summary"],
    ["Headline", insights.executive_summary.headline],
    ["Risk Level", insights.executive_summary.risk_level],
    ...insights.executive_summary.bullets.map((bullet) => ["", bullet]),
    [],
    ["Budget Impact"],
    ["Cost to Minimum", insights.budget_impact.cost_to_minimum],
    ["Projected Merit Pool", insights.budget_impact.projected_merit_pool],
    ["Total Budget Impact", insights.budget_impact.total_budget_impact],
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

export function downloadAnalysisExcel(result: AnalysisResult, filename = `${BASE_FILENAME}.xlsx`) {
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet(summaryRows(result)),
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

export function downloadAnalysisPdf(result: AnalysisResult, filename = `${BASE_FILENAME}.pdf`) {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });
  const { insights, summary } = result;
  const margin = 48;
  let y = margin;

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

  autoTable(doc, {
    startY: y + 8,
    head: [["Metric", "Value"]],
    body: [
      ["Risk Level", insights.executive_summary.risk_level],
      ["Cost to Minimum", formatMoney(insights.budget_impact.cost_to_minimum)],
      ["Projected Merit Pool", formatMoney(insights.budget_impact.projected_merit_pool)],
      ["Total Budget Impact", formatMoney(insights.budget_impact.total_budget_impact)],
      ["Average Compa-Ratio", insights.compa_ratio.average_compa_ratio != null ? `${insights.compa_ratio.average_compa_ratio}%` : "—"],
      ["Below Minimum", String(summary.below_minimum)],
      ["Above Maximum", String(summary.above_maximum)],
      ["Duplicate IDs", String(summary.duplicate_ids)],
      ["Compression Issues", String(summary.compression_issues)],
    ],
    styles: { fontSize: 10, cellPadding: 6 },
    headStyles: { fillColor: [15, 118, 110] },
    margin: { left: margin, right: margin },
  });

  const afterMetrics = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 120;

  if (result.below_minimum.length > 0) {
    autoTable(doc, {
      startY: afterMetrics + 24,
      head: [["Row", "Employee ID", "Name", "Salary", "Range Min", "Gap to Minimum"]],
      body: result.below_minimum.map((row) => [
        String(row.row_number),
        row.employee_id ?? "",
        row.employee_name ?? "",
        formatMoney(row.salary),
        formatMoney(row.range_min),
        formatMoney(row.gap_to_minimum),
      ]),
      styles: { fontSize: 9, cellPadding: 5 },
      headStyles: { fillColor: [180, 35, 24] },
      margin: { left: margin, right: margin },
      theme: "grid",
    });
  }

  doc.addPage();
  autoTable(doc, {
    startY: margin,
    head: [[
      "Row",
      "Employee ID",
      "Name",
      "Department",
      "Salary",
      "Range Min",
      "Range Max",
      "Compa %",
      "Penetration %",
    ]],
    body: result.range_penetration.map((row) => [
      String(row.row_number),
      row.employee_id ?? "",
      row.employee_name ?? "",
      row.department ?? "",
      formatMoney(row.salary),
      formatMoney(row.range_min),
      formatMoney(row.range_max),
      row.compa_ratio != null ? `${row.compa_ratio}%` : "",
      row.range_penetration != null ? `${row.range_penetration}%` : "",
    ]),
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [15, 118, 110] },
    margin: { left: margin, right: margin },
    theme: "striped",
  });

  const pdfBlob = doc.output("blob");
  triggerDownload(pdfBlob, filename);
}
