


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."app_role" AS ENUM (
    'admin',
    'player'
);


ALTER TYPE "public"."app_role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_booking"("p_court_id" "uuid", "p_start_time" timestamp with time zone, "p_end_time" timestamp with time zone, "p_user_name" "text", "p_user_email" "text", "p_user_phone" "text", "p_total_price" integer, "p_deposit_amount" integer, "p_payment_status" "text", "p_booking_type" "text" DEFAULT 'online'::"text", "p_addon_ids" "uuid"[] DEFAULT '{}'::"uuid"[]) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE v_id uuid; v_aid uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM bookings WHERE court_id = p_court_id AND status != 'cancelled'
    AND start_time < p_end_time AND end_time > p_start_time) THEN
    RAISE EXCEPTION 'SLOT_TAKEN';
  END IF;
  INSERT INTO bookings (court_id, start_time, end_time, user_name, user_email, user_phone,
    total_price, deposit_amount, payment_status, booking_type, status)
  VALUES (p_court_id, p_start_time, p_end_time, p_user_name, p_user_email, p_user_phone,
    p_total_price, p_deposit_amount, p_payment_status, p_booking_type, 'confirmed')
  RETURNING id INTO v_id;
  FOREACH v_aid IN ARRAY p_addon_ids LOOP
    INSERT INTO booking_addons (booking_id, addon_id) VALUES (v_id, v_aid);
  END LOOP;
  RETURN v_id;
END; $$;


ALTER FUNCTION "public"."create_booking"("p_court_id" "uuid", "p_start_time" timestamp with time zone, "p_end_time" timestamp with time zone, "p_user_name" "text", "p_user_email" "text", "p_user_phone" "text", "p_total_price" integer, "p_deposit_amount" integer, "p_payment_status" "text", "p_booking_type" "text", "p_addon_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_facility_for_user"("p_name" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE new_id uuid;
BEGIN
  INSERT INTO public.facilities (name, owner_id) VALUES (p_name, auth.uid()) RETURNING id INTO new_id;
  INSERT INTO public.user_roles (user_id, role, facility_id) VALUES (auth.uid(), 'admin', new_id);
  FOR i IN 0..6 LOOP
    INSERT INTO public.facility_schedules (facility_id, day_of_week, is_open) VALUES (new_id, i, true);
  END LOOP;
  RETURN new_id;
END; $$;


ALTER FUNCTION "public"."create_facility_for_user"("p_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_slug"("input" "text") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE base_slug text; final_slug text; counter integer := 0;
BEGIN
  base_slug := lower(regexp_replace(regexp_replace(
    translate(input, 'áéíóúñÁÉÍÓÚÑ', 'aeiounAEIOUN'),
    '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g'));
  base_slug := trim(both '-' from base_slug);
  IF base_slug = '' THEN base_slug := 'predio'; END IF;
  final_slug := base_slug;
  WHILE EXISTS (SELECT 1 FROM public.facilities WHERE slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  RETURN final_slug;
END; $$;


ALTER FUNCTION "public"."generate_slug"("input" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_facility_id"("p_user_id" "uuid") RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT facility_id FROM public.user_roles WHERE user_id = p_user_id AND role = 'admin' LIMIT 1
$$;


ALTER FUNCTION "public"."get_user_facility_id"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;


ALTER FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_facility_admin"("_user_id" "uuid", "_facility_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin' AND facility_id = _facility_id
  ) OR EXISTS (
    SELECT 1 FROM public.facilities WHERE id = _facility_id AND owner_id = _user_id
  )
$$;


ALTER FUNCTION "public"."is_facility_admin"("_user_id" "uuid", "_facility_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."revert_stock_on_expense_delete"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_product_id UUID;
    v_quantity INTEGER;
BEGIN
    IF OLD.buffet_purchase_id IS NOT NULL THEN
        SELECT product_id, quantity INTO v_product_id, v_quantity 
        FROM buffet_purchases WHERE id = OLD.buffet_purchase_id;
        
        IF FOUND THEN
            -- Devolvemos el stock al inventario
            UPDATE buffet_products SET stock = GREATEST(0, stock - v_quantity) WHERE id = v_product_id;
            -- Borramos la compra silenciosamente
            DELETE FROM buffet_purchases WHERE id = OLD.buffet_purchase_id;
        END IF;
    END IF;
    RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."revert_stock_on_expense_delete"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_facility_slug"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' OR (TG_OP = 'UPDATE' AND NEW.name IS DISTINCT FROM OLD.name) THEN
    NEW.slug := public.generate_slug(NEW.name);
  END IF;
  RETURN NEW;
END; $$;


ALTER FUNCTION "public"."set_facility_slug"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_purchase_to_expenses"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    prod_name TEXT;
BEGIN
    SELECT name INTO prod_name FROM buffet_products WHERE id = NEW.product_id;
    
    INSERT INTO expenses (facility_id, category, description, amount, expense_date, buffet_purchase_id, payment_method)
    VALUES (
        NEW.facility_id, 
        'buffet_insumos', 
        'Compra: ' || prod_name || '  Stock: ' || NEW.quantity, 
        NEW.total_price, 
        DATE(NEW.created_at),
        NEW.id,
        NEW.payment_method -- ¡Acá ocurre la magia de traspaso de datos!
    );
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_purchase_to_expenses"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_buffet_stock_on_purchase"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE buffet_products
  SET stock = stock + NEW.quantity
  WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_buffet_stock_on_purchase"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."addons" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "facility_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "price" integer DEFAULT 0 NOT NULL,
    "requires_stock" boolean DEFAULT false NOT NULL,
    "icon" "text" DEFAULT '📦'::"text" NOT NULL
);


ALTER TABLE "public"."addons" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."booking_addons" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "booking_id" "uuid" NOT NULL,
    "addon_id" "uuid" NOT NULL
);


ALTER TABLE "public"."booking_addons" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bookings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "court_id" "uuid" NOT NULL,
    "start_time" timestamp with time zone NOT NULL,
    "end_time" timestamp with time zone NOT NULL,
    "user_name" "text",
    "user_email" "text",
    "user_phone" "text",
    "user_id" "uuid",
    "total_price" integer DEFAULT 0 NOT NULL,
    "deposit_amount" integer DEFAULT 0 NOT NULL,
    "payment_status" "text" DEFAULT 'none'::"text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "booking_type" "text" DEFAULT 'online'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "payment_method" "text",
    "cancellation_token" "uuid" DEFAULT "gen_random_uuid"(),
    "cancelled_at" timestamp with time zone,
    "cancellation_reason" "text",
    "refund_status" "text"
);


ALTER TABLE "public"."bookings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."buffet_products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "facility_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "category" "text" NOT NULL,
    "price" numeric NOT NULL,
    "stock" integer DEFAULT 0 NOT NULL,
    "image_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "low_stock_limit" integer DEFAULT 10
);


ALTER TABLE "public"."buffet_products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."buffet_purchases" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "facility_id" "uuid",
    "product_id" "uuid",
    "quantity" integer NOT NULL,
    "unit_price" numeric(12,2) NOT NULL,
    "total_price" numeric(12,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "payment_method" "text" DEFAULT 'efectivo'::"text"
);


ALTER TABLE "public"."buffet_purchases" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."buffet_sale_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sale_id" "uuid",
    "product_id" "uuid",
    "product_name" "text" NOT NULL,
    "quantity" integer NOT NULL,
    "unit_price" numeric NOT NULL
);


ALTER TABLE "public"."buffet_sale_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."buffet_sales" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "facility_id" "uuid" NOT NULL,
    "total" numeric NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "payment_method" "text"
);


ALTER TABLE "public"."buffet_sales" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."courts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "facility_id" "uuid" NOT NULL,
    "sport_id" "uuid",
    "name" "text" NOT NULL,
    "price_per_hour" integer DEFAULT 0 NOT NULL,
    "surface" "text",
    "image" "text",
    "features" "text"[] DEFAULT '{}'::"text"[],
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "image_url" "text",
    "shared_group_id" "uuid" DEFAULT "gen_random_uuid"(),
    "is_event" boolean DEFAULT false,
    "event_includes" "text",
    "duration_minutes" integer DEFAULT 60
);


ALTER TABLE "public"."courts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."expenses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "facility_id" "uuid" NOT NULL,
    "category" "text" NOT NULL,
    "amount" integer DEFAULT 0 NOT NULL,
    "description" "text",
    "expense_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "buffet_purchase_id" "uuid",
    "payment_method" "text"
);


ALTER TABLE "public"."expenses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."facilities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text" NOT NULL,
    "open_time" time without time zone DEFAULT '08:00:00'::time without time zone NOT NULL,
    "close_time" time without time zone DEFAULT '23:00:00'::time without time zone NOT NULL,
    "owner_id" "uuid",
    "location" "text",
    "phone" "text",
    "email" "text",
    "whatsapp" "text",
    "slug" "text",
    "logo_url" "text",
    "cover_url" "text",
    "description" "text",
    "maps_url" "text",
    "instagram_url" "text",
    "amenities" "text"[] DEFAULT '{}'::"text"[],
    "requires_deposit" boolean DEFAULT false,
    "deposit_percentage" integer DEFAULT 50,
    "mp_connected" boolean DEFAULT false,
    "mp_access_token" "text",
    "mp_refresh_token" "text",
    "mp_user_id" "text",
    "cancellation_window_hours" integer DEFAULT 12,
    "default_event_duration" integer DEFAULT 180,
    "default_event_includes" "text",
    "has_events" boolean DEFAULT false,
    "default_event_price" numeric DEFAULT 0,
    "holiday_open_time" time without time zone DEFAULT '12:00:00'::time without time zone,
    "holiday_close_time" time without time zone DEFAULT '23:00:00'::time without time zone,
    "event_open_time" time without time zone DEFAULT '12:00:00'::time without time zone,
    "event_close_time" time without time zone DEFAULT '23:00:00'::time without time zone
);


ALTER TABLE "public"."facilities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."facility_schedule_exceptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "facility_id" "uuid",
    "exception_date" "date" NOT NULL,
    "is_open" boolean DEFAULT true,
    "open_time" time without time zone,
    "close_time" time without time zone,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"())
);


ALTER TABLE "public"."facility_schedule_exceptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."facility_schedules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "facility_id" "uuid" NOT NULL,
    "day_of_week" integer NOT NULL,
    "is_open" boolean DEFAULT true NOT NULL,
    "open_time" time without time zone DEFAULT '08:00:00'::time without time zone NOT NULL,
    "close_time" time without time zone DEFAULT '23:00:00'::time without time zone NOT NULL
);


ALTER TABLE "public"."facility_schedules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."holidays" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "facility_id" "uuid",
    "date" "date" NOT NULL,
    "label" "text",
    "is_closed" boolean DEFAULT false,
    "custom_open_time" time without time zone,
    "custom_close_time" time without time zone
);


ALTER TABLE "public"."holidays" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "icon" "text" DEFAULT '⚽'::"text" NOT NULL
);


ALTER TABLE "public"."sports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "public"."app_role" NOT NULL,
    "facility_id" "uuid"
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


ALTER TABLE ONLY "public"."addons"
    ADD CONSTRAINT "addons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."booking_addons"
    ADD CONSTRAINT "booking_addons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."buffet_products"
    ADD CONSTRAINT "buffet_products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."buffet_purchases"
    ADD CONSTRAINT "buffet_purchases_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."buffet_sale_items"
    ADD CONSTRAINT "buffet_sale_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."buffet_sales"
    ADD CONSTRAINT "buffet_sales_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."courts"
    ADD CONSTRAINT "courts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."facilities"
    ADD CONSTRAINT "facilities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."facilities"
    ADD CONSTRAINT "facilities_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."facility_schedule_exceptions"
    ADD CONSTRAINT "facility_schedule_exceptions_facility_id_exception_date_key" UNIQUE ("facility_id", "exception_date");



ALTER TABLE ONLY "public"."facility_schedule_exceptions"
    ADD CONSTRAINT "facility_schedule_exceptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."facility_schedules"
    ADD CONSTRAINT "facility_schedules_facility_day_unique" UNIQUE ("facility_id", "day_of_week");



ALTER TABLE ONLY "public"."facility_schedules"
    ADD CONSTRAINT "facility_schedules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."holidays"
    ADD CONSTRAINT "holidays_facility_id_date_key" UNIQUE ("facility_id", "date");



ALTER TABLE ONLY "public"."holidays"
    ADD CONSTRAINT "holidays_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sports"
    ADD CONSTRAINT "sports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_role_key" UNIQUE ("user_id", "role");







CREATE OR REPLACE TRIGGER "set_facility_slug_trigger" BEFORE INSERT OR UPDATE ON "public"."facilities" FOR EACH ROW EXECUTE FUNCTION "public"."set_facility_slug"();



CREATE OR REPLACE TRIGGER "tr_revert_stock_on_expense_delete" AFTER DELETE ON "public"."expenses" FOR EACH ROW EXECUTE FUNCTION "public"."revert_stock_on_expense_delete"();



CREATE OR REPLACE TRIGGER "tr_sync_purchase_to_expenses" AFTER INSERT ON "public"."buffet_purchases" FOR EACH ROW EXECUTE FUNCTION "public"."sync_purchase_to_expenses"();



CREATE OR REPLACE TRIGGER "tr_update_stock_after_purchase" AFTER INSERT ON "public"."buffet_purchases" FOR EACH ROW EXECUTE FUNCTION "public"."update_buffet_stock_on_purchase"();



ALTER TABLE ONLY "public"."addons"
    ADD CONSTRAINT "addons_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."booking_addons"
    ADD CONSTRAINT "booking_addons_addon_id_fkey" FOREIGN KEY ("addon_id") REFERENCES "public"."addons"("id");



ALTER TABLE ONLY "public"."booking_addons"
    ADD CONSTRAINT "booking_addons_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_court_id_fkey" FOREIGN KEY ("court_id") REFERENCES "public"."courts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."buffet_purchases"
    ADD CONSTRAINT "buffet_purchases_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."buffet_purchases"
    ADD CONSTRAINT "buffet_purchases_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."buffet_products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."buffet_sale_items"
    ADD CONSTRAINT "buffet_sale_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."buffet_products"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."buffet_sale_items"
    ADD CONSTRAINT "buffet_sale_items_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "public"."buffet_sales"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."courts"
    ADD CONSTRAINT "courts_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."courts"
    ADD CONSTRAINT "courts_sport_id_fkey" FOREIGN KEY ("sport_id") REFERENCES "public"."sports"("id");



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_buffet_purchase_id_fkey" FOREIGN KEY ("buffet_purchase_id") REFERENCES "public"."buffet_purchases"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."facilities"
    ADD CONSTRAINT "facilities_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."facility_schedule_exceptions"
    ADD CONSTRAINT "facility_schedule_exceptions_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."facility_schedules"
    ADD CONSTRAINT "facility_schedules_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."holidays"
    ADD CONSTRAINT "holidays_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Anyone can view addons" ON "public"."addons" FOR SELECT USING (true);



CREATE POLICY "Anyone can view courts" ON "public"."courts" FOR SELECT USING (true);



CREATE POLICY "Anyone can view facilities" ON "public"."facilities" FOR SELECT USING (true);



CREATE POLICY "Anyone can view sports" ON "public"."sports" FOR SELECT USING (true);



CREATE POLICY "Facility admins can delete" ON "public"."facilities" FOR DELETE USING ("public"."is_facility_admin"("auth"."uid"(), "id"));



CREATE POLICY "Facility admins can insert" ON "public"."facilities" FOR INSERT WITH CHECK (("auth"."uid"() = "owner_id"));



CREATE POLICY "Facility admins can update" ON "public"."facilities" FOR UPDATE USING ("public"."is_facility_admin"("auth"."uid"(), "id"));



CREATE POLICY "Permitir todo a usuarios logueados" ON "public"."buffet_products" TO "authenticated" USING (true);



CREATE POLICY "Permitir todo a usuarios logueados" ON "public"."buffet_purchases" TO "authenticated" USING (true);



CREATE POLICY "Permitir todo a usuarios logueados" ON "public"."buffet_sale_items" TO "authenticated" USING (true);



CREATE POLICY "Permitir todo a usuarios logueados" ON "public"."buffet_sales" TO "authenticated" USING (true);



CREATE POLICY "Permitir ver productos al publico" ON "public"."buffet_products" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Public delete addons" ON "public"."addons" FOR DELETE USING (true);



CREATE POLICY "Public delete bookings" ON "public"."bookings" FOR DELETE USING (true);



CREATE POLICY "Public delete courts" ON "public"."courts" FOR DELETE USING (true);



CREATE POLICY "Public delete expenses" ON "public"."expenses" FOR DELETE USING (true);



CREATE POLICY "Public delete facility_schedules" ON "public"."facility_schedules" FOR DELETE USING (true);



CREATE POLICY "Public insert addons" ON "public"."addons" FOR INSERT WITH CHECK (true);



CREATE POLICY "Public insert booking_addons" ON "public"."booking_addons" FOR INSERT WITH CHECK (true);



CREATE POLICY "Public insert bookings" ON "public"."bookings" FOR INSERT WITH CHECK (true);



CREATE POLICY "Public insert courts" ON "public"."courts" FOR INSERT WITH CHECK (true);



CREATE POLICY "Public insert expenses" ON "public"."expenses" FOR INSERT WITH CHECK (true);



CREATE POLICY "Public insert facility_schedules" ON "public"."facility_schedules" FOR INSERT WITH CHECK (true);



CREATE POLICY "Public manage sports" ON "public"."sports" USING (true) WITH CHECK (true);



CREATE POLICY "Public read bookings" ON "public"."bookings" FOR SELECT USING (true);



CREATE POLICY "Public read expenses" ON "public"."expenses" FOR SELECT USING (true);



CREATE POLICY "Public read facility_schedules" ON "public"."facility_schedules" FOR SELECT USING (true);



CREATE POLICY "Public update addons" ON "public"."addons" FOR UPDATE USING (true);



CREATE POLICY "Public update bookings" ON "public"."bookings" FOR UPDATE USING (true);



CREATE POLICY "Public update courts" ON "public"."courts" FOR UPDATE USING (true);



CREATE POLICY "Public update expenses" ON "public"."expenses" FOR UPDATE USING (true);



CREATE POLICY "Public update facility_schedules" ON "public"."facility_schedules" FOR UPDATE USING (true);



CREATE POLICY "Users can view own roles" ON "public"."user_roles" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "View booking addons" ON "public"."booking_addons" FOR SELECT USING (true);



ALTER TABLE "public"."addons" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."booking_addons" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bookings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."buffet_products" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."buffet_purchases" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."buffet_sale_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."buffet_sales" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."courts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."expenses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."facilities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."facility_schedules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."bookings";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."create_booking"("p_court_id" "uuid", "p_start_time" timestamp with time zone, "p_end_time" timestamp with time zone, "p_user_name" "text", "p_user_email" "text", "p_user_phone" "text", "p_total_price" integer, "p_deposit_amount" integer, "p_payment_status" "text", "p_booking_type" "text", "p_addon_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."create_booking"("p_court_id" "uuid", "p_start_time" timestamp with time zone, "p_end_time" timestamp with time zone, "p_user_name" "text", "p_user_email" "text", "p_user_phone" "text", "p_total_price" integer, "p_deposit_amount" integer, "p_payment_status" "text", "p_booking_type" "text", "p_addon_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_booking"("p_court_id" "uuid", "p_start_time" timestamp with time zone, "p_end_time" timestamp with time zone, "p_user_name" "text", "p_user_email" "text", "p_user_phone" "text", "p_total_price" integer, "p_deposit_amount" integer, "p_payment_status" "text", "p_booking_type" "text", "p_addon_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."create_facility_for_user"("p_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_facility_for_user"("p_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_facility_for_user"("p_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_slug"("input" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_slug"("input" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_slug"("input" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_facility_id"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_facility_id"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_facility_id"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "anon";
GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_facility_admin"("_user_id" "uuid", "_facility_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_facility_admin"("_user_id" "uuid", "_facility_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_facility_admin"("_user_id" "uuid", "_facility_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."revert_stock_on_expense_delete"() TO "anon";
GRANT ALL ON FUNCTION "public"."revert_stock_on_expense_delete"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."revert_stock_on_expense_delete"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_facility_slug"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_facility_slug"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_facility_slug"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_purchase_to_expenses"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_purchase_to_expenses"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_purchase_to_expenses"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_buffet_stock_on_purchase"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_buffet_stock_on_purchase"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_buffet_stock_on_purchase"() TO "service_role";


















GRANT ALL ON TABLE "public"."addons" TO "anon";
GRANT ALL ON TABLE "public"."addons" TO "authenticated";
GRANT ALL ON TABLE "public"."addons" TO "service_role";



GRANT ALL ON TABLE "public"."booking_addons" TO "anon";
GRANT ALL ON TABLE "public"."booking_addons" TO "authenticated";
GRANT ALL ON TABLE "public"."booking_addons" TO "service_role";



GRANT ALL ON TABLE "public"."bookings" TO "anon";
GRANT ALL ON TABLE "public"."bookings" TO "authenticated";
GRANT ALL ON TABLE "public"."bookings" TO "service_role";



GRANT ALL ON TABLE "public"."buffet_products" TO "anon";
GRANT ALL ON TABLE "public"."buffet_products" TO "authenticated";
GRANT ALL ON TABLE "public"."buffet_products" TO "service_role";



GRANT ALL ON TABLE "public"."buffet_purchases" TO "anon";
GRANT ALL ON TABLE "public"."buffet_purchases" TO "authenticated";
GRANT ALL ON TABLE "public"."buffet_purchases" TO "service_role";



GRANT ALL ON TABLE "public"."buffet_sale_items" TO "anon";
GRANT ALL ON TABLE "public"."buffet_sale_items" TO "authenticated";
GRANT ALL ON TABLE "public"."buffet_sale_items" TO "service_role";



GRANT ALL ON TABLE "public"."buffet_sales" TO "anon";
GRANT ALL ON TABLE "public"."buffet_sales" TO "authenticated";
GRANT ALL ON TABLE "public"."buffet_sales" TO "service_role";



GRANT ALL ON TABLE "public"."courts" TO "anon";
GRANT ALL ON TABLE "public"."courts" TO "authenticated";
GRANT ALL ON TABLE "public"."courts" TO "service_role";



GRANT ALL ON TABLE "public"."expenses" TO "anon";
GRANT ALL ON TABLE "public"."expenses" TO "authenticated";
GRANT ALL ON TABLE "public"."expenses" TO "service_role";



GRANT ALL ON TABLE "public"."facilities" TO "anon";
GRANT ALL ON TABLE "public"."facilities" TO "authenticated";
GRANT ALL ON TABLE "public"."facilities" TO "service_role";



GRANT ALL ON TABLE "public"."facility_schedule_exceptions" TO "anon";
GRANT ALL ON TABLE "public"."facility_schedule_exceptions" TO "authenticated";
GRANT ALL ON TABLE "public"."facility_schedule_exceptions" TO "service_role";



GRANT ALL ON TABLE "public"."facility_schedules" TO "anon";
GRANT ALL ON TABLE "public"."facility_schedules" TO "authenticated";
GRANT ALL ON TABLE "public"."facility_schedules" TO "service_role";



GRANT ALL ON TABLE "public"."holidays" TO "anon";
GRANT ALL ON TABLE "public"."holidays" TO "authenticated";
GRANT ALL ON TABLE "public"."holidays" TO "service_role";



GRANT ALL ON TABLE "public"."sports" TO "anon";
GRANT ALL ON TABLE "public"."sports" TO "authenticated";
GRANT ALL ON TABLE "public"."sports" TO "service_role";



GRANT ALL ON TABLE "public"."user_roles" TO "anon";
GRANT ALL ON TABLE "public"."user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_roles" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































