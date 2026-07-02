-- COMEDK 2024 Engineering — official closing ranks (Karnataka private/consortium).
-- Source is long (one row per college×branch×seat-category); we ingest it WIDE:
-- one chunk per (college × branch) holding every seat category's closing rank as
-- its own metadata key (GM, KKR, SC, ST, …). Same shape as kcet_2024.
-- 384-dim embeddings (local bge-small-en-v1.5). Lower rank = better.

create extension if not exists vector;

create table if not exists comedk_2024 (
  id        bigserial primary key,
  chunk_id  text unique not null,
  content   text not null,
  embedding vector(384),
  metadata  jsonb not null default '{}'
);

create index if not exists comedk_2024_exam_idx  on comedk_2024 ((metadata ->> 'exam'));
create index if not exists comedk_2024_year_idx  on comedk_2024 ((metadata ->> 'year'));
create index if not exists comedk_2024_state_idx on comedk_2024 ((metadata ->> 'state'));

-- Cosine similarity with optional eligibility (rank_field/min_rank), facets and
-- named-college token filter.
--   rank_field: a COMEDK seat-category key, e.g. 'GM', 'SC', 'ST'
--   min_rank:   student's COMEDK rank — returns seats whose closing rank >= it
create or replace function match_comedk_2024(
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
  from comedk_2024
  where
    (rank_field is null or min_rank is null
       or (metadata ->> rank_field)::int >= min_rank)
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
