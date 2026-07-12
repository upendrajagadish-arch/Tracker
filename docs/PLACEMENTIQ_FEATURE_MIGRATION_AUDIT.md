# PlacementIQ Feature Migration Audit

**Phase 0 — Source & Target Audit (Combined)**  
**Date:** 2026-07-11  
**Status:** Audit complete — **no implementation**

| App | Path | Stack |
|-----|------|-------|
| **Source (PlacementIQ)** | `c:\Users\user\Desktop\Tracker` | Next.js 15 App Router, Prisma, PostgreSQL |
| **Coding reference** | `c:\Users\user\Desktop\CodeTrace-main` | Vite + React 19, Supabase, hosted stat APIs |
| **Target** | `c:\Users\user\Desktop\student-tracer-main` | React + Vite, Express, MongoDB/Mongoose, JWT |

---

## Executive Summary

PlacementIQ (source) is a full placement operating system with four institutional roles, 30 Prisma models, 60+ permissions, and deep modules for student tracking, readiness, company matching, HR sharing, reports, jobs, and experimental CodeTrace hosted sync.

The target app (`student-tracer-main`) is a **different stack** already branded PlacementIQ in the UI. It runs **Express + Mongoose + JWT** with three roles (`admin`, `interviewer`, `student`). It already covers **mock interview tracking**, **student bulk import**, **placement status**, and a **substantial coding profile module** (8 platform adapters, scoring engine, `readinessScore`).

**Migration strategy:** Rebuild PlacementIQ features inside the target's conventions. Do **not** copy the Tracker folder wholesale. Do **not** replace JWT auth, React Router, or MongoDB unless a later phase explicitly requires it. Extend roles gradually; protect students from placement-team controls.

**Phase 0 acceptance:** Source audited ✅ | Target audited ✅ | Combined document complete ✅ | No code changes ✅

---

## 1. Source PlacementIQ Summary

*Reference: approved source audit of `c:\Users\user\Desktop\Tracker`.*

### 1.1 Framework & architecture

| Item | Value |
|------|-------|
| Framework | Next.js 15.1.3 (App Router), React 19, TypeScript |
| ORM | Prisma 6.1 |
| Database | PostgreSQL (Supabase in production) |
| Styling | Tailwind 3.4, custom UI (`src/components/ui/`), dark coding-intelligence panels |
| Path alias | `@/*` → `src/*` |

**Top-level structure**

```
Tracker/
├── src/app/          # App Router pages + ~98 API route handlers
│   ├── admin/        # SUPER_ADMIN
│   ├── tpo/          # TPO_ADMIN
│   ├── faculty/      # FACULTY
│   └── hr/           # HR
├── src/components/   # Feature UI (students, resumes, companies, hr, coding-intelligence, …)
├── src/lib/services/ # 36 business-logic modules
├── src/lib/queue/    # in-memory + Redis/BullMQ
├── src/workers/      # BullMQ consumer
├── prisma/           # schema (30 models) + migrations + seed
├── docs/             # 12 architecture/ops docs
└── uploads/          # Local resume storage
```

**Server/client pattern:** Thin `page.tsx` → server content loader (`src/lib/pages/*`) → client component (`*Client.tsx`).

### 1.2 Authentication & session

| Concern | Implementation |
|---------|----------------|
| Login | `POST /api/auth/login` — email + password |
| Password | bcrypt, 12 rounds (`src/lib/password.ts`) |
| Session | HMAC cookie `placementiq_session` (stateless, 7-day) |
| Core files | `src/lib/auth.ts`, `src/lib/session-token.ts` |
| Middleware | Security headers only — no auth redirect in Next middleware |
| Route protection | Role layouts call `requireRole()`; APIs use `getSession()` + `hasPermission()` |

### 1.3 Roles & permissions

**Primary roles** (`UserRole` in `prisma/schema.prisma`):

| Role | URL prefix | Purpose |
|------|------------|---------|
| `SUPER_ADMIN` | `/admin` | Full system, audit, branding, integrations manage |
| `TPO_ADMIN` | `/tpo` | Placement operations, matching, sharing |
| `FACULTY` | `/faculty` | Student view, skills, readiness (limited write) |
| `HR` | `/hr` | Talent Room only — HR-safe shared profiles |

**HR sub-roles:** `HR_VIEWER`, `HR_RECRUITER`, `HR_MANAGER` via `HRCompanyAccess`.

**Permissions:** 60+ granular permissions in `src/lib/permissions.ts` (e.g. `students:import`, `integrations:manage`, `talent:view`, `audit:view`).

**HR-safe logic:** `getHrSafeEvidenceSummary()` hides internal skill gaps; `getHrSharedStudentDetail()` scopes by company share.

### 1.4 Database schema (Prisma — 30 models)

| Model | Domain |
|-------|--------|
| `User` | Auth, roles, audit relations |
| `Student` | Core student tracker (separate from User) |
| `Resume`, `ResumeInsight` | Resume management + AI insights |
| `AuditLog` | SUPER_ADMIN audit trail |
| `TechSkill`, `StudentTechSkill`, `StudentRoleInterest` | Tech stack tracking |
| `ReadinessSnapshot` | Readiness scoring history |
| `Company`, `CompanyRequirement`, `JDParseLog`, `CompanyMatchSnapshot` | Company matching |
| `HRCompanyAccess`, `SharedStudentProfile` | HR Talent Room |
| `PlacementPassportSnapshot` | Placement passport |
| `PlacementDrive`, `StudentPlacementStage` | Drive pipeline |
| `GitHubProfile`, `GitHubRepository` | GitHub evidence |
| `CodingPlatform`, `CodingPlatformIntegration`, `StudentCodingProfile` | Coding intelligence |
| `SkillEvidenceSnapshot` | Skill evidence graph |
| `Job` | Jobs / queue |
| `AppSettings` | Branding / institution settings |

### 1.5 Key business logic (source file paths)

| Domain | Primary files |
|--------|---------------|
| Permissions | `src/lib/permissions.ts` |
| Readiness scoring | `src/lib/services/readiness.ts`, `src/lib/readiness-constants.ts` |
| Company matching | `src/lib/services/company-matching.ts`, `src/lib/company-constants.ts` |
| HR sharing | `src/lib/services/student-sharing.ts`, `src/lib/services/hr-access.ts` |
| Placement passport | `src/lib/services/placement-passport.ts` |
| Reports | `src/lib/services/reports.ts`, `src/lib/services/report-export.ts` |
| Jobs / queue | `src/lib/services/jobs.ts`, `src/lib/queue/*`, `src/workers/job-worker.ts` |
| Skill evidence | `src/lib/services/skill-evidence.ts` |
| CodeTrace sync | `src/lib/services/coding-sync/codetraceStudentSync.ts`, `codetraceBulkSync.ts`, `providers/codetraceHosted.ts` |
| AI (JD + resume) | `src/lib/services/jd-parser.ts`, `resume-insights.ts`, `ai-provider.ts` |
| GitHub evidence | `src/lib/services/github.ts` |

**Readiness formula (summary):** Weighted sum — Technical 25%, Communication 20%, Resume 20%, Tech Stack 15%, Profile 10%, Academic 10%. Status thresholds from ≥85 Highly Ready down to Not Ready. Risk escalates from gaps (no resume, low scores, backlogs).

**Company fit score (summary):** Eligibility hard filters first; then weighted components — eligibility base 30, required skills 25, preferred 10, readiness 15, technical 10, communication 5, resume 5. Ineligible capped at 44.

### 1.6 API routes (representative)

| Domain | Route prefix |
|--------|--------------|
| Auth | `/api/auth/login`, `/api/auth/logout` |
| Students | `/api/students`, import/export, per-student sub-resources |
| Resumes | `/api/resumes`, insights |
| Tech stack | `/api/tech-skills`, `/api/tech-stack` |
| Readiness | `/api/readiness`, `/api/students/[id]/readiness/recalculate` |
| Companies | `/api/companies`, `/api/company-requirements`, match, parse-jd |
| HR | `/api/hr/dashboard`, `/api/hr/talent-room`, `/api/shared-students` |
| Passport | `/api/students/[id]/passport` |
| Reports | `/api/reports`, `/api/analytics/export` |
| Coding | `/api/coding-profiles`, `/api/coding-platforms` |
| Integrations | `/api/integrations/codetrace/test-sync`, `sync-student`, `bulk-sync` |
| Jobs | `/api/jobs`, `/api/jobs/queue-health` |
| Audit | `/api/audit-logs` (SUPER_ADMIN) |
| Settings | `/api/settings/branding` |

### 1.7 Jobs system

**Job types:** `BULK_READINESS_RECALC`, `COMPANY_MATCHING`, `STUDENT_IMPORT`, `STUDENT_EXPORT`, `REPORT_EXPORT`, `GITHUB_SYNC`, `CODING_SYNC`, `CODETRACE_BULK_SYNC`, `SKILL_EVIDENCE_REFRESH`, etc.

**Queue:** `QUEUE_DRIVER=in_memory` (dev) or `redis` + `npm run worker` (prod, BullMQ).

### 1.8 CodeTrace experimental hosted sync

- Platforms: LeetCode, CodeChef, HackerRank, GFG, TUF
- Gated by `CODETRACE_EXPERIMENTAL_SYNC_ENABLED`
- Labeled **"Experimental Hosted Sync"** in UI
- Preserves prior metrics on failure (`preserveOnZero`, `syncStatus=FAILED`)
- Duplicate job guard per platform for bulk sync
- Reference implementation: `c:\Users\user\Desktop\CodeTrace-main` (hosted stat APIs, unified client)

### 1.9 Source documentation

| Doc | Topic |
|-----|-------|
| `docs/CODING_PLATFORM_SYNC.md` | Sync architecture |
| `docs/JOBS_AND_QUEUE.md` | Jobs/queue |
| `docs/INTEGRATIONS_TAB.md` | Integrations hub |
| `docs/CODETRACE_REFERENCE_AUDIT.md` | CodeTrace audit |

---

## 2. Target Application Structure

*Audited: `c:\Users\user\Desktop\student-tracer-main`.*

### 2.1 Framework & architecture

| Item | Value |
|------|-------|
| Backend | Node.js ≥18, Express 4, CommonJS |
| Database | MongoDB (Mongoose 8); optional embedded memory DB for dev |
| Frontend | React 18, Vite 5, React Router v6, Tailwind 3 |
| Auth | JWT (`jsonwebtoken`), Bearer token in `localStorage` |
| Charts | Recharts 2.12 |
| Deploy | Docker Compose (Mongo + Redis); Vercel monorepo (`vercel.json`) |
| CI | `.github/workflows/ci.yml` — backend tests + frontend build |

**Top-level structure**

```
student-tracer-main/
├── backend/src/
│   ├── server.js, createApp.js
│   ├── routes/          # 6 route modules
│   ├── controllers/     # 7 controllers
│   ├── models/          # 8 Mongoose models
│   ├── middleware/      # auth, validators, requireDb, codingRateLimit
│   ├── coding/          # adapters (8 platforms), services, cron scheduler
│   └── seed/
├── frontend/src/
│   ├── App.jsx          # React Router
│   ├── pages/           # 7 pages
│   ├── components/      # Layout, PrivateRoute, coding/*
│   ├── context/AuthContext.jsx
│   └── api/client.js, coding.js
├── docs/CODING_PROFILE_MODULE.md
└── docker-compose.yml
```

### 2.2 Frontend

| Item | Details |
|------|---------|
| Entry | `frontend/src/main.jsx` — `BrowserRouter` + `AuthProvider` |
| Routing | Declarative `Routes`/`Route` in `frontend/src/App.jsx` |
| State | No Redux/Zustand/React Query — local state + `AuthContext` |
| API client | `frontend/src/api/client.js` — fetch wrapper, JWT header |
| Dev proxy | `/api` → `http://127.0.0.1:5000` (`vite.config.js`) |
| UI library | **None** — custom Tailwind (`.btn`, `.card`, `.input` in `index.css`) |
| Design | DM Sans, `brand-*` sky-blue palette, light gradient shell |

**Current routes**

| Path | Component | Role guard |
|------|-----------|------------|
| `/login` | `pages/Login.jsx` | Public |
| `/register` | `pages/Register.jsx` | Public |
| `/` | `HomeRedirect` | Auth → role home |
| `/admin` | `pages/AdminDashboard.jsx` | `admin` |
| `/interviewer` | `pages/InterviewerDashboard.jsx` | `interviewer` |
| `/student` | `pages/StudentDashboard.jsx` | `student` |
| `/student/coding` | `pages/CodingProfile.jsx` | `student`, `admin` |
| `/admin/coding` | `pages/CodingAdmin.jsx` | `admin` |

**Route guard:** `frontend/src/components/PrivateRoute.jsx` — redirect to `/login` if unauthenticated; redirect to `/` if role not in allowed list.

**Navigation:** `frontend/src/components/Layout.jsx` — role-aware header links (coding profile for student+admin; coding analytics for admin only).

### 2.3 Backend — Express setup

| File | Role |
|------|------|
| `backend/src/server.js` | Dev entry: listen :5000, connect MongoDB, seed, start coding scheduler |
| `backend/src/createApp.js` | App factory: CORS, JSON body, route mounting, error handler |
| `backend/api/[...all].js` | Vercel serverless entry |

**Route mounting** (`createApp.js`):

```
/api/health          (no DB required)
/api/auth
/api/interviews
/api/analytics
/api/export
/api/students
/api/coding
```

All `/api/*` except health pass through `requireDb` middleware.

### 2.4 Authentication & roles

| Concern | Implementation |
|---------|----------------|
| JWT | `backend/src/utils/jwt.js` — payload `{ sub, role, rollNumber? }`, default expiry `7d` |
| Middleware | `backend/src/middleware/auth.js` — `authenticate()`, `authorize(...roles)` |
| Password | bcryptjs, 10 salt rounds (`User.js` pre-save hook) |
| Storage | `localStorage.token` via `frontend/src/context/AuthContext.jsx` |
| Header | `Authorization: Bearer <token>` |

**Current roles** (`User.role` enum in `backend/src/models/User.js`):

| Role | Login | Registration | Capabilities |
|------|-------|--------------|--------------|
| `admin` | Email + password | **Seed only** — no API registration | Full interviews, analytics, exports, student upload, coding admin |
| `interviewer` | Email + password | Self-register | Create interviews, search students, view own submissions |
| `student` | Roll number + password | Self-register | Own interviews, PDF exports, coding profile |

**Login rules** (`authController.js`):
- Students **must** use roll number (email login rejected)
- Staff (admin/interviewer) use email

**No granular permission system** — coarse role enum only. No HR/TPO/Faculty roles.

### 2.5 MongoDB / Mongoose models (8 total)

#### User (`backend/src/models/User.js`)

| Field | Type | Notes |
|-------|------|-------|
| name | String | required |
| email | String | sparse unique, lowercase |
| password | String | required, min 6, hashed |
| role | enum | `admin`, `interviewer`, `student` |
| rollNumber | String | sparse unique, uppercase (students) |
| expertise | String | interviewers |
| batch, group | String | indexed |
| skills | [String] | flat array — not structured tech stack |
| contactNumber | String | |
| placementStatus | enum | `Placed`, `Unplaced` (binary — not source's 6-state enum) |

**Students are User documents** — no separate `Student` collection.

#### Interview (`backend/src/models/Interview.js`)

Mock interview records: studentName, rollNumber, resumeLink (URL only), studentId → User, batch, group, placementStatus, technicalScore/communicationScore/overallScore (0–10), interviewType, level, remarks, status, interviewerId → User.

#### Coding module models

| Model | Purpose |
|-------|---------|
| `CodingPlatformAccount` | Platform username connections per student |
| `CodingStatistics` | Normalized platform snapshots (rating, problems, heatmap, etc.) |
| `CodingScore` | Composite scores including `readinessScore` (0–100), ranks |
| `ScoringConfig` | Admin-configurable coding weights |
| `RefreshLog` | Coding sync audit trail |
| `CacheEntry` | TTL cache (Redis optional, Mongo fallback) |

**Platform adapters** (`backend/src/coding/adapters/`): LeetCode, HackerRank, CodeChef, Codeforces, GitHub, AtCoder, HackerEarth, GeeksForGeeks. **Gap:** `stackoverflow` listed in constants but has no adapter.

**Background jobs:** `node-cron` — daily refresh 2AM, cache cleanup every 6h (`backend/src/coding/jobs/scheduler.js`).

### 2.6 Express routes & controllers

| Route file | Mount | Controller |
|------------|-------|------------|
| `authRoutes.js` | `/api/auth` | `authController.js` |
| `interviewRoutes.js` | `/api/interviews` | `interviewController.js` |
| `analyticsRoutes.js` | `/api/analytics` | `analyticsController.js` |
| `exportRoutes.js` | `/api/export` | `exportController.js` |
| `studentRoutes.js` | `/api/students` | `studentController.js` |
| `codingRoutes.js` | `/api/coding` | `codingController.js` |

### 2.7 Complete API endpoints (current)

#### Health
| Method | Path | Auth | Roles |
|--------|------|------|-------|
| GET | `/api/health` | No | — |

#### Auth (`/api/auth`)
| Method | Path | Auth | Roles |
|--------|------|------|-------|
| POST | `/api/auth/register` | No | Creates interviewer or student |
| POST | `/api/auth/login` | No | — |
| GET | `/api/auth/me` | Yes | Any |

#### Interviews (`/api/interviews`)
| Method | Path | Auth | Roles |
|--------|------|------|-------|
| POST | `/api/interviews` | Yes | interviewer |
| GET | `/api/interviews` | Yes | admin (filters + pagination) |
| GET | `/api/interviews/student/:rollNumber` | Yes | admin, student*, interviewer |
| GET | `/api/interviews/search?q=` | Yes | admin, interviewer |
| GET | `/api/interviews/interviewer/:id` | Yes | admin, interviewer* |

\*Controller-level ownership checks in `interviewController.js`

#### Analytics (`/api/analytics`)
| Method | Path | Auth | Roles |
|--------|------|------|-------|
| GET | `/api/analytics/dashboard` | Yes | admin, interviewer |
| GET | `/api/analytics/leaderboard` | Yes | admin |

#### Export (`/api/export`)
| Method | Path | Auth | Roles |
|--------|------|------|-------|
| GET | `/api/export/excel` | Yes | admin |
| GET | `/api/export/pdf` | Yes | admin |
| GET | `/api/export/student/reports/pdf` | Yes | student |
| GET | `/api/export/student/reports/:id/pdf` | Yes | student* |

#### Students (`/api/students`)
| Method | Path | Auth | Roles |
|--------|------|------|-------|
| POST | `/api/students/upload` | Yes | admin (multipart CSV/XLSX) |
| PATCH | `/api/students/:id/placement` | Yes | admin |

#### Coding (`/api/coding`) — all rate-limited (30 req/min)
| Method | Path | Auth | Roles |
|--------|------|------|-------|
| GET | `/api/coding/platforms` | Yes | Any authenticated |
| GET | `/api/coding/leaderboard` | Yes | Any authenticated |
| GET | `/api/coding/college/analytics` | Yes | admin |
| GET | `/api/coding/admin/scoring-config` | Yes | admin |
| PUT | `/api/coding/admin/scoring-config` | Yes | admin |
| GET | `/api/coding/students/:id/coding` | Yes | admin, interviewer, or own student |
| GET | `/api/coding/students/:id/coding/summary` | Yes | same |
| POST | `/api/coding/students/:id/connect-platform` | Yes | same |
| DELETE | `/api/coding/students/:id/platforms/:platform` | Yes | same |
| POST | `/api/coding/students/:id/refresh` | Yes | same |
| GET | `/api/coding/:platform/:username` | Yes | Any (preview) |

### 2.8 Middleware

| File | Purpose |
|------|---------|
| `middleware/auth.js` | JWT `authenticate()` + `authorize(...roles)` |
| `middleware/validators.js` | express-validator rules |
| `middleware/requireDb.js` | 503 if MongoDB not connected |
| `middleware/codingRateLimit.js` | In-memory rate limit on `/api/coding/*` |

**Controller-level guards:**
- `interviewController` — students view own roll only; interviewers view own submissions
- `codingController.canAccessStudent` — admin/interviewer: any student; student: own ID
- `exportController` — student must own interview roll number

### 2.9 Existing modules

| Module | Status | Target files |
|--------|--------|--------------|
| **Mock interviews** | ✅ Full | `Interview` model, `interviewController`, 3 dashboards |
| **Student bulk import** | ✅ Partial | `POST /api/students/upload` — CSV/XLSX via multer + xlsx |
| **Placement status** | ✅ Binary only | `User.placementStatus` Placed/Unplaced; admin PATCH |
| **Interview analytics** | ✅ | Dashboard cards, leaderboard, batch stats |
| **Interview exports** | ✅ | Admin Excel/PDF; student PDF (pdfkit + xlsx) |
| **Coding profiles** | ✅ Substantial | 8 adapters, scoring engine, scheduler, college analytics |
| **Coding readinessScore** | ✅ Coding-only | `CodingScore.readinessScore` — not full placement readiness |
| **Resume management** | ❌ URL on interview only | No file upload, versioning, or review workflow |
| **Tech stack** | ❌ Flat `skills[]` | No master catalog, verification, or proficiency |
| **Company matching** | ❌ | — |
| **HR Talent Room** | ❌ | — |
| **Placement passport** | ❌ | — |
| **Placement reports** | ❌ | Interview exports only |
| **Jobs/queue** | ❌ Cron only | Daily coding refresh — no Job model or progress UI |
| **Audit logs** | ❌ Partial | `RefreshLog` for coding sync only |
| **Branding/settings** | ❌ | Hardcoded PlacementIQ branding |
| **Skill evidence graph** | ❌ | — |
| **CodeTrace hosted sync** | ❌ | Direct adapter calls only |
| **AI features** | ❌ | — |

### 2.10 Target conventions (must follow in migration)

1. **No `{ success, data }` envelope** — match existing `{ token, user }`, `{ interviews, pagination }`, `{ message }` patterns
2. **CommonJS backend**, ESM frontend
3. **express-validator** for input validation
4. **New features:** model → controller → route → mount in `createApp.js` → frontend `api/*.js` + page + `PrivateRoute`
5. **Interview scores:** 0–10; **coding scores:** 0–100
6. **Pagination:** `page`, `limit` (max 100)

### 2.11 Known target issues

| Issue | Impact | Fix phase |
|-------|--------|-----------|
| `CodingProfile.jsx` uses `user._id` but API returns `user.id` | Student coding page may not load | Phase 1 or 7 |
| StackOverflow in platform list but no adapter | Connect would fail at runtime | Phase 6 |
| Scoring config API exists; no frontend UI for weights | Admin cannot tune weights in UI | Phase 7 |
| `placementStatus` binary vs source 6-state enum | Migration needs mapping strategy | Phase 2 |
| README partially stale vs coding module | Documentation drift | Phase 9 |

### 2.12 Target environment variables

`PORT`, `MONGODB_URI`, `USE_MEMORY_DB`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `GITHUB_TOKEN`, `REDIS_URL`, `CODING_RATE_LIMIT`, `DISABLE_CODING_SCHEDULER`, optional `VITE_API_BASE_URL`.

---

## 3. Role Mapping Proposal

### 3.1 Source vs target comparison

| PlacementIQ (source) | Target (current) | Overlap |
|----------------------|------------------|---------|
| `SUPER_ADMIN` | `admin` | Partial — admin lacks permission granularity |
| `TPO_ADMIN` | — | None |
| `FACULTY` | `interviewer` (loose) | Interviewer = mock interview only, not faculty coaching |
| `HR` | — | None |
| — | `interviewer` | Target-native mock interview workflow |
| — | `student` | Target-native self-service |

### 3.2 Preferred final role model

If feasible without breaking existing deployments:

| Role | Purpose | URL prefix (proposed) |
|------|---------|----------------------|
| `ADMIN` | Super Admin — system config, audit, integrations, branding | `/admin` |
| `TPO` | Placement team — students, matching, sharing, drives | `/tpo` |
| `FACULTY` | Coaching — view students, skills, readiness (limited write) | `/faculty` |
| `INTERVIEWER` | Mock interview submissions (keep existing workflow) | `/interviewer` |
| `HR` | Talent Room — HR-safe shared profiles only | `/hr` |
| `STUDENT` | Self-service — own data, coding profile, passport view | `/student` |

### 3.3 Phase 1 temporary mapping (recommended — lower risk)

Extend `User.role` enum while preserving existing values:

| PlacementIQ role | Phase 1 target mapping | Rationale |
|------------------|------------------------|-----------|
| `SUPER_ADMIN` | `admin` | Existing seed accounts; add permission layer |
| `TPO_ADMIN` | New `tpo` role | Distinct from admin; placement operations |
| `FACULTY` | New `faculty` role | **Do not** fold into `interviewer` — different permissions |
| `HR` | New `hr` role | Required before Talent Room (Phase 5) |
| `interviewer` | `interviewer` (unchanged) | Keep mock interview workflow |
| `student` | `student` (unchanged) | Keep self-service |

**Permission module:** New `backend/src/lib/permissions.js` mirroring source `permissions.ts` — map roles → permission strings; new `requirePermission()` middleware alongside existing `authorize()`.

### 3.4 Student role isolation (non-negotiable)

The `student` role must **never** receive placement-team permissions:

| Forbidden for `student` | Allowed for `student` |
|---------------------------|----------------------|
| Student list / bulk import / export | Own profile view |
| Placement status changes for others | Own interview history |
| Company/requirement management | Own coding profile connect/refresh |
| Matching run / export | Own PDF report download |
| HR sharing manage | Own passport view (when built) |
| Audit log view | Resume upload for self (when built) |
| Integrations manage | Readiness view for self (when built) |
| Scoring config / jobs admin | — |
| Other students' data | — |

**Implementation rule:** Every new route must call `requirePermission()` or `authorize()` with an explicit allowlist. Student routes use dedicated controllers that scope queries to `req.user._id` or `req.user.rollNumber` — never reuse admin list endpoints.

### 3.5 HR sub-roles (Phase 5+)

Defer `HR_VIEWER` / `HR_RECRUITER` / `HR_MANAGER` until Talent Room. Model as `HRCompanyAccess` collection with `accessRole` field when Phase 5 begins.

---

## 4. Feature Parity Table

| Feature | Exists in Target? | Source PlacementIQ Module | Target Current Module | Migration Decision | Risk | Recommended Phase |
|---------|-------------------|---------------------------|----------------------|-------------------|------|-------------------|
| Auth and roles | Partial (3 roles, no permissions) | `src/lib/auth.ts`, `permissions.ts` | JWT + `authorize()` in `middleware/auth.js` | Extend `User.role`; add `permissions.js` + `requirePermission()` | Medium — touches all routes | **1** |
| Student tracker | Partial (admin table + upload) | `students.ts`, `Student` model | `User` with student fields; `studentController` upload | Extend `User` schema; add list/detail APIs + pages | Medium | **2** |
| Resume management | Partial (URL on interview only) | `resumes.ts`, `Resume` model | `Interview.resumeLink` | New `Resume` collection + multer upload + storage | High — new storage layer | **3** |
| Tech stack | Partial (`User.skills[]`) | `tech-stack.ts`, `TechSkill`, `StudentTechSkill` | Flat skills array on User | New `TechSkill` + `StudentTechSkill` collections | Medium | **3** |
| Readiness scoring | Partial (coding `readinessScore` only) | `readiness.ts`, `ReadinessSnapshot` | `CodingScore.readinessScore` | Port formula to `readinessService.js`; new `ReadinessSnapshot` | High — cross-domain inputs | **3** |
| Company matching | Absent | `company-matching.ts`, `CompanyMatchSnapshot` | — | Rebuild matching in `matchingService.js` | High | **4** |
| HR Talent Room | Absent | `student-sharing.ts`, `/hr/*` | — | `SharedStudentProfile` + HR-safe DTOs + `/hr` routes | **Critical** — data leakage | **5** |
| Placement passport | Absent | `placement-passport.ts` | — | `PlacementPassportSnapshot` + print page | Medium | **5** |
| Reports | Partial (interview Excel/PDF) | `reports.ts`, `report-export.ts` | `exportController` (interviews only) | Rebuild 10+ report types; light-theme print pages | High | **6** |
| Jobs/background tasks | Partial (cron coding refresh) | `jobs.ts`, BullMQ worker | `coding/jobs/scheduler.js` | `Job` model + in-process runner; Redis later | High | **8** |
| Branding/settings | Absent (hardcoded) | `app-settings.ts` | — | `AppSettings` singleton + admin settings page | Low | **1** |
| AI JD parser | Absent | `jd-parser.ts` | — | **Postpone** — optional OpenAI + rule fallback | Medium | **4** (optional, defer) |
| AI resume insights | Absent | `resume-insights.ts` | — | **Postpone** — after resume module | Medium | **3** (optional, defer) |
| GitHub evidence | Partial (GitHub adapter) | `github.ts`, `GitHubProfile` | `GitHubAdapter` in coding module | Extend with repo-level evidence model | Medium | **7** |
| Coding platform profiles | **Yes** | `coding-platforms.ts`, adapters | `backend/src/coding/` (8 adapters) | **Adapt** — extend, do not replace | Low | **7** |
| CodeTrace hosted sync | Absent | `codetraceHosted.ts`, bulk sync APIs | — | Add provider layer under `coding/providers/codetrace/` | High — experimental APIs | **7** |
| Skill evidence graph | Absent | `skill-evidence.ts` | — | `SkillEvidenceSnapshot` + aggregation service | High | **7** |
| Coding intelligence dashboard widget | Partial (`CodingAdmin`) | `CodingIntelligenceWidget` | `pages/CodingAdmin.jsx` | Dashboard widget on admin/TPO home | Low | **7** |
| Audit logs | Partial (`RefreshLog` only) | `AuditLog`, `audit.ts` | `RefreshLog` (coding sync) | New `AuditLog` model + `auditService.js` | Low | **1** |
| Bulk import/export | Partial (student upload + interview export) | `import.ts`, `export.ts` | `studentController` upload; `exportController` | Extend import fields; add student export route | Low | **2** |

**Target-native features to preserve (not migrate from source):**

| Feature | Decision |
|---------|----------|
| Mock interview tracking | **Keep** — integrate scores into readiness in Phase 3 |
| Interviewer dashboard | **Keep** — separate from faculty role |
| Coding adapters + scoring | **Keep** — extend with CodeTrace providers in Phase 7 |

---

## 5. Database / Model Migration Plan

**Rule:** Do not copy Prisma models. Design Mongoose schemas for MongoDB. All changes additive with defaults. No destructive migrations without explicit approval.

**Strategy:** Source uses separate `User` (staff) and `Student` entities. Target uses `User` with `role: 'student'`. Phase 2 extends `User` for student fields rather than introducing a separate `Student` collection — avoids breaking auth and coding module references. Optional `StudentProfile` extension document linked to `User` if schema grows too large.

### 5.1 Proposed Mongoose models

| Model | Key fields (summary) | Phase | Priority | Risk |
|-------|---------------------|-------|----------|------|
| **User** (extend) | Add: `branch`, `section`, `graduationYear`, `cgpa`, `activeBacklogs`, `linkedinUrl`, `githubUrl`, `resumeStatus`, `technicalScore`, `communicationScore`, `readinessScore`, `placementStatus` (expand enum), `role` (expand enum) | 1–2 | **Required early** | Medium — enum migration |
| **Student** | *Alternative only if User extension rejected* — `userId` ref, rollNumber, branch, batch, cgpa, placementStatus, readinessScore | 2 | Optional | High — duplicates User |
| **Resume** | studentId→User, fileName, filePath, mimeType, fileSize, reviewStatus, atsFriendly, resumeScore, version, isActive, reviewerComments | 3 | **Required early** | High — file storage |
| **TechSkill** | name, category, isActive | 3 | **Required early** | Low |
| **StudentTechSkill** | studentId→User, techSkillId→TechSkill, proficiencyLevel, verificationStatus, interestLevel | 3 | **Required early** | Low |
| **ReadinessSnapshot** | studentId→User, overallScore, componentScores{}, status, riskLevel, calculatedAt | 3 | **Required early** | Medium |
| **Company** | name, industry, website, isActive, hrContacts[] | 4 | **Required early** | Low |
| **CompanyRequirement** | companyId→Company, title, description, requiredSkills[], preferredSkills[], minCgpa, maxBacklogs, status | 4 | **Required early** | Medium |
| **CompanyMatchSnapshot** | requirementId, studentId→User, fitScore, eligibilityStatus, matchStatus, componentScores{} | 4 | **Required early** | Medium |
| **SharedStudentProfile** | studentId→User, companyId→Company, sharedBy→User, hrUser→User, shareStatus, hrDecision, expiresAt, hrSafeFields{} | 5 | **Required early** | **Critical** |
| **PlacementPassportSnapshot** | studentId→User, generatedBy→User, snapshotData{}, generatedAt | 5 | **Required early** | Low |
| **PlacementDrive** | companyId→Company, title, mode, status, dates, createdBy→User | 5 | Optional later | Low |
| **StudentPlacementStage** | driveId→PlacementDrive, studentId→User, currentStage, finalOutcome | 5 | Optional later | Low |
| **CodingPlatform** | *May use existing constants* — name, slug, isActive, syncMode | 7 | Optional — extend existing | Low |
| **StudentCodingProfile** | *Extend existing* `CodingPlatformAccount` + `CodingStatistics` + `CodingScore` with sync metadata, sourceType, verificationStatus | 7 | **Required early** | Low — extend existing |
| **SkillEvidenceSnapshot** | studentId→User, skillName, evidenceStrength, sources[]{platform, metric, value}, calculatedAt | 7 | Optional later | High |
| **Job** | type, status, payload{}, progress, createdBy→User, startedAt, completedAt, error | 8 | Optional later | Medium |
| **AuditLog** | action, entityType, entityId, userId→User, metadata{}, ipAddress, createdAt | 1 | **Required early** | Low |
| **AppSettings** | institutionName, logoPath, primaryColor, updatedBy→User | 1 | **Required early** | Low |

### 5.2 Models deferred / optional

| Model | Defer to | Reason |
|-------|----------|--------|
| `ResumeInsight` | Phase 3+ (optional) | AI dependency |
| `JDParseLog` | Phase 4+ (optional) | AI JD parser deferred |
| `HRCompanyAccess` | Phase 5 | HR sub-roles |
| `GitHubProfile`, `GitHubRepository` | Phase 7 | Extend coding GitHub adapter first |
| `CodingPlatformIntegration` | Phase 7 | Integrations hub |
| `StudentRoleInterest` | Phase 3+ | Lower priority than core readiness |
| `PlacementDrive`, `StudentPlacementStage` | Phase 5+ | After passport + matching stable |

### 5.3 placementStatus enum migration

| Source (`PlacementStatus`) | Target (current) | Proposed target |
|----------------------------|------------------|-----------------|
| NOT_STARTED | Unplaced | NOT_STARTED |
| IN_TRAINING | Unplaced | IN_TRAINING |
| READY | Unplaced | READY |
| SHORTLISTED | Unplaced | SHORTLISTED |
| PLACED | Placed | PLACED |
| NEEDS_ATTENTION | Unplaced | NEEDS_ATTENTION |

Map existing `Placed` → `PLACED`, `Unplaced` → `NOT_STARTED` on first migration script.

### 5.4 Coding module — extend vs replace

**Decision:** Extend existing models (`CodingPlatformAccount`, `CodingStatistics`, `CodingScore`, `RefreshLog`) rather than introducing parallel `StudentCodingProfile` collection.

Add fields: `sourceType` (`adapter` | `codetrace_hosted` | `manual`), `syncStatus`, `verificationStatus`, `lastSyncError`, `preserveOnZero`.

---

## 6. Express API Migration Plan

Map PlacementIQ Next.js API routes into target Express conventions: `routes/` → `controllers/` → mount in `createApp.js`.

### 6.1 Phase 1 — Foundation

| Method | Path | Roles / Permissions | Notes |
|--------|------|---------------------|-------|
| GET | `/api/settings/branding` | Any authenticated | Public branding |
| PUT | `/api/settings/branding` | admin | Logo + institution name |
| GET | `/api/audit-logs` | admin (`audit:view`) | Paginated |
| POST | `/api/audit-logs` | internal service only | Written by auditService |

### 6.2 Phase 2 — Student tracker

| Method | Path | Roles / Permissions | Notes |
|--------|------|---------------------|-------|
| GET | `/api/students` | admin, tpo, faculty (`students:view`) | Filters: q, batch, branch, placementStatus, page, limit |
| GET | `/api/students/:id` | admin, tpo, faculty, student (own) | Detail DTO |
| POST | `/api/students` | admin, tpo (`students:create`) | Single create |
| PUT | `/api/students/:id` | admin, tpo (`students:edit`) | Update profile |
| DELETE | `/api/students/:id` | admin (`students:delete`) | Soft-delete preferred |
| POST | `/api/students/upload` | admin, tpo (`students:import`) | **Extend** existing route |
| GET | `/api/students/export` | admin, tpo (`students:export`) | CSV/XLSX |
| PATCH | `/api/students/:id/placement` | admin, tpo | **Extend** enum |
| PATCH | `/api/students/:id/scores` | admin, tpo, faculty (`students:update_scores`) | Technical/communication |

### 6.3 Phase 3 — Resume + tech stack + readiness

| Method | Path | Roles / Permissions | Notes |
|--------|------|---------------------|-------|
| GET | `/api/resumes` | admin, tpo, faculty (`resume:view`) | List with filters |
| POST | `/api/students/:id/resumes` | admin, tpo, student (own) (`resume:upload`) | multer upload |
| GET | `/api/resumes/:id/download` | admin, tpo, faculty, student (own) | File stream |
| PATCH | `/api/resumes/:id/review` | admin, tpo, faculty (`resume:review`) | Review status + comments |
| DELETE | `/api/resumes/:id` | admin, tpo (`resume:delete`) | |
| GET | `/api/tech-skills` | authenticated (`techstack:view`) | Master catalog |
| POST | `/api/tech-skills` | admin, tpo (`techstack:manage_master`) | |
| GET | `/api/students/:id/tech-stack` | admin, tpo, faculty, student (own) | |
| PUT | `/api/students/:id/tech-stack` | admin, tpo, faculty (`techstack:manage_skills`) | |
| PATCH | `/api/students/:id/tech-stack/:skillId/verify` | admin, tpo, faculty (`techstack:verify`) | |
| GET | `/api/readiness` | admin, tpo, faculty (`readiness:view`) | List snapshots |
| GET | `/api/students/:id/readiness` | admin, tpo, faculty, student (own) | Latest snapshot |
| POST | `/api/students/:id/readiness/recalculate` | admin, tpo (`readiness:recalculate`) | Sync recalc |
| POST | `/api/readiness/bulk-recalculate` | admin, tpo | Triggers job in Phase 8 |

### 6.4 Phase 4 — Company matching

| Method | Path | Roles / Permissions | Notes |
|--------|------|---------------------|-------|
| GET/POST | `/api/companies` | admin, tpo (`companies:view/manage`) | CRUD |
| GET/PUT/DELETE | `/api/companies/:id` | admin, tpo | |
| GET/POST | `/api/company-requirements` | admin, tpo (`requirements:view/manage`) | |
| GET/PUT/DELETE | `/api/company-requirements/:id` | admin, tpo | |
| POST | `/api/company-requirements/:id/match` | admin, tpo (`matching:run`) | Run matching |
| GET | `/api/company-requirements/:id/matches` | admin, tpo (`matching:view`) | Results |
| GET | `/api/company-requirements/:id/matches/export` | admin, tpo (`matching:export`) | |
| POST | `/api/company-requirements/:id/parse-jd` | admin, tpo | **Defer** if AI postponed |

### 6.5 Phase 5 — HR Talent Room + passport

| Method | Path | Roles / Permissions | Notes |
|--------|------|---------------------|-------|
| GET | `/api/hr/dashboard` | hr | HR-safe aggregates only |
| GET | `/api/hr/talent-room` | hr (`talent:view`) | Shared students list |
| GET | `/api/hr/students/:id` | hr | **HR-safe DTO only** — never admin shape |
| PATCH | `/api/hr/students/:id/decision` | hr (`talent:update`) | HR decision |
| GET/POST | `/api/shared-students` | admin, tpo (`sharing:manage`) | Share/revoke |
| DELETE | `/api/shared-students/:id` | admin, tpo | Revoke share |
| POST | `/api/students/:id/passport/generate` | admin, tpo (`passport:generate`) | |
| GET | `/api/students/:id/passport` | admin, tpo, faculty, student (own), hr (if shared) | Latest snapshot |
| GET | `/api/students/:id/passport/print` | same | Print-friendly HTML/PDF |

### 6.6 Phase 6 — Reports

| Method | Path | Roles / Permissions | Notes |
|--------|------|---------------------|-------|
| GET | `/api/reports/:type` | admin, tpo (`reports:view`) | type = branch-summary, skill-gap, etc. |
| GET | `/api/reports/:type/export` | admin, tpo (`reports:export`) | PDF/Excel |
| GET | `/api/analytics/placement` | admin, tpo (`analytics:view`) | Extend existing analytics |

### 6.7 Phase 7 — Coding intelligence + CodeTrace

| Method | Path | Roles / Permissions | Notes |
|--------|------|---------------------|-------|
| GET | `/api/coding-profiles` | admin, tpo (`coding:view`) | List all student coding profiles |
| GET | `/api/integrations` | admin (`integrations:view`) | Integration status |
| PUT | `/api/integrations/coding-platforms/:slug` | admin (`integrations:manage`) | |
| POST | `/api/integrations/codetrace/test-sync` | admin (`integrations:test`) | Experimental |
| POST | `/api/integrations/codetrace/sync-student` | admin, tpo | Per-student sync |
| POST | `/api/integrations/codetrace/bulk-sync` | admin, tpo | Triggers job Phase 8 |
| GET | `/api/skill-evidence/:studentId` | admin, tpo, faculty (`evidence:view`) | |
| POST | `/api/skill-evidence/bulk-refresh` | admin, tpo (`evidence:refresh`) | Job Phase 8 |

**Extend existing** `/api/coding/*` routes — do not duplicate.

### 6.8 Phase 8 — Jobs

| Method | Path | Roles / Permissions | Notes |
|--------|------|---------------------|-------|
| GET | `/api/jobs` | admin, tpo | List jobs |
| GET | `/api/jobs/:id` | admin, tpo | Job detail + progress |
| POST | `/api/jobs/:id/cancel` | admin | |
| GET | `/api/jobs/queue-health` | admin | Queue status |

### 6.9 Routes to preserve unchanged

| Existing route | Decision |
|----------------|----------|
| `/api/auth/*` | Keep JWT flow |
| `/api/interviews/*` | Keep mock interview workflow |
| `/api/export/excel`, `/api/export/pdf` | Keep; extend later |
| `/api/analytics/dashboard` | Keep; add placement KPIs in Phase 6 |
| `/api/coding/*` | Keep; extend with CodeTrace metadata |

---

## 7. Frontend Migration Plan

Use target React Router v6 style: `App.jsx` routes + `PrivateRoute` + `Layout.jsx` nav. New pages under `frontend/src/pages/` with API helpers in `frontend/src/api/`.

### 7.1 Proposed route map

| Page | Path | Roles | Source reference |
|------|------|-------|------------------|
| **Placement Dashboard** | `/admin` (extend), `/tpo` (new) | admin, tpo | `*/dashboard/` |
| **Students** | `/admin/students`, `/tpo/students` | admin, tpo, faculty (view) | `StudentsPageClient` |
| **Student Detail** | `/admin/students/:id`, `/tpo/students/:id`, `/faculty/students/:id` | admin, tpo, faculty; student → `/student/profile` | Student detail tabs |
| **Resume Review** | `/admin/resumes`, `/tpo/resumes` | admin, tpo, faculty | `*/resumes/` |
| **Tech Stack** | `/admin/tech-stack`, `/tpo/tech-stack` | admin, tpo, faculty | `*/tech-stack/` |
| **Readiness** | `/admin/readiness`, `/tpo/readiness` | admin, tpo, faculty | `*/readiness/` |
| **Companies** | `/admin/companies`, `/tpo/companies` | admin, tpo | `*/companies/` |
| **Requirements** | `/admin/requirements`, `/tpo/requirements` | admin, tpo | Company requirements |
| **Matching** | `/admin/matching/:requirementId` | admin, tpo | Match results view |
| **HR Talent Room** | `/hr`, `/hr/talent-room` | hr only | `hr/talent-room/` |
| **Reports** | `/admin/reports`, `/tpo/reports` | admin, tpo | `*/reports/` |
| **Placement Passport** | `/admin/students/:id/passport`, `/student/passport` | admin, tpo; student own | Passport print view |
| **Coding Platforms** | `/admin/coding` (extend), `/student/coding` (keep) | existing roles | `*/coding-platforms/` |
| **Integrations Hub** | `/admin/integrations` | admin | `IntegrationsHubClient` |
| **Jobs** | `/admin/jobs`, `/admin/jobs/:id` | admin, tpo | `JobsListClient` |
| **Skill Evidence** | `/admin/students/:id/evidence` | admin, tpo, faculty | `*/skill-evidence/` |
| **Settings / Branding** | `/admin/settings` | admin | Branding page |
| **Audit Logs** | `/admin/audit-logs` | admin | `admin/audit-logs/` |

### 7.2 Layout & navigation

Extend `frontend/src/components/Layout.jsx`:
- Role-aware sidebar or top nav sections
- Separate nav trees for admin, tpo, faculty, hr, interviewer, student
- Student nav: Dashboard, My Interviews, Coding Profile, My Passport (later) — **no** placement-team links

### 7.3 New UI primitives (Phase 1)

Add `frontend/src/components/ui/`:
- `Badge.jsx` — status badges (placement, readiness, sync)
- `StatCard.jsx` — dashboard KPI cards
- `PageHeader.jsx` — consistent page titles + actions
- `DataTable.jsx` — sortable/filterable tables (admin lists)

Match existing Tailwind conventions — no MUI/shadcn unless justified.

### 7.4 API client modules (proposed)

```
frontend/src/api/
├── client.js          # existing
├── coding.js          # existing
├── students.js        # Phase 2
├── resumes.js         # Phase 3
├── techStack.js       # Phase 3
├── readiness.js       # Phase 3
├── companies.js       # Phase 4
├── hr.js              # Phase 5
├── reports.js         # Phase 6
├── integrations.js    # Phase 7
├── jobs.js            # Phase 8
└── settings.js        # Phase 1
```

### 7.5 Student-facing scope

| Student page | Access |
|--------------|--------|
| `/student` | Own interviews, score trend (existing) |
| `/student/coding` | Own coding profile (existing) |
| `/student/profile` | Own extended profile (Phase 2) |
| `/student/passport` | Own passport view/print (Phase 5) |
| `/student/readiness` | Own readiness snapshot (Phase 3) |

Students must not see routes under `/admin`, `/tpo`, `/faculty`, `/hr`.

---

## 8. Risk List

| # | Risk | Severity | Mitigation |
|---|------|----------|------------|
| 1 | **Different stack** (Next.js/Prisma/PostgreSQL → Express/Mongoose/MongoDB) | High | Rebuild domain logic in JS; do not copy-paste TypeScript/Prisma code |
| 2 | **Prisma → MongoDB rebuild** — 30 models, relational joins, cascades | High | Phased collections; denormalize where appropriate; additive schema only |
| 3 | **Role mismatch** — 4 source roles + HR sub-roles vs 3 target roles | High | Phase 1 permission module before feature routes; seed demo accounts per role |
| 4 | **Student role vs placement controls** — students could gain admin APIs if guards fail | **Critical** | Dedicated student controllers; `requirePermission()` on every route; code review gate |
| 5 | **User-as-Student pattern** — source separates User/Student | Medium | Extend User schema Phase 2; document field mapping; avoid breaking coding `studentId` refs |
| 6 | **placementStatus enum change** — Placed/Unplaced → 6-state | Medium | Migration script with defaults; update dashboards |
| 7 | **CodeTrace hosted APIs experimental** — external dependency, may fail | High | Feature flag `CODETRACE_EXPERIMENTAL_SYNC_ENABLED=false`; preserve prior stats on failure; UI label |
| 8 | **Background jobs / queue** — source uses BullMQ; target uses cron only | High | In-process job runner Phase 8; document limits; Redis optional |
| 9 | **Reports/export rebuild** — source has 10+ report types | High | Start with 3 high-value reports; defer large exports |
| 10 | **HR-safe sharing** — internal fields could leak to HR | **Critical** | Separate HR DTO layer; never reuse admin student API; field allowlists; audit share access |
| 11 | **Resume file storage** — source uses local/S3 uploads | High | multer + configurable storage; virus scan consideration |
| 12 | **Readiness formula cross-domain** — needs interview + resume + tech + coding + academic | High | Port formula exactly; unit test against source examples |
| 13 | **Coding module duplication risk** — two parallel coding stacks | Medium | Extend existing `backend/src/coding/`; CodeTrace as provider layer |
| 14 | **JWT in localStorage** — XSS token theft | Medium | Existing risk; do not worsen; consider httpOnly cookie in future hardening |
| 15 | **Known bug: `user._id` vs `user.id`** | Low | Fix in Phase 1 before new student pages |
| 16 | **Vercel serverless limits** — long-running jobs/reports | Medium | Offload jobs to worker process; paginate exports |

---

## 9. Recommended Implementation Phases

```
Phase 0  ✅ Source + target audit (this document)
Phase 1  Foundation — roles, permissions, audit logs, AppSettings, layout, UI primitives
Phase 2  Student tracker — extend User, list/detail, filters, import/export
Phase 3  Resume + tech stack + readiness engine
Phase 4  Company matching (+ optional AI JD parser)
Phase 5  HR Talent Room + placement passport
Phase 6  Reports + placement analytics KPIs
Phase 7  Coding intelligence + CodeTrace sync + skill evidence
Phase 8  Jobs / background queue
Phase 9  UI polish (coding areas, dark panels, scoring config UI)
Phase 10 Full QA — regression, security review, load test
```

### Phase 1 detail (recommended next step)

**Goal:** Permission foundation without breaking existing interview + coding features.

| Deliverable | Path |
|-------------|------|
| Permission matrix | `backend/src/lib/permissions.js` |
| Permission middleware | `backend/src/middleware/requirePermission.js` |
| Extended User.role enum | `admin`, `tpo`, `faculty`, `hr`, `interviewer`, `student` |
| AuditLog model | `backend/src/models/AuditLog.js` |
| Audit service | `backend/src/services/auditService.js` |
| AppSettings model | `backend/src/models/AppSettings.js` |
| Settings routes | `backend/src/routes/settingsRoutes.js` |
| Audit routes | `backend/src/routes/auditRoutes.js` |
| Extended Layout nav | `frontend/src/components/Layout.jsx` |
| UI primitives | `frontend/src/components/ui/Badge.jsx`, `StatCard.jsx`, `PageHeader.jsx` |
| Env vars | `CODETRACE_EXPERIMENTAL_SYNC_ENABLED=false` in `.env.example` |
| Seed updates | Demo TPO, faculty, HR accounts in `backend/src/seed/` |
| Bug fix | `CodingProfile.jsx` — use `user.id` consistently |

**Phase 1 exit criteria:**
- Build passes (CI green)
- Existing interview + coding flows unchanged
- New roles can log in with correct nav visibility
- Audit log records settings changes
- Student role cannot access `/api/audit-logs` or `/api/settings/branding` PUT
- Stakeholder sign-off before Phase 2

---

## 10. What Not to Migrate Immediately

Defer these features until core placement workflows are stable:

| Feature | Defer to | Reason |
|---------|----------|--------|
| AI resume insights | Phase 3+ optional / post-Phase 10 | Requires AI provider, cost, accuracy review |
| AI JD parser | Phase 4+ optional | `AI_PROVIDER=none` default; rule-based manual entry first |
| Redis / BullMQ queue | Phase 8+ | In-process jobs sufficient for pilot; Redis already in docker-compose but unused |
| Large report exports (1000+ students) | Phase 6+ | Memory limits on Vercel; needs streaming/pagination |
| Advanced HR sharing (expiry rules, bulk share) | Phase 5+ | Start with single share/revoke |
| Full CodeTrace bulk sync | Phase 7–8 | Start with test-sync + single-student sync |
| Production deployment hardening | Phase 10 | Rate limits, WAF, backup/restore, monitoring |
| Placement drives pipeline | Phase 5+ optional | After passport + matching proven |
| Skill evidence graph (full) | Phase 7+ | Start with coding + tech stack evidence only |
| StackOverflow adapter | Phase 7 or never | No adapter exists; remove from platform list or implement |
| Separate Student collection | Only if User extension fails | High migration cost |
| Dark navy full-app theme | Phase 9 | Scope to coding/integrations panels only |
| httpOnly cookie auth migration | Post-Phase 10 | Breaking change to frontend auth |

---

## Appendix A — Stack comparison

| Aspect | PlacementIQ (source) | student-tracer (target) | CodeTrace (reference) |
|--------|---------------------|-------------------------|----------------------|
| Framework | Next.js 15 App Router | React 18 + Vite | Vite 8 + React 19 |
| Database | Prisma + PostgreSQL | Mongoose + MongoDB | Supabase Postgres (profiles only) |
| Auth | HMAC session cookie | JWT Bearer | Supabase Auth |
| Roles | SUPER_ADMIN, TPO_ADMIN, FACULTY, HR | admin, interviewer, student | None |
| Students | Separate Student model | User with role=student | N/A |
| Interviews | Not primary | Core feature | N/A |
| Coding | StudentCodingProfile + integrations | 8 adapters + scoring engine | Hosted stat APIs |
| Purpose | Full placement OS | Interview tracker + coding (→ placement OS) | Public coding profile aggregator |

## Appendix B — Source demo accounts

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@placementiq.edu | admin123 |
| TPO | tpo@placementiq.edu | tpo123 |
| Faculty | faculty@placementiq.edu | faculty123 |
| HR | hr@placementiq.edu | hr123 |

## Appendix C — Target demo accounts

Seeded via `backend/src/seed/` — admin via seed only; register for interviewer/student.

## Appendix D — Key file index

### Source (Tracker)
- Schema: `prisma/schema.prisma`
- Permissions: `src/lib/permissions.ts`
- Auth: `src/lib/auth.ts`
- Services: `src/lib/services/*.ts`
- CodeTrace sync: `src/lib/services/coding-sync/`

### Target (student-tracer-main)
- App: `backend/src/createApp.js`, `frontend/src/App.jsx`
- Auth: `backend/src/middleware/auth.js`, `frontend/src/context/AuthContext.jsx`
- Models: `backend/src/models/*.js`
- Coding: `backend/src/coding/`
- Docs: `docs/CODING_PROFILE_MODULE.md`

### CodeTrace reference
- Unified client: `src/api/unifiedClient.ts`
- Platform APIs: `src/api/*.ts`
- UI reference: `src/components/UniversalHeatmap.tsx`, `RatingChart.tsx`

---

*Phase 0 complete. No implementation started. Await stakeholder approval before Phase 1.*
