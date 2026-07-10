import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  FlaskConical, Plus, Pencil, Trash2, ExternalLink, Upload, Search,
  MoreHorizontal, CheckCircle2, XCircle, Archive,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BulkImportDialog } from "@/components/mcq/bulk-import-dialog";


export const Route = createFileRoute("/_authenticated/admin/quizzes")({
  head: () => ({ meta: [{ title: "Question Bank · Admin · BCA Gurukul" }] }),
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
  created_at: string;
  updated_at: string;
};

type UnitLite = {
  id: string;
  number: number;
  title: string;
  subject_id: string;
  subject?: { id: string; code: string; title: string } | null;
};

const STATUSES = [
  { value: "all", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
];

function AdminQuizzesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [subjectId, setSubjectId] = useState("all");
  const [status, setStatus] = useState("all");
  const [open, setOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editing, setEditing] = useState<QuizRow | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<QuizRow | null>(null);

  const subjectsQuery = useQuery({
    queryKey: ["admin", "quizzes", "subjects-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subjects").select("id, code, title").order("title");
      if (error) throw error;
      return data ?? [];
    },
  });

  const unitsQuery = useQuery<UnitLite[]>({
    queryKey: ["admin", "quizzes", "units-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("units")
        .select("id, number, title, subject_id, subject:subjects(id, code, title)")
        .order("number");
      if (error) throw error;
      return (data ?? []) as unknown as UnitLite[];
    },
  });

  const quizzesQuery = useQuery({
    queryKey: ["admin", "quizzes", "list", { subjectId, status, search }],
    queryFn: async () => {
      let q = supabase.from("quizzes").select("*", { count: "exact" });
      if (status !== "all") q = q.eq("status", status as "draft" | "published" | "archived");
      if (search.trim()) q = q.ilike("title", `%${search.trim()}%`);
      const { data, error, count } = await q
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      let items = (data ?? []) as QuizRow[];
      if (subjectId !== "all") {
        const unitIds = new Set(
          (unitsQuery.data ?? []).filter((u) => u.subject_id === subjectId).map((u) => u.id),
        );
        items = items.filter((qz) => unitIds.has(qz.unit_id));
      }
      return { items, total: count ?? 0 };
    },
    enabled: unitsQuery.isSuccess,
  });

  const items = quizzesQuery.data?.items ?? [];
  const total = quizzesQuery.data?.total ?? 0;
  const units = unitsQuery.data ?? [];
  const unitMap = useMemo(() => new Map(units.map((u) => [u.id, u])), [units]);
  const subjects = subjectsQuery.data ?? [];

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin", "quizzes"] });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status: s }: { id: string; status: "draft" | "published" | "archived" }) => {
      const { error } = await supabase.from("quizzes").update({ status: s }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Updated"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("quizzes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); setConfirmDelete(null); toast.success("Quiz deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="Question Bank"
        description="Author MCQ quizzes and manage them across every unit and subject."
        actions={
          <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}>
            <Plus className="mr-1.5 h-4 w-4" /> New quiz
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
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            {STATUSES.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="ml-auto text-xs text-muted-foreground">{total} quizzes</div>
      </div>

      {quizzesQuery.isLoading || unitsQuery.isLoading ? (
        <TableSkeleton rows={8} cols={5} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={FlaskConical}
          title={search || subjectId !== "all" || status !== "all" ? "No matches" : "No quizzes yet"}
          description={
            search || subjectId !== "all" || status !== "all"
              ? "Try clearing filters or adjusting your search."
              : "Create a quiz, then upload MCQs or add them one by one."
          }
          primaryAction={{ label: "New quiz", onClick: () => { setEditing(null); setOpen(true); }, icon: Plus }}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border/70 bg-surface">
          <table className="w-full">
            <thead className="border-b border-border/70 bg-surface-muted text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2.5">Title</th>
                <th className="px-3 py-2.5 hidden md:table-cell">Unit / Subject</th>
                <th className="px-3 py-2.5">Pass</th>
                <th className="px-3 py-2.5 hidden md:table-cell">Time</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5 hidden lg:table-cell">Updated</th>
                <th className="w-10 px-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {items.map((q) => {
                const unit = unitMap.get(q.unit_id);
                return (
                  <tr key={q.id} className="text-sm hover:bg-surface-muted/40">
                    <td className="px-3 py-2.5">
                      <Link
                        to="/admin/quizzes/$quizId"
                        params={{ quizId: q.id }}
                        className="block font-medium text-foreground hover:text-primary"
                      >
                        {q.title}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 hidden md:table-cell text-xs text-muted-foreground">
                      {unit
                        ? `U${unit.number} · ${unit.title}${unit.subject ? ` — ${unit.subject.code}` : ""}`
                        : "—"}
                    </td>
                    <td className="px-3 py-2.5"><Badge variant="outline">{q.passing_pct}%</Badge></td>
                    <td className="px-3 py-2.5 hidden md:table-cell text-xs text-muted-foreground">
                      {q.time_limit_minutes ? `${q.time_limit_minutes}m` : "—"}
                    </td>
                    <td className="px-3 py-2.5"><StatusBadge value={q.status} /></td>
                    <td className="px-3 py-2.5 hidden lg:table-cell text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(q.updated_at ?? q.created_at), { addSuffix: true })}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link to="/admin/quizzes/$quizId" params={{ quizId: q.id }}>
                              <Upload className="mr-2 h-3.5 w-3.5" /> Upload MCQs
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link to="/quizzes/$quizId" params={{ quizId: q.id }}>
                              <ExternalLink className="mr-2 h-3.5 w-3.5" /> Preview
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setEditing(q); setOpen(true); }}>
                            <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {q.status !== "published" ? (
                            <DropdownMenuItem onClick={() => updateStatus.mutate({ id: q.id, status: "published" })}>
                              <CheckCircle2 className="mr-2 h-3.5 w-3.5" /> Publish
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => updateStatus.mutate({ id: q.id, status: "draft" })}>
                              <XCircle className="mr-2 h-3.5 w-3.5" /> Unpublish
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => updateStatus.mutate({ id: q.id, status: "archived" })}>
                            <Archive className="mr-2 h-3.5 w-3.5" /> Archive
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => setConfirmDelete(q)}>
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

      <QuizDialog
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        units={units}
        onSaved={invalidate}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(v) => !v && setConfirmDelete(null)}
        title={`Delete "${confirmDelete?.title ?? ""}"?`}
        description="This removes the quiz and all its questions."
        confirmLabel="Delete"
        destructive
        onConfirm={() => confirmDelete && del.mutate(confirmDelete.id)}
      />
    </div>
  );
}

function QuizDialog({
  open, onOpenChange, editing, units, onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: QuizRow | null;
  units: UnitLite[];
  onSaved: () => void;
}) {
  const [unitId, setUnitId] = useState("");
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
      setUnitId(editing?.unit_id ?? "");
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
    if (!unitId) return toast.error("Pick a unit");
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
            <Label>Unit</Label>
            <Select value={unitId} onValueChange={setUnitId}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select unit" /></SelectTrigger>
              <SelectContent>
                {units.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.subject ? `${u.subject.code} · ` : ""}U{u.number} · {u.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
              <Label>Time limit (min)</Label>
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
