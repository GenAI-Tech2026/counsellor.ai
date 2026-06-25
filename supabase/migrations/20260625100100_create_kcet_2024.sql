-- KCET (Karnataka CET) 2024 Engineering — official closing ranks.
-- Source is long (one row per college×branch×category code); we ingest it WIDE:
-- one chunk per (college × branch × round) holding every category's closing
-- rank, so a single retrieval surfaces the full reservation picture (same shape
-- as tgeapcet_2025). 384-dim embeddings (local all-MiniLM-L6-v2).
--
-- Category codes are KCET's own (GM, 1G, 2AG, 3BG, SCG, STG, … and the
-- Hyderabad-Karnataka 'H' variants) and are stored verbatim as metadata keys.
-- `round` encodes both the region stream and counselling round, e.g. "GEN R2",
-- "HK Mock". `region` is 'General' or 'Hyderabad-Karnataka'.

create extension if not exists vector;

create table if not exists kcet_2024 (
  id        bigserial primary key,
  chunk_id  text unique not null,
  content   text not null,
  embedding vector(384),
  metadata  jsonb not null default '{}'
);

create index if not exists kcet_2024_exam_idx   on kcet_2024 ((metadata ->> 'exam'));
create index if not exists kcet_2024_year_idx   on kcet_2024 ((metadata ->> 'year'));
create index if not exists kcet_2024_state_idx  on kcet_2024 ((metadata ->> 'state'));
create index if not exists kcet_2024_round_idx  on kcet_2024 ((metadata ->> 'round'));

-- Cosine similarity with optional eligibility (rank_field/min_rank), round and facets.
--   rank_field:   a KCET category code key, e.g. 'GM', '2AG', 'SCG', 'STH'
--   min_rank:     student's rank — returns seats whose closing rank >= rank
--   round_filter: e.g. 'GEN R2', 'HK R2' (exact match)
create or replace function match_kcet_2024(
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
  from kcet_2024
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
