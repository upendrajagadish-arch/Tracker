-- =============================================================================
-- DO NOT RUN for production hardening.
-- Prefer scripts/apply-campaign-link-hardening.sql
-- This older resume fix may re-open anon storage SELECT on campaign-reg/.
-- =============================================================================
SELECT 'Use apply-campaign-link-hardening.sql instead of apply-fix-campaign-registration-resume.sql'
  AS warning;
