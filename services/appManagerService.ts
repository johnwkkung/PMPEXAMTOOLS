import { domainApiConfig } from '@/constants/domainApi';
import { logApiCall } from '@/services/logService';

const appManagerUrl = `${domainApiConfig.baseUrl}/appManager`;
const requestTimeoutMs = 20000;

export interface LatestAppVersionResult {
  success: boolean;
  version: string | null;
  error: string | null;
}

function getField(record: Record<string, unknown>, name: string): unknown {
  const key = Object.keys(record).find((candidate) => candidate.toUpperCase() === name);
  return key === undefined ? undefined : record[key];
}

function isFailure(record: Record<string, unknown>): boolean {
  const success = getField(record, 'SUCCESS');
  const error = getField(record, 'ERROR');
  return success === false || success === 0 || success === 'false'
    || (typeof error === 'string' ? Boolean(error.trim()) : Boolean(error));
}

/** Accept VERSION directly, in a data wrapper, or in an array of records. */
export function parseLatestAppVersion(value: unknown, depth = 0): string | null {
  if (!value || typeof value !== 'object' || depth > 5) return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const version = parseLatestAppVersion(item, depth + 1);
      if (version !== null) return version;
    }
    return null;
  }

  const record = value as Record<string, unknown>;
  if (isFailure(record)) return null;
  const field = getField(record, 'VERSION');
  const version = typeof field === 'string' ? field.trim()
    : typeof field === 'number' && Number.isFinite(field) ? String(field) : '';
  if (version && version.length <= 64 && !/[\r\n\t]/.test(version)) return version;

  for (const child of Object.values(record)) {
    if (child !== null && typeof child === 'object') {
      const nestedVersion = parseLatestAppVersion(child, depth + 1);
      if (nestedVersion !== null) return nestedVersion;
    }
  }
  return null;
}

export interface AppInformation {
  appId: string | null;
  appName: string | null;
  version: string;
  price: unknown;
  discount: unknown;
  promo: string | null;
}

export interface AppInformationResult {
  success: boolean;
  information: AppInformation | null;
  error: string | null;
}

function fieldText(value: unknown): string | null {
  const text = typeof value === 'string' ? value.trim()
    : typeof value === 'number' && Number.isFinite(value) ? String(value) : '';
  return text || null;
}

/** Keep pricing and metadata from the same GETVER record, including wrapped replies. */
export function parseAppInformation(value: unknown, depth = 0): AppInformation | null {
  if (!value || typeof value !== 'object' || depth > 5) return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const information = parseAppInformation(item, depth + 1);
      if (information !== null) return information;
    }
    return null;
  }
  const record = value as Record<string, unknown>;
  if (isFailure(record)) return null;
  const version = fieldText(getField(record, 'VERSION'));
  const price = getField(record, 'PRICE');
  if (version && version.length <= 64 && !/[\r\n\t]/.test(version) && price !== undefined) {
    return {
      appId: fieldText(getField(record, 'APPID')),
      appName: fieldText(getField(record, 'APPNAME')),
      version,
      price,
      discount: getField(record, 'DISCOUNT') ?? null,
      promo: fieldText(getField(record, 'PROMO')),
    };
  }
  for (const child of Object.values(record)) {
    if (child !== null && typeof child === 'object') {
      const information = parseAppInformation(child, depth + 1);
      if (information !== null) return information;
    }
  }
  return null;
}

async function fetchGetVersionData(signal?: AbortSignal): Promise<{ data: unknown; error: string | null }> {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  signal?.addEventListener('abort', cancel);
  if (signal?.aborted) controller.abort();
  const timer = setTimeout(cancel, requestTimeoutMs);

  const requestBody = {
    mode: 'GETVER',
    value: 'TXRHEXAMTOOLS',
    user_id: domainApiConfig.userId,
    password: domainApiConfig.password,
  };

  try {
    if (controller.signal.aborted) {
      return { data: null, error: 'Version check cancelled.' };
    }
    // Existing logging removes password fields before recording the request.
    logApiCall({ apiUrl: appManagerUrl, apiMode: 'GETVER', body: requestBody });
    const response = await fetch(appManagerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });
    if (!response.ok) {
      return { data: null, error: `Version check failed (HTTP ${response.status}).` };
    }
    const data: unknown = await response.json();
    return { data, error: null };
  } catch {
    // Do not expose a raw server response or domain credentials in error logs.
    return {
      data: null,
      error: controller.signal.aborted ? 'Version check cancelled or timed out.' : 'Version check unavailable.',
    };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', cancel);
  }
}

/** Read-only lookup; never changes the installed version or account access. */
export async function fetchLatestAppVersion(signal?: AbortSignal): Promise<LatestAppVersionResult> {
  const result = await fetchGetVersionData(signal);
  if (result.error) return { success: false, version: null, error: result.error };
  const version = parseLatestAppVersion(result.data);
  return version === null
    ? { success: false, version: null, error: 'The response does not contain a valid VERSION.' }
    : { success: true, version, error: null };
}

/** A fresh GETVER request for every Upgrade VIP action; no cached price fallback. */
export async function fetchAppInformation(signal?: AbortSignal): Promise<AppInformationResult> {
  const result = await fetchGetVersionData(signal);
  if (result.error) {
    return { success: false, information: null, error: '無法取得最新付款資料，請檢查網絡連線後重試。' };
  }
  const information = parseAppInformation(result.data);
  return information === null
    ? { success: false, information: null, error: '伺服器未回覆有效的 VERSION 及 PRICE，請重試。' }
    : { success: true, information, error: null };
}
