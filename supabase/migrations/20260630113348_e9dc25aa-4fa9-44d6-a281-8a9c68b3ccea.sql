
CREATE TABLE public.branding (
  id INTEGER PRIMARY KEY DEFAULT 1,
  site_name TEXT NOT NULL DEFAULT 'BCA Gurukul',
  tagline TEXT,
  logo_url TEXT,
  favicon_url TEXT,
  primary_color TEXT,
  accent_color TEXT,
  support_email TEXT,
  social_links JSONB NOT NULL DEFAULT '{}'::jsonb,
  footer_text TEXT,
  seo_title TEXT,
  seo_description TEXT,
  og_image_url TEXT,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT branding_singleton CHECK (id = 1)
);

GRANT SELECT ON public.branding TO anon, authenticated;
GRANT ALL ON public.branding TO service_role;

ALTER TABLE public.branding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Branding is publicly readable"
ON public.branding FOR SELECT
USING (true);

CREATE POLICY "Super admins manage branding"
ON public.branding FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER branding_set_updated_at
BEFORE UPDATE ON public.branding
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.branding (id, site_name, tagline, support_email, footer_text, seo_title, seo_description)
VALUES (
  1,
  'BCA Gurukul',
  'Master your BCA journey — notes, papers, MCQs and more.',
  'support@bcagurukul.app',
  '© BCA Gurukul. Built for students, by educators.',
  'BCA Gurukul — Notes, Papers & MCQs for BCA Students',
  'Curated semester-wise notes, past papers, video lectures and MCQ practice for Bachelor of Computer Applications students.'
)
ON CONFLICT (id) DO NOTHING;
