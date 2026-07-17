import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileSearch, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/admin/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/ui/empty-state";

export const Route = createFileRoute("/_authenticated/admin/superadmin/seo")({
  head: () => ({ meta: [{ title: "SEO Manager · BCA Gurukul" }] }),
  component: SeoPage,
});

type Row = {
  id: string;
  path: string;
  title: string | null;
  description: string | null;
  keywords: string | null;
  og_image: string | null;
  twitter_card: string | null;
  robots: string | null;
  canonical: string | null;
};

function SeoPage() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Row | null>(null);
  const [newPath, setNewPath] = useState("");

  const list = useQuery({
    queryKey: ["seo-meta"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seo_meta")
        .select("*")
        .order("path");
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (row: Partial<Row> & { path: string }) => {
      const { error } = await supabase.from("seo_meta").upsert(row, { onConflict: "path" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["seo-meta"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("seo_meta").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Removed");
      setSelected(null);
      qc.invalidateQueries({ queryKey: ["seo-meta"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="SEO manager"
        description="Per-route titles, descriptions, OG images, robots, and canonical URLs."
      />

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="rounded-xl border border-border/70 bg-surface p-4">
            <div className="flex gap-2">
              <Input
                placeholder="/about"
                value={newPath}
                onChange={(e) => setNewPath(e.target.value)}
              />
              <Button
                size="icon"
                onClick={() => {
                  const path = newPath.trim();
                  if (!path.startsWith("/")) return toast.error("Path must start with /");
                  upsert.mutate({ path });
                  setNewPath("");
                }}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <ul className="mt-4 space-y-1">
              {list.data?.map((r) => (
                <li key={r.id}>
                  <button
                    onClick={() => setSelected(r)}
                    className={`w-full rounded-md px-3 py-2 text-left text-sm transition ${
                      selected?.id === r.id
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-muted text-foreground"
                    }`}
                  >
                    <div className="font-medium">{r.path}</div>
                    {r.title && (
                      <div className="truncate text-xs text-muted-foreground">{r.title}</div>
                    )}
                  </button>
                </li>
              ))}
            </ul>

            {list.data && list.data.length === 0 && (
              <p className="mt-4 text-center text-sm text-muted-foreground">
                No overrides yet. Add a route path above.
              </p>
            )}
          </aside>

          <section className="rounded-2xl border border-border bg-surface p-6">
            {selected ? (
              <SeoForm
                key={selected.id}
                row={selected}
                onSave={(patch) => upsert.mutate({ ...patch, path: selected.path })}
                onDelete={() => remove.mutate(selected.id)}
                saving={upsert.isPending}
              />
            ) : (
              <EmptyState
                icon={FileSearch}
                title="Pick a route"
                description="Choose a route on the left or add a new one to override its SEO metadata."
              />
          )}
        </section>
      </div>
    </div>
  );
}

function SeoForm({
  row,
  onSave,
  onDelete,
  saving,
}: {
  row: Row;
  onSave: (patch: Partial<Row>) => void;
  onDelete: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState({
    title: row.title ?? "",
    description: row.description ?? "",
    keywords: row.keywords ?? "",
    og_image: row.og_image ?? "",
    twitter_card: row.twitter_card ?? "summary_large_image",
    robots: row.robots ?? "index,follow",
    canonical: row.canonical ?? "",
  });

  const f = <K extends keyof typeof form>(k: K) => (v: string) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  return (
    <div className="space-y-5">
      <div>
        <div className="text-xs uppercase tracking-wide text-muted-foreground">Route</div>
        <div className="font-mono text-base font-semibold text-foreground">{row.path}</div>
      </div>

      <div className="space-y-1.5">
        <Label>Title</Label>
        <Input value={form.title} onChange={(e) => f("title")(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Description</Label>
        <Textarea
          rows={3}
          value={form.description}
          onChange={(e) => f("description")(e.target.value)}
        />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Keywords</Label>
          <Input value={form.keywords} onChange={(e) => f("keywords")(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Canonical URL</Label>
          <Input value={form.canonical} onChange={(e) => f("canonical")(e.target.value)} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Open Graph image URL</Label>
        <Input
          value={form.og_image}
          onChange={(e) => f("og_image")(e.target.value)}
          placeholder="https://… 1200x630"
        />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Twitter card</Label>
          <Input value={form.twitter_card} onChange={(e) => f("twitter_card")(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Robots</Label>
          <Input value={form.robots} onChange={(e) => f("robots")(e.target.value)} />
        </div>
      </div>

      <div className="flex justify-between gap-2 pt-2">
        <Button variant="ghost" className="text-destructive" onClick={onDelete}>
          <Trash2 className="mr-2 h-4 w-4" /> Delete
        </Button>
        <Button onClick={() => onSave(form)} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}
