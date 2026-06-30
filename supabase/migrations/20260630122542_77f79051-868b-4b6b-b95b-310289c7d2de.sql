
ALTER TABLE public.notes        ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.papers       ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.semesters    ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.subjects     ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.units        ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.media_assets ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_notes_deleted_at        ON public.notes(deleted_at);
CREATE INDEX IF NOT EXISTS idx_papers_deleted_at       ON public.papers(deleted_at);
CREATE INDEX IF NOT EXISTS idx_media_assets_deleted_at ON public.media_assets(deleted_at);

CREATE OR REPLACE FUNCTION public.admin_dashboard_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE result jsonb;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT jsonb_build_object(
    'students',   (SELECT count(*) FROM public.profiles),
    'semesters',  (SELECT count(*) FROM public.semesters WHERE deleted_at IS NULL),
    'subjects',   (SELECT count(*) FROM public.subjects  WHERE deleted_at IS NULL),
    'units',      (SELECT count(*) FROM public.units     WHERE deleted_at IS NULL),
    'notes',      (SELECT count(*) FROM public.notes     WHERE deleted_at IS NULL),
    'papers',     (SELECT count(*) FROM public.papers    WHERE deleted_at IS NULL),
    'quizzes',    (SELECT count(*) FROM public.quizzes   WHERE deleted_at IS NULL),
    'mcqs',       (SELECT count(*) FROM public.quiz_questions),
    'media',      (SELECT count(*) FROM public.media_assets WHERE deleted_at IS NULL),
    'downloads',  (SELECT count(*) FROM public.paper_downloads),
    'note_views', (SELECT count(*) FROM public.note_views),
    'active_users_24h', (
      SELECT count(DISTINCT user_id) FROM public.user_sessions
      WHERE last_seen_at > now() - interval '24 hours'
    )
  ) INTO result;
  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_dashboard_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_dashboard_stats() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_recent_uploads(_limit int DEFAULT 10)
RETURNS TABLE (kind text, id uuid, title text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM (
    SELECT 'note'::text  AS kind, n.id, n.title,     n.created_at FROM public.notes  n WHERE n.deleted_at IS NULL
    UNION ALL
    SELECT 'paper'::text,           p.id, p.title,     p.created_at FROM public.papers p WHERE p.deleted_at IS NULL
    UNION ALL
    SELECT 'quiz'::text,            q.id, q.title,     q.created_at FROM public.quizzes q WHERE q.deleted_at IS NULL
    UNION ALL
    SELECT 'media'::text,           m.id, m.filename AS title, m.created_at FROM public.media_assets m WHERE m.deleted_at IS NULL
  ) t
  WHERE public.is_admin(auth.uid())
  ORDER BY created_at DESC
  LIMIT _limit;
$$;

REVOKE ALL ON FUNCTION public.admin_recent_uploads(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_recent_uploads(int) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_recent_activity(_limit int DEFAULT 15)
RETURNS TABLE (kind text, user_id uuid, ref_id uuid, title text, at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM (
    SELECT 'note_view'::text AS kind, v.user_id, v.note_id AS ref_id, n.title, v.created_at AS at
      FROM public.note_views v LEFT JOIN public.notes n ON n.id = v.note_id
    UNION ALL
    SELECT 'paper_download'::text, d.user_id, d.paper_id, p.title, d.created_at
      FROM public.paper_downloads d LEFT JOIN public.papers p ON p.id = d.paper_id
    UNION ALL
    SELECT 'quiz_attempt'::text, a.user_id, a.quiz_id, q.title, COALESCE(a.submitted_at, a.started_at)
      FROM public.quiz_attempts a LEFT JOIN public.quizzes q ON q.id = a.quiz_id
  ) t
  WHERE public.is_admin(auth.uid())
  ORDER BY at DESC NULLS LAST
  LIMIT _limit;
$$;

REVOKE ALL ON FUNCTION public.admin_recent_activity(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_recent_activity(int) TO authenticated;
