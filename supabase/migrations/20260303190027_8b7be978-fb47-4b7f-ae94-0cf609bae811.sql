
-- Add slug to facilities
ALTER TABLE public.facilities ADD COLUMN IF NOT EXISTS slug text;
CREATE UNIQUE INDEX IF NOT EXISTS facilities_slug_unique ON public.facilities (slug);

-- Slug generation function
CREATE OR REPLACE FUNCTION public.generate_slug(input text)
RETURNS text LANGUAGE plpgsql AS $$
DECLARE base_slug text; final_slug text; counter integer := 0;
BEGIN
  base_slug := lower(regexp_replace(regexp_replace(translate(input, 'áéíóúñÁÉÍÓÚÑ', 'aeiounAEIOUN'), '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g'));
  base_slug := trim(both '-' from base_slug);
  IF base_slug = '' THEN base_slug := 'predio'; END IF;
  final_slug := base_slug;
  WHILE EXISTS (SELECT 1 FROM public.facilities WHERE slug = final_slug) LOOP
    counter := counter + 1; final_slug := base_slug || '-' || counter;
  END LOOP;
  RETURN final_slug;
END; $$;

-- Auto-set slug trigger
CREATE OR REPLACE FUNCTION public.set_facility_slug() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' OR (TG_OP = 'UPDATE' AND NEW.name IS DISTINCT FROM OLD.name) THEN
    NEW.slug := public.generate_slug(NEW.name);
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS set_facility_slug_trigger ON public.facilities;
CREATE TRIGGER set_facility_slug_trigger BEFORE INSERT OR UPDATE ON public.facilities
FOR EACH ROW EXECUTE FUNCTION public.set_facility_slug();

-- Update existing facilities
UPDATE public.facilities SET slug = public.generate_slug(name) WHERE slug IS NULL;

-- Create facility for new user (during registration)
CREATE OR REPLACE FUNCTION public.create_facility_for_user(p_name text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE new_id uuid;
BEGIN
  INSERT INTO public.facilities (name, owner_id) VALUES (p_name, auth.uid()) RETURNING id INTO new_id;
  INSERT INTO public.user_roles (user_id, role, facility_id) VALUES (auth.uid(), 'admin', new_id);
  FOR i IN 0..6 LOOP
    INSERT INTO public.facility_schedules (facility_id, day_of_week, is_open) VALUES (new_id, i, true);
  END LOOP;
  RETURN new_id;
END; $$;

-- Get user facility
CREATE OR REPLACE FUNCTION public.get_user_facility_id(p_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT facility_id FROM public.user_roles WHERE user_id = p_user_id AND role = 'admin' LIMIT 1;
$$;

-- Unique constraint for schedule upsert
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'facility_schedules_facility_day_unique') THEN
    ALTER TABLE public.facility_schedules ADD CONSTRAINT facility_schedules_facility_day_unique UNIQUE (facility_id, day_of_week);
  END IF;
END $$;
