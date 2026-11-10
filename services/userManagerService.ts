// UserManager API service
// Calls the external user management endpoint on registration/login events

import { logApiCall } from '@/services/logService';

import { domainApiConfig } from '@/constants/domainApi';

const USER_MANAGER_URI = `${domainApiConfig.baseUrl}/userManager`;
const API_USER_ID = domainApiConfig.userId;
const API_PASSWORD = domainApiConfig.password;

export interface UserManagerPayload {
  mode: string;
  username?: string;
  useremail: string;
  password: string;
}

export interface ForgotPasswordResult {
  success: boolean;
  message?: string;
}

export interface UserDetails {
  username: string;
  userEmail: string;
  userLevel: string;
  isVip: boolean;
  registerDate: string | null;
  expiryDate: string | null;
}

export interface GetUserResult {
  success: boolean;
  details: UserDetails | null;
  message?: string;
}

function getResponseField(record: Record<string, unknown>, name: string): unknown {
  const key = Object.keys(record).find((candidate) => candidate.toUpperCase() === name);
  return key === undefined ? undefined : record[key];
}

/** Accept a direct record, a data wrapper, or a wrapped array of user records. */
function findUserRecord(value: unknown, email: string, depth = 0): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || depth > 4) return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const record = findUserRecord(item, email, depth + 1);
      if (record) return record;
    }
    return null;
  }
  const record = value as Record<string, unknown>;
  const returnedEmail = getResponseField(record, 'USEREMAIL');
  if (typeof returnedEmail === 'string' && returnedEmail.trim().toLowerCase() === email.toLowerCase()) {
    return record;
  }
  for (const child of Object.values(record)) {
    if (child !== null && typeof child === 'object') {
      const match = findUserRecord(child, email, depth + 1);
      if (match) return match;
    }
  }
  return null;
}

/** Read-only GETUSER lookup using the existing domain credentials, not the user password. */
export async function callGetUser(userEmail: string, signal?: AbortSignal): Promise<GetUserResult> {
  const email = userEmail.trim();
  if (!email) return { success: false, details: null, message: '未能取得登入電郵，請重新登入。' };
  const requestBody = {
    mode: 'GETUSER', value: email, user_id: API_USER_ID, password: API_PASSWORD,
  };
  const controller = new AbortController();
  const cancel = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener('abort', cancel);
  const timer = setTimeout(cancel, 20000);
  try {
    logApiCall({ apiUrl: USER_MANAGER_URI, apiMode: 'GETUSER', userEmail: email, body: requestBody });
    const response = await fetch(USER_MANAGER_URI, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody), signal: controller.signal,
    });
    const text = await response.text();
    let data: unknown = null;
    try { data = JSON.parse(text); } catch { /* Reject non-JSON success responses below. */ }
    const envelope = data !== null && typeof data === 'object' && !Array.isArray(data)
      ? data as Record<string, unknown> : {};
    const apiError = getResponseField(envelope, 'ERROR');
    const apiMessage = getResponseField(envelope, 'MESSAGE');
    if (!response.ok || getResponseField(envelope, 'SUCCESS') === false || (typeof apiError === 'string' && apiError.trim())) {
      const message = typeof apiError === 'string' && apiError.trim() ? apiError
        : typeof apiMessage === 'string' && apiMessage.trim() ? apiMessage
        : `未能取得會員資料（HTTP ${response.status}），請稍後再試。`;
      return { success: false, details: null, message };
    }
    const record = findUserRecord(data, email);
    const username = record ? getResponseField(record, 'USERNAME') : undefined;
    const returnedEmail = record ? getResponseField(record, 'USEREMAIL') : undefined;
    const level = record ? getResponseField(record, 'USERLEVEL') : undefined;
    if (typeof username !== 'string' || typeof returnedEmail !== 'string' || typeof level !== 'string' || !level.trim()) {
      return { success: false, details: null, message: '伺服器回應缺少會員資料，請稍後再試。' };
    }
    const readDate = (name: string): string | null => {
      const value = record ? getResponseField(record, name) : null;
      return typeof value === 'string' && value.trim() ? value.trim() : null;
    };
    const isVip = level.trim().toUpperCase() === 'VIP';
    return {
      success: true,
      details: {
        username: username.trim(), userEmail: returnedEmail.trim(), userLevel: level.trim(), isVip,
        registerDate: isVip ? readDate('REGISTERDATE') : null,
        expiryDate: isVip ? readDate('EXPIRYDATE') : null,
      },
    };
  } catch (error: unknown) {
    return {
      success: false, details: null,
      message: controller.signal.aborted ? '讀取會員資料逾時，請重試。'
        : error instanceof Error ? error.message : '網絡連接失敗，請稍後再試。',
    };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', cancel);
  }
}

export interface UserManagerResult {
  success: boolean;
  message?: string;
  userlevel?: string;   // 'VIP' | 'NONVIP' (or other values from API)
  expired?: number;     // 0 = active, 1 = expired
  username?: string;    // Display name from API response
  data?: unknown;
}

/**
 * Calls the FORGET mode API after user resets password.
 * Returns success on HTTP 200, specific error messages on 403/404.
 */
export interface UpgradeResult {
  success: boolean;
  message?: string;
}

/**
 * Calls the UPGRADE mode API after a successful Stripe payment.
 * Notifies the UserManager to set the user's account level to VIP.
 */
export async function callUpgrade(params: {
  useremail: string;
}): Promise<UpgradeResult> {
  try {
    const requestBody = {
      mode: 'UPGRADE',
      useremail: params.useremail,
      user_id: API_USER_ID,
      password: API_PASSWORD,
    };
    logApiCall({ apiUrl: USER_MANAGER_URI, apiMode: 'UPGRADE', userEmail: params.useremail, body: requestBody });
    const response = await fetch(USER_MANAGER_URI, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });
    if (response.status === 200) {
      return { success: true };
    }
    const text = await response.text();
    return { success: false, message: text || `伺服器錯誤 (${response.status})` };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '網絡連接失敗，請稍後再試。';
    return { success: false, message };
  }
}

export async function callForgotPassword(params: {
  useremail: string;
  newpassword: string;
}): Promise<ForgotPasswordResult> {
  try {
    const requestBody = {
      mode: 'FORGET',
      useremail: params.useremail,
      newpassword: params.newpassword,
      user_id: API_USER_ID,
      password: API_PASSWORD,
    };
    logApiCall({ apiUrl: USER_MANAGER_URI, apiMode: 'FORGET', userEmail: params.useremail, body: requestBody });
    const response = await fetch(USER_MANAGER_URI, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (response.status === 200) {
      return { success: true };
    }
    if (response.status === 404) {
      return { success: false, message: '找不到此電郵地址的用戶帳戶，請確認電郵地址是否正確。' };
    }
    if (response.status === 403) {
      return { success: false, message: '您的帳戶使用期限已屆滿，請聯絡管理員續期。' };
    }
    return { success: false, message: `伺服器錯誤 (${response.status})，請稍後再試。` };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '網絡連接失敗，請稍後再試。';
    return { success: false, message };
  }
}

export async function callUserManager(
  payload: UserManagerPayload
): Promise<UserManagerResult> {
  const requestBody: Record<string, unknown> = {
    mode: payload.mode,
    useremail: payload.useremail,
    password: payload.password,
    user_id: API_USER_ID,
    api_password: API_PASSWORD,
  };
  if (payload.username) requestBody['username'] = payload.username;

  try {
    logApiCall({ apiUrl: USER_MANAGER_URI, apiMode: payload.mode, userEmail: payload.useremail, body: requestBody });
    const response = await fetch(USER_MANAGER_URI, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    const text = await response.text();
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    if (response.status !== 200) {
      let errorMessage = `伺服器錯誤 (${response.status})`;
      if (typeof data === 'string' && data.trim()) {
        errorMessage = data.trim();
      } else if (typeof data === 'object' && data !== null) {
        const d = data as Record<string, unknown>;
        errorMessage =
          (typeof d['error'] === 'string' ? d['error'] : null) ??
          (typeof d['message'] === 'string' ? d['message'] : null) ??
          errorMessage;
      }
      return { success: false, message: errorMessage, data };
    }

    // Parse userlevel and expired from response body
    const responseBody = typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : {};
    const userlevel = typeof responseBody['userlevel'] === 'string' ? responseBody['userlevel'] : undefined;
    const expired = typeof responseBody['expired'] === 'number'
      ? responseBody['expired']
      : responseBody['expired'] === 1 || responseBody['expired'] === '1' ? 1 : 0;
    const username = typeof responseBody['username'] === 'string' ? responseBody['username'] : undefined;

    return { success: true, userlevel, expired, username, data };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '網絡連接失敗，請稍後再試。';
    return { success: false, message };
  }
}
