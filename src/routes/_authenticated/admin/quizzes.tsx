import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, FlaskConical, Plus, Pencil, Trash2, ExternalLink, Wrench, Sparkles } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/admin/quizzes")({
  head: () => ({ meta: [{ title: "Quizzes · Admin · BCA Gurukul" }] }),
  component: AdminQuizzesPage,
});

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
}

type QuizRow = {
  id: string;
  unit_id: string;
  title: string;
  slug: string;
  description: string | null;
  instructions: string | null;
  time_limit_minutes: number | null;
  passing_pct: number;
  max_attempts: number;
  shuffle_questions: boolean;
  shuffle_options: boolean;
  status: string;
};

function AdminQuizzesPage() {
  const qc = useQueryClient();
  const [courseId, setCourseId] = useState("");
  const [semesterId, setSemesterId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<QuizRow | null>(null);

  const coursesQ = useQuery({
    queryKey: ["admin-quizzes-courses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("id, title").order("title");
      if (error) throw error;
      return data ?? [];
    },
  });
  const semestersQ = useQuery({
    queryKey: ["admin-quizzes-sem", courseId],
    enabled: !!courseId,
    queryFn: async () => {
      const { data, error } = await supabase.from("semesters").select("id, number, title").eq("course_id", courseId).order("number");
      if (error) throw error;
      return data ?? [];
    },
  });
  const subjectsQ = useQuery({
    queryKey: ["admin-quizzes-sub", semesterId],
    enabled: !!semesterId,
    queryFn: async () => {
      const { data, error } = await supabase.from("subjects").select("id, code, title").eq("semester_id", semesterId).order("title");
      if (error) throw error;
      return data ?? [];
    },
  });
  const unitsQ = useQuery({
    queryKey: ["admin-quizzes-units", subjectId],
    enabled: !!subjectId,
    queryFn: async () => {
      const { data, error } = await supabase.from("units").select("id, number, title").eq("subject_id", subjectId).order("number");
      if (error) throw error;
      return data ?? [];
    },
  });
  const quizzesQ = useQuery({
    queryKey: ["admin-quizzes-list", unitId],
    enabled: !!unitId,
    queryFn: async () => {
      const { data, error } = await supabase.from("quizzes").select("*").eq("unit_id", unitId).order("order_index").order("created_at");
      if (error) throw error;
      return (data ?? []) as QuizRow[];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("quizzes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Quiz deleted");
      qc.invalidateQueries({ queryKey: ["admin-quizzes-list", unitId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link to="/admin" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to admin
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex items-center gap-3">
          <FlaskConical className="h-6 w-6 text-primary" />
          <h1 className="font-display text-3xl font-semibold text-foreground">Quizzes & MCQ banks</h1>
        </div>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Pick a unit, create a quiz, then add questions and answer choices.
        </p>

        <section className="mt-8 grid gap-4 rounded-2xl border border-border bg-surface p-5 sm:grid-cols-4">
          <Picker label="Course" value={courseId} onChange={(v) => { setCourseId(v); setSemesterId(""); setSubjectId(""); setUnitId(""); }}
            options={(coursesQ.data ?? []).map((c) => ({ value: c.id, label: c.title }))} />
          <Picker label="Semester" value={semesterId} disabled={!courseId} onChange={(v) => { setSemesterId(v); setSubjectId(""); setUnitId(""); }}
            options={(semestersQ.data ?? []).map((s) => ({ value: s.id, label: `S${s.number} · ${s.title}` }))} />
          <Picker label="Subject" value={subjectId} disabled={!semesterId} onChange={(v) => { setSubjectId(v); setUnitId(""); }}
            options={(subjectsQ.data ?? []).map((s) => ({ value: s.id, label: `${s.code} · ${s.title}` }))} />
          <Picker label="Unit" value={unitId} disabled={!subjectId} onChange={setUnitId}
            options={(unitsQ.data ?? []).map((u) => ({ value: u.id, label: `U${u.number} · ${u.title}` }))} />
        </section>

        {unitId && (
          <section className="mt-8">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold text-foreground">Quizzes in this unit</h2>
              <Button onClick={() => { setEditing(null); setOpen(true); }}>
                <Plus className="mr-2 h-4 w-4" /> New quiz
              </Button>
            </div>
            <div className="mt-4 space-y-3">
              {(quizzesQ.data ?? []).length === 0 && (
                <EmptyState
                  icon={FlaskConical}
                  tone="success"
                  title="No quizzes for this unit yet"
                  description="Add 8–10 conceptual MCQs to lock in the unit. Students get instant scoring with per-question explanations, and you'll see attempt analytics roll in on the dashboard."
                  tip="Mix one easy recall question for every two application questions to keep momentum high."
                  primaryAction={{
                    label: "Create the first quiz",
                    icon: Sparkles,
                    onClick: () => { setEditing(null); setOpen(true); },
                  }}
                />
              )}
              {(quizzesQ.data ?? []).map((q) => (
                <div key={q.id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border bg-surface p-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-display text-base font-semibold text-foreground">{q.title}</h3>
                      <Badge variant={q.status === "published" ? "default" : "secondary"}>{q.status}</Badge>
                      <Badge variant="outline">Pass {q.passing_pct}%</Badge>
                      {q.time_limit_minutes && <Badge variant="outline">{q.time_limit_minutes}m</Badge>}
                    </div>
                    {q.description && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{q.description}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Link to="/admin/quizzes/$quizId" params={{ quizId: q.id }}>
                      <Button variant="outline" size="sm">
                        <Wrench className="mr-2 h-3.5 w-3.5" /> Questions
                      </Button>
                    </Link>
                    <Link to="/quizzes/$quizId" params={{ quizId: q.id }}>
                      <Button variant="outline" size="sm">
                        <ExternalLink className="mr-2 h-3.5 w-3.5" /> Preview
                      </Button>
                    </Link>
                    <Button variant="outline" size="sm" onClick={() => { setEditing(q); setOpen(true); }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => { if (confirm(`Delete "${q.title}"?`)) del.mutate(q.id); }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      <QuizDialog
        open={open}
        onOpenChange={setOpen}
        unitId={unitId}
        editing={editing}
        onSaved={() => qc.invalidateQueries({ queryKey: ["admin-quizzes-list", unitId] })}
      />
    </div>
  );
}

function Picker({ label, value, onChange, options, disabled }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; disabled?: boolean;
}) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="mt-1"><SelectValue placeholder={`Select ${label.toLowerCase()}`} /></SelectTrigger>
        <SelectContent>
          {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function QuizDialog({ open, onOpenChange, unitId, editing, onSaved }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  unitId: string; editing: QuizRow | null; onSaved: () => void;
}) {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [timeLimit, setTimeLimit] = useState<string>("");
  const [passingPct, setPassingPct] = useState<string>("50");
  const [maxAttempts, setMaxAttempts] = useState<string>("0");
  const [status, setStatus] = useState<string>("draft");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(editing?.title ?? "");
      setSlug(editing?.slug ?? "");
      setDescription(editing?.description ?? "");
      setInstructions(editing?.instructions ?? "");
      setTimeLimit(editing?.time_limit_minutes?.toString() ?? "");
      setPassingPct(editing?.passing_pct?.toString() ?? "50");
      setMaxAttempts(editing?.max_attempts?.toString() ?? "0");
      setStatus(editing?.status ?? "draft");
    }
  }, [open, editing]);

  const save = async () => {
    if (!unitId) return toast.error("Pick a unit first");
    if (!title.trim()) return toast.error("Title required");
    const finalSlug = (slug.trim() || slugify(title)).slice(0, 80);
    setSaving(true);
    try {
      const payload = {
        unit_id: unitId,
        title: title.trim(),
        slug: finalSlug,
        description: description.trim() || null,
        instructions: instructions.trim() || null,
        time_limit_minutes: timeLimit ? Number(timeLimit) : null,
        passing_pct: Number(passingPct) || 0,
        max_attempts: Number(maxAttempts) || 0,
        status: status as "draft" | "published" | "archived",
      };
      if (editing) {
        const { error } = await supabase.from("quizzes").update(payload).eq("id", editing.id);
        if (error) throw error;
        toast.success("Quiz updated");
      } else {
        const { data: u } = await supabase.auth.getUser();
        const { error } = await supabase.from("quizzes").insert({ ...payload, created_by: u.user?.id });
        if (error) throw error;
        toast.success("Quiz created");
      }
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{editing ? "Edit quiz" : "New quiz"}</DialogTitle></DialogHeader>
        <div className="grid gap-4">
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => { setTitle(e.target.value); if (!editing && !slug) setSlug(slugify(e.target.value)); }} />
          </div>
          <div>
            <Label>Slug</Label>
            <Input value={slug} onChange={(e) => setSlug(e.target.value)} />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div>
            <Label>Instructions (shown before start)</Label>
            <Textarea rows={3} value={instructions} onChange={(e) => setInstructions(e.target.value)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label>Time limit (min, blank = none)</Label>
              <Input type="number" min={0} value={timeLimit} onChange={(e) => setTimeLimit(e.target.value)} />
            </div>
            <div>
              <Label>Passing %</Label>
              <Input type="number" min={0} max={100} value={passingPct} onChange={(e) => setPassingPct(e.target.value)} />
            </div>
            <div>
              <Label>Max attempts (0 = ∞)</Label>
              <Input type="number" min={0} value={maxAttempts} onChange={(e) => setMaxAttempts(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save quiz"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
