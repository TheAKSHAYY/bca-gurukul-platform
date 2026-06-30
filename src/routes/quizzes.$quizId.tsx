import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, Clock, FlaskConical, XCircle } from "lucide-react";

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
  const [result, setResult] = useState<Attempt | null>(null);
  const [resultAnswers, setResultAnswers] = useState<Record<string, { selected: string[]; is_correct: boolean | null }>>({});

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
      setResult(null);
      setResultAnswers({});
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

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <main className="mx-auto max-w-3xl px-6 py-12">
        <Link to="/courses" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> All courses
        </Link>

        {quizQ.data && (
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
              <Badge variant="outline">{(questionsQ.data ?? []).length} questions</Badge>
            </div>
            {quizQ.data.description && <p className="mt-3 text-muted-foreground">{quizQ.data.description}</p>}
          </header>
        )}

        {!user && (
          <div className="mt-8 rounded-xl border border-border bg-surface p-6 text-center">
            <p className="text-muted-foreground">Sign in to take this quiz and track your results.</p>
            <Link to="/auth" className="mt-3 inline-block"><Button>Sign in</Button></Link>
          </div>
        )}

        {user && !activeAttempt && !result && (
          <section className="mt-8 space-y-4">
            {quizQ.data?.instructions && (
              <div className="rounded-xl border border-border bg-surface p-5 text-sm text-muted-foreground whitespace-pre-wrap">
                {quizQ.data.instructions}
              </div>
            )}
            <Button onClick={() => startMutation.mutate()} disabled={startMutation.isPending}>
              {startMutation.isPending ? "Starting…" : "Start attempt"}
            </Button>

            {(myAttemptsQ.data ?? []).filter((a) => a.submitted_at).length > 0 && (
              <div className="mt-6">
                <h2 className="font-display text-lg font-semibold text-foreground">Your previous attempts</h2>
                <ul className="mt-2 space-y-2">
                  {(myAttemptsQ.data ?? []).filter((a) => a.submitted_at).map((a) => (
                    <li key={a.id} className="rounded-lg border border-border bg-surface px-4 py-3 text-sm">
                      <span className="font-medium">{a.pct}%</span> · {a.score}/{a.max_score} ·{" "}
                      <Badge variant={a.passed ? "default" : "secondary"}>{a.passed ? "Passed" : "Did not pass"}</Badge>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {user && activeAttempt && (
          <section className="mt-8 space-y-6">
            {(questionsQ.data ?? []).map((q, idx) => (
              <QuestionView
                key={q.id}
                index={idx + 1}
                question={q}
                options={optionsByQ[q.id] ?? []}
                selected={answers[q.id] ?? []}
                onChange={(sel) => setAnswers((prev) => ({ ...prev, [q.id]: sel }))}
              />
            ))}
            <Button onClick={() => submitMutation.mutate()} disabled={submitMutation.isPending}>
              {submitMutation.isPending ? "Submitting…" : "Submit attempt"}
            </Button>
          </section>
        )}

        {result && (
          <section className="mt-8 space-y-6">
            <div className="rounded-2xl border border-border bg-surface p-6">
              <div className="font-display text-3xl font-semibold text-foreground">{result.pct}%</div>
              <p className="text-sm text-muted-foreground">
                Score {result.score}/{result.max_score} ·{" "}
                <Badge variant={result.passed ? "default" : "secondary"}>{result.passed ? "Passed" : "Did not pass"}</Badge>
              </p>
            </div>

            {(questionsQ.data ?? []).map((q, idx) => {
              const r = resultAnswers[q.id];
              const opts = optionsByQ[q.id] ?? [];
              return (
                <div key={q.id} className="rounded-2xl border border-border bg-surface p-5">
                  <div className="flex items-center gap-2">
                    {r?.is_correct ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-destructive" />
                    )}
                    <h3 className="font-display text-base font-semibold text-foreground">
                      Question {idx + 1}
                    </h3>
                  </div>
                  <p className="mt-2 text-foreground">{q.prompt}</p>
                  <ul className="mt-3 space-y-1.5 text-sm">
                    {opts.map((o) => {
                      const picked = r?.selected.includes(o.id);
                      return (
                        <li key={o.id} className={`rounded-md border px-3 py-2 ${picked ? "border-primary bg-primary/5" : "border-border"}`}>
                          {o.text} {picked && <span className="ml-2 text-xs text-muted-foreground">(your answer)</span>}
                        </li>
                      );
                    })}
                  </ul>
                  {q.explanation && (
                    <p className="mt-3 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
                      <strong>Explanation:</strong> {q.explanation}
                    </p>
                  )}
                </div>
              );
            })}

            <Button variant="outline" onClick={() => { setResult(null); setResultAnswers({}); }}>Done</Button>
          </section>
        )}
      </main>
    </div>
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
    <div className="rounded-2xl border border-border bg-surface p-5">
      <h3 className="font-display text-base font-semibold text-foreground">
        Question {index}{" "}
        <span className="ml-2 text-xs font-normal text-muted-foreground">
          {multi ? "(select all that apply)" : "(select one)"}
        </span>
      </h3>
      <p className="mt-2 text-foreground">{question.prompt}</p>
      <ul className="mt-4 space-y-2">
        {options.map((o) => {
          const checked = selected.includes(o.id);
          return (
            <li key={o.id}>
              <label className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 transition ${checked ? "border-primary bg-primary/5" : "border-border"}`}>
                {multi ? (
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(c) => {
                      const next = c ? [...selected, o.id] : selected.filter((id) => id !== o.id);
                      onChange(next);
                    }}
                  />
                ) : (
                  <input
                    type="radio"
                    name={question.id}
                    checked={checked}
                    onChange={() => onChange([o.id])}
                    className="h-4 w-4"
                  />
                )}
                <span className="text-sm text-foreground">{o.text}</span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
