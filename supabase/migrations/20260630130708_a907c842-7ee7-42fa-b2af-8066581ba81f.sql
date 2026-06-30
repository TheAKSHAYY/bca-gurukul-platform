
-- Add soft-delete to courses (was missing)
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS courses_deleted_at_idx ON public.courses (deleted_at);

-- Tighten public SELECT to also exclude trashed courses
DROP POLICY IF EXISTS "Public can view published courses" ON public.courses;
CREATE POLICY "Public can view published courses"
ON public.courses FOR SELECT
USING (public.is_admin(auth.uid()) OR (status = 'published' AND deleted_at IS NULL));

-- ---------- semesters ----------
DROP POLICY IF EXISTS "Public can view published semesters" ON public.semesters;
CREATE POLICY "Public can view published semesters"
ON public.semesters FOR SELECT
USING (
  public.is_admin(auth.uid())
  OR (
    status = 'published' AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = semesters.course_id
        AND c.status = 'published' AND c.deleted_at IS NULL
    )
  )
);

-- ---------- subjects ----------
DROP POLICY IF EXISTS "Public can view published subjects" ON public.subjects;
CREATE POLICY "Public can view published subjects"
ON public.subjects FOR SELECT
USING (
  public.is_admin(auth.uid())
  OR (
    status = 'published' AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1
      FROM public.semesters sem
      JOIN public.courses c ON c.id = sem.course_id
      WHERE sem.id = subjects.semester_id
        AND sem.status = 'published' AND sem.deleted_at IS NULL
        AND c.status   = 'published' AND c.deleted_at   IS NULL
    )
  )
);

-- ---------- units ----------
DROP POLICY IF EXISTS "Public can view published units" ON public.units;
CREATE POLICY "Public can view published units"
ON public.units FOR SELECT
USING (
  public.is_admin(auth.uid())
  OR (
    status = 'published' AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1
      FROM public.subjects s
      JOIN public.semesters sem ON sem.id = s.semester_id
      JOIN public.courses   c   ON c.id   = sem.course_id
      WHERE s.id = units.subject_id
        AND s.status   = 'published' AND s.deleted_at   IS NULL
        AND sem.status = 'published' AND sem.deleted_at IS NULL
        AND c.status   = 'published' AND c.deleted_at   IS NULL
    )
  )
);

-- ---------- notes (public) ----------
DROP POLICY IF EXISTS "Public can view published notes in published tree" ON public.notes;
CREATE POLICY "Public can view published notes in published tree"
ON public.notes FOR SELECT
USING (
  status = 'published' AND deleted_at IS NULL AND visibility = 'public'
  AND EXISTS (
    SELECT 1
    FROM public.units u
    JOIN public.subjects  s   ON s.id   = u.subject_id
    JOIN public.semesters sem ON sem.id = s.semester_id
    JOIN public.courses   c   ON c.id   = sem.course_id
    WHERE u.id = notes.unit_id
      AND u.status   = 'published' AND u.deleted_at   IS NULL
      AND s.status   = 'published' AND s.deleted_at   IS NULL
      AND sem.status = 'published' AND sem.deleted_at IS NULL
      AND c.status   = 'published' AND c.deleted_at   IS NULL
  )
);

-- ---------- notes (authenticated) ----------
DROP POLICY IF EXISTS "Authenticated can view auth-only notes" ON public.notes;
CREATE POLICY "Authenticated can view auth-only notes"
ON public.notes FOR SELECT
TO authenticated
USING (
  status = 'published' AND deleted_at IS NULL
  AND visibility IN ('public','authenticated')
  AND EXISTS (
    SELECT 1
    FROM public.units u
    JOIN public.subjects  s   ON s.id   = u.subject_id
    JOIN public.semesters sem ON sem.id = s.semester_id
    JOIN public.courses   c   ON c.id   = sem.course_id
    WHERE u.id = notes.unit_id
      AND u.status   = 'published' AND u.deleted_at   IS NULL
      AND s.status   = 'published' AND s.deleted_at   IS NULL
      AND sem.status = 'published' AND sem.deleted_at IS NULL
      AND c.status   = 'published' AND c.deleted_at   IS NULL
  )
);

-- ---------- papers ----------
DROP POLICY IF EXISTS "Public can view published papers in published tree" ON public.papers;
CREATE POLICY "Public can view published papers in published tree"
ON public.papers FOR SELECT
USING (
  status = 'published' AND deleted_at IS NULL
  AND EXISTS (
    SELECT 1
    FROM public.subjects  s
    JOIN public.semesters sem ON sem.id = s.semester_id
    JOIN public.courses   c   ON c.id   = sem.course_id
    WHERE s.id = papers.subject_id
      AND s.status   = 'published' AND s.deleted_at   IS NULL
      AND sem.status = 'published' AND sem.deleted_at IS NULL
      AND c.status   = 'published' AND c.deleted_at   IS NULL
  )
);

-- ---------- quizzes ----------
DROP POLICY IF EXISTS quizzes_public_read_published ON public.quizzes;
CREATE POLICY quizzes_public_read_published
ON public.quizzes FOR SELECT
USING (
  status = 'published' AND deleted_at IS NULL
  AND EXISTS (
    SELECT 1
    FROM public.units    u
    JOIN public.subjects  s   ON s.id   = u.subject_id
    JOIN public.semesters sem ON sem.id = s.semester_id
    JOIN public.courses   c   ON c.id   = sem.course_id
    WHERE u.id = quizzes.unit_id
      AND u.status   = 'published' AND u.deleted_at   IS NULL
      AND s.status   = 'published' AND s.deleted_at   IS NULL
      AND sem.status = 'published' AND sem.deleted_at IS NULL
      AND c.status   = 'published' AND c.deleted_at   IS NULL
  )
);
