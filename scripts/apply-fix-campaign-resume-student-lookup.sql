-- =============================================================================
-- DO NOT RUN THIS SCRIPT
-- =============================================================================
-- It strips allowlist enforcement and loosens resume attach to any active student
-- (IDOR). Superseded by:
--   scripts/apply-campaign-link-hardening.sql
-- =============================================================================

SELECT 'DO NOT RUN apply-fix-campaign-resume-student-lookup.sql — use apply-campaign-link-hardening.sql instead'
  AS warning;
