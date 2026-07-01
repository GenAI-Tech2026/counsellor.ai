-- New-age / next-gen tech colleges (NIAT, Scaler, Polaris, Newton, Plaksha …).
-- These admit through their OWN application process (NOT JoSAA / state counselling),
-- so they sit outside the rank-cutoff corpus. One row per content chunk; 384-dim
-- embeddings (local all-MiniLM-L6-v2, same as every other table).

create extension if not exists vector;

create table if not exists nextgen_colleges (
  id        bigserial primary key,
  chunk_id  text unique not null,
  content   text not null,
  embedding vector(384),
  metadata  jsonb not null default '{}'
);

-- Cosine similarity search with an optional exact college-key filter (e.g. 'niat'),
-- used when the student names one specific college.
create or replace function match_nextgen_colleges(
  query_embedding vector(384),
  match_count     int,
  college_filter  text default null
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
  from nextgen_colleges
  where (college_filter is null or metadata ->> 'key' = college_filter)
  order by embedding <=> query_embedding
  limit match_count;
$$;

-- No ANN index: a handful of rows, exact cosine search is instant and full-recall.
