import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, Plus, Tag as TagIcon, Trash2, Pencil } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/_admin/tags")({
  head: () => ({ meta: [{ title: "Tags · Admin · BCA Gurukul" }] }),
  component: TagsAdmin,
});

const tagSchema = z.object({
  name: z.string().min(2).max(60),
  slug: z
    .string()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/, "lowercase letters, numbers and hyphens only"),
  description: z.string().max(500).optional().or(z.literal("")),
  color: z
    .string()
    .max(20)
    .optional()
    .or(z.literal("")),
});
type TagInput = z.infer<typeof tagSchema>;

type TagRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string | null;
  created_at: string;
};

function TagsAdmin() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<TagRow | null>(null);
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "tags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tags")
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      return data as TagRow[];
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tags").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tag deleted");
      qc.invalidateQueries({ queryKey: ["admin", "tags"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <Link to="/admin" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to admin
          </Link>
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> New tag
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex items-center gap-3">
          <TagIcon className="h-6 w-6 text-primary" />
          <h1 className="font-display text-3xl font-semibold text-foreground">Tags</h1>
        </div>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Reusable labels for notes, papers, videos, quizzes and assignments. Helps students search and filter.
        </p>

        <section className="mt-8 rounded-2xl border border-border bg-surface">
          {isLoading && <p className="p-6 text-sm text-muted-foreground">Loading…</p>}
          {!isLoading && data && data.length === 0 && (
            <div className="p-10 text-center">
              <p className="font-display text-lg text-foreground">No tags yet</p>
              <p className="mt-1 text-sm text-muted-foreground">Create your first tag to start labelling content.</p>
            </div>
          )}
          {data && data.length > 0 && (
            <ul className="divide-y divide-border">
              {data.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-4 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span
                      className="inline-block h-3 w-3 rounded-full border border-border"
                      style={{ background: t.color || "transparent" }}
                    />
                    <div>
                      <div className="font-medium text-foreground">{t.name}</div>
                      <div className="font-mono text-xs text-muted-foreground">{t.slug}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditing(t);
                        setOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (confirm(`Delete tag "${t.name}"?`)) removeMutation.mutate(t.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <TagDialog
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        onSaved={() => qc.invalidateQueries({ queryKey: ["admin", "tags"] })}
      />
    </div>
  );
}

function TagDialog({
  open,
  onOpenChange,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: TagRow | null;
  onSaved: () => void;
}) {
  const form = useForm<TagInput>({
    resolver: zodResolver(tagSchema),
    values: editing
      ? {
          name: editing.name,
          slug: editing.slug,
          description: editing.description ?? "",
          color: editing.color ?? "",
        }
      : { name: "", slug: "", description: "", color: "" },
  });

  const mutation = useMutation({
    mutationFn: async (input: TagInput) => {
      const payload = {
        name: input.name.trim(),
        slug: input.slug.trim(),
        description: input.description?.trim() || null,
        color: input.color?.trim() || null,
      };
      if (editing) {
        const { error } = await supabase.from("tags").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("tags").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Tag updated" : "Tag created");
      onSaved();
      onOpenChange(false);
      form.reset();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit tag" : "New tag"}</DialogTitle>
          <DialogDescription>Labels appear across notes, videos and other content.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="grid gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" placeholder="Data Structures" {...form.register("name")} />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="slug">Slug</Label>
              <Input id="slug" placeholder="data-structures" {...form.register("slug")} />
              {form.formState.errors.slug && (
                <p className="text-xs text-destructive">{form.formState.errors.slug.message}</p>
              )}
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={3} {...form.register("description")} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="color">Color (hex or token)</Label>
            <Input id="color" placeholder="#4f46e5" {...form.register("color")} />
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
