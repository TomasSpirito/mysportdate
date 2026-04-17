
-- Add contact fields to facilities table
ALTER TABLE public.facilities ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.facilities ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.facilities ADD COLUMN IF NOT EXISTS whatsapp text;

-- Set default values for the existing facility
UPDATE public.facilities 
SET phone = '+54 11 4567-8901', 
    email = 'info@MySportdate.com',
    whatsapp = '5491145678901'
WHERE id = '00000000-0000-0000-0000-000000000001';
