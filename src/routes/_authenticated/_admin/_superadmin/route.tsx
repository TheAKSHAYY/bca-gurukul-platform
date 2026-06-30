import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/_admin/_superadmin")({
  ssr: false,
  beforeLoad: async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw redirect({ to: "/auth" });

    const { data, error } = await supabase.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "super_admin",
    });
    if (error || !data) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: () => <Outlet />,
});
