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
-- The /s/<code> short-link feature was removed — the userid URL
-- (/<username>) is the one short URL. Drop its table and public resolver.

drop function if exists public.resolve_short_link(text);
drop table if exists public.short_links;
-- CodeTrace PlacementIQ Phase 1-6 foundation

-- App roles for placement staff/students
create type placement_role as enum (
  'admin', 'tpo', 'faculty', 'interviewer', 'hr', 'student'
);

create table public.placement_user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null default '',
  full_name text not null default '',
  role placement_role not null default 'student',
  roll_number text,
  expertise text default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index placement_user_profiles_roll_unique
  on public.placement_user_profiles(roll_number)
  where roll_number is not null and roll_number <> '';

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_role text not null default '',
  action text not null,
  entity_type text not null default '',
  entity_id text not null default '',
  description text not null default '',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index audit_logs_action_idx on public.audit_logs(action);
create index audit_logs_created_idx on public.audit_logs(created_at desc);

-- Student profiles
create table public.student_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  roll_number text not null,
  full_name text not null,
  email text not null default '',
  phone text not null default '',
  branch text not null default '',
  batch text not null default '',
  cgpa numeric(4,2),
  active_backlogs int not null default 0,
  graduation_year int,
  placement_status text not null default 'NOT_STARTED',
  profile_completeness int not null default 0,
  readiness_score int not null default 0,
  readiness_status text not null default 'not_ready',
  risk_level text not null default 'medium',
  is_placement_eligible boolean not null default true,
  linkedin_url text not null default '',
  github_url text not null default '',
  portfolio_url text not null default '',
  skills_summary text not null default '',
  career_interest text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index student_profiles_roll_idx on public.student_profiles(roll_number);
create index student_profiles_branch_batch_idx on public.student_profiles(branch, batch);

-- Resumes (storage path only, no raw file in DB)
create table public.student_resumes (
  id uuid primary key default gen_random_uuid(),
  student_profile_id uuid not null references public.student_profiles(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  file_name text not null,
  storage_path text not null,
  mime_type text not null default 'application/pdf',
  file_size bigint not null default 0,
  is_active boolean not null default true,
  review_status text not null default 'pending',
  resume_score int not null default 50,
  ats_friendly boolean not null default false,
  reviewer_comments text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index student_resumes_profile_idx on public.student_resumes(student_profile_id);

-- Tech stack
create table public.tech_skills (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_key text not null unique,
  category text not null default 'other',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.student_tech_skills (
  id uuid primary key default gen_random_uuid(),
  student_profile_id uuid not null references public.student_profiles(id) on delete cascade,
  tech_skill_id uuid not null references public.tech_skills(id) on delete cascade,
  proficiency_level text not null default 'beginner',
  verification_status text not null default 'self_declared',
  created_at timestamptz not null default now(),
  unique(student_profile_id, tech_skill_id)
);

create table public.student_role_interests (
  id uuid primary key default gen_random_uuid(),
  student_profile_id uuid not null references public.student_profiles(id) on delete cascade,
  role_name text not null,
  interest_level text not null default 'medium',
  readiness_level text not null default 'beginner',
  created_at timestamptz not null default now(),
  unique(student_profile_id, role_name)
);

-- Readiness
create table public.readiness_snapshots (
  id uuid primary key default gen_random_uuid(),
  student_profile_id uuid not null references public.student_profiles(id) on delete cascade,
  overall_score int not null default 0,
  technical_score int not null default 0,
  communication_score int not null default 0,
  resume_score int not null default 0,
  tech_stack_score int not null default 0,
  profile_score int not null default 0,
  academic_score int not null default 0,
  risk_level text not null default 'medium',
  readiness_status text not null default 'not_ready',
  score_breakdown jsonb not null default '{}',
  calculated_at timestamptz not null default now()
);

create index readiness_snapshots_profile_idx on public.readiness_snapshots(student_profile_id, calculated_at desc);

-- Companies & matching
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  industry text not null default '',
  location text not null default '',
  contact_email text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.company_requirements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  role_title text not null,
  eligible_branches text[] not null default '{}',
  eligible_batches text[] not null default '{}',
  min_cgpa numeric(4,2),
  required_skills text[] not null default '{}',
  preferred_skills text[] not null default '{}',
  min_readiness_score int,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.company_match_snapshots (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  requirement_id uuid not null references public.company_requirements(id) on delete cascade,
  student_profile_id uuid not null references public.student_profiles(id) on delete cascade,
  match_score int not null default 0,
  match_status text not null default 'not_fit',
  eligibility_status text not null default 'not_eligible',
  matched_skills text[] not null default '{}',
  missing_required_skills text[] not null default '{}',
  calculated_at timestamptz not null default now(),
  unique(requirement_id, student_profile_id)
);

-- Interviews (placement mock interviews)
create table public.placement_interviews (
  id uuid primary key default gen_random_uuid(),
  roll_number text not null,
  student_name text not null,
  technical_score numeric(4,1) not null default 0,
  communication_score numeric(4,1) not null default 0,
  overall_score numeric(4,1) not null default 0,
  level text not null default 'Average',
  interviewer_id uuid references auth.users(id) on delete set null,
  remarks text not null default '',
  created_at timestamptz not null default now()
);

create index placement_interviews_roll_idx on public.placement_interviews(roll_number);

-- Resume books
create table public.resume_book_snapshots (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  filters jsonb not null default '{}',
  total_students int not null default 0,
  book_type text not null default 'readiness_based',
  status text not null default 'draft',
  share_token text,
  is_shareable boolean not null default false,
  expires_at timestamptz,
  share_settings jsonb not null default '{"allowResumeDownload":true,"allowExternalLinks":true}',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index resume_book_share_token_idx
  on public.resume_book_snapshots(share_token)
  where share_token is not null;

create table public.resume_book_student_snapshots (
  id uuid primary key default gen_random_uuid(),
  resume_book_id uuid not null references public.resume_book_snapshots(id) on delete cascade,
  student_profile_id uuid not null references public.student_profiles(id) on delete cascade,
  order_index int not null default 0,
  snapshot jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index resume_book_students_book_order_idx
  on public.resume_book_student_snapshots(resume_book_id, order_index);

-- Updated_at triggers
create trigger placement_user_profiles_set_updated_at
  before update on public.placement_user_profiles
  for each row execute function public.set_updated_at();

create trigger student_profiles_set_updated_at
  before update on public.student_profiles
  for each row execute function public.set_updated_at();

create trigger student_resumes_set_updated_at
  before update on public.student_resumes
  for each row execute function public.set_updated_at();

create trigger companies_set_updated_at
  before update on public.companies
  for each row execute function public.set_updated_at();

create trigger company_requirements_set_updated_at
  before update on public.company_requirements
  for each row execute function public.set_updated_at();

create trigger resume_book_snapshots_set_updated_at
  before update on public.resume_book_snapshots
  for each row execute function public.set_updated_at();

-- Role helpers
create or replace function public.current_app_role()
returns placement_role
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role from public.placement_user_profiles where id = auth.uid()),
    'student'::placement_role
  );
$$;

create or replace function public.has_placement_permission(perm text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  r placement_role;
begin
  r := public.current_app_role();
  if r = 'admin' then return true; end if;
  case perm
    when 'students:view' then return r in ('tpo','faculty','interviewer');
    when 'students:export' then return r = 'tpo';
    when 'reports:view' then return r in ('tpo','faculty');
    when 'reports:export' then return r = 'tpo';
    when 'companies:manage' then return r = 'tpo';
    when 'matching:run' then return r = 'tpo';
    else return false;
  end case;
end;
$$;

-- RLS
alter table public.placement_user_profiles enable row level security;
alter table public.audit_logs enable row level security;
alter table public.student_profiles enable row level security;
alter table public.student_resumes enable row level security;
alter table public.tech_skills enable row level security;
alter table public.student_tech_skills enable row level security;
alter table public.student_role_interests enable row level security;
alter table public.readiness_snapshots enable row level security;
alter table public.companies enable row level security;
alter table public.company_requirements enable row level security;
alter table public.company_match_snapshots enable row level security;
alter table public.placement_interviews enable row level security;
alter table public.resume_book_snapshots enable row level security;
alter table public.resume_book_student_snapshots enable row level security;

-- placement_user_profiles: users read own; staff read all
create policy "users read own placement profile"
  on public.placement_user_profiles for select
  using (auth.uid() = id or public.has_placement_permission('students:view'));

create policy "admin tpo manage placement profiles"
  on public.placement_user_profiles for all
  using (public.current_app_role() in ('admin','tpo'))
  with check (public.current_app_role() in ('admin','tpo'));

-- audit: staff insert/read
create policy "staff read audit logs"
  on public.audit_logs for select
  using (public.has_placement_permission('students:view'));

create policy "staff insert audit logs"
  on public.audit_logs for insert
  with check (auth.uid() is not null);

-- student_profiles
create policy "staff view students"
  on public.student_profiles for select
  using (
    public.has_placement_permission('students:view')
    or user_id = auth.uid()
  );

create policy "tpo admin manage students"
  on public.student_profiles for all
  using (public.current_app_role() in ('admin','tpo'))
  with check (public.current_app_role() in ('admin','tpo'));

create policy "students update own profile"
  on public.student_profiles for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- student_resumes
create policy "staff view resumes"
  on public.student_resumes for select
  using (public.has_placement_permission('students:view') or user_id = auth.uid());

create policy "tpo admin manage resumes"
  on public.student_resumes for all
  using (public.current_app_role() in ('admin','tpo'))
  with check (public.current_app_role() in ('admin','tpo'));

-- tech skills catalog readable by staff
create policy "staff view tech skills"
  on public.tech_skills for select using (public.has_placement_permission('students:view'));

create policy "tpo admin manage tech skills"
  on public.tech_skills for all
  using (public.current_app_role() in ('admin','tpo'))
  with check (public.current_app_role() in ('admin','tpo'));

create policy "staff view student tech skills"
  on public.student_tech_skills for select using (public.has_placement_permission('students:view'));

create policy "tpo admin manage student tech skills"
  on public.student_tech_skills for all
  using (public.current_app_role() in ('admin','tpo'))
  with check (public.current_app_role() in ('admin','tpo'));

create policy "staff view role interests"
  on public.student_role_interests for select using (public.has_placement_permission('students:view'));

create policy "tpo admin manage role interests"
  on public.student_role_interests for all
  using (public.current_app_role() in ('admin','tpo'))
  with check (public.current_app_role() in ('admin','tpo'));

-- readiness
create policy "staff view readiness"
  on public.readiness_snapshots for select using (public.has_placement_permission('students:view'));

create policy "tpo admin manage readiness"
  on public.readiness_snapshots for all
  using (public.current_app_role() in ('admin','tpo'))
  with check (public.current_app_role() in ('admin','tpo'));

-- companies
create policy "staff view companies"
  on public.companies for select using (public.has_placement_permission('students:view'));

create policy "tpo admin manage companies"
  on public.companies for all
  using (public.current_app_role() in ('admin','tpo'))
  with check (public.current_app_role() in ('admin','tpo'));

create policy "staff view requirements"
  on public.company_requirements for select using (public.has_placement_permission('students:view'));

create policy "tpo admin manage requirements"
  on public.company_requirements for all
  using (public.current_app_role() in ('admin','tpo'))
  with check (public.current_app_role() in ('admin','tpo'));

create policy "staff view matches"
  on public.company_match_snapshots for select using (public.has_placement_permission('students:view'));

create policy "tpo admin manage matches"
  on public.company_match_snapshots for all
  using (public.current_app_role() in ('admin','tpo'))
  with check (public.current_app_role() in ('admin','tpo'));

-- interviews
create policy "staff view interviews"
  on public.placement_interviews for select using (public.has_placement_permission('students:view'));

create policy "staff manage interviews"
  on public.placement_interviews for all
  using (public.current_app_role() in ('admin','tpo','interviewer'))
  with check (public.current_app_role() in ('admin','tpo','interviewer'));

-- resume books (private)
create policy "staff view resume books"
  on public.resume_book_snapshots for select
  using (public.has_placement_permission('students:view'));

create policy "tpo admin manage resume books"
  on public.resume_book_snapshots for all
  using (public.current_app_role() in ('admin','tpo'))
  with check (public.current_app_role() in ('admin','tpo'));

create policy "staff view book snapshots"
  on public.resume_book_student_snapshots for select
  using (public.has_placement_permission('students:view'));

create policy "tpo admin manage book snapshots"
  on public.resume_book_student_snapshots for all
  using (public.current_app_role() in ('admin','tpo'))
  with check (public.current_app_role() in ('admin','tpo'));

-- Public resume book access via RPC (token-safe, no direct anon table access)
create or replace function public.get_public_resume_book(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  b record;
begin
  if p_token is null or length(p_token) < 48 or p_token !~ '^[a-f0-9]{48,64}$' then
    return null;
  end if;
  select * into b from public.resume_book_snapshots
  where share_token = p_token and is_shareable = true and status = 'generated';
  if not found then return null; end if;
  if b.expires_at is not null and b.expires_at < now() then
    return jsonb_build_object('expired', true);
  end if;
  return jsonb_build_object(
    'id', b.id,
    'title', b.title,
    'description', b.description,
    'totalStudents', b.total_students,
    'bookType', b.book_type,
    'shareSettings', b.share_settings,
    'expiresAt', b.expires_at
  );
end;
$$;

grant execute on function public.get_public_resume_book(text) to anon, authenticated;

create or replace function public.get_public_resume_book_students(
  p_token text,
  p_page int default 1,
  p_limit int default 10
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  b record;
  lim int;
  off int;
  total int;
  rows jsonb;
  settings jsonb;
begin
  if p_token is null or length(p_token) < 48 then return null; end if;
  select * into b from public.resume_book_snapshots
  where share_token = p_token and is_shareable = true and status = 'generated';
  if not found then return null; end if;
  if b.expires_at is not null and b.expires_at < now() then
    return jsonb_build_object('expired', true);
  end if;
  settings := b.share_settings;
  lim := least(greatest(coalesce(p_limit, 10), 1), 50);
  off := greatest((coalesce(p_page, 1) - 1) * lim, 0);
  select count(*) into total from public.resume_book_student_snapshots where resume_book_id = b.id;
  select coalesce(jsonb_agg(
    case
      when (settings->>'allowExternalLinks')::boolean = false then
        (s.snapshot - 'linkedinUrl' - 'githubUrl' - 'portfolioUrl' - 'email' - 'phone' - 'resumeDownloadUrl' - 'filePath')
      else
        (s.snapshot - 'email' - 'phone' - 'resumeDownloadUrl' - 'filePath')
    end
    order by s.order_index
  ), '[]'::jsonb) into rows
  from (
    select * from public.resume_book_student_snapshots
    where resume_book_id = b.id
    order by order_index
    offset off limit lim
  ) s;
  return jsonb_build_object(
    'students', rows,
    'pagination', jsonb_build_object(
      'page', coalesce(p_page, 1),
      'limit', lim,
      'total', total,
      'pages', ceil(total::numeric / lim)
    )
  );
end;
$$;

grant execute on function public.get_public_resume_book_students(text, int, int) to anon, authenticated;

-- ===== Faculty student manage (training program bulk upload) =====
DROP POLICY IF EXISTS "tpo admin manage students" ON public.student_profiles;
DROP POLICY IF EXISTS "staff manage students" ON public.student_profiles;

CREATE POLICY "staff manage students"
  ON public.student_profiles
  FOR ALL
  USING (public.current_app_role() IN ('admin', 'tpo', 'faculty'))
  WITH CHECK (public.current_app_role() IN ('admin', 'tpo', 'faculty'));

CREATE OR REPLACE FUNCTION public.has_placement_permission(perm text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r placement_role;
BEGIN
  r := public.current_app_role();
  IF r = 'admin' THEN RETURN true; END IF;
  CASE perm
    WHEN 'students:view' THEN RETURN r IN ('tpo', 'faculty', 'interviewer');
    WHEN 'students:create' THEN RETURN r IN ('tpo', 'faculty');
    WHEN 'students:update' THEN RETURN r IN ('tpo', 'faculty');
    WHEN 'students:import' THEN RETURN r IN ('tpo', 'faculty');
    WHEN 'students:export' THEN RETURN r = 'tpo';
    WHEN 'reports:view' THEN RETURN r IN ('tpo', 'faculty');
    WHEN 'reports:export' THEN RETURN r = 'tpo';
    WHEN 'companies:manage' THEN RETURN r = 'tpo';
    WHEN 'matching:run' THEN RETURN r = 'tpo';
    ELSE RETURN false;
  END CASE;
END;
$$;
