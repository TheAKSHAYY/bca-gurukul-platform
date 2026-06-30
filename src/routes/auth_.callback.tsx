import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import { resolvePostAuthRoute } from "@/lib/post-auth";

export const Route = createFileRoute("/auth_/callback")({
  ssr: false,
  validateSearch: (s) => z.object({ redirect: z.string().optional() }).parse(s),
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Supabase parses the URL fragment automatically; wait briefly for it.
      for (let i = 0; i < 30; i++) {
        const { data } = await supabase.auth.getUser();
        if (data.user) {
          if (cancelled) return;
          const dest = redirect ?? (await resolvePostAuthRoute(data.user.id));
          navigate({ to: dest, replace: true });
          return;
        }
        await new Promise((r) => setTimeout(r, 100));
      }
      if (cancelled) return;
      toast.error("Sign in failed. Please try again.");
      navigate({ to: "/auth", replace: true });
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate, redirect]);

  return (
    <div className="grid min-h-screen place-items-center bg-background text-foreground">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Completing sign in…
      </div>
    </div>
  );
}
