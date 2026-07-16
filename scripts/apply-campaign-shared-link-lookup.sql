CREATE OR REPLACE FUNCTION public.resolve_public_campaign_student_token(
  p_campaign_id uuid,
  p_roll_number text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c public.student_update_campaigns%ROWTYPE;
  student_id uuid;
  token_row public.student_update_tokens%ROWTYPE;
  clean_roll text := upper(trim(COALESCE(p_roll_number, '')));
BEGIN
  IF p_campaign_id IS NULL OR clean_roll = '' THEN
    RETURN NULL;
  END IF;

  SELECT * INTO c
  FROM public.student_update_campaigns
  WHERE id = p_campaign_id;

  IF NOT FOUND OR c.status <> 'active' THEN
    RETURN NULL;
  END IF;

  IF c.expires_at IS NOT NULL AND c.expires_at <= now() THEN
    RETURN NULL;
  END IF;

  SELECT id INTO student_id
  FROM public.student_profiles
  WHERE is_active = true
    AND upper(trim(roll_number)) = clean_roll
  LIMIT 1;

  IF student_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT * INTO token_row
  FROM public.student_update_tokens
  WHERE campaign_id = c.id
    AND student_profile_id = student_id
    AND is_active = true
    AND revoked_at IS NULL
    AND expires_at > now()
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN token_row.token;
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_public_campaign_student_token(uuid, text) TO anon, authenticated;
