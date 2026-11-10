import { PaymentRequestError } from './paymentHttp.ts';
import { readCheckoutAttemptReferences, readStoredCheckoutAttempt } from './checkoutAttemptData.ts';

const sample = {
  user_id: 'user-test', attempt_id: 'retained-attempt',
  created_at: '2026-10-31T22:54:21.730793-05:00', checkout_session_id: null,
  request_params: {
    mode: 'payment', 'line_items[0][price]': 'price_existing',
    'line_items[0][quantity]': '1', 'metadata[user_id]': 'user-test',
  },
};

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

function assertInvalid(response: unknown, userId = sample.user_id) {
  try {
    readStoredCheckoutAttempt(response, userId, sample.attempt_id);
  } catch (error) {
    assert(error instanceof PaymentRequestError && error.code === 'attempt_response_invalid', 'Expected a safe storage response error');
    return;
  }
  throw new Error('Malformed or mismatched data must not become a fresh checkout attempt');
}

Deno.test('fully filtered object preserves the original attempt and exact parameters', () => {
  const result = readStoredCheckoutAttempt(sample, sample.user_id, sample.attempt_id);
  assert(result?.attempt_id === sample.attempt_id, 'Existing single-object attempt must be found');
  assert(result.request_params === sample.request_params, 'Frozen parameters must not be recreated or converted');
});

Deno.test('standard array and wrapped gateway responses preserve the same attempt', () => {
  for (const response of [[sample], { data: sample }, { data: [sample] }]) {
    const result = readStoredCheckoutAttempt(response, sample.user_id, sample.attempt_id);
    assert(result?.request_params === sample.request_params, 'Every supported shape must preserve parameters');
  }
});

Deno.test('empty responses are the only missing-attempt results', () => {
  for (const response of [[], null, { data: [] }]) {
    assert(readStoredCheckoutAttempt(response, sample.user_id, sample.attempt_id) === undefined, 'Expected no attempt');
  }
});

Deno.test('invalid response, ownership, parameters and duplicates fail closed', () => {
  assertInvalid({ message: 'Unexpected gateway response' });
  assertInvalid([{}]);
  assertInvalid(sample, 'another-user');
  assertInvalid({ ...sample, attempt_id: 'another-attempt' });
  assertInvalid({ ...sample, request_params: null });
  assertInvalid({ ...sample, request_params: { quantity: 1 } });
  assertInvalid({ ...sample, created_at: 'invalid-date' });
  assertInvalid([sample, sample]);
});

Deno.test('diagnostic references support objects and do not expose frozen parameters', () => {
  const references = readCheckoutAttemptReferences(sample);
  assert(references.length === 1 && references[0].attempt_id === sample.attempt_id, 'Expected one diagnostic reference');
  assert(!('request_params' in references[0]) && !('user_id' in references[0]), 'Diagnostics must omit private parameters');
});
