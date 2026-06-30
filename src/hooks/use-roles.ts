import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export type AppRole = "super_admin" | "admin" | "instructor" | "student";

export function useRoles() {
  const { user, loading: authLoading } = useAuth();

  const query = useQuery({
    queryKey: ["user-roles", user?.id],
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data ?? []).map((r) => r.role as AppRole);
    },
  });

  const roles = query.data ?? [];
  return {
    roles,
    loading: authLoading || query.isLoading,
    hasRole: (r: AppRole) => roles.includes(r),
    isAdmin: roles.includes("admin") || roles.includes("super_admin"),
    isSuperAdmin: roles.includes("super_admin"),
    isInstructor: roles.includes("instructor"),
  };
}
