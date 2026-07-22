-- Faculty can evaluate communication + create tech catalog subjects.
-- Safe to re-run.

DROP POLICY IF EXISTS "tpo admin manage communication evaluations" ON public.communication_evaluations;
DROP POLICY IF EXISTS "staff manage communication evaluations" ON public.communication_evaluations;
CREATE POLICY "staff manage communication evaluations"
  ON public.communication_evaluations
  FOR ALL
  USING (public.current_app_role() IN ('admin', 'tpo', 'faculty'))
  WITH CHECK (public.current_app_role() IN ('admin', 'tpo', 'faculty'));

DROP POLICY IF EXISTS "tpo admin manage tech skills" ON public.tech_skills;
DROP POLICY IF EXISTS "staff manage tech skills catalog" ON public.tech_skills;
CREATE POLICY "staff manage tech skills catalog"
  ON public.tech_skills
  FOR ALL
  USING (public.current_app_role() IN ('admin', 'tpo', 'faculty'))
  WITH CHECK (public.current_app_role() IN ('admin', 'tpo', 'faculty'));
