import { PaymentRequestError } from './paymentHttp.ts';
import { resolveStoredCheckoutAttempt } from './checkoutAttemptStorage.ts';

const sample = {
  user_id: 'test-user', attempt_id: 'retained-attempt',
  created_at: '2026-11-01T04:00:52Z', checkout_session_id: null,
  request_params: { mode: 'payment', 'line_items[0][price]': 'price_original', customer: 'cus_original' },
};
function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
async function shouldNotRun(): Promise<never> { throw new Error('Unexpected request'); }

Deno.test('RPC lookup reuses the retained attempt without recreating parameters', async () => {
  const result = await resolveStoredCheckoutAttempt({
    userId: sample.user_id, attemptId: sample.attempt_id,
    read: async () => sample, freeze: shouldNotRun, createParameters: shouldNotRun,
  });
  assert(result.request_params === sample.request_params, 'Original parameters must be reused');
});

Deno.test('freeze returns the persisted row without a second read-after-write GET', async () => {
  let reads = 0;
  let freezes = 0;
  const result = await resolveStoredCheckoutAttempt({
    userId: sample.user_id, attemptId: sample.attempt_id,
    read: async () => { reads += 1; return null; },
    createParameters: async () => sample.request_params,
    freeze: async (proposal) => { freezes += 1; assert(proposal === sample.request_params, 'Expected proposal'); return sample; },
  });
  assert(reads === 1 && freezes === 1, 'Exactly one RPC read and one freeze should occur');
  assert(result.request_params === sample.request_params, 'Use the committed parameters');
});

Deno.test('concurrent freeze returns original parameters rather than the newer proposal', async () => {
  const proposed = { ...sample.request_params, customer: 'cus_changed' };
  const result = await resolveStoredCheckoutAttempt({
    userId: sample.user_id, attemptId: sample.attempt_id,
    read: async () => [], createParameters: async () => proposed,
    freeze: async () => ({ data: sample }),
  });
  assert(result.request_params === sample.request_params, 'Concurrent winner must remain authoritative');
  assert(result.request_params.customer === 'cus_original', 'Never change a retained Stripe parameter');
});

Deno.test('missing freeze result fails closed instead of using the proposed parameters', async () => {
  try {
    await resolveStoredCheckoutAttempt({
      userId: sample.user_id, attemptId: sample.attempt_id,
      read: async () => null, createParameters: async () => sample.request_params,
      freeze: async () => null,
    });
  } catch (error) {
    assert(error instanceof PaymentRequestError && error.code === 'attempt_storage_failed', 'Expected safe storage failure');
    return;
  }
  throw new Error('Missing persisted attempt must not be used for Stripe');
});

Deno.test('mismatched RPC ownership fails before proposing another checkout', async () => {
  try {
    await resolveStoredCheckoutAttempt({
      userId: 'another-user', attemptId: sample.attempt_id,
      read: async () => sample, freeze: shouldNotRun, createParameters: shouldNotRun,
    });
  } catch (error) {
    assert(error instanceof PaymentRequestError && error.code === 'attempt_response_invalid', 'Expected ownership validation');
    return;
  }
  throw new Error('An attempt from another user must be rejected');
});
