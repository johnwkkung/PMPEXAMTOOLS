import { PaymentRequestError, requestPaymentJson } from './paymentHttp.ts';

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

Deno.test('valid JSON null from an empty RPC lookup is accepted', async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response('null', { status: 200, headers: { 'Content-Type': 'application/json' } });
    const result = await requestPaymentJson<unknown>('https://example.invalid/rest/v1/rpc/read_vip_checkout_attempt',
      { method: 'POST', body: '{}' }, 'Checkout attempt RPC', new AbortController().signal);
    assert(result === null, 'A valid null result represents a missing attempt, not invalid JSON');
  } finally { globalThis.fetch = originalFetch; }
});

Deno.test('HTML gateway responses still fail closed and are not exposed', async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response('<html>gateway error</html>', { status: 200 });
    try {
      await requestPaymentJson<unknown>('https://example.invalid/rest/v1/rpc/read_vip_checkout_attempt',
        { method: 'POST', body: '{}' }, 'Checkout attempt RPC', new AbortController().signal);
    } catch (error) {
      assert(error instanceof PaymentRequestError && error.code === 'invalid_response', 'Unparseable body must be rejected');
      assert(!error.message.includes('<html>'), 'Raw HTML must not enter payment UI');
      return;
    }
    throw new Error('HTML response must not become a new payment attempt');
  } finally { globalThis.fetch = originalFetch; }
});
