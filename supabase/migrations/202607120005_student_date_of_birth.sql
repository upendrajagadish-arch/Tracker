ALTER TABLE public.student_profiles
  ADD COLUMN IF NOT EXISTS date_of_birth date;

COMMENT ON COLUMN public.student_profiles.date_of_birth IS 'Student date of birth for placement records and bulk import validation';
