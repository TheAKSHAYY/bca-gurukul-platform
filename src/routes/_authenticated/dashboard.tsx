import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Bell,
  Bookmark,
  BookOpen,
  Compass,
  FileText,
  ListChecks,
  LogOut,
  PlayCircle,
  Search,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";


import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

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

  const bookmarksQuery = useQuery({
    queryKey: ["student-bookmarks", user.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("student_bookmarks", { _limit: 6 });
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string;
        kind: "note" | "paper" | "quiz" | "unit";
        ref_id: string;
        title: string | null;
        created_at: string;
      }>;
    },
  });

  const progressQuery = useQuery({
    queryKey: ["student-progress", user.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("student_progress", { _limit: 5 });
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string;
        unit_id: string;
        unit_title: string | null;
        subject_title: string | null;
        status: "not_started" | "in_progress" | "completed";
        progress_pct: number;
        last_activity_at: string;
      }>;
    },
  });

  const notificationsQuery = useQuery({
    queryKey: ["student-notifications", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("id, kind, title, body, link, read_at, published_at")
        .eq("user_id", user.id)
        .eq("status", "published")
        .is("deleted_at", null)
        .order("published_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string;
        kind: "system" | "content" | "quiz" | "announcement";
        title: string;
        body: string | null;
        link: string | null;
        read_at: string | null;
        published_at: string | null;
      }>;
    },
  });

  const bookmarks = bookmarksQuery.data ?? [];
  const progress = progressQuery.data ?? [];
  const notifications = notificationsQuery.data ?? [];
  const unreadCount = notifications.filter((n) => !n.read_at).length;

  async function markAllRead() {
    if (unreadCount === 0) return;
    const ids = notifications.filter((n) => !n.read_at).map((n) => n.id);
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .in("id", ids);
    if (error) {
      toast.error("Could not update notifications");
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["student-notifications", user.id] });
  }


  const [searchInput, setSearchInput] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(searchInput.trim()), 250);
    return () => clearTimeout(id);
  }, [searchInput]);

  const searchEnabled = debouncedQuery.length >= 2;
  const searchQuery = useQuery({
    queryKey: ["dashboard-search", debouncedQuery],
    enabled: searchEnabled,
    queryFn: async () => {
      const pattern = `%${debouncedQuery.replace(/[%_]/g, (m) => `\\${m}`)}%`;

      const [courses, units, notes, papers, quizzes] = await Promise.all([
        supabase
          .from("courses")
          .select("id, title, slug")
          .eq("status", "published")
          .is("deleted_at", null)
          .ilike("title", pattern)
          .limit(5),
        supabase
          .from("units")
          .select("id, title")
          .eq("status", "published")
          .is("deleted_at", null)
          .ilike("title", pattern)
          .limit(5),
        supabase
          .from("notes")
          .select("id, title")
          .eq("status", "published")
          .is("deleted_at", null)
          .ilike("title", pattern)
          .limit(5),
        supabase
          .from("papers")
          .select("id, title")
          .eq("status", "published")
          .is("deleted_at", null)
          .ilike("title", pattern)
          .limit(5),
        supabase
          .from("quizzes")
          .select("id, title")
          .eq("status", "published")
          .is("deleted_at", null)
          .ilike("title", pattern)
          .limit(5),
      ]);

      const errs = [courses.error, units.error, notes.error, papers.error, quizzes.error].filter(Boolean);
      if (errs.length) throw errs[0];

      return {
        courses: (courses.data ?? []) as Array<{ id: string; title: string; slug: string }>,
        units: (units.data ?? []) as Array<{ id: string; title: string }>,
        notes: (notes.data ?? []) as Array<{ id: string; title: string }>,
        papers: (papers.data ?? []) as Array<{ id: string; title: string }>,
        quizzes: (quizzes.data ?? []) as Array<{ id: string; title: string }>,
      };
    },
  });

  const searchResults = searchQuery.data;
  const totalResults = searchResults
    ? searchResults.courses.length +
      searchResults.units.length +
      searchResults.notes.length +
      searchResults.papers.length +
      searchResults.quizzes.length
    : 0;

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

        {/* Search */}
        <section className="mt-8">
          <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
            <label htmlFor="dashboard-search" className="flex items-center gap-2.5">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
                <Search className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0">
                <h2 className="font-display text-lg font-semibold text-foreground">
                  Search the library
                </h2>
                <p className="text-xs text-muted-foreground">
                  Find published courses, units, notes, papers and quizzes.
                </p>
              </div>
            </label>

            <div className="mt-4 relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="dashboard-search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Try “data structures”, “DBMS 2023”, “OS quiz”…"
                className="pl-9"
                autoComplete="off"
              />
            </div>

            {!searchEnabled ? (
              <p className="mt-4 text-xs text-muted-foreground">
                Type at least 2 characters to begin searching.
              </p>
            ) : searchQuery.isLoading ? (
              <p className="mt-4 text-sm text-muted-foreground">Searching…</p>
            ) : searchQuery.isError ? (
              <p className="mt-4 text-sm text-destructive">
                Something went wrong. Try again.
              </p>
            ) : totalResults === 0 ? (
              <div className="mt-5 rounded-xl border border-dashed border-border bg-surface-muted/40 p-5 text-center">
                <p className="text-sm font-medium text-foreground">
                  No published matches for “{debouncedQuery}”
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  We only show content that has been published and is visible to you.
                </p>
              </div>
            ) : (
              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                {searchResults!.courses.length > 0 && (
                  <ResultGroup label="Courses" icon={<Compass className="h-3.5 w-3.5" />}>
                    {searchResults!.courses.map((c) => (
                      <Link
                        key={c.id}
                        to="/courses/$courseSlug"
                        params={{ courseSlug: c.slug }}
                        className={resultLinkClass}
                      >
                        {c.title}
                      </Link>
                    ))}
                  </ResultGroup>
                )}
                {searchResults!.units.length > 0 && (
                  <ResultGroup label="Units" icon={<BookOpen className="h-3.5 w-3.5" />}>
                    {searchResults!.units.map((u) => (
                      <Link key={u.id} to="/courses" className={resultLinkClass}>
                        {u.title}
                      </Link>
                    ))}
                  </ResultGroup>
                )}
                {searchResults!.notes.length > 0 && (
                  <ResultGroup label="Notes" icon={<FileText className="h-3.5 w-3.5" />}>
                    {searchResults!.notes.map((n) => (
                      <Link
                        key={n.id}
                        to="/notes/$noteId"
                        params={{ noteId: n.id }}
                        className={resultLinkClass}
                      >
                        {n.title}
                      </Link>
                    ))}
                  </ResultGroup>
                )}
                {searchResults!.papers.length > 0 && (
                  <ResultGroup label="Papers" icon={<FileText className="h-3.5 w-3.5" />}>
                    {searchResults!.papers.map((p) => (
                      <Link
                        key={p.id}
                        to="/papers/$paperId"
                        params={{ paperId: p.id }}
                        className={resultLinkClass}
                      >
                        {p.title}
                      </Link>
                    ))}
                  </ResultGroup>
                )}
                {searchResults!.quizzes.length > 0 && (
                  <ResultGroup label="Quizzes" icon={<ListChecks className="h-3.5 w-3.5" />}>
                    {searchResults!.quizzes.map((q) => (
                      <Link
                        key={q.id}
                        to="/quizzes/$quizId"
                        params={{ quizId: q.id }}
                        className={resultLinkClass}
                      >
                        {q.title}
                      </Link>
                    ))}
                  </ResultGroup>
                )}
              </div>
            )}
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

        {/* Continue learning + Bookmarks */}
        <section className="mt-12 grid gap-5 lg:grid-cols-3">
          <div className="rounded-2xl border border-border bg-surface p-6 lg:col-span-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
                  <TrendingUp className="h-4.5 w-4.5" />
                </div>
                <h3 className="font-display text-lg font-semibold text-foreground">
                  Continue learning
                </h3>
              </div>
              {progress.length > 0 && (
                <Button asChild variant="ghost" size="sm">
                  <Link to="/courses">
                    Browse
                    <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </Link>
                </Button>
              )}
            </div>

            {progressQuery.isLoading ? (
              <p className="mt-6 text-sm text-muted-foreground">Loading your progress…</p>
            ) : progress.length === 0 ? (
              <div className="mt-5 rounded-xl border border-dashed border-border bg-surface-muted/40 p-5">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-accent/20 text-accent-foreground">
                  <Compass className="h-4.5 w-4.5" />
                </div>
                <p className="mt-3 text-sm font-medium text-foreground">
                  No units in progress yet
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Open a unit from any subject and your progress will appear here.
                </p>
                <Button asChild className="mt-4" size="sm">
                  <Link to="/courses">
                    Explore courses
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            ) : (
              <ul className="mt-5 space-y-4">
                {progress.map((p) => (
                  <li key={p.id} className="rounded-xl border border-border/70 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {p.unit_title ?? "Untitled unit"}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {p.subject_title ?? "—"}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs font-medium text-muted-foreground">
                        {Math.round(Number(p.progress_pct))}%
                      </span>
                    </div>
                    <Progress value={Number(p.progress_pct)} className="mt-3 h-1.5" />
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-surface-muted/60 p-6">
            <div className="flex items-center gap-2.5">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-accent/20 text-accent-foreground">
                <Bookmark className="h-4.5 w-4.5" />
              </div>
              <h3 className="font-display text-lg font-semibold text-foreground">
                Bookmarks
              </h3>
            </div>

            {bookmarksQuery.isLoading ? (
              <p className="mt-6 text-sm text-muted-foreground">Loading bookmarks…</p>
            ) : bookmarks.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">
                Save notes, papers and quizzes to find them quickly. Your bookmarks will appear here.
              </p>
            ) : (
              <ul className="mt-4 space-y-2.5">
                {bookmarks.map((b) => (
                  <li key={b.id}>
                    <BookmarkLink kind={b.kind} refId={b.ref_id} title={b.title} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function BookmarkLink({
  kind,
  refId,
  title,
}: {
  kind: "note" | "paper" | "quiz" | "unit";
  refId: string;
  title: string | null;
}) {
  const label = title ?? "Untitled";
  const kindLabel =
    kind === "note" ? "Note" : kind === "paper" ? "Paper" : kind === "quiz" ? "Quiz" : "Unit";

  const inner = (
    <div className="group flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-background px-3 py-2.5 transition-colors hover:border-primary/40 hover:bg-surface">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{label}</p>
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{kindLabel}</p>
      </div>
      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
    </div>
  );

  if (kind === "note") {
    return (
      <Link to="/notes/$noteId" params={{ noteId: refId }}>
        {inner}
      </Link>
    );
  }
  if (kind === "paper") {
    return (
      <Link to="/papers/$paperId" params={{ paperId: refId }}>
        {inner}
      </Link>
    );
  }
  if (kind === "quiz") {
    return (
      <Link to="/quizzes/$quizId" params={{ quizId: refId }}>
        {inner}
      </Link>
    );
  }
  return (
    <Link to="/courses">
      {inner}
    </Link>
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

const resultLinkClass =
  "block truncate rounded-md border border-border/60 bg-background px-3 py-2 text-sm text-foreground transition-colors hover:border-primary/40 hover:bg-surface hover:text-primary";

function ResultGroup({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}
