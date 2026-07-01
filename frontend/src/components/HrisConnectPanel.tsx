import { useEffect, useState } from "react";
import { checkHrisStatus, startHrisConnect, HRIS_PROVIDER_STORAGE_KEY } from "../api";

type HrisConnectPanelProps = {
  uploadAuthorized: boolean;
  loading: boolean;
  onConnectStart: () => void;
  onError: (message: string) => void;
};

export function HrisConnectPanel({
  uploadAuthorized,
  loading,
  onConnectStart,
  onError,
}: HrisConnectPanelProps) {
  const [providers, setProviders] = useState<
    Array<{ id: string; name: string; description: string }>
  >([]);
  const [enabled, setEnabled] = useState(false);
  const [connectingId, setConnectingId] = useState<string | null>(null);

  useEffect(() => {
    void checkHrisStatus().then(({ enabled: hrisReady, providers: listed }) => {
      setEnabled(hrisReady);
      setProviders(listed);
    });
  }, []);

  async function handleConnect(providerId: string) {
    if (!uploadAuthorized) {
      onError("Please confirm you are authorized to upload this compensation data before continuing.");
      return;
    }

    setConnectingId(providerId);
    onConnectStart();

    try {
      sessionStorage.setItem(HRIS_PROVIDER_STORAGE_KEY, providerId);
      const { connect_url: connectUrl } = await startHrisConnect(providerId);
      window.location.assign(connectUrl);
    } catch (caught) {
      setConnectingId(null);
      onError(caught instanceof Error ? caught.message : "Unable to connect to HRIS.");
    }
  }

  if (providers.length === 0) {
    return null;
  }

  return (
    <section className="panel hris-panel">
      <div className="panel-header">
        <h2>Connect your HRIS</h2>
        <span className="hero-badge">One-click import</span>
      </div>
      <p className="hris-panel-copy">
        Pull employee and compensation data directly from your HR system — no spreadsheet
        export needed. Supported systems:
      </p>
      <div className="hris-provider-grid">
        {providers.map((provider) => (
          <button
            key={provider.id}
            type="button"
            className="hris-provider-card"
            disabled={loading || connectingId !== null || !enabled}
            onClick={() => void handleConnect(provider.id)}
          >
            <span className="hris-provider-name">{provider.name}</span>
            <span className="hris-provider-description">{provider.description}</span>
            <span className="hris-provider-action">
              {connectingId === provider.id ? "Redirecting..." : "Connect"}
            </span>
          </button>
        ))}
      </div>
      {enabled ? (
        <p className="file-meta">
          You&apos;ll sign in to your HRIS provider securely, then ShiftWorksHR imports employee
          and salary data automatically. Pay grade ranges may still need a comp export if your
          HRIS does not expose them.
        </p>
      ) : (
        <p className="file-meta">
          HRIS connect is being enabled on this server. You can still upload a spreadsheet below.
        </p>
      )}
    </section>
  );
}
