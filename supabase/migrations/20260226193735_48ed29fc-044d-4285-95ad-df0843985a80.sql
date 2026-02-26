
-- Add contact fields to bookings
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS user_email text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS user_phone text;

-- Atomic booking creation with concurrency check
CREATE OR REPLACE FUNCTION public.create_booking(
  p_court_id uuid, p_start_time timestamptz, p_end_time timestamptz,
  p_user_name text, p_user_email text, p_user_phone text,
  p_total_price integer, p_deposit_amount integer, p_payment_status text,
  p_booking_type text DEFAULT 'online', p_addon_ids uuid[] DEFAULT '{}'
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid; v_aid uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM bookings WHERE court_id = p_court_id AND status != 'cancelled' AND start_time < p_end_time AND end_time > p_start_time) THEN
    RAISE EXCEPTION 'SLOT_TAKEN';
  END IF;
  INSERT INTO bookings (court_id, start_time, end_time, user_name, user_email, user_phone, total_price, deposit_amount, payment_status, booking_type, status)
  VALUES (p_court_id, p_start_time, p_end_time, p_user_name, p_user_email, p_user_phone, p_total_price, p_deposit_amount, p_payment_status, p_booking_type, 'confirmed')
  RETURNING id INTO v_id;
  FOREACH v_aid IN ARRAY p_addon_ids LOOP
    INSERT INTO booking_addons (booking_id, addon_id) VALUES (v_id, v_aid);
  END LOOP;
  RETURN v_id;
END; $$;

-- Open up bookings for MVP (no auth yet)
DROP POLICY IF EXISTS "Authenticated can create bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can view own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admins can update bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admins can delete bookings" ON public.bookings;
CREATE POLICY "Public read bookings" ON public.bookings FOR SELECT USING (true);
CREATE POLICY "Public insert bookings" ON public.bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update bookings" ON public.bookings FOR UPDATE USING (true);
CREATE POLICY "Public delete bookings" ON public.bookings FOR DELETE USING (true);

-- Open up booking_addons
DROP POLICY IF EXISTS "Create booking addons" ON public.booking_addons;
CREATE POLICY "Public insert booking_addons" ON public.booking_addons FOR INSERT WITH CHECK (true);

-- Open up courts/sports/addons for admin CRUD (MVP)
DROP POLICY IF EXISTS "Facility admins can insert courts" ON public.courts;
DROP POLICY IF EXISTS "Facility admins can update courts" ON public.courts;
DROP POLICY IF EXISTS "Facility admins can delete courts" ON public.courts;
CREATE POLICY "Public insert courts" ON public.courts FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update courts" ON public.courts FOR UPDATE USING (true);
CREATE POLICY "Public delete courts" ON public.courts FOR DELETE USING (true);

DROP POLICY IF EXISTS "Admins can manage sports" ON public.sports;
CREATE POLICY "Public manage sports" ON public.sports FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Facility admins can insert addons" ON public.addons;
DROP POLICY IF EXISTS "Facility admins can update addons" ON public.addons;
DROP POLICY IF EXISTS "Facility admins can delete addons" ON public.addons;
CREATE POLICY "Public insert addons" ON public.addons FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update addons" ON public.addons FOR UPDATE USING (true);
CREATE POLICY "Public delete addons" ON public.addons FOR DELETE USING (true);
