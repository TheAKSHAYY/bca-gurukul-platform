
CREATE TABLE public.papers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  year INTEGER NOT NULL CHECK (year BETWEEN 1990 AND 2100),
  exam_type TEXT NOT NULL DEFAULT 'end_sem' CHECK (exam_type IN ('mid_sem','end_sem','supplementary','model','other')),
  paper_number TEXT,
  description TEXT,
  file_path TEXT,
  file_bucket TEXT DEFAULT 'papers',
  file_size_bytes BIGINT,
  file_mime TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  download_count BIGINT NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.papers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.papers TO authenticated;
GRANT ALL ON public.papers TO service_role;

ALTER TABLE public.papers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view published papers in published tree"
ON public.papers FOR SELECT
USING (
  status = 'published'
  AND EXISTS (
    SELECT 1 FROM public.subjects s
    JOIN public.semesters sem ON sem.id = s.semester_id
    JOIN public.courses c ON c.id = sem.course_id
    WHERE s.id = papers.subject_id
      AND s.status = 'published'
      AND sem.status = 'published'
      AND c.status = 'published'
  )
);

CREATE POLICY "Admins manage papers"
ON public.papers FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER papers_set_updated_at
BEFORE UPDATE ON public.papers
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_papers_subject ON public.papers(subject_id);
CREATE INDEX idx_papers_year ON public.papers(year DESC);

-- Downloads tracking
CREATE TABLE public.paper_downloads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  paper_id UUID NOT NULL REFERENCES public.papers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.paper_downloads TO authenticated;
GRANT ALL ON public.paper_downloads TO service_role;

ALTER TABLE public.paper_downloads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own paper downloads"
ON public.paper_downloads FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users read own paper downloads"
ON public.paper_downloads FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins read all paper downloads"
ON public.paper_downloads FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE INDEX idx_paper_downloads_paper ON public.paper_downloads(paper_id);
