
-- Expenses table for tracking facility outflows
CREATE TABLE public.expenses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  facility_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  category text NOT NULL,
  description text,
  amount integer NOT NULL DEFAULT 0,
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read expenses" ON public.expenses FOR SELECT USING (true);
CREATE POLICY "Public insert expenses" ON public.expenses FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update expenses" ON public.expenses FOR UPDATE USING (true);
CREATE POLICY "Public delete expenses" ON public.expenses FOR DELETE USING (true);

-- Facility schedules table for per-day working hours
CREATE TABLE public.facility_schedules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  facility_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  is_open boolean NOT NULL DEFAULT true,
  open_time time NOT NULL DEFAULT '08:00',
  close_time time NOT NULL DEFAULT '23:00',
  UNIQUE (facility_id, day_of_week)
);

ALTER TABLE public.facility_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read facility_schedules" ON public.facility_schedules FOR SELECT USING (true);
CREATE POLICY "Public insert facility_schedules" ON public.facility_schedules FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update facility_schedules" ON public.facility_schedules FOR UPDATE USING (true);
CREATE POLICY "Public delete facility_schedules" ON public.facility_schedules FOR DELETE USING (true);

-- Seed default schedules (Mon=1 to Sun=0 in JS, but here 0=Mon...6=Sun)
INSERT INTO public.facility_schedules (facility_id, day_of_week, is_open, open_time, close_time) VALUES
  ('00000000-0000-0000-0000-000000000001', 0, true, '18:00', '23:00'),
  ('00000000-0000-0000-0000-000000000001', 1, true, '18:00', '23:00'),
  ('00000000-0000-0000-0000-000000000001', 2, true, '18:00', '23:00'),
  ('00000000-0000-0000-0000-000000000001', 3, true, '18:00', '23:00'),
  ('00000000-0000-0000-0000-000000000001', 4, true, '18:00', '23:00'),
  ('00000000-0000-0000-0000-000000000001', 5, true, '09:00', '18:00'),
  ('00000000-0000-0000-0000-000000000001', 6, true, '09:00', '18:00');
