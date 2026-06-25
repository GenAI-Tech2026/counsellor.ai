-- JEE Advanced 2025 — IIT seat-allocation opening/closing ranks (JoSAA OR-CR).
-- Same ORCR shape as jee_josaa_2025, but IIT-only and keyed on the JEE Advanced
-- (AAT/CRL) rank rather than the JEE Main rank — kept in its own table so the
-- two rank spaces are never conflated. All rounds ingested, with a `round`
-- facet. 384-dim embeddings (local all-MiniLM-L6-v2).

create extension if not exists vector;

create table if not exists jee_advanced_2025 (
  id        bigserial primary key,
  chunk_id  text unique not null,
  content   text not null,
  embedding vector(384),
  metadata  jsonb not null default '{}'
);

create index if not exists jee_advanced_2025_exam_idx  on jee_advanced_2025 ((metadata ->> 'exam'));
create index if not exists jee_advanced_2025_year_idx  on jee_advanced_2025 ((metadata ->> 'year'));
create index if not exists jee_advanced_2025_state_idx on jee_advanced_2025 ((metadata ->> 'state'));
create index if not exists jee_advanced_2025_round_idx on jee_advanced_2025 ((metadata ->> 'round'));

-- Cosine similarity with optional eligibility + facet filters.
--   min_rank:          student's JEE Advanced rank — returns programs whose
--                      closing_rank >= rank (i.e. the student would be eligible)
--   seat_type_filter:  'OPEN', 'OBC-NCL', 'SC', 'ST', 'EWS' (exact match)
--   gender_filter:     'Gender-Neutral' | 'Female-only (including Supernumerary)'
--   round_filter:      e.g. 'Round 1', 'Round 6 (Final)'
create or replace function match_jee_advanced_2025(
  query_embedding  vector(384),
  match_count      int,
  min_rank         int  default null,
  seat_type_filter text default null,
  gender_filter    text default null,
  round_filter     text default null,
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
  from jee_advanced_2025
  where (min_rank is null         or (metadata ->> 'closing_rank')::int >= min_rank)
    and (seat_type_filter is null or metadata ->> 'seat_type' = seat_type_filter)
    and (gender_filter is null    or metadata ->> 'gender'    = gender_filter)
    and (round_filter is null     or metadata ->> 'round'     = round_filter)
    and (exam_filter is null      or metadata ->> 'exam'      = exam_filter)
    and (year_filter is null      or (metadata ->> 'year')::int = year_filter)
    and (state_filter is null     or metadata ->> 'state'     = state_filter)
  order by embedding <=> query_embedding
  limit match_count;
$$;

-- No ANN index: ~19k rows, exact cosine search is fast and full-recall.
