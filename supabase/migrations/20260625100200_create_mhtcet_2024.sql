-- MHT-CET 2024 Engineering — official CAP-round cut-offs (Maharashtra).
-- Source is long (one row per college×branch×seat-type×category); we ingest it
-- WIDE: one chunk per (college × branch × round × seat_type) holding every
-- category's closing CET merit number (same shape as tgeapcet_2025).
-- 384-dim embeddings (local all-MiniLM-L6-v2).
--
-- Category codes are MHT-CET's own and dense (GOPENS, GSCS, LOBCH, EWS, TFWS,
-- PWD*, DEF*, …) — a prefix (G/L/PWD/DEF) + category + home/state/other suffix.
-- They are stored verbatim as metadata keys. `round` is the CAP round
-- (CAP1/CAP2/CAP3); `seat_type` distinguishes State-Level vs minority quotas.
-- The stored rank is the CET merit number (lower = better, like a rank).

create extension if not exists vector;

create table if not exists mhtcet_2024 (
  id        bigserial primary key,
  chunk_id  text unique not null,
  content   text not null,
  embedding vector(384),
  metadata  jsonb not null default '{}'
);

create index if not exists mhtcet_2024_exam_idx  on mhtcet_2024 ((metadata ->> 'exam'));
create index if not exists mhtcet_2024_year_idx  on mhtcet_2024 ((metadata ->> 'year'));
create index if not exists mhtcet_2024_state_idx on mhtcet_2024 ((metadata ->> 'state'));
create index if not exists mhtcet_2024_round_idx on mhtcet_2024 ((metadata ->> 'round'));

-- Cosine similarity with optional eligibility (rank_field/min_rank), round and facets.
--   rank_field:   an MHT-CET category code key, e.g. 'GOPENS', 'GSCS', 'EWS'
--   min_rank:     student's CET merit number — returns seats whose closing
--                 merit number >= the student's (i.e. they'd have qualified)
--   round_filter: e.g. 'CAP1', 'CAP3' (exact match)
create or replace function match_mhtcet_2024(
  query_embedding vector(384),
  match_count     int,
  rank_field      text default null,
  min_rank        int  default null,
  round_filter    text default null,
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
  from mhtcet_2024
  where
    (rank_field is null or min_rank is null
       or (metadata ->> rank_field)::int >= min_rank)
    and (round_filter is null or metadata ->> 'round' = round_filter)
    and (exam_filter  is null or metadata ->> 'exam'  = exam_filter)
    and (year_filter  is null or (metadata ->> 'year')::int = year_filter)
    and (state_filter is null or metadata ->> 'state' = state_filter)
  order by embedding <=> query_embedding
  limit match_count;
$$;

-- No ANN index: a few thousand rows, exact cosine search is fast + full-recall.
