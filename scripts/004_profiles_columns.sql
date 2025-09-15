-- add columns used in UI and ensure uniqueness where needed
alter table public.profiles
  add column if not exists full_name text,
  add column if not exists username text;

-- optional uniqueness for username when provided
create unique index if not exists profiles_username_key on public.profiles(username) where username is not null;
