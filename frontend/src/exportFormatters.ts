import type { AnalysisResult } from "./types";
import * as XLSX from "xlsx";

export type ExportOptions = {
  targetMeritPercent?: number | null;
  anonymize?: boolean;
  trialMode?: boolean;
};

export const BRAND = {
  name: "ShiftWorksHR",
  tagline: "Compensation cycle analysis",
  primary: [26, 77, 58] as [number, number, number],
  primaryMid: [47, 125, 90] as [number, number, number],
  surface: [240, 247, 242] as [number, number, number],
  muted: [79, 99, 89] as [number, number, number],
};

export function displayEmployeeName(
  employeeId: string | null | undefined,
  employeeName: string | null | undefined,
  options?: ExportOptions,
): string {
  if (options?.anonymize) {
    return employeeId ? `Employee ${employeeId}` : "Employee";
  }
  return employeeName ?? employeeId ?? "";
}

export function formatMoney(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value: number | null | undefined, digits = 1): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${value.toFixed(digits)}%`;
}

export function colLetter(index: number): string {
  let letter = "";
  let n = index + 1;
  while (n > 0) {
    const rem = (n - 1) % 26;
    letter = String.fromCharCode(65 + rem) + letter;
    n = Math.floor((n - 1) / 26);
  }
  return letter;
}

export function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

type SheetBuildOptions = {
  columnWidths?: number[];
  currencyColumns?: number[];
  percentColumns?: number[];
  freezeHeader?: boolean;
};

export function buildDataSheet(
  headers: string[],
  rows: Array<Array<string | number | null | undefined>>,
  options: SheetBuildOptions = {},
): XLSX.WorkSheet {
  const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const totalRows = rows.length + 1;
  const lastCol = colLetter(headers.length - 1);

  sheet["!cols"] = (options.columnWidths ?? headers.map(() => 16)).map((wch) => ({ wch }));

  if (totalRows > 1) {
    sheet["!autofilter"] = { ref: `A1:${lastCol}${totalRows}` };
  }

  if (options.freezeHeader) {
    sheet["!freeze"] = { xSplit: 0, ySplit: 1, topLeftCell: "A2", activePane: "bottomLeft" };
  }

  const currencyCols = options.currencyColumns ?? [];
  for (const colIndex of currencyCols) {
    const letter = colLetter(colIndex);
    for (let row = 2; row <= totalRows; row++) {
      const ref = `${letter}${row}`;
      const cell = sheet[ref];
      if (cell && typeof cell.v === "number") {
        cell.z = "$#,##0";
        cell.t = "n";
      }
    }
  }

  const percentCols = options.percentColumns ?? [];
  for (const colIndex of percentCols) {
    const letter = colLetter(colIndex);
    for (let row = 2; row <= totalRows; row++) {
      const ref = `${letter}${row}`;
      const cell = sheet[ref];
      if (cell && typeof cell.v === "number") {
        cell.z = "0.0%";
        cell.t = "n";
      }
    }
  }

  return sheet;
}

export function buildOverviewSheet(result: AnalysisResult, options?: ExportOptions): XLSX.WorkSheet {
  const { insights, summary } = result;
  const generatedAt = new Date().toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const meritPercent = options?.targetMeritPercent;
  const projectedMeritPool =
    meritPercent != null && Number.isFinite(meritPercent)
      ? (insights.merit_calculator.payroll_base * meritPercent) / 100
      : insights.budget_impact.projected_merit_pool;
  const totalBudgetImpact = insights.budget_impact.cost_to_minimum + projectedMeritPool;

  const rows: Array<Array<string | number>> = [
    ...(options?.trialMode
      ? [
          ["FREE TRIAL EXPORT"],
          ["Upgrade at shiftworkshr.com for full exports without watermark."],
          [],
        ]
      : []),
    ["COMPENSATION CYCLE ANALYSIS REPORT"],
    [BRAND.name, BRAND.tagline],
    ["Generated", generatedAt],
    ["Employees analyzed", summary.valid_rows],
    ["Risk level", insights.executive_summary.risk_level.toUpperCase()],
    [],
    ["EXECUTIVE SUMMARY"],
    [insights.executive_summary.headline],
    [],
    ["KEY FINDINGS"],
    ...insights.executive_summary.bullets.map((bullet) => ["", bullet]),
    [],
    ["BUDGET IMPACT"],
    ["Metric", "Value"],
    ["Cost to bring employees to range minimum", insights.budget_impact.cost_to_minimum],
    ["Projected merit pool", projectedMeritPool],
    ["Total budget impact", totalBudgetImpact],
    ["Payroll base (merit eligible)", insights.merit_calculator.payroll_base],
    [
      "Target merit % (user input)",
      meritPercent != null && Number.isFinite(meritPercent) ? meritPercent : "—",
    ],
    [],
    ["COMPA-RATIO SUMMARY"],
    [
      "Average compa-ratio",
      insights.compa_ratio.average_compa_ratio != null
        ? insights.compa_ratio.average_compa_ratio / 100
        : "—",
    ],
    ["Employees below 90%", insights.compa_ratio.below_90_percent],
    ["Employees 90% – 110%", insights.compa_ratio.between_90_and_110],
    ["Employees above 110%", insights.compa_ratio.above_110_percent],
    [],
    ["PRIORITY ISSUE COUNTS"],
    ["Metric", "Count"],
    ["Review queue items", summary.review_queue_items ?? result.review_queue?.total_items ?? 0],
    ["Below range minimum", summary.below_minimum],
    ["Above range maximum", summary.above_maximum],
    ["New hires below range", summary.new_hire_placement_flags ?? 0],
    ["Managers below reports", summary.managers_below_reports],
    ["Merit matrix flags", summary.merit_matrix_flags ?? 0],
    ["Merit vs compa flags", summary.merit_compa_flags ?? 0],
    ["Peer pay spread flags", summary.peer_spread_flags ?? 0],
    ["Range structure issues", summary.range_structure_issues ?? 0],
    ["Compression issues", summary.compression_issues],
    ["Duplicate employee IDs", summary.duplicate_ids],
    ["Pay equity gaps", summary.pay_equity_gaps],
    ["Tenure pay flags", summary.tenure_pay_flags ?? 0],
    ["Location pay gaps", summary.location_pay_gaps ?? 0],
    [],
    ["NOTES"],
    [
      "This workbook contains summary and detail tabs for compensation QA.",
      "Employee-level detail is on All Employees and issue-specific tabs.",
    ],
    options?.anonymize ? ["Export mode", "Anonymized — names replaced with employee IDs."] : [],
  ].filter((row) => row.length > 0);

  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet["!cols"] = [{ wch: 36 }, { wch: 52 }, { wch: 18 }, { wch: 18 }];
  const executiveHeadlineRow = rows.findIndex((row) => row[0] === "EXECUTIVE SUMMARY") + 1;
  sheet["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } },
    ...(executiveHeadlineRow > 0
      ? [{ s: { r: executiveHeadlineRow, c: 0 }, e: { r: executiveHeadlineRow, c: 3 } }]
      : []),
  ];

  const currencyLabels = new Set([
    "Cost to bring employees to range minimum",
    "Projected merit pool",
    "Total budget impact",
    "Payroll base (merit eligible)",
  ]);
  const percentLabels = new Set(["Average compa-ratio"]);

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const label = rows[rowIndex][0];
    const ref = `B${rowIndex + 1}`;
    const cell = sheet[ref];
    if (!cell || typeof cell.v !== "number") continue;
    if (currencyLabels.has(String(label))) {
      cell.z = "$#,##0";
    } else if (percentLabels.has(String(label))) {
      cell.z = "0.0%";
    }
  }

  return sheet;
}

export function pdfFooter(doc: import("jspdf").jsPDF, margin: number) {
  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page++) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...BRAND.muted);
    doc.text(
      `${BRAND.name} · Confidential · For internal compensation planning only`,
      margin,
      doc.internal.pageSize.getHeight() - 28,
    );
    doc.text(
      `Page ${page} of ${pageCount}`,
      doc.internal.pageSize.getWidth() - margin,
      doc.internal.pageSize.getHeight() - 28,
      { align: "right" },
    );
  }
}

export function drawPdfHeader(
  doc: import("jspdf").jsPDF,
  subtitle: string,
  metaLines: string[],
  margin: number,
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFillColor(...BRAND.primary);
  doc.rect(0, 0, pageWidth, 88, "F");
  doc.setFillColor(...BRAND.primaryMid);
  doc.rect(0, 84, pageWidth, 4, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text(BRAND.name, margin, 38);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.text(subtitle, margin, 58);

  doc.setFontSize(9);
  let metaY = 72;
  for (const line of metaLines) {
    doc.text(line, margin, metaY);
    metaY += 12;
  }

  doc.setTextColor(0, 0, 0);
  return 108;
}

export function drawTrialWatermark(doc: import("jspdf").jsPDF) {
  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page++) {
    doc.setPage(page);
    const { width, height } = doc.internal.pageSize;
    doc.saveGraphicsState();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(72);
    doc.setTextColor(220, 228, 223);
    doc.text("TRIAL", width / 2, height / 2, { align: "center", angle: 35 });
    doc.restoreGraphicsState();
  }
}

export function riskColor(risk: string): [number, number, number] {
  if (risk === "high") return [192, 57, 43];
  if (risk === "moderate") return [217, 119, 6];
  return BRAND.primaryMid;
}
