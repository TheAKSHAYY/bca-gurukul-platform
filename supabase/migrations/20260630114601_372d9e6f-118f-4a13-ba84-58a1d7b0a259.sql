
-- ============ TAGS ============
CREATE TABLE public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tags TO authenticated;
GRANT ALL ON public.tags TO service_role;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tags_read_authenticated" ON public.tags FOR SELECT TO authenticated USING (true);
CREATE POLICY "tags_admin_write" ON public.tags FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER tags_set_updated_at BEFORE UPDATE ON public.tags
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_tags_slug ON public.tags(slug);

-- ============ CATEGORIES ============
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  order_index INT NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (course_id, slug)
);
GRANT SELECT ON public.categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories_public_read" ON public.categories FOR SELECT TO anon, authenticated
  USING (is_published = true);
CREATE POLICY "categories_admin_all" ON public.categories FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER categories_set_updated_at BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_categories_course ON public.categories(course_id);
CREATE INDEX idx_categories_parent ON public.categories(parent_id);

-- ============ TAGGABLES (polymorphic tag links) ============
CREATE TYPE public.taggable_kind AS ENUM (
  'note','video','paper','quiz','assignment','unit','subject','announcement'
);

CREATE TABLE public.taggables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  entity_kind public.taggable_kind NOT NULL,
  entity_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tag_id, entity_kind, entity_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.taggables TO authenticated;
GRANT ALL ON public.taggables TO service_role;
ALTER TABLE public.taggables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "taggables_read_authenticated" ON public.taggables FOR SELECT TO authenticated USING (true);
CREATE POLICY "taggables_admin_write" ON public.taggables FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE INDEX idx_taggables_entity ON public.taggables(entity_kind, entity_id);
CREATE INDEX idx_taggables_tag ON public.taggables(tag_id);

-- ============ MEDIA ASSETS ============
CREATE TYPE public.media_kind AS ENUM ('image','pdf','video','audio','document','other');

CREATE TABLE public.media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket TEXT NOT NULL,
  object_key TEXT NOT NULL,
  filename TEXT NOT NULL,
  mime_type TEXT,
  kind public.media_kind NOT NULL DEFAULT 'other',
  byte_size BIGINT,
  width INT,
  height INT,
  duration_seconds INT,
  alt_text TEXT,
  caption TEXT,
  checksum TEXT,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (bucket, object_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_assets TO authenticated;
GRANT ALL ON public.media_assets TO service_role;
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "media_read_authenticated" ON public.media_assets FOR SELECT TO authenticated USING (true);
CREATE POLICY "media_admin_write" ON public.media_assets FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER media_assets_set_updated_at BEFORE UPDATE ON public.media_assets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_media_kind ON public.media_assets(kind);
CREATE INDEX idx_media_uploaded_by ON public.media_assets(uploaded_by);
