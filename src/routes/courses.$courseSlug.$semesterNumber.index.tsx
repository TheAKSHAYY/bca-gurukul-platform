import { useEffect, useMemo } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, BookOpen, Check, Compass } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { PublicHeader } from "./courses.index";

export const Route = createFileRoute("/courses/$courseSlug/$semesterNumber/")({
  head: () => ({ meta: [{ title: "Semester · BCA Gurukul" }] }),
  component: SemesterDetail,
});

type Subject = {
  id: string;
  code: string;
  slug: string;
  title: string;
};

type UnitRow = { id: string; subject_id: string; number: number };

type ProgressRow = {
  unit_id: string;
  progress_pct: number;
  status: "not_started" | "in_progress" | "completed";
  last_activity_at: string;
};

type SubjectStats = {
  subject: Subject;
  totalUnits: number;
  completedUnits: number;
  pct: number; // 0-100
  lastActivity: string | null;
  resumeUnitNumber: number | null;
  status: "not_started" | "in_progress" | "completed";
};

function formatRelative(iso: string | null) {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const day = 86_400_000;
  if (diff < day) return "Today";
  if (diff < 2 * day) return "Yesterday";
  const days = Math.floor(diff / day);
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function SemesterDetail() {
  const { courseSlug, semesterNumber } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const queryKey = ["public", "sem", courseSlug, semesterNumber];

  const semQuery = useQuery({
    queryKey,
    queryFn: async () => {
      const { data: course, error: ce } = await supabase
        .from("courses")
        .select("id, code, title, slug")
        .eq("slug", courseSlug)
        .eq("status", "published")
        .maybeSingle();
      if (ce) throw ce;
      if (!course) throw notFound();

      const { data: sem, error: se } = await supabase
        .from("semesters")
        .select("id, number, title, description")
        .eq("course_id", course.id)
        .eq("number", Number(semesterNumber))
        .eq("status", "published")
        .maybeSingle();
      if (se) throw se;
      if (!sem) throw notFound();

      const { data: subjects, error: sue } = await supabase
        .from("subjects")
        .select("id, code, slug, title")
        .eq("semester_id", sem.id)
        .eq("status", "published")
        .is("deleted_at", null)
        .order("sort_order")
        .order("code");
      if (sue) throw sue;

      return { course, sem, subjects: (subjects ?? []) as Subject[] };
    },
  });

  const semesterId = semQuery.data?.sem.id;
  const courseId = semQuery.data?.course.id;
  const subjects = semQuery.data?.subjects ?? [];

  // Units + progress for aggregation
  const unitsQuery = useQuery({
    queryKey: ["public", "sem-units", semesterId],
    enabled: !!semesterId && subjects.length > 0,
    queryFn: async () => {
      const subjectIds = subjects.map((s) => s.id);
      const { data, error } = await supabase
        .from("units")
        .select("id, subject_id, number")
        .in("subject_id", subjectIds)
        .eq("status", "published")
        .is("deleted_at", null)
        .order("number");
      if (error) throw error;
      return (data ?? []) as UnitRow[];
    },
  });

  const units = unitsQuery.data ?? [];

  const progressQuery = useQuery({
    queryKey: ["student", "sem-progress", user?.id, semesterId],
    enabled: !!user?.id && units.length > 0,
    queryFn: async () => {
      const unitIds = units.map((u) => u.id);
      const { data, error } = await supabase
        .from("progress_tracking")
        .select("unit_id, progress_pct, status, last_activity_at")
        .eq("user_id", user!.id)
        .in("unit_id", unitIds);
      if (error) throw error;
      return (data ?? []) as ProgressRow[];
    },
  });

  const progress = progressQuery.data ?? [];

  // Live-refresh
  useEffect(() => {
    const channel = supabase
      .channel(`public-sem-${courseSlug}-${semesterNumber}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "subjects", ...(semesterId ? { filter: `semester_id=eq.${semesterId}` } : {}) },
        () => qc.invalidateQueries({ queryKey }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "semesters", ...(semesterId ? { filter: `id=eq.${semesterId}` } : {}) },
        () => qc.invalidateQueries({ queryKey }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "courses", ...(courseId ? { filter: `id=eq.${courseId}` } : {}) },
        () => qc.invalidateQueries({ queryKey }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [semesterId, courseId, courseSlug, semesterNumber]);

  // ---------- aggregation ----------
  const stats: SubjectStats[] = useMemo(() => {
    const unitBySubject = new Map<string, UnitRow[]>();
    for (const u of units) {
      const arr = unitBySubject.get(u.subject_id) ?? [];
      arr.push(u);
      unitBySubject.set(u.subject_id, arr);
    }
    const progressByUnit = new Map<string, ProgressRow>();
    for (const p of progress) progressByUnit.set(p.unit_id, p);

    return subjects.map((s) => {
      const unitList = (unitBySubject.get(s.id) ?? []).sort((a, b) => a.number - b.number);
      const total = unitList.length;
      let completed = 0;
      let pctSum = 0;
      let lastActivity: string | null = null;
      let resumeUnit: UnitRow | null = null;

      for (const u of unitList) {
        const p = progressByUnit.get(u.id);
        if (!p) continue;
        pctSum += Number(p.progress_pct ?? 0);
        if (p.status === "completed") completed += 1;
        if (!lastActivity || p.last_activity_at > lastActivity) {
          lastActivity = p.last_activity_at;
          if (p.status !== "completed") resumeUnit = u;
        }
      }
      if (!resumeUnit) {
        resumeUnit = unitList.find((u) => (progressByUnit.get(u.id)?.status ?? "not_started") !== "completed") ?? unitList[0] ?? null;
      }

      const pct = total > 0 ? Math.round(pctSum / total) : 0;
      const status: SubjectStats["status"] =
        total > 0 && completed === total
          ? "completed"
          : lastActivity
            ? "in_progress"
            : "not_started";

      return {
        subject: s,
        totalUnits: total,
        completedUnits: completed,
        pct,
        lastActivity,
        resumeUnitNumber: resumeUnit?.number ?? null,
        status,
      };
    });
  }, [subjects, units, progress]);

  const overall = useMemo(() => {
    const inProgressOrDone = stats.filter((s) => s.status !== "not_started").length;
    const completedSubjects = stats.filter((s) => s.status === "completed").length;
    const avgPct = stats.length
      ? Math.round(stats.reduce((a, s) => a + s.pct, 0) / stats.length)
      : 0;
    // pick a subject to continue: most-recent activity, else first
    const withActivity = stats
      .filter((s) => s.lastActivity)
      .sort((a, b) => (b.lastActivity! > a.lastActivity! ? 1 : -1));
    const resume = withActivity[0] ?? stats[0] ?? null;
    return { inProgressOrDone, completedSubjects, avgPct, resume };
  }, [stats]);

  const firstName = useMemo(() => {
    const fullName =
      (user?.user_metadata?.full_name as string | undefined) ??
      user?.email?.split("@")[0] ??
      null;
    return fullName?.split(" ")[0] ?? null;
  }, [user]);

  const loadingCore = semQuery.isLoading;
  const loadingProgress = unitsQuery.isLoading || (!!user && progressQuery.isLoading);

  const heroCta = useMemo(() => {
    if (stats.length === 0) return null;
    const target = user && overall.resume ? overall.resume : stats[0];
    const label =
      user && overall.resume
        ? overall.resume.status === "not_started"
          ? `Start ${overall.resume.subject.title}`
          : `Continue ${overall.resume.subject.title}`
        : "Start your first subject";
    return { subjectSlug: target.subject.slug, label };
  }, [stats, overall.resume, user]);

  const heroSubtitle = (() => {
    if (stats.length === 0) return "Subjects for this semester haven't been published yet.";
    if (!user) return `${stats.length} subjects in this semester. Sign in to track your progress.`;
    if (overall.completedSubjects === stats.length)
      return `All ${stats.length} subjects completed. Beautifully done.`;
    if (overall.inProgressOrDone === 0)
      return `${stats.length} subjects ready. Pick one to begin.`;
    return `${overall.inProgressOrDone} of ${stats.length} subjects in progress · ${overall.completedSubjects} completed`;
  })();

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <main className="mx-auto max-w-6xl px-5 pb-24 pt-8 sm:px-8 sm:pt-12">
        <Link
          to="/courses/$courseSlug"
          params={{ courseSlug }}
          className="inline-flex items-center gap-1.5 rounded-md text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {semQuery.data?.course.title ?? "Course"}
        </Link>

        {/* ─── Hero ─── */}
        <section className="mt-6 rounded-3xl border border-border bg-surface p-6 sm:p-10">
          {loadingCore ? (
            <div className="space-y-4">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-10 w-72" />
              <Skeleton className="h-4 w-96 max-w-full" />
              <Skeleton className="h-11 w-48" />
            </div>
          ) : (
            <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  {semQuery.data?.course.title} · Semester {semQuery.data?.sem.number}
                </p>
                <h1 className="mt-3 font-display text-3xl font-semibold leading-[1.15] tracking-tight text-foreground sm:text-4xl md:text-[2.5rem]">
                  {firstName ? (
                    <>
                      Welcome back, <span className="text-primary">{firstName}</span>.
                    </>
                  ) : (
                    <>Your learning workspace.</>
                  )}
                </h1>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
                  {heroSubtitle}
                </p>

                {user && stats.length > 0 && (
                  <div className="mt-6 max-w-sm">
                    <ProgressBar
                      value={overall.avgPct}
                      label="Semester progress"
                      tone={overall.completedSubjects === stats.length ? "done" : "active"}
                    />
                    <div className="mt-2 flex items-center justify-between text-[11px] font-medium text-muted-foreground">
                      <span>Overall progress</span>
                      <span className="tabular-nums text-foreground">{overall.avgPct}%</span>
                    </div>
                  </div>
                )}
              </div>

              {heroCta && (
                <div className="md:pl-6">
                  <Button
                    asChild
                    size="lg"
                    className="h-12 w-full gap-2 rounded-xl px-6 text-sm font-semibold shadow-sm sm:w-auto"
                  >
                    <Link
                      to="/courses/$courseSlug/$semesterNumber/$subjectSlug"
                      params={{
                        courseSlug,
                        semesterNumber,
                        subjectSlug: heroCta.subjectSlug,
                      }}
                    >
                      <span className="truncate">{heroCta.label}</span>
                      <ArrowRight className="h-4 w-4 shrink-0" />
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          )}
        </section>

        {/* ─── Subjects ─── */}
        <section className="mt-14">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="font-display text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              Subjects
            </h2>
            {stats.length > 0 && user && (
              <span className="text-xs font-medium tabular-nums text-muted-foreground">
                {overall.completedSubjects}/{stats.length} completed
              </span>
            )}
          </div>

          {loadingCore ? (
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <Skeleton className="h-48 rounded-2xl" />
              <Skeleton className="h-48 rounded-2xl" />
              <Skeleton className="h-48 rounded-2xl" />
            </div>
          ) : stats.length === 0 ? (
            <EmptySubjects courseSlug={courseSlug} />
          ) : (
            <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {stats.map((s) => (
                <li key={s.subject.id} className="flex">
                  <SubjectCard
                    stats={s}
                    loading={loadingProgress}
                    href={{
                      to: "/courses/$courseSlug/$semesterNumber/$subjectSlug",
                      params: {
                        courseSlug,
                        semesterNumber,
                        subjectSlug: s.subject.slug,
                      },
                    }}
                    showProgress={!!user}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

function ProgressBar({
  value,
  label,
  tone = "active",
}: {
  value: number;
  label: string;
  tone?: "active" | "done";
}) {
  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
      role="progressbar"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuetext={`${value} percent`}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-500 ease-out",
          tone === "done" ? "bg-primary" : "bg-primary/75",
        )}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

function SubjectCard({
  stats,
  loading,
  href,
  showProgress,
}: {
  stats: SubjectStats;
  loading: boolean;
  href: {
    to: "/courses/$courseSlug/$semesterNumber/$subjectSlug";
    params: { courseSlug: string; semesterNumber: string; subjectSlug: string };
  };
  showProgress: boolean;
}) {
  const { subject, totalUnits, completedUnits, pct, lastActivity, status } = stats;
  const rel = formatRelative(lastActivity);
  const isDone = status === "completed";

  const ctaLabel = !showProgress
    ? "Open"
    : isDone
      ? "Review"
      : status === "in_progress"
        ? "Continue"
        : "Start";

  return (
    <Link
      {...href}
      aria-label={`${subject.title} — ${ctaLabel}`}
      className="group flex h-full w-full flex-col rounded-2xl border border-border bg-surface p-6 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm focus-visible:-translate-y-0.5 focus-visible:border-primary/40 focus-visible:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          {subject.code}
        </span>
        {showProgress && isDone && (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
            <Check className="h-3 w-3" aria-hidden />
            Done
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="mt-3 font-display text-lg font-semibold leading-snug tracking-tight text-foreground line-clamp-2">
        {subject.title}
      </h3>

      {/* Progress — promoted directly under title so it's instantly scannable */}
      {showProgress && !isDone && (
        <div className="mt-4">
          {loading ? (
            <Skeleton className="h-1.5 w-full rounded-full" />
          ) : (
            <ProgressBar value={pct} label={`${subject.title} progress`} />
          )}
        </div>
      )}

      {/* Spacer pushes footer to bottom for equal-height alignment */}
      <div className="flex-1" />

      {/* Footer: single meta line + right-aligned CTA */}
      <div className="mt-5 flex items-end justify-between gap-3">
        <div className="min-w-0 text-[11px] font-medium text-muted-foreground">
          <div className="tabular-nums">
            {totalUnits === 0
              ? "Units coming soon"
              : showProgress
                ? `${completedUnits} of ${totalUnits} units`
                : `${totalUnits} unit${totalUnits === 1 ? "" : "s"}`}
          </div>
          {showProgress && rel && (
            <div className="mt-0.5 truncate">Last studied {rel}</div>
          )}
        </div>

        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg text-sm font-semibold text-primary">
          {ctaLabel}
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-focus-visible:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}

function EmptySubjects({ courseSlug }: { courseSlug: string }) {
  return (
    <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface px-6 py-20 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/10">
        <BookOpen className="h-6 w-6" aria-hidden />
      </div>
      <h3 className="mt-5 font-display text-lg font-semibold tracking-tight text-foreground">
        Subjects are on their way
      </h3>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
        Nothing has been published for this semester yet. Explore other semesters in this
        course while you wait.
      </p>
      <Button asChild variant="outline" className="mt-6 h-11 gap-2 rounded-xl">
        <Link to="/courses/$courseSlug" params={{ courseSlug }}>
          <Compass className="h-4 w-4" aria-hidden />
          Browse semesters
        </Link>
      </Button>
    </div>
  );
}

