-- ================================================================
--  GoalGenius Final — Supabase Setup
--  API-first hybrid architecture
--  Matches are imported automatically from worldcup26.ir on first load
--  Run this ENTIRE file in Supabase SQL Editor
-- ================================================================

-- Drop old tables if migrating
drop table if exists public.predictions cascade;
drop table if exists public.matches cascade;
drop table if exists public.profiles cascade;

-- ── 1. PROFILES ─────────────────────────────────────────────
create table public.profiles (
  id         uuid references auth.users(id) on delete cascade primary key,
  full_name  text not null,
  role       text not null default 'employee' check (role in ('admin','employee')),
  created_at timestamptz default now()
);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
    coalesce(new.raw_user_meta_data->>'role','employee')
  ) on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── 2. MATCHES ───────────────────────────────────────────────
-- No pre-loaded data needed — app imports from API on first load
create table public.matches (
  id             bigint generated always as identity primary key,
  api_id         text unique,
  home_team      text not null,
  away_team      text not null,
  home_flag      text default '',
  away_flag      text default '',
  match_date     date not null,
  match_time     time not null default '18:00:00',
  group_stage    text default '',
  stadium        text default '',
  city           text default '',
  status         text not null default 'upcoming' check (status in ('upcoming','live','finished')),
  home_score     int,
  away_score     int,
  matchday       int default 1,
  admin_override boolean default false,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

create or replace function public.touch_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger matches_updated_at
  before update on public.matches
  for each row execute procedure public.touch_updated_at();

-- ── 3. PREDICTIONS ──────────────────────────────────────────
create table public.predictions (
  id         bigint generated always as identity primary key,
  user_id    uuid references auth.users(id) on delete cascade not null,
  match_id   bigint references public.matches(id) on delete cascade not null,
  home_score int not null,
  away_score int not null,
  created_at timestamptz default now(),
  unique(user_id, match_id)
);

-- ── ROW LEVEL SECURITY ───────────────────────────────────────
alter table public.profiles    enable row level security;
alter table public.matches     enable row level security;
alter table public.predictions enable row level security;

create policy "Profiles readable"        on public.profiles    for select using (auth.role() = 'authenticated');
create policy "Profiles insertable"      on public.profiles    for insert with check (true);
create policy "Profiles self update"     on public.profiles    for update using (auth.uid() = id);

create policy "Matches readable"         on public.matches     for select using (auth.role() = 'authenticated');
create policy "Admins manage matches"    on public.matches     for all    using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Predictions readable"     on public.predictions for select using (auth.role() = 'authenticated');
create policy "Users insert predictions" on public.predictions for insert with check (auth.uid() = user_id);
create policy "Users update upcoming"    on public.predictions for update using (
  auth.uid() = user_id and
  exists (select 1 from public.matches where id = match_id and status = 'upcoming')
);
create policy "Admins manage predictions" on public.predictions for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- ================================================================
--  AFTER RUNNING: set your admin role (run separately)
-- ================================================================
-- update public.profiles set role = 'admin'
-- where id = (select id from auth.users where email = 'jaysankar.chitturi@ezratis.fr');
