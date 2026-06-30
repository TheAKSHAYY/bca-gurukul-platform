import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Award,
  Bell,
  Bookmark,
  BookOpen,
  Compass,
  FileText,
  Flame,
  ListChecks,
  PlayCircle,
  Search,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
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

type NotificationRow = {
  id: string;
  kind: "system" | "content" | "quiz" | "announcement";
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  published_at: string | null;
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
  const days = new Set(
    dates.map((d) => new Date(d).toISOString().slice(0, 10)),
  );
  let streak = 0;
  const cursor = new Date();
  // allow today OR yesterday as the starting point
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
  const queryClient = useQueryClient();

  const fullName =
    (user.user_metadata?.full_name as string | undefined) ?? user.email ?? "there";
  const firstName = fullName.split(" ")[0];

  // ---------- queries ----------
  const bookmarksQuery = useQuery({
    queryKey: ["student-bookmarks", user.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("student_bookmarks", { _limit: 6 });
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
      return (data ?? []) as NotificationRow[];
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
        .limit(20);
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
      return calcStreak((data ?? []).map((r: any) => r.last_activity_at as string));
    },
  });

  const bookmarks = bookmarksQuery.data ?? [];
  const progress = progressQuery.data ?? [];
  const notifications = notificationsQuery.data ?? [];
  const attempts = quizAttemptsQuery.data ?? [];
  const streak = streakQuery.data ?? 0;
  const unreadCount = notifications.filter((n) => !n.read_at).length;

  // ---------- derived stats ----------
  const inProgressCount = progress.filter((p) => p.status !== "completed").length;
  const avgScore = useMemo(() => {
    const scored = attempts.filter((a) => typeof a.pct === "number");
    if (!scored.length) return null;
    const sum = scored.reduce((acc, a) => acc + Number(a.pct ?? 0), 0);
    return Math.round(sum / scored.length);
  }, [attempts]);
  const pickUp = progress[0] ?? null;

  // ---------- actions ----------
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


  return (
    <main className="mx-auto max-w-6xl px-6 py-10">

      <section className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary via-primary to-primary/85 p-8 text-primary-foreground sm:p-10">
        <div aria-hidden className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-accent/35 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-32 -left-16 h-72 w-72 rounded-full bg-accent/15 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:22px_22px]" />

        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-foreground/10 px-3 py-1 text-xs backdrop-blur-sm ring-1 ring-primary-foreground/15">
              <Sparkles className="h-3 w-3" />
              {greeting()}
            </span>
            {streak > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/20 px-3 py-1 text-xs font-medium text-accent-foreground ring-1 ring-accent/40">
                <Flame className="h-3 w-3" />
                {streak}-day streak
              </span>
            )}
          </div>

          <h1 className="mt-4 font-display text-3xl font-semibold leading-tight sm:text-4xl">
            {greeting()}, {firstName}.
          </h1>
          <p className="mt-2 max-w-xl text-sm text-primary-foreground/80">
            {pickUp
              ? `Pick up “${pickUp.unit_title ?? "your unit"}” where you left off, or explore something new.`
              : "Open a unit to start tracking your progress — bookmarks, quizzes and streaks land here automatically."}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            {pickUp ? (
              <Button asChild size="lg" variant="secondary" className="shrink-0">
                <Link to="/courses">
                  <PlayCircle className="mr-2 h-4 w-4" />
                  Resume learning
                </Link>
              </Button>
            ) : (
              <Button asChild size="lg" variant="secondary" className="shrink-0">
                <Link to="/courses">
                  Browse courses
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            )}
            <Button asChild size="lg" variant="outline" className="border-primary-foreground/30 bg-primary-foreground/5 text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground">
              <Link to="/search">
                <Search className="mr-2 h-4 w-4" />
                Quick search
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ============== STATS STRIP ============== */}
      <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Flame className="h-4 w-4" />}
          label="Study streak"
          value={streakQuery.isLoading ? null : `${streak} ${streak === 1 ? "day" : "days"}`}
          hint={streak > 0 ? "Keep it alive today" : "Study today to begin"}
          tone="accent"
        />
        <StatCard
          icon={<Target className="h-4 w-4" />}
          label="In progress"
          value={progressQuery.isLoading ? null : `${inProgressCount}`}
          hint={inProgressCount ? "Units underway" : "No active units"}
        />
        <StatCard
          icon={<Trophy className="h-4 w-4" />}
          label="Quizzes taken"
          value={quizAttemptsQuery.isLoading ? null : `${attempts.length}`}
          hint={attempts.length ? "Lifetime attempts" : "Try your first quiz"}
        />
        <StatCard
          icon={<Award className="h-4 w-4" />}
          label="Avg quiz score"
          value={quizAttemptsQuery.isLoading ? null : avgScore !== null ? `${avgScore}%` : "—"}
          hint={avgScore !== null ? (avgScore >= 70 ? "Great work" : "Room to climb") : "Take a quiz to begin"}
          tone={avgScore !== null && avgScore >= 70 ? "success" : "default"}
        />
      </section>

      {/* ============== PICK UP WHERE YOU LEFT OFF ============== */}
      {pickUp && (
        <section className="mt-8 overflow-hidden rounded-2xl border border-border bg-surface">
          <div className="grid gap-0 md:grid-cols-[1.4fr_1fr]">
            <div className="p-6 sm:p-7">
              <div className="text-[11px] font-medium uppercase tracking-wider text-accent">
                Pick up where you left off
              </div>
              <h3 className="mt-2 font-display text-2xl font-semibold text-foreground">
                {pickUp.unit_title ?? "Your unit"}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">{pickUp.subject_title ?? "—"}</p>

              <div className="mt-5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Progress</span>
                  <span className="font-medium text-foreground">
                    {Math.round(Number(pickUp.progress_pct))}%
                  </span>
                </div>
                <Progress value={Number(pickUp.progress_pct)} className="mt-2 h-2" />
              </div>

              <div className="mt-6 flex gap-2">
                <Button asChild>
                  <Link to="/courses">
                    Resume
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/bookmarks">View bookmarks</Link>
                </Button>
              </div>
            </div>
            <div className="relative hidden bg-gradient-to-br from-primary/10 via-accent/10 to-transparent md:block">
              <div aria-hidden className="absolute inset-0 [background-image:radial-gradient(circle_at_1px_1px,hsl(var(--primary)/0.12)_1px,transparent_0)] [background-size:18px_18px]" />
              <div className="relative grid h-full place-items-center p-6">
                <BookOpen className="h-24 w-24 text-primary/30" strokeWidth={1.2} />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ============== QUICK ACTIONS ============== */}
      <section className="mt-10">
        <h2 className="font-display text-xl font-semibold text-foreground">Quick actions</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Jump straight into the part of the platform you need right now.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ActionCard to="/courses" icon={<BookOpen className="h-5 w-5" />} title="Notes" body="Read structured semester-wise notes." />
          <ActionCard to="/courses" icon={<FileText className="h-5 w-5" />} title="Past papers" body="Practise with previous year question papers." />
          <ActionCard to="/courses" icon={<PlayCircle className="h-5 w-5" />} title="Video lectures" body="Watch curated lectures alongside the syllabus." />
          <ActionCard to="/courses" icon={<ListChecks className="h-5 w-5" />} title="MCQ practice" body="Take timed quizzes with explanations." />
        </div>
      </section>

      {/* ============== CONTINUE LEARNING + BOOKMARKS ============== */}
      <section className="mt-10 grid gap-5 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface p-6 lg:col-span-2">
          <CardHeader
            icon={<TrendingUp className="h-4 w-4" />}
            title="Continue learning"
            action={progress.length > 0 ? <Link to="/courses" className="text-xs font-medium text-primary hover:underline">Browse all →</Link> : null}
          />

          {progressQuery.isLoading ? (
            <div className="mt-5 space-y-3">
              <Skeleton className="h-16 rounded-xl" />
              <Skeleton className="h-16 rounded-xl" />
            </div>
          ) : progress.length === 0 ? (
            <div className="mt-5">
              <EmptyState
                icon={Compass}
                tone="accent"
                variant="panel"
                title="Start your first unit"
                description="Open any unit from your semester — your progress, bookmarks and quiz attempts will land here automatically."
                tip="Aim for one unit a day. Six small wins beats one long binge."
                primaryAction={{ label: "Explore courses", to: "/courses", icon: ArrowRight }}
                secondaryAction={{ label: "Try a quick MCQ", to: "/search", icon: ListChecks }}
              />
            </div>
          ) : (
            <ul className="mt-5 space-y-3">
              {progress.map((p) => (
                <li key={p.id} className="group rounded-xl border border-border/70 p-4 transition-colors hover:border-primary/30 hover:bg-surface-muted/40">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{p.unit_title ?? "Untitled unit"}</p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{p.subject_title ?? "—"}</p>
                    </div>
                    <span className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
                      p.status === "completed" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                        : p.status === "in_progress" ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground",
                    )}>
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
          <CardHeader
            icon={<Bookmark className="h-4 w-4" />}
            title="Bookmarks"
            tone="accent"
            action={bookmarks.length > 0 ? <Link to="/bookmarks" className="text-xs font-medium text-primary hover:underline">All →</Link> : null}
          />

          {bookmarksQuery.isLoading ? (
            <div className="mt-4 space-y-2">
              <Skeleton className="h-12 rounded-lg" />
              <Skeleton className="h-12 rounded-lg" />
              <Skeleton className="h-12 rounded-lg" />
            </div>
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

      {/* ============== RECENT QUIZZES + NOTIFICATIONS ============== */}
      <section className="mt-10 grid gap-5 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface p-6 lg:col-span-2">
          <CardHeader
            icon={<Trophy className="h-4 w-4" />}
            title="Recent quiz attempts"
            action={attempts.length > 0 ? <Link to="/quizzes" className="text-xs font-medium text-primary hover:underline">All quizzes →</Link> : null}
          />

          {quizAttemptsQuery.isLoading ? (
            <div className="mt-5 space-y-2.5">
              <Skeleton className="h-14 rounded-xl" />
              <Skeleton className="h-14 rounded-xl" />
            </div>
          ) : attempts.length === 0 ? (
            <div className="mt-5">
              <EmptyState
                icon={ListChecks}
                title="No attempts yet"
                description="Take your first MCQ to see scores, pass/fail and your average right here."
                variant="panel"
                primaryAction={{ label: "Find a quiz", to: "/courses", icon: ArrowRight }}
              />
            </div>
          ) : (
            <ul className="mt-5 divide-y divide-border/60">
              {attempts.slice(0, 6).map((a) => {
                const pct = typeof a.pct === "number" ? Math.round(a.pct) : null;
                return (
                  <li key={a.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0 flex items-center gap-3">
                      <div className={cn(
                        "grid h-9 w-9 shrink-0 place-items-center rounded-lg text-xs font-semibold",
                        a.passed ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-destructive/10 text-destructive",
                      )}>
                        {pct !== null ? `${pct}` : "–"}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {a.quizzes?.title ?? "Quiz"}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {a.submitted_at ? new Date(a.submitted_at).toLocaleDateString(undefined, { day: "numeric", month: "short" }) : ""}
                          {" · "}
                          {a.passed ? "Passed" : "Did not pass"}
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

        <div className="rounded-2xl border border-border bg-surface p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="relative grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span aria-hidden className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-semibold text-accent-foreground">
                    {unreadCount}
                  </span>
                )}
              </div>
              <h3 className="font-display text-base font-semibold text-foreground">Notifications</h3>
            </div>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-[11px] font-medium text-primary hover:underline">
                Mark all read
              </button>
            )}
          </div>

          {notificationsQuery.isLoading ? (
            <div className="mt-4 space-y-2"><Skeleton className="h-14 rounded-xl" /><Skeleton className="h-14 rounded-xl" /></div>
          ) : notifications.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-border bg-surface-muted/40 p-4 text-center">
              <p className="text-sm font-medium text-foreground">You're all caught up</p>
              <p className="mt-1 text-xs text-muted-foreground">We'll let you know when something new arrives.</p>
            </div>
          ) : (
            <ul className="mt-4 space-y-2">
              {notifications.slice(0, 5).map((n) => {
                const isUnread = !n.read_at;
                const inner = (
                  <div className={cn(
                    "rounded-xl border px-3.5 py-3 transition-colors",
                    isUnread ? "border-primary/30 bg-primary/5" : "border-border/60 bg-background hover:bg-surface-muted/40",
                  )}>
                    <div className="flex items-center gap-2">
                      {isUnread && <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />}
                      <p className="truncate text-sm font-medium text-foreground">{n.title}</p>
                    </div>
                    {n.body && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{n.body}</p>}
                    <p className="mt-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                      {n.kind}{n.published_at ? ` · ${new Date(n.published_at).toLocaleDateString()}` : ""}
                    </p>
                  </div>
                );
                return (
                  <li key={n.id}>
                    {n.link ? <a href={n.link} className="block">{inner}</a> : inner}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}

// ---------------- helpers ----------------

function StatCard({
  icon,
  label,
  value,
  hint,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null;
  hint?: string;
  tone?: "default" | "accent" | "success";
}) {
  const toneClass =
    tone === "accent"
      ? "bg-accent/15 text-accent-foreground ring-accent/30"
      : tone === "success"
        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-emerald-500/20"
        : "bg-primary/10 text-primary ring-primary/15";
  return (
    <div className="rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-primary/25">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
        <span className={cn("grid h-7 w-7 place-items-center rounded-lg ring-1", toneClass)}>{icon}</span>
      </div>
      <div className="mt-3 font-display text-2xl font-semibold text-foreground">
        {value === null ? <Skeleton className="h-7 w-16" /> : value}
      </div>
      {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function CardHeader({
  icon,
  title,
  action,
  tone = "primary",
}: {
  icon: React.ReactNode;
  title: string;
  action?: React.ReactNode;
  tone?: "primary" | "accent";
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <div className={cn(
          "grid h-9 w-9 place-items-center rounded-xl",
          tone === "accent" ? "bg-accent/20 text-accent-foreground" : "bg-primary/10 text-primary",
        )}>
          {icon}
        </div>
        <h3 className="font-display text-base font-semibold text-foreground">{title}</h3>
      </div>
      {action}
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
  const kindLabel = kind === "note" ? "Note" : kind === "paper" ? "Paper" : kind === "quiz" ? "Quiz" : "Unit";
  const inner = (
    <div className="group flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-background px-3 py-2.5 transition-colors hover:border-primary/40 hover:bg-surface">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{label}</p>
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{kindLabel}</p>
      </div>
      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
    </div>
  );
  if (kind === "note") return <Link to="/notes/$noteId" params={{ noteId: refId }}>{inner}</Link>;
  if (kind === "paper") return <Link to="/papers/$paperId" params={{ paperId: refId }}>{inner}</Link>;
  if (kind === "quiz") return <Link to="/quizzes/$quizId" params={{ quizId: refId }}>{inner}</Link>;
  return <Link to="/courses">{inner}</Link>;
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
      className="group relative block overflow-hidden rounded-2xl border border-border bg-surface p-5 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
    >
      <div aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary/5 opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
        {icon}
      </div>
      <h3 className="relative mt-4 font-display text-base font-semibold text-foreground">{title}</h3>
      <p className="relative mt-1.5 text-sm text-muted-foreground">{body}</p>
      <div className="relative mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
        Open
        <ArrowRight className="h-3.5 w-3.5" />
      </div>
    </Link>
  );
}

