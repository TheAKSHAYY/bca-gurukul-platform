CREATE OR REPLACE FUNCTION public.student_search(
  _query text,
  _max_results int DEFAULT 20
)
RETURNS TABLE (
  kind text,
  id uuid,
  title text,
  description text,
  slug text,
  rank double precision
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH safe_query AS (
    SELECT
      _query AS raw,
      plainto_tsquery('english', _query) AS tsq,
      '%' || replace(replace(_query, '%', '\%'), '_', '\_') || '%' AS like_pattern
  )
  SELECT * FROM (
    -- courses
    SELECT
      'course'::text AS kind,
      c.id,
      c.title,
      COALESCE(c.description, '')::text,
      c.slug,
      (
        ts_rank_cd(
          setweight(to_tsvector('english', COALESCE(c.title, '')), 'A') ||
          setweight(to_tsvector('english', COALESCE(c.description, '')), 'B'),
          safe_query.tsq
        ) * 10 +
        CASE WHEN c.title ILIKE safe_query.raw THEN 100 ELSE 0 END +
        CASE WHEN c.title ILIKE safe_query.raw || '%' THEN 50 ELSE 0 END +
        CASE WHEN c.description ILIKE safe_query.like_pattern THEN 10 ELSE 0 END
      ) AS rank
    FROM public.courses c, safe_query
    WHERE c.status = 'published'
      AND c.deleted_at IS NULL
      AND (
        c.title ILIKE safe_query.like_pattern
        OR c.description ILIKE safe_query.like_pattern
        OR (setweight(to_tsvector('english', COALESCE(c.title, '')), 'A') ||
            setweight(to_tsvector('english', COALESCE(c.description, '')), 'B')) @@ safe_query.tsq
      )

    UNION ALL

    -- units
    SELECT
      'unit'::text AS kind,
      u.id,
      u.title,
      COALESCE(u.summary, '')::text,
      NULL::text,
      (
        ts_rank_cd(
          setweight(to_tsvector('english', COALESCE(u.title, '')), 'A') ||
          setweight(to_tsvector('english', COALESCE(u.summary, '')), 'B'),
          safe_query.tsq
        ) * 10 +
        CASE WHEN u.title ILIKE safe_query.raw THEN 100 ELSE 0 END +
        CASE WHEN u.title ILIKE safe_query.raw || '%' THEN 50 ELSE 0 END +
        CASE WHEN u.summary ILIKE safe_query.like_pattern THEN 10 ELSE 0 END
      )
    FROM public.units u, safe_query
    WHERE u.status = 'published'
      AND u.deleted_at IS NULL
      AND (
        u.title ILIKE safe_query.like_pattern
        OR u.summary ILIKE safe_query.like_pattern
        OR (setweight(to_tsvector('english', COALESCE(u.title, '')), 'A') ||
            setweight(to_tsvector('english', COALESCE(u.summary, '')), 'B')) @@ safe_query.tsq
      )

    UNION ALL

    -- notes
    SELECT
      'note'::text,
      n.id,
      n.title,
      COALESCE(n.summary, '')::text,
      n.slug,
      (
        ts_rank_cd(
          setweight(to_tsvector('english', COALESCE(n.title, '')), 'A') ||
          setweight(to_tsvector('english', COALESCE(n.summary, '') || ' ' || COALESCE(n.body, '')), 'B'),
          safe_query.tsq
        ) * 10 +
        CASE WHEN n.title ILIKE safe_query.raw THEN 100 ELSE 0 END +
        CASE WHEN n.title ILIKE safe_query.raw || '%' THEN 50 ELSE 0 END +
        CASE WHEN n.summary ILIKE safe_query.like_pattern OR n.body ILIKE safe_query.like_pattern THEN 10 ELSE 0 END
      )
    FROM public.notes n, safe_query
    WHERE n.status = 'published'
      AND n.deleted_at IS NULL
      AND (
        n.title ILIKE safe_query.like_pattern
        OR n.summary ILIKE safe_query.like_pattern
        OR n.body ILIKE safe_query.like_pattern
        OR (setweight(to_tsvector('english', COALESCE(n.title, '')), 'A') ||
            setweight(to_tsvector('english', COALESCE(n.summary, '') || ' ' || COALESCE(n.body, '')), 'B')) @@ safe_query.tsq
      )

    UNION ALL

    -- papers
    SELECT
      'paper'::text,
      p.id,
      p.title,
      COALESCE(p.description, '')::text,
      NULL::text,
      (
        ts_rank_cd(
          setweight(to_tsvector('english', COALESCE(p.title, '')), 'A') ||
          setweight(to_tsvector('english', COALESCE(p.description, '')), 'B'),
          safe_query.tsq
        ) * 10 +
        CASE WHEN p.title ILIKE safe_query.raw THEN 100 ELSE 0 END +
        CASE WHEN p.title ILIKE safe_query.raw || '%' THEN 50 ELSE 0 END +
        CASE WHEN p.description ILIKE safe_query.like_pattern THEN 10 ELSE 0 END
      )
    FROM public.papers p, safe_query
    WHERE p.status = 'published'
      AND p.deleted_at IS NULL
      AND (
        p.title ILIKE safe_query.like_pattern
        OR p.description ILIKE safe_query.like_pattern
        OR (setweight(to_tsvector('english', COALESCE(p.title, '')), 'A') ||
            setweight(to_tsvector('english', COALESCE(p.description, '')), 'B')) @@ safe_query.tsq
      )

    UNION ALL

    -- quizzes
    SELECT
      'quiz'::text,
      z.id,
      z.title,
      COALESCE(z.description, '')::text,
      z.slug,
      (
        ts_rank_cd(
          setweight(to_tsvector('english', COALESCE(z.title, '')), 'A') ||
          setweight(to_tsvector('english', COALESCE(z.description, '') || ' ' || COALESCE(z.instructions, '')), 'B'),
          safe_query.tsq
        ) * 10 +
        CASE WHEN z.title ILIKE safe_query.raw THEN 100 ELSE 0 END +
        CASE WHEN z.title ILIKE safe_query.raw || '%' THEN 50 ELSE 0 END +
        CASE WHEN z.description ILIKE safe_query.like_pattern OR z.instructions ILIKE safe_query.like_pattern THEN 10 ELSE 0 END
      )
    FROM public.quizzes z, safe_query
    WHERE z.status = 'published'
      AND z.deleted_at IS NULL
      AND (
        z.title ILIKE safe_query.like_pattern
        OR z.description ILIKE safe_query.like_pattern
        OR z.instructions ILIKE safe_query.like_pattern
        OR (setweight(to_tsvector('english', COALESCE(z.title, '')), 'A') ||
            setweight(to_tsvector('english', COALESCE(z.description, '') || ' ' || COALESCE(z.instructions, '')), 'B')) @@ safe_query.tsq
      )
  ) AS r
  WHERE r.rank > 0
  ORDER BY r.rank DESC
  LIMIT _max_results;
$$;

GRANT EXECUTE ON FUNCTION public.student_search(text, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.student_search(text, int) TO service_role;