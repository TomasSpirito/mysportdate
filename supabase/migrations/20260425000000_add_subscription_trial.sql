-- ============================================================
-- Migration: Free trial + subscription system for facilities
-- ============================================================

-- 1. New columns on facilities
ALTER TABLE public.facilities
  ADD COLUMN IF NOT EXISTS trial_ends_at          timestamptz,
  ADD COLUMN IF NOT EXISTS subscription_status    text DEFAULT 'trial'
    CONSTRAINT facilities_subscription_status_check
    CHECK (subscription_status IN ('trial', 'active', 'expired', 'cancelled')),
  ADD COLUMN IF NOT EXISTS subscription_expires_at timestamptz;

-- 2. Backfill existing facilities
--    Facilities created < 14 days ago stay in 'trial'; older ones are 'expired'
--    so you can manually flip them to 'active' once they pay.
UPDATE public.facilities
SET
  trial_ends_at       = created_at + interval '14 days',
  subscription_status = CASE
    WHEN created_at + interval '14 days' > now() THEN 'trial'
    ELSE 'expired'
  END
WHERE trial_ends_at IS NULL;

-- 3. Updated create_facility_for_user — sets 14-day trial on every new signup
CREATE OR REPLACE FUNCTION public.create_facility_for_user(p_name text)
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE new_id uuid;
BEGIN
  INSERT INTO public.facilities (name, owner_id, trial_ends_at, subscription_status)
  VALUES (p_name, auth.uid(), now() + interval '14 days', 'trial')
  RETURNING id INTO new_id;

  INSERT INTO public.user_roles (user_id, role, facility_id)
  VALUES (auth.uid(), 'admin', new_id);

  FOR i IN 0..6 LOOP
    INSERT INTO public.facility_schedules (facility_id, day_of_week, is_open)
    VALUES (new_id, i, true);
  END LOOP;

  RETURN new_id;
END;
$$;

-- 4. Helper: returns true when a facility has active access (trial OR paid subscription)
CREATE OR REPLACE FUNCTION public.facility_has_access(p_facility_id uuid)
  RETURNS boolean
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  v_status            text;
  v_trial_ends_at     timestamptz;
  v_subscription_exp  timestamptz;
BEGIN
  SELECT subscription_status, trial_ends_at, subscription_expires_at
  INTO   v_status, v_trial_ends_at, v_subscription_exp
  FROM   public.facilities
  WHERE  id = p_facility_id;

  IF NOT FOUND THEN RETURN false; END IF;

  -- Active paid subscription (no expiry = unlimited)
  IF v_status = 'active'
     AND (v_subscription_exp IS NULL OR v_subscription_exp > now())
  THEN RETURN true; END IF;

  -- Active free trial
  IF v_status = 'trial'
     AND v_trial_ends_at IS NOT NULL
     AND v_trial_ends_at > now()
  THEN RETURN true; END IF;

  RETURN false;
END;
$$;

GRANT ALL ON FUNCTION public.facility_has_access(uuid) TO anon;
GRANT ALL ON FUNCTION public.facility_has_access(uuid) TO authenticated;
GRANT ALL ON FUNCTION public.facility_has_access(uuid) TO service_role;
