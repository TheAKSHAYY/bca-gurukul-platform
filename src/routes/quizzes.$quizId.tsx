import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  FlaskConical,
  RotateCcw,
  Sparkles,
  XCircle,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/use-auth";
import { PublicHeader } from "./courses.index";


export const Route = createFileRoute("/quizzes/$quizId")({
  head: () => ({ meta: [{ title: "Quiz · BCA Gurukul" }] }),
  component: QuizPage,
});

type Option = { id: string; question_id: string; text: string; order_index: number };
type Question = {
  id: string;
  quiz_id: string;
  type: "single" | "multiple" | "true_false";
  prompt: string;
  explanation: string | null;
  points: number;
  order_index: number;
};
type Attempt = {
  id: string;
  submitted_at: string | null;
  score: number | null;
  max_score: number | null;
  pct: number | null;
  passed: boolean | null;
};

function QuizPage() {
  const { quizId } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();

  const quizQ = useQuery({
    queryKey: ["public-quiz", quizId],
    queryFn: async () => {
      const { data, error } = await supabase.from("quizzes").select("*").eq("id", quizId).maybeSingle();
      if (error) throw error;
      if (!data || data.status !== "published") throw notFound();
      return data;
    },
  });

  const questionsQ = useQuery({
    queryKey: ["public-quiz-questions", quizId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quiz_questions").select("*").eq("quiz_id", quizId).order("order_index");
      if (error) throw error;
      return (data ?? []) as Question[];
    },
  });

  const optionsQ = useQuery({
    queryKey: ["public-quiz-options", quizId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_quiz_options", { _quiz_id: quizId });
      if (error) throw error;
      return (data ?? []) as Option[];
    },
  });

  const myAttemptsQ = useQuery({
    queryKey: ["public-quiz-attempts", quizId, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quiz_attempts").select("*").eq("quiz_id", quizId).eq("user_id", user!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Attempt[];
    },
  });

  const [activeAttempt, setActiveAttempt] = useState<Attempt | null>(null);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [result, setResult] = useState<Attempt | null>(null);
  const [resultAnswers, setResultAnswers] = useState<Record<string, { selected: string[]; is_correct: boolean | null }>>({});

  const startedAtRef = useRef<number | null>(null);

  const startMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in to take this quiz");
      const { data, error } = await supabase
        .from("quiz_attempts").insert({ quiz_id: quizId, user_id: user.id }).select("*").single();
      if (error) throw error;
      return data as Attempt;
    },
    onSuccess: (a) => {
      setActiveAttempt(a);
      setAnswers({});
      setCurrentIdx(0);
      setResult(null);
      setResultAnswers({});
      startedAtRef.current = Date.now();
      qc.invalidateQueries({ queryKey: ["public-quiz-attempts", quizId, user?.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!activeAttempt) throw new Error("No active attempt");
      const { data, error } = await supabase.rpc("submit_quiz_attempt", {
        _attempt_id: activeAttempt.id,
        _answers: answers as never,
      });
      if (error) throw error;
      return data as unknown as Attempt;
    },
    onSuccess: async (a) => {
      setResult(a);
      setActiveAttempt(null);
      const { data: ans } = await supabase
        .from("quiz_attempt_answers").select("question_id, selected_option_ids, is_correct").eq("attempt_id", a.id);
      const map: Record<string, { selected: string[]; is_correct: boolean | null }> = {};
      for (const r of ans ?? []) map[r.question_id] = { selected: r.selected_option_ids ?? [], is_correct: r.is_correct };
      setResultAnswers(map);
      qc.invalidateQueries({ queryKey: ["public-quiz-attempts", quizId, user?.id] });
      toast.success(`Submitted — ${a.pct}%`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const optionsByQ = useMemo(() => {
    const map: Record<string, Option[]> = {};
    for (const o of optionsQ.data ?? []) (map[o.question_id] ??= []).push(o);
    return map;
  }, [optionsQ.data]);

  const questions = questionsQ.data ?? [];
  const total = questions.length;
  const current = activeAttempt ? questions[currentIdx] : null;
  const answeredCount = useMemo(
    () => questions.reduce((n, q) => n + ((answers[q.id]?.length ?? 0) > 0 ? 1 : 0), 0),
    [questions, answers],
  );

  // Countdown display (does not auto-submit)
  const timeLimitMin = quizQ.data?.time_limit_minutes as number | null | undefined;
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!activeAttempt || !timeLimitMin) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [activeAttempt, timeLimitMin]);
  const remainingLabel = useMemo(() => {
    if (!timeLimitMin || !startedAtRef.current) return null;
    const total = timeLimitMin * 60;
    const elapsed = Math.floor((now - startedAtRef.current) / 1000);
    const left = Math.max(0, total - elapsed);
    const m = Math.floor(left / 60).toString().padStart(2, "0");
    const s = (left % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }, [now, timeLimitMin]);

  const goPrev = useCallback(() => setCurrentIdx((i) => Math.max(0, i - 1)), []);
  const goNext = useCallback(() => setCurrentIdx((i) => Math.min(total - 1, i + 1)), [total]);

  // Keyboard: arrow nav + digit hotkeys for options
  useEffect(() => {
    if (!activeAttempt || !current) return;
    const opts = optionsByQ[current.id] ?? [];
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "ArrowRight") { e.preventDefault(); goNext(); return; }
      if (e.key === "ArrowLeft") { e.preventDefault(); goPrev(); return; }
      if (/^[1-9]$/.test(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        const opt = opts[idx];
        if (!opt) return;
        e.preventDefault();
        setAnswers((prev) => {
          const sel = prev[current.id] ?? [];
          if (current.type === "multiple") {
            const next = sel.includes(opt.id) ? sel.filter((x) => x !== opt.id) : [...sel, opt.id];
            return { ...prev, [current.id]: next };
          }
          return { ...prev, [current.id]: [opt.id] };
        });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeAttempt, current, optionsByQ, goNext, goPrev]);

  const progressPct = total ? Math.round(((currentIdx + 1) / total) * 100) : 0;

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />

      {/* Sticky quiz header during an active attempt */}
      {activeAttempt && quizQ.data && (
        <div className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
          <div className="mx-auto max-w-3xl px-6 py-3">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="truncate font-display text-sm font-semibold text-foreground">
                  {quizQ.data.title}
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                  Question {currentIdx + 1} of {total} · {answeredCount} answered
                </div>
              </div>
              {remainingLabel && (
                <div className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs font-medium tabular-nums text-foreground">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  {remainingLabel}
                </div>
              )}
            </div>
            <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${progressPct}%` }}
                role="progressbar"
                aria-valuenow={progressPct}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-3xl px-6 py-10 pb-32">
        {!activeAttempt && !result && (
          <Link to="/courses" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> All courses
          </Link>
        )}

        {/* Intro / start screen */}
        {!activeAttempt && !result && quizQ.data && (
          <>
            <header className="mt-6">
              <div className="flex items-center gap-2">
                <FlaskConical className="h-6 w-6 text-primary" />
                <h1 className="font-display text-3xl font-semibold text-foreground">{quizQ.data.title}</h1>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="outline">Pass {quizQ.data.passing_pct}%</Badge>
                {quizQ.data.time_limit_minutes && (
                  <Badge variant="outline"><Clock className="mr-1 h-3 w-3" />{quizQ.data.time_limit_minutes} min</Badge>
                )}
                <Badge variant="outline">{total} questions</Badge>
              </div>
              {quizQ.data.description && <p className="mt-3 text-muted-foreground">{quizQ.data.description}</p>}
            </header>

            {!user && (
              <div className="mt-8 rounded-xl border border-border bg-surface p-6 text-center">
                <p className="text-muted-foreground">Sign in to take this quiz and track your results.</p>
                <Link to="/auth" className="mt-3 inline-block"><Button>Sign in</Button></Link>
              </div>
            )}

            {user && (
              <section className="mt-8 space-y-4">
                {quizQ.data.instructions && (
                  <div className="rounded-xl border border-border bg-surface p-5 text-sm text-muted-foreground whitespace-pre-wrap">
                    {quizQ.data.instructions}
                  </div>
                )}
                <Button size="lg" onClick={() => startMutation.mutate()} disabled={startMutation.isPending}>
                  {startMutation.isPending ? "Starting…" : "Start attempt"}
                </Button>

                {(myAttemptsQ.data ?? []).filter((a) => a.submitted_at).length > 0 && (
                  <div className="mt-6">
                    <h2 className="font-display text-lg font-semibold text-foreground">Your previous attempts</h2>
                    <ul className="mt-2 space-y-2">
                      {(myAttemptsQ.data ?? []).filter((a) => a.submitted_at).map((a) => (
                        <li key={a.id} className="rounded-lg border border-border bg-surface px-4 py-3 text-sm">
                          <span className="font-medium tabular-nums">{a.pct}%</span> · {a.score}/{a.max_score} ·{" "}
                          <Badge variant={a.passed ? "default" : "secondary"}>{a.passed ? "Passed" : "Did not pass"}</Badge>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            )}
          </>
        )}

        {/* Active attempt — one question at a time */}
        {user && activeAttempt && current && (
          <section className="mt-8">
            <QuestionView
              index={currentIdx + 1}
              question={current}
              options={optionsByQ[current.id] ?? []}
              selected={answers[current.id] ?? []}
              onChange={(sel) => setAnswers((prev) => ({ ...prev, [current.id]: sel }))}
            />

            {/* Question navigator */}
            <div className="mt-8">
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Questions
              </div>
              <div className="flex flex-wrap gap-2">
                {questions.map((q, i) => {
                  const isCurrent = i === currentIdx;
                  const isAnswered = (answers[q.id]?.length ?? 0) > 0;
                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => setCurrentIdx(i)}
                      aria-label={`Go to question ${i + 1}${isAnswered ? ", answered" : ""}`}
                      aria-current={isCurrent ? "step" : undefined}
                      className={[
                        "h-9 w-9 rounded-md border text-sm font-medium tabular-nums transition",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        isCurrent
                          ? "border-primary bg-primary text-primary-foreground"
                          : isAnswered
                            ? "border-primary/40 bg-primary/10 text-foreground hover:bg-primary/15"
                            : "border-border bg-surface text-muted-foreground hover:text-foreground",
                      ].join(" ")}
                    >
                      {i + 1}
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                <LegendDot className="border-primary bg-primary" label="Current" />
                <LegendDot className="border-primary/40 bg-primary/10" label="Answered" />
                <LegendDot className="border-border bg-surface" label="Unanswered" />
              </div>
            </div>
          </section>
        )}

        {/* Results */}
        {result && quizQ.data && (
          <ResultsView
            quizTitle={quizQ.data.title}
            passingPct={quizQ.data.passing_pct}
            result={result}
            questions={questions}
            optionsByQ={optionsByQ}
            resultAnswers={resultAnswers}
            onRetry={() => startMutation.mutate()}
            retryPending={startMutation.isPending}
          />
        )}
      </main>


      {/* Sticky footer nav during an active attempt */}
      {activeAttempt && current && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-6 py-3">
            <Button
              variant="outline"
              onClick={goPrev}
              disabled={currentIdx === 0}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </Button>
            <div className="hidden text-xs text-muted-foreground tabular-nums sm:block">
              {answeredCount} / {total} answered
            </div>
            {currentIdx < total - 1 ? (
              <Button onClick={goNext} className="gap-1">
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={() => submitMutation.mutate()}
                disabled={submitMutation.isPending}
              >
                {submitMutation.isPending ? "Submitting…" : "Submit quiz"}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block h-3 w-3 rounded-sm border ${className}`} />
      {label}
    </span>
  );
}

function QuestionView({ index, question, options, selected, onChange }: {
  index: number;
  question: Question;
  options: Option[];
  selected: string[];
  onChange: (sel: string[]) => void;
}) {
  const multi = question.type === "multiple";
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Question {index} <span className="ml-1 normal-case tracking-normal text-muted-foreground/80">· {multi ? "select all that apply" : "select one"}</span>
      </div>
      <h2 className="mt-3 font-display text-2xl font-semibold leading-snug text-foreground">
        {question.prompt}
      </h2>

      <ul className="mt-8 space-y-3" role={multi ? "group" : "radiogroup"} aria-label={`Options for question ${index}`}>
        {options.map((o, i) => {
          const checked = selected.includes(o.id);
          const letter = String.fromCharCode(65 + i);
          return (
            <li key={o.id}>
              <label
                className={[
                  "group flex cursor-pointer items-center gap-4 rounded-xl border bg-surface px-4 py-4 transition",
                  "hover:border-primary/50",
                  "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
                  checked ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border",
                ].join(" ")}
              >
                <span
                  className={[
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-md border text-sm font-semibold tabular-nums transition",
                    checked
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground group-hover:text-foreground",
                  ].join(" ")}
                  aria-hidden="true"
                >
                  {letter}
                </span>
                <span className="min-w-0 flex-1 text-base leading-relaxed text-foreground">{o.text}</span>
                {multi ? (
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(c) => {
                      const next = c ? [...selected, o.id] : selected.filter((id) => id !== o.id);
                      onChange(next);
                    }}
                    aria-label={o.text}
                  />
                ) : (
                  <input
                    type="radio"
                    name={question.id}
                    checked={checked}
                    onChange={() => onChange([o.id])}
                    className="h-4 w-4 accent-primary"
                    aria-label={o.text}
                  />
                )}
              </label>
            </li>
          );
        })}
      </ul>

      <p className="mt-6 text-xs text-muted-foreground">
        Tip: press <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">1</kbd>–<kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">{Math.min(options.length, 9)}</kbd> to select, <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">←</kbd> / <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">→</kbd> to navigate.
      </p>
    </div>
  );
}

function ResultsView({
  quizTitle,
  passingPct,
  result,
  questions,
  optionsByQ,
  resultAnswers,
  onRetry,
  retryPending,
}: {
  quizTitle: string;
  passingPct: number;
  result: Attempt;
  questions: Question[];
  optionsByQ: Record<string, Option[]>;
  resultAnswers: Record<string, { selected: string[]; is_correct: boolean | null }>;
  onRetry: () => void;
  retryPending: boolean;
}) {
  const summary = useMemo(() => {
    let correct = 0;
    let incorrect = 0;
    let skipped = 0;
    for (const q of questions) {
      const r = resultAnswers[q.id];
      if (!r || (r.selected?.length ?? 0) === 0) skipped++;
      else if (r.is_correct) correct++;
      else incorrect++;
    }
    return { correct, incorrect, skipped, total: questions.length };
  }, [questions, resultAnswers]);

  const pct = result.pct ?? 0;
  const encouragement = useMemo(() => {
    if (pct >= 90) return "Excellent work — you've mastered this material.";
    if (result.passed) return "Great job — you passed. Keep the momentum going.";
    if (pct >= passingPct - 10) return "Almost there. Review the misses and try again.";
    return "Keep practicing — every attempt sharpens your understanding.";
  }, [pct, result.passed, passingPct]);

  return (
    <section className="mt-10 space-y-10" aria-labelledby="results-heading">
      {/* Hero */}
      <header className="border-b border-border pb-10">
        <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Quiz completed
        </div>
        <h1 id="results-heading" className="mt-3 font-display text-2xl font-semibold text-foreground">
          {quizTitle}
        </h1>
        <div className="mt-6 flex flex-wrap items-end gap-6">
          <div>
            <div className="font-display text-6xl font-semibold leading-none text-foreground tabular-nums">
              {pct}
              <span className="text-3xl text-muted-foreground">%</span>
            </div>
            <div className="mt-2 text-sm text-muted-foreground tabular-nums">
              Score {result.score} / {result.max_score} · Pass mark {passingPct}%
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Badge
              variant={result.passed ? "default" : "secondary"}
              className="w-fit px-3 py-1 text-sm"
            >
              {result.passed ? "Passed" : "Did not pass"}
            </Badge>
            <p className="max-w-md text-sm text-foreground/80">
              <Sparkles className="mr-1.5 inline h-4 w-4 text-primary" aria-hidden="true" />
              {encouragement}
            </p>
          </div>
        </div>
      </header>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryTile label="Correct" value={summary.correct} tone="positive" />
        <SummaryTile label="Incorrect" value={summary.incorrect} tone="negative" />
        <SummaryTile label="Skipped" value={summary.skipped} tone="muted" />
        <SummaryTile label="Total" value={summary.total} tone="muted" />
      </div>

      {/* Next steps */}
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild size="lg">
          <Link to="/courses">Continue learning</Link>
        </Button>
        <Button variant="outline" onClick={onRetry} disabled={retryPending} className="gap-1.5">
          <RotateCcw className="h-4 w-4" />
          {retryPending ? "Starting…" : "Retry quiz"}
        </Button>
        <Button asChild variant="ghost">
          <Link to="/courses">Back to courses</Link>
        </Button>
      </div>

      {/* Review */}
      <div>
        <h2 className="font-display text-xl font-semibold text-foreground">
          Review your answers
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Understanding the misses is where the real learning happens.
        </p>

        <ol className="mt-6 space-y-4">
          {questions.map((q, idx) => {
            const r = resultAnswers[q.id];
            const opts = optionsByQ[q.id] ?? [];
            const skipped = !r || (r.selected?.length ?? 0) === 0;
            const status: "correct" | "incorrect" | "skipped" = skipped
              ? "skipped"
              : r?.is_correct
                ? "correct"
                : "incorrect";
            const statusLabel =
              status === "correct" ? "Correct" : status === "incorrect" ? "Incorrect" : "Skipped";
            return (
              <li key={q.id} className="rounded-2xl border border-border bg-surface p-6">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {status === "correct" ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden="true" />
                    ) : status === "incorrect" ? (
                      <XCircle className="h-5 w-5 text-destructive" aria-hidden="true" />
                    ) : (
                      <span
                        className="h-2 w-2 rounded-full bg-muted-foreground/60"
                        aria-hidden="true"
                      />
                    )}
                    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground tabular-nums">
                      Question {idx + 1}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {statusLabel}
                  </Badge>
                </div>
                <p className="mt-3 text-foreground">{q.prompt}</p>

                <ul className="mt-4 space-y-2 text-sm">
                  {opts.map((o) => {
                    const picked = r?.selected.includes(o.id);
                    return (
                      <li
                        key={o.id}
                        className={[
                          "rounded-lg border px-3 py-2.5",
                          picked
                            ? status === "correct"
                              ? "border-emerald-500/50 bg-emerald-500/5 text-foreground"
                              : "border-destructive/50 bg-destructive/5 text-foreground"
                            : "border-border text-muted-foreground",
                        ].join(" ")}
                      >
                        {o.text}
                        {picked && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            (your answer)
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>

                {q.explanation && (
                  <div className="mt-4 rounded-lg border border-border bg-background p-3 text-sm text-muted-foreground">
                    <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-foreground">
                      Explanation
                    </div>
                    {q.explanation}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

function SummaryTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "positive" | "negative" | "muted";
}) {
  const valueClass =
    tone === "positive"
      ? "text-emerald-600"
      : tone === "negative"
        ? "text-destructive"
        : "text-foreground";
  return (
    <div className="rounded-xl border border-border bg-surface px-4 py-4">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className={`mt-1 font-display text-2xl font-semibold tabular-nums ${valueClass}`}>
        {value}
      </div>
    </div>
  );
}

