import { PaymentRequestError } from './paymentHttp.ts';
import { readStoredCheckoutAttempt, type StoredCheckoutAttempt } from './checkoutAttemptData.ts';

interface CheckoutAttemptStorageOptions {
  userId: string;
  attemptId: string;
  read: () => Promise<unknown>;
  freeze: (parameters: Record<string, string>) => Promise<unknown>;
  createParameters: () => Promise<Record<string, string>>;
}

// The freeze RPC returns the committed row in the same request. Do not perform
// another identical GET after a write, or use proposed parameters as a fallback.
export async function resolveStoredCheckoutAttempt({
  userId, attemptId, read, freeze, createParameters,
}: CheckoutAttemptStorageOptions): Promise<StoredCheckoutAttempt> {
  const retained = readStoredCheckoutAttempt(await read(), userId, attemptId);
  if (retained) return retained;
  const proposal = await createParameters();
  const persisted = readStoredCheckoutAttempt(await freeze(proposal), userId, attemptId);
  if (!persisted) {
    throw new PaymentRequestError(
      'Unable to retrieve the frozen checkout attempt; the original request has been retained',
      'attempt_storage_failed', 503,
    );
  }
  return persisted;
}
