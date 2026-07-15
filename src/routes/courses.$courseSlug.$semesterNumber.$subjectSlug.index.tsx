import { useMemo } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  Clock,
  FileStack,
  PlayCircle,
  Sparkles,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { PublicHeader } from "./courses.index";

export const Route = createFileRoute("/courses/$courseSlug/$semesterNumber/$subjectSlug/")({
  head: () => ({ meta: [{ title: "Subject · BCA Gurukul" }] }),
  component: SubjectDetail,
});

type UnitRow = {
  id: string;
  number: number;
  title: string;
  summary: string | null;
};

type ProgressRow = {
  unit_id: string;
  progress_pct: number;
  status: "not_started" | "in_progress" | "completed";
  last_activity_at: string;
};

type UnitStatus = "not_started" | "in_progress" | "completed";

type UnitStats = {
  unit: UnitRow;
  status: UnitStatus;
  pct: number;
  lastActivity: string | null;
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

function SubjectDetail() {
  const { courseSlug, semesterNumber, subjectSlug } = Route.useParams();
  const { user } = useAuth();

  const subjectQuery = useQuery({
    queryKey: ["public", "subject", courseSlug, semesterNumber, subjectSlug],
    queryFn: async () => {
      const { data: course, error: ce } = await supabase
        .from("courses")
        .select("id, title")
        .eq("slug", courseSlug)
        .eq("status", "published")
        .is("deleted_at", null)
        .maybeSingle();
      if (ce) throw ce;
      if (!course) throw notFound();

      const { data: sem, error: se } = await supabase
        .from("semesters")
        .select("id, number, title")
        .eq("course_id", course.id)
        .eq("number", Number(semesterNumber))
        .eq("status", "published")
        .is("deleted_at", null)
        .maybeSingle();
      if (se) throw se;
      if (!sem) throw notFound();

      const { data: subject, error: sue } = await supabase
        .from("subjects")
        .select("id, code, title, description, credits")
        .eq("semester_id", sem.id)
        .eq("slug", subjectSlug)
        .eq("status", "published")
        .is("deleted_at", null)
        .maybeSingle();
      if (sue) throw sue;
      if (!subject) throw notFound();

      const { data: units, error: ue } = await supabase
        .from("units")
        .select("id, number, title, summary")
        .eq("subject_id", subject.id)
        .eq("status", "published")
        .is("deleted_at", null)
        .order("number");
      if (ue) throw ue;

      const { data: papers } = await supabase
        .from("papers")
        .select("id, title, year, exam_type, paper_number")
        .eq("subject_id", subject.id)
        .eq("status", "published")
        .is("deleted_at", null)
        .order("year", { ascending: false });

      return {
        course,
        sem,
        subject,
        units: (units ?? []) as UnitRow[],
        papers: papers ?? [],
      };
    },
  });

  const subjectId = subjectQuery.data?.subject.id;
  const units = subjectQuery.data?.units ?? [];

  const progressQuery = useQuery({
    queryKey: ["student", "subject-progress", user?.id, subjectId],
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

  const unitStats: UnitStats[] = useMemo(() => {
    const byUnit = new Map<string, ProgressRow>();
    for (const p of progress) byUnit.set(p.unit_id, p);
    return units.map((u) => {
      const p = byUnit.get(u.id);
      return {
        unit: u,
        status: (p?.status ?? "not_started") as UnitStatus,
        pct: Number(p?.progress_pct ?? 0),
        lastActivity: p?.last_activity_at ?? null,
      };
    });
  }, [units, progress]);

  const overall = useMemo(() => {
    const total = unitStats.length;
    const completed = unitStats.filter((u) => u.status === "completed").length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Resume unit: most-recent activity that isn't complete, else first non-complete, else first
    const withActivity = unitStats
      .filter((u) => u.lastActivity)
      .sort((a, b) => (b.lastActivity! > a.lastActivity! ? 1 : -1));
    const activeResume = withActivity.find((u) => u.status !== "completed");
    const resume =
      activeResume ??
      unitStats.find((u) => u.status !== "completed") ??
      unitStats[0] ??
      null;

    const lastActivity = withActivity[0]?.lastActivity ?? null;

    return { total, completed, pct, resume, lastActivity };
  }, [unitStats]);

  const started = overall.completed > 0 || unitStats.some((u) => u.status !== "not_started");

  const loadingCore = subjectQuery.isLoading;
  const loadingProgress = !!user && progressQuery.isLoading;

  const heroCtaLabel = !user
    ? "Start Learning"
    : overall.total === 0
      ? "Coming soon"
      : overall.completed === overall.total
        ? "Review Learning"
        : started
          ? "Continue Learning"
          : "Start Learning";

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <main className="mx-auto max-w-5xl px-5 pb-24 pt-8 sm:px-8 sm:pt-12">
        <Link
          to="/courses/$courseSlug/$semesterNumber"
          params={{ courseSlug, semesterNumber }}
          className="inline-flex items-center gap-1.5 rounded-md text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {subjectQuery.data?.sem.title ?? "Semester"}
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
          ) : subjectQuery.data ? (
            <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
              <div className="min-w-0">
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  {subjectQuery.data.subject.code}
                  {subjectQuery.data.subject.credits != null && (
                    <span className="ml-2 text-muted-foreground/70">
                      · {subjectQuery.data.subject.credits} credits
                    </span>
                  )}
                </p>
                <h1 className="mt-3 font-display text-3xl font-semibold leading-[1.15] tracking-tight text-foreground sm:text-4xl md:text-[2.5rem]">
                  {subjectQuery.data.subject.title}
                </h1>
                {subjectQuery.data.subject.description && (
                  <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
                    {subjectQuery.data.subject.description}
                  </p>
                )}

                {overall.total > 0 && (
                  <div className="mt-6 max-w-md">
                    <ProgressBar
                      value={user ? overall.pct : 0}
                      label={`${subjectQuery.data.subject.title} progress`}
                    />
                    <div className="mt-2 flex items-center justify-between text-[11px] font-medium text-muted-foreground">
                      <span>
                        {user
                          ? overall.completed === overall.total
                            ? `All ${overall.total} units completed`
                            : `You've completed ${overall.completed} of ${overall.total} units.`
                          : `${overall.total} units in this subject. Sign in to track your progress.`}
                      </span>
                      {user && (
                        <span className="tabular-nums text-foreground">{overall.pct}%</span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {overall.total > 0 && overall.resume && (
                <div className="md:pl-6">
                  <Button
                    asChild
                    size="lg"
                    className="h-12 w-full gap-2 rounded-xl px-6 text-sm font-semibold shadow-sm sm:w-auto"
                  >
                    <Link
                      to="/courses/$courseSlug/$semesterNumber/$subjectSlug/$unitNumber"
                      params={{
                        courseSlug,
                        semesterNumber,
                        subjectSlug,
                        unitNumber: String(overall.resume.unit.number),
                      }}
                    >
                      <span className="truncate">{heroCtaLabel}</span>
                      <ArrowRight className="h-4 w-4 shrink-0" />
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          ) : null}
        </section>

        {/* ─── Quick Stats ─── */}
        {subjectQuery.data && overall.total > 0 && (
          <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatTile
              label="Units completed"
              value={user ? `${overall.completed} / ${overall.total}` : `${overall.total} total`}
            />
            <StatTile
              label="Papers available"
              value={String(subjectQuery.data.papers.length)}
            />
            <StatTile
              label="Last studied"
              value={user ? (formatRelative(overall.lastActivity) ?? "Not yet") : "—"}
            />
          </section>
        )}

        {/* ─── Learning Path ─── */}
        <section className="mt-14">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="font-display text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              Learning path
            </h2>
            {overall.total > 0 && user && (
              <span className="text-xs font-medium tabular-nums text-muted-foreground">
                {overall.completed}/{overall.total} completed
              </span>
            )}
          </div>

          {loadingCore ? (
            <div className="mt-6 space-y-4">
              <Skeleton className="h-28 rounded-2xl" />
              <Skeleton className="h-28 rounded-2xl" />
              <Skeleton className="h-28 rounded-2xl" />
            </div>
          ) : unitStats.length === 0 ? (
            <EmptyUnits courseSlug={courseSlug} semesterNumber={semesterNumber} />
          ) : (
            <ol className="mt-6 relative">
              {/* Connector line */}
              <span
                aria-hidden
                className="absolute left-[27px] top-4 bottom-4 hidden w-px bg-border sm:block"
              />
              <div className="space-y-4">
                {unitStats.map((s) => (
                  <li key={s.unit.id} className="relative">
                    <UnitCard
                      stats={s}
                      isResume={!!user && overall.resume?.unit.id === s.unit.id && s.status !== "completed"}
                      loading={loadingProgress}
                      showProgress={!!user}
                      href={{
                        to: "/courses/$courseSlug/$semesterNumber/$subjectSlug/$unitNumber",
                        params: {
                          courseSlug,
                          semesterNumber,
                          subjectSlug,
                          unitNumber: String(s.unit.number),
                        },
                      }}
                    />
                  </li>
                ))}
              </div>
            </ol>
          )}
        </section>

        {/* ─── Resources ─── */}
        {subjectQuery.data && (
          <section className="mt-14">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="font-display text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                Resources
              </h2>
              {subjectQuery.data.papers.length > 0 && (
                <span className="text-xs font-medium text-muted-foreground">
                  Previous-year papers
                </span>
              )}
            </div>

            <div className="mt-6 space-y-3">
              {subjectQuery.data.papers.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center text-sm text-muted-foreground">
                  No past papers archived yet for this subject.
                </p>
              ) : (
                subjectQuery.data.papers.map((p) => (
                  <Link
                    key={p.id}
                    to="/papers/$paperId"
                    params={{ paperId: p.id }}
                    className="group flex items-center justify-between gap-4 rounded-2xl border border-border bg-surface p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    <div className="flex min-w-0 items-start gap-4">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                        <FileStack className="h-4 w-4" aria-hidden />
                      </span>
                      <div className="min-w-0">
                        <div className="truncate font-display text-base font-semibold text-foreground">
                          {p.title}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-medium text-muted-foreground">
                          <span className="tabular-nums text-foreground">{p.year}</span>
                          <span className="capitalize">{p.exam_type.replace("_", " ")}</span>
                          {p.paper_number && <span>Paper #{p.paper_number}</span>}
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                  </Link>
                ))
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

/* ─────────────── components ─────────────── */

function ProgressBar({ value, label }: { value: number; label: string }) {
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
        className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface px-5 py-4">
      <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 font-display text-lg font-semibold tabular-nums text-foreground">
        {value}
      </div>
    </div>
  );
}

function UnitCard({
  stats,
  isResume,
  loading,
  showProgress,
  href,
}: {
  stats: UnitStats;
  isResume: boolean;
  loading: boolean;
  showProgress: boolean;
  href: {
    to: "/courses/$courseSlug/$semesterNumber/$subjectSlug/$unitNumber";
    params: {
      courseSlug: string;
      semesterNumber: string;
      subjectSlug: string;
      unitNumber: string;
    };
  };
}) {
  const { unit, status, pct, lastActivity } = stats;
  const rel = formatRelative(lastActivity);
  const isDone = status === "completed";
  const inProgress = status === "in_progress";

  const ctaLabel = !showProgress
    ? "Open"
    : isDone
      ? "Review"
      : inProgress
        ? "Continue"
        : "Start";

  return (
    <Link
      {...href}
      aria-label={`Unit ${unit.number}: ${unit.title} — ${ctaLabel}`}
      aria-current={isResume ? "step" : undefined}
      className={cn(
        "group relative flex items-start gap-4 rounded-2xl border bg-surface p-5 pr-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:p-6 sm:pl-6",
        isResume ? "border-primary/60 ring-1 ring-primary/30" : "border-border",
      )}
    >
      {/* Medallion */}
      <span
        aria-hidden
        className={cn(
          "relative z-10 grid h-11 w-11 shrink-0 place-items-center rounded-xl font-display text-sm font-semibold tabular-nums",
          isDone
            ? "bg-primary text-primary-foreground"
            : isResume
              ? "bg-primary/15 text-primary ring-2 ring-primary/40"
              : inProgress
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground",
        )}
      >
        {isDone ? <Check className="h-5 w-5" /> : unit.number}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Unit {unit.number}
          </span>
          {showProgress && (
            <StatusPill status={status} isResume={isResume} />
          )}
        </div>
        <h3 className="mt-1.5 font-display text-lg font-semibold leading-snug tracking-tight text-foreground">
          {unit.title}
        </h3>
        {unit.summary && (
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground line-clamp-2">
            {unit.summary}
          </p>
        )}

        {showProgress && inProgress && (
          <div className="mt-3 max-w-xs">
            {loading ? (
              <Skeleton className="h-1.5 w-full rounded-full" />
            ) : (
              <ProgressBar value={pct} label={`Unit ${unit.number} progress`} />
            )}
          </div>
        )}

        {showProgress && rel && (
          <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
            <Clock className="h-3 w-3" aria-hidden /> Last studied · {rel}
          </div>
        )}
      </div>

      <div className="hidden shrink-0 items-center self-center sm:flex">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors",
            isResume
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-transparent text-primary group-hover:bg-primary/5",
          )}
        >
          {ctaLabel}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </span>
      </div>
    </Link>
  );
}

function StatusPill({
  status,
  isResume,
}: {
  status: UnitStatus;
  isResume: boolean;
}) {
  if (status === "completed") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
        <Check className="h-3 w-3" aria-hidden />
        Done
      </span>
    );
  }
  if (isResume) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">
        <PlayCircle className="h-3 w-3" aria-hidden />
        Up next
      </span>
    );
  }
  if (status === "in_progress") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
        In progress
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
      Not started
    </span>
  );
}

function EmptyUnits({
  courseSlug,
  semesterNumber,
}: {
  courseSlug: string;
  semesterNumber: string;
}) {
  return (
    <div className="mt-6 rounded-3xl border border-dashed border-border bg-surface px-6 py-14 text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
        <Sparkles className="h-5 w-5" aria-hidden />
      </span>
      <h3 className="mt-4 font-display text-lg font-semibold text-foreground">
        Units are on their way
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        A senior is curating structured, exam-ready units for this subject. As soon as they're
        published, they'll appear here.
      </p>
      <div className="mt-6">
        <Button asChild variant="outline" size="sm" className="rounded-xl">
          <Link
            to="/courses/$courseSlug/$semesterNumber"
            params={{ courseSlug, semesterNumber }}
          >
            <BookOpen className="mr-2 h-4 w-4" />
            Back to semester
          </Link>
        </Button>
      </div>
    </div>
  );
}
