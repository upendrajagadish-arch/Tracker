create table public.public_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint public_profiles_username_format check (username ~ '^[a-z0-9][a-z0-9_-]{2,29}$'),
  constraint public_profiles_username_reserved check (username not in (
    'api', 'app', 'auth', 'codechef', 'codeforces', 'dashboard', 'gfg', 'github',
    'hackerrank', 'login', 'logout', 'me', 'profile', 'settings', 'u', 'username'
  ))
);

create table public.profile_configs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Default',
  is_primary boolean not null default true,
  is_public boolean not null default true,
  config jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profile_configs_config_object check (jsonb_typeof(config) = 'object')
);

create unique index profile_configs_one_primary_per_user
  on public.profile_configs(user_id)
  where is_primary;

create index profile_configs_public_lookup
  on public.profile_configs(user_id)
  where is_public and is_primary;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger public_profiles_set_updated_at
  before update on public.public_profiles
  for each row execute function public.set_updated_at();

create trigger profile_configs_set_updated_at
  before update on public.profile_configs
  for each row execute function public.set_updated_at();

alter table public.public_profiles enable row level security;
alter table public.profile_configs enable row level security;

create policy "public profiles are readable"
  on public.public_profiles
  for select
  using (true);

create policy "users insert their profile"
  on public.public_profiles
  for insert
  with check (auth.uid() = id);

create policy "users update their profile"
  on public.public_profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "users delete their profile"
  on public.public_profiles
  for delete
  using (auth.uid() = id);

create policy "public primary configs are readable"
  on public.profile_configs
  for select
  using (is_public and is_primary);

create policy "users read their configs"
  on public.profile_configs
  for select
  using (auth.uid() = user_id);

create policy "users insert their configs"
  on public.profile_configs
  for insert
  with check (auth.uid() = user_id);

create policy "users update their configs"
  on public.profile_configs
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users delete their configs"
  on public.profile_configs
  for delete
  using (auth.uid() = user_id);
