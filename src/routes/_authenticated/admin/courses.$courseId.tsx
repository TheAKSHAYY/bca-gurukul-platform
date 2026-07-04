import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, Layers, BookText, ListTree, Pencil, FileText, FileQuestion, ClipboardList, ChevronDown, ChevronRight } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/admin/courses/$courseId")({
  head: () => ({ meta: [{ title: "Course tree · Admin · BCA Gurukul" }] }),
  component: CourseTreePage,
});

type Status = "draft" | "published" | "archived";

function CourseTreePage() {
  const { courseId } = Route.useParams();
  const qc = useQueryClient();

  const courseQuery = useQuery({
    queryKey: ["admin", "course", courseId],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("*").eq("id", courseId).single();
      if (error) throw error;
      return data;
    },
  });

  const semestersQuery = useQuery({
    queryKey: ["admin", "semesters", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("semesters")
        .select("*")
        .eq("course_id", courseId)
        .order("number");
      if (error) throw error;
      return data;
    },
  });

  const [semOpen, setSemOpen] = useState(false);

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["admin", "semesters", courseId] });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link
            to="/admin/courses"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> All courses
          </Link>
          <Button onClick={() => setSemOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add semester
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        {courseQuery.data && (
          <div className="flex items-center gap-3">
            <Layers className="h-6 w-6 text-primary" />
            <div>
              <h1 className="font-display text-3xl font-semibold text-foreground">{courseQuery.data.title}</h1>
              <p className="text-sm text-muted-foreground">
                <span className="font-mono uppercase">{courseQuery.data.code}</span> ·{" "}
                {courseQuery.data.total_semesters} semesters
              </p>
            </div>
          </div>
        )}

        <section className="mt-8 space-y-3">
          {semestersQuery.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {semestersQuery.data && semestersQuery.data.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
              <p className="font-display text-lg text-foreground">No semesters yet</p>
              <p className="mt-1 text-sm text-muted-foreground">Add the first semester to begin structuring this course.</p>
            </div>
          )}

          <Accordion type="multiple" className="space-y-3">
            {semestersQuery.data?.map((sem) => (
              <SemesterCard key={sem.id} sem={{ ...sem, status: sem.status as Status }} onChange={invalidateAll} />
            ))}
          </Accordion>
        </section>
      </main>

      <SemesterDialog
        open={semOpen}
        onOpenChange={setSemOpen}
        courseId={courseId}
        nextNumber={(semestersQuery.data?.length ?? 0) + 1}
        onSaved={invalidateAll}
      />
    </div>
  );
}

function SemesterCard({
  sem,
  onChange,
}: {
  sem: {
    id: string;
    course_id: string;
    number: number;
    title: string;
    status: Status;
    description: string | null;
  };
  onChange: () => void;
}) {
  const qc = useQueryClient();
  const [subOpen, setSubOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const subjectsQuery = useQuery({
    queryKey: ["admin", "subjects", sem.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subjects")
        .select("*")
        .eq("semester_id", sem.id)
        .order("sort_order")
        .order("code");
      if (error) throw error;
      return data;
    },
  });

  const removeSem = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("semesters").delete().eq("id", sem.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Semester deleted");
      onChange();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AccordionItem
      value={sem.id}
      className="rounded-2xl border border-border bg-surface px-4 data-[state=open]:shadow-sm"
    >
      <AccordionTrigger className="hover:no-underline">
        <div className="flex flex-1 items-center gap-3 pr-3">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 font-display text-sm font-semibold text-primary">
            {sem.number}
          </div>
          <div className="text-left">
            <div className="font-display text-base font-semibold text-foreground">{sem.title}</div>
            {sem.description && <div className="text-xs text-muted-foreground">{sem.description}</div>}
          </div>
          <Badge className="ml-auto" variant={sem.status === "published" ? "default" : "secondary"}>
            {sem.status}
          </Badge>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="flex items-center justify-between pb-3">
          <p className="text-sm text-muted-foreground">Subjects</p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setSubOpen(true)}>
              <Plus className="mr-1 h-4 w-4" /> Subject
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                if (confirm(`Delete semester ${sem.number}? Subjects and units inside will also be deleted.`)) {
                  removeSem.mutate();
                }
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          {subjectsQuery.data?.length === 0 && (
            <p className="rounded-lg border border-dashed border-border bg-background p-4 text-center text-xs text-muted-foreground">
              No subjects yet.
            </p>
          )}
          {subjectsQuery.data?.map((sub) => (
            <SubjectRow
              key={sub.id}
              sub={{ ...sub, status: sub.status as Status }}
              onChange={() => qc.invalidateQueries({ queryKey: ["admin", "subjects", sem.id] })}
            />
          ))}
        </div>
      </AccordionContent>

      <SemesterDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        courseId={sem.course_id}
        nextNumber={sem.number}
        semester={sem}
        onSaved={() => {
          onChange();
          setEditOpen(false);
        }}
      />
      <SubjectDialog
        open={subOpen}
        onOpenChange={setSubOpen}
        semesterId={sem.id}
        onSaved={() => qc.invalidateQueries({ queryKey: ["admin", "subjects", sem.id] })}
      />
    </AccordionItem>
  );
}

function SubjectRow({
  sub,
  onChange,
}: {
  sub: { id: string; code: string; title: string; status: Status; credits: number | null };
  onChange: () => void;
}) {
  const qc = useQueryClient();
  const [unitOpen, setUnitOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const unitsQuery = useQuery({
    queryKey: ["admin", "units", sub.id],
    enabled: expanded,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("units")
        .select("*")
        .eq("subject_id", sub.id)
        .order("number");
      if (error) throw error;
      return data;
    },
  });

  const removeSub = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("subjects").delete().eq("id", sub.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Subject deleted");
      onChange();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeUnit = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("units").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Unit deleted");
      qc.invalidateQueries({ queryKey: ["admin", "units", sub.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="rounded-xl border border-border bg-background">
      <div className="flex items-center gap-3 px-4 py-3">
        <BookText className="h-4 w-4 text-primary" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">{sub.code}</span>
            <span className="font-display text-sm font-semibold text-foreground">{sub.title}</span>
            <Badge variant={sub.status === "published" ? "default" : "secondary"} className="text-[10px]">
              {sub.status}
            </Badge>
          </div>
          {sub.credits != null && (
            <div className="text-xs text-muted-foreground">{sub.credits} credits</div>
          )}
        </div>
        <Button size="sm" variant="ghost" onClick={() => setExpanded((v) => !v)}>
          <ListTree className="mr-1 h-4 w-4" /> Units
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setUnitOpen(true)}>
          <Plus className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            if (confirm(`Delete subject ${sub.code}? Units inside will also be deleted.`)) {
              removeSub.mutate();
            }
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {expanded && (
        <div className="border-t border-border px-4 py-3">
          {unitsQuery.isLoading && <p className="text-xs text-muted-foreground">Loading units…</p>}
          {unitsQuery.data?.length === 0 && (
            <p className="text-xs text-muted-foreground">No units yet.</p>
          )}
          <ul className="space-y-1.5">
            {unitsQuery.data?.map((u) => (
              <li
                key={u.id}
                className="flex items-center gap-3 rounded-md bg-surface px-3 py-2 text-sm"
              >
                <span className="grid h-6 w-6 place-items-center rounded bg-primary/10 text-xs font-semibold text-primary">
                  {u.number}
                </span>
                <span className="flex-1 text-foreground">{u.title}</span>
                <Badge variant={u.status === "published" ? "default" : "secondary"} className="text-[10px]">
                  {u.status}
                </Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (confirm(`Delete unit ${u.number}?`)) removeUnit.mutate(u.id);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <UnitDialog
        open={unitOpen}
        onOpenChange={setUnitOpen}
        subjectId={sub.id}
        nextNumber={(unitsQuery.data?.length ?? 0) + 1}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ["admin", "units", sub.id] });
          setExpanded(true);
        }}
      />
    </div>
  );
}

// ============ DIALOGS ============

function SemesterDialog({
  open,
  onOpenChange,
  courseId,
  nextNumber,
  semester,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  courseId: string;
  nextNumber: number;
  semester?: {
    id: string;
    course_id: string;
    number: number;
    title: string;
    status: Status;
    description: string | null;
  };
  onSaved: () => void;
}) {
  const isEditing = Boolean(semester);
  const [number, setNumber] = useState(semester?.number ?? nextNumber);
  const [title, setTitle] = useState(semester?.title ?? "");
  const [description, setDescription] = useState(semester?.description ?? "");
  const [status, setStatus] = useState<Status>(semester?.status ?? "draft");

  const reset = () => {
    if (semester) {
      setNumber(semester.number);
      setTitle(semester.title);
      setDescription(semester.description ?? "");
      setStatus(semester.status);
    } else {
      setNumber(nextNumber);
      setTitle("");
      setDescription("");
      setStatus("draft");
    }
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        number,
        title: title.trim(),
        description: description.trim() || null,
        status,
      };
      if (semester) {
        const { error } = await supabase.from("semesters").update(payload).eq("id", semester.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("semesters").insert({
          course_id: courseId,
          ...payload,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(isEditing ? "Semester updated" : "Semester added");
      onSaved();
      onOpenChange(false);
      if (!semester) {
        setTitle("");
        setDescription("");
        setStatus("draft");
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (v) reset();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit semester" : "Add semester"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-1.5">
              <Label>Number</Label>
              <Input type="number" value={number} onChange={(e) => setNumber(Number(e.target.value))} />
            </div>
            <div className="col-span-2 grid gap-1.5">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Semester I" />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Description</Label>
            <Textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Foundations: C, Maths, Digital Logic"
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={!title || mutation.isPending}>
            {mutation.isPending ? "Saving…" : isEditing ? "Save" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SubjectDialog({
  open,
  onOpenChange,
  semesterId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  semesterId: string;
  onSaved: () => void;
}) {
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [credits, setCredits] = useState<number>(4);
  const [status, setStatus] = useState<Status>("draft");

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("subjects").insert({
        semester_id: semesterId,
        code: code.trim().toUpperCase(),
        title: title.trim(),
        slug: slug.trim() || code.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-"),
        credits,
        status,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Subject added");
      onSaved();
      onOpenChange(false);
      setCode("");
      setTitle("");
      setSlug("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add subject</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Code</Label>
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="BCA-101" />
            </div>
            <div className="grid gap-1.5">
              <Label>Slug</Label>
              <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="auto" />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Programming in C" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Credits</Label>
              <Input
                type="number"
                value={credits}
                onChange={(e) => setCredits(Number(e.target.value))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={!code || !title || mutation.isPending}>
            {mutation.isPending ? "Saving…" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UnitDialog({
  open,
  onOpenChange,
  subjectId,
  nextNumber,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  subjectId: string;
  nextNumber: number;
  onSaved: () => void;
}) {
  const [number, setNumber] = useState(nextNumber);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [status, setStatus] = useState<Status>("draft");

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("units").insert({
        subject_id: subjectId,
        number,
        title: title.trim(),
        summary: summary.trim() || null,
        status,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Unit added");
      onSaved();
      onOpenChange(false);
      setTitle("");
      setSummary("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (v) setNumber(nextNumber);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add unit</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-1.5">
              <Label>Number</Label>
              <Input type="number" value={number} onChange={(e) => setNumber(Number(e.target.value))} />
            </div>
            <div className="col-span-2 grid gap-1.5">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Introduction to C" />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Summary</Label>
            <Textarea rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={!title || mutation.isPending}>
            {mutation.isPending ? "Saving…" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
