import { MARKETING_DEMO_DATA } from "../data/marketingDemoData";
import { MarketingPreview } from "./MarketingPreview";

export function MarketingPreviewPage() {
  return (
    <div className="marketing-preview-shell">
      <MarketingPreview data={MARKETING_DEMO_DATA} />
    </div>
  );
}
