import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Sparkles, Upload, FileUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { parseMcqBulk } from "@/lib/mcq/parser";

const EXAMPLE = `Q: What does HTML stand for?
A) Hyper Text Markup Language *
B) High Tech Modern Language
C) Home Tool Markup Language
D) Hyperlink and Text Management Language
E: HTML is the standard markup language for web pages.
D: easy
T: web, html

Q: Which of these are JavaScript frameworks? (select all that apply)
A) React *
B) Django
C) Vue *
D) Laravel
E: React and Vue are JS frameworks; Django and Laravel are backend (Python / PHP).
D: medium
T: js, frameworks`;

const JSON_EXAMPLE = `[
  {
    "prompt": "What does HTML stand for?",
    "options": [
      { "text": "Hyper Text Markup Language", "is_correct": true },
      { "text": "High Tech Modern Language", "is_correct": false },
      { "text": "Home Tool Markup Language", "is_correct": false }
    ],
    "explanation": "HTML is the standard markup language for web pages.",
    "difficulty": "easy",
    "tags": ["web", "html"]
  },
  {
    "question": "Capital of India?",
    "choices": ["Mumbai", "New Delhi", "Kolkata", "Chennai"],
    "answer": "B"
  }
]`;

export function BulkImportDialog({
  open,
  onOpenChange,
  quizId,
  onImported,
  showQuizPicker = false,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  quizId?: string;
  onImported: () => void;
  showQuizPicker?: boolean;
}) {
  const [text, setText] = useState("");
  const [importing, setImporting] = useState(false);
  const [selectedQuizId, setSelectedQuizId] = useState<string>(quizId ?? "");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) setSelectedQuizId(quizId ?? "");
  }, [open, quizId]);

  const quizzesQuery = useQuery({
    queryKey: ["bulk-import", "quizzes-picker"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quizzes")
        .select("id, title, status")
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return data ?? [];
    },
    enabled: open && showQuizPicker,
  });

  const parsed = useMemo(() => (text.trim() ? parseMcqBulk(text) : []), [text]);
  const validCount = parsed.filter((p) => p.errors.length === 0).length;
  const invalidCount = parsed.length - validCount;

  const handleFile = async (file: File) => {
    try {
      const content = await file.text();
      setText(content);
      toast.success(`Loaded ${file.name}`);
    } catch (e) {
      toast.error(`Could not read file: ${(e as Error).message}`);
    }
  };

  const runImport = async () => {
    const targetQuizId = quizId ?? selectedQuizId;
    if (!targetQuizId) {
      toast.error("Pick a quiz to import into");
      return;
    }
    const valid = parsed.filter((p) => p.errors.length === 0);
    if (valid.length === 0) {
      toast.error("No valid questions to import");
      return;
    }
    setImporting(true);
    let ok = 0;
    let fail = 0;
    let lastError: string | null = null;
    for (const q of valid) {
      const { error } = await supabase.rpc("admin_create_mcq", {
        _quiz_id: targetQuizId,
        _prompt: q.prompt,
        _options: q.options as never,
        _explanation: q.explanation ?? undefined,
        _difficulty: q.difficulty ?? "medium",
        _points: 1,
        _negative_marks: 0,
        _tags: q.tags ?? [],
        _year: q.year ?? undefined,
        _exam_name: q.exam_name ?? undefined,
      });
      if (error) {
        fail += 1;
        lastError = error.message || String(error);
        console.error("admin_create_mcq failed", error);
      } else ok += 1;
    }
    setImporting(false);
    if (ok > 0) toast.success(`Imported ${ok} question${ok === 1 ? "" : "s"}${fail ? ` · ${fail} failed` : ""}`);
    else toast.error(`Import failed: ${lastError ?? "unknown error"}`);
    if (ok > 0) {
      setText("");
      onImported();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> Bulk import questions
          </DialogTitle>
          <DialogDescription>
            Upload a <code className="rounded bg-muted px-1">.json</code>,{" "}
            <code className="rounded bg-muted px-1">.txt</code> or{" "}
            <code className="rounded bg-muted px-1">.csv</code> file, or paste questions directly.
            Mark correct options with <code className="rounded bg-muted px-1">*</code> (text) or{" "}
            <code className="rounded bg-muted px-1">is_correct: true</code> (JSON).
          </DialogDescription>
        </DialogHeader>

        {showQuizPicker && (
          <div className="mb-2">
            <Label>Target quiz</Label>
            <Select value={selectedQuizId} onValueChange={setSelectedQuizId}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder={quizzesQuery.isLoading ? "Loading…" : "Select a quiz"} />
              </SelectTrigger>
              <SelectContent>
                {(quizzesQuery.data ?? []).map((q) => (
                  <SelectItem key={q.id} value={q.id}>
                    {q.title} {q.status !== "published" && <span className="text-muted-foreground">· {q.status}</span>}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Paste or upload questions</label>
              <div className="flex gap-1">
                <input
                  ref={fileRef}
                  type="file"
                  accept=".json,.txt,.csv,application/json,text/plain,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                    e.target.value = "";
                  }}
                />
                <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                  <FileUp className="mr-1.5 h-3.5 w-3.5" /> Upload file
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setText(EXAMPLE)}>
                  Text example
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setText(JSON_EXAMPLE)}>
                  JSON example
                </Button>
              </div>
            </div>
            <Textarea
              className="min-h-[420px] font-mono text-xs"
              placeholder={EXAMPLE}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Text meta (own lines): <code>E:</code> explanation, <code>D:</code>{" "}
              easy/medium/hard, <code>T:</code> comma tags, <code>Y:</code> year, <code>X:</code>{" "}
              exam name. JSON also accepts <code>question</code>/<code>choices</code>/<code>answer</code>.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Preview</label>
              <div className="flex gap-2 text-xs">
                <Badge variant="default">{validCount} ready</Badge>
                {invalidCount > 0 && <Badge variant="destructive">{invalidCount} with errors</Badge>}
              </div>
            </div>
            <div className="max-h-[420px] space-y-2 overflow-y-auto rounded-lg border border-border bg-muted/30 p-3">
              {parsed.length === 0 && (
                <p className="p-6 text-center text-sm text-muted-foreground">
                  Preview appears here as you paste or upload.
                </p>
              )}
              {parsed.map((p, i) => (
                <div
                  key={i}
                  className={`rounded-md border bg-background p-3 text-sm ${
                    p.errors.length ? "border-destructive/50" : "border-border"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {p.errors.length ? (
                      <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                    ) : (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-foreground">
                        {i + 1}. {p.prompt || <em className="text-muted-foreground">no prompt</em>}
                      </div>
                      {p.options.length > 0 && (
                        <ul className="mt-1.5 space-y-0.5 text-xs">
                          {p.options.map((o, oi) => (
                            <li
                              key={oi}
                              className={o.is_correct ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground"}
                            >
                              {String.fromCharCode(65 + oi)}) {o.text} {o.is_correct && "✓"}
                            </li>
                          ))}
                        </ul>
                      )}
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {p.difficulty && <Badge variant="outline" className="text-[10px]">{p.difficulty}</Badge>}
                        {p.year && <Badge variant="outline" className="text-[10px]">{p.year}</Badge>}
                        {(p.tags ?? []).map((t) => (
                          <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
                        ))}
                      </div>
                      {p.errors.length > 0 && (
                        <ul className="mt-1.5 text-xs text-destructive">
                          {p.errors.map((e, ei) => <li key={ei}>· {e}</li>)}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={runImport} disabled={importing || validCount === 0 || (!quizId && !selectedQuizId)}>
            <Upload className="mr-2 h-4 w-4" />
            {importing ? "Importing…" : `Import ${validCount} question${validCount === 1 ? "" : "s"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
