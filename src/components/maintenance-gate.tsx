import { useQuery } from "@tanstack/react-query";
import { Link, useRouter } from "@tanstack/react-router";
import { Wrench } from "lucide-react";
import type { ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useRoles } from "@/hooks/use-roles";

/**
 * Blocks the app with a maintenance screen when the global flag is on.
 * Admins (and the /auth and /reset-password routes) bypass.
 */
export function MaintenanceGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = router.state.location.pathname;
  const { user } = useAuth();
  const { isAdmin } = useRoles();

  const { data } = useQuery({
    queryKey: ["maintenance", "current"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance")
        .select("enabled, message, scheduled_end")
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 60_000,
  });

  const bypass = isAdmin || pathname.startsWith("/auth") || pathname.startsWith("/reset-password");

  if (!data?.enabled || bypass) return <>{children}</>;

  return (
    <div className="grid min-h-screen place-items-center bg-background px-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 text-center shadow-sm">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-accent/15 text-accent">
          <Wrench className="h-7 w-7" />
        </div>
        <h1 className="mt-5 font-display text-2xl font-semibold text-foreground">
          We'll be right back
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {data.message ??
            "BCA Gurukul is undergoing scheduled maintenance. Please check back soon."}
        </p>
        {data.scheduled_end && (
          <p className="mt-2 text-xs text-muted-foreground">
            Estimated back online: {new Date(data.scheduled_end).toLocaleString()}
          </p>
        )}
        {!user && (
          <Link
            to="/auth"
            className="mt-6 inline-flex rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent/10"
          >
            Admin sign in
          </Link>
        )}
      </div>
    </div>
  );
}
