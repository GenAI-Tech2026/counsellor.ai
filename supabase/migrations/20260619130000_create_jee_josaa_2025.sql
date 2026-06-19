-- JEE Main/Advanced 2025 — JoSAA seat-allocation opening/closing ranks.
-- One row per (institute × program × quota × seat type × gender) for the final
-- allocation round. 384-dim embeddings (local all-MiniLM-L6-v2, same as TGEAPCET).

create extension if not exists vector;

create table if not exists jee_josaa_2025 (
  id        bigserial primary key,
  chunk_id  text unique not null,
  content   text not null,
  embedding vector(384),
  metadata  jsonb not null default '{}'
);

-- Cosine similarity search with optional eligibility + facet filters.
--   min_rank:          student's rank — returns programs whose closing_rank >= rank
--                      (i.e. the student would have been eligible)
--   seat_type_filter:  e.g. 'OPEN', 'OBC-NCL', 'SC', 'ST', 'EWS' (exact match)
--   gender_filter:     e.g. 'Gender-Neutral', 'Female-only (including Supernumerary)'
--   quota_filter:      e.g. 'AI', 'HS', 'OS'
create or replace function match_jee_josaa_2025(
  query_embedding  vector(384),
  match_count      int,
  min_rank         int  default null,
  seat_type_filter text default null,
  gender_filter    text default null,
  quota_filter     text default null
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
  order by embedding <=> query_embedding
  limit match_count;
$$;

-- No ANN index: ~12k rows, exact cosine search is fast and always correct
-- (and keeps full recall when the eligibility filter is applied).
