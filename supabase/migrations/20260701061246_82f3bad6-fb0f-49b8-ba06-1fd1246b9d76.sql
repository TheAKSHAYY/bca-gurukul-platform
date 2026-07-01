
-- Extend quiz_questions with MCQ metadata
ALTER TABLE public.quiz_questions
  ADD COLUMN IF NOT EXISTS difficulty text CHECK (difficulty IN ('easy','medium','hard')) DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS negative_marks numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS year integer,
  ADD COLUMN IF NOT EXISTS exam_name text,
  ADD COLUMN IF NOT EXISTS university text,
  ADD COLUMN IF NOT EXISTS image_url text;

CREATE INDEX IF NOT EXISTS quiz_questions_difficulty_idx ON public.quiz_questions(difficulty);
CREATE INDEX IF NOT EXISTS quiz_questions_year_idx ON public.quiz_questions(year);
CREATE INDEX IF NOT EXISTS quiz_questions_tags_gin ON public.quiz_questions USING gin(tags);

-- Extend quizzes with test-mode settings
ALTER TABLE public.quizzes
  ADD COLUMN IF NOT EXISTS negative_marking boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS start_date timestamptz,
  ADD COLUMN IF NOT EXISTS end_date timestamptz,
  ADD COLUMN IF NOT EXISTS passing_marks numeric;

-- Bulk insert helper: create a question + its options atomically.
-- Admin-only. Returns the new question id.
CREATE OR REPLACE FUNCTION public.admin_create_mcq(
  _quiz_id uuid,
  _prompt text,
  _options jsonb,          -- [{"text":"...","is_correct":true}, ...]
  _explanation text DEFAULT NULL,
  _difficulty text DEFAULT 'medium',
  _points numeric DEFAULT 1,
  _negative_marks numeric DEFAULT 0,
  _tags text[] DEFAULT '{}',
  _year integer DEFAULT NULL,
  _exam_name text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_qid uuid;
  v_next_order int;
  v_opt jsonb;
  v_idx int := 0;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(MAX(order_index), 0) + 1 INTO v_next_order
    FROM public.quiz_questions WHERE quiz_id = _quiz_id;

  INSERT INTO public.quiz_questions
    (quiz_id, prompt, explanation, type, points, order_index,
     difficulty, negative_marks, tags, year, exam_name)
  VALUES
    (_quiz_id, _prompt, _explanation,
     CASE WHEN (SELECT COUNT(*) FROM jsonb_array_elements(_options) o WHERE (o->>'is_correct')::boolean) > 1
          THEN 'multiple' ELSE 'single' END,
     _points, v_next_order,
     COALESCE(_difficulty, 'medium'), COALESCE(_negative_marks, 0),
     COALESCE(_tags, '{}'), _year, _exam_name)
  RETURNING id INTO v_qid;

  FOR v_opt IN SELECT * FROM jsonb_array_elements(_options) LOOP
    v_idx := v_idx + 1;
    INSERT INTO public.quiz_options (question_id, text, is_correct, order_index)
    VALUES (v_qid, v_opt->>'text', COALESCE((v_opt->>'is_correct')::boolean, false), v_idx);
  END LOOP;

  RETURN v_qid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_create_mcq(uuid, text, jsonb, text, text, numeric, numeric, text[], integer, text) TO authenticated;
