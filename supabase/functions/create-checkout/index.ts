import { handleVipCheckout } from '../_shared/vipCheckout.ts';

// Legacy authenticated checkout route for older installed apps and retained
// payment references. The new manual-payment popup does not call this route.
// GET liveness and diagnostic actions are retired; unsupported calls fail closed.
// Wrap explicitly: Deno's second handler argument is server info, not JSON input.
Deno.serve((req: Request) => handleVipCheckout(req));
