-- Embedding upgrade (all-MiniLM-L6-v2 → bge-small-en-v1.5) + named-college lookup.
--
-- Two changes, both required for the "cutoff for CSE at JNTU Kakinada" class of
-- query to work:
--
--   1. RESET the vector corpus. The new model produces 384-dim vectors that are
--      NOT comparable with the old MiniLM vectors, so every table is truncated
--      here and must be re-populated with the ingest scripts (npm run ingest…).
--      Dimensionality is unchanged (384), so no column/type change is needed.
--
--   2. INSTITUTE-NAME FILTER. Each match_* function gains an `inst_tokens text[]`
--      parameter: when set, a row is kept only if EVERY token appears (case-
--      insensitive substring) somewhere in that row's name/place/affiliation
--      text. This lets the app hard-filter to a named college/university
--      ("JNTU Kakinada" → tokens {jntu,kakinada}) instead of relying on the
--      embedding similarity alone — and, crucially, it composes with dropping
--      the rank filter so a college's true cutoff surfaces regardless of the
--      student's own rank.
--
-- Adding a parameter changes each function's signature, so we DROP the prior
-- overload first (otherwise name-based RPC calls become ambiguous) then
-- recreate the wider version. `inst_tokens` defaults to null (no filter), so
-- existing callers that don't pass it keep working unchanged.

-- ── 1. Reset every vector table (stale MiniLM vectors) ─────────────────────
truncate table tgeapcet_2025;
truncate table apeamcet_2022;
truncate table jee_josaa_2025;
truncate table jee_advanced_2025;
truncate table kcet_2024;
truncate table mhtcet_2024;

-- ── 2. TGEAPCET ────────────────────────────────────────────────────────────
drop function if exists match_tgeapcet_2025(vector, int, text, int, text, int, text);

create or replace function match_tgeapcet_2025(
  query_embedding vector(384),
  match_count     int,
  rank_field      text   default null,
  min_rank        int    default null,
  exam_filter     text   default null,
  year_filter     int    default null,
  state_filter    text   default null,
  inst_tokens     text[] default null
)
returns table (id bigint, content text, metadata jsonb, similarity float)
language sql stable
as $$
  select id, content, metadata, 1 - (embedding <=> query_embedding) as similarity
  from tgeapcet_2025
  where
    (rank_field is null or min_rank is null
       or (metadata ->> rank_field)::int >= min_rank)
    and (exam_filter  is null or metadata ->> 'exam'  = exam_filter)
    and (year_filter  is null or (metadata ->> 'year')::int = year_filter)
    and (state_filter is null or metadata ->> 'state' = state_filter)
    and (inst_tokens is null or array_length(inst_tokens, 1) is null or (
      select bool_and(
        lower(
          coalesce(metadata ->> 'inst_name', '')  || ' ' ||
          coalesce(metadata ->> 'place', '')      || ' ' ||
          coalesce(metadata ->> 'dist_code', '')  || ' ' ||
          coalesce(metadata ->> 'affiliated', '') || ' ' ||
          coalesce(metadata ->> 'aff_full', '')
        ) like '%' || lower(tok) || '%'
      )
      from unnest(inst_tokens) as tok
    ))
  order by embedding <=> query_embedding
  limit match_count;
$$;

-- ── 3. APEAMCET ────────────────────────────────────────────────────────────
drop function if exists match_apeamcet_2022(vector, int, text, int, text, int, text);

create or replace function match_apeamcet_2022(
  query_embedding vector(384),
  match_count     int,
  rank_field      text   default null,
  min_rank        int    default null,
  exam_filter     text   default null,
  year_filter     int    default null,
  state_filter    text   default null,
  inst_tokens     text[] default null
)
returns table (id bigint, content text, metadata jsonb, similarity float)
language sql stable
as $$
  select id, content, metadata, 1 - (embedding <=> query_embedding) as similarity
  from apeamcet_2022
  where
    (rank_field is null or min_rank is null
       or (metadata ->> rank_field)::int >= min_rank)
    and (exam_filter  is null or metadata ->> 'exam'  = exam_filter)
    and (year_filter  is null or (metadata ->> 'year')::int = year_filter)
    and (state_filter is null or metadata ->> 'state' = state_filter)
    and (inst_tokens is null or array_length(inst_tokens, 1) is null or (
      select bool_and(
        lower(
          coalesce(metadata ->> 'inst_name', '')  || ' ' ||
          coalesce(metadata ->> 'place', '')      || ' ' ||
          coalesce(metadata ->> 'dist', '')       || ' ' ||
          coalesce(metadata ->> 'region', '')     || ' ' ||
          coalesce(metadata ->> 'affiliated', '') || ' ' ||
          coalesce(metadata ->> 'aff_full', '')
        ) like '%' || lower(tok) || '%'
      )
      from unnest(inst_tokens) as tok
    ))
  order by embedding <=> query_embedding
  limit match_count;
$$;

-- ── 4. JEE Main / JoSAA ────────────────────────────────────────────────────
drop function if exists match_jee_josaa_2025(vector, int, int, text, text, text, text, int, text);

create or replace function match_jee_josaa_2025(
  query_embedding  vector(384),
  match_count      int,
  min_rank         int    default null,
  seat_type_filter text   default null,
  gender_filter    text   default null,
  quota_filter     text   default null,
  exam_filter      text   default null,
  year_filter      int    default null,
  state_filter     text   default null,
  inst_tokens      text[] default null
)
returns table (id bigint, content text, metadata jsonb, similarity float)
language sql stable
as $$
  select id, content, metadata, 1 - (embedding <=> query_embedding) as similarity
  from jee_josaa_2025
  where (min_rank is null         or (metadata ->> 'closing_rank')::int >= min_rank)
    and (seat_type_filter is null or metadata ->> 'seat_type' = seat_type_filter)
    and (gender_filter is null    or metadata ->> 'gender'    = gender_filter)
    and (quota_filter is null     or metadata ->> 'quota'     = quota_filter)
    and (exam_filter is null      or metadata ->> 'exam'      = exam_filter)
    and (year_filter is null      or (metadata ->> 'year')::int = year_filter)
    and (state_filter is null     or metadata ->> 'state'     = state_filter)
    and (inst_tokens is null or array_length(inst_tokens, 1) is null or (
      select bool_and(
        lower(coalesce(metadata ->> 'institute', '')) like '%' || lower(tok) || '%'
      )
      from unnest(inst_tokens) as tok
    ))
  order by embedding <=> query_embedding
  limit match_count;
$$;

-- ── 5. JEE Advanced ────────────────────────────────────────────────────────
drop function if exists match_jee_advanced_2025(vector, int, int, text, text, text, text, int, text);

create or replace function match_jee_advanced_2025(
  query_embedding  vector(384),
  match_count      int,
  min_rank         int    default null,
  seat_type_filter text   default null,
  gender_filter    text   default null,
  round_filter     text   default null,
  exam_filter      text   default null,
  year_filter      int    default null,
  state_filter     text   default null,
  inst_tokens      text[] default null
)
returns table (id bigint, content text, metadata jsonb, similarity float)
language sql stable
as $$
  select id, content, metadata, 1 - (embedding <=> query_embedding) as similarity
  from jee_advanced_2025
  where (min_rank is null         or (metadata ->> 'closing_rank')::int >= min_rank)
    and (seat_type_filter is null or metadata ->> 'seat_type' = seat_type_filter)
    and (gender_filter is null    or metadata ->> 'gender'    = gender_filter)
    and (round_filter is null     or metadata ->> 'round'     = round_filter)
    and (exam_filter is null      or metadata ->> 'exam'      = exam_filter)
    and (year_filter is null      or (metadata ->> 'year')::int = year_filter)
    and (state_filter is null     or metadata ->> 'state'     = state_filter)
    and (inst_tokens is null or array_length(inst_tokens, 1) is null or (
      select bool_and(
        lower(coalesce(metadata ->> 'institute', '')) like '%' || lower(tok) || '%'
      )
      from unnest(inst_tokens) as tok
    ))
  order by embedding <=> query_embedding
  limit match_count;
$$;

-- ── 6. KCET ────────────────────────────────────────────────────────────────
drop function if exists match_kcet_2024(vector, int, text, int, text, text, int, text);

create or replace function match_kcet_2024(
  query_embedding vector(384),
  match_count     int,
  rank_field      text   default null,
  min_rank        int    default null,
  round_filter    text   default null,
  exam_filter     text   default null,
  year_filter     int    default null,
  state_filter    text   default null,
  inst_tokens     text[] default null
)
returns table (id bigint, content text, metadata jsonb, similarity float)
language sql stable
as $$
  select id, content, metadata, 1 - (embedding <=> query_embedding) as similarity
  from kcet_2024
  where
    (rank_field is null or min_rank is null
       or (metadata ->> rank_field)::int >= min_rank)
    and (round_filter is null or metadata ->> 'round' = round_filter)
    and (exam_filter  is null or metadata ->> 'exam'  = exam_filter)
    and (year_filter  is null or (metadata ->> 'year')::int = year_filter)
    and (state_filter is null or metadata ->> 'state' = state_filter)
    and (inst_tokens is null or array_length(inst_tokens, 1) is null or (
      select bool_and(
        lower(
          coalesce(metadata ->> 'college_name', '') || ' ' ||
          coalesce(metadata ->> 'place', '')
        ) like '%' || lower(tok) || '%'
      )
      from unnest(inst_tokens) as tok
    ))
  order by embedding <=> query_embedding
  limit match_count;
$$;

-- ── 7. MHT-CET ─────────────────────────────────────────────────────────────
drop function if exists match_mhtcet_2024(vector, int, text, int, text, text, int, text);

create or replace function match_mhtcet_2024(
  query_embedding vector(384),
  match_count     int,
  rank_field      text   default null,
  min_rank        int    default null,
  round_filter    text   default null,
  exam_filter     text   default null,
  year_filter     int    default null,
  state_filter    text   default null,
  inst_tokens     text[] default null
)
returns table (id bigint, content text, metadata jsonb, similarity float)
language sql stable
as $$
  select id, content, metadata, 1 - (embedding <=> query_embedding) as similarity
  from mhtcet_2024
  where
    (rank_field is null or min_rank is null
       or (metadata ->> rank_field)::int >= min_rank)
    and (round_filter is null or metadata ->> 'round' = round_filter)
    and (exam_filter  is null or metadata ->> 'exam'  = exam_filter)
    and (year_filter  is null or (metadata ->> 'year')::int = year_filter)
    and (state_filter is null or metadata ->> 'state' = state_filter)
    and (inst_tokens is null or array_length(inst_tokens, 1) is null or (
      select bool_and(
        lower(coalesce(metadata ->> 'college_name', '')) like '%' || lower(tok) || '%'
      )
      from unnest(inst_tokens) as tok
    ))
  order by embedding <=> query_embedding
  limit match_count;
$$;
