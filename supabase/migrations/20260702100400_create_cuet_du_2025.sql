-- CUET UG 2025 — Delhi University (CSAS) closing cut-offs by category.
-- Source is already WIDE (one row per college×programme with a column per
-- category: UR, OBC, SC, ST, EWS, PwBD). We store each category's closing CUET
-- score as its own metadata key (ur, obc, sc, st, ews, pwbd). `round` = CSAS
-- round (Round 1 / Round 3 / Spot Round). 384-dim local bge embeddings.
--
-- IMPORTANT: this is CUET-SCORE based — HIGHER is BETTER. Eligibility INVERTS: a
-- student with score S qualifies for programmes whose cut-off <= S. The match
-- function filters with `<=`, and `student_score` carries the student's score.
-- Scores are fractional so they are stored/compared as numeric.

create extension if not exists vector;

create table if not exists cuet_du_2025 (
  id        bigserial primary key,
  chunk_id  text unique not null,
  content   text not null,
  embedding vector(384),
  metadata  jsonb not null default '{}'
);

create index if not exists cuet_du_2025_exam_idx  on cuet_du_2025 ((metadata ->> 'exam'));
create index if not exists cuet_du_2025_year_idx  on cuet_du_2025 ((metadata ->> 'year'));
create index if not exists cuet_du_2025_state_idx on cuet_du_2025 ((metadata ->> 'state'));
create index if not exists cuet_du_2025_round_idx on cuet_du_2025 ((metadata ->> 'round'));

-- Cosine similarity with optional eligibility (cat_field/student_score), round
-- and facet filters, plus named-college token filter.
--   cat_field:     one of 'ur','obc','sc','st','ews','pwbd'
--   student_score: student's CUET score — returns programmes whose cut-off <= it
--   round_filter:  'Round 1' / 'Round 3' / 'Spot Round'
create or replace function match_cuet_du_2025(
  query_embedding vector(384),
  match_count     int,
  cat_field       text    default null,
  student_score   numeric default null,
  round_filter    text    default null,
  exam_filter     text    default null,
  year_filter     int     default null,
  state_filter    text    default null,
  inst_tokens     text[]  default null
)
returns table (id bigint, content text, metadata jsonb, similarity float)
language sql stable
as $$
  select id, content, metadata, 1 - (embedding <=> query_embedding) as similarity
  from cuet_du_2025
  where
    (cat_field is null or student_score is null
       or (metadata ->> cat_field)::numeric <= student_score)
    and (round_filter is null or metadata ->> 'round' = round_filter)
    and (exam_filter  is null or metadata ->> 'exam'  = exam_filter)
    and (year_filter  is null or (metadata ->> 'year')::int = year_filter)
    and (state_filter is null or metadata ->> 'state' = state_filter)
    and (inst_tokens is null or array_length(inst_tokens, 1) is null or (
      select bool_and(
        lower(
          coalesce(metadata ->> 'college_name', '') || ' ' ||
          coalesce(metadata ->> 'program', '')
        ) like '%' || lower(tok) || '%'
      )
      from unnest(inst_tokens) as tok
    ))
  order by embedding <=> query_embedding
  limit match_count;
$$;
