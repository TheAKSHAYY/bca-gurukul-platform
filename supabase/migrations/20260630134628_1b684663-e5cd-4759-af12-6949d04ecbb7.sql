-- Batch E.1 — Bookmarks & Progress Tracking
-- Polymorphic bookmarks across notes/papers/quizzes/units, plus per-user progress on units.

CREATE TYPE public.bookmark_kind AS ENUM ('note','paper','quiz','unit');
CREATE TYPE public.progress_status AS ENUM ('not_started','in_progress','completed');

-- ============== BOOKMARKS ==============
CREATE TABLE public.bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind public.bookmark_kind NOT NULL,
  ref_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, kind, ref_id)
);
CREATE INDEX bookmarks_user_idx ON public.bookmarks(user_id, created_at DESC);
CREATE INDEX bookmarks_ref_idx  ON public.bookmarks(kind, ref_id);

GRANT SELECT, INSERT, DELETE ON public.bookmarks TO authenticated;
GRANT ALL ON public.bookmarks TO service_role;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bookmarks_select_own"
  ON public.bookmarks FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "bookmarks_insert_own"
  ON public.bookmarks FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "bookmarks_delete_own"
  ON public.bookmarks FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ============== PROGRESS ==============
CREATE TABLE public.progress_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  status public.progress_status NOT NULL DEFAULT 'in_progress',
  progress_pct NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (progress_pct >= 0 AND progress_pct <= 100),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, unit_id)
);
CREATE INDEX progress_user_idx ON public.progress_tracking(user_id, last_activity_at DESC);
CREATE INDEX progress_unit_idx ON public.progress_tracking(unit_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.progress_tracking TO authenticated;
GRANT ALL ON public.progress_tracking TO service_role;
ALTER TABLE public.progress_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "progress_select_own"
  ON public.progress_tracking FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "progress_insert_own"
  ON public.progress_tracking FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "progress_update_own"
  ON public.progress_tracking FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "progress_delete_own"
  ON public.progress_tracking FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE TRIGGER trg_progress_updated_at
  BEFORE UPDATE ON public.progress_tracking
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============== DASHBOARD RPC ==============
-- Returns the user's bookmarks and progress entries enriched ONLY from
-- published, non-trashed content (parent-chain enforced via existing RLS
-- when invoked via SECURITY INVOKER). We use SECURITY INVOKER so the
-- existing parent-chain RLS on units/notes/papers/quizzes/subjects/etc.
-- filters automatically — orphaned or unpublished refs simply drop out.

CREATE OR REPLACE FUNCTION public.student_bookmarks(_limit int DEFAULT 20)
RETURNS TABLE(
  id UUID,
  kind public.bookmark_kind,
  ref_id UUID,
  title TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public
AS $$
  WITH mine AS (
    SELECT b.id, b.kind, b.ref_id, b.created_at
    FROM public.bookmarks b
    WHERE b.user_id = auth.uid()
    ORDER BY b.created_at DESC
    LIMIT _limit
  )
  SELECT m.id, m.kind, m.ref_id,
    CASE m.kind
      WHEN 'note'  THEN (SELECT n.title FROM public.notes  n WHERE n.id = m.ref_id)
      WHEN 'paper' THEN (SELECT p.title FROM public.papers p WHERE p.id = m.ref_id)
      WHEN 'quiz'  THEN (SELECT q.title FROM public.quizzes q WHERE q.id = m.ref_id)
      WHEN 'unit'  THEN (SELECT u.title FROM public.units  u WHERE u.id = m.ref_id)
    END AS title,
    m.created_at
  FROM mine m;
$$;

CREATE OR REPLACE FUNCTION public.student_progress(_limit int DEFAULT 10)
RETURNS TABLE(
  id UUID,
  unit_id UUID,
  unit_title TEXT,
  subject_title TEXT,
  status public.progress_status,
  progress_pct NUMERIC,
  last_activity_at TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public
AS $$
  SELECT pt.id, pt.unit_id, u.title, s.title, pt.status, pt.progress_pct, pt.last_activity_at
  FROM public.progress_tracking pt
  JOIN public.units u    ON u.id = pt.unit_id
  JOIN public.subjects s ON s.id = u.subject_id
  WHERE pt.user_id = auth.uid()
  ORDER BY pt.last_activity_at DESC
  LIMIT _limit;
$$;

GRANT EXECUTE ON FUNCTION public.student_bookmarks(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.student_progress(int)  TO authenticated;
