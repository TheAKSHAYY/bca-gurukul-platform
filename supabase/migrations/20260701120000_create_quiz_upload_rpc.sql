-- Atomic quiz + questions creation from uploaded file
-- Admin-only. Returns the new quiz id.

CREATE OR REPLACE FUNCTION public.admin_create_quiz_with_questions(
  _unit_id uuid,
  _quiz jsonb,           -- quiz metadata
  _questions jsonb       -- array of questions with options
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quiz_id uuid;
  v_question jsonb;
  v_question_id uuid;
  v_option jsonb;
  v_idx int := 0;
  v_opt_idx int := 0;
  v_type text;
  v_correct_count int;
BEGIN
  -- Admin check
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  -- Validate unit exists
  IF NOT EXISTS (SELECT 1 FROM public.units WHERE id = _unit_id) THEN
    RAISE EXCEPTION 'Unit not found' USING ERRCODE = 'P0001';
  END IF;

  -- Validate quiz metadata
  IF _quiz->>'title' IS NULL OR _quiz->>'title' = '' THEN
    RAISE EXCEPTION 'Quiz title is required' USING ERRCODE = 'P0001';
  END IF;
  IF _quiz->>'slug' IS NULL OR _quiz->>'slug' = '' THEN
    RAISE EXCEPTION 'Quiz slug is required' USING ERRCODE = 'P0001';
  END IF;

  -- Check slug uniqueness within unit
  IF EXISTS (SELECT 1 FROM public.quizzes WHERE unit_id = _unit_id AND slug = _quiz->>'slug' AND deleted_at IS NULL) THEN
    RAISE EXCEPTION 'Quiz with this slug already exists in this unit' USING ERRCODE = '23505';
  END IF;

  -- Insert quiz
  INSERT INTO public.quizzes (
    unit_id, title, slug, description, instructions,
    time_limit_minutes, passing_pct, max_attempts,
    shuffle_questions, shuffle_options, negative_marking, is_public,
    status, created_by
  ) VALUES (
    _unit_id,
    _quiz->>'title',
    _quiz->>'slug',
    NULLIF((_quiz->>'description')::text, ''),
    NULLIF((_quiz->>'instructions')::text, ''),
    COALESCE(NULLIF((_quiz->>'time_limit_minutes')::text, '')::int, NULL),
    COALESCE((_quiz->>'passing_pct')::numeric, 50),
    COALESCE((_quiz->>'max_attempts')::int, 0),
    COALESCE((_quiz->>'shuffle_questions')::boolean, false),
    COALESCE((_quiz->>'shuffle_options')::boolean, false),
    COALESCE((_quiz->>'negative_marking')::boolean, false),
    COALESCE((_quiz->>'is_public')::boolean, true),
    COALESCE(_quiz->>'status', 'draft'),
    auth.uid()
  ) RETURNING id INTO v_quiz_id;

  -- Validate questions array
  IF jsonb_typeof(_questions) <> 'array' OR jsonb_array_length(_questions) = 0 THEN
    RAISE EXCEPTION 'At least one question is required' USING ERRCODE = 'P0001';
  END IF;

  -- Insert questions + options
  FOR v_question IN SELECT * FROM jsonb_array_elements(_questions) LOOP
    v_idx := v_idx + 1;

    -- Validate question
    IF v_question->>'prompt' IS NULL OR v_question->>'prompt' = '' THEN
      RAISE EXCEPTION 'Question %: prompt is required', v_idx USING ERRCODE = 'P0001';
    END IF;

    -- Count correct options
    SELECT COUNT(*) INTO v_correct_count
    FROM jsonb_array_elements(v_question->'options') o
    WHERE (o->>'is_correct')::boolean;

    IF v_correct_count = 0 THEN
      RAISE EXCEPTION 'Question %: at least one correct option required', v_idx USING ERRCODE = 'P0001';
    END IF;

    -- Determine type from correct option count
    v_type := CASE WHEN v_correct_count > 1 THEN 'multiple' ELSE 'single' END;

    -- Override type if explicitly provided and valid
    IF v_question->>'type' IS NOT NULL AND v_question->>'type' IN ('single', 'multiple', 'true_false') THEN
      v_type := v_question->>'type';
      -- For true_false, ensure exactly 2 options
      IF v_type = 'true_false' AND v_correct_count <> 1 THEN
        RAISE EXCEPTION 'Question %: true_false must have exactly one correct option', v_idx USING ERRCODE = 'P0001';
      END IF;
    END IF;

    INSERT INTO public.quiz_questions (
      quiz_id, prompt, explanation, type, points, order_index,
      difficulty, negative_marks, tags, year, exam_name, university
    ) VALUES (
      v_quiz_id,
      v_question->>'prompt',
      NULLIF((v_question->>'explanation')::text, ''),
      v_type,
      COALESCE((v_question->>'points')::numeric, 1),
      v_idx,
      COALESCE(v_question->>'difficulty', 'medium'),
      COALESCE((v_question->>'negative_marks')::numeric, 0),
      COALESCE((v_question->>'tags')::text[], '{}'),
      COALESCE(NULLIF((v_question->>'year')::text, '')::int, NULL),
      NULLIF((v_question->>'exam_name')::text, ''),
      NULLIF((v_question->>'university')::text, '')
    ) RETURNING id INTO v_question_id;

    v_opt_idx := 0;
    FOR v_option IN SELECT * FROM jsonb_array_elements(v_question->'options') LOOP
      v_opt_idx := v_opt_idx + 1;

      IF v_option->>'text' IS NULL OR v_option->>'text' = '' THEN
        RAISE EXCEPTION 'Question % option %: text is required', v_idx, v_opt_idx USING ERRCODE = 'P0001';
      END IF;

      INSERT INTO public.quiz_options (question_id, text, is_correct, order_index)
      VALUES (v_question_id, v_option->>'text', COALESCE((v_option->>'is_correct')::boolean, false), v_opt_idx);
    END LOOP;

    -- Validate minimum 2 options per question
    IF v_opt_idx < 2 THEN
      RAISE EXCEPTION 'Question %: at least 2 options required', v_idx USING ERRCODE = 'P0001';
    END IF;
  END LOOP;

  RETURN v_quiz_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_create_quiz_with_questions(uuid, jsonb, jsonb) TO authenticated;