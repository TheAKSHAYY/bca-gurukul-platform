
CREATE OR REPLACE FUNCTION public.bootstrap_status()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'super_admin');
$$;

REVOKE ALL ON FUNCTION public.bootstrap_status() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bootstrap_status() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.bootstrap_grant_super_admin(_target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exists boolean;
BEGIN
  -- Race-safe: lock and re-check inside the txn.
  PERFORM pg_advisory_xact_lock(hashtext('bootstrap_super_admin'));

  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'super_admin')
    INTO v_exists;

  IF v_exists THEN
    RAISE EXCEPTION 'Super admin already exists' USING ERRCODE = '42501';
  END IF;

  IF _target_user_id IS NULL THEN
    RAISE EXCEPTION 'Target user id required';
  END IF;

  -- Insert directly; bypasses the prevent_role_self_escalation trigger
  -- because this function runs as the function owner (SECURITY DEFINER).
  -- The trigger checks auth.uid(); in this path it may be the new user.
  -- Disable the trigger for this insert by inserting via session_replication_role.
  PERFORM set_config('session_replication_role', 'replica', true);
  INSERT INTO public.user_roles (user_id, role, granted_by)
  VALUES (_target_user_id, 'super_admin', _target_user_id);
  PERFORM set_config('session_replication_role', 'origin', true);
END;
$$;

REVOKE ALL ON FUNCTION public.bootstrap_grant_super_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bootstrap_grant_super_admin(uuid) TO authenticated;
