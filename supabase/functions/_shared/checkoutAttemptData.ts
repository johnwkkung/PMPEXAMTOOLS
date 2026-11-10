import { PaymentRequestError } from './paymentHttp.ts';

export interface CheckoutAttemptReference {
  attempt_id: string;
  created_at: string;
  checkout_session_id: string | null;
}

export interface StoredCheckoutAttempt extends CheckoutAttemptReference {
  user_id: string;
  request_params: Record<string, string>;
}

function invalidAttemptResponse(): never {
  throw new PaymentRequestError(
    'Checkout attempt storage returned an unexpected response; the original request has been retained',
    'attempt_response_invalid', 502,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

// Some REST gateways return a single object for a fully filtered primary-key
// lookup, while list queries return arrays. Never mistake an existing object
// for an empty list, and never turn malformed data into a new payment attempt.
export function normalizeCheckoutAttemptRows(response: unknown): Record<string, unknown>[] {
  let value = response;
  if (isRecord(value) && !('attempt_id' in value) && 'data' in value) value = value.data;
  if (value === null) return [];
  const rows = Array.isArray(value) ? value : isRecord(value) && 'attempt_id' in value ? [value] : invalidAttemptResponse();
  return rows.map((row) => {
    if (!isRecord(row) || typeof row.attempt_id !== 'string' || typeof row.created_at !== 'string'
      || !Number.isFinite(Date.parse(row.created_at))
      || (row.checkout_session_id !== null && typeof row.checkout_session_id !== 'string')) {
      return invalidAttemptResponse();
    }
    return row;
  });
}

export function readStoredCheckoutAttempt(
  response: unknown, userId: string, attemptId: string,
): StoredCheckoutAttempt | undefined {
  const rows = normalizeCheckoutAttemptRows(response);
  if (rows.length === 0) return undefined;
  if (rows.length !== 1) return invalidAttemptResponse();
  const row = rows[0];
  if (row.user_id !== userId || row.attempt_id !== attemptId || !isRecord(row.request_params)
    || Object.keys(row.request_params).length === 0
    || Object.values(row.request_params).some((value) => typeof value !== 'string')) {
    return invalidAttemptResponse();
  }
  // Return the persisted strings unchanged: retries must use exactly the same
  // Stripe parameters, even if defaults or customer details changed later.
  return {
    user_id: userId, attempt_id: attemptId, created_at: row.created_at as string,
    checkout_session_id: row.checkout_session_id as string | null,
    request_params: row.request_params as Record<string, string>,
  };
}

export function readCheckoutAttemptReferences(response: unknown): CheckoutAttemptReference[] {
  return normalizeCheckoutAttemptRows(response).map((row) => ({
    attempt_id: row.attempt_id as string, created_at: row.created_at as string,
    checkout_session_id: row.checkout_session_id as string | null,
  }));
}
