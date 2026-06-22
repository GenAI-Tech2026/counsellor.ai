-- Chat feedback: thumbs up / down ratings on the AI's replies.
--
-- Powers the feedback buttons on bot messages. Each row captures a single
-- rating on one assistant message, plus enough context (the message text and
-- the user's preceding question) to evaluate the AI's performance offline.
--
-- Feedback is collected from everyone, including signed-out visitors, so
-- user_id and conversation_id are nullable. The table is write-only from the
-- client: anyone may insert, nobody may read it back (analysis runs through
-- the dashboard / service role).

create table if not exists chat_feedback (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete set null,
  conversation_id uuid references conversations(id) on delete set null,
  message_text    text not null,
  user_query      text,
  rating          text not null check (rating in ('up', 'down')),
  created_at      timestamptz not null default now()
);

-- Inspect feedback newest-first when evaluating.
create index if not exists chat_feedback_created_at_idx on chat_feedback (created_at desc);

alter table chat_feedback enable row level security;

-- Anyone (including the anonymous role) may submit feedback. There is no
-- select/update/delete policy, so the table cannot be read back through the
-- public API — only via the Supabase dashboard or a service-role key.
drop policy if exists "chat_feedback_insert_any" on chat_feedback;
create policy "chat_feedback_insert_any"
  on chat_feedback for insert
  with check (true);
