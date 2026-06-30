import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, FileStack, Pencil, Plus, Trash2, Upload } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/admin/papers")({
  head: () => ({ meta: [{ title: "Question Papers · Admin · BCA Gurukul" }] }),
  component: AdminPapersPage,
});

type PaperRow = {
  id: string;
  subject_id: string;
  title: string;
  year: number;
  exam_type: string;
  paper_number: string | null;
  description: string | null;
  file_path: string | null;
  file_bucket: string | null;
  file_mime: string | null;
  file_size_bytes: number | null;
  status: string;
};

function AdminPapersPage() {
  const qc = useQueryClient();
  const [courseId, setCourseId] = useState("");
  const [semesterId, setSemesterId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PaperRow | null>(null);

  const coursesQuery = useQuery({
    queryKey: ["admin", "papers", "courses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("id, title").order("title");
      if (error) throw error;
      return data ?? [];
    },
  });
  const semestersQuery = useQuery({
    queryKey: ["admin", "papers", "semesters", courseId],
    enabled: !!courseId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("semesters").select("id, number, title").eq("course_id", courseId).order("number");
      if (error) throw error;
      return data ?? [];
    },
  });
  const subjectsQuery = useQuery({
    queryKey: ["admin", "papers", "subjects", semesterId],
    enabled: !!semesterId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subjects").select("id, code, title").eq("semester_id", semesterId).order("title");
      if (error) throw error;
      return data ?? [];
    },
  });
  const papersQuery = useQuery({
    queryKey: ["admin", "papers", "list", subjectId],
    enabled: !!subjectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("papers").select("*").eq("subject_id", subjectId)
        .order("year", { ascending: false }).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (p: PaperRow) => {
      if (p.file_path) await supabase.storage.from(p.file_bucket ?? "papers").remove([p.file_path]);
      const { error } = await supabase.from("papers").delete().eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Paper deleted");
      qc.invalidateQueries({ queryKey: ["admin", "papers", "list", subjectId] });
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
          <FileStack className="h-6 w-6 text-primary" />
          <h1 className="font-display text-3xl font-semibold text-foreground">Previous-year question papers</h1>
        </div>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Curate past exam papers per subject so students can practice with real questions.
        </p>

        <section className="mt-8 grid gap-4 rounded-2xl border border-border bg-surface p-5 sm:grid-cols-3">
          <Picker label="Course" value={courseId}
            onChange={(v) => { setCourseId(v); setSemesterId(""); setSubjectId(""); }}
            options={(coursesQuery.data ?? []).map((c) => ({ value: c.id, label: c.title }))} />
          <Picker label="Semester" value={semesterId} disabled={!courseId}
            onChange={(v) => { setSemesterId(v); setSubjectId(""); }}
            options={(semestersQuery.data ?? []).map((s) => ({ value: s.id, label: `S${s.number} · ${s.title}` }))} />
          <Picker label="Subject" value={subjectId} disabled={!semesterId}
            onChange={setSubjectId}
            options={(subjectsQuery.data ?? []).map((s) => ({ value: s.id, label: `${s.code} · ${s.title}` }))} />
        </section>

        {subjectId && (
          <section className="mt-8">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold text-foreground">Papers for this subject</h2>
              <Button onClick={() => { setEditing(null); setOpen(true); }}>
                <Plus className="mr-2 h-4 w-4" /> New paper
              </Button>
            </div>

            <div className="mt-4 space-y-3">
              {(papersQuery.data ?? []).length === 0 && (
                <p className="rounded-xl border border-dashed border-border bg-surface p-6 text-sm text-muted-foreground">
                  No papers yet for this subject.
                </p>
              )}
              {(papersQuery.data ?? []).map((p) => (
                <div key={p.id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border bg-surface p-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-base font-semibold text-foreground">{p.title}</h3>
                      <Badge>{p.year}</Badge>
                      <Badge variant="outline">{p.exam_type.replace("_", " ")}</Badge>
                      {p.paper_number && <Badge variant="outline">#{p.paper_number}</Badge>}
                      <Badge variant={p.status === "published" ? "default" : "secondary"}>{p.status}</Badge>
                      {p.file_path && <Badge variant="outline">PDF</Badge>}
                    </div>
                    {p.description && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{p.description}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => { setEditing(p); setOpen(true); }}>
                      <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
                    </Button>
                    <Button variant="outline" size="sm"
                      onClick={() => { if (confirm(`Delete "${p.title}"?`)) deleteMutation.mutate(p); }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      <PaperDialog
        open={open} onOpenChange={setOpen} subjectId={subjectId} editing={editing}
        onSaved={() => qc.invalidateQueries({ queryKey: ["admin", "papers", "list", subjectId] })}
      />
    </div>
  );
}

function Picker({
  label, value, onChange, options, disabled,
}: {
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

function PaperDialog({
  open, onOpenChange, subjectId, editing, onSaved,
}: {
  open: boolean; onOpenChange: (v: boolean) => void; subjectId: string;
  editing: PaperRow | null; onSaved: () => void;
}) {
  const [title, setTitle] = useState("");
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [examType, setExamType] = useState("end_sem");
  const [paperNumber, setPaperNumber] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("draft");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(editing?.title ?? "");
      setYear(editing?.year ?? new Date().getFullYear());
      setExamType(editing?.exam_type ?? "end_sem");
      setPaperNumber(editing?.paper_number ?? "");
      setDescription(editing?.description ?? "");
      setStatus(editing?.status ?? "draft");
      setFile(null);
    }
  }, [open, editing]);

  const save = async () => {
    if (!subjectId) return toast.error("Pick a subject first");
    if (!title.trim()) return toast.error("Title required");
    setBusy(true);
    try {
      let file_path = editing?.file_path ?? null;
      let file_mime = editing?.file_mime ?? null;
      let file_size_bytes = editing?.file_size_bytes ?? null;
      if (file) {
        const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${subjectId}/${year}/${Date.now()}-${safe}`;
        const { error: upErr } = await supabase.storage.from("papers").upload(path, file, { contentType: file.type });
        if (upErr) throw upErr;
        if (editing?.file_path) await supabase.storage.from(editing.file_bucket ?? "papers").remove([editing.file_path]);
        file_path = path; file_mime = file.type; file_size_bytes = file.size;
      }
      const payload = {
        subject_id: subjectId,
        title: title.trim(),
        year,
        exam_type: examType,
        paper_number: paperNumber.trim() || null,
        description: description.trim() || null,
        status,
        file_path,
        file_bucket: "papers",
        file_mime,
        file_size_bytes,
      };
      if (editing) {
        const { error } = await supabase.from("papers").update(payload).eq("id", editing.id);
        if (error) throw error;
        toast.success("Paper updated");
      } else {
        const { data: u } = await supabase.auth.getUser();
        const { error } = await supabase.from("papers").insert({ ...payload, created_by: u.user?.id });
        if (error) throw error;
        toast.success("Paper added");
      }
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{editing ? "Edit paper" : "New paper"}</DialogTitle></DialogHeader>
        <div className="grid gap-4">
          <div><Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. End Semester Examination" />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div><Label>Year</Label>
              <Input type="number" min={1990} max={2100} value={year} onChange={(e) => setYear(Number(e.target.value))} />
            </div>
            <div><Label>Exam type</Label>
              <Select value={examType} onValueChange={setExamType}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="end_sem">End semester</SelectItem>
                  <SelectItem value="mid_sem">Mid semester</SelectItem>
                  <SelectItem value="supplementary">Supplementary</SelectItem>
                  <SelectItem value="model">Model paper</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Paper #</Label>
              <Input value={paperNumber} onChange={(e) => setPaperNumber(e.target.value)} placeholder="optional" />
            </div>
          </div>
          <div><Label>Description</Label>
            <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div><Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>PDF {editing?.file_path && <span className="text-xs text-muted-foreground">(replaces existing)</span>}</Label>
            <Input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            {editing?.file_path && !file && (
              <p className="mt-1 text-xs text-muted-foreground">Current: {editing.file_path.split("/").pop()}</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={busy}>
            <Upload className="mr-2 h-4 w-4" /> {busy ? "Saving…" : "Save paper"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
