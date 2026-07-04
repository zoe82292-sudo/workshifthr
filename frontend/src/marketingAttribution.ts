const STORAGE_KEY = "shiftworkshr_attribution_v1";

export type MarketingAttribution = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
};

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content"] as const;

function readStoredAttribution(): MarketingAttribution {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as MarketingAttribution;
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function writeStoredAttribution(attribution: MarketingAttribution) {
  const hasValue = UTM_KEYS.some((key) => Boolean(attribution[key]));
  if (!hasValue) {
    sessionStorage.removeItem(STORAGE_KEY);
    return;
  }
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(attribution));
}

export function captureAttributionFromUrl(search = window.location.search) {
  const params = new URLSearchParams(search);
  const incoming: MarketingAttribution = {};
  let found = false;

  for (const key of UTM_KEYS) {
    const value = params.get(key)?.trim();
    if (value) {
      incoming[key] = value.slice(0, 120);
      found = true;
    }
  }

  if (!found) {
    return readStoredAttribution();
  }

  writeStoredAttribution(incoming);
  return incoming;
}

export function getStoredAttribution(): MarketingAttribution {
  return readStoredAttribution();
}

export function buildMarketingUrl(
  path = "/",
  attribution: MarketingAttribution,
  baseUrl = "https://shiftworkshr.com",
): string {
  const url = new URL(path, baseUrl);
  for (const key of UTM_KEYS) {
    const value = attribution[key];
    if (value) {
      url.searchParams.set(key, value);
    }
  }
  return url.toString();
}

/** Copy-paste links for common channels (year-neutral campaign names). */
export const SHARE_LINKS = {
  linkedinPost: buildMarketingUrl("/", {
    utm_source: "linkedin",
    utm_medium: "post",
    utm_campaign: "comp-review",
  }),
  linkedinComment: buildMarketingUrl("/sample-preview", {
    utm_source: "linkedin",
    utm_medium: "comment",
    utm_campaign: "comp-review",
    utm_content: "sample-preview",
  }),
  emailSignature: buildMarketingUrl("/", {
    utm_source: "email",
    utm_medium: "signature",
    utm_campaign: "comp-review",
  }),
  coldOutreach: buildMarketingUrl("/", {
    utm_source: "email",
    utm_medium: "outreach",
    utm_campaign: "comp-review",
  }),
  reddit: buildMarketingUrl("/sample-preview", {
    utm_source: "reddit",
    utm_medium: "comment",
    utm_campaign: "comp-review",
  }),
} as const;
