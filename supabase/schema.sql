-- 在 Supabase 的 SQL Editor 整段執行一次。

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists profiles_username_lower on public.profiles (lower(username));

create table if not exists public.scores (
  user_id uuid not null references public.profiles (id) on delete cascade,
  game_id text not null,
  raw int not null,
  points int not null,
  at timestamptz not null default now(),
  primary key (user_id, game_id)
);

create table if not exists public.ratings (
  user_id uuid not null references public.profiles (id) on delete cascade,
  game_id text not null,
  stars numeric not null,
  at timestamptz not null default now(),
  primary key (user_id, game_id)
);

create table if not exists public.pets (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  species text,
  xp int not null default 0,
  day text not null default '',
  day_xp int not null default 0
);

alter table public.profiles enable row level security;
alter table public.scores enable row level security;
alter table public.ratings enable row level security;
alter table public.pets enable row level security;

create policy "profiles read" on public.profiles for select using (true);
create policy "profiles insert self" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles update self" on public.profiles for update using (auth.uid() = id);

create policy "scores read" on public.scores for select using (true);
create policy "scores insert self" on public.scores for insert with check (auth.uid() = user_id);
create policy "scores update self" on public.scores for update using (auth.uid() = user_id);

create policy "ratings read" on public.ratings for select using (true);
create policy "ratings insert self" on public.ratings for insert with check (auth.uid() = user_id);
create policy "ratings update self" on public.ratings for update using (auth.uid() = user_id);

create policy "pets read self" on public.pets for select using (auth.uid() = user_id);
create policy "pets insert self" on public.pets for insert with check (auth.uid() = user_id);
create policy "pets update self" on public.pets for update using (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
