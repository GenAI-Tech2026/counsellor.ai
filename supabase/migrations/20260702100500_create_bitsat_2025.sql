-- BITSAT 2025 (2025-26 admissions) — official campus/programme cut-off scores.
-- Source is wide-ish but has no reservation categories: one row per
-- (campus × programme) with a single Cut-off Score (out of 450). We ingest one
-- chunk per (campus × programme). 384-dim local bge embeddings.
--
-- IMPORTANT: this is BITSAT-SCORE based — HIGHER is BETTER. Eligibility INVERTS:
-- a student with score S qualifies for programmes whose cut-off <= S. The match
-- function filters with `<=`, and `student_score` carries the student's score.
-- Only the latest year (2025-26) is ingested; the source keeps older years too.

create extension if not exists vector;

create table if not exists bitsat_2025 (
  id        bigserial primary key,
  chunk_id  text unique not null,
  content   text not null,
  embedding vector(384),
  metadata  jsonb not null default '{}'
);

create index if not exists bitsat_2025_exam_idx   on bitsat_2025 ((metadata ->> 'exam'));
create index if not exists bitsat_2025_year_idx   on bitsat_2025 ((metadata ->> 'year'));
create index if not exists bitsat_2025_campus_idx on bitsat_2025 ((metadata ->> 'campus'));

-- Cosine similarity with optional eligibility (student_score), campus and facet
-- filters, plus named-campus/programme token filter.
--   student_score: student's BITSAT score — returns programmes whose cut-off <= it
--   campus_filter: 'Pilani' / 'Goa' / 'Hyderabad'
create or replace function match_bitsat_2025(
  query_embedding vector(384),
  match_count     int,
  student_score   int    default null,
  campus_filter   text   default null,
  exam_filter     text   default null,
  year_filter     int    default null,
  state_filter    text   default null,
  inst_tokens     text[] default null
)
returns table (id bigint, content text, metadata jsonb, similarity float)
language sql stable
as $$
  select id, content, metadata, 1 - (embedding <=> query_embedding) as similarity
  from bitsat_2025
  where
    (student_score is null or (metadata ->> 'cutoff_score')::int <= student_score)
    and (campus_filter is null or metadata ->> 'campus' = campus_filter)
    and (exam_filter   is null or metadata ->> 'exam'   = exam_filter)
    and (year_filter   is null or (metadata ->> 'year')::int = year_filter)
    and (state_filter  is null or metadata ->> 'state'  = state_filter)
    and (inst_tokens is null or array_length(inst_tokens, 1) is null or (
      select bool_and(
        lower(
          coalesce(metadata ->> 'campus', '')  || ' ' ||
          coalesce(metadata ->> 'program', '')
        ) like '%' || lower(tok) || '%'
      )
      from unnest(inst_tokens) as tok
    ))
  order by embedding <=> query_embedding
  limit match_count;
$$;
