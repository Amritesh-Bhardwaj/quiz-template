-- Create profiles table if not exists (id matches auth.users.id)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text,
  phone text,
  roll_no text,
  role text not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Optional uniqueness (comment out any you don't need)
create unique index if not exists profiles_roll_no_key on public.profiles(roll_no) where roll_no is not null;
create unique index if not exists profiles_phone_key on public.profiles(phone) where phone is not null;

-- Row Level Security
alter table public.profiles enable row level security;

-- Policies:
-- Users can select/update their own profile; admins can select all
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select
using ( auth.uid() = id or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin') );

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
using ( auth.uid() = id )
with check ( auth.uid() = id );

-- Admin can update any profile
drop policy if exists "profiles_admin_update" on public.profiles;
create policy "profiles_admin_update"
on public.profiles for update
using ( exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin') );

-- Insert is driven by trigger; block direct inserts by clients
drop policy if exists "profiles_insert_none" on public.profiles;
create policy "profiles_insert_none"
on public.profiles for insert
with check ( false );

-- Upsert updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- Trigger to create profile on new user
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'user')
  on conflict (id) do nothing;
  return new;
end
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
