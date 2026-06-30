
CREATE TYPE public.quiz_status AS ENUM ('draft','published','archived');
CREATE TYPE public.quiz_question_type AS ENUM ('single','multiple','true_false');

CREATE TABLE public.quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  instructions TEXT,
  time_limit_minutes INTEGER,
  passing_pct NUMERIC(5,2) NOT NULL DEFAULT 50,
  max_attempts INTEGER NOT NULL DEFAULT 0,
  shuffle_questions BOOLEAN NOT NULL DEFAULT false,
  shuffle_options BOOLEAN NOT NULL DEFAULT false,
  status public.quiz_status NOT NULL DEFAULT 'draft',
  order_index INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(unit_id, slug)
);
CREATE INDEX idx_quizzes_unit ON public.quizzes(unit_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_quizzes_status ON public.quizzes(status) WHERE deleted_at IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quizzes TO authenticated;
GRANT SELECT ON public.quizzes TO anon;
GRANT ALL ON public.quizzes TO service_role;

ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quizzes_public_read_published" ON public.quizzes
  FOR SELECT TO anon, authenticated
  USING (status = 'published' AND deleted_at IS NULL);

CREATE POLICY "quizzes_admin_all" ON public.quizzes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE TRIGGER trg_quizzes_updated_at BEFORE UPDATE ON public.quizzes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  type public.quiz_question_type NOT NULL DEFAULT 'single',
  prompt TEXT NOT NULL,
  explanation TEXT,
  points NUMERIC(6,2) NOT NULL DEFAULT 1,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_quiz_questions_quiz ON public.quiz_questions(quiz_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_questions TO authenticated;
GRANT SELECT ON public.quiz_questions TO anon;
GRANT ALL ON public.quiz_questions TO service_role;

ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quiz_questions_public_read" ON public.quiz_questions
  FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.quizzes q WHERE q.id = quiz_id AND q.status='published' AND q.deleted_at IS NULL));

CREATE POLICY "quiz_questions_admin_all" ON public.quiz_questions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE TRIGGER trg_quiz_questions_updated_at BEFORE UPDATE ON public.quiz_questions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.quiz_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_quiz_options_question ON public.quiz_options(question_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_options TO authenticated;
GRANT ALL ON public.quiz_options TO service_role;

ALTER TABLE public.quiz_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quiz_options_admin_all" ON public.quiz_options
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE VIEW public.quiz_options_public
WITH (security_invoker = true)
AS
SELECT o.id, o.question_id, o.text, o.order_index
FROM public.quiz_options o
JOIN public.quiz_questions q ON q.id = o.question_id
JOIN public.quizzes z ON z.id = q.quiz_id
WHERE z.status = 'published' AND z.deleted_at IS NULL;

-- View needs explicit policy via underlying table; provide a SECURITY DEFINER function instead for safe reads
CREATE OR REPLACE FUNCTION public.get_quiz_options(_quiz_id UUID)
RETURNS TABLE(id UUID, question_id UUID, text TEXT, order_index INTEGER)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.id, o.question_id, o.text, o.order_index
  FROM public.quiz_options o
  JOIN public.quiz_questions q ON q.id = o.question_id
  JOIN public.quizzes z ON z.id = q.quiz_id
  WHERE z.id = _quiz_id AND z.status = 'published' AND z.deleted_at IS NULL
  ORDER BY o.order_index;
$$;

REVOKE ALL ON FUNCTION public.get_quiz_options(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_quiz_options(UUID) TO anon, authenticated;

CREATE TRIGGER trg_quiz_options_updated_at BEFORE UPDATE ON public.quiz_options
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at TIMESTAMPTZ,
  score NUMERIC(8,2),
  max_score NUMERIC(8,2),
  pct NUMERIC(5,2),
  passed BOOLEAN,
  time_spent_seconds INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_quiz_attempts_user ON public.quiz_attempts(user_id, quiz_id);
CREATE INDEX idx_quiz_attempts_quiz ON public.quiz_attempts(quiz_id);

GRANT SELECT, INSERT, UPDATE ON public.quiz_attempts TO authenticated;
GRANT ALL ON public.quiz_attempts TO service_role;

ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quiz_attempts_owner_read" ON public.quiz_attempts
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE POLICY "quiz_attempts_owner_insert" ON public.quiz_attempts
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "quiz_attempts_admin_update" ON public.quiz_attempts
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE TRIGGER trg_quiz_attempts_updated_at BEFORE UPDATE ON public.quiz_attempts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.quiz_attempt_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES public.quiz_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  selected_option_ids UUID[] NOT NULL DEFAULT '{}',
  is_correct BOOLEAN,
  points_awarded NUMERIC(6,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(attempt_id, question_id)
);
CREATE INDEX idx_attempt_answers_attempt ON public.quiz_attempt_answers(attempt_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_attempt_answers TO authenticated;
GRANT ALL ON public.quiz_attempt_answers TO service_role;

ALTER TABLE public.quiz_attempt_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "attempt_answers_owner_all" ON public.quiz_attempt_answers
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.quiz_attempts a WHERE a.id = attempt_id AND (a.user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.quiz_attempts a WHERE a.id = attempt_id AND a.user_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.submit_quiz_attempt(
  _attempt_id UUID,
  _answers JSONB
)
RETURNS public.quiz_attempts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempt public.quiz_attempts;
  v_quiz public.quizzes;
  v_total NUMERIC := 0;
  v_score NUMERIC := 0;
  q RECORD;
  v_selected UUID[];
  v_correct UUID[];
  v_is_correct BOOLEAN;
  v_points NUMERIC;
BEGIN
  SELECT * INTO v_attempt FROM public.quiz_attempts WHERE id = _attempt_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Attempt not found'; END IF;
  IF v_attempt.user_id <> auth.uid() THEN RAISE EXCEPTION 'Not your attempt'; END IF;
  IF v_attempt.submitted_at IS NOT NULL THEN RAISE EXCEPTION 'Already submitted'; END IF;

  SELECT * INTO v_quiz FROM public.quizzes WHERE id = v_attempt.quiz_id;

  FOR q IN SELECT id, points FROM public.quiz_questions WHERE quiz_id = v_quiz.id LOOP
    v_total := v_total + q.points;
    SELECT ARRAY(SELECT (jsonb_array_elements_text(COALESCE(_answers->q.id::text,'[]'::jsonb)))::uuid) INTO v_selected;
    SELECT COALESCE(ARRAY_AGG(id ORDER BY id),'{}') INTO v_correct
      FROM public.quiz_options WHERE question_id = q.id AND is_correct = true;

    v_is_correct := (
      SELECT COALESCE(ARRAY_AGG(x ORDER BY x),'{}') FROM unnest(v_selected) x
    ) = v_correct AND array_length(v_correct,1) IS NOT NULL;

    v_points := CASE WHEN v_is_correct THEN q.points ELSE 0 END;
    v_score := v_score + v_points;

    INSERT INTO public.quiz_attempt_answers(attempt_id, question_id, selected_option_ids, is_correct, points_awarded)
    VALUES (_attempt_id, q.id, v_selected, v_is_correct, v_points)
    ON CONFLICT (attempt_id, question_id) DO UPDATE
      SET selected_option_ids = EXCLUDED.selected_option_ids,
          is_correct = EXCLUDED.is_correct,
          points_awarded = EXCLUDED.points_awarded;
  END LOOP;

  UPDATE public.quiz_attempts
     SET submitted_at = now(),
         score = v_score,
         max_score = v_total,
         pct = CASE WHEN v_total > 0 THEN ROUND((v_score / v_total) * 100, 2) ELSE 0 END,
         passed = CASE WHEN v_total > 0 THEN ((v_score / v_total) * 100) >= v_quiz.passing_pct ELSE false END,
         time_spent_seconds = EXTRACT(EPOCH FROM (now() - started_at))::int,
         updated_at = now()
   WHERE id = _attempt_id
   RETURNING * INTO v_attempt;

  RETURN v_attempt;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_quiz_attempt(UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_quiz_attempt(UUID, JSONB) TO authenticated;
