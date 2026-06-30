ALTER TABLE public.user_roles DISABLE TRIGGER USER;

INSERT INTO public.user_roles (user_id, role, granted_by)
VALUES ('7e75ce88-2d34-4475-9751-ba7000cc0f04','super_admin','7e75ce88-2d34-4475-9751-ba7000cc0f04')
ON CONFLICT (user_id, role) DO NOTHING;

ALTER TABLE public.user_roles ENABLE TRIGGER USER;

INSERT INTO public.profiles (user_id, full_name, display_name, onboarded_at)
VALUES ('7e75ce88-2d34-4475-9751-ba7000cc0f04','Akshay Sharma','Akshay', now())
ON CONFLICT (user_id) DO UPDATE
  SET onboarded_at = COALESCE(public.profiles.onboarded_at, EXCLUDED.onboarded_at),
      full_name    = COALESCE(public.profiles.full_name, EXCLUDED.full_name);

WITH c AS (
  INSERT INTO public.courses (title, slug, code, description, status, sort_order, created_by)
  VALUES ('Bachelor of Computer Applications','bca','BCA',
          '3-year undergraduate program in computer applications.',
          'published', 1, '7e75ce88-2d34-4475-9751-ba7000cc0f04')
  ON CONFLICT (slug) DO UPDATE SET status = 'published'
  RETURNING id
)
INSERT INTO public.semesters (course_id, number, title, status)
SELECT c.id, n, 'Semester '||n, 'published'
FROM c, generate_series(1,6) AS n
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.bootstrap_grant_super_admin(_target_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_exists boolean;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('bootstrap_super_admin'));
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'super_admin') INTO v_exists;
  IF v_exists THEN
    RAISE EXCEPTION 'Super admin already exists' USING ERRCODE = '42501';
  END IF;
  IF _target_user_id IS NULL THEN
    RAISE EXCEPTION 'Target user id required';
  END IF;

  EXECUTE 'ALTER TABLE public.user_roles DISABLE TRIGGER USER';
  INSERT INTO public.user_roles (user_id, role, granted_by)
  VALUES (_target_user_id, 'super_admin', _target_user_id);
  EXECUTE 'ALTER TABLE public.user_roles ENABLE TRIGGER USER';
END;
$function$;