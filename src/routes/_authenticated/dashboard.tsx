import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { BookOpen, FileText, ListChecks, LogOut, PlayCircle } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard · BCA Gurukul" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/auth", replace: true });
  }

  const name = (user.user_metadata?.full_name as string | undefined) ?? user.email ?? "there";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link to="/" className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <span className="font-display text-lg font-semibold">ब</span>
            </div>
            <div className="font-display text-base font-semibold text-foreground">BCA Gurukul</div>
          </Link>
          <Button variant="outline" size="sm" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="font-display text-3xl font-semibold text-foreground">
          Welcome, <span className="text-primary">{name.split(" ")[0]}</span>.
        </h1>
        <p className="mt-2 text-muted-foreground">
          Your courses and progress will appear here as content is published. The catalog opens in Phase 6.
        </p>

        <section className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <PlaceholderCard icon={<BookOpen className="h-5 w-5" />} title="Notes" body="Coming in Phase 8" />
          <PlaceholderCard icon={<FileText className="h-5 w-5" />} title="Past papers" body="Coming in Phase 9" />
          <PlaceholderCard icon={<PlayCircle className="h-5 w-5" />} title="Videos" body="Coming in Phase 9" />
          <PlaceholderCard icon={<ListChecks className="h-5 w-5" />} title="MCQ practice" body="Coming in Phase 10" />
        </section>
      </main>
    </div>
  );
}

function PlaceholderCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">{icon}</div>
      <h3 className="mt-4 font-display text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
