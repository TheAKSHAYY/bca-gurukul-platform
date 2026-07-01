import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, ArrowRight, GraduationCap, Library, Bell } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { EmptyState } from "@/components/ui/empty-state";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/courses/")({
  head: () => ({
    meta: [
      { title: "Courses · BCA Gurukul" },
      {
        name: "description",
        content:
          "Browse all programs offered on BCA Gurukul — structured semester-by-semester learning paths.",
      },
    ],
  }),
  component: CoursesIndex,
});

function CoursesIndex() {
  const { data, isLoading } = useQuery({
    queryKey: ["public", "courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, code, title, slug, description, duration_years, total_semesters")
        .eq("status", "published")
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <main className="mx-auto max-w-6xl px-6 py-14">
        <div className="flex items-center gap-3">
          <GraduationCap className="h-7 w-7 text-primary" />
          <h1 className="font-display text-4xl font-semibold text-foreground">All courses</h1>
        </div>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Pick a program to see its semester-by-semester breakdown, subjects, and study material.
        </p>

        <section className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!isLoading && (data?.length ?? 0) === 0 && (
            <div className="col-span-full">
              <EmptyState
                icon={Library}
                tone="accent"
                title="Courses are being curated"
                description="We're building each program semester by semester — notes, past papers, video lectures and timed MCQ practice, all syllabus-aligned. The catalog opens here the moment it's live."
                tip="Sign up free and we'll email you the day your course goes live — no spam, just one ping."
                primaryAction={{
                  label: "Get notified",
                  to: "/auth",
                  icon: Bell,
                }}
                secondaryAction={{ label: "Back to home", to: "/" }}
              />
            </div>
          )}
          {data?.map((c) => (
            <Link
              key={c.id}
              to="/courses/$courseSlug"
              params={{ courseSlug: c.slug }}
              className="group rounded-2xl border border-border bg-surface p-6 transition hover:border-primary/50 hover:shadow-sm"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <BookOpen className="h-5 w-5" />
              </div>
              <div className="mt-4 font-mono text-xs uppercase tracking-wider text-muted-foreground">
                {c.code}
              </div>
              <h3 className="mt-1 font-display text-xl font-semibold text-foreground">{c.title}</h3>
              {c.description && (
                <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{c.description}</p>
              )}
              <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {c.total_semesters} semesters
                  {c.duration_years ? ` · ${c.duration_years} yrs` : ""}
                </span>
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </div>
            </Link>
          ))}
        </section>
      </main>
    </div>
  );
}

export function PublicHeader() {
  const { user, loading } = useAuth();

  return (
    <header className="border-b border-border/60">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
            <span className="font-display text-base font-semibold">ब</span>
          </div>
          <span className="font-display text-lg font-semibold text-foreground">BCA Gurukul</span>
        </Link>
        <nav className="flex items-center gap-5 text-sm">
          <Link
            to="/courses"
            className="text-foreground hover:text-primary"
            activeProps={{ className: "text-primary" }}
          >
            Courses
          </Link>
          {!loading && user ? (
            <Link
              to="/dashboard"
              className="rounded-md bg-primary px-3 py-1.5 text-primary-foreground hover:bg-primary/90"
            >
              Dashboard
            </Link>
          ) : (
            <Link
              to="/auth"
              className="rounded-md bg-primary px-3 py-1.5 text-primary-foreground hover:bg-primary/90"
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
