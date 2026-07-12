# CodeTrace Placement (Phases 1–6)

PlacementIQ-style placement operations live **inside CodeTrace only**, backed by **Supabase/Postgres + RLS**. There is no dependency on `student-tracer-main`.

## What is included

| Phase | Module |
|-------|--------|
| 1 | Roles, permissions, audit logs, RLS foundation |
| 2 | Student Tracker |
| 3 | Resumes, Tech Stack, Readiness |
| 4 | Companies, Requirements, Matching |
| 5 | Resume Books + public share links |
| 5.1 | Public share hardening (token RPC, sanitization, no-index) |
| 6 | Reports + Management Summary + CSV export |

## Stack

- **Frontend:** React 19, TanStack Router, TanStack Query, Tailwind (light `.placement-theme`)
- **Backend:** Supabase Auth + Postgres + Storage + RLS + RPC
- **Coding stats:** Existing CodeTrace platform APIs (unchanged)

## Setup

See **`docs/SUPABASE_SETUP.md`** for full hosted Supabase setup (recommended without Docker).

Quick path:

1. Copy env:
   ```bash
   cp .env.example .env.local
   ```
2. Set hosted `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.
3. Link and push migrations:
   ```bash
   npm run supabase:login
   npm run supabase:link
   npm run supabase:push
   ```
4. Create demo users:
   ```bash
   npm run supabase:seed-users
   ```
   Or all-in-one: `npm run supabase:setup-hosted`
5. Run dev:
   ```bash
   npm run dev
   ```

## Routes

| Role | Entry |
|------|-------|
| Admin | `/admin/placement/students` |
| TPO | `/tpo/placement/students` |
| Faculty | `/faculty/placement/students` |
| Interviewer | `/interviewer/placement/students` |
| Student | `/student/placement/profile` |
| Public resume book | `/public/resume-books/:token` |

Coding dashboard routes (`/app`, `/github/:user`, etc.) are unchanged.

## Permissions

| Role | View students | Manage | Reports | Export |
|------|---------------|--------|---------|--------|
| Admin | Yes | Yes | Yes | Yes |
| TPO | Yes | Yes | Yes | Yes |
| Faculty | Yes | No | Yes | No |
| Interviewer | Yes | No | No | No |
| HR | No | No | No | No |
| Student | Own profile | No | No | No |

## Resume book public safety

- 64-char hex share tokens only
- Expired/archived/disabled links blocked via RPC
- Public payloads never include email, phone, file paths, or internal IDs
- `allowResumeDownload` and `allowExternalLinks` respected
- `X-Robots-Tag` / meta noindex on public pages

## Reports

Nine report types via `/admin/placement/reports` or `/tpo/placement/reports`:

- `student_tracker`, `resume_readiness`, `tech_skill_gap`, `placement_readiness`
- `company_matching`, `interview_performance`, `coding_profile`, `resume_book`
- `management_summary` (also at `/placement/management-summary`)

## Storage

Resume uploads use Supabase Storage bucket `resumes`. Create the bucket in Supabase Dashboard with appropriate RLS policies for staff upload and controlled download.

## Demo seed

- SQL: `scripts/seed-placement-demo.sql` — sample companies, tech skills, and student profiles
- Helper: `node scripts/seed-placement-demo.mjs` (requires Supabase CLI)

Auth users must be created separately in Supabase Auth, then linked via `placement_user_profiles.id = auth.users.id`.

## Warning

Do not share resume book public links outside authorized stakeholders.
