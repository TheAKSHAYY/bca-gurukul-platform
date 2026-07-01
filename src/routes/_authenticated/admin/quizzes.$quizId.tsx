import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, Save, CheckCircle2, Sparkles } from "lucide-react";
import { BulkImportDialog } from "@/components/mcq/bulk-import-dialog";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/admin/quizzes/$quizId")({
  head: () => ({ meta: [{ title: "Quiz editor · Admin · BCA Gurukul" }] }),
  component: QuizEditor,
});

type QuestionType = "single" | "multiple" | "true_false";

type OptionRow = {
  id: string;
  question_id: string;
  text: string;
  is_correct: boolean;
  order_index: number;
};

type QuestionRow = {
  id: string;
  quiz_id: string;
  type: QuestionType;
  prompt: string;
  explanation: string | null;
  points: number;
  order_index: number;
  options: OptionRow[];
};

function QuizEditor() {
  const { quizId } = Route.useParams();
  const qc = useQueryClient();
  const [bulkOpen, setBulkOpen] = useState(false);

  const quizQ = useQuery({
    queryKey: ["admin-quiz", quizId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quizzes")
        .select("*")
        .eq("id", quizId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const questionsQ = useQuery({
    queryKey: ["admin-quiz-questions", quizId],
    queryFn: async () => {
      const { data: qs, error } = await supabase
        .from("quiz_questions")
        .select("*")
        .eq("quiz_id", quizId)
        .order("order_index")
        .order("created_at");
      if (error) throw error;
      const ids = (qs ?? []).map((q) => q.id);
      const { data: opts, error: e2 } = ids.length
        ? await supabase
            .from("quiz_options")
            .select("*")
            .in("question_id", ids)
            .order("order_index")
        : { data: [], error: null };
      if (e2) throw e2;
      const byQ: Record<string, OptionRow[]> = {};
      for (const o of opts ?? []) (byQ[o.question_id] ??= []).push(o as OptionRow);
      return (qs ?? []).map((q) => ({ ...q, options: byQ[q.id] ?? [] })) as QuestionRow[];
    },
  });

  const addQuestion = useMutation({
    mutationFn: async () => {
      const order_index = (questionsQ.data?.length ?? 0) + 1;
      const { data, error } = await supabase
        .from("quiz_questions")
        .insert({
          quiz_id: quizId,
          prompt: "New question",
          type: "single",
          order_index,
        })
        .select("id")
        .single();
      if (error) throw error;
      // seed two empty options
      await supabase.from("quiz_options").insert([
        { question_id: data.id, text: "Option 1", order_index: 1, is_correct: true },
        { question_id: data.id, text: "Option 2", order_index: 2, is_correct: false },
      ]);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-quiz-questions", quizId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const delQuestion = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("quiz_questions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-quiz-questions", quizId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <Link
            to="/admin/quizzes"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back to quizzes
          </Link>
          {quizQ.data && (
            <Link
              to="/quizzes/$quizId"
              params={{ quizId }}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Open student view →
            </Link>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-10">
        {quizQ.data && (
          <>
            <h1 className="font-display text-3xl font-semibold text-foreground">
              {quizQ.data.title}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              <Badge variant={quizQ.data.status === "published" ? "default" : "secondary"}>
                {quizQ.data.status}
              </Badge>{" "}
              · Pass {quizQ.data.passing_pct}% ·{" "}
              {quizQ.data.time_limit_minutes
                ? `${quizQ.data.time_limit_minutes} min`
                : "no time limit"}
            </p>
          </>
        )}

        <div className="mt-8 space-y-5">
          {(questionsQ.data ?? []).map((q, idx) => (
            <QuestionCard
              key={q.id}
              index={idx + 1}
              question={q}
              onDelete={() => {
                if (confirm("Delete question?")) delQuestion.mutate(q.id);
              }}
            />
          ))}
          {(questionsQ.data ?? []).length === 0 && (
            <p className="rounded-xl border border-dashed border-border bg-surface p-6 text-sm text-muted-foreground">
              No questions yet.
            </p>
          )}
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <Button onClick={() => addQuestion.mutate()}>
            <Plus className="mr-2 h-4 w-4" /> Add question
          </Button>
          <Button variant="outline" onClick={() => setBulkOpen(true)}>
            <Sparkles className="mr-2 h-4 w-4" /> Bulk import
          </Button>
        </div>
      </main>

      <BulkImportDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        quizId={quizId}
        onImported={() => qc.invalidateQueries({ queryKey: ["admin-quiz-questions", quizId] })}
      />
    </div>
  );
}

function QuestionCard({
  index,
  question,
  onDelete,
}: {
  index: number;
  question: QuestionRow;
  onDelete: () => void;
}) {
  const qc = useQueryClient();
  const [prompt, setPrompt] = useState(question.prompt);
  const [explanation, setExplanation] = useState(question.explanation ?? "");
  const [type, setType] = useState<QuestionType>(question.type);
  const [points, setPoints] = useState<string>(String(question.points));
  const [options, setOptions] = useState<OptionRow[]>(question.options);
  const [savingQ, setSavingQ] = useState(false);

  useEffect(() => {
    setPrompt(question.prompt);
    setExplanation(question.explanation ?? "");
    setType(question.type);
    setPoints(String(question.points));
    setOptions(question.options);
  }, [question]);

  const saveQuestion = async () => {
    setSavingQ(true);
    try {
      const { error } = await supabase
        .from("quiz_questions")
        .update({
          prompt: prompt.trim(),
          explanation: explanation.trim() || null,
          type,
          points: Number(points) || 1,
        })
        .eq("id", question.id);
      if (error) throw error;

      // Persist all options
      for (const o of options) {
        if (o.id.startsWith("new-")) {
          const { error: e } = await supabase.from("quiz_options").insert({
            question_id: question.id,
            text: o.text,
            is_correct: o.is_correct,
            order_index: o.order_index,
          });
          if (e) throw e;
        } else {
          const { error: e } = await supabase
            .from("quiz_options")
            .update({
              text: o.text,
              is_correct: o.is_correct,
              order_index: o.order_index,
            })
            .eq("id", o.id);
          if (e) throw e;
        }
      }
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["admin-quiz-questions", question.quiz_id] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSavingQ(false);
    }
  };

  const addOption = () => {
    setOptions((prev) => [
      ...prev,
      {
        id: `new-${Math.random().toString(36).slice(2)}`,
        question_id: question.id,
        text: `Option ${prev.length + 1}`,
        is_correct: false,
        order_index: prev.length + 1,
      },
    ]);
  };

  const removeOption = async (o: OptionRow) => {
    if (!o.id.startsWith("new-")) {
      const { error } = await supabase.from("quiz_options").delete().eq("id", o.id);
      if (error) return toast.error(error.message);
    }
    setOptions((prev) => prev.filter((p) => p.id !== o.id));
  };

  const toggleCorrect = (o: OptionRow) => {
    setOptions((prev) =>
      prev.map((p) => {
        if (type === "single" || type === "true_false") {
          return { ...p, is_correct: p.id === o.id };
        }
        return p.id === o.id ? { ...p, is_correct: !p.is_correct } : p;
      }),
    );
  };

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold text-foreground">Question {index}</h3>
        <Button variant="outline" size="sm" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="mt-4 grid gap-4">
        <div>
          <Label>Prompt</Label>
          <Textarea rows={2} value={prompt} onChange={(e) => setPrompt(e.target.value)} />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as QuestionType)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single">Single choice</SelectItem>
                <SelectItem value="multiple">Multiple choice</SelectItem>
                <SelectItem value="true_false">True / False</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Points</Label>
            <Input
              type="number"
              min={0}
              step="0.5"
              value={points}
              onChange={(e) => setPoints(e.target.value)}
            />
          </div>
        </div>

        <div>
          <Label>Answer choices · click ✓ to mark correct</Label>
          <div className="mt-2 space-y-2">
            {options.map((o) => (
              <div key={o.id} className="flex items-center gap-2">
                <Button
                  type="button"
                  variant={o.is_correct ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleCorrect(o)}
                  title={o.is_correct ? "Correct" : "Mark correct"}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </Button>
                <Input
                  value={o.text}
                  onChange={(e) =>
                    setOptions((prev) =>
                      prev.map((p) => (p.id === o.id ? { ...p, text: e.target.value } : p)),
                    )
                  }
                />
                <Button variant="outline" size="sm" onClick={() => removeOption(o)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addOption}>
              <Plus className="mr-2 h-3.5 w-3.5" /> Add choice
            </Button>
          </div>
        </div>

        <div>
          <Label>Explanation (shown after submission)</Label>
          <Textarea rows={2} value={explanation} onChange={(e) => setExplanation(e.target.value)} />
        </div>

        <div>
          <Button onClick={saveQuestion} disabled={savingQ}>
            <Save className="mr-2 h-4 w-4" /> {savingQ ? "Saving…" : "Save question"}
          </Button>
        </div>
      </div>
    </div>
  );
}
