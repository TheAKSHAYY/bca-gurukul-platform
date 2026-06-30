import { supabase } from "@/integrations/supabase/client";

/**
 * Resolve where a user should land after authenticating.
 * - Admins / Super Admins → /admin
 * - First-time users (no profile or no onboarded_at) → /onboarding
 * - Everyone else → /dashboard
 *
 * Role is always read from the database (user_roles table) via `has_role`.
 * Never trust frontend role claims.
 */
export async function resolvePostAuthRoute(userId: string): Promise<string> {
  const [{ data: isSuper }, { data: isAdmin }] = await Promise.all([
    supabase.rpc("has_role", { _user_id: userId, _role: "super_admin" }),
    supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
  ]);
  if (isSuper || isAdmin) return "/admin";

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarded_at, full_name")
    .eq("user_id", userId)
    .maybeSingle();

  if (!profile || !profile.onboarded_at) return "/onboarding";
  return "/dashboard";
}
