-- User profiles: saved admission details used to auto-personalise the chat.
--
-- One row per user. The chat page reads these and quietly appends them to each
-- outgoing message (e.g. "Context: User is OC Male with Rank 5000") so students
-- don't have to repeat their details every conversation. RLS restricts all
-- access to the owning user (auth.uid()).

create table if not exists profiles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  exam       text check (exam in ('TGEAPCET', 'JEE')),
  rank       integer check (rank is null or rank > 0),
  category   text check (category in ('OC', 'BC', 'SC', 'ST')),
  gender     text check (gender in ('male', 'female')),
  updated_at timestamptz not null default now()
);

alter table profiles enable row level security;

-- A user may only read/write their own profile row.
drop policy if exists "profiles_select_own" on profiles;
create policy "profiles_select_own"
  on profiles for select
  using (user_id = auth.uid());

drop policy if exists "profiles_insert_own" on profiles;
create policy "profiles_insert_own"
  on profiles for insert
  with check (user_id = auth.uid());

drop policy if exists "profiles_update_own" on profiles;
create policy "profiles_update_own"
  on profiles for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "profiles_delete_own" on profiles;
create policy "profiles_delete_own"
  on profiles for delete
  using (user_id = auth.uid());
