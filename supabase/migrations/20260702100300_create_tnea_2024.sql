-- TNEA 2024 Engineering — official mark cut-offs (Tamil Nadu, Anna University).
-- Source is long (one row per college×branch×category); we ingest it WIDE: one
-- chunk per (college × branch × stream) holding every category's cut-off MARK as
-- its own metadata key (OC, BC, BCM, MBC, MBCV, MBC DNC, SC, SCA, ST).
-- 384-dim local bge embeddings.
--
-- IMPORTANT: this exam is MARK-based, not rank-based — HIGHER is BETTER (marks
-- out of 200). Eligibility therefore INVERTS: a student with mark M qualifies for
-- seats whose cut-off mark <= M. The match function filters with `<=` (not `>=`),
-- and `student_mark` carries the student's own cut-off mark. Marks are fractional
-- so they are stored/compared as numeric. Only the latest year (2024) is ingested.

create extension if not exists vector;

create table if not exists tnea_2024 (
  id        bigserial primary key,
  chunk_id  text unique not null,
  content   text not null,
  embedding vector(384),
  metadata  jsonb not null default '{}'
);

create index if not exists tnea_2024_exam_idx   on tnea_2024 ((metadata ->> 'exam'));
create index if not exists tnea_2024_year_idx   on tnea_2024 ((metadata ->> 'year'));
create index if not exists tnea_2024_state_idx  on tnea_2024 ((metadata ->> 'state'));
create index if not exists tnea_2024_stream_idx on tnea_2024 ((metadata ->> 'stream'));

-- Cosine similarity with optional eligibility (mark_field/student_mark), stream
-- and facet filters, plus named-college token filter.
--   mark_field:    a TNEA category key, e.g. 'OC', 'BC', 'MBC', 'SC', 'ST'
--   student_mark:  student's cut-off mark — returns seats whose cut-off <= it
--   stream_filter: e.g. 'Engineering', 'BArch'
create or replace function match_tnea_2024(
  query_embedding vector(384),
  match_count     int,
  mark_field      text    default null,
  student_mark    numeric default null,
  stream_filter   text    default null,
  exam_filter     text    default null,
  year_filter     int     default null,
  state_filter    text    default null,
  inst_tokens     text[]  default null
)
returns table (id bigint, content text, metadata jsonb, similarity float)
language sql stable
as $$
  select id, content, metadata, 1 - (embedding <=> query_embedding) as similarity
  from tnea_2024
  where
    (mark_field is null or student_mark is null
       or (metadata ->> mark_field)::numeric <= student_mark)
    and (stream_filter is null or metadata ->> 'stream' = stream_filter)
    and (exam_filter   is null or metadata ->> 'exam'   = exam_filter)
    and (year_filter   is null or (metadata ->> 'year')::int = year_filter)
    and (state_filter  is null or metadata ->> 'state'  = state_filter)
    and (inst_tokens is null or array_length(inst_tokens, 1) is null or (
      select bool_and(
        lower(coalesce(metadata ->> 'college_name', '')) like '%' || lower(tok) || '%'
      )
      from unnest(inst_tokens) as tok
    ))
  order by embedding <=> query_embedding
  limit match_count;
$$;
