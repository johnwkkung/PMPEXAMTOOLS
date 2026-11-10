# Saved payment implementation reference

Saved before replacing the Upgrade VIP interaction on 2026-11-01.

- Client protocol: `vip-payment-2026-11-01.2`.
- Backend fix: `attempt-rpc-2026-11-01.2`.
- Existing HK$99 one-time Stripe price: `price_1U9LZj4u91n6WAru9LvHLbZ5`.
- Investigation history: `docs/vip-payment-diagnostics.md` (retained as historical evidence).

## Scope and archive format

This is a source-level payment-flow reference, not a Git tag, a full-project backup, or a database snapshot. Removed client modules are preserved verbatim at their original relative paths with a `.txt` suffix. The changed shared checkout handler and route entry points are also preserved. `.txt` source copies are intentionally excluded from Expo routing and TypeScript compilation. Shared HTTP/storage helpers, regression tests, and the checkout RPC migration remain in their original source locations unchanged.

Home and API Testing integration is recorded in `ui-integration.md`; unrelated quiz, authentication, and profile logic remains unchanged. No secret values, account records, or card data are copied into this archive. Stored checkout attempts and their frozen parameters are not cleared or modified.

## Replacement behavior

Upgrade VIP now opens local instructions for bank transfer, AlipayHK, and FPS with the supplied QR image. It does not call Stripe, create a checkout, clear retained attempts, or automatically set VIP status. Receipt verification and VIP activation are manual. Payment diagnostics are removed from both Home and API Testing and from the backend's GET/diagnostics probes. General API and question testing remains available.

The legacy authenticated Stripe checkout and verification APIs remain compatible with older installed apps; they are not invoked by the new popup. Unknown actions must be rejected rather than accidentally creating a checkout.

## Restoration

Only restore deliberately after reviewing unresolved Stripe attempts. Copy each archived client `.txt` file back to its original path, restore the archived checkout handler and entry points, and follow `ui-integration.md` to reconnect Home and API Testing. The server-only RPC migration is already applied; never replace frozen parameters or reset unresolved attempts to force a fresh payment.

An installed APK/IPA needs a new build or a compatible OTA update to receive the manual-payment UI; server deployment alone does not update the installed frontend.
