// Native Fetch avoids remote SDK imports during payment function cold starts.
// Every upstream request has a deadline and no automatic retries.
import { corsHeaders } from './cors.ts';

export class PaymentRequestError extends Error {
  constructor(message: string, public code: string, public status: number) {
    super(message);
    this.name = 'PaymentRequestError';
  }
}

export function paymentResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

export async function requestPaymentJson<T>(
  url: string,
  init: RequestInit,
  source: string,
  parentSignal: AbortSignal,
  timeoutMs = 12000,
): Promise<T> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  parentSignal.addEventListener('abort', abort, { once: true });
  if (parentSignal.aborted) controller.abort();
  const timer = setTimeout(abort, timeoutMs);
  const started = Date.now();
  try {
    console.log('[PAYMENT-HTTP] start', { source });
    const response = await fetch(url, { ...init, signal: controller.signal });
    const text = await response.text();
    console.log('[PAYMENT-HTTP] response', {
      source, status: response.status, elapsed_ms: Date.now() - started,
      stripe_request_id: response.headers.get('request-id'),
    });
    let data: unknown = null;
    let parsedJson = false;
    try {
      if (text) { data = JSON.parse(text); parsedJson = true; }
    } catch { /* Never return proxy HTML. */ }
    if (!response.ok) {
      const obj = data && typeof data === 'object' ? data as Record<string, unknown> : {};
      const nested = obj.error && typeof obj.error === 'object'
        ? obj.error as Record<string, unknown> : {};
      const detail = typeof nested.message === 'string' ? nested.message
        : typeof obj.msg === 'string' ? obj.msg
        : typeof obj.message === 'string' ? obj.message : 'Upstream request failed';
      if (response.status === 408 || response.status === 504) {
        throw new PaymentRequestError(`${source}: request timed out`, 'upstream_timeout', 504);
      }
      const authFailure = source === 'Authentication' && (response.status === 401 || response.status === 403);
      throw new PaymentRequestError(
        `${source}: ${detail.slice(0, 400)}`,
        authFailure ? 'authentication_required' : source === 'Stripe' ? 'stripe_error' : 'upstream_error',
        authFailure ? 401 : 502,
      );
    }
    // A read-only SQL RPC returns valid JSON null when no row exists. Distinguish
    // it from an unparseable response so a new attempt can be frozen safely.
    if (text && !parsedJson) {
      throw new PaymentRequestError(`${source}: invalid response`, 'invalid_response', 502);
    }
    return data as T;
  } catch (error) {
    if (error instanceof PaymentRequestError) throw error;
    if (controller.signal.aborted) {
      throw new PaymentRequestError(`${source}: request timed out`, 'upstream_timeout', 504);
    }
    throw new PaymentRequestError(`${source}: unable to connect`, 'upstream_unavailable', 502);
  } finally {
    clearTimeout(timer);
    parentSignal.removeEventListener('abort', abort);
  }
}

export interface PaymentUser { id: string; email: string }

export async function getPaymentUser(req: Request, signal: AbortSignal): Promise<PaymentUser> {
  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) {
    throw new PaymentRequestError('Please sign in again', 'authentication_required', 401);
  }
  const baseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!baseUrl || !anonKey) {
    throw new PaymentRequestError('Authentication configuration is missing', 'configuration_error', 500);
  }
  const user = await requestPaymentJson<Partial<PaymentUser>>(
    `${baseUrl.replace(/\/$/, '')}/auth/v1/user`,
    { headers: { Authorization: auth, apikey: anonKey } },
    'Authentication', signal, 8000,
  );
  if (!user?.id || !user.email) {
    throw new PaymentRequestError('Please sign in again', 'authentication_required', 401);
  }
  return { id: user.id, email: user.email };
}

export function getStripeKey(): string {
  const key = Deno.env.get('STRIPE_SECRET_KEY');
  if (!key) throw new PaymentRequestError('Stripe configuration is missing', 'configuration_error', 500);
  return key;
}

export async function stripeRequest<T>(
  path: string, key: string, signal: AbortSignal,
  parameters?: Record<string, string>, idempotencyKey?: string,
): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${key}`,
    'Stripe-Version': '2025-08-27.basil',
  };
  if (parameters) headers['Content-Type'] = 'application/x-www-form-urlencoded';
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
  const body = parameters ? Object.entries(parameters)
    .map(([name, value]) => `${encodeURIComponent(name)}=${encodeURIComponent(value)}`).join('&') : undefined;
  return requestPaymentJson<T>(`https://api.stripe.com/v1/${path}`, {
    method: parameters ? 'POST' : 'GET', headers, body,
  }, 'Stripe', signal);
}
