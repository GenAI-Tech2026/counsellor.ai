-- Chat history: per-user persisted conversations and their messages.
--
-- Powers the "recent chats" sidebar. Each user owns a set of conversations,
-- and each conversation owns an ordered list of messages. RLS restricts all
-- access to the owning user (auth.uid()).

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- One row per chat thread, owned by a single user.
create table conversations (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  title      text not null default 'New chat',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One row per message within a conversation. Deleting a conversation cascades.
create table messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  role            text not null check (role in ('user', 'model')),
  content         text not null,
  sources         jsonb not null default '[]',
  created_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

-- Fetch a conversation's messages in chronological order.
create index messages_conversation_id_created_at_idx
  on messages (conversation_id, created_at);

-- List a user's conversations newest-first for the sidebar.
create index conversations_user_id_updated_at_idx
  on conversations (user_id, updated_at desc);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table conversations enable row level security;
alter table messages enable row level security;

-- conversations: a user may only touch their own rows.
create policy "conversations_select_own"
  on conversations for select
  using (user_id = auth.uid());

create policy "conversations_insert_own"
  on conversations for insert
  with check (user_id = auth.uid());

create policy "conversations_update_own"
  on conversations for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "conversations_delete_own"
  on conversations for delete
  using (user_id = auth.uid());

-- messages: access allowed only when the parent conversation belongs to the user.
create policy "messages_select_own"
  on messages for select
  using (
    exists (
      select 1 from conversations c
      where c.id = messages.conversation_id
        and c.user_id = auth.uid()
    )
  );

create policy "messages_insert_own"
  on messages for insert
  with check (
    exists (
      select 1 from conversations c
      where c.id = messages.conversation_id
        and c.user_id = auth.uid()
    )
  );

create policy "messages_update_own"
  on messages for update
  using (
    exists (
      select 1 from conversations c
      where c.id = messages.conversation_id
        and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from conversations c
      where c.id = messages.conversation_id
        and c.user_id = auth.uid()
    )
  );

create policy "messages_delete_own"
  on messages for delete
  using (
    exists (
      select 1 from conversations c
      where c.id = messages.conversation_id
        and c.user_id = auth.uid()
    )
  );
