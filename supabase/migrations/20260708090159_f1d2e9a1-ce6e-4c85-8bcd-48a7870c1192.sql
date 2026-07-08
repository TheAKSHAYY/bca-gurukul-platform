
DO $$ BEGIN
  CREATE TYPE public.content_type AS ENUM ('note','pdf','ppt','video','assignment','link');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.content_visibility AS ENUM ('public','students','private');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.content_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type public.content_type NOT NULL DEFAULT 'note',
  title TEXT NOT NULL,
  description TEXT,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  file_bucket TEXT,
  file_path TEXT,
  file_mime TEXT,
  file_size_bytes BIGINT,
  file_url TEXT,
  thumbnail_path TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  visibility public.content_visibility NOT NULL DEFAULT 'students',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  publish_at TIMESTAMPTZ,
  view_count INTEGER NOT NULL DEFAULT 0,
  download_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS content_items_subject_idx ON public.content_items(subject_id);
CREATE INDEX IF NOT EXISTS content_items_unit_idx ON public.content_items(unit_id);
CREATE INDEX IF NOT EXISTS content_items_type_status_idx ON public.content_items(type, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS content_items_created_at_idx ON public.content_items(created_at DESC);

GRANT SELECT ON public.content_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_items TO authenticated;
GRANT ALL ON public.content_items TO service_role;

ALTER TABLE public.content_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read published public content" ON public.content_items;
CREATE POLICY "Public can read published public content" ON public.content_items
  FOR SELECT TO anon
  USING (status = 'published' AND visibility = 'public' AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Authenticated can read content" ON public.content_items;
CREATE POLICY "Authenticated can read content" ON public.content_items
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL AND (
      (status = 'published' AND visibility IN ('public','students'))
      OR created_by = auth.uid()
      OR public.is_admin(auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can insert content" ON public.content_items;
CREATE POLICY "Admins can insert content" ON public.content_items
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update content" ON public.content_items;
CREATE POLICY "Admins can update content" ON public.content_items
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete content" ON public.content_items;
CREATE POLICY "Admins can delete content" ON public.content_items
  FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

DROP TRIGGER IF EXISTS content_items_set_updated_at ON public.content_items;
CREATE TRIGGER content_items_set_updated_at
  BEFORE UPDATE ON public.content_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.content_items;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

INSERT INTO public.content_items
  (type, title, description, subject_id, unit_id, file_bucket, file_path, file_mime, file_size_bytes, visibility, status, created_by, created_at)
SELECT
  'note'::public.content_type,
  n.title,
  n.summary,
  u.subject_id,
  n.unit_id,
  n.file_bucket,
  n.file_path,
  n.file_mime,
  n.file_size_bytes,
  'students'::public.content_visibility,
  n.status,
  n.created_by,
  n.created_at
FROM public.notes n
LEFT JOIN public.units u ON u.id = n.unit_id
WHERE n.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.content_items ci
    WHERE ci.type = 'note' AND ci.title = n.title
      AND COALESCE(ci.unit_id::text, '') = COALESCE(n.unit_id::text, '')
  );
