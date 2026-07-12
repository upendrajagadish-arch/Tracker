-- Run in Supabase SQL editor if student_coding_snapshots table is missing.

create table if not exists public.student_coding_snapshots (
  id uuid primary key default gen_random_uuid(),
  student_profile_id uuid not null references public.student_profiles(id) on delete cascade,
  platform_handles jsonb not null default '{}'::jsonb,
  cards jsonb not null default '[]'::jsonb,
  total_solved integer not null default 0,
  linked_count integer not null default 0,
  fetch_status text not null default 'pending'
    check (fetch_status in ('pending', 'success', 'partial', 'failed', 'no_handles')),
  fetch_error text,
  fetched_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_coding_snapshots_student_unique unique (student_profile_id)
);

create index if not exists student_coding_snapshots_fetched_at_idx
  on public.student_coding_snapshots(fetched_at desc);

drop trigger if exists student_coding_snapshots_set_updated_at on public.student_coding_snapshots;
create trigger student_coding_snapshots_set_updated_at
  before update on public.student_coding_snapshots
  for each row execute function public.set_updated_at();

alter table public.student_coding_snapshots enable row level security;

drop policy if exists "staff view student coding snapshots" on public.student_coding_snapshots;
create policy "staff view student coding snapshots"
  on public.student_coding_snapshots for select
  using (public.has_placement_permission('students:view'));

drop policy if exists "staff manage student coding snapshots" on public.student_coding_snapshots;
create policy "staff manage student coding snapshots"
  on public.student_coding_snapshots for all
  using (public.has_placement_permission('students:update'))
  with check (public.has_placement_permission('students:update'));
