# VIP payment gateway investigation — 2026-11-01

## Observed evidence (not a confirmed root cause)

- `create-checkout` gateway logs show HTTP 499 on 2026-11-01 at 01:31:40Z and 01:32:18Z. No corresponding checkout execution logs or Stripe session / PaymentIntent IDs were returned by the log tool.
- `check-subscription` completed at 03:40:25Z with HTTP 200; authentication took 46 ms and Stripe customer lookup took 136 ms (Stripe request `req_iw3F0qPpwyUB7M`). Live Preview's total request duration was 734 ms.
- These establish that one payment route has gateway failures while another reaches Stripe successfully. They do NOT establish the exact gateway/deployment failure, whether a customer's older attempt reached Stripe, or whether their installed build contains the latest changes.
- Server-side HTTP 499 indicates the requester disconnected; it is not a Stripe card decline. The reported HTML 504 is a gateway response, not Stripe's structured API error.

## Follow-up report and logs — 03:55:48Z

- The provided report confirms client and active backend protocol revision `.2`, an active HK$99 Stripe price, and a retained attempt `mvxalubd_tp56chlmxhs`.
- Active-route diagnostics completed in **413 ms server time** (496 ms invocation; 979 ms Live Preview request). The report's 30,006 ms total was dominated by the separate `create-checkout` GET timeout, not Stripe price lookup.
- A checkout request at **03:54:23Z** returned HTTP 503, code `attempt_storage_failed`, stage `freeze_parameters`, request `9630fd9c-6e7c-499e-9152-7e5e17400a39`. Storage POST returned 201 and the subsequent lookup returned 200, but the code failed before its Stripe session-creation stage.
- Read-only SQL confirms that the same attempt exists with a nonempty JSON object of frozen parameters, the original one-time mode and price, and no session reference. The code assumed every lookup was an array (`rows[0]`); a single-object gateway response was consequently treated as missing. The exact lookup response body was not captured in these logs, so the new parser logs whether the retained attempt is found on retry.
- The legacy GET has gateway HTTP 499 at 03:57:23Z and no function execution evidence. Its infrastructure cause remains unresolved; send this report to `contact@onspace.ai` if it continues.

## Follow-up report and logs — 04:02:15Z

- Both routes now respond: `create-checkout` GET returned HTTP 200 in 86 ms; active-route diagnostics returned HTTP 200 in 472 ms. The user's total report duration is 1,232 ms. The earlier gateway timeout is not reproduced by this report.
- Upgrade at **04:00:52Z** returned HTTP 503 in 524 ms, request `02b3fcf1-0a3f-4127-b730-995c61e35422`, code `attempt_storage_failed`, stage `freeze_parameters`. The deployed object/array parser fix was present. There is no session-creation stage in the logs for this request: this failure occurs before Stripe Checkout creation, not during card payment.
- SQL confirms both retained attempts exist with frozen object parameters and no recorded session ID. The fully filtered REST GET still returned a missing-attempt result after storage POST 201; object/array parsing alone did **not** fix this. Caching, filtering, and read-after-write visibility remain possible explanations, not confirmed gateway root causes.
- Backend fix **`attempt-rpc-2026-11-01.2`** replaces the exact lookup with a POST SQL RPC. A second RPC inserts only if missing and returns the stored row in the same request, eliminating the repeated GET-after-insert path. Concurrent attempts cannot overwrite existing frozen parameters.
- Read-only SQL verification of `read_vip_checkout_attempt` returned both original attempt IDs and confirmed their parameters are unchanged. Service-role execution is allowed; anonymous/authenticated client execution is denied. No Checkout Session or payment was created during investigation.
- Diagnostics now exercise this exact RPC lookup for the latest recorded attempt as well as the existing Stripe price and storage-list probes. A lookup failure makes the diagnostic request fail instead of presenting a successful list-only check.
- SQL verification does not verify the deployed HTTP RPC transport, Stripe session creation, or device redirects. Retry the existing retained attempt after backend deployment and share the next error/report if needed; do not clear app storage or generate a fresh request just to bypass an unresolved attempt.

## Changes

- Current device payment revision: `vip-payment-2026-11-01.2`.
- New builds call `check-subscription` with action `create_checkout`; the no-action subscription API is unchanged. Both routes delegate checkout to the same shared handler.
- `create-checkout` remains compatible with older builds and gains a read-only GET liveness probe.
- The payment remains the existing HK$99 **one-time** payment with its original price ID and redirects. No webhook or subscription plan was introduced.
- Attempts are stored on the device before sending; timeouts and browser dismissal retain them. The server freezes exact Stripe parameters in `vip_checkout_attempts` and reuses `vip-checkout:{user_id}:{attempt_id}`.
- Checkout session references are recorded. A success redirect alone no longer proves payment: Stripe's `payment_status` must be `paid` before the existing external UserManager upgrade is invoked.
- Gateway HTML is suppressed. Errors carry the client revision, code, stage, and available request/attempt reference.
- The diagnostic panel on Home and API Testing performs read-only probes and can share a report. The report contains no tokens, passwords, checkout URLs, or card data.
- Earlier server-only fix `attempt-response-2026-11-01.1` normalizes single-object, array, and data-wrapped storage responses for both checkout and diagnostics; it was insufficient for the later empty-lookup failure. Unexpected or mismatched data fails closed instead of creating fresh parameters. The retained attempt and its exact Stripe idempotency key are unchanged.
- Recorded sessions are retrieved from Stripe before reuse to detect current paid/expired status rather than replaying the cached session-creation response. No payment request is sent by the diagnostic checks.
- Protocol revision remains `vip-payment-2026-11-01.2` so current installed clients do not reject a compatible backend fix. Responses expose a separate `backend_fix` marker; the existing report UI does not display that extra field. Critical failure logs now fit within the log viewer's truncation limit.
- CORS explicitly permits the implemented read-only GET probe. The 04:02 report shows this probe responding, without establishing the earlier gateway timeout's underlying cause.
- `supabase/migrations/202611010402_checkout_attempt_rpc.sql` records the two server-only RPCs already applied to OnSpace Cloud. Both are security-invoker functions; table RLS is unchanged, and execution is restricted to the service role. Frozen rows are never overwritten by the freeze RPC.
- Valid JSON `null` from an empty RPC read is now distinguished from malformed JSON/HTML by the HTTP parser. Missing attempts can be frozen; malformed or mismatched responses still fail closed.
- This remains a server-only change: client TypeScript and payment protocol revision `.2` are unchanged. Current installed clients do not require an APK/IPA rebuild for this fix.

## Device verification / infrastructure escalation

1. For this **server-only fix**, the already installed `.2` app can retry Upgrade VIP after backend deployment; no new EAS build is required. Older clients still need the `.2` client update. An installed APK/IPA does not acquire client TypeScript changes by itself unless a compatible OTA update is configured.
2. Confirm the payment panel displays revision `vip-payment-2026-11-01.2`.
3. Run **付款連線檢查（不會扣款）** and share the report. Both backend probes should display the same revision. New backend diagnostics also check the exact RPC lookup; current clients do not display the extra `backend_fix` / `retained_attempt_lookup` fields, so backend logs confirm marker `attempt-rpc-2026-11-01.2` and `diagnostic_lookup ... found=true`. Missing revision indicates an older deployment; GET timeout with a successful Stripe probe points to that route's gateway/deployment path.
4. Retry Upgrade VIP once. The same retained request is reused. If its Stripe session is already paid, the app does not open a second payment page.
5. For another gateway timeout, send the UTC time, endpoint, client/backend revisions, report and request/attempt reference to `contact@onspace.ai`. The gateway itself cannot be repaired from app source code.
6. If a session or PaymentIntent reference appears, use it in Stripe Dashboard / Stripe Support to check actual status. Absence of a reference does not prove payment failed; older attempts were not recorded by this revision.

## Parser regression checks

`checkoutAttemptData.test.ts` covers response normalization, exact parameter preservation, malformed data, ownership, and diagnostic projection. `checkoutAttemptStorage.test.ts` covers retained reuse, atomic freeze results without a second GET, concurrent parameter preservation, and fail-closed missing/mismatched data. `paymentHttp.test.ts` verifies valid JSON-null RPC results and continued rejection of gateway HTML. Run from the repository root:

```sh
deno test supabase/functions/_shared/checkoutAttemptData.test.ts supabase/functions/_shared/checkoutAttemptStorage.test.ts supabase/functions/_shared/paymentHttp.test.ts
```

These Deno tests were added but could not be executed in this editing environment. Read-only SQL lookup and RPC privileges were verified directly. Actual HTTP RPC invocation, checkout creation, installed-device deep links, and the precise earlier gateway/REST lookup root cause remain unverified until a fresh device attempt/report is available.
