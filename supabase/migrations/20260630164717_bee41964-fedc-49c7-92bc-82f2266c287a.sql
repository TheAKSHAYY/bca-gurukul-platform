
ALTER TABLE public.homepage_sections
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'published',
  ADD COLUMN IF NOT EXISTS content JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS style JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS published_content JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS published_style JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

UPDATE public.homepage_sections
   SET content = COALESCE(props, '{}'::jsonb),
       published_content = COALESCE(props, '{}'::jsonb)
 WHERE content = '{}'::jsonb;

DO $$ BEGIN
  ALTER TABLE public.homepage_sections
    ADD CONSTRAINT homepage_sections_status_chk CHECK (status IN ('draft','published'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE UNIQUE INDEX IF NOT EXISTS homepage_sections_slug_uniq
  ON public.homepage_sections(slug) WHERE slug IS NOT NULL;

INSERT INTO public.homepage_sections (type, position, enabled, status, content, published_content)
SELECT t.kind::public.homepage_section_type, t.pos, false, 'draft', '{}'::jsonb, '{}'::jsonb
FROM (VALUES
  ('about', 25),('why_us', 35),('universities', 45),('popular_courses', 55),
  ('categories', 65),('statistics', 75),('faculty', 85),('learning_process', 95),
  ('blog', 105),('contact', 115),('newsletter', 125),('footer', 200)
) AS t(kind, pos)
WHERE NOT EXISTS (
  SELECT 1 FROM public.homepage_sections
   WHERE type::text = t.kind
);

ALTER TABLE public.homepage_sections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "homepage_sections_select_public" ON public.homepage_sections;
DROP POLICY IF EXISTS "homepage_sections_admin_all" ON public.homepage_sections;
DROP POLICY IF EXISTS "Public read enabled sections" ON public.homepage_sections;
DROP POLICY IF EXISTS "Admins manage sections" ON public.homepage_sections;

CREATE POLICY "homepage_sections_select_public"
  ON public.homepage_sections FOR SELECT
  USING (enabled = true AND status = 'published');

CREATE POLICY "homepage_sections_admin_all"
  ON public.homepage_sections FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

GRANT SELECT ON public.homepage_sections TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.homepage_sections TO authenticated;
GRANT ALL ON public.homepage_sections TO service_role;

CREATE OR REPLACE FUNCTION public.list_homepage_sections_admin()
RETURNS SETOF public.homepage_sections
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT * FROM public.homepage_sections
   WHERE public.is_admin(auth.uid())
   ORDER BY position ASC;
$$;

CREATE OR REPLACE FUNCTION public.list_homepage_sections_public()
RETURNS TABLE(id uuid, type text, "position" int, content jsonb, style jsonb, title text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id, type::text, "position", published_content, published_style, title
    FROM public.homepage_sections
   WHERE enabled = true AND status = 'published'
   ORDER BY "position" ASC;
$$;

REVOKE ALL ON FUNCTION public.list_homepage_sections_public() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_homepage_sections_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_homepage_sections_public() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_homepage_sections_admin() TO authenticated;

CREATE OR REPLACE FUNCTION public.duplicate_homepage_section(_id uuid)
RETURNS public.homepage_sections
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_src public.homepage_sections; v_new public.homepage_sections;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE='42501';
  END IF;
  SELECT * INTO v_src FROM public.homepage_sections WHERE id = _id;
  IF NOT FOUND THEN RAISE EXCEPTION 'not found'; END IF;
  INSERT INTO public.homepage_sections
    (type, position, enabled, status, content, style, published_content, published_style, title, props)
  VALUES
    (v_src.type, v_src.position + 1, false, 'draft', v_src.content, v_src.style,
     v_src.content, v_src.style,
     COALESCE(v_src.title, v_src.type::text) || ' (copy)', v_src.props)
  RETURNING * INTO v_new;
  RETURN v_new;
END $$;

REVOKE ALL ON FUNCTION public.duplicate_homepage_section(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.duplicate_homepage_section(uuid) TO authenticated;
