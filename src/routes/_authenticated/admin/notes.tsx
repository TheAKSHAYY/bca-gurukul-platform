import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, FileText, Plus, Trash2, Upload, Pencil, ExternalLink, FilePlus } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";

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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/admin/notes")({
  head: () => ({ meta: [{ title: "Notes · Admin · BCA Gurukul" }] }),
  component: AdminNotesPage,
});

type Status = string;
type Visibility = string;

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function AdminNotesPage() {
  const qc = useQueryClient();
  const [courseId, setCourseId] = useState<string>("");
  const [semesterId, setSemesterId] = useState<string>("");
  const [subjectId, setSubjectId] = useState<string>("");
  const [unitId, setUnitId] = useState<string>("");
  const [editing, setEditing] = useState<NoteRow | null>(null);
  const [open, setOpen] = useState(false);

  const coursesQuery = useQuery({
    queryKey: ["admin", "notes", "courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, title")
        .order("title");
      if (error) throw error;
      return data ?? [];
    },
  });

  const semestersQuery = useQuery({
    queryKey: ["admin", "notes", "semesters", courseId],
    enabled: !!courseId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("semesters")
        .select("id, number, title")
        .eq("course_id", courseId)
        .order("number");
      if (error) throw error;
      return data ?? [];
    },
  });

  const subjectsQuery = useQuery({
    queryKey: ["admin", "notes", "subjects", semesterId],
    enabled: !!semesterId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subjects")
        .select("id, code, title")
        .eq("semester_id", semesterId)
        .order("title");
      if (error) throw error;
      return data ?? [];
    },
  });

  const unitsQuery = useQuery({
    queryKey: ["admin", "notes", "units", subjectId],
    enabled: !!subjectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("units")
        .select("id, number, title")
        .eq("subject_id", subjectId)
        .order("number");
      if (error) throw error;
      return data ?? [];
    },
  });

  const notesQuery = useQuery({
    queryKey: ["admin", "notes", "list", unitId],
    enabled: !!unitId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .eq("unit_id", unitId)
        .order("sort_order")
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (note: NoteRow) => {
      if (note.file_path) {
        await supabase.storage.from(note.file_bucket ?? "notes").remove([note.file_path]);
      }
      const { error } = await supabase.from("notes").delete().eq("id", note.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Note deleted");
      qc.invalidateQueries({ queryKey: ["admin", "notes", "list", unitId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openCreate = () => {
    setEditing(null);
    setOpen(true);
  };

  const openEdit = (note: NoteRow) => {
    setEditing(note);
    setOpen(true);
  };

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
          <FileText className="h-6 w-6 text-primary" />
          <h1 className="font-display text-3xl font-semibold text-foreground">Notes & study materials</h1>
        </div>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Pick a unit, then upload PDFs and author rich notes for students.
        </p>

        <section className="mt-8 grid gap-4 rounded-2xl border border-border bg-surface p-5 sm:grid-cols-4">
          <Picker label="Course" value={courseId} onChange={(v) => { setCourseId(v); setSemesterId(""); setSubjectId(""); setUnitId(""); }}
            options={(coursesQuery.data ?? []).map((c) => ({ value: c.id, label: c.title }))} />
          <Picker label="Semester" value={semesterId} onChange={(v) => { setSemesterId(v); setSubjectId(""); setUnitId(""); }}
            disabled={!courseId}
            options={(semestersQuery.data ?? []).map((s) => ({ value: s.id, label: `S${s.number} · ${s.title}` }))} />
          <Picker label="Subject" value={subjectId} onChange={(v) => { setSubjectId(v); setUnitId(""); }}
            disabled={!semesterId}
            options={(subjectsQuery.data ?? []).map((s) => ({ value: s.id, label: `${s.code} · ${s.title}` }))} />
          <Picker label="Unit" value={unitId} onChange={setUnitId}
            disabled={!subjectId}
            options={(unitsQuery.data ?? []).map((u) => ({ value: u.id, label: `U${u.number} · ${u.title}` }))} />
        </section>

        {unitId && (
          <section className="mt-8">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold text-foreground">Notes in this unit</h2>
              <Button onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" /> New note
              </Button>
            </div>

            <div className="mt-4 space-y-3">
              {(notesQuery.data ?? []).length === 0 && (
                <EmptyState
                  icon={FileText}
                  tone="primary"
                  title="No notes in this unit yet"
                  description="Notes are the backbone students rely on most. Drop in a PDF or write a fresh one — students will see it on the public unit page the moment you publish."
                  tip="Keep titles outcome-focused, e.g. “Normalization — 1NF to 3NF with examples.”"
                  primaryAction={{
                    label: "Create the first note",
                    icon: FilePlus,
                    onClick: openCreate,
                  }}
                />
              )}
              {(notesQuery.data ?? []).map((n) => (
                <div key={n.id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border bg-surface p-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-display text-base font-semibold text-foreground">{n.title}</h3>
                      <Badge variant={n.status === "published" ? "default" : "secondary"}>{n.status}</Badge>
                      <Badge variant="outline">{n.visibility}</Badge>
                      {n.file_path && <Badge variant="outline">PDF</Badge>}
                    </div>
                    {n.summary && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{n.summary}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Link to="/notes/$noteId" params={{ noteId: n.id }}>
                      <Button variant="outline" size="sm">
                        <ExternalLink className="mr-2 h-3.5 w-3.5" /> View
                      </Button>
                    </Link>
                    <Button variant="outline" size="sm" onClick={() => openEdit(n)}>
                      <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (confirm(`Delete "${n.title}"?`)) deleteMutation.mutate(n);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      <NoteDialog
        open={open}
        onOpenChange={setOpen}
        unitId={unitId}
        editing={editing}
        onSaved={() => qc.invalidateQueries({ queryKey: ["admin", "notes", "list", unitId] })}
      />
    </div>
  );
}

type NoteRow = {
  id: string;
  unit_id: string;
  title: string;
  slug: string;
  summary: string | null;
  body: string | null;
  file_path: string | null;
  file_bucket: string | null;
  file_size_bytes: number | null;
  file_mime: string | null;
  status: Status;
  visibility: Visibility;
  sort_order: number;
};

function Picker({
  label, value, onChange, options, disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
}) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="mt-1">
          <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function NoteDialog({
  open, onOpenChange, unitId, editing, onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  unitId: string;
  editing: NoteRow | null;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [summary, setSummary] = useState("");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<Status>("draft");
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useMemo(() => {
    if (open) {
      setTitle(editing?.title ?? "");
      setSlug(editing?.slug ?? "");
      setSummary(editing?.summary ?? "");
      setBody(editing?.body ?? "");
      setStatus(editing?.status ?? "draft");
      setVisibility(editing?.visibility ?? "public");
      setFile(null);
    }
  }, [open, editing]);

  const save = async () => {
    if (!unitId) return toast.error("Pick a unit first");
    if (!title.trim()) return toast.error("Title required");
    const finalSlug = (slug.trim() || slugify(title)).slice(0, 80);
    if (!finalSlug) return toast.error("Slug required");

    setUploading(true);
    try {
      let file_path = editing?.file_path ?? null;
      let file_mime = editing?.file_mime ?? null;
      let file_size_bytes = editing?.file_size_bytes ?? null;
      if (file) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${unitId}/${Date.now()}-${safeName}`;
        const { error: upErr } = await supabase.storage
          .from("notes")
          .upload(path, file, { contentType: file.type, upsert: false });
        if (upErr) throw upErr;
        if (editing?.file_path) {
          await supabase.storage.from(editing.file_bucket ?? "notes").remove([editing.file_path]);
        }
        file_path = path;
        file_mime = file.type;
        file_size_bytes = file.size;
      }

      const payload = {
        unit_id: unitId,
        title: title.trim(),
        slug: finalSlug,
        summary: summary.trim() || null,
        body: body.trim() || null,
        status,
        visibility,
        file_path,
        file_bucket: "notes",
        file_mime,
        file_size_bytes,
      };

      if (editing) {
        const { error } = await supabase.from("notes").update(payload).eq("id", editing.id);
        if (error) throw error;
        toast.success("Note updated");
      } else {
        const { data: u } = await supabase.auth.getUser();
        const { error } = await supabase.from("notes").insert({ ...payload, created_by: u.user?.id });
        if (error) throw error;
        toast.success("Note created");
      }
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit note" : "New note"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => {
              setTitle(e.target.value);
              if (!editing && !slug) setSlug(slugify(e.target.value));
            }} />
          </div>
          <div>
            <Label>Slug</Label>
            <Input value={slug} onChange={(e) => setSlug(e.target.value)} />
          </div>
          <div>
            <Label>Summary</Label>
            <Textarea rows={2} value={summary} onChange={(e) => setSummary(e.target.value)} />
          </div>
          <div>
            <Label>Body (Markdown / plain text)</Label>
            <Textarea rows={6} value={body} onChange={(e) => setBody(e.target.value)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Visibility</Label>
              <Select value={visibility} onValueChange={(v) => setVisibility(v as Visibility)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="authenticated">Signed-in only</SelectItem>
                  <SelectItem value="admin">Admin only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Attach PDF {editing?.file_path && <span className="text-xs text-muted-foreground">(replaces existing)</span>}</Label>
            <Input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            {editing?.file_path && !file && (
              <p className="mt-1 text-xs text-muted-foreground">Current: {editing.file_path.split("/").pop()}</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={uploading}>
            <Upload className="mr-2 h-4 w-4" />
            {uploading ? "Saving…" : "Save note"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

