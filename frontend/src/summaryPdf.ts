import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { AnalysisResult } from "./types";
import { resolveMeritScenario } from "./meritScenario";
import {
  BRAND,
  drawPdfHeader,
  drawTrialWatermark,
  formatMoney,
  formatPercent,
  pdfFooter,
  riskColor,
  type ExportOptions,
} from "./exportFormatters";

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

/** Build the leadership summary PDF document (same output as the in-app export). */
export function buildSummaryPdfDocument(
  result: AnalysisResult,
  options?: ExportOptions,
): jsPDF {
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

  return doc;
}
