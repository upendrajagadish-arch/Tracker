-- Short profile URLs: a signed-in user mints an id (custom or generated) that
-- maps to a platform-accounts config, served at /s/<code>.

create table public.short_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  code text not null unique,
  label text,
  config jsonb not null,
  clicks bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint short_links_code_format check (code ~ '^[a-z0-9][a-z0-9_-]{2,31}$'),
  constraint short_links_config_object check (jsonb_typeof(config) = 'object')
);

create index short_links_owner_lookup on public.short_links(user_id);

create trigger short_links_set_updated_at
  before update on public.short_links
  for each row execute function public.set_updated_at();

alter table public.short_links enable row level security;

-- Owners manage their links. There is deliberately no public SELECT policy:
-- anonymous resolution goes through resolve_short_link() below, so codes can
-- only be dereferenced one at a time, never listed.
create policy "users read their short links"
  on public.short_links for select
  using (auth.uid() = user_id);

create policy "users insert their short links"
  on public.short_links for insert
  with check (auth.uid() = user_id);

create policy "users update their short links"
  on public.short_links for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users delete their short links"
  on public.short_links for delete
  using (auth.uid() = user_id);

-- Public resolver: exact-code lookup that also counts the visit.
create or replace function public.resolve_short_link(link_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  update public.short_links
     set clicks = clicks + 1
   where code = lower(trim(link_code))
   returning jsonb_build_object('code', code, 'label', label, 'config', config)
    into result;
  return result;
end;
$$;

grant execute on function public.resolve_short_link(text) to anon, authenticated;

-- Widen the reserved-username list so profile handles can't shadow app routes
-- (the original list missed leetcode/tuf and the new short-link routes).
alter table public.public_profiles drop constraint public_profiles_username_reserved;
alter table public.public_profiles add constraint public_profiles_username_reserved check (username not in (
  'account', 'api', 'app', 'auth', 'codechef', 'codeforces', 'dashboard', 'docs',
  'gfg', 'github', 'hackerrank', 'leetcode', 'link', 'links', 'login', 'logout',
  'me', 'onboarding', 'profile', 's', 'settings', 'share', 'tuf', 'u', 'username'
));
