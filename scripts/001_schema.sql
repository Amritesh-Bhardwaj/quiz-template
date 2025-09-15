-- initial schema: profiles, questions, quiz_sessions, submissions, rls, and trigger to auto-create profiles

-- Enable useful extensions if not present
create extension if not exists pgcrypto;

-- PROFILES: store user details and role
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null,
  username text not null unique,
  phone text not null unique,
  roll_no text not null unique,
  role text not null default 'user', -- 'user' | 'admin'
  created_at timestamptz not null default now()
);

-- Questions: store question text, options, and correct answer (server only)
create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  prompt text not null,
  options text[] not null check (cardinality(options) >= 2),
  correct_index smallint not null check (correct_index >= 0),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Quiz sessions: generated at quiz start, keep a stable set of question ids and an end time
create table if not exists public.quiz_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question_ids uuid[] not null,
  started_at timestamptz not null default now(),
  ends_at timestamptz not null,
  unique (user_id)
);

-- Submissions: one per user enforced by unique constraint
create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  answers jsonb not null, -- [{question_id, choice_index}]
  score integer not null,
  submitted_at timestamptz not null default now(),
  unique (user_id)
);

-- RLS
alter table public.profiles enable row level security;
alter table public.questions enable row level security;
alter table public.quiz_sessions enable row level security;
alter table public.submissions enable row level security;

-- Helpers to check admin role
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

-- PROFILES policies: users manage their own row, admins can select all
drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_insert_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
drop policy if exists profiles_delete_own on public.profiles;
drop policy if exists profiles_admin_all on public.profiles;

create policy profiles_select_own on public.profiles
for select using (auth.uid() = id or public.is_admin());

create policy profiles_insert_own on public.profiles
for insert with check (auth.uid() = id);

create policy profiles_update_own on public.profiles
for update using (auth.uid() = id) with check (auth.uid() = id);

create policy profiles_delete_own on public.profiles
for delete using (auth.uid() = id or public.is_admin());

-- QUESTIONS policies: only admins can read/write (users never see correct_index from DB)
drop policy if exists questions_admin_all on public.questions;
create policy questions_admin_all on public.questions
for all using (public.is_admin()) with check (public.is_admin());

-- QUIZ_SESSIONS: user can manage their own; admins can read all
drop policy if exists quiz_sessions_user on public.quiz_sessions;
create policy quiz_sessions_user on public.quiz_sessions
for all using (auth.uid() = user_id or public.is_admin()) with check (auth.uid() = user_id or public.is_admin());

-- SUBMISSIONS: user can insert/select own, admins read all. Insert allowed only once by unique constraint.
drop policy if exists submissions_user on public.submissions;
create policy submissions_user on public.submissions
for select using (auth.uid() = user_id or public.is_admin());

create policy submissions_user_insert on public.submissions
for insert with check (auth.uid() = user_id);

-- Trigger: auto-create a profile on new auth.users using metadata from sign up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_full_name text;
  v_username text;
  v_phone text;
  v_roll_no text;
begin
  v_email := new.email;
  v_full_name := coalesce(new.raw_user_meta_data ->> 'full_name', 'User');
  v_username := coalesce(new.raw_user_meta_data ->> 'username', new.id::text);
  v_phone := coalesce(new.raw_user_meta_data ->> 'phone', new.id::text);
  v_roll_no := coalesce(new.raw_user_meta_data ->> 'roll_no', new.id::text);

  insert into public.profiles (id, email, full_name, username, phone, roll_no)
  values (new.id, v_email, v_full_name, v_username, v_phone, v_roll_no)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
