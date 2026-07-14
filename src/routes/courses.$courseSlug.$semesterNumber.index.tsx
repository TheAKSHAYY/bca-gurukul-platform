import { useEffect, useMemo } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, BookOpen, Compass } from "lucide-react";

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

  const fullName =
    (user?.user_metadata?.full_name as string | undefined) ??
    user?.email?.split("@")[0] ??
    null;
  const firstName = fullName?.split(" ")[0] ?? null;

  const loadingCore = semQuery.isLoading;
  const loadingProgress = unitsQuery.isLoading || (!!user && progressQuery.isLoading);

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <main className="mx-auto max-w-6xl px-5 pb-24 pt-8 sm:px-8 sm:pt-12">
        {/* Back link */}
        <Link
          to="/courses/$courseSlug"
          params={{ courseSlug }}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {semQuery.data?.course.title ?? "Course"}
        </Link>

        {/* ─── Hero ─── */}
        <section className="mt-6 rounded-3xl border border-border bg-surface p-7 sm:p-10">
          {loadingCore ? (
            <div className="space-y-4">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-9 w-72" />
              <Skeleton className="h-2 w-full max-w-md" />
            </div>
          ) : (
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  {semQuery.data?.course.title} · Semester {semQuery.data?.sem.number}
                </p>
                <h1 className="mt-2 font-display text-3xl font-semibold leading-tight text-foreground sm:text-[2.5rem]">
                  {firstName ? (
                    <>
                      Welcome back,{" "}
                      <span className="text-primary">{firstName}</span>.
                    </>
                  ) : (
                    <>Your learning workspace.</>
                  )}
                </h1>
                <p className="mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
                  {stats.length === 0
                    ? "Subjects for this semester haven't been published yet."
                    : user
                      ? overall.completedSubjects === stats.length
                        ? `All ${stats.length} subjects completed. Beautifully done.`
                        : overall.inProgressOrDone === 0
                          ? `${stats.length} subjects ready. Pick one to begin.`
                          : `${overall.inProgressOrDone} of ${stats.length} subjects in progress · ${overall.completedSubjects} completed`
                      : `${stats.length} subjects in this semester. Sign in to track your progress.`}
                </p>

                {/* Progress bar */}
                {user && stats.length > 0 && (
                  <div className="mt-6 max-w-md">
                    <div
                      className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
                      role="progressbar"
                      aria-label="Semester progress"
                      aria-valuenow={overall.avgPct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${overall.avgPct}%` }}
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[11px] font-medium text-muted-foreground">
                      <span>Overall progress</span>
                      <span className="tabular-nums">{overall.avgPct}%</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Primary CTA */}
              {stats.length > 0 && (
                <div className="lg:pl-6">
                  {user && overall.resume ? (
                    <Button
                      asChild
                      size="lg"
                      className="h-12 gap-2 rounded-xl px-6 text-sm font-semibold"
                    >
                      <Link
                        to="/courses/$courseSlug/$semesterNumber/$subjectSlug"
                        params={{
                          courseSlug,
                          semesterNumber,
                          subjectSlug: overall.resume.subject.slug,
                        }}
                      >
                        {overall.resume.status === "not_started"
                          ? `Start ${overall.resume.subject.title}`
                          : `Continue ${overall.resume.subject.title}`}
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  ) : (
                    <Button
                      asChild
                      size="lg"
                      className="h-12 gap-2 rounded-xl px-6 text-sm font-semibold"
                    >
                      <Link
                        to="/courses/$courseSlug/$semesterNumber/$subjectSlug"
                        params={{
                          courseSlug,
                          semesterNumber,
                          subjectSlug: stats[0].subject.slug,
                        }}
                      >
                        Start your first subject
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </section>

        {/* ─── Subjects ─── */}
        <section className="mt-12">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="font-display text-xl font-semibold text-foreground sm:text-2xl">
              Subjects
            </h2>
            {stats.length > 0 && user && (
              <span className="text-xs font-medium text-muted-foreground tabular-nums">
                {overall.completedSubjects}/{stats.length} completed
              </span>
            )}
          </div>

          {loadingCore ? (
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <Skeleton className="h-44 rounded-2xl" />
              <Skeleton className="h-44 rounded-2xl" />
              <Skeleton className="h-44 rounded-2xl" />
            </div>
          ) : stats.length === 0 ? (
            <EmptySubjects courseSlug={courseSlug} />
          ) : (
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {stats.map((s) => (
                <SubjectCard
                  key={s.subject.id}
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
              ))}
            </div>
          )}
        </section>
      </main>
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

  return (
    <Link
      {...href}
      className="group flex h-full flex-col justify-between rounded-2xl border border-border bg-surface p-7 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <div>
        <div className="flex items-center justify-between gap-3">
          <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            {subject.code}
          </span>
          {showProgress && status === "completed" && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
              Done
            </span>
          )}
        </div>
        <h3 className="mt-3 font-display text-lg font-semibold leading-snug text-foreground line-clamp-2">
          {subject.title}
        </h3>
      </div>

      <div className="mt-8">
        {showProgress ? (
          loading ? (
            <Skeleton className="h-1.5 w-full rounded-full" />
          ) : (
            <div
              className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-label={`${subject.title} progress`}
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  status === "completed" ? "bg-primary" : "bg-primary/70",
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
          )
        ) : null}

        <div className="mt-3 flex items-center justify-between text-[11px] font-medium text-muted-foreground">
          <span className="tabular-nums">
            {totalUnits === 0
              ? "Units coming soon"
              : showProgress
                ? `${completedUnits} of ${totalUnits} units`
                : `${totalUnits} unit${totalUnits === 1 ? "" : "s"}`}
          </span>
          {showProgress && rel && <span>Last studied {rel}</span>}
        </div>

        <div className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
          {showProgress
            ? status === "completed"
              ? "Review"
              : status === "in_progress"
                ? "Continue"
                : "Start"
            : "Open"}
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>
    </Link>
  );
}

function EmptySubjects({ courseSlug }: { courseSlug: string }) {
  return (
    <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface px-6 py-16 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
        <BookOpen className="h-5 w-5" />
      </div>
      <h3 className="mt-4 font-display text-lg font-semibold text-foreground">
        Start your first subject
      </h3>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
        Subjects for this semester haven't been published yet. Explore other semesters in
        this course to get started.
      </p>
      <Button asChild variant="outline" className="mt-6 gap-2 rounded-xl">
        <Link to="/courses/$courseSlug" params={{ courseSlug }}>
          <Compass className="h-4 w-4" />
          Browse semesters
        </Link>
      </Button>
    </div>
  );
}
