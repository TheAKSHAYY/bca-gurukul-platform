import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, BookOpen, Plus, Pencil, Trash2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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

export const Route = createFileRoute("/_authenticated/admin/courses")({
  head: () => ({ meta: [{ title: "Courses · Admin · BCA Gurukul" }] }),
  component: CoursesAdmin,
});

const courseSchema = z.object({
  code: z.string().min(2, "Code is required").max(20),
  title: z.string().min(2, "Title is required").max(120),
  slug: z
    .string()
    .min(2, "Slug is required")
    .max(80)
    .regex(/^[a-z0-9-]+$/, "lowercase letters, numbers and hyphens only"),
  description: z.string().max(2000).optional().or(z.literal("")),
  duration_years: z.coerce.number().min(0.5).max(10).optional(),
  total_semesters: z.coerce.number().int().min(1).max(20),
  status: z.enum(["draft", "published", "archived"]),
});
type CourseInput = z.infer<typeof courseSchema>;

type CourseRow = {
  id: string;
  code: string;
  title: string;
  slug: string;
  description: string | null;
  duration_years: number | null;
  total_semesters: number;
  status: "draft" | "published" | "archived";
  created_at: string;
};

function CoursesAdmin() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<CourseRow | null>(null);
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as CourseRow[];
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("courses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Course deleted");
      qc.invalidateQueries({ queryKey: ["admin", "courses"] });
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
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> New course
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex items-center gap-3">
          <BookOpen className="h-6 w-6 text-primary" />
          <h1 className="font-display text-3xl font-semibold text-foreground">Courses</h1>
        </div>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Programs offered on the platform. Open a course to manage its semesters, subjects, and units.
        </p>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!isLoading && data && data.length === 0 && (
            <div className="col-span-full rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
              <p className="font-display text-lg text-foreground">No courses yet</p>
              <p className="mt-1 text-sm text-muted-foreground">Create your first program to get started.</p>
            </div>
          )}
          {data?.map((c) => (
            <article key={c.id} className="rounded-2xl border border-border bg-surface p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">{c.code}</div>
                  <h3 className="mt-1 font-display text-lg font-semibold text-foreground">{c.title}</h3>
                </div>
                <Badge variant={c.status === "published" ? "default" : "secondary"}>{c.status}</Badge>
              </div>
              {c.description && (
                <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{c.description}</p>
              )}
              <div className="mt-3 text-xs text-muted-foreground">
                {c.total_semesters} semesters{c.duration_years ? ` · ${c.duration_years} years` : ""}
              </div>
              <div className="mt-4 flex items-center gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link to="/admin/courses/$courseId" params={{ courseId: c.id }}>
                    Manage tree
                  </Link>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setEditing(c);
                    setOpen(true);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (confirm(`Delete ${c.title}? This removes all semesters, subjects and units.`)) {
                      removeMutation.mutate(c.id);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </article>
          ))}
        </section>
      </main>

      <CourseDialog
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        onSaved={() => qc.invalidateQueries({ queryKey: ["admin", "courses"] })}
      />
    </div>
  );
}

function CourseDialog({
  open,
  onOpenChange,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: CourseRow | null;
  onSaved: () => void;
}) {
  const form = useForm<CourseInput>({
    resolver: zodResolver(courseSchema),
    values: editing
      ? {
          code: editing.code,
          title: editing.title,
          slug: editing.slug,
          description: editing.description ?? "",
          duration_years: editing.duration_years ?? undefined,
          total_semesters: editing.total_semesters,
          status: editing.status,
        }
      : {
          code: "",
          title: "",
          slug: "",
          description: "",
          duration_years: 3,
          total_semesters: 6,
          status: "draft",
        },
  });

  const mutation = useMutation({
    mutationFn: async (input: CourseInput) => {
      const payload = {
        code: input.code.trim(),
        title: input.title.trim(),
        slug: input.slug.trim(),
        description: input.description?.trim() || null,
        duration_years: input.duration_years ?? null,
        total_semesters: input.total_semesters,
        status: input.status,
      };
      if (editing) {
        const { error } = await supabase.from("courses").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("courses").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Course updated" : "Course created");
      onSaved();
      onOpenChange(false);
      form.reset();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit course" : "New course"}</DialogTitle>
          <DialogDescription>Programs students can enroll in.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
          className="grid gap-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="code">Code</Label>
              <Input id="code" placeholder="BCA" {...form.register("code")} />
              {form.formState.errors.code && (
                <p className="text-xs text-destructive">{form.formState.errors.code.message}</p>
              )}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="slug">Slug</Label>
              <Input id="slug" placeholder="bca" {...form.register("slug")} />
              {form.formState.errors.slug && (
                <p className="text-xs text-destructive">{form.formState.errors.slug.message}</p>
              )}
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" placeholder="Bachelor of Computer Applications" {...form.register("title")} />
            {form.formState.errors.title && (
              <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>
            )}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={3} {...form.register("description")} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="duration_years">Years</Label>
              <Input id="duration_years" type="number" step="0.5" {...form.register("duration_years")} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="total_semesters">Semesters</Label>
              <Input id="total_semesters" type="number" {...form.register("total_semesters")} />
            </div>
            <div className="grid gap-1.5">
              <Label>Status</Label>
              <Select
                value={form.watch("status")}
                onValueChange={(v) => form.setValue("status", v as CourseInput["status"])}
              >
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
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : editing ? "Save changes" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
