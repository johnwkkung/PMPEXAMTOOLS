import { corsHeaders } from './cors.ts';
import { getPaymentUser, getStripeKey, PaymentRequestError, paymentResponse, requestPaymentJson, stripeRequest } from './paymentHttp.ts';
import { resolveStoredCheckoutAttempt } from './checkoutAttemptStorage.ts';

// This is a server-only compatibility fix: installed .2 clients must remain
// able to accept the response without an unnecessary APK/IPA rebuild.
export const vipPaymentRevision = 'vip-payment-2026-11-01.2';
const vipPaymentBackendFix = 'attempt-rpc-2026-11-01.2';
const vipPriceId = 'price_1U9LZj4u91n6WAru9LvHLbZ5';
interface CheckoutSession {
  id: string;
  url: string | null;
  status: string;
  payment_status: string;
  payment_intent: string | { id: string } | null;
  metadata?: { user_id?: string };
}

function storageRequest<T>(resource: string, signal: AbortSignal, method = 'GET', body?: unknown, prefer?: string): Promise<T> {
  const baseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!baseUrl || !serviceKey) throw new PaymentRequestError('Payment storage configuration is missing', 'configuration_error', 500);
  const headers: Record<string, string> = {
    apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json',
    Accept: 'application/json', 'Cache-Control': 'no-store', Pragma: 'no-cache',
  };
  if (prefer) headers.Prefer = prefer;
  return requestPaymentJson<T>(`${baseUrl.replace(/\/$/, '')}/rest/v1/${resource}`, {
    method, headers, body: body === undefined ? undefined : JSON.stringify(body),
  }, resource.startsWith('rpc/') ? 'Checkout attempt RPC' : 'Checkout attempt storage', signal, 5000);
}

function attemptRequest<T>(query: string, signal: AbortSignal, method = 'GET', body?: unknown, prefer?: string): Promise<T> {
  return storageRequest<T>(`vip_checkout_attempts${query}`, signal, method, body, prefer);
}

function attemptRpc(name: 'read_vip_checkout_attempt' | 'freeze_vip_checkout_attempt',
  userId: string, attemptId: string, signal: AbortSignal, parameters?: Record<string, string>): Promise<unknown> {
  return storageRequest<unknown>(`rpc/${name}`, signal, 'POST', {
    p_user_id: userId, p_attempt_id: attemptId,
    ...(parameters ? { p_request_params: parameters } : {}),
  });
}

function sessionSummary(session: CheckoutSession) {
  return {
    session_id: session.id,
    payment_intent_id: typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id ?? null,
    status: session.status, payment_status: session.payment_status,
    paid: session.payment_status === 'paid',
  };
}

// Used by both routes; never import a second function entry point or start a second Deno server.
export async function handleVipCheckout(req: Request, suppliedInput?: Record<string, unknown> | null): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return paymentResponse({ error: 'Method not allowed', code: 'method_not_allowed', revision: vipPaymentRevision }, 405);

  const traceId = crypto.randomUUID();
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);
  let stage = 'authentication';
  let attemptId: string | null = null;
  const respond = (body: Record<string, unknown>, status = 200) => paymentResponse({
    ...body, revision: vipPaymentRevision, backend_fix: vipPaymentBackendFix, request_id: traceId, attempt_id: attemptId,
  }, status);
  try {
    console.log(`[VIP-PAYMENT] start request=${traceId} fix=${vipPaymentBackendFix}`);
    const user = await getPaymentUser(req, controller.signal);
    const stripeKey = getStripeKey();
    const input = suppliedInput === undefined ? await req.json().catch(() => ({})) as Record<string, unknown> | null : suppliedInput;

    // Payment diagnostics have been retired. Never let an old diagnostic or
    // unknown action fall through to legacy checkout creation.
    if (input?.action !== undefined && input.action !== 'create_checkout' && input.action !== 'verify_checkout') {
      throw new PaymentRequestError('Unsupported payment action', 'unsupported_action', 400);
    }

    if (input?.action === 'verify_checkout') {
      stage = 'checkout_verification';
      const sessionId = typeof input.sessionId === 'string' ? input.sessionId : '';
      if (!/^cs_[a-zA-Z0-9_]{8,200}$/.test(sessionId)) throw new PaymentRequestError('Invalid checkout reference', 'invalid_session_id', 400);
      // Stripe metadata is the ownership authority, even if recording the session
      // reference failed after Stripe successfully created it.
      const session = await stripeRequest<CheckoutSession>(`checkout/sessions/${encodeURIComponent(sessionId)}`, stripeKey, controller.signal);
      if (session.metadata?.user_id !== user.id) throw new PaymentRequestError('Checkout reference does not match this account', 'session_not_found', 404);
      return respond(sessionSummary(session));
    }

    attemptId = typeof input?.requestId === 'string' && /^[a-zA-Z0-9_-]{8,80}$/.test(input.requestId)
      ? input.requestId : `legacy_${Math.floor(Date.now() / (30 * 60 * 1000))}`;
    const rowQuery = `?user_id=eq.${encodeURIComponent(user.id)}&attempt_id=eq.${encodeURIComponent(attemptId)}`;
    // Use POST RPC with SQL equality instead of the REST GET path that returned
    // an empty result even though the inserted attempt was present in the table.
    const retainedAttemptId = attemptId;
    const attempt = await resolveStoredCheckoutAttempt({
      userId: user.id, attemptId: retainedAttemptId,
      read: async () => {
        stage = 'attempt_lookup_rpc';
        return attemptRpc('read_vip_checkout_attempt', user.id, retainedAttemptId, controller.signal);
      },
      createParameters: async () => {
        stage = 'customer_lookup';
        const customers = await stripeRequest<{ data: { id: string }[] }>(
          `customers?email=${encodeURIComponent(user.email)}&limit=1`, stripeKey, controller.signal,
        );
        const customerId = customers.data?.[0]?.id;
        // Proposed parameters are used only if no frozen attempt already exists.
        const parameters: Record<string, string> = {
          'line_items[0][price]': vipPriceId, 'line_items[0][quantity]': '1', mode: 'payment',
          'automatic_tax[enabled]': 'false', 'managed_payments[enabled]': 'false',
          success_url: 'onspaceapp://subscription/success', cancel_url: 'onspaceapp://subscription/cancel',
          'metadata[user_id]': user.id,
        };
        if (customerId) parameters.customer = customerId;
        else parameters.customer_email = user.email;
        return parameters;
      },
      freeze: async (parameters) => {
        stage = 'freeze_parameters_rpc';
        // Insert-if-missing and return the original row in one server operation.
        return attemptRpc('freeze_vip_checkout_attempt', user.id, retainedAttemptId, controller.signal, parameters);
      },
    });
    console.log(`[VIP-PAYMENT] frozen_attempt request=${traceId} attempt=${retainedAttemptId} found=true`);
    const attemptTooOld = Date.now() - new Date(attempt.created_at).getTime() > 23 * 60 * 60 * 1000;
    // An idempotent POST replays the original response, not necessarily the
    // session's current payment status. Read a recorded session before any POST.
    if (attempt.checkout_session_id) {
      stage = 'recorded_session_verification';
      const existing = await stripeRequest<CheckoutSession>(
        `checkout/sessions/${encodeURIComponent(attempt.checkout_session_id)}`, stripeKey, controller.signal,
      );
      if (existing.metadata?.user_id !== user.id) throw new PaymentRequestError('Checkout reference does not match this account', 'session_not_found', 404);
      const existingSummary = sessionSummary(existing);
      if (existingSummary.paid) return respond({ ...existingSummary, url: null });
      if (existing.status === 'expired' && existing.payment_status === 'unpaid') {
        throw new PaymentRequestError('Stripe confirmed that this unpaid checkout has expired', 'checkout_expired', 409);
      }
      if (!attemptTooOld) {
        if (!existing.url?.startsWith('https://checkout.stripe.com/')) {
          throw new PaymentRequestError('Stripe: checkout URL is unavailable; payment status requires confirmation', 'invalid_checkout_url', 502);
        }
        return respond({ ...existingSummary, url: existing.url });
      }
    }
    if (attemptTooOld) {
      // Never automatically rotate an unresolved request after Stripe's retention window.
      throw new PaymentRequestError('This checkout attempt is too old to retry safely; contact support to confirm its payment status', 'attempt_expired', 409);
    }
    stage = 'checkout_creation';
    const idempotencyKey = `vip-checkout:${user.id}:${attemptId}`;
    console.log('[VIP-PAYMENT] creating/reusing session', { trace_id: traceId, attempt_id: attemptId, stage });
    const session = await stripeRequest<CheckoutSession>('checkout/sessions', stripeKey, controller.signal, attempt.request_params, idempotencyKey);
    stage = 'save_session_reference';
    // Failure to record a reference must not discard a successful Stripe response.
    try {
      await attemptRequest<unknown>(rowQuery, controller.signal, 'PATCH', { checkout_session_id: session.id }, 'return=minimal');
    } catch (error) {
      console.warn('[VIP-PAYMENT] session reference write failed', { trace_id: traceId, session_id: session.id,
        code: error instanceof PaymentRequestError ? error.code : 'reference_write_failed' });
    }
    const summary = sessionSummary(session);
    if (!summary.paid && (!session.url || !session.url.startsWith('https://checkout.stripe.com/'))) {
      throw new PaymentRequestError('Stripe: checkout URL is unavailable', 'invalid_checkout_url', 502);
    }
    console.log('[VIP-PAYMENT] completed', { trace_id: traceId, attempt_id: attemptId, session_id: session.id,
      payment_intent_id: summary.payment_intent_id, elapsed_ms: Date.now() - started });
    return respond({ ...summary, url: session.url });
  } catch (error) {
    const failure = error instanceof PaymentRequestError ? error : new PaymentRequestError('Payment service unavailable', 'checkout_failed', 500);
    // Keep the critical stage and code inside the log viewer's 200-character limit.
    console.error(`[VIP-PAYMENT] failed request=${traceId} stage=${stage} code=${failure.code} elapsed_ms=${Date.now() - started}`);
    return respond({ error: failure.message, code: failure.code, stage }, failure.status);
  } finally {
    clearTimeout(timer);
  }
}
