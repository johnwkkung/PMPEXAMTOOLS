-- Server-only checkout RPCs; no existing checkout parameters are changed.
-- POST RPC avoids the REST GET path returning an empty read-after-write result.
create or replace function public.read_vip_checkout_attempt(p_user_id uuid, p_attempt_id text)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select pg_catalog.to_jsonb(a)
  from public.vip_checkout_attempts as a
  where a.user_id = p_user_id and a.attempt_id = p_attempt_id;
$$;

create or replace function public.freeze_vip_checkout_attempt(p_user_id uuid, p_attempt_id text, p_request_params jsonb)
returns jsonb
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  saved_attempt jsonb;
begin
  if p_user_id is null or p_attempt_id is null or p_request_params is null
    or pg_catalog.jsonb_typeof(p_request_params) <> 'object' or p_request_params = '{}'::jsonb then
    raise exception 'Invalid checkout attempt parameters';
  end if;
  insert into public.vip_checkout_attempts (user_id, attempt_id, request_params)
  values (p_user_id, p_attempt_id, p_request_params)
  on conflict (user_id, attempt_id) do nothing;
  -- Never overwrite another request's frozen parameters for the same identity.
  select pg_catalog.to_jsonb(a) into saved_attempt
  from public.vip_checkout_attempts as a
  where a.user_id = p_user_id and a.attempt_id = p_attempt_id;
  if saved_attempt is null then
    raise exception 'Checkout attempt could not be read';
  end if;
  return saved_attempt;
end;
$$;

-- Client roles cannot invoke these RPCs or bypass existing table RLS.
revoke execute on function public.read_vip_checkout_attempt(uuid, text) from public, anon, authenticated;
revoke execute on function public.freeze_vip_checkout_attempt(uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.read_vip_checkout_attempt(uuid, text) to service_role;
grant execute on function public.freeze_vip_checkout_attempt(uuid, text, jsonb) to service_role;
comment on function public.read_vip_checkout_attempt(uuid, text) is 'Service-only read of exact checkout identity via POST RPC; avoids REST GET lookup anomalies.';
comment on function public.freeze_vip_checkout_attempt(uuid, text, jsonb) is 'Service-only insert-if-missing and read in one RPC; preserves frozen parameters for Stripe idempotency.';
