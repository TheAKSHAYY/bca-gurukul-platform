
-- ============================================================================
-- Batch F — Homepage CMS
-- ============================================================================

CREATE TYPE public.homepage_section_type AS ENUM (
  'hero',
  'trust_bar',
  'features',
  'journey',
  'semester_overview',
  'benefits',
  'testimonials',
  'faq',
  'cta',
  'stats',
  'custom_richtext'
);

-- ---------- homepage_sections ----------
CREATE TABLE public.homepage_sections (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type        public.homepage_section_type NOT NULL,
  position    INTEGER NOT NULL,
  enabled     BOOLEAN NOT NULL DEFAULT true,
  props       JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX homepage_sections_position_idx
  ON public.homepage_sections (position) WHERE enabled = true;

GRANT SELECT ON public.homepage_sections TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.homepage_sections TO authenticated;
GRANT ALL ON public.homepage_sections TO service_role;

ALTER TABLE public.homepage_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read enabled homepage sections"
ON public.homepage_sections FOR SELECT
USING (enabled = true OR public.is_admin(auth.uid()));

CREATE POLICY "Admins manage homepage sections"
ON public.homepage_sections FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER homepage_sections_set_updated_at
  BEFORE UPDATE ON public.homepage_sections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------- homepage_testimonials ----------
CREATE TABLE public.homepage_testimonials (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_name TEXT NOT NULL,
  author_role TEXT,
  avatar_url  TEXT,
  quote       TEXT NOT NULL,
  rating      SMALLINT CHECK (rating BETWEEN 1 AND 5),
  position    INTEGER NOT NULL DEFAULT 0,
  enabled     BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX homepage_testimonials_position_idx
  ON public.homepage_testimonials (position) WHERE enabled = true;

GRANT SELECT ON public.homepage_testimonials TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.homepage_testimonials TO authenticated;
GRANT ALL ON public.homepage_testimonials TO service_role;

ALTER TABLE public.homepage_testimonials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read enabled testimonials"
ON public.homepage_testimonials FOR SELECT
USING (enabled = true OR public.is_admin(auth.uid()));

CREATE POLICY "Admins manage testimonials"
ON public.homepage_testimonials FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER homepage_testimonials_set_updated_at
  BEFORE UPDATE ON public.homepage_testimonials
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
