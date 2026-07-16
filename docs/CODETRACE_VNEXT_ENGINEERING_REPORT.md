# CodeTrace vNext – Engineering Report

**Release:** Student Self-Service Platform + Academic Batch  
**Status:** Implemented (app + migrations)  
**Build:** `npm run build` passed (tsc + vite)

---

## 1. Executive Summary

This release adds:

1. **Module A – Student Update Campaigns** — admin/TPO create filter-based campaigns, mint per-student secure tokens, and students complete editable dossier fields at `/student/update/:token` without login.
2. **Module B – Academic Batch** — `admission_year`, `academic_batch`, plus dossier columns (`section`, `address`, `certifications_summary`, `internship_summary`), with 4-year backfill and UI label sweep.

Existing modules were extended, not rewritten. Public write access uses **SECURITY DEFINER RPCs** only (same pattern as resume-book / performance share). Campaign tokens are a **separate** namespace from read-only `share_token`.

---

## 2. Architecture Review

| Concern | Approach |
|--------|----------|
| Public reads/writes | `get_public_student_update_form`, `submit_public_student_update`, `register_public_campaign_resume` |
| Token mint | 24-byte hex (48 chars), unique index |
| Staff UI | PlacementShell + PlacementUi primitives |
| Filters | Extended `StudentListFilters` in `students.ts` |
| Academic batch | Derived via `src/lib/academicBatch.ts`; legacy `batch` kept in sync |

---

## 3. Feature Overview

### Module A
- Nav: **Student Update Campaigns** (after Student Tracker)
- Pages: list, create, detail (copy / disable / extend / regenerate; Resend stub)
- Portal: standalone form, locked academic fields, editable contact/dossier, resume upload under `campaign/{token}/…`

### Module B
- Columns + backfill migration
- Create/update/import/bulk derive `YYYY-YYYY`
- Labels: Academic Batch on Tracker, Form, Bulk Assign, Resume Book create

---

## 4. Database / Migration Scripts

| File | Purpose |
|------|---------|
| `supabase/migrations/202607120011_academic_batch_and_dossier.sql` | Columns + 4-year backfill |
| `supabase/migrations/202607120012_student_update_campaigns.sql` | Campaigns, tokens, RLS, RPCs, storage policies |
| `scripts/apply-academic-batch-dossier-migration.sql` | Hosted apply |
| `scripts/apply-student-update-campaigns-migration.sql` | Hosted apply |

**Hosted deploy:** run both apply scripts in Supabase SQL Editor (in order) before using campaigns in production.

---

## 5. RLS / RPC / Security

- Tables: staff SELECT; admin/tpo manage; **no anon table access**
- Token validation: hex length, active, not revoked, not expired, campaign `active`
- Submit allowlists columns from campaign `allowlisted_fields`
- Locked fields never writable via RPC
- Audit: `campaign.create`, `campaign.tokens.issue`, `campaign.submit`, `campaign.resume_upload`, token disable/extend/regenerate
- Soft rate limit: 8s between resubmits
- Portal: `noindex,nofollow`

---

## 6. Services / APIs / UI Added

| Area | Path |
|------|------|
| Helper | `src/lib/academicBatch.ts` |
| Staff API | `src/api/placement/studentUpdateCampaigns.ts` |
| Students API | Extended filters + academic/dossier fields |
| Import | New column aliases |
| Permissions | `campaigns:view`, `campaigns:manage` |
| Pages | `StudentUpdateCampaignsPage`, `Create`, `Detail`, `StudentUpdatePortalPage` |
| Routes | Role-prefixed campaign routes + `/student/update/$token` |

---

## 7. Performance

- Campaign token insert chunked (200)
- Recipient resolution paginates `listStudents` (cap 2000)
- Detail page loads tokens then students by id set
- Suitable for 400+ recipients; very large cohorts should use tighter filters

---

## 8. Known Limitations

1. **Email Resend** — UI stub only (no send pipeline)
2. **Faculty** — view campaigns only; cannot create/manage
3. **Resume upload** requires migration storage policies for `campaign/{token}/…`
4. **Advanced filters** (resume/coding) post-filter current page results after SQL query — for large cohorts prefer academic batch / branch filters first
5. **Section** is optional free text (no master table)
6. Until migrations are applied on hosted DB, campaign RPCs / new columns will error

---

## 9. Recommendations (next release)

- Email/SMS delivery + delivery audit
- Campaign analytics charts
- Optional single-submit lock after first submit
- Align storage staff policies with `students:*` permission strings
- Academic batch master table if institutions need controlled dropdowns

---

## 10. Acceptance Checklist

| Criterion | Status |
|-----------|--------|
| No module rewrite | Met |
| UI native to CodeTrace | Met |
| Secure public endpoints | Met (RPC-only writes) |
| Safe migrations | Met (IF NOT EXISTS + backfill) |
| Build / typecheck | Met |
| Hosted SQL apply required | Documented |
