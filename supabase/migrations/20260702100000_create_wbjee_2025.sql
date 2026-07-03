-- WBJEE 2025 Engineering — official round-wise opening/closing ranks (West Bengal).
-- Source is LONG (one row per institute×program×seat-type×quota×category), the
-- same ORCR shape as JoSAA, so we ingest it long too: one chunk per row holding
-- that row's opening_rank / closing_rank. Rounds R1+R2 ingested (`round` facet).
-- 384-dim embeddings (local bge-small-en-v1.5). Lower rank = better.
--
-- `category` is WBJEE's own reservation label (Open, OBC-A, OBC-B, SC, ST, EWS,
-- TFW, PwD, …). `quota` is Home State / others. Eligibility uses closing_rank:
-- a student with rank R qualifies for seats whose closing_rank >= R.

create extension if not exists vector;

create table if not exists wbjee_2025 (
  id        bigserial primary key,
  chunk_id  text unique not null,
  content   text not null,
  embedding vector(384),
  metadata  jsonb not null default '{}'
);

create index if not exists wbjee_2025_exam_idx     on wbjee_2025 ((metadata ->> 'exam'));
create index if not exists wbjee_2025_year_idx     on wbjee_2025 ((metadata ->> 'year'));
create index if not exists wbjee_2025_state_idx    on wbjee_2025 ((metadata ->> 'state'));
create index if not exists wbjee_2025_round_idx    on wbjee_2025 ((metadata ->> 'round'));
create index if not exists wbjee_2025_category_idx on wbjee_2025 ((metadata ->> 'category'));

-- Cosine similarity with optional eligibility (min_rank vs closing_rank),
-- category/quota/round and facet filters, plus named-institute token filter.
--   min_rank:         student's WBJEE rank — returns seats whose closing_rank >= it
--   category_filter:  exact WBJEE category, e.g. 'Open', 'OBC - A', 'SC'
--   quota_filter:     'Home State' / 'All India' etc.
--   round_filter:     'Round1' / 'Round2'
create or replace function match_wbjee_2025(
  query_embedding  vector(384),
  match_count      int,
  min_rank         int    default null,
  category_filter  text   default null,
  quota_filter     text   default null,
  round_filter     text   default null,
  exam_filter      text   default null,
  year_filter      int    default null,
  state_filter     text   default null,
  inst_tokens      text[] default null
)
returns table (id bigint, content text, metadata jsonb, similarity float)
language sql stable
as $$
  select id, content, metadata, 1 - (embedding <=> query_embedding) as similarity
  from wbjee_2025
  where (min_rank is null        or (metadata ->> 'closing_rank')::int >= min_rank)
    and (category_filter is null or metadata ->> 'category' = category_filter)
    and (quota_filter is null    or metadata ->> 'quota'    = quota_filter)
    and (round_filter is null    or metadata ->> 'round'    = round_filter)
    and (exam_filter is null     or metadata ->> 'exam'     = exam_filter)
    and (year_filter is null     or (metadata ->> 'year')::int = year_filter)
    and (state_filter is null    or metadata ->> 'state'    = state_filter)
    and (inst_tokens is null or array_length(inst_tokens, 1) is null or (
      select bool_and(
        lower(coalesce(metadata ->> 'institute', '')) like '%' || lower(tok) || '%'
      )
      from unnest(inst_tokens) as tok
    ))
  order by embedding <=> query_embedding
  limit match_count;
$$;
