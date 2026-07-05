import { useState } from "react";
import type { AnalysisResult, AnalysisTab } from "../types";

const DISMISS_KEY = "shiftworkshr:startHereDismissed";

type ResultsStartHereBannerProps = {
  result: AnalysisResult;
  activeTab: AnalysisTab;
  onOpenReviewQueue: () => void;
};

export function ResultsStartHereBanner({
  result,
  activeTab,
  onOpenReviewQueue,
}: ResultsStartHereBannerProps) {
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === "1");
  const queue = result.review_queue;
  const total = queue?.total_items ?? result.summary.review_queue_items ?? 0;

  if (dismissed || total === 0) {
    return null;
  }

  const onReviewQueue = activeTab === "review_queue";
  const critical = queue?.critical_count ?? 0;
  const headline =
    critical > 0
      ? `Start here: ${total} items need review (${critical} critical) before merit sign-off`
      : `Start here: ${total} items in your review queue — work through these before leadership review`;

  return (
    <div className="start-here-banner panel" role="status">
      <div className="start-here-banner__copy">
        <strong>{headline}</strong>
        <p>
          The review queue prioritizes range, compression, and merit issues in one list. Export a
          PDF summary when you&apos;re ready for HRBP or leadership.
        </p>
      </div>
      <div className="start-here-banner__actions">
        {!onReviewQueue ? (
          <button className="button button-primary button-small" type="button" onClick={onOpenReviewQueue}>
            Open review queue
          </button>
        ) : null}
        <button
          className="button button-secondary button-small"
          type="button"
          onClick={() => {
            localStorage.setItem(DISMISS_KEY, "1");
            setDismissed(true);
          }}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
