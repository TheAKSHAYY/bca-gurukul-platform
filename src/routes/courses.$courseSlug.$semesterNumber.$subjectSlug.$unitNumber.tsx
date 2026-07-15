import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Copy,
  FileText,
  ListOrdered,
  Sparkles,
  Timer,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PdfViewer } from "@/components/pdf-viewer";
import { cn } from "@/lib/utils";
import { PublicHeader } from "./courses.index";

export const Route = createFileRoute(
  "/courses/$courseSlug/$semesterNumber/$subjectSlug/$unitNumber",
)({
  head: () => ({ meta: [{ title: "Unit · BCA Gurukul" }] }),
  component: UnitDetail,
});

type NoteRow = {
  id: string;
  title: string;
  summary: string | null;
  body: string | null;
  file_path: string | null;
  file_bucket: string | null;
};

type SiblingUnit = { id: string; number: number };

type QuizRow = { id: string; title: string; time_limit_minutes: number | null };

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function estimateReadMinutes(notes: NoteRow[]) {
  const words = notes.reduce((total, n) => {
    const text = `${n.title ?? ""} ${n.summary ?? ""} ${n.body ?? ""}`.trim();
    if (!text) return total;
    return total + text.split(/\s+/).length;
  }, 0);
  if (words === 0) return 0;
  return Math.max(1, Math.round(words / 200));
}

function UnitDetail() {
  const { courseSlug, semesterNumber, subjectSlug, unitNumber } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();

  /* ─────────── data ─────────── */

  const dataQuery = useQuery({
    queryKey: ["public", "unit", courseSlug, semesterNumber, subjectSlug, unitNumber],
    queryFn: async () => {
      const { data: course } = await supabase
        .from("courses")
        .select("id, title")
        .eq("slug", courseSlug)
        .eq("status", "published")
        .is("deleted_at", null)
        .maybeSingle();
      if (!course) throw notFound();
      const { data: sem } = await supabase
        .from("semesters")
        .select("id, number, title")
        .eq("course_id", course.id)
        .eq("number", Number(semesterNumber))
        .eq("status", "published")
        .is("deleted_at", null)
        .maybeSingle();
      if (!sem) throw notFound();
      const { data: subject } = await supabase
        .from("subjects")
        .select("id, code, title")
        .eq("semester_id", sem.id)
        .eq("slug", subjectSlug)
        .eq("status", "published")
        .is("deleted_at", null)
        .maybeSingle();
      if (!subject) throw notFound();
      const { data: unit } = await supabase
        .from("units")
        .select("id, number, title, summary")
        .eq("subject_id", subject.id)
        .eq("number", Number(unitNumber))
        .eq("status", "published")
        .is("deleted_at", null)
        .maybeSingle();
      if (!unit) throw notFound();

      const [{ data: notes }, { data: siblings }, { data: quizzes }] = await Promise.all([
        supabase
          .from("notes")
          .select("id, title, summary, body, file_path, file_bucket")
          .eq("unit_id", unit.id)
          .eq("status", "published")
          .is("deleted_at", null)
          .order("sort_order")
          .order("created_at"),
        supabase
          .from("units")
          .select("id, number")
          .eq("subject_id", subject.id)
          .eq("status", "published")
          .is("deleted_at", null)
          .order("number"),
        supabase
          .from("quizzes")
          .select("id, title, time_limit_minutes")
          .eq("unit_id", unit.id)
          .eq("status", "published")
          .is("deleted_at", null)
          .order("order_index"),
      ]);

      return {
        course,
        sem,
        subject,
        unit,
        notes: (notes ?? []) as NoteRow[],
        siblings: (siblings ?? []) as SiblingUnit[],
        quizzes: (quizzes ?? []) as QuizRow[],
      };
    },
  });

  const unitId = dataQuery.data?.unit.id;

  const progressQuery = useQuery({
    queryKey: ["student", "unit-progress", user?.id, unitId],
    enabled: !!user?.id && !!unitId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("progress_tracking")
        .select("id, status, progress_pct, completed_at")
        .eq("user_id", user!.id)
        .eq("unit_id", unitId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !unitId) throw new Error("Not signed in");
      const existing = progressQuery.data;
      const now = new Date().toISOString();
      if (existing) {
        const { error } = await supabase
          .from("progress_tracking")
          .update({
            status: "completed",
            progress_pct: 100,
            completed_at: now,
            last_activity_at: now,
          })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("progress_tracking").insert({
          user_id: user.id,
          unit_id: unitId,
          status: "completed",
          progress_pct: 100,
          completed_at: now,
          last_activity_at: now,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["student", "unit-progress", user?.id, unitId] });
      qc.invalidateQueries({ queryKey: ["student", "subject-progress"] });
      qc.invalidateQueries({ queryKey: ["student", "sem-progress"] });
    },
  });

  // Mark as in_progress on first visit (best-effort)
  useEffect(() => {
    if (!user?.id || !unitId) return;
    if (progressQuery.isLoading) return;
    if (progressQuery.data) return;
    (async () => {
      const now = new Date().toISOString();
      await supabase.from("progress_tracking").insert({
        user_id: user.id,
        unit_id: unitId,
        status: "in_progress",
        progress_pct: 25,
        last_activity_at: now,
      });
      qc.invalidateQueries({ queryKey: ["student", "unit-progress", user?.id, unitId] });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, unitId, progressQuery.isLoading, progressQuery.data]);

  /* ─────────── derived ─────────── */

  const notes = dataQuery.data?.notes ?? [];
  const readMinutes = useMemo(() => estimateReadMinutes(notes), [notes]);

  const toc = useMemo(
    () =>
      notes.map((n) => ({
        id: `note-${slugify(n.title)}-${n.id.slice(0, 6)}`,
        title: n.title,
      })),
    [notes],
  );

  const { prevUnit, nextUnit } = useMemo(() => {
    const list = dataQuery.data?.siblings ?? [];
    const idx = list.findIndex((u) => u.number === Number(unitNumber));
    return {
      prevUnit: idx > 0 ? list[idx - 1] : null,
      nextUnit: idx >= 0 && idx < list.length - 1 ? list[idx + 1] : null,
    };
  }, [dataQuery.data?.siblings, unitNumber]);

  const isCompleted = progressQuery.data?.status === "completed";
  const primaryQuiz = dataQuery.data?.quizzes[0];

  /* ─────────── scroll progress ─────────── */

  const articleRef = useRef<HTMLElement | null>(null);
  const [readPct, setReadPct] = useState(0);
  const [activeSection, setActiveSection] = useState<string | null>(toc[0]?.id ?? null);

  useEffect(() => {
    let raf = 0;
    const compute = () => {
      const el = articleRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const viewport = window.innerHeight;
      const total = Math.max(1, rect.height - viewport);
      const scrolled = Math.min(total, Math.max(0, -rect.top));
      const pct = Math.round((scrolled / total) * 100);
      setReadPct(pct);

      // active section
      let current: string | null = toc[0]?.id ?? null;
      for (const item of toc) {
        const node = document.getElementById(item.id);
        if (!node) continue;
        if (node.getBoundingClientRect().top - 120 <= 0) current = item.id;
      }
      setActiveSection(current);
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(compute);
    };
    compute();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [toc]);

  /* ─────────── render ─────────── */

  if (dataQuery.isLoading) {
    return (
      <div className="min-h-dvh bg-background">
        <PublicHeader />
        <main className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-4 h-10 w-3/4" />
          <Skeleton className="mt-3 h-4 w-1/2" />
          <div className="mt-10 space-y-4">
            <Skeleton className="h-40 rounded-2xl" />
            <Skeleton className="h-40 rounded-2xl" />
          </div>
        </main>
      </div>
    );
  }

  if (dataQuery.isError || !dataQuery.data) {
    return (
      <div className="min-h-dvh bg-background">
        <PublicHeader />
        <main className="mx-auto max-w-5xl px-5 py-12 sm:px-8">
          <EmptyState
            icon={AlertCircle}
            tone="accent"
            title="This unit is not available yet"
            description="The unit may still be a draft, unpublished, or temporarily unavailable. Published content will open here automatically."
            primaryAction={{ label: "Browse courses", to: "/courses", icon: BookOpen }}
          />
        </main>
      </div>
    );
  }

  const { subject, unit } = dataQuery.data;
  const hasBodyContent = notes.some((n) => n.body && n.body.trim().length > 0);

  return (
    <div className="min-h-dvh bg-background">
      <PublicHeader />

      {/* ─── Compact reading header ─── */}
      <div className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto max-w-6xl px-5 py-3 sm:px-8">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <Link
                to="/courses/$courseSlug/$semesterNumber/$subjectSlug"
                params={{ courseSlug, semesterNumber, subjectSlug }}
                className="inline-flex items-center gap-1.5 rounded-md text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span className="truncate">
                  {subject.code} · {subject.title}
                </span>
              </Link>
              <div className="mt-1 flex items-center gap-3 truncate">
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Unit {unit.number}
                </span>
                <h1 className="truncate font-display text-sm font-semibold text-foreground sm:text-base">
                  {unit.title}
                </h1>
              </div>
            </div>

            <div className="hidden shrink-0 items-center gap-2 sm:flex">
              {readMinutes > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-[11px] font-medium text-muted-foreground">
                  <Timer className="h-3 w-3" aria-hidden />
                  {readMinutes} min read
                </span>
              )}
              {isCompleted && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary">
                  <Check className="h-3 w-3" aria-hidden />
                  Completed
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Reading progress bar */}
        <div
          className="h-0.5 w-full bg-transparent"
          role="progressbar"
          aria-label="Reading progress"
          aria-valuenow={readPct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full bg-primary transition-[width] duration-150 ease-out"
            style={{ width: `${readPct}%` }}
          />
        </div>
      </div>

      {/* ─── Body ─── */}
      <main className="mx-auto max-w-6xl px-5 pb-24 pt-8 sm:px-8 sm:pt-10">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_16rem]">
          {/* Article column */}
          <article ref={articleRef} className="min-w-0">
            {/* Title block */}
            <header className="mb-8">
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Unit {unit.number}
              </p>
              <h2 className="mt-2 font-display text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl">
                {unit.title}
              </h2>
              {unit.summary && (
                <p className="mt-3 max-w-[68ch] text-base leading-relaxed text-muted-foreground">
                  {unit.summary}
                </p>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] font-medium text-muted-foreground">
                {readMinutes > 0 && (
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-3 w-3" aria-hidden /> {readMinutes} min read
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5">
                  <FileText className="h-3 w-3" aria-hidden />
                  {notes.length} {notes.length === 1 ? "note" : "notes"}
                </span>
              </div>
            </header>

            {/* Mobile TOC */}
            {toc.length > 1 && (
              <details className="mb-6 rounded-2xl border border-border bg-surface p-4 lg:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-foreground">
                  <span className="inline-flex items-center gap-2">
                    <ListOrdered className="h-4 w-4 text-primary" aria-hidden />
                    On this page
                  </span>
                  <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
                </summary>
                <ol className="mt-3 space-y-1.5 text-sm">
                  {toc.map((item, i) => (
                    <li key={item.id}>
                      <a
                        href={`#${item.id}`}
                        className="flex gap-3 rounded-md px-2 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <span className="tabular-nums text-muted-foreground/70">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span>{item.title}</span>
                      </a>
                    </li>
                  ))}
                </ol>
              </details>
            )}

            {/* Notes */}
            {notes.length === 0 && !hasBodyContent && (
              <EmptyState
                icon={FileText}
                tone="accent"
                title="Notes are being prepared"
                description="A senior is curating structured, exam-ready notes for this unit. As soon as they're published, you'll see them right here."
                primaryAction={{ label: "Explore other units", to: "/courses", icon: BookOpen }}
              />
            )}

            <div className="space-y-10">
              {notes.map((n, i) => (
                <NoteBlock key={n.id} note={n} anchorId={toc[i]?.id ?? `note-${n.id}`} />
              ))}
            </div>

            {/* Completion + Quiz zone */}
            {notes.length > 0 && (
              <section className="mt-14 space-y-4">
                <div className="rounded-3xl border border-border bg-surface p-6 sm:p-8">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="font-display text-lg font-semibold text-foreground">
                        {isCompleted ? "You've finished this unit." : "Finished reading?"}
                      </h3>
                      <p className="mt-1 max-w-lg text-sm text-muted-foreground">
                        {isCompleted
                          ? "Nice work. Move on to the next unit to keep your streak going."
                          : "Mark this unit as complete to track your progress across the semester."}
                      </p>
                    </div>
                    {user ? (
                      isCompleted ? (
                        <span className="inline-flex items-center gap-2 rounded-xl bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary">
                          <Check className="h-4 w-4" aria-hidden />
                          Completed
                        </span>
                      ) : (
                        <Button
                          size="lg"
                          className="h-11 gap-2 rounded-xl px-5 text-sm font-semibold"
                          onClick={() => completeMutation.mutate()}
                          disabled={completeMutation.isPending}
                        >
                          <Check className="h-4 w-4" aria-hidden />
                          {completeMutation.isPending ? "Saving…" : "Mark as complete"}
                        </Button>
                      )
                    ) : (
                      <Button asChild variant="outline" className="rounded-xl">
                        <Link to="/auth">Sign in to track progress</Link>
                      </Button>
                    )}
                  </div>
                </div>

                {primaryQuiz && (
                  <div className="rounded-3xl border border-dashed border-primary/40 bg-primary/[0.04] p-6 sm:p-8">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-start gap-3">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
                          <ClipboardCheck className="h-5 w-5" aria-hidden />
                        </span>
                        <div>
                          <h3 className="font-display text-lg font-semibold text-foreground">
                            Ready to test yourself?
                          </h3>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {primaryQuiz.title}
                            {primaryQuiz.time_limit_minutes
                              ? ` · ${primaryQuiz.time_limit_minutes} min`
                              : ""}
                          </p>
                        </div>
                      </div>
                      <Button
                        asChild
                        variant="outline"
                        className="h-11 gap-2 rounded-xl border-primary/40 px-5 text-sm font-semibold text-primary hover:bg-primary/10"
                      >
                        <Link to="/quizzes/$quizId" params={{ quizId: primaryQuiz.id }}>
                          Take quiz
                          <ArrowRight className="h-4 w-4" aria-hidden />
                        </Link>
                      </Button>
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* Prev / Next navigation */}
            <nav
              aria-label="Unit navigation"
              className="mt-12 grid gap-3 sm:grid-cols-2"
            >
              {prevUnit ? (
                <Link
                  to="/courses/$courseSlug/$semesterNumber/$subjectSlug/$unitNumber"
                  params={{
                    courseSlug,
                    semesterNumber,
                    subjectSlug,
                    unitNumber: String(prevUnit.number),
                  }}
                  className="group flex items-center gap-3 rounded-2xl border border-border bg-surface p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <ArrowLeft className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary" />
                  <div className="min-w-0">
                    <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      Previous unit
                    </div>
                    <div className="truncate font-display text-sm font-semibold text-foreground">
                      Unit {prevUnit.number}
                    </div>
                  </div>
                </Link>
              ) : (
                <span
                  aria-hidden
                  className="hidden rounded-2xl border border-dashed border-border/60 bg-transparent p-5 text-xs text-muted-foreground/60 sm:block"
                >
                  Start of subject
                </span>
              )}
              {nextUnit ? (
                <Link
                  to="/courses/$courseSlug/$semesterNumber/$subjectSlug/$unitNumber"
                  params={{
                    courseSlug,
                    semesterNumber,
                    subjectSlug,
                    unitNumber: String(nextUnit.number),
                  }}
                  className="group flex items-center justify-end gap-3 rounded-2xl border border-border bg-surface p-5 text-right transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <div className="min-w-0">
                    <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      Next unit
                    </div>
                    <div className="truncate font-display text-sm font-semibold text-foreground">
                      Unit {nextUnit.number}
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary" />
                </Link>
              ) : (
                <span
                  aria-hidden
                  className="hidden rounded-2xl border border-dashed border-border/60 bg-transparent p-5 text-right text-xs text-muted-foreground/60 sm:block"
                >
                  End of subject
                </span>
              )}
            </nav>
          </article>

          {/* Sticky TOC (desktop) */}
          {toc.length > 0 && (
            <aside className="hidden lg:block">
              <div className="sticky top-24">
                <div className="mb-3 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  <ListOrdered className="h-3.5 w-3.5" aria-hidden />
                  On this page
                </div>
                <nav aria-label="Table of contents">
                  <ol className="space-y-1">
                    {toc.map((item, i) => {
                      const active = activeSection === item.id;
                      return (
                        <li key={item.id}>
                          <a
                            href={`#${item.id}`}
                            aria-current={active ? "location" : undefined}
                            className={cn(
                              "flex gap-3 rounded-md border-l-2 py-1.5 pl-3 pr-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                              active
                                ? "border-primary bg-primary/5 font-semibold text-foreground"
                                : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
                            )}
                          >
                            <span className="tabular-nums text-muted-foreground/70">
                              {String(i + 1).padStart(2, "0")}
                            </span>
                            <span className="line-clamp-2">{item.title}</span>
                          </a>
                        </li>
                      );
                    })}
                  </ol>
                </nav>
                {readMinutes > 0 && (
                  <div className="mt-6 rounded-xl border border-border bg-surface px-4 py-3 text-[11px] text-muted-foreground">
                    <div className="inline-flex items-center gap-1.5 font-medium text-foreground">
                      <Sparkles className="h-3 w-3 text-primary" aria-hidden />
                      Focus tip
                    </div>
                    <p className="mt-1 leading-relaxed">
                      Aim for one uninterrupted {readMinutes}-min sitting to hold the thread.
                    </p>
                  </div>
                )}
              </div>
            </aside>
          )}
        </div>
      </main>
    </div>
  );
}

/* ─────────── NoteBlock ─────────── */

function NoteBlock({ note, anchorId }: { note: NoteRow; anchorId: string }) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!note.file_path) {
      setPdfUrl(null);
      return;
    }
    let active = true;
    (async () => {
      const { data, error } = await supabase.storage
        .from(note.file_bucket ?? "notes")
        .createSignedUrl(note.file_path!, 60 * 60);
      if (!error && active) setPdfUrl(data?.signedUrl ?? null);
    })();
    return () => {
      active = false;
    };
  }, [note.file_path, note.file_bucket]);

  const onCopy = useCallback(async () => {
    if (!note.body) return;
    try {
      await navigator.clipboard.writeText(note.body);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  }, [note.body]);

  return (
    <section id={anchorId} className="scroll-mt-28">
      <h2 className="font-display text-2xl font-semibold leading-snug tracking-tight text-foreground sm:text-[1.75rem]">
        <a href={`#${anchorId}`} className="group inline-flex items-center gap-2 no-underline">
          {note.title}
          <span
            aria-hidden
            className="text-base font-normal text-muted-foreground/40 opacity-0 transition-opacity group-hover:opacity-100"
          >
            #
          </span>
        </a>
      </h2>
      {note.summary && (
        <p className="mt-2 max-w-[68ch] text-base leading-relaxed text-muted-foreground">
          {note.summary}
        </p>
      )}

      {note.body && (
        <div className="relative mt-6 rounded-2xl border border-border bg-surface">
          <button
            type="button"
            onClick={onCopy}
            aria-label={copied ? "Copied" : "Copy note text"}
            className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground opacity-0 shadow-sm transition-opacity hover:text-foreground focus:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background group-hover:opacity-100 sm:opacity-100"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3" aria-hidden /> Copied
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" aria-hidden /> Copy
              </>
            )}
          </button>
          <div className="prose-reader max-w-[68ch] whitespace-pre-wrap px-5 py-6 text-[17px] leading-[1.75] text-foreground sm:px-7 sm:py-8">
            {note.body}
          </div>
        </div>
      )}

      {pdfUrl && (
        <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-surface">
          <PdfViewer url={pdfUrl} title={note.title} />
        </div>
      )}

      {!note.body && !pdfUrl && (
        <p className="mt-6 rounded-2xl border border-dashed border-border bg-surface p-6 text-sm text-muted-foreground">
          This note has no content yet.
        </p>
      )}
    </section>
  );
}
