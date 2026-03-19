
-- Buffet products table
CREATE TABLE public.buffet_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'Bebidas',
  price integer NOT NULL DEFAULT 0,
  stock integer NOT NULL DEFAULT 0,
  image text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.buffet_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read buffet_products" ON public.buffet_products FOR SELECT TO public USING (true);
CREATE POLICY "Public insert buffet_products" ON public.buffet_products FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Public update buffet_products" ON public.buffet_products FOR UPDATE TO public USING (true);
CREATE POLICY "Public delete buffet_products" ON public.buffet_products FOR DELETE TO public USING (true);

-- Buffet sales table (header)
CREATE TABLE public.buffet_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  total integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.buffet_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read buffet_sales" ON public.buffet_sales FOR SELECT TO public USING (true);
CREATE POLICY "Public insert buffet_sales" ON public.buffet_sales FOR INSERT TO public WITH CHECK (true);

-- Buffet sale items table (line items)
CREATE TABLE public.buffet_sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES public.buffet_sales(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.buffet_products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price integer NOT NULL DEFAULT 0
);

ALTER TABLE public.buffet_sale_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read buffet_sale_items" ON public.buffet_sale_items FOR SELECT TO public USING (true);
CREATE POLICY "Public insert buffet_sale_items" ON public.buffet_sale_items FOR INSERT TO public WITH CHECK (true);
