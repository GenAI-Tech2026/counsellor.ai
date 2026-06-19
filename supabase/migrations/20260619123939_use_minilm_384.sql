-- Switch the embedding space from Google text-embedding-004 (768-dim) to the
-- local all-MiniLM-L6-v2 model that ChromaDB uses by default (384-dim).
--
-- Old 768-dim vectors are not comparable with the new 384-dim ones, so we drop
-- and recreate the table/function/index cleanly. Data is re-populated by
-- `npm run ingest`.

drop function if exists match_tgeapcet_2025(vector, int, text, int);
drop index if exists tgeapcet_2025_embedding_idx;
drop table if exists tgeapcet_2025;

-- Table — embedding now 384 dims (all-MiniLM-L6-v2)
create table tgeapcet_2025 (
  id        bigserial primary key,
  chunk_id  text unique not null,
  content   text not null,
  embedding vector(384),
  metadata  jsonb not null default '{}'
);

-- Match function — cosine similarity search with optional rank filter
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

-- IVFFlat index for fast ANN search
create index tgeapcet_2025_embedding_idx
  on tgeapcet_2025
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);
