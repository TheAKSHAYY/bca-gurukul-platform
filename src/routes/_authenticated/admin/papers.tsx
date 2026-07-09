import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  FileStack, Pencil, Plus, Trash2, Upload, Search, MoreHorizontal,
  CheckCircle2, XCircle, Archive,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/admin/ui/page-header";
import { StatusBadge } from "@/components/admin/ui/status-badge";
import { TableSkeleton } from "@/components/admin/ui/table-skeleton";
import { ConfirmDialog } from "@/components/admin/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
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
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/_authenticated/admin/papers")({
  head: () => ({ meta: [{ title: "Previous Papers · Admin · BCA Gurukul" }] }),
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
  created_at: string;
  updated_at: string;
};

type SubjectLite = { id: string; code: string; title: string };

const EXAM_TYPES = [
  { value: "all", label: "All exams" },
  { value: "end_sem", label: "End sem" },
  { value: "mid_sem", label: "Mid sem" },
  { value: "supplementary", label: "Supplementary" },
  { value: "model", label: "Model" },
  { value: "other", label: "Other" },
];

const STATUSES = [
  { value: "all", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
];

function AdminPapersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [subjectId, setSubjectId] = useState("all");
  const [examType, setExamType] = useState("all");
  const [status, setStatus] = useState("all");
  const [year, setYear] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PaperRow | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<PaperRow | null>(null);

  const subjectsQuery = useQuery<SubjectLite[]>({
    queryKey: ["admin", "papers", "subjects-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subjects").select("id, code, title").order("title");
      if (error) throw error;
      return data ?? [];
    },
  });

  const papersQuery = useQuery({
    queryKey: ["admin", "papers", "list", { subjectId, examType, status, year, search }],
    queryFn: async () => {
      let q = supabase.from("papers").select("*", { count: "exact" });
      if (subjectId !== "all") q = q.eq("subject_id", subjectId);
      if (examType !== "all") q = q.eq("exam_type", examType);
      if (status !== "all") q = q.eq("status", status);
      if (year !== "all") q = q.eq("year", Number(year));
      if (search.trim()) q = q.ilike("title", `%${search.trim()}%`);
      const { data, error, count } = await q
        .order("year", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return { items: (data ?? []) as PaperRow[], total: count ?? 0 };
    },
  });

  const items = papersQuery.data?.items ?? [];
  const total = papersQuery.data?.total ?? 0;
  const subjects = subjectsQuery.data ?? [];
  const subjectMap = useMemo(() => new Map(subjects.map((s) => [s.id, s])), [subjects]);
  const years = useMemo(() => {
    const set = new Set<number>();
    items.forEach((p) => set.add(p.year));
    return Array.from(set).sort((a, b) => b - a);
  }, [items]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin", "papers"] });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status: s }: { id: string; status: string }) => {
      const { error } = await supabase.from("papers").update({ status: s }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Updated"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (p: PaperRow) => {
      if (p.file_path) await supabase.storage.from(p.file_bucket ?? "papers").remove([p.file_path]);
      const { error } = await supabase.from("papers").delete().eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); setConfirmDelete(null); toast.success("Deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="Previous Papers"
        description="Curate past exam papers per subject — searchable across every course."
        actions={
          <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}>
            <Plus className="mr-1.5 h-4 w-4" /> New paper
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title…"
            className="h-9 pl-8"
          />
        </div>
        <Select value={subjectId} onValueChange={setSubjectId}>
          <SelectTrigger className="h-9 w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All subjects</SelectItem>
            {subjects.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.code} · {s.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={examType} onValueChange={setExamType}>
          <SelectTrigger className="h-9 w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            {EXAM_TYPES.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={year} onValueChange={setYear}>
          <SelectTrigger className="h-9 w-24"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All years</SelectItem>
            {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            {STATUSES.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="ml-auto text-xs text-muted-foreground">{total} papers</div>
      </div>

      {papersQuery.isLoading ? (
        <TableSkeleton rows={8} cols={5} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={FileStack}
          title={search || subjectId !== "all" || examType !== "all" || status !== "all" || year !== "all" ? "No matches" : "No previous papers yet"}
          description={
            search || subjectId !== "all" || examType !== "all" || status !== "all" || year !== "all"
              ? "Try clearing filters or adjusting your search."
              : "Upload past exam papers so students can practice with real questions."
          }
          primaryAction={{ label: "New paper", onClick: () => { setEditing(null); setOpen(true); }, icon: Plus }}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border/70 bg-surface">
          <table className="w-full">
            <thead className="border-b border-border/70 bg-surface-muted text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2.5">Title</th>
                <th className="px-3 py-2.5 hidden md:table-cell">Subject</th>
                <th className="px-3 py-2.5">Year</th>
                <th className="px-3 py-2.5 hidden md:table-cell">Type</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5 hidden lg:table-cell">Updated</th>
                <th className="w-10 px-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {items.map((p) => {
                const subj = subjectMap.get(p.subject_id);
                return (
                  <tr key={p.id} className="text-sm hover:bg-surface-muted/40">
                    <td className="px-3 py-2.5">
                      <button type="button" onClick={() => { setEditing(p); setOpen(true); }} className="text-left">
                        <span className="block font-medium text-foreground hover:text-primary">{p.title}</span>
                        {p.paper_number && (
                          <span className="text-xs text-muted-foreground">#{p.paper_number}</span>
                        )}
                      </button>
                    </td>
                    <td className="px-3 py-2.5 hidden md:table-cell text-muted-foreground">
                      {subj ? `${subj.code} · ${subj.title}` : "—"}
                    </td>
                    <td className="px-3 py-2.5"><Badge variant="outline">{p.year}</Badge></td>
                    <td className="px-3 py-2.5 hidden md:table-cell text-xs capitalize text-muted-foreground">
                      {p.exam_type.replace("_", " ")}
                    </td>
                    <td className="px-3 py-2.5"><StatusBadge value={p.status} /></td>
                    <td className="px-3 py-2.5 hidden lg:table-cell text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(p.updated_at ?? p.created_at), { addSuffix: true })}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setEditing(p); setOpen(true); }}>
                            <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {p.status !== "published" ? (
                            <DropdownMenuItem onClick={() => updateStatus.mutate({ id: p.id, status: "published" })}>
                              <CheckCircle2 className="mr-2 h-3.5 w-3.5" /> Publish
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => updateStatus.mutate({ id: p.id, status: "draft" })}>
                              <XCircle className="mr-2 h-3.5 w-3.5" /> Unpublish
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => updateStatus.mutate({ id: p.id, status: "archived" })}>
                            <Archive className="mr-2 h-3.5 w-3.5" /> Archive
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => setConfirmDelete(p)}>
                            <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <PaperDialog
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        subjects={subjects}
        onSaved={invalidate}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(v) => !v && setConfirmDelete(null)}
        title={`Delete "${confirmDelete?.title ?? ""}"?`}
        description="This permanently removes the paper and its uploaded file."
        confirmLabel="Delete"
        destructive
        onConfirm={() => confirmDelete && deleteMutation.mutate(confirmDelete)}
      />
    </div>
  );
}

function PaperDialog({
  open, onOpenChange, editing, subjects, onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: PaperRow | null;
  subjects: SubjectLite[];
  onSaved: () => void;
}) {
  const [subjectId, setSubjectId] = useState("");
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
      setSubjectId(editing?.subject_id ?? "");
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
    if (!subjectId) return toast.error("Pick a subject");
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
          <div>
            <Label>Subject</Label>
            <Select value={subjectId} onValueChange={setSubjectId}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select subject" /></SelectTrigger>
              <SelectContent>
                {subjects.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.code} · {s.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
