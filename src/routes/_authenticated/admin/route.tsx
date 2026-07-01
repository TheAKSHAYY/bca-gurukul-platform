import { createFileRoute, redirect } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/admin-shell";

export const Route = createFileRoute("/_authenticated/admin")({
  ssr: false,
  beforeLoad: async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw redirect({ to: "/auth" });

    const { data, error } = await supabase.rpc("is_admin", {
      _user_id: userData.user.id,
    });
    if (error || !data) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: AdminShell,
});
