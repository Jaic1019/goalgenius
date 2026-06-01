-- ============================================================
--  GoalGenius — Supabase Database Setup
--  Run this entire file in: Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. PROFILES TABLE (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text not null,
  role text not null default 'employee' check (role in ('admin', 'employee')),
  created_at timestamptz default now()
);

-- Auto-create profile when a user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'employee')
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 2. MATCHES TABLE
create table public.matches (
  id bigint generated always as identity primary key,
  home_team text not null,
  away_team text not null,
  home_flag text default '🏳️',
  away_flag text default '🏳️',
  match_date date not null,
  match_time time not null default '18:00:00',
  group_stage text default 'Group A',
  status text not null default 'upcoming' check (status in ('upcoming', 'live', 'finished')),
  home_score int,
  away_score int,
  created_at timestamptz default now()
);


-- 3. PREDICTIONS TABLE
create table public.predictions (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  match_id bigint references public.matches(id) on delete cascade not null,
  home_score int not null,
  away_score int not null,
  created_at timestamptz default now(),
  unique(user_id, match_id)
);


-- ============================================================
--  ROW LEVEL SECURITY (RLS)
-- ============================================================

alter table public.profiles enable row level security;
alter table public.matches enable row level security;
alter table public.predictions enable row level security;

-- Profiles: everyone can read, users can only update their own
create policy "Profiles are viewable by all authenticated users"
  on public.profiles for select using (auth.role() = 'authenticated');

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Profiles can be inserted by trigger"
  on public.profiles for insert with check (true);

-- Matches: everyone can read
create policy "Matches are public to authenticated users"
  on public.matches for select using (auth.role() = 'authenticated');

-- Admins can insert/update/delete matches
create policy "Admins can manage matches"
  on public.matches for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Predictions: users can read all (for leaderboard), insert/update own only
create policy "All authenticated can read predictions"
  on public.predictions for select using (auth.role() = 'authenticated');

create policy "Users can insert own predictions"
  on public.predictions for insert with check (auth.uid() = user_id);

create policy "Users can update own predictions only for upcoming matches"
  on public.predictions for update using (
    auth.uid() = user_id
    and exists (
      select 1 from public.matches
      where id = match_id and status = 'upcoming'
    )
  );


-- ============================================================
--  CREATE YOUR ADMIN ACCOUNT
--  After running this file, go to:
--  Authentication > Users > Invite User
--  Then run the line below replacing the email with yours
-- ============================================================

-- After creating your admin via the dashboard, run this:
-- update public.profiles set role = 'admin' where id = (
--   select id from auth.users where email = 'your-admin@email.com'
-- );


-- ============================================================
--  SAMPLE MATCHES (optional — delete if not needed)
-- ============================================================
insert into public.matches (home_team, away_team, home_flag, away_flag, match_date, match_time, group_stage, status)
values
  ('France', 'Germany', '🇫🇷', '🇩🇪', '2026-06-15', '18:00:00', 'Group A', 'upcoming'),
  ('Brazil', 'Argentina', '🇧🇷', '🇦🇷', '2026-06-16', '21:00:00', 'Group B', 'upcoming'),
  ('England', 'Spain', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', '🇪🇸', '2026-06-17', '18:00:00', 'Group C', 'upcoming'),
  ('Portugal', 'Italy', '🇵🇹', '🇮🇹', '2026-06-17', '21:00:00', 'Group D', 'upcoming');
