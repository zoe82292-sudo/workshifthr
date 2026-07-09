import { useEffect, useState } from "react";
import * as pdfjs from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { getBundledDemoAnalysis } from "../data/bundledDemoAnalysis";
import { BRAND } from "../exportFormatters";
import { resolveMeritScenario } from "../meritScenario";
import { buildSummaryPdfDocument } from "../summaryPdf";

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

function formatMoney(value: number) {
  return `$${Math.round(value).toLocaleString()}`;
}

function formatPercent(value: number, digits = 1) {
  return `${value.toFixed(digits)}%`;
}

function PdfTable({
  columns,
  rows,
}: {
  columns: [string, string] | [string, string, string];
  rows: string[][];
}) {
  return (
    <table className="demo-pdf-preview__table">
      <thead>
        <tr>
          {columns.map((column) => (
            <th key={column} scope="col">
              {column}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.join("|")}>
            {row.map((cell, index) => (
              <td key={`${row[0]}-${index}`}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function HtmlPdfPreview() {
  const result = getBundledDemoAnalysis();
  const { insights, summary } = result;
  const exec = insights.executive_summary;
  const compa = insights.compa_ratio;
  const scenario = resolveMeritScenario(insights);
  const generatedAt = new Date().toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const meritScenarioRows = [
    [
      "Cost to range minimum",
      `${formatMoney(scenario.cost_to_minimum)} (${scenario.employees_below_minimum} employees)`,
    ],
    ["Eligible payroll base", formatMoney(scenario.payroll_base)],
    [
      `Merit pool at ${scenario.reference_merit_percent.toFixed(1).replace(/\.0$/, "")}%`,
      formatMoney(scenario.reference_merit_pool),
    ],
    ["Total budget exposure", formatMoney(scenario.total_exposure)],
    ...(scenario.uploaded_merit_pool != null
      ? [["Uploaded file merit pool", formatMoney(scenario.uploaded_merit_pool)]]
      : []),
    ...scenario.scenarios.map((row) => [
      `Scenario: ${row.merit_percent.toFixed(1).replace(/\.0$/, "")}% merit`,
      formatMoney(row.projected_pool),
    ]),
  ];

  const compaRows = [
    [
      "Average compa-ratio",
      compa.average_compa_ratio != null ? formatPercent(compa.average_compa_ratio) : "—",
    ],
    ["Employees below 90% compa", String(compa.below_90_percent)],
    ["Employees above 110% compa", String(compa.above_110_percent)],
  ];

  const issueRows = [
    ["Review queue items", String(summary.review_queue_items ?? result.review_queue?.total_items ?? 0)],
    ["Below range minimum", String(summary.below_minimum)],
    ["Above range maximum", String(summary.above_maximum)],
    ["New hires below range", String(summary.new_hire_placement_flags ?? 0)],
    ["Managers below reports", String(summary.managers_below_reports)],
    ["Merit matrix flags", String(summary.merit_matrix_flags ?? 0)],
    ["Peer pay spread flags", String(summary.peer_spread_flags ?? 0)],
    ["Compression issues", String(summary.compression_issues)],
    ["Pay equity gaps", String(summary.pay_equity_gaps)],
  ].filter((row) => row[1] !== "0");

  const penetrationRows =
    result.penetration_distribution?.available
      ? result.penetration_distribution.bands.map((band) => [
          band.label,
          String(band.count),
          formatPercent(band.percent, 1),
        ])
      : [];

  const reviewQueueRows = result.review_queue?.items
    ? result.review_queue.items.slice(0, 8).map((item) => [
        item.reason.length > 72 ? `${item.reason.slice(0, 69)}…` : item.reason,
        item.severity,
        item.category,
      ])
    : [];

  return (
    <article className="demo-pdf-preview__page">
      <header className="demo-pdf-preview__header">
        <p className="demo-pdf-preview__brand">{BRAND.name}</p>
        <p className="demo-pdf-preview__subtitle">Compensation Cycle Summary</p>
        <div className="demo-pdf-preview__meta">
          <p>Generated {generatedAt}</p>
          <p>
            {summary.valid_rows} employees analyzed · {summary.total_rows} rows in source file
          </p>
          <p>Confidential — internal use only</p>
        </div>
        <div className="demo-pdf-preview__header-accent" aria-hidden />
      </header>

      <div className="demo-pdf-preview__body">
        <p className={`demo-pdf-preview__risk risk-${exec.risk_level}`}>
          Cycle risk: {exec.risk_level.toUpperCase()}
        </p>
        <p className="demo-pdf-preview__headline">{exec.headline}</p>

        <div className="demo-pdf-preview__tables">
          <PdfTable columns={["Merit scenario", "Amount"]} rows={meritScenarioRows} />
          <PdfTable columns={["Compa-ratio metric", "Value"]} rows={compaRows} />
          <PdfTable columns={["Priority issue", "Count"]} rows={issueRows} />
          {penetrationRows.length > 0 ? (
            <PdfTable
              columns={["Range penetration band", "Employees", "Share"]}
              rows={penetrationRows}
            />
          ) : null}
        </div>

        <h3 className="demo-pdf-preview__section-title">Key findings</h3>
        <ul className="demo-pdf-preview__bullets">
          {exec.bullets.slice(0, 8).map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>

        {reviewQueueRows.length > 0 ? (
          <>
            <h3 className="demo-pdf-preview__section-title">Top review queue items</h3>
            <PdfTable
              columns={["Top review queue items", "Severity", "Category"]}
              rows={reviewQueueRows}
            />
          </>
        ) : null}
      </div>

      <footer className="demo-pdf-preview__footer">
        <span>{BRAND.name} · Confidential · For internal compensation planning only</span>
        <span>Page 1 of 1</span>
      </footer>
    </article>
  );
}

function RenderedPdfPreview() {
  const [pageImages, setPageImages] = useState<string[]>([]);
  const [pageCount, setPageCount] = useState(1);

  useEffect(() => {
    let cancelled = false;

    async function renderPdfPages() {
      const result = getBundledDemoAnalysis();
      const doc = buildSummaryPdfDocument(result);
      const data = doc.output("arraybuffer");
      const pdf = await pdfjs.getDocument({ data }).promise;
      const images: string[] = [];
      const scale = 2.25;

      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        if (!context) continue;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: context, viewport }).promise;
        images.push(canvas.toDataURL("image/png"));
      }

      if (!cancelled) {
        setPageImages(images);
        setPageCount(pdf.numPages);
        document.querySelector(".demo-pdf-preview--video")?.setAttribute("data-pdf-ready", "true");
      }
    }

    void renderPdfPages().catch(() => {
      if (!cancelled) {
        document.querySelector(".demo-pdf-preview--video")?.setAttribute("data-pdf-ready", "true");
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  if (pageImages.length === 0) {
    return <p className="demo-pdf-preview__loading">Preparing PDF…</p>;
  }

  return (
    <div className="demo-pdf-preview__rendered-pages">
      {pageImages.map((src, index) => (
        <img
          key={src}
          src={src}
          alt={`Compensation Cycle Summary page ${index + 1} of ${pageCount}`}
          className="demo-pdf-preview__rendered-page"
        />
      ))}
    </div>
  );
}

export function DemoPdfPreview({ video = false }: { video?: boolean }) {
  return (
    <div
      className={`demo-pdf-preview${video ? " demo-pdf-preview--video" : ""}`}
      data-pdf-ready={video ? "false" : "true"}
    >
      {video ? <RenderedPdfPreview /> : <HtmlPdfPreview />}
    </div>
  );
}
