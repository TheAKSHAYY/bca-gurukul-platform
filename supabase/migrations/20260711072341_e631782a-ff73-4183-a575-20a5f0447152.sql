CREATE OR REPLACE FUNCTION public.admin_create_mcq(_quiz_id uuid, _prompt text, _options jsonb, _explanation text DEFAULT NULL::text, _difficulty text DEFAULT 'medium'::text, _points numeric DEFAULT 1, _negative_marks numeric DEFAULT 0, _tags text[] DEFAULT '{}'::text[], _year integer DEFAULT NULL::integer, _exam_name text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
     (CASE WHEN (SELECT COUNT(*) FROM jsonb_array_elements(_options) o WHERE (o->>'is_correct')::boolean) > 1
          THEN 'multiple' ELSE 'single' END)::public.quiz_question_type,
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
$function$;