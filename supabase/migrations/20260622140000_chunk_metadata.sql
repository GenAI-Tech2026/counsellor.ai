-- Structured metadata tagging for the RAG vector stores.
--
-- Both tgeapcet_2025 and jee_josaa_2025 already carry a `metadata jsonb`
-- column, but it only held source-specific facts (college, rank fields, …).
-- This migration adds the cross-source structured facets the retriever filters
-- on — exam, year, state — and teaches the match_* functions to filter by them
-- so the model can narrow the corpus hard before ranking by similarity.
--
-- Fully idempotent: safe to run more than once.
--   exam : 'TGEAPCET' | 'JEE'
--   year : 2025
--   state: 'Telangana' (TGEAPCET) | 'All India' (JEE/JoSAA)

-- ── 1. Backfill the structured facets onto existing rows ────────────────────
-- New ingest runs write these facets directly (see scripts/ingest*.mjs); this
-- backfill covers rows already in the table. `||` merges, so it never clobbers
-- other metadata keys, and the where-guard makes re-runs cheap no-ops.

update tgeapcet_2025
set metadata = metadata || jsonb_build_object(
  'exam',  'TGEAPCET',
  'year',  2025,
  'state', 'Telangana'
)
where coalesce(metadata ->> 'exam', '') <> 'TGEAPCET'
   or coalesce(metadata ->> 'state', '') <> 'Telangana'
   or coalesce(metadata ->> 'year', '') <> '2025';

update jee_josaa_2025
set metadata = metadata || jsonb_build_object(
  'exam',  'JEE',
  'year',  2025,
  'state', 'All India'
)
where coalesce(metadata ->> 'exam', '') <> 'JEE'
   or coalesce(metadata ->> 'state', '') <> 'All India'
   or coalesce(metadata ->> 'year', '') <> '2025';

-- ── 2. Expression indexes on the structured facets ─────────────────────────
-- Cheap b-tree indexes on the jsonb text accessors keep the added equality
-- filters fast even as the tables grow.

create index if not exists tgeapcet_2025_exam_idx  on tgeapcet_2025 ((metadata ->> 'exam'));
create index if not exists tgeapcet_2025_year_idx  on tgeapcet_2025 ((metadata ->> 'year'));
create index if not exists tgeapcet_2025_state_idx on tgeapcet_2025 ((metadata ->> 'state'));

create index if not exists jee_josaa_2025_exam_idx  on jee_josaa_2025 ((metadata ->> 'exam'));
create index if not exists jee_josaa_2025_year_idx  on jee_josaa_2025 ((metadata ->> 'year'));
create index if not exists jee_josaa_2025_state_idx on jee_josaa_2025 ((metadata ->> 'state'));

-- ── 3. Teach match_tgeapcet_2025 to filter on the structured facets ────────
-- Existing params keep their position/semantics (backward compatible); the new
-- exam/year/state filters are appended and default to null (no filter).
--
-- Adding params changes the function signature, so `create or replace` alone
-- would leave the OLD 4-arg overload in place and make name-based RPC calls
-- ambiguous. Drop the prior overload first, then (re)create the wider one.
drop function if exists match_tgeapcet_2025(vector, int, text, int);

create or replace function match_tgeapcet_2025(
  query_embedding vector(384),
  match_count     int,
  rank_field      text default null,
  min_rank        int  default null,
  exam_filter     text default null,
  year_filter     int  default null,
  state_filter    text default null
)
returns table (
  id         bigint,
  content    text,
  metadata   jsonb,
  similarity float
)
language sql stable
as $$
  select
    id,
    content,
    metadata,
    1 - (embedding <=> query_embedding) as similarity
  from tgeapcet_2025
  where
    (rank_field is null or min_rank is null
       or (metadata ->> rank_field)::int >= min_rank)
    and (exam_filter  is null or metadata ->> 'exam'  = exam_filter)
    and (year_filter  is null or (metadata ->> 'year')::int = year_filter)
    and (state_filter is null or metadata ->> 'state' = state_filter)
  order by embedding <=> query_embedding
  limit match_count;
$$;

-- ── 4. Teach match_jee_josaa_2025 to filter on the structured facets ───────
-- Drop the prior 6-arg overload first (same overload-ambiguity reason as above).
drop function if exists match_jee_josaa_2025(vector, int, int, text, text, text);

create or replace function match_jee_josaa_2025(
  query_embedding  vector(384),
  match_count      int,
  min_rank         int  default null,
  seat_type_filter text default null,
  gender_filter    text default null,
  quota_filter     text default null,
  exam_filter      text default null,
  year_filter      int  default null,
  state_filter     text default null
)
returns table (
  id         bigint,
  content    text,
  metadata   jsonb,
  similarity float
)
language sql stable
as $$
  select
    id,
    content,
    metadata,
    1 - (embedding <=> query_embedding) as similarity
  from jee_josaa_2025
  where (min_rank is null         or (metadata ->> 'closing_rank')::int >= min_rank)
    and (seat_type_filter is null or metadata ->> 'seat_type' = seat_type_filter)
    and (gender_filter is null    or metadata ->> 'gender'    = gender_filter)
    and (quota_filter is null     or metadata ->> 'quota'     = quota_filter)
    and (exam_filter is null      or metadata ->> 'exam'      = exam_filter)
    and (year_filter is null      or (metadata ->> 'year')::int = year_filter)
    and (state_filter is null     or metadata ->> 'state'     = state_filter)
  order by embedding <=> query_embedding
  limit match_count;
$$;
