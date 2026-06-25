-- Run this in your Supabase SQL Editor before running `npm run ingest`

-- 1. Enable pgvector
create extension if not exists vector;

-- 2. Create the table
--    embedding: 384 dims (local all-MiniLM-L6-v2 — ChromaDB's default model)
--    metadata:  JSONB with all rank fields + college info
create table if not exists tgeapcet_2025 (
  id        bigserial primary key,
  chunk_id  text unique not null,
  content   text not null,
  embedding vector(384),
  metadata  jsonb not null default '{}'
);

-- 3. Match function — cosine similarity search with optional rank filter
--    rank_field: e.g. 'oc_boys', 'bca_girls', 'st_boys' (null = no filter)
--    min_rank:   student's rank — returns only colleges where cutoff >= rank (eligible)
create or replace function match_tgeapcet_2025(
  query_embedding vector(384),
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

-- 4. No ANN index — with only ~2,820 rows, exact (sequential) cosine search is
--    sub-millisecond and always correct. An IVFFlat/HNSW index only probes a
--    subset of clusters and tanks recall once the rank-eligibility filter is
--    applied. Add an ANN index (built AFTER loading data) only if this table
--    grows to tens of thousands of rows.
