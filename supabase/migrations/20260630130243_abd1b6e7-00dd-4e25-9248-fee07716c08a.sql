
-- ============================================================================
-- Batch A.1 — Prevent role self-escalation on user_roles
-- ============================================================================
-- The existing "Roles: super admin manage" FOR ALL policy already restricts
-- writes to super_admins. We add a defense-in-depth trigger so that, even if
-- a future policy is loosened or a SECURITY DEFINER function inserts on
-- behalf of a user, no one (except super_admin) can grant themselves a role,
-- and no one can grant a higher-privilege role to anyone unless they are a
-- super_admin. service_role bypasses the check (auth.uid() is null).

CREATE OR REPLACE FUNCTION public.prevent_role_self_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_is_super BOOLEAN;
BEGIN
  -- service_role / migrations bypass (no JWT)
  IF v_actor IS NULL THEN
    RETURN NEW;
  END IF;

  v_is_super := public.has_role(v_actor, 'super_admin');

  -- Only super_admin may write user_roles at all.
  IF NOT v_is_super THEN
    RAISE EXCEPTION 'Only super_admin can modify user_roles'
      USING ERRCODE = '42501';
  END IF;

  -- Belt & suspenders: a super_admin cannot demote themselves to nothing
  -- (prevents accidental lockout). They can still assign other roles.
  IF TG_OP = 'DELETE' AND OLD.user_id = v_actor AND OLD.role = 'super_admin' THEN
    IF (SELECT count(*) FROM public.user_roles
        WHERE role = 'super_admin' AND user_id <> v_actor) = 0 THEN
      RAISE EXCEPTION 'Cannot remove the last super_admin'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_role_self_escalation_ins ON public.user_roles;
DROP TRIGGER IF EXISTS trg_prevent_role_self_escalation_upd ON public.user_roles;
DROP TRIGGER IF EXISTS trg_prevent_role_self_escalation_del ON public.user_roles;

CREATE TRIGGER trg_prevent_role_self_escalation_ins
  BEFORE INSERT ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_role_self_escalation();

CREATE TRIGGER trg_prevent_role_self_escalation_upd
  BEFORE UPDATE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_role_self_escalation();

CREATE TRIGGER trg_prevent_role_self_escalation_del
  BEFORE DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_role_self_escalation();
