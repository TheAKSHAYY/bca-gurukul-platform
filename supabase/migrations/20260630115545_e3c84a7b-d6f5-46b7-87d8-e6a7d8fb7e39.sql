
-- NOTES TABLE
CREATE TABLE public.notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  summary TEXT,
  body TEXT,
  file_path TEXT,
  file_bucket TEXT DEFAULT 'notes',
  file_size_bytes BIGINT,
  file_mime TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','authenticated','admin')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  view_count BIGINT NOT NULL DEFAULT 0,
  download_count BIGINT NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (unit_id, slug)
);

GRANT SELECT ON public.notes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notes TO authenticated;
GRANT ALL ON public.notes TO service_role;

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view published notes in published tree"
ON public.notes FOR SELECT
USING (
  status = 'published'
  AND visibility = 'public'
  AND EXISTS (
    SELECT 1 FROM public.units u
    JOIN public.subjects s ON s.id = u.subject_id
    JOIN public.semesters sem ON sem.id = s.semester_id
    JOIN public.courses c ON c.id = sem.course_id
    WHERE u.id = notes.unit_id
      AND u.status = 'published'
      AND s.status = 'published'
      AND sem.status = 'published'
      AND c.status = 'published'
  )
);

CREATE POLICY "Authenticated can view auth-only notes"
ON public.notes FOR SELECT
TO authenticated
USING (
  status = 'published'
  AND visibility IN ('public','authenticated')
);

CREATE POLICY "Admins manage notes"
ON public.notes FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER notes_set_updated_at
BEFORE UPDATE ON public.notes
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_notes_unit ON public.notes(unit_id);
CREATE INDEX idx_notes_status ON public.notes(status);

-- NOTE VIEWS
CREATE TABLE public.note_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  kind TEXT NOT NULL DEFAULT 'view' CHECK (kind IN ('view','download')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.note_views TO authenticated;
GRANT ALL ON public.note_views TO service_role;

ALTER TABLE public.note_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own note views"
ON public.note_views FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users read own note views"
ON public.note_views FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins read all note views"
ON public.note_views FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE INDEX idx_note_views_note ON public.note_views(note_id);
CREATE INDEX idx_note_views_user ON public.note_views(user_id);
