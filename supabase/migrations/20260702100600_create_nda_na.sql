-- NDA & NA — national written/final cut-offs by exam session (UPSC/SSB).
-- This is AGGREGATE exam-level data (one row per year × session), NOT college
-- data: there are no institutes/branches to recommend, so this table only powers
-- factual Q&A ("what was the NDA 2024 (I) final cut-off?"). 384-dim local bge.
--
-- The match function is semantic-only (optional year/exam facet filters); there
-- is no rank/score eligibility gate because a candidate's NDA marks map to a
-- single national merit list, not a set of eligible colleges.

create extension if not exists vector;

create table if not exists nda_na (
  id        bigserial primary key,
  chunk_id  text unique not null,
  content   text not null,
  embedding vector(384),
  metadata  jsonb not null default '{}'
);

create index if not exists nda_na_exam_idx on nda_na ((metadata ->> 'exam'));
create index if not exists nda_na_year_idx on nda_na ((metadata ->> 'year'));

create or replace function match_nda_na(
  query_embedding vector(384),
  match_count     int,
  year_filter     int  default null,
  exam_filter     text default null
)
returns table (id bigint, content text, metadata jsonb, similarity float)
language sql stable
as $$
  select id, content, metadata, 1 - (embedding <=> query_embedding) as similarity
  from nda_na
  where (year_filter is null or (metadata ->> 'year')::int = year_filter)
    and (exam_filter is null or metadata ->> 'exam' = exam_filter)
  order by embedding <=> query_embedding
  limit match_count;
$$;
