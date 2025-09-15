// Tables: profiles, questions, quiz_sessions, submissions. Constraints: one attempt per user.
// RLS policies enforce per-user access; admin actions are via server routes with service key.

-- Enable extensions if needed
-- create extension if not exists "uuid-ossp";

-- Profiles: extends auth.users with extra fields
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  username text not null unique,
  roll_no text not null unique,
  phone text not null unique,
  is_admin boolean not null default false,
  has_attempted boolean not null default false,
  created_at timestamptz not null default now()
);

-- Questions: correct_answer_index is stored but never exposed via API
create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  question_text text not null,
  options jsonb not null, -- array of { "id": string, "text": string }
  correct_answer_id text not null, -- id of the correct option, never sent to clients
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

-- Quiz sessions: created when user starts quiz (for timer enforcement)
create table if not exists public.quiz_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  started_at timestamptz not null default now()
);

-- Submissions: one per user (enforces single attempt)
create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  score int not null check (score >= 0 and score <= 20),
  submitted_at timestamptz not null default now(),
  raw_answers jsonb not null -- [{ question_id, selected_option_id }]
);

-- RLS
alter table public.profiles enable row level security;
alter table public.questions enable row level security;
alter table public.quiz_sessions enable row level security;
alter table public.submissions enable row level security;

-- Profiles: users can see/update only their profile; admins can see all
drop policy if exists "profiles_self_select" on public.profiles;
create policy "profiles_self_select" on public.profiles
for select using (auth.uid() = id or exists (
  select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true
));

drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_self_update" on public.profiles
for update using (auth.uid() = id);

drop policy if exists "profiles_self_insert" on public.profiles;
create policy "profiles_self_insert" on public.profiles
for insert with check (auth.uid() = id);

-- Questions: only admins can manage/read directly (app uses server routes)
drop policy if exists "questions_admin_all" on public.questions;
create policy "questions_admin_all" on public.questions
for all using (exists (
  select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true
)) with check (exists (
  select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true
));

-- Quiz sessions: users can manage their own
drop policy if exists "sessions_self_all" on public.quiz_sessions;
create policy "sessions_self_all" on public.quiz_sessions
for all using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Submissions: users can only insert/select their own (but UI won't show scores)
drop policy if exists "submissions_self_all" on public.submissions;
create policy "submissions_self_all" on public.submissions
for all using (auth.uid() = user_id)
with check (auth.uid() = user_id);
