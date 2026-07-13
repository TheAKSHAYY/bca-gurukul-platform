import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BookOpen,
  Bookmark,
  Compass,
  FileText,
  Flame,
  GraduationCap,
  ListChecks,
  PlayCircle,
  Sparkles,
  Trophy,
} from "lucide-react";

import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard · BCA Gurukul" }] }),
  component: DashboardPage,
});

type ProgressRow = {
  id: string;
  unit_id: string;
  unit_title: string | null;
  subject_title: string | null;
  status: "not_started" | "in_progress" | "completed";
  progress_pct: number;
  last_activity_at: string;
};

type BookmarkRow = {
  id: string;
  kind: "note" | "paper" | "quiz" | "unit";
  ref_id: string;
  title: string | null;
  created_at: string;
};

type QuizAttemptRow = {
  id: string;
  quiz_id: string;
  pct: number | null;
  passed: boolean | null;
  submitted_at: string | null;
  quizzes: { title: string | null } | null;
};

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Burning the midnight oil";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Late-night study mode";
}

function calcStreak(dates: string[]): number {
  if (!dates.length) return 0;
  const days = new Set(dates.map((d) => new Date(d).toISOString().slice(0, 10)));
  let streak = 0;
  const cursor = new Date();
  const today = cursor.toISOString().slice(0, 10);
  if (!days.has(today)) {
    cursor.setDate(cursor.getDate() - 1);
    if (!days.has(cursor.toISOString().slice(0, 10))) return 0;
  }
  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function DashboardPage() {
  const { user } = Route.useRouteContext();

  const fullName =
    (user.user_metadata?.full_name as string | undefined) ?? user.email ?? "there";
  const firstName = fullName.split(" ")[0];

  // ---------- queries (preserved) ----------
  const profileQuery = useQuery({
    queryKey: ["dashboard-profile", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("current_course_id, current_semester_id, onboarded_at")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const contextQuery = useQuery({
    queryKey: [
      "dashboard-context",
      profileQuery.data?.current_course_id,
      profileQuery.data?.current_semester_id,
    ],
    enabled: !!profileQuery.data?.current_semester_id,
    queryFn: async () => {
      const semId = profileQuery.data!.current_semester_id!;
      const [semRes, subjRes] = await Promise.all([
        supabase
          .from("semesters")
          .select("id, number, title, course_id, courses(title, slug)")
          .eq("id", semId)
          .maybeSingle(),
        supabase
          .from("subjects")
          .select("id, code, slug, title, credits")
          .eq("semester_id", semId)
          .eq("status", "published")
          .is("deleted_at", null)
          .order("sort_order")
          .order("code")
          .limit(12),
      ]);
      if (semRes.error) throw semRes.error;
      if (subjRes.error) throw subjRes.error;
      return {
        semester: semRes.data,
        subjects: subjRes.data ?? [],
      };
    },
  });

  const bookmarksQuery = useQuery({
    queryKey: ["student-bookmarks", user.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("student_bookmarks", { _limit: 5 });
      if (error) throw error;
      return (data ?? []) as BookmarkRow[];
    },
  });

  const progressQuery = useQuery({
    queryKey: ["student-progress", user.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("student_progress", { _limit: 5 });
      if (error) throw error;
      return (data ?? []) as ProgressRow[];
    },
  });

  const quizAttemptsQuery = useQuery({
    queryKey: ["student-quiz-attempts", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quiz_attempts")
        .select("id, quiz_id, pct, passed, submitted_at, quizzes(title)")
        .eq("user_id", user.id)
        .not("submitted_at", "is", null)
        .order("submitted_at", { ascending: false })
        .limit(6);
      if (error) throw error;
      return (data ?? []) as unknown as QuizAttemptRow[];
    },
  });

  const streakQuery = useQuery({
    queryKey: ["student-streak", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("progress_tracking")
        .select("last_activity_at")
        .eq("user_id", user.id)
        .order("last_activity_at", { ascending: false })
        .limit(60);
      if (error) throw error;
      return calcStreak((data ?? []).map((r: { last_activity_at: string }) => r.last_activity_at));
    },
  });

  const bookmarks = bookmarksQuery.data ?? [];
  const progress = progressQuery.data ?? [];
  const attempts = quizAttemptsQuery.data ?? [];
  const streak = streakQuery.data ?? 0;
  const semester = contextQuery.data?.semester ?? null;
  const semesterSubjects = contextQuery.data?.subjects ?? [];
  const courseTitle = (semester?.courses as { title?: string; slug?: string } | null)?.title;
  const courseSlug = (semester?.courses as { title?: string; slug?: string } | null)?.slug;

  const avgScore = useMemo(() => {
    const scored = attempts.filter((a) => typeof a.pct === "number");
    if (!scored.length) return null;
    const sum = scored.reduce((acc, a) => acc + Number(a.pct ?? 0), 0);
    return Math.round(sum / scored.length);
  }, [attempts]);

  const pickUp = progress.find((p) => p.status !== "completed") ?? progress[0] ?? null;

  return (
    <main className="mx-auto max-w-6xl px-5 pb-20 pt-8 sm:px-6 sm:pt-12">
      {/* ─── Focus bar ─── */}
      <section className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {greeting()}
          </p>
          <h1 className="mt-1.5 truncate font-display text-3xl font-semibold text-foreground sm:text-[2.25rem] sm:leading-tight">
            {firstName}
          </h1>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {semester && (
            <Link
              to="/courses/$courseSlug/$semesterNumber"
              params={{
                courseSlug: courseSlug ?? "",
                semesterNumber: String(semester.number),
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary"
            >
              <GraduationCap className="h-3.5 w-3.5 text-primary" />
              {courseTitle ? `${courseTitle} · ` : ""}Semester {semester.number}
            </Link>
          )}
          {!semester && !profileQuery.isLoading && (
            <Link
              to="/onboarding"
              className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-primary/40 hover:text-primary"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Choose your semester
            </Link>
          )}
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium",
              streak > 0
                ? "bg-accent/15 text-accent-foreground ring-1 ring-accent/30"
                : "bg-muted text-muted-foreground",
            )}
            title={streak > 0 ? `${streak}-day study streak` : "Study today to start a streak"}
          >
            <Flame className={cn("h-3.5 w-3.5", streak > 0 && "text-accent-foreground")} />
            {streakQuery.isLoading ? "—" : `${streak}d`}
          </span>
        </div>
      </section>

      {/* ─── The one primary action ─── */}
      <section className="mt-8">
        <ContinueHero
          loading={progressQuery.isLoading || profileQuery.isLoading}
          pickUp={pickUp}
          semester={semester}
          courseSlug={courseSlug}
        />
      </section>

      {/* ─── Your semester rail ─── */}
      <section className="mt-12">
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-semibold text-foreground">
              {semester ? `Your Semester ${semester.number}` : "Your subjects"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {semester
                ? "Pick a subject to open its units, notes and practice."
                : "Choose your course and semester to see your subjects here."}
            </p>
          </div>
          {semester && courseSlug && (
            <Link
              to="/courses/$courseSlug/$semesterNumber"
              params={{ courseSlug, semesterNumber: String(semester.number) }}
              className="hidden text-xs font-medium text-primary hover:underline sm:inline"
            >
              View semester →
            </Link>
          )}
        </div>

        {contextQuery.isLoading || profileQuery.isLoading ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
          </div>
        ) : !semester ? (
          <div className="mt-5">
            <EmptyState
              icon={Compass}
              tone="accent"
              variant="panel"
              title="Set your current semester"
              description="Tell us your course and semester once — we'll personalize your dashboard, subjects and recommendations."
              primaryAction={{ label: "Set semester", to: "/onboarding", icon: ArrowRight }}
              secondaryAction={{ label: "Browse all courses", to: "/courses" }}
            />
          </div>
        ) : semesterSubjects.length === 0 ? (
          <p className="mt-5 rounded-2xl border border-dashed border-border bg-surface p-6 text-sm text-muted-foreground">
            Subjects for this semester haven't been published yet. Check back soon.
          </p>
        ) : (
          <div className="mt-5 -mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2 sm:mx-0 sm:grid sm:snap-none sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-3">
            {semesterSubjects.map((s) => (
              <Link
                key={s.id}
                to="/courses/$courseSlug/$semesterNumber/$subjectSlug"
                params={{
                  courseSlug: courseSlug ?? "",
                  semesterNumber: String(semester.number),
                  subjectSlug: s.slug,
                }}
                className="group min-w-[78%] shrink-0 snap-start rounded-2xl border border-border bg-surface p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm sm:min-w-0 sm:shrink"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                    {s.code}
                  </span>
                  {s.credits != null && (
                    <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {s.credits} cr
                    </span>
                  )}
                </div>
                <h3 className="mt-2 font-display text-base font-semibold leading-snug text-foreground line-clamp-2">
                  {s.title}
                </h3>
                <div className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                  Open <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ─── Secondary: quizzes + bookmarks ─── */}
      <section className="mt-12 grid gap-5 lg:grid-cols-5">
        {/* Recent quiz attempts */}
        <div className="rounded-2xl border border-border bg-surface p-6 lg:col-span-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-display text-base font-semibold text-foreground">
                Recent practice
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {avgScore !== null
                  ? `Average ${avgScore}% across ${attempts.length} attempt${attempts.length === 1 ? "" : "s"}`
                  : "Take your first MCQ to see your scores here"}
              </p>
            </div>
            {avgScore !== null && (
              <span
                className={cn(
                  "shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold",
                  avgScore >= 70
                    ? "bg-primary/10 text-primary"
                    : "bg-accent/15 text-accent-foreground",
                )}
              >
                <Trophy className="mr-1 inline h-3 w-3" />
                {avgScore}%
              </span>
            )}
          </div>

          {quizAttemptsQuery.isLoading ? (
            <div className="mt-5 space-y-2">
              <Skeleton className="h-14 rounded-xl" />
              <Skeleton className="h-14 rounded-xl" />
            </div>
          ) : attempts.length === 0 ? (
            <div className="mt-5">
              <EmptyState
                icon={ListChecks}
                variant="panel"
                title="No attempts yet"
                description="Practice a quiz to see scores and averages here."
                primaryAction={{ label: "Find a quiz", to: "/courses", icon: ArrowRight }}
              />
            </div>
          ) : (
            <ul className="mt-5 divide-y divide-border/60">
              {attempts.map((a) => {
                const pct = typeof a.pct === "number" ? Math.round(a.pct) : null;
                return (
                  <li
                    key={a.id}
                    className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={cn(
                          "grid h-10 w-10 shrink-0 place-items-center rounded-xl text-[11px] font-semibold",
                          a.passed
                            ? "bg-primary/10 text-primary"
                            : "bg-destructive/10 text-destructive",
                        )}
                      >
                        {pct !== null ? `${pct}%` : "—"}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {a.quizzes?.title ?? "Quiz"}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {a.submitted_at
                            ? new Date(a.submitted_at).toLocaleDateString(undefined, {
                                day: "numeric",
                                month: "short",
                              })
                            : ""}
                          {" · "}
                          {a.passed ? "Passed" : "Retry"}
                        </p>
                      </div>
                    </div>
                    <Link
                      to="/quizzes/$quizId"
                      params={{ quizId: a.quiz_id }}
                      className="shrink-0 text-xs font-medium text-primary hover:underline"
                    >
                      Retake
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Bookmarks */}
        <div className="rounded-2xl border border-border bg-surface p-6 lg:col-span-2">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-display text-base font-semibold text-foreground">
              <Bookmark className="mr-1.5 inline h-4 w-4 text-primary" />
              Bookmarks
            </h3>
            {bookmarks.length > 0 && (
              <Link to="/bookmarks" className="text-xs font-medium text-primary hover:underline">
                All →
              </Link>
            )}
          </div>

          {bookmarksQuery.isLoading ? (
            <div className="mt-4 space-y-2">
              <Skeleton className="h-12 rounded-xl" />
              <Skeleton className="h-12 rounded-xl" />
              <Skeleton className="h-12 rounded-xl" />
            </div>
          ) : bookmarks.length === 0 ? (
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Save notes, papers and quizzes with the bookmark icon — they'll live here for quick
              access.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
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
  );
}

/* ---------------- helpers ---------------- */

function ContinueHero({
  loading,
  pickUp,
  semester,
  courseSlug,
}: {
  loading: boolean;
  pickUp: ProgressRow | null;
  semester: { id: string; number: number; title: string | null } | null;
  courseSlug: string | undefined;
}) {
  if (loading) {
    return <Skeleton className="h-56 rounded-3xl" />;
  }

  // In-progress state — the primary case
  if (pickUp) {
    return (
      <article className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary via-primary to-primary/90 p-7 text-primary-foreground shadow-sm sm:p-10">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent/30 blur-3xl"
        />
        <div className="relative grid gap-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-foreground/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider ring-1 ring-primary-foreground/20">
              <PlayCircle className="h-3 w-3" /> Continue where you left off
            </span>
            <h2 className="mt-4 font-display text-2xl font-semibold leading-tight sm:text-3xl">
              {pickUp.unit_title ?? "Your next unit"}
            </h2>
            <p className="mt-1.5 text-sm text-primary-foreground/80">
              {pickUp.subject_title ?? "—"}
            </p>

            <div className="mt-5 max-w-md">
              <div className="flex items-center justify-between text-[11px] font-medium uppercase tracking-wider text-primary-foreground/70">
                <span>Progress</span>
                <span className="text-primary-foreground">
                  {Math.round(Number(pickUp.progress_pct))}%
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-primary-foreground/15">
                <div
                  className="h-full rounded-full bg-primary-foreground/90 transition-[width]"
                  style={{ width: `${Math.min(100, Math.max(0, Number(pickUp.progress_pct)))}%` }}
                />
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2 sm:flex-col">
            <Button asChild size="lg" variant="secondary" className="shadow-sm">
              <Link to="/courses">
                <PlayCircle className="mr-2 h-4 w-4" />
                Resume
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="ghost"
              className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
            >
              <Link to="/bookmarks">
                <Bookmark className="mr-2 h-4 w-4" />
                Bookmarks
              </Link>
            </Button>
          </div>
        </div>
      </article>
    );
  }

  // Personalized "start your semester" state
  if (semester && courseSlug) {
    return (
      <article className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary via-primary to-primary/90 p-7 text-primary-foreground shadow-sm sm:p-10">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent/30 blur-3xl"
        />
        <div className="relative max-w-2xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-foreground/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider ring-1 ring-primary-foreground/20">
            <Sparkles className="h-3 w-3" /> Ready when you are
          </span>
          <h2 className="mt-4 font-display text-2xl font-semibold leading-tight sm:text-3xl">
            Start Semester {semester.number}
          </h2>
          <p className="mt-1.5 max-w-lg text-sm text-primary-foreground/85">
            Open your first subject — your progress, bookmarks and quiz scores will start showing
            up here automatically.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button asChild size="lg" variant="secondary">
              <Link
                to="/courses/$courseSlug/$semesterNumber"
                params={{ courseSlug, semesterNumber: String(semester.number) }}
              >
                <BookOpen className="mr-2 h-4 w-4" />
                Open my semester
              </Link>
            </Button>
          </div>
        </div>
      </article>
    );
  }

  // First-time / no personalization
  return (
    <article className="rounded-3xl border border-border bg-surface p-7 sm:p-10">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider text-primary">
        <Sparkles className="h-3 w-3" /> Let's set you up
      </span>
      <h2 className="mt-4 font-display text-2xl font-semibold leading-tight text-foreground sm:text-3xl">
        Pick your course and semester
      </h2>
      <p className="mt-1.5 max-w-lg text-sm text-muted-foreground">
        Tell us where you are in your BCA journey — we'll personalize your dashboard, your subjects
        and your recommended practice.
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        <Button asChild size="lg">
          <Link to="/onboarding">
            Get started
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link to="/courses">Browse courses</Link>
        </Button>
      </div>
    </article>
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
  const Icon = kind === "note" ? FileText : kind === "paper" ? FileText : kind === "quiz" ? ListChecks : BookOpen;
  const kindLabel =
    kind === "note" ? "Note" : kind === "paper" ? "Paper" : kind === "quiz" ? "Quiz" : "Unit";
  const inner = (
    <div className="group flex items-center gap-3 rounded-xl border border-border/70 bg-background px-3 py-2.5 transition-colors hover:border-primary/40 hover:bg-surface">
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{label}</p>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{kindLabel}</p>
      </div>
      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
    </div>
  );
  if (kind === "note") return <Link to="/notes/$noteId" params={{ noteId: refId }}>{inner}</Link>;
  if (kind === "paper") return <Link to="/papers/$paperId" params={{ paperId: refId }}>{inner}</Link>;
  if (kind === "quiz") return <Link to="/quizzes/$quizId" params={{ quizId: refId }}>{inner}</Link>;
  return <Link to="/courses">{inner}</Link>;
}
