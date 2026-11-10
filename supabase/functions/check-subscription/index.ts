import { corsHeaders } from '../_shared/cors.ts';
import { handleVipCheckout } from '../_shared/vipCheckout.ts';
import { getPaymentUser, getStripeKey, PaymentRequestError, paymentResponse, requestPaymentJson, stripeRequest } from '../_shared/paymentHttp.ts';

const vipProductId = 'prod_V6LnORQfiQGzc7';
interface StripeSubscription {
  id: string;
  current_period_end?: number;
  items: { data: { current_period_end?: number; price: { product: string | { id: string } } }[] };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return paymentResponse({ error: 'Method not allowed', code: 'method_not_allowed' }, 405);

  // Preserve authenticated legacy checkout/verification for older installed
  // apps. The new manual-payment popup does not invoke any of these actions.
  const input = await req.json().catch(() => ({})) as Record<string, unknown> | null;
  if (input?.action === 'create_checkout' || input?.action === 'verify_checkout') {
    return handleVipCheckout(req, input);
  }
  if (input?.action !== undefined) {
    return paymentResponse({ error: 'Unsupported payment action', code: 'unsupported_action' }, 400);
  }
  // No-action requests preserve the existing subscription-check API.

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);
  const started = Date.now();
  const traceId = crypto.randomUUID();
  let stage = 'authentication';
  try {
    console.log('[CHECK-SUBSCRIPTION] started', { trace_id: traceId });
    const stripeKey = getStripeKey();
    const user = await getPaymentUser(req, controller.signal);
    stage = 'customer_lookup';
    const customers = await stripeRequest<{ data: { id: string }[] }>(
      `customers?email=${encodeURIComponent(user.email)}&limit=1`, stripeKey, controller.signal,
    );
    const customerId = customers.data?.[0]?.id;
    if (!customerId) return paymentResponse({ subscribed: false });

    stage = 'subscription_lookup';
    const subscriptions = await stripeRequest<{ data: StripeSubscription[] }>(
      `subscriptions?customer=${encodeURIComponent(customerId)}&status=active&limit=10`,
      stripeKey, controller.signal,
    );
    let subscriptionEnd: string | null = null;
    let subscribed = false;
    for (const subscription of subscriptions.data ?? []) {
      const item = subscription.items?.data?.find((entry) => {
        const product = entry.price?.product;
        return (typeof product === 'string' ? product : product?.id) === vipProductId;
      });
      if (!item) continue;
      subscribed = true;
      // Basil stores billing periods on subscription items; support older records too.
      const periodEnd = item.current_period_end ?? subscription.current_period_end;
      if (typeof periodEnd === 'number' && Number.isFinite(periodEnd) && periodEnd > 0) {
        subscriptionEnd = new Date(periodEnd * 1000).toISOString();
      }
      break;
    }

    if (subscribed) {
      stage = 'profile_sync';
      const baseUrl = Deno.env.get('SUPABASE_URL');
      const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      if (!baseUrl || !serviceKey) {
        throw new PaymentRequestError('Profile configuration is missing', 'configuration_error', 500);
      }
      // Preserve the existing verified active-subscription sync; never downgrade VIP here.
      await requestPaymentJson<unknown>(
        `${baseUrl.replace(/\/$/, '')}/rest/v1/user_profiles?id=eq.${encodeURIComponent(user.id)}`,
        {
          method: 'PATCH',
          headers: {
            apikey: serviceKey, Authorization: `Bearer ${serviceKey}`,
            'Content-Type': 'application/json', Prefer: 'return=minimal',
          },
          body: JSON.stringify({ is_vip: true }),
        }, 'Profile sync', controller.signal, 5000,
      );
    }
    console.log('[CHECK-SUBSCRIPTION] completed', { trace_id: traceId, elapsed_ms: Date.now() - started });
    return paymentResponse({
      subscribed, product_id: subscribed ? vipProductId : null, subscription_end: subscriptionEnd,
    });
  } catch (error) {
    const failure = error instanceof PaymentRequestError ? error
      : new PaymentRequestError('Subscription check unavailable', 'subscription_check_failed', 500);
    console.error('[CHECK-SUBSCRIPTION] failed', {
      trace_id: traceId, stage, code: failure.code, elapsed_ms: Date.now() - started,
    });
    return paymentResponse({ error: failure.message, code: failure.code, stage, request_id: traceId }, failure.status);
  } finally {
    clearTimeout(timer);
  }
});
