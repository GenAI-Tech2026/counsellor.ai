-- KEAM 2025 Engineering — official phase-wise last ranks (Kerala).
-- Source is long (one row per college×branch×category); we ingest it WIDE: one
-- chunk per (college × branch × phase) holding every category's last rank as its
-- own metadata key (SM, EZ, MU, VK, BH, LA, DV, …). Same shape as kcet_2024.
-- `round` = allotment phase (Phase 1 / Phase 2). 384-dim local bge embeddings.
-- Lower rank = better.

create extension if not exists vector;

create table if not exists keam_2025 (
  id        bigserial primary key,
  chunk_id  text unique not null,
  content   text not null,
  embedding vector(384),
  metadata  jsonb not null default '{}'
);

create index if not exists keam_2025_exam_idx  on keam_2025 ((metadata ->> 'exam'));
create index if not exists keam_2025_year_idx  on keam_2025 ((metadata ->> 'year'));
create index if not exists keam_2025_state_idx on keam_2025 ((metadata ->> 'state'));
create index if not exists keam_2025_round_idx on keam_2025 ((metadata ->> 'round'));

-- Cosine similarity with optional eligibility (rank_field/min_rank), phase and
-- facet filters, plus named-college token filter.
--   rank_field:   a KEAM category key, e.g. 'SM' (State Merit), 'EZ', 'MU'
--   min_rank:     student's KEAM rank — returns seats whose last rank >= it
--   round_filter: 'Phase 1' / 'Phase 2'
create or replace function match_keam_2025(
  query_embedding vector(384),
  match_count     int,
  rank_field      text   default null,
  min_rank        int    default null,
  round_filter    text   default null,
  exam_filter     text   default null,
  year_filter     int    default null,
  state_filter    text   default null,
  inst_tokens     text[] default null
)
returns table (id bigint, content text, metadata jsonb, similarity float)
language sql stable
as $$
  select id, content, metadata, 1 - (embedding <=> query_embedding) as similarity
  from keam_2025
  where
    (rank_field is null or min_rank is null
       or (metadata ->> rank_field)::int >= min_rank)
    and (round_filter is null or metadata ->> 'round' = round_filter)
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
