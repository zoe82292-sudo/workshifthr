const ENDPOINT = "/api/analytics/event";

export function trackEvent(name: string, properties: Record<string, string | number | boolean> = {}) {
  try {
    void fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, properties }),
      keepalive: true,
    });
  } catch {
    // Analytics should never block product flows.
  }
}
