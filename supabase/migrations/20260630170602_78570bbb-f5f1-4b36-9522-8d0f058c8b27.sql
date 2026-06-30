
-- 1. Extend branding
ALTER TABLE public.branding
  ADD COLUMN IF NOT EXISTS logo_text       text,
  ADD COLUMN IF NOT EXISTS secondary_color text,
  ADD COLUMN IF NOT EXISTS font_heading    text DEFAULT 'Fraunces',
  ADD COLUMN IF NOT EXISTS font_body       text DEFAULT 'Inter',
  ADD COLUMN IF NOT EXISTS radius_rem      numeric DEFAULT 0.75,
  ADD COLUMN IF NOT EXISTS theme_light     jsonb  DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS theme_dark      jsonb  DEFAULT '{}'::jsonb;

-- 2. Public read RPC for branding (anon-safe, returns single row)
CREATE OR REPLACE FUNCTION public.get_public_branding()
RETURNS public.branding
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.branding WHERE id = 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_branding() TO anon, authenticated;

-- 3. SEO meta table
CREATE TABLE IF NOT EXISTS public.seo_meta (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path        text NOT NULL UNIQUE,
  title       text,
  description text,
  keywords    text,
  og_image    text,
  twitter_card text DEFAULT 'summary_large_image',
  robots      text DEFAULT 'index,follow',
  canonical   text,
  updated_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.seo_meta TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.seo_meta TO authenticated;
GRANT ALL ON public.seo_meta TO service_role;

ALTER TABLE public.seo_meta ENABLE ROW LEVEL SECURITY;

CREATE POLICY "seo_meta public read"
  ON public.seo_meta FOR SELECT
  USING (true);

CREATE POLICY "seo_meta admin write"
  ON public.seo_meta FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER trg_seo_meta_updated_at
  BEFORE UPDATE ON public.seo_meta
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
