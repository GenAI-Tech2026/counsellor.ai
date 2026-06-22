-- Persistent rate limiting for the chat API.
--
-- The previous limiter (lib/ratelimit.js) was in-memory and per-IP, so it
-- reset on every server restart and couldn't follow a user across IPs. This
-- table backs a persistent, fixed-window limiter instead.
--
-- One row per (bucket_key, window_start). The bucket_key is the user id when
-- the request is authenticated, otherwise "ip:<address>". window_start is the
-- start of the hourly fixed window (UTC, truncated to the hour). The server
-- atomically increments `count` via the increment_rate_limit() RPC below and
-- decides allow/deny from the returned count.
--
-- Only the service role touches this table (the chat route writes it with the
-- SUPABASE_SERVICE_ROLE_KEY). RLS is enabled with no policies, so the public
-- anon/authenticated roles have no access at all — but the security-definer
-- RPC and the service role bypass RLS.

create table if not exists rate_limits (
  bucket_key   text        not null,
  window_start timestamptz not null,
  count        integer     not null default 0,
  updated_at   timestamptz not null default now(),
  primary key (bucket_key, window_start)
);

-- Lets a cleanup job prune expired windows efficiently.
create index if not exists rate_limits_window_start_idx on rate_limits (window_start);

alter table rate_limits enable row level security;

-- No RLS policies: the table is unreachable through the public API. Access is
-- only via the service-role key (used by the chat route) and the
-- security-definer RPC below.

-- Atomically bump the counter for a bucket/window and return the new count.
-- Runs as the table owner (security definer) so it works regardless of the
-- caller's RLS context. The chat route compares the returned value against the
-- per-hour limit to decide whether to allow the request.
create or replace function increment_rate_limit(
  p_bucket_key   text,
  p_window_start timestamptz
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_count integer;
begin
  insert into rate_limits (bucket_key, window_start, count, updated_at)
    values (p_bucket_key, p_window_start, 1, now())
  on conflict (bucket_key, window_start)
    do update set count = rate_limits.count + 1,
                  updated_at = now()
    returning count into new_count;

  return new_count;
end;
$$;
