import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/admin/developer")({
  component: DeveloperAdmin,
});

function DeveloperAdmin() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <header>
        <h1 className="font-display text-2xl font-semibold">Developer portfolio</h1>
        <p className="text-sm text-muted-foreground">
          Edit every section that appears at <code>/developer</code>. All
          changes are live on the public site.
        </p>
      </header>

      <Tabs defaultValue="profile">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="social">Social</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="skills">Skills</TabsTrigger>
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <ProfileForm />
        </TabsContent>
        <TabsContent value="social" className="mt-6">
          <SocialEditor />
        </TabsContent>
        <TabsContent value="projects" className="mt-6">
          <ProjectsEditor />
        </TabsContent>
        <TabsContent value="skills" className="mt-6">
          <SkillsEditor />
        </TabsContent>
        <TabsContent value="achievements" className="mt-6">
          <AchievementsEditor />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ──────────────── Profile ──────────────── */

type ProfileRow = {
  full_name: string | null;
  professional_title: string | null;
  short_intro: string | null;
  bio: string | null;
  education: string | null;
  current_goal: string | null;
  career_objective: string | null;
  interests: string | null;
  email: string | null;
  photo_url: string | null;
  resume_url: string | null;
  github_username: string | null;
  hero_cta_primary_label: string | null;
  hero_cta_secondary_label: string | null;
  enabled: boolean;
};

function ProfileForm() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin-dev-profile"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("developer_profile")
        .select("*")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw error;
      return data as ProfileRow | null;
    },
  });

  const [form, setForm] = useState<ProfileRow | null>(null);
  const current = form ?? data ?? null;

  const save = useMutation({
    mutationFn: async (row: ProfileRow) => {
      const { error } = await supabase
        .from("developer_profile")
        .update(row)
        .eq("id", 1);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profile saved");
      qc.invalidateQueries({ queryKey: ["admin-dev-profile"] });
      qc.invalidateQueries({ queryKey: ["dev-profile"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!current) return <div className="text-sm text-muted-foreground">Loading…</div>;

  function set<K extends keyof ProfileRow>(k: K, v: ProfileRow[K]) {
    setForm({ ...(current as ProfileRow), [k]: v });
  }

  return (
    <div className="space-y-6 rounded-2xl border border-border bg-surface p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Switch
            checked={current.enabled}
            onCheckedChange={(v) => set("enabled", v)}
          />
          <Label className="text-sm">Show developer page publicly</Label>
        </div>
        <Button
          onClick={() => save.mutate(current)}
          disabled={save.isPending}
        >
          {save.isPending ? "Saving…" : "Save changes"}
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name">
          <Input
            value={current.full_name ?? ""}
            onChange={(e) => set("full_name", e.target.value)}
          />
        </Field>
        <Field label="Professional title">
          <Input
            value={current.professional_title ?? ""}
            onChange={(e) => set("professional_title", e.target.value)}
            placeholder="Full-stack developer · BCA student"
          />
        </Field>
        <Field label="Email" className="sm:col-span-2">
          <Input
            type="email"
            value={current.email ?? ""}
            onChange={(e) => set("email", e.target.value)}
          />
        </Field>
        <Field label="Photo URL">
          <Input
            value={current.photo_url ?? ""}
            onChange={(e) => set("photo_url", e.target.value)}
            placeholder="https://…"
          />
        </Field>
        <Field label="Resume URL (PDF)">
          <Input
            value={current.resume_url ?? ""}
            onChange={(e) => set("resume_url", e.target.value)}
            placeholder="https://…"
          />
        </Field>
        <Field label="GitHub username">
          <Input
            value={current.github_username ?? ""}
            onChange={(e) => set("github_username", e.target.value)}
            placeholder="TheAKSHAYY"
          />
        </Field>
        <Field label="Hero primary CTA label">
          <Input
            value={current.hero_cta_primary_label ?? ""}
            onChange={(e) => set("hero_cta_primary_label", e.target.value)}
          />
        </Field>
      </div>

      <Field label="Short intro (hero subtitle)">
        <Textarea
          rows={3}
          value={current.short_intro ?? ""}
          onChange={(e) => set("short_intro", e.target.value)}
        />
      </Field>

      <Field label="Bio">
        <Textarea
          rows={5}
          value={current.bio ?? ""}
          onChange={(e) => set("bio", e.target.value)}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Education">
          <Textarea
            rows={3}
            value={current.education ?? ""}
            onChange={(e) => set("education", e.target.value)}
          />
        </Field>
        <Field label="Current goal">
          <Textarea
            rows={3}
            value={current.current_goal ?? ""}
            onChange={(e) => set("current_goal", e.target.value)}
          />
        </Field>
        <Field label="Career objective">
          <Textarea
            rows={3}
            value={current.career_objective ?? ""}
            onChange={(e) => set("career_objective", e.target.value)}
          />
        </Field>
        <Field label="Interests">
          <Textarea
            rows={3}
            value={current.interests ?? ""}
            onChange={(e) => set("interests", e.target.value)}
          />
        </Field>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

/* ──────────────── Social ──────────────── */

type SocialRow = {
  id: string;
  platform: string;
  url: string;
  label: string | null;
  enabled: boolean;
  sort_order: number;
};

const PLATFORMS = [
  "github",
  "linkedin",
  "instagram",
  "twitter",
  "youtube",
  "portfolio",
  "email",
  "other",
];

function SocialEditor() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin-dev-social"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("developer_social_links")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as SocialRow[];
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-dev-social"] });
    qc.invalidateQueries({ queryKey: ["dev-social"] });
  };

  const upsert = useMutation({
    mutationFn: async (row: Partial<SocialRow> & { platform: string; url: string }) => {
      if (row.id) {
        const { error } = await supabase
          .from("developer_social_links")
          .update(row)
          .eq("id", row.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("developer_social_links")
          .insert(row);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Saved");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("developer_social_links")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Removed");
      invalidate();
    },
  });

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-surface p-6">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-base font-semibold">Social links</h3>
        <SocialDialog
          onSubmit={(v) => upsert.mutate(v)}
          trigger={
            <Button size="sm">
              <Plus className="mr-1 h-4 w-4" /> Add link
            </Button>
          }
        />
      </div>

      <ul className="divide-y divide-border">
        {(data ?? []).map((s) => (
          <li key={s.id} className="flex items-center gap-3 py-3">
            <Badge variant="secondary" className="capitalize">
              {s.platform}
            </Badge>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm">{s.url}</div>
              {s.label && (
                <div className="truncate text-xs text-muted-foreground">{s.label}</div>
              )}
            </div>
            <Switch
              checked={s.enabled}
              onCheckedChange={(v) =>
                upsert.mutate({ id: s.id, platform: s.platform, url: s.url, enabled: v })
              }
            />
            <SocialDialog
              initial={s}
              onSubmit={(v) => upsert.mutate({ ...v, id: s.id })}
              trigger={
                <Button size="icon" variant="ghost">
                  <Pencil className="h-4 w-4" />
                </Button>
              }
            />
            <Button
              size="icon"
              variant="ghost"
              onClick={() => remove.mutate(s.id)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </li>
        ))}
        {(data ?? []).length === 0 && (
          <li className="py-6 text-center text-sm text-muted-foreground">
            No links yet.
          </li>
        )}
      </ul>
    </div>
  );
}

function SocialDialog({
  initial,
  onSubmit,
  trigger,
}: {
  initial?: SocialRow;
  onSubmit: (v: { platform: string; url: string; label: string | null; sort_order: number; enabled: boolean }) => void;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState(initial?.platform ?? "github");
  const [url, setUrl] = useState(initial?.url ?? "");
  const [label, setLabel] = useState(initial?.label ?? "");
  const [order, setOrder] = useState(initial?.sort_order ?? 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? "Edit link" : "Add link"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Field label="Platform">
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PLATFORMS.map((p) => (
                  <SelectItem key={p} value={p} className="capitalize">
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="URL">
            <Input value={url} onChange={(e) => setUrl(e.target.value)} />
          </Field>
          <Field label="Display label (optional)">
            <Input value={label} onChange={(e) => setLabel(e.target.value)} />
          </Field>
          <Field label="Sort order">
            <Input
              type="number"
              value={order}
              onChange={(e) => setOrder(Number(e.target.value))}
            />
          </Field>
        </div>
        <DialogFooter>
          <Button
            onClick={() => {
              if (!url) return toast.error("URL required");
              onSubmit({
                platform,
                url,
                label: label || null,
                sort_order: order,
                enabled: initial?.enabled ?? true,
              });
              setOpen(false);
            }}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ──────────────── Projects ──────────────── */

type ProjectRow = {
  id: string;
  name: string;
  description: string | null;
  thumbnail_url: string | null;
  tech_stack: string[];
  github_url: string | null;
  live_url: string | null;
  category: string | null;
  status: string;
  featured: boolean;
  sort_order: number;
};

function ProjectsEditor() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin-dev-projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("developer_projects")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ProjectRow[];
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-dev-projects"] });
    qc.invalidateQueries({ queryKey: ["dev-projects"] });
  };

  const upsert = useMutation({
    mutationFn: async (row: Partial<ProjectRow> & { name: string }) => {
      if (row.id) {
        const { error } = await supabase
          .from("developer_projects")
          .update(row)
          .eq("id", row.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("developer_projects")
          .insert(row);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Saved");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("developer_projects")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Removed");
      invalidate();
    },
  });

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-surface p-6">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-base font-semibold">Projects</h3>
        <ProjectDialog
          onSubmit={(v) => upsert.mutate(v)}
          trigger={
            <Button size="sm">
              <Plus className="mr-1 h-4 w-4" /> Add project
            </Button>
          }
        />
      </div>

      <ul className="divide-y divide-border">
        {(data ?? []).map((p) => (
          <li key={p.id} className="flex items-center gap-3 py-3">
            <div className="h-12 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
              {p.thumbnail_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.thumbnail_url} alt="" className="h-full w-full object-cover" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate font-medium">{p.name}</span>
                {p.featured && <Badge className="text-[10px]">Featured</Badge>}
                <Badge variant="outline" className="text-[10px]">
                  {p.status}
                </Badge>
              </div>
              {p.description && (
                <div className="truncate text-xs text-muted-foreground">{p.description}</div>
              )}
            </div>
            <ProjectDialog
              initial={p}
              onSubmit={(v) => upsert.mutate({ ...v, id: p.id })}
              trigger={
                <Button size="icon" variant="ghost">
                  <Pencil className="h-4 w-4" />
                </Button>
              }
            />
            <Button size="icon" variant="ghost" onClick={() => remove.mutate(p.id)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </li>
        ))}
        {(data ?? []).length === 0 && (
          <li className="py-6 text-center text-sm text-muted-foreground">
            No projects yet.
          </li>
        )}
      </ul>
    </div>
  );
}

function ProjectDialog({
  initial,
  onSubmit,
  trigger,
}: {
  initial?: ProjectRow;
  onSubmit: (v: Partial<ProjectRow> & { name: string }) => void;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [thumbnail, setThumbnail] = useState(initial?.thumbnail_url ?? "");
  const [tech, setTech] = useState((initial?.tech_stack ?? []).join(", "));
  const [github, setGithub] = useState(initial?.github_url ?? "");
  const [live, setLive] = useState(initial?.live_url ?? "");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [status, setStatus] = useState(initial?.status ?? "published");
  const [featured, setFeatured] = useState(initial?.featured ?? false);
  const [order, setOrder] = useState(initial?.sort_order ?? 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit project" : "Add project"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Field label="Name">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Description">
            <Textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Thumbnail URL">
              <Input value={thumbnail} onChange={(e) => setThumbnail(e.target.value)} />
            </Field>
            <Field label="Category">
              <Input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Web · Mobile · AI"
              />
            </Field>
            <Field label="GitHub URL">
              <Input value={github} onChange={(e) => setGithub(e.target.value)} />
            </Field>
            <Field label="Live URL">
              <Input value={live} onChange={(e) => setLive(e.target.value)} />
            </Field>
          </div>
          <Field label="Tech stack (comma-separated)">
            <Input
              value={tech}
              onChange={(e) => setTech(e.target.value)}
              placeholder="React, TypeScript, Supabase"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Status">
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Sort order">
              <Input
                type="number"
                value={order}
                onChange={(e) => setOrder(Number(e.target.value))}
              />
            </Field>
            <div className="flex items-end gap-2">
              <Switch checked={featured} onCheckedChange={setFeatured} />
              <Label>Featured</Label>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={() => {
              if (!name) return toast.error("Name required");
              onSubmit({
                name,
                description: description || null,
                thumbnail_url: thumbnail || null,
                tech_stack: tech
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean),
                github_url: github || null,
                live_url: live || null,
                category: category || null,
                status,
                featured,
                sort_order: order,
              });
              setOpen(false);
            }}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ──────────────── Skills ──────────────── */

type SkillRow = {
  id: string;
  name: string;
  category: string;
  icon: string | null;
  sort_order: number;
  enabled: boolean;
};

const SKILL_CATEGORIES = ["language", "framework", "database", "tool", "technology"];

function SkillsEditor() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin-dev-skills"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("developer_skills")
        .select("*")
        .order("category")
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as SkillRow[];
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-dev-skills"] });
    qc.invalidateQueries({ queryKey: ["dev-skills"] });
  };

  const [name, setName] = useState("");
  const [category, setCategory] = useState("language");

  const add = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Name required");
      const { error } = await supabase
        .from("developer_skills")
        .insert({ name: name.trim(), category });
      if (error) throw error;
    },
    onSuccess: () => {
      setName("");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("developer_skills")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return (
    <div className="space-y-6 rounded-2xl border border-border bg-surface p-6">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="New skill" className="flex-1 min-w-[200px]">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="React"
          />
        </Field>
        <Field label="Category">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SKILL_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c} className="capitalize">
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Button onClick={() => add.mutate()} disabled={add.isPending}>
          <Plus className="mr-1 h-4 w-4" /> Add
        </Button>
      </div>

      <div className="space-y-4">
        {SKILL_CATEGORIES.map((cat) => {
          const list = (data ?? []).filter((s) => s.category === cat);
          if (list.length === 0) return null;
          return (
            <div key={cat}>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {cat}
              </h4>
              <div className="flex flex-wrap gap-2">
                {list.map((s) => (
                  <span
                    key={s.id}
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/30 px-3 py-1 text-sm"
                  >
                    {s.name}
                    <button
                      onClick={() => remove.mutate(s.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          );
        })}
        {(data ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">No skills yet.</p>
        )}
      </div>
    </div>
  );
}

/* ──────────────── Achievements ──────────────── */

type AchievementRow = {
  id: string;
  title: string;
  kind: string;
  issuer: string | null;
  description: string | null;
  date_awarded: string | null;
  url: string | null;
  image_url: string | null;
  sort_order: number;
  enabled: boolean;
};

const ACH_KINDS = ["certificate", "award", "hackathon", "open-source", "badge"];

function AchievementsEditor() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin-dev-achievements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("developer_achievements")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as AchievementRow[];
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-dev-achievements"] });
    qc.invalidateQueries({ queryKey: ["dev-achievements"] });
  };

  const upsert = useMutation({
    mutationFn: async (row: Partial<AchievementRow> & { title: string }) => {
      if (row.id) {
        const { error } = await supabase
          .from("developer_achievements")
          .update(row)
          .eq("id", row.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("developer_achievements")
          .insert(row);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Saved");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("developer_achievements")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-surface p-6">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-base font-semibold">Achievements</h3>
        <AchievementDialog
          onSubmit={(v) => upsert.mutate(v)}
          trigger={
            <Button size="sm">
              <Plus className="mr-1 h-4 w-4" /> Add achievement
            </Button>
          }
        />
      </div>

      <ul className="divide-y divide-border">
        {(data ?? []).map((a) => (
          <li key={a.id} className="flex items-center gap-3 py-3">
            <Badge variant="secondary" className="capitalize">
              {a.kind}
            </Badge>
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{a.title}</div>
              {a.issuer && (
                <div className="truncate text-xs text-muted-foreground">{a.issuer}</div>
              )}
            </div>
            <AchievementDialog
              initial={a}
              onSubmit={(v) => upsert.mutate({ ...v, id: a.id })}
              trigger={
                <Button size="icon" variant="ghost">
                  <Pencil className="h-4 w-4" />
                </Button>
              }
            />
            <Button size="icon" variant="ghost" onClick={() => remove.mutate(a.id)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </li>
        ))}
        {(data ?? []).length === 0 && (
          <li className="py-6 text-center text-sm text-muted-foreground">
            No achievements yet.
          </li>
        )}
      </ul>
    </div>
  );
}

function AchievementDialog({
  initial,
  onSubmit,
  trigger,
}: {
  initial?: AchievementRow;
  onSubmit: (v: Partial<AchievementRow> & { title: string }) => void;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [kind, setKind] = useState(initial?.kind ?? "certificate");
  const [issuer, setIssuer] = useState(initial?.issuer ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [date, setDate] = useState(initial?.date_awarded ?? "");
  const [url, setUrl] = useState(initial?.url ?? "");
  const [image, setImage] = useState(initial?.image_url ?? "");
  const [order, setOrder] = useState(initial?.sort_order ?? 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit achievement" : "Add achievement"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Field label="Title">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Kind">
              <Select value={kind} onValueChange={setKind}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACH_KINDS.map((k) => (
                    <SelectItem key={k} value={k} className="capitalize">
                      {k}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Issuer">
              <Input value={issuer} onChange={(e) => setIssuer(e.target.value)} />
            </Field>
            <Field label="Date awarded">
              <Input
                type="date"
                value={date ?? ""}
                onChange={(e) => setDate(e.target.value)}
              />
            </Field>
            <Field label="Sort order">
              <Input
                type="number"
                value={order}
                onChange={(e) => setOrder(Number(e.target.value))}
              />
            </Field>
            <Field label="Link URL">
              <Input value={url} onChange={(e) => setUrl(e.target.value)} />
            </Field>
            <Field label="Image URL">
              <Input value={image} onChange={(e) => setImage(e.target.value)} />
            </Field>
          </div>
          <Field label="Description">
            <Textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>
        </div>
        <DialogFooter>
          <Button
            onClick={() => {
              if (!title) return toast.error("Title required");
              onSubmit({
                title,
                kind,
                issuer: issuer || null,
                description: description || null,
                date_awarded: date || null,
                url: url || null,
                image_url: image || null,
                sort_order: order,
                enabled: initial?.enabled ?? true,
              });
              setOpen(false);
            }}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
