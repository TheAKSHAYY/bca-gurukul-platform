import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { BookOpen, GraduationCap, Library, Layers, Save } from "lucide-react";

import { updateExplorerNode, type ExplorerNode, type NodeType } from "@/lib/explorer.functions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ICONS: Record<NodeType, typeof BookOpen> = {
  course: BookOpen,
  semester: GraduationCap,
  subject: Library,
  unit: Layers,
};

const TYPE_LABEL: Record<NodeType, string> = {
  course: "Course",
  semester: "Semester",
  subject: "Subject",
  unit: "Unit",
};

type FormState = {
  name: string;
  status: "draft" | "published" | "archived";
  description: string;
  summary: string;
  slug: string;
  code: string;
  number: number | "";
};

function nodeToForm(node: ExplorerNode): FormState {
  return {
    name: node.name,
    status: node.status,
    description: (node.meta.description as string | null | undefined) ?? "",
    summary: (node.meta.summary as string | null | undefined) ?? "",
    slug: (node.meta.slug as string | null | undefined) ?? "",
    code: (node.meta.code as string | null | undefined) ?? "",
    number: (node.meta.number as number | null | undefined) ?? "",
  };
}

export function ExplorerDetail({ node }: { node: ExplorerNode | null }) {
  const [form, setForm] = useState<FormState | null>(node ? nodeToForm(node) : null);
  const Icon = node ? ICONS[node.type] : BookOpen;
  const qc = useQueryClient();
  const update = useServerFn(updateExplorerNode);

  useEffect(() => {
    setForm(node ? nodeToForm(node) : null);
  }, [node?.id]);

  const save = useMutation({
    mutationFn: async () => {
      if (!node || !form) return;
      const hasSlug = node.type === "course" || node.type === "subject";
      const hasNumber = node.type === "semester" || node.type === "unit";
      await update({
        data: {
          type: node.type,
          id: node.id,
          patch: {
            name: form.name,
            status: form.status,
            ...(node.type === "unit"
              ? { summary: form.summary || null }
              : { description: form.description || null }),
            ...(hasSlug ? { slug: form.slug || null, code: form.code || null } : {}),
            ...(hasNumber && form.number !== "" ? { number: Number(form.number) } : {}),
          },
        },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "explorer-tree"] });
      toast.success("Saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!node || !form) {
    return (
      <div className="grid h-full place-items-center p-10 text-center">
        <div className="max-w-md space-y-2">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-muted">
            <BookOpen className="h-5 w-5 text-muted-foreground" />
          </div>
          <h3 className="font-display text-lg font-medium">Select an item</h3>
          <p className="text-sm text-muted-foreground">
            Pick a course, semester, subject, or unit from the tree on the left, or right-click to
            create a new one.
          </p>
        </div>
      </div>
    );
  }

  const hasSlug = node.type === "course" || node.type === "subject";
  const hasNumber = node.type === "semester" || node.type === "unit";

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-border/70 px-6 py-4">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{TYPE_LABEL[node.type]}</span>
            <Badge
              variant={node.status === "published" ? "default" : "outline"}
              className="h-4 px-1.5 text-[10px]"
            >
              {node.status}
            </Badge>
          </div>
          <h2 className="truncate font-display text-lg font-semibold">{node.name}</h2>
        </div>
        <Button onClick={() => save.mutate()} disabled={save.isPending} className="gap-1.5">
          <Save className="h-4 w-4" />
          {save.isPending ? "Saving…" : "Save"}
        </Button>
      </div>

      <div className="flex-1 overflow-auto px-6 py-6">
        <div className="mx-auto max-w-2xl space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm({ ...form, status: v as FormState["status"] })}
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

            {hasNumber && (
              <div className="space-y-2">
                <Label htmlFor="number">Number</Label>
                <Input
                  id="number"
                  type="number"
                  min={1}
                  value={form.number}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      number: e.target.value === "" ? "" : Number(e.target.value),
                    })
                  }
                />
              </div>
            )}

            {hasSlug && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="code">Code</Label>
                  <Input
                    id="code"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug</Label>
                  <Input
                    id="slug"
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  />
                </div>
              </>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="desc">{node.type === "unit" ? "Summary" : "Description"}</Label>
            <Textarea
              id="desc"
              rows={6}
              value={node.type === "unit" ? form.summary : form.description}
              onChange={(e) =>
                setForm(
                  node.type === "unit"
                    ? { ...form, summary: e.target.value }
                    : { ...form, description: e.target.value },
                )
              }
              placeholder={
                node.type === "course"
                  ? "Tell students what this course covers…"
                  : node.type === "semester"
                    ? "What this semester focuses on…"
                    : node.type === "subject"
                      ? "Subject scope, prerequisites, outcomes…"
                      : "Short summary of this unit…"
              }
            />
          </div>

          <div className="rounded-lg border border-border/60 bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{node.childCount}</span>{" "}
            {node.type === "unit" ? "items" : "children"} · position{" "}
            <span className="font-medium text-foreground">{node.position}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
