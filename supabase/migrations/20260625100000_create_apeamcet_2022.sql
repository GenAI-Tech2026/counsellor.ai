-- APEAMCET (AP EAPCET) 2022 — official last-rank statement.
-- Wide, one row per (institute × branch × local area): every category's last
-- rank for that seat lives in one chunk (same shape as tgeapcet_2025).
-- 384-dim embeddings (local all-MiniLM-L6-v2). AP reservation categories:
-- OC / SC / ST / BC-A..BC-E / EWS, each split Boys/Girls.

create extension if not exists vector;

create table if not exists apeamcet_2022 (
  id        bigserial primary key,
  chunk_id  text unique not null,
  content   text not null,
  embedding vector(384),
  metadata  jsonb not null default '{}'
);

-- Structured facet indexes (exam/year/state) for hard pre-filtering.
create index if not exists apeamcet_2022_exam_idx  on apeamcet_2022 ((metadata ->> 'exam'));
create index if not exists apeamcet_2022_year_idx  on apeamcet_2022 ((metadata ->> 'year'));
create index if not exists apeamcet_2022_state_idx on apeamcet_2022 ((metadata ->> 'state'));

-- Cosine similarity with optional eligibility (rank_field/min_rank) + facets.
--   rank_field: a category column key, e.g. 'oc_boys', 'bca_girls', 'ews_boys'
--   min_rank:   student's rank — returns seats whose last rank >= rank
create or replace function match_apeamcet_2022(
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
  from apeamcet_2022
  where
    (rank_field is null or min_rank is null
       or (metadata ->> rank_field)::int >= min_rank)
    and (exam_filter  is null or metadata ->> 'exam'  = exam_filter)
    and (year_filter  is null or (metadata ->> 'year')::int = year_filter)
    and (state_filter is null or metadata ->> 'state' = state_filter)
  order by embedding <=> query_embedding
  limit match_count;
$$;

-- No ANN index: ~1.5k rows, exact cosine search is instant and full-recall.
