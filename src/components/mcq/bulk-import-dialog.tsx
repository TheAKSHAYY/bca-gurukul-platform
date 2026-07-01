import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Sparkles, Upload } from "lucide-react";

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { parseMcqBulk, type ParsedQuestion } from "@/lib/mcq/parser";

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

export function BulkImportDialog({
  open,
  onOpenChange,
  quizId,
  onImported,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  quizId: string;
  onImported: () => void;
}) {
  const [text, setText] = useState("");
  const [importing, setImporting] = useState(false);

  const parsed = useMemo(() => (text.trim() ? parseMcqBulk(text) : []), [text]);
  const validCount = parsed.filter((p) => p.errors.length === 0).length;
  const invalidCount = parsed.length - validCount;

  const runImport = async () => {
    const valid = parsed.filter((p) => p.errors.length === 0);
    if (valid.length === 0) {
      toast.error("No valid questions to import");
      return;
    }
    setImporting(true);
    let ok = 0;
    let fail = 0;
    for (const q of valid) {
      const { error } = await supabase.rpc("admin_create_mcq", {
        _quiz_id: quizId,
        _prompt: q.prompt,
        _options: q.options as never,
        _explanation: q.explanation ?? null,
        _difficulty: q.difficulty ?? "medium",
        _points: 1,
        _negative_marks: 0,
        _tags: q.tags ?? [],
        _year: q.year ?? null,
        _exam_name: q.exam_name ?? null,
      });
      if (error) { fail += 1; console.error(error); } else ok += 1;
    }
    setImporting(false);
    if (ok > 0) toast.success(`Imported ${ok} question${ok === 1 ? "" : "s"}${fail ? ` · ${fail} failed` : ""}`);
    else toast.error(`Import failed for all ${fail} questions`);
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
            Paste many MCQs at once. Separate each question with a blank line. Mark the correct
            option with a <code className="rounded bg-muted px-1"> *</code> at the end.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Paste questions</label>
              <Button type="button" variant="ghost" size="sm" onClick={() => setText(EXAMPLE)}>
                Load example
              </Button>
            </div>
            <Textarea
              className="min-h-[420px] font-mono text-xs"
              placeholder={EXAMPLE}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Optional meta on their own lines: <code>E:</code> explanation, <code>D:</code>{" "}
              easy/medium/hard, <code>T:</code> comma tags, <code>Y:</code> year, <code>X:</code>{" "}
              exam name.
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
                  Preview will appear here as you paste.
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
          <Button onClick={runImport} disabled={importing || validCount === 0}>
            <Upload className="mr-2 h-4 w-4" />
            {importing ? "Importing…" : `Import ${validCount} question${validCount === 1 ? "" : "s"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
