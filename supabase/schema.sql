-- Run this in your Supabase SQL Editor before running `npm run ingest`

-- 1. Enable pgvector
create extension if not exists vector;

-- 2. Create the table
--    embedding: 768 dims (Google text-embedding-004)
--    metadata:  JSONB with all rank fields + college info
create table if not exists tgeapcet_2025 (
  id        bigserial primary key,
  chunk_id  text unique not null,
  content   text not null,
  embedding vector(768),
  metadata  jsonb not null default '{}'
);

-- 3. Match function — cosine similarity search with optional rank filter
--    rank_field: e.g. 'oc_boys', 'bca_girls', 'st_boys' (null = no filter)
--    min_rank:   student's rank — returns only colleges where cutoff >= rank (eligible)
create or replace function match_tgeapcet_2025(
  query_embedding vector(768),
  match_count     int,
  rank_field      text default null,
  min_rank        int  default null
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
    rank_field is null
    or min_rank is null
    or (metadata ->> rank_field)::int >= min_rank
  order by embedding <=> query_embedding
  limit match_count;
$$;

-- 4. IVFFlat index for fast ANN search (build after ingesting data)
--    Adjust `lists` based on row count: ~sqrt(total_rows)
create index if not exists tgeapcet_2025_embedding_idx
  on tgeapcet_2025
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);
