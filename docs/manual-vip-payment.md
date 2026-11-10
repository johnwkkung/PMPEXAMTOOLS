# Manual VIP payment — 2026-11-01

## Reference retained

Previous Stripe/payment-debug implementation: `docs/reference/vip-payment-2026-11-01.2/README.md`. Original removed client sources are archived as `.txt`, with backend snapshots and previous UI integration excerpts. This is a payment reference, not a Git tag or full repository backup. The earlier diagnostic investigation is retained in `docs/vip-payment-diagnostics.md` for support/reference only.

## Current behavior

- Each click on Home's Upgrade VIP performs a fresh `appManager` POST with `mode=GETVER`, `value=TXRHEXAMTOOLS`, and the existing domain credentials. It retrieves APPID, APPNAME, VERSION, PRICE, DISCOUNT, and PROMO. Startup version checking remains independent and unchanged.
- The popup shows a loading state until server pricing is ready. Failed, timed-out, or invalid replies show an error and Retry; no old or hard-coded amount is substituted. Closing cancels the request. The receipt email button is disabled until pricing is available. No Stripe call is made.
- Payment copy comes from `assets/Payment-chi.txt`, mirrored as typed display tokens in `constants/manualVipPayment.ts` because Metro does not import arbitrary text assets by default. Amounts in the original text are historical: runtime prices and promotions now come exclusively from GETVER.
- `services/vipPricing.ts` calculates the amount: null/missing DISCOUNT uses PRICE; a percentage such as `80%` applies an 80% reduction using `PRICE * (1 - 80 / 100)`; a number such as `20` or `"20"` subtracts HK$20. Zero discounts are preserved. The final payable amount is rounded to the nearest whole HK dollar, with .50 rounded up, and displayed without decimal places; for example, HK$79.20 → `HK$ 79` and HK$79.50 → `HK$ 80`. Invalid/negative prices, percentages outside 0–100, and deductions exceeding PRICE are rejected.
- All three methods show the same calculated price and, when non-null/nonblank, PROMO immediately below that price.
- QR image: exact supplied `assets/images/RXRHEXAMTOOLS_Payment_QR_20percent.jpg`, saved alongside the retained original `assets/images/RXRHEXAMTOOLS_Payment_QR.png` and now used in the AlipayHK payment method. Displayed with expo-image and contain sizing; it is not regenerated or cropped, including the embedded HK$79 amount and payee caption. If the calculated price differs from 79, a visible notice asks users to confirm the amount and use bank transfer or FPS if the QR payment amount differs. Runtime pricing and discount calculation remain unchanged. The API does not provide a replacement QR code.
- Bank transfer: HSBC, K*** W** Kin John, account 819 056458 833.
- AlipayHK: supplied QR, John Kung, 86-198****2431|joh**@yahoo.com.
- FPS: identifier 5078993, HSBC, K*** W** Kin John.
- Instructions request the payment reference and receipt by email to passaexam@gmail.com, with the supplied 1–2 hour usual confirmation time.
- The email action opens a draft containing the logged-in account email, the same calculated price and applicable promotion, and prompts for a reference and attachment. It does not automatically send or attach a receipt, confirm payment, or grant VIP access.
- Server-backed `profile.is_vip` remains the access authority; Home keeps its existing profile refresh on focus. No additional VIP activation or admin approval API was introduced.
- Payment diagnostics panels, their hook/service, backend diagnostic action, and GET liveness probe are removed. General API/question debugging is preserved.
- Legacy authenticated checkout/verification routes are retained for older installed apps and unresolved references. Removed diagnostic/unknown actions return 400 rather than falling through to checkout creation. Local checkout attempts, database data/RLS, Stripe secrets, and existing Stripe payments are not cleared or modified.

## Release and review

Frontend changes require a new installed build or compatible OTA update. Backend changes alone do not update an existing APK/IPA. There is no automatic redirect or Stripe checkout in the new Upgrade VIP interaction.

Pricing checks: PRICE=99 with DISCOUNT=null → HK$ 99; DISCOUNT="80%" → HK$ 20; DISCOUNT=20 or "20" → HK$ 79; DISCOUNT=0 → HK$ 99; DISCOUNT="0%" → HK$ 99; DISCOUNT="100%" → HK$ 0. Check PROMO present/null, wrapped and case-insensitive response fields, missing PRICE, malformed discounts, timeout and retry, closing during loading, and changed pricing on reopening. Confirm all three method prices and the receipt email match.

Checks to perform on installed iOS and Android builds: open/close repeatedly; Android back dismissal; scroll through all three methods and important notes; landscape/small-phone/large-font layout; QR readability and uncropped image; working email draft; mail app unavailable handling; free/VIP access unchanged. No device runtime test or build command can be executed in this editing environment.

Before distributing through App Store or Google Play, review their applicable digital-content purchase rules for this external-payment instruction flow.
