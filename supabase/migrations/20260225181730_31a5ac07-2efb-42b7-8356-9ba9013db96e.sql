
-- 1. Role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'player');

-- 2. Facilities
CREATE TABLE public.facilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  open_time TIME NOT NULL DEFAULT '08:00',
  close_time TIME NOT NULL DEFAULT '23:00',
  location TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.facilities ENABLE ROW LEVEL SECURITY;

-- 3. Sports
CREATE TABLE public.sports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '⚽'
);
ALTER TABLE public.sports ENABLE ROW LEVEL SECURITY;

-- 4. Courts
CREATE TABLE public.courts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  sport_id UUID NOT NULL REFERENCES public.sports(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  surface TEXT,
  price_per_hour INTEGER NOT NULL DEFAULT 0,
  features TEXT[] DEFAULT '{}',
  image TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.courts ENABLE ROW LEVEL SECURITY;

-- 5. Addons
CREATE TABLE public.addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price INTEGER NOT NULL DEFAULT 0,
  icon TEXT NOT NULL DEFAULT '📦',
  requires_stock BOOLEAN NOT NULL DEFAULT false
);
ALTER TABLE public.addons ENABLE ROW LEVEL SECURITY;

-- 6. Bookings
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  court_id UUID NOT NULL REFERENCES public.courts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  total_price INTEGER NOT NULL DEFAULT 0,
  deposit_amount INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','cancelled')),
  payment_status TEXT NOT NULL DEFAULT 'none' CHECK (payment_status IN ('none','partial','full')),
  booking_type TEXT NOT NULL DEFAULT 'online' CHECK (booking_type IN ('online','manual','fixed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- 7. Booking addons
CREATE TABLE public.booking_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  addon_id UUID NOT NULL REFERENCES public.addons(id) ON DELETE CASCADE
);
ALTER TABLE public.booking_addons ENABLE ROW LEVEL SECURITY;

-- 8. User roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  facility_id UUID REFERENCES public.facilities(id) ON DELETE CASCADE,
  UNIQUE(user_id, role, facility_id)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 9. Helper: has_role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- 10. Helper: is_facility_admin
CREATE OR REPLACE FUNCTION public.is_facility_admin(_user_id UUID, _facility_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin' AND facility_id = _facility_id
  ) OR EXISTS (
    SELECT 1 FROM public.facilities WHERE id = _facility_id AND owner_id = _user_id
  )
$$;

-- 11. RLS Policies

-- Facilities: everyone can read, admins can manage
CREATE POLICY "Anyone can view facilities" ON public.facilities FOR SELECT USING (true);
CREATE POLICY "Facility admins can insert" ON public.facilities FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Facility admins can update" ON public.facilities FOR UPDATE USING (public.is_facility_admin(auth.uid(), id));
CREATE POLICY "Facility admins can delete" ON public.facilities FOR DELETE USING (public.is_facility_admin(auth.uid(), id));

-- Sports: everyone can read
CREATE POLICY "Anyone can view sports" ON public.sports FOR SELECT USING (true);
CREATE POLICY "Admins can manage sports" ON public.sports FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Courts: everyone can read, facility admins manage
CREATE POLICY "Anyone can view courts" ON public.courts FOR SELECT USING (true);
CREATE POLICY "Facility admins can insert courts" ON public.courts FOR INSERT WITH CHECK (public.is_facility_admin(auth.uid(), facility_id));
CREATE POLICY "Facility admins can update courts" ON public.courts FOR UPDATE USING (public.is_facility_admin(auth.uid(), facility_id));
CREATE POLICY "Facility admins can delete courts" ON public.courts FOR DELETE USING (public.is_facility_admin(auth.uid(), facility_id));

-- Addons: everyone can read, facility admins manage
CREATE POLICY "Anyone can view addons" ON public.addons FOR SELECT USING (true);
CREATE POLICY "Facility admins can insert addons" ON public.addons FOR INSERT WITH CHECK (public.is_facility_admin(auth.uid(), facility_id));
CREATE POLICY "Facility admins can update addons" ON public.addons FOR UPDATE USING (public.is_facility_admin(auth.uid(), facility_id));
CREATE POLICY "Facility admins can delete addons" ON public.addons FOR DELETE USING (public.is_facility_admin(auth.uid(), facility_id));

-- Bookings: players see own, admins see facility's
CREATE POLICY "Users can view own bookings" ON public.bookings FOR SELECT USING (
  auth.uid() = user_id OR public.is_facility_admin(auth.uid(), (SELECT facility_id FROM public.courts WHERE id = court_id))
);
CREATE POLICY "Authenticated can create bookings" ON public.bookings FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can update bookings" ON public.bookings FOR UPDATE USING (
  public.is_facility_admin(auth.uid(), (SELECT facility_id FROM public.courts WHERE id = court_id))
);
CREATE POLICY "Admins can delete bookings" ON public.bookings FOR DELETE USING (
  public.is_facility_admin(auth.uid(), (SELECT facility_id FROM public.courts WHERE id = court_id))
);

-- Booking addons
CREATE POLICY "View booking addons" ON public.booking_addons FOR SELECT USING (true);
CREATE POLICY "Create booking addons" ON public.booking_addons FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- User roles: own only
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- Enable realtime for bookings
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
