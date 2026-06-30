import { createFileRoute, Outlet, redirect, useRouterState } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";
import { AppNavbar } from "@/components/app-navbar";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/auth", search: { redirect: location.href } });
    }
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // Admin shell renders its own chrome.
  const hideChrome = pathname.startsWith("/admin");
  return (
    <div className="min-h-screen bg-background text-foreground">
      {!hideChrome && <AppNavbar />}
      <Outlet />
    </div>
  );
}
