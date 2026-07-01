import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  BookOpen,
  GraduationCap,
  Library,
  Layers,
  FileText,
  FileStack,
  Megaphone,
  ClipboardList,
  Video,
  FlaskConical,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type ContentType =
  | "course"
  | "semester"
  | "subject"
  | "unit"
  | "note"
  | "paper"
  | "quiz"
  | "video"
  | "announcement"
  | "assignment";

const TYPES: {
  id: ContentType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  desc: string;
  ready: boolean;
}[] = [
  { id: "course", label: "Course", icon: BookOpen, desc: "Top-level programme", ready: true },
  {
    id: "semester",
    label: "Semester",
    icon: GraduationCap,
    desc: "Belongs to a course",
    ready: true,
  },
  { id: "subject", label: "Subject", icon: Library, desc: "Belongs to a semester", ready: true },
  { id: "unit", label: "Unit", icon: Layers, desc: "Belongs to a subject", ready: true },
  {
    id: "note",
    label: "Note / PDF",
    icon: FileText,
    desc: "Study material for a unit",
    ready: true,
  },
  {
    id: "paper",
    label: "Previous Year Paper",
    icon: FileStack,
    desc: "Past exam paper for a subject",
    ready: true,
  },
  {
    id: "quiz",
    label: "MCQ Quiz",
    icon: FlaskConical,
    desc: "Quiz attached to a unit",
    ready: true,
  },
  { id: "video", label: "Video", icon: Video, desc: "Coming soon", ready: false },
  { id: "assignment", label: "Assignment", icon: ClipboardList, desc: "Coming soon", ready: false },
  { id: "announcement", label: "Announcement", icon: Megaphone, desc: "Coming soon", ready: false },
];

export function CreateWizard({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [type, setType] = useState<ContentType | null>(null);

  useEffect(() => {
    if (!open) setType(null);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display">
            {type
              ? `Create ${TYPES.find((t) => t.id === type)?.label}`
              : "What do you want to create?"}
          </DialogTitle>
        </DialogHeader>
        {!type && (
          <div className="grid grid-cols-2 gap-2 pt-2 sm:grid-cols-3">
            {TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                disabled={!t.ready}
                onClick={() => t.ready && setType(t.id)}
                className={cn(
                  "group flex flex-col items-start gap-2 rounded-lg border border-border bg-surface p-3 text-left transition",
                  t.ready
                    ? "hover:border-primary/50 hover:bg-primary/5"
                    : "cursor-not-allowed opacity-50",
                )}
              >
                <div className="rounded-md bg-primary/10 p-1.5 text-primary">
                  <t.icon className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground">{t.label}</div>
                  <div className="text-xs text-muted-foreground">{t.desc}</div>
                </div>
              </button>
            ))}
          </div>
        )}
        {type && (
          <WizardForm
            type={type}
            onBack={() => setType(null)}
            onDone={() => {
              onOpenChange(false);
              setType(null);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function WizardForm({
  type,
  onBack,
  onDone,
}: {
  type: ContentType;
  onBack: () => void;
  onDone: () => void;
}) {
  const qc = useQueryClient();

  switch (type) {
    case "course":
      return (
        <CourseForm
          onBack={onBack}
          onDone={() => {
            qc.invalidateQueries({ queryKey: ["admin"] });
            onDone();
          }}
        />
      );
    case "semester":
      return (
        <SemesterForm
          onBack={onBack}
          onDone={() => {
            qc.invalidateQueries({ queryKey: ["admin"] });
            onDone();
          }}
        />
      );
    case "subject":
      return (
        <SubjectForm
          onBack={onBack}
          onDone={() => {
            qc.invalidateQueries({ queryKey: ["admin"] });
            onDone();
          }}
        />
      );
    case "unit":
      return (
        <UnitForm
          onBack={onBack}
          onDone={() => {
            qc.invalidateQueries({ queryKey: ["admin"] });
            onDone();
          }}
        />
      );
    case "note":
      return (
        <NoteForm
          onBack={onBack}
          onDone={() => {
            qc.invalidateQueries({ queryKey: ["admin"] });
            onDone();
          }}
        />
      );
    case "paper":
      return (
        <PaperForm
          onBack={onBack}
          onDone={() => {
            qc.invalidateQueries({ queryKey: ["admin"] });
            onDone();
          }}
        />
      );
    case "quiz":
      return (
        <QuizForm
          onBack={onBack}
          onDone={() => {
            qc.invalidateQueries({ queryKey: ["admin"] });
            onDone();
          }}
        />
      );
    default:
      return <div className="py-6 text-sm text-muted-foreground">Coming soon.</div>;
  }
}

function FooterBar({ onBack, busy, label }: { onBack: () => void; busy: boolean; label: string }) {
  return (
    <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
      <Button type="button" variant="ghost" onClick={onBack} disabled={busy}>
        ← Back
      </Button>
      <Button type="submit" disabled={busy}>
        {busy ? "Saving…" : label}
      </Button>
    </div>
  );
}

/* ---------------- forms ---------------- */

function CourseForm({ onBack, onDone }: { onBack: () => void; onDone: () => void }) {
  const [title, setTitle] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(status: "draft" | "published") {
    if (!title.trim() || !code.trim()) return toast.error("Title and code are required");
    setBusy(true);
    const slug = code.toLowerCase().replace(/\s+/g, "-");
    const { error } = await supabase
      .from("courses")
      .insert({ title, code, slug, description, status });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Course created");
    onDone();
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit("published");
      }}
      className="space-y-3 pt-2"
    >
      <Field label="Title">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Bachelor of Computer Applications"
        />
      </Field>
      <Field label="Code">
        <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="BCA" />
      </Field>
      <Field label="Description">
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
      </Field>
      <FooterRowDraft onBack={onBack} busy={busy} onDraft={() => submit("draft")} />
    </form>
  );
}

function SemesterForm({ onBack, onDone }: { onBack: () => void; onDone: () => void }) {
  const [courseId, setCourseId] = useState<string>("");
  const [number, setNumber] = useState<number>(1);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: courses } = useQuery({
    queryKey: ["admin", "courses-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id,title")
        .is("deleted_at", null)
        .order("title");
      if (error) throw error;
      return data;
    },
  });

  async function submit(status: "draft" | "published") {
    if (!courseId || !number) return toast.error("Course and number required");
    setBusy(true);
    const { error } = await supabase.from("semesters").insert({
      course_id: courseId,
      number,
      title: title || `Semester ${number}`,
      status,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Semester created");
    onDone();
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit("published");
      }}
      className="space-y-3 pt-2"
    >
      <Field label="Course">
        <Select value={courseId} onValueChange={setCourseId}>
          <SelectTrigger>
            <SelectValue placeholder="Choose course" />
          </SelectTrigger>
          <SelectContent>
            {courses?.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Number">
        <Input
          type="number"
          min={1}
          max={20}
          value={number}
          onChange={(e) => setNumber(parseInt(e.target.value || "1"))}
        />
      </Field>
      <Field label="Title (optional)">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={`Semester ${number}`}
        />
      </Field>
      <FooterRowDraft onBack={onBack} busy={busy} onDraft={() => submit("draft")} />
    </form>
  );
}

function SubjectForm({ onBack, onDone }: { onBack: () => void; onDone: () => void }) {
  const [semesterId, setSemesterId] = useState("");
  const [title, setTitle] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: semesters } = useQuery({
    queryKey: ["admin", "semesters-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("semesters")
        .select("id,title,number,courses(title)")
        .is("deleted_at", null)
        .order("number");
      if (error) throw error;
      return data;
    },
  });

  async function submit(status: "draft" | "published") {
    if (!semesterId || !title.trim()) return toast.error("Semester and title required");
    setBusy(true);
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const finalCode = code || slug.toUpperCase().slice(0, 12) || "SUBJ";
    const { error } = await supabase.from("subjects").insert({
      semester_id: semesterId,
      title,
      code: finalCode,
      slug,
      status,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Subject created");
    onDone();
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit("published");
      }}
      className="space-y-3 pt-2"
    >
      <Field label="Semester">
        <Select value={semesterId} onValueChange={setSemesterId}>
          <SelectTrigger>
            <SelectValue placeholder="Choose semester" />
          </SelectTrigger>
          <SelectContent>
            {semesters?.map((s: any) => (
              <SelectItem key={s.id} value={s.id}>
                {s.courses?.title ?? "Course"} · Sem {s.number}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Title">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Data Structures"
        />
      </Field>
      <Field label="Code (optional)">
        <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="CS-201" />
      </Field>
      <FooterRowDraft onBack={onBack} busy={busy} onDraft={() => submit("draft")} />
    </form>
  );
}

function UnitForm({ onBack, onDone }: { onBack: () => void; onDone: () => void }) {
  const [subjectId, setSubjectId] = useState("");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: subjects } = useQuery({
    queryKey: ["admin", "subjects-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subjects")
        .select("id,title,semesters(number,courses(title))")
        .is("deleted_at", null)
        .order("title");
      if (error) throw error;
      return data;
    },
  });

  async function submit(status: "draft" | "published") {
    if (!subjectId || !title.trim()) return toast.error("Subject and title required");
    setBusy(true);
    const { data: existing } = await supabase
      .from("units")
      .select("number")
      .eq("subject_id", subjectId)
      .order("number", { ascending: false })
      .limit(1);
    const nextNumber = (existing?.[0]?.number ?? 0) + 1;
    const { error } = await supabase
      .from("units")
      .insert({ subject_id: subjectId, title, number: nextNumber, status });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Unit created");
    onDone();
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit("published");
      }}
      className="space-y-3 pt-2"
    >
      <Field label="Subject">
        <Select value={subjectId} onValueChange={setSubjectId}>
          <SelectTrigger>
            <SelectValue placeholder="Choose subject" />
          </SelectTrigger>
          <SelectContent>
            {subjects?.map((s: any) => (
              <SelectItem key={s.id} value={s.id}>
                {s.semesters?.courses?.title ?? ""} · Sem {s.semesters?.number} · {s.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Title">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Unit 1 — Introduction"
        />
      </Field>
      <FooterRowDraft onBack={onBack} busy={busy} onDraft={() => submit("draft")} />
    </form>
  );
}

function NoteForm({ onBack, onDone }: { onBack: () => void; onDone: () => void }) {
  const [unitId, setUnitId] = useState("");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: units } = useQuery({
    queryKey: ["admin", "units-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("units")
        .select("id,title,subjects(title,semesters(number))")
        .is("deleted_at", null)
        .order("title");
      if (error) throw error;
      return data;
    },
  });

  async function submit(status: "draft" | "published") {
    if (!unitId || !title.trim()) return toast.error("Unit and title required");
    setBusy(true);
    let file_path: string | null = null;
    let file_mime: string | null = null;
    let file_size_bytes: number | null = null;
    if (file) {
      const path = `${unitId}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage
        .from("notes")
        .upload(path, file, { upsert: false });
      if (upErr) {
        setBusy(false);
        return toast.error(upErr.message);
      }
      file_path = path;
      file_mime = file.type;
      file_size_bytes = file.size;
    }
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80);
    const { error } = await supabase.from("notes").insert({
      unit_id: unitId,
      title,
      summary,
      slug,
      status,
      file_path,
      file_bucket: file_path ? "notes" : null,
      file_mime,
      file_size_bytes,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Note saved");
    onDone();
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit("published");
      }}
      className="space-y-3 pt-2"
    >
      <Field label="Unit">
        <Select value={unitId} onValueChange={setUnitId}>
          <SelectTrigger>
            <SelectValue placeholder="Choose unit" />
          </SelectTrigger>
          <SelectContent>
            {units?.map((u: any) => (
              <SelectItem key={u.id} value={u.id}>
                Sem {u.subjects?.semesters?.number} · {u.subjects?.title} · {u.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Title">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <Field label="Summary">
        <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={2} />
      </Field>
      <Field label="PDF / Document (optional)">
        <Input
          type="file"
          accept=".pdf,.doc,.docx,.ppt,.pptx"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </Field>
      <FooterRowDraft onBack={onBack} busy={busy} onDraft={() => submit("draft")} />
    </form>
  );
}

function PaperForm({ onBack, onDone }: { onBack: () => void; onDone: () => void }) {
  const [subjectId, setSubjectId] = useState("");
  const [title, setTitle] = useState("");
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: subjects } = useQuery({
    queryKey: ["admin", "subjects-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subjects")
        .select("id,title,semesters(number)")
        .is("deleted_at", null)
        .order("title");
      if (error) throw error;
      return data;
    },
  });

  async function submit(status: "draft" | "published") {
    if (!subjectId || !title.trim() || !file)
      return toast.error("Subject, title and file required");
    setBusy(true);
    const path = `${subjectId}/${year}-${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage
      .from("papers")
      .upload(path, file, { upsert: false });
    if (upErr) {
      setBusy(false);
      return toast.error(upErr.message);
    }
    const { error } = await supabase.from("papers").insert({
      subject_id: subjectId,
      title,
      year,
      status,
      file_path: path,
      file_bucket: "papers",
      file_mime: file.type,
      file_size_bytes: file.size,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Paper added");
    onDone();
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit("published");
      }}
      className="space-y-3 pt-2"
    >
      <Field label="Subject">
        <Select value={subjectId} onValueChange={setSubjectId}>
          <SelectTrigger>
            <SelectValue placeholder="Choose subject" />
          </SelectTrigger>
          <SelectContent>
            {subjects?.map((s: any) => (
              <SelectItem key={s.id} value={s.id}>
                Sem {s.semesters?.number} · {s.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Title">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Mid-term 2024"
        />
      </Field>
      <Field label="Year">
        <Input
          type="number"
          value={year}
          onChange={(e) => setYear(parseInt(e.target.value || "0"))}
        />
      </Field>
      <Field label="PDF">
        <Input
          type="file"
          accept="application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </Field>
      <FooterRowDraft onBack={onBack} busy={busy} onDraft={() => submit("draft")} />
    </form>
  );
}

function QuizForm({ onBack, onDone }: { onBack: () => void; onDone: () => void }) {
  const [unitId, setUnitId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: units } = useQuery({
    queryKey: ["admin", "units-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("units")
        .select("id,title,subjects(title,semesters(number))")
        .is("deleted_at", null)
        .order("title");
      if (error) throw error;
      return data;
    },
  });

  async function submit(status: "draft" | "published") {
    if (!unitId || !title.trim()) return toast.error("Unit and title required");
    setBusy(true);
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80);
    const { data, error } = await supabase
      .from("quizzes")
      .insert({ unit_id: unitId, title, slug, description, status })
      .select("id")
      .single();
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Quiz created — add questions next");
    onDone();
    if (data) window.location.assign(`/admin/quizzes/${data.id}`);
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit("draft");
      }}
      className="space-y-3 pt-2"
    >
      <Field label="Unit">
        <Select value={unitId} onValueChange={setUnitId}>
          <SelectTrigger>
            <SelectValue placeholder="Choose unit" />
          </SelectTrigger>
          <SelectContent>
            {units?.map((u: any) => (
              <SelectItem key={u.id} value={u.id}>
                Sem {u.subjects?.semesters?.number} · {u.subjects?.title} · {u.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Title">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <Field label="Description">
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
      </Field>
      <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
        <Button type="button" variant="ghost" onClick={onBack} disabled={busy}>
          ← Back
        </Button>
        <Button type="submit" disabled={busy}>
          {busy ? "Creating…" : "Create & open builder"}
        </Button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function FooterRowDraft({
  onBack,
  busy,
  onDraft,
}: {
  onBack: () => void;
  busy: boolean;
  onDraft: () => void;
}) {
  return (
    <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
      <Button type="button" variant="ghost" onClick={onBack} disabled={busy}>
        ← Back
      </Button>
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" onClick={onDraft} disabled={busy}>
          Save as draft
        </Button>
        <Button type="submit" disabled={busy}>
          {busy ? "Publishing…" : "Publish"}
        </Button>
      </div>
    </div>
  );
}
