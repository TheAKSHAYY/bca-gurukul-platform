import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  BookOpen,
  Compass,
  FileText,
  ListChecks,
  LogOut,
  PlayCircle,
  Sparkles,
} from "lucide-react";
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

  const fullName = (user.user_metadata?.full_name as string | undefined) ?? user.email ?? "there";
  const firstName = fullName.split(" ")[0];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <span className="font-display text-lg font-semibold">ब</span>
            </div>
            <div className="font-display text-base font-semibold text-foreground">
              BCA Gurukul
            </div>
          </Link>
          <Button variant="outline" size="sm" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12">
        {/* Greeting */}
        <section className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary to-primary/85 p-8 text-primary-foreground sm:p-10">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-accent/30 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-24 -left-10 h-64 w-64 rounded-full bg-accent/15 blur-3xl"
          />
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-primary-foreground/10 px-3 py-1 text-xs">
                <Sparkles className="h-3 w-3" />
                Glad to see you back
              </div>
              <h1 className="mt-3 font-display text-3xl font-semibold leading-tight sm:text-4xl">
                Welcome, {firstName}.
              </h1>
              <p className="mt-2 max-w-xl text-sm text-primary-foreground/80">
                Pick up where you left off, or explore something new this week.
              </p>
            </div>
            <Button asChild size="lg" variant="secondary" className="shrink-0">
              <Link to="/courses">
                Browse courses
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>

        {/* Quick actions */}
        <section className="mt-10">
          <h2 className="font-display text-xl font-semibold text-foreground">
            Quick actions
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Jump straight into the part of the platform you need right now.
          </p>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <ActionCard
              to="/courses"
              icon={<BookOpen className="h-5 w-5" />}
              title="Notes"
              body="Read structured semester-wise notes."
            />
            <ActionCard
              to="/courses"
              icon={<FileText className="h-5 w-5" />}
              title="Past papers"
              body="Practise with previous year question papers."
            />
            <ActionCard
              to="/courses"
              icon={<PlayCircle className="h-5 w-5" />}
              title="Video lectures"
              body="Watch curated lectures alongside the syllabus."
            />
            <ActionCard
              to="/courses"
              icon={<ListChecks className="h-5 w-5" />}
              title="MCQ practice"
              body="Take timed quizzes with explanations."
            />
          </div>
        </section>

        {/* Empty-state explorer */}
        <section className="mt-12 grid gap-5 lg:grid-cols-3">
          <div className="rounded-2xl border border-dashed border-border bg-surface p-6 lg:col-span-2">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent/20 text-accent-foreground">
              <Compass className="h-5 w-5" />
            </div>
            <h3 className="mt-4 font-display text-lg font-semibold text-foreground">
              Start exploring your syllabus
            </h3>
            <p className="mt-1.5 text-sm text-muted-foreground">
              You haven't opened a unit yet. Browse the course catalog to find
              your semester, pick a subject, and start with the first unit.
            </p>
            <Button asChild className="mt-5" size="sm">
              <Link to="/courses">
                Explore courses
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="rounded-2xl border border-border bg-surface-muted/60 p-6">
            <h3 className="font-display text-base font-semibold text-foreground">
              Announcements
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              No announcements yet. New units, papers and quizzes will appear
              here as they ship.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

function ActionCard({
  to,
  icon,
  title,
  body,
}: {
  to: "/courses";
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <Link
      to={to}
      className="group block rounded-2xl border border-border bg-surface p-5 transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
        {icon}
      </div>
      <h3 className="mt-4 font-display text-base font-semibold text-foreground">
        {title}
      </h3>
      <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
      <div className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
        Open
        <ArrowRight className="h-3.5 w-3.5" />
      </div>
    </Link>
  );
}
