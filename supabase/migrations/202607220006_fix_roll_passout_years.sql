-- Fill missing pass-out years only. Never overwrite an existing graduation_year
-- (keeps 2028 students in 2028, not moved to another year).

UPDATE public.student_profiles sp
SET graduation_year = COALESCE(
  sp.graduation_year,
  NULLIF(substring(COALESCE(sp.academic_batch, '') FROM '^([0-9]{4})$'), '')::int
)
WHERE sp.is_active = true
  AND sp.graduation_year IS NULL
  AND COALESCE(sp.academic_batch, '') ~ '^[0-9]{4}$'
  AND COALESCE(sp.academic_batch, '')::int BETWEEN 2027 AND 2035;

UPDATE public.student_profiles sp
SET graduation_year = COALESCE(
  sp.graduation_year,
  NULLIF(substring(COALESCE(sp.academic_batch, '') FROM '([0-9]{4})[[:space:]]*$'), '')::int
)
WHERE sp.is_active = true
  AND sp.graduation_year IS NULL
  AND COALESCE(sp.academic_batch, '') ~ '^[0-9]{4}[[:space:]]*[-–][[:space:]]*[0-9]{4}$';

UPDATE public.student_profiles sp
SET graduation_year = COALESCE(
  sp.graduation_year,
  (2000 + NULLIF(substring(sp.roll_number FROM '^([0-9]{2})'), '')::int + 4)
)
WHERE sp.is_active = true
  AND sp.graduation_year IS NULL
  AND sp.roll_number ~ '^[0-9]{2}[A-Za-z]'
  AND (2000 + NULLIF(substring(sp.roll_number FROM '^([0-9]{2})'), '')::int + 4)
      BETWEEN 2027 AND 2035;

UPDATE public.student_profiles sp
SET academic_batch = (sp.graduation_year - 4)::text || '-' || sp.graduation_year::text
WHERE sp.is_active = true
  AND sp.graduation_year IS NOT NULL
  AND (
    sp.academic_batch IS NULL
    OR btrim(sp.academic_batch) = ''
    OR sp.academic_batch ~ '^[0-9]{4}$'
  );
