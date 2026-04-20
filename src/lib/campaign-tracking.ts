export type CampaignParams = {
  ref?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  fbclid?: string;
  gclid?: string;
  gbraid?: string;
  wbraid?: string;
};

const CAMPAIGN_KEYS: (keyof CampaignParams)[] = [
  "ref",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "fbclid",
  "gclid",
  "gbraid",
  "wbraid",
];

const KEY_LIMITS: Record<keyof CampaignParams, number> = {
  ref: 64,
  utm_source: 120,
  utm_medium: 120,
  utm_campaign: 160,
  utm_content: 160,
  utm_term: 120,
  fbclid: 200,
  gclid: 200,
  gbraid: 200,
  wbraid: 200,
};

function sanitizeCampaignValue(
  key: keyof CampaignParams,
  value: string | null | undefined
): string | undefined {
  if (typeof value !== "string") return undefined;
  const raw = value.trim();
  if (!raw) return undefined;
  let normalized = raw;
  try {
    normalized = decodeURIComponent(raw);
  } catch {
    normalized = raw;
  }
  normalized = normalized.trim();
  if (!normalized) return undefined;
  const limit = KEY_LIMITS[key];
  return normalized.slice(0, limit);
}

export function normalizeCampaignParams(
  input: Partial<Record<keyof CampaignParams, string | null | undefined>>
): CampaignParams {
  const output: CampaignParams = {};
  for (const key of CAMPAIGN_KEYS) {
    const value = sanitizeCampaignValue(key, input[key]);
    if (value) output[key] = value;
  }
  return output;
}

export function campaignParamsFromSearchParams(
  params: URLSearchParams
): CampaignParams {
  const raw: Partial<Record<keyof CampaignParams, string | null>> = {};
  for (const key of CAMPAIGN_KEYS) {
    raw[key] = params.get(key);
  }
  return normalizeCampaignParams(raw);
}

function storageKey(tenantSlug: string): string {
  const slug = String(tenantSlug || "").trim().toLowerCase() || "default";
  return `sp-campaign-first-touch:${slug}`;
}

function readStoredCampaign(tenantSlug: string): CampaignParams {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(storageKey(tenantSlug));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as CampaignParams;
    return normalizeCampaignParams(parsed || {});
  } catch {
    return {};
  }
}

function writeStoredCampaign(tenantSlug: string, payload: CampaignParams) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(tenantSlug), JSON.stringify(payload));
  } catch {
    // ignore localStorage errors
  }
}

export function captureFirstTouchCampaign(
  tenantSlug: string,
  incoming: CampaignParams
): CampaignParams {
  const normalizedIncoming = normalizeCampaignParams(incoming);
  const existing = readStoredCampaign(tenantSlug);
  const merged: CampaignParams = { ...existing };
  for (const key of CAMPAIGN_KEYS) {
    if (!merged[key] && normalizedIncoming[key]) {
      merged[key] = normalizedIncoming[key];
    }
  }
  writeStoredCampaign(tenantSlug, merged);
  return merged;
}

export function captureCampaignFromLocation(tenantSlug: string): CampaignParams {
  if (typeof window === "undefined") return {};
  const incoming = campaignParamsFromSearchParams(
    new URLSearchParams(window.location.search)
  );
  return captureFirstTouchCampaign(tenantSlug, incoming);
}

export function campaignParamsToQueryString(params: CampaignParams): string {
  const qp = new URLSearchParams();
  const normalized = normalizeCampaignParams(params);
  for (const key of CAMPAIGN_KEYS) {
    const value = normalized[key];
    if (value) qp.set(key, value);
  }
  return qp.toString();
}

export function appendCampaignParamsToUrl(
  rawUrl: string,
  params: CampaignParams
): string {
  const normalized = normalizeCampaignParams(params);
  if (!rawUrl) return rawUrl;
  try {
    const url = new URL(
      rawUrl,
      typeof window !== "undefined"
        ? window.location.origin
        : "https://landings.showtimeprop.com"
    );
    for (const key of CAMPAIGN_KEYS) {
      if (!url.searchParams.get(key) && normalized[key]) {
        url.searchParams.set(key, String(normalized[key]));
      }
    }
    if (/^https?:\/\//i.test(rawUrl)) return url.toString();
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return rawUrl;
  }
}

export function appendCampaignParamsToMessage(
  message: string,
  params: CampaignParams
): string {
  const normalized = normalizeCampaignParams(params);
  let output = String(message || "").trim();
  for (const key of CAMPAIGN_KEYS) {
    const value = normalized[key];
    if (!value) continue;
    const token = `${key}=`;
    if (output.includes(token)) continue;
    output = `${output}${output ? " " : ""}${key}=${value}`;
  }
  return output;
}

export function buildTrackedWhatsappUrl(
  rawWhatsappUrl: string,
  params: CampaignParams
): string {
  if (!rawWhatsappUrl) return rawWhatsappUrl;
  try {
    const url = new URL(rawWhatsappUrl);
    const plainText = url.searchParams.get("text") || "";
    const trackedText = appendCampaignParamsToMessage(plainText, params);
    url.searchParams.set("text", trackedText);
    return url.toString();
  } catch {
    return rawWhatsappUrl;
  }
}
