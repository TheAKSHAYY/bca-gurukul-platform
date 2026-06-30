import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Eye,
  EyeOff,
  ExternalLink,
  Plus,
  Save,
  Send,
  Trash2,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/admin/homepage")({
  component: HomepageBuilder,
});

/* ---------------- Types & schemas ---------------- */

type SectionKind =
  | "hero"
  | "trust_bar"
  | "about"
  | "features"
  | "why_us"
  | "universities"
  | "popular_courses"
  | "categories"
  | "statistics"
  | "stats"
  | "testimonials"
  | "faculty"
  | "learning_process"
  | "journey"
  | "semester_overview"
  | "benefits"
  | "faq"
  | "blog"
  | "contact"
  | "newsletter"
  | "cta"
  | "footer"
  | "custom_richtext";

type Section = {
  id: string;
  type: SectionKind;
  position: number;
  enabled: boolean;
  status: "draft" | "published";
  title: string | null;
  content: Record<string, unknown>;
  style: Record<string, unknown>;
  published_content: Record<string, unknown>;
  published_style: Record<string, unknown>;
};

const KIND_META: Record<SectionKind, { label: string; description: string }> = {
  hero: { label: "Hero", description: "Top-of-page banner with title, subtitle, CTA." },
  trust_bar: { label: "Trust Bar", description: "Compact metrics / social-proof strip." },
  about: { label: "About", description: "Story or mission block." },
  features: { label: "Features", description: "Grid of product features." },
  why_us: { label: "Why Choose Us", description: "Reasons / value props." },
  universities: { label: "Universities", description: "Partner / accreditation list." },
  popular_courses: { label: "Popular Courses", description: "Highlighted courses grid." },
  categories: { label: "Categories", description: "Subject categories grid." },
  statistics: { label: "Statistics", description: "Big numbers row." },
  stats: { label: "Stats (legacy)", description: "Legacy stats block." },
  testimonials: { label: "Testimonials", description: "Student reviews carousel." },
  faculty: { label: "Faculty", description: "Teachers / mentors grid." },
  learning_process: { label: "Learning Process", description: "How it works steps." },
  journey: { label: "Journey", description: "Student journey timeline." },
  semester_overview: { label: "Semester Overview", description: "Semester-wise summary." },
  benefits: { label: "Benefits", description: "Benefit cards." },
  faq: { label: "FAQ", description: "Frequently asked questions." },
  blog: { label: "Blog", description: "Latest blog posts." },
  contact: { label: "Contact", description: "Contact details / form." },
  newsletter: { label: "Newsletter", description: "Email subscription block." },
  cta: { label: "Call to Action", description: "Conversion banner." },
  footer: { label: "Footer", description: "Footer columns & links." },
  custom_richtext: { label: "Custom Rich Text", description: "Free-form rich text." },
};

const KIND_ORDER: SectionKind[] = [
  "hero",
  "trust_bar",
  "about",
  "features",
  "why_us",
  "universities",
  "popular_courses",
  "categories",
  "statistics",
  "stats",
  "testimonials",
  "faculty",
  "learning_process",
  "journey",
  "semester_overview",
  "benefits",
  "faq",
  "blog",
  "contact",
  "newsletter",
  "cta",
  "footer",
  "custom_richtext",
];

/* ---------------- Page ---------------- */

function HomepageBuilder() {
  const qc = useQueryClient();

  const { data: sections = [], isLoading } = useQuery({
    queryKey: ["admin", "homepage_sections", "v2"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("homepage_sections")
        .select(
          "id,type,position,enabled,status,title,content,style,published_content,published_style",
        )
        .order("position", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as Section[];
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin", "homepage_sections", "v2"] });
    qc.invalidateQueries({ queryKey: ["homepage_sections", "public"] });
  };

  const update = useMutation({
    mutationFn: async (p: { id: string; updates: Partial<Section> }) => {
      const { error } = await supabase
        .from("homepage_sections")
        .update(p.updates as never)
        .eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
    onError: (e: Error) => toast.error(e.message),
  });

  const create = useMutation({
    mutationFn: async (kind: SectionKind) => {
      const nextPos = (sections.at(-1)?.position ?? 0) + 10;
      const { error } = await supabase.from("homepage_sections").insert({
        type: kind as never,
        position: nextPos,
        enabled: false,
        status: "draft",
        content: {},
        style: {},
        published_content: {},
        published_style: {},
        title: KIND_META[kind].label,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Section added (hidden)");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const duplicate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("duplicate_homepage_section", { _id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Section duplicated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("homepage_sections").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Section deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const swap = (a: Section, b: Section) => {
    update.mutate({ id: a.id, updates: { position: b.position } });
    update.mutate({ id: b.id, updates: { position: a.position } });
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="font-display text-3xl font-semibold">Website Builder</h1>
          <p className="text-sm text-muted-foreground">
            WordPress-style page composer. Add, edit, reorder, hide, publish — no code.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/" target="_blank">
              <ExternalLink className="mr-1.5 h-4 w-4" />
              Preview site
            </Link>
          </Button>
          <AddSectionButton onAdd={(k) => create.mutate(k)} />
        </div>
      </header>

      {isLoading && (
        <p className="text-sm text-muted-foreground">Loading sections…</p>
      )}

      {!isLoading && sections.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            No sections yet. Add your first section to begin.
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {sections.map((s, i) => (
          <SectionRow
            key={s.id}
            section={s}
            canUp={i > 0}
            canDown={i < sections.length - 1}
            onUp={() => swap(s, sections[i - 1])}
            onDown={() => swap(s, sections[i + 1])}
            onToggle={() =>
              update.mutate({ id: s.id, updates: { enabled: !s.enabled } })
            }
            onSaveDraft={(patch) => update.mutate({ id: s.id, updates: patch })}
            onPublish={(patch) =>
              update.mutate({
                id: s.id,
                updates: {
                  ...patch,
                  status: "published",
                  published_content: patch.content ?? s.content,
                  published_style: patch.style ?? s.style,
                },
              })
            }
            onDuplicate={() => duplicate.mutate(s.id)}
            onDelete={() => remove.mutate(s.id)}
          />
        ))}
      </div>
    </div>
  );
}

/* ---------------- Add-section picker ---------------- */

function AddSectionButton({ onAdd }: { onAdd: (k: SectionKind) => void }) {
  const [kind, setKind] = useState<SectionKind | "">("");
  return (
    <div className="flex items-center gap-2">
      <Select value={kind} onValueChange={(v) => setKind(v as SectionKind)}>
        <SelectTrigger className="w-[210px]">
          <SelectValue placeholder="Choose section type…" />
        </SelectTrigger>
        <SelectContent>
          {KIND_ORDER.map((k) => (
            <SelectItem key={k} value={k}>
              {KIND_META[k].label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        size="sm"
        disabled={!kind}
        onClick={() => {
          if (kind) onAdd(kind);
          setKind("");
        }}
      >
        <Plus className="mr-1.5 h-4 w-4" />
        Add section
      </Button>
    </div>
  );
}

/* ---------------- Section row ---------------- */

type RowProps = {
  section: Section;
  canUp: boolean;
  canDown: boolean;
  onUp: () => void;
  onDown: () => void;
  onToggle: () => void;
  onSaveDraft: (patch: Partial<Section>) => void;
  onPublish: (patch: Partial<Section>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
};

function SectionRow(p: RowProps) {
  const { section } = p;
  const meta = KIND_META[section.type] ?? {
    label: section.type,
    description: "",
  };

  const [title, setTitle] = useState(section.title ?? "");
  const [content, setContent] = useState<Record<string, unknown>>(section.content);
  const [style, setStyle] = useState<Record<string, unknown>>(section.style);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setTitle(section.title ?? "");
    setContent(section.content ?? {});
    setStyle(section.style ?? {});
  }, [section.id, section.title, section.content, section.style]);

  const dirty = useMemo(() => {
    return (
      JSON.stringify(content) !== JSON.stringify(section.content) ||
      JSON.stringify(style) !== JSON.stringify(section.style) ||
      title !== (section.title ?? "")
    );
  }, [content, style, title, section]);

  const hasUnpublished = useMemo(
    () =>
      JSON.stringify(section.content) !== JSON.stringify(section.published_content) ||
      JSON.stringify(section.style) !== JSON.stringify(section.published_style),
    [section],
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <Button size="icon" variant="ghost" disabled={!p.canUp} onClick={p.onUp} className="h-6 w-6" aria-label="Move up">
              <ArrowUp className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" variant="ghost" disabled={!p.canDown} onClick={p.onDown} className="h-6 w-6" aria-label="Move down">
              <ArrowDown className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div>
            <CardTitle className="font-display text-base">
              {title || meta.label}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {meta.label} · {meta.description}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={section.status === "published" ? "default" : "secondary"}>
            {section.status}
          </Badge>
          {hasUnpublished && (
            <Badge variant="outline" className="border-accent text-accent">
              unpublished changes
            </Badge>
          )}
          <div className="flex items-center gap-1.5 pl-1">
            <Switch
              checked={section.enabled}
              onCheckedChange={p.onToggle}
              aria-label="Visible"
            />
            {section.enabled ? (
              <Eye className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </div>
          <Button size="sm" variant="ghost" onClick={() => setOpen((o) => !o)}>
            {open ? "Close" : "Edit"}
          </Button>
        </div>
      </CardHeader>

      {open && (
        <CardContent className="space-y-5 border-t pt-5">
          <div className="grid gap-2 sm:grid-cols-[120px_1fr] sm:items-center">
            <Label htmlFor={`title-${section.id}`}>Internal title</Label>
            <Input
              id={`title-${section.id}`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={meta.label}
            />
          </div>

          <KindEditor
            kind={section.type}
            content={content}
            onChange={setContent}
            idPrefix={section.id}
          />

          <StyleEditor style={style} onChange={setStyle} idPrefix={section.id} />

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => p.onDuplicate()}
              >
                <Copy className="mr-1.5 h-4 w-4" />
                Duplicate
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
                    <Trash2 className="mr-1.5 h-4 w-4" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this section?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This permanently removes the section from your homepage. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={p.onDelete}>Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={!dirty}
                onClick={() =>
                  p.onSaveDraft({ title, content, style, status: "draft" })
                }
              >
                <Save className="mr-1.5 h-4 w-4" />
                Save draft
              </Button>
              <Button
                size="sm"
                onClick={() => p.onPublish({ title, content, style })}
              >
                <Send className="mr-1.5 h-4 w-4" />
                Publish
              </Button>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

/* ---------------- Per-kind editors ---------------- */

function KindEditor({
  kind,
  content,
  onChange,
  idPrefix,
}: {
  kind: SectionKind;
  content: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
  idPrefix: string;
}) {
  const set = (key: string, value: unknown) =>
    onChange({ ...content, [key]: value });

  // common fields used by most kinds
  const commonText = (
    <>
      <Field id={`${idPrefix}-eyebrow`} label="Eyebrow">
        <Input
          id={`${idPrefix}-eyebrow`}
          value={(content.eyebrow as string) ?? ""}
          onChange={(e) => set("eyebrow", e.target.value)}
          placeholder="Small label above the title"
        />
      </Field>
      <Field id={`${idPrefix}-headline`} label="Headline">
        <Input
          id={`${idPrefix}-headline`}
          value={(content.headline as string) ?? ""}
          onChange={(e) => set("headline", e.target.value)}
          placeholder="Main title"
        />
      </Field>
      <Field id={`${idPrefix}-subheadline`} label="Subheadline">
        <Textarea
          id={`${idPrefix}-subheadline`}
          rows={2}
          value={(content.subheadline as string) ?? ""}
          onChange={(e) => set("subheadline", e.target.value)}
          placeholder="One-sentence summary"
        />
      </Field>
      <Field id={`${idPrefix}-description`} label="Description">
        <Textarea
          id={`${idPrefix}-description`}
          rows={4}
          value={(content.description as string) ?? ""}
          onChange={(e) => set("description", e.target.value)}
          placeholder="Longer body copy"
        />
      </Field>
    </>
  );

  const buttons = (
    <ButtonsEditor
      idPrefix={idPrefix}
      buttons={(content.buttons as Array<Record<string, string>>) ?? []}
      onChange={(b) => set("buttons", b)}
    />
  );

  const image = (
    <Field id={`${idPrefix}-image`} label="Image URL">
      <Input
        id={`${idPrefix}-image`}
        value={(content.image as string) ?? ""}
        onChange={(e) => set("image", e.target.value)}
        placeholder="https://… or /path"
      />
    </Field>
  );

  const items = (
    <ItemsEditor
      idPrefix={idPrefix}
      label="Items"
      items={(content.items as Array<Record<string, string>>) ?? []}
      onChange={(it) => set("items", it)}
    />
  );

  switch (kind) {
    case "hero":
      return (
        <div className="space-y-4">
          {commonText}
          {image}
          {buttons}
        </div>
      );
    case "about":
    case "cta":
    case "newsletter":
    case "custom_richtext":
      return (
        <div className="space-y-4">
          {commonText}
          {buttons}
        </div>
      );
    case "features":
    case "why_us":
    case "benefits":
    case "popular_courses":
    case "categories":
    case "universities":
    case "faculty":
    case "learning_process":
    case "journey":
    case "blog":
    case "semester_overview":
      return (
        <div className="space-y-4">
          {commonText}
          {items}
        </div>
      );
    case "statistics":
    case "stats":
    case "trust_bar":
      return (
        <div className="space-y-4">
          {commonText}
          <ItemsEditor
            idPrefix={idPrefix}
            label="Stats"
            items={(content.items as Array<Record<string, string>>) ?? []}
            onChange={(it) => set("items", it)}
            fields={[
              { key: "value", label: "Value", placeholder: "1,200+" },
              { key: "label", label: "Label", placeholder: "Active students" },
            ]}
          />
        </div>
      );
    case "testimonials":
      return (
        <div className="space-y-4">
          {commonText}
          <ItemsEditor
            idPrefix={idPrefix}
            label="Testimonials"
            items={(content.items as Array<Record<string, string>>) ?? []}
            onChange={(it) => set("items", it)}
            fields={[
              { key: "name", label: "Name" },
              { key: "role", label: "Role" },
              { key: "quote", label: "Quote", textarea: true },
              { key: "avatar", label: "Avatar URL" },
            ]}
          />
        </div>
      );
    case "faq":
      return (
        <div className="space-y-4">
          {commonText}
          <ItemsEditor
            idPrefix={idPrefix}
            label="Questions"
            items={(content.items as Array<Record<string, string>>) ?? []}
            onChange={(it) => set("items", it)}
            fields={[
              { key: "question", label: "Question" },
              { key: "answer", label: "Answer", textarea: true },
            ]}
          />
        </div>
      );
    case "contact":
      return (
        <div className="space-y-4">
          {commonText}
          <Field id={`${idPrefix}-email`} label="Email">
            <Input
              id={`${idPrefix}-email`}
              value={(content.email as string) ?? ""}
              onChange={(e) => set("email", e.target.value)}
            />
          </Field>
          <Field id={`${idPrefix}-phone`} label="Phone">
            <Input
              id={`${idPrefix}-phone`}
              value={(content.phone as string) ?? ""}
              onChange={(e) => set("phone", e.target.value)}
            />
          </Field>
          <Field id={`${idPrefix}-address`} label="Address">
            <Textarea
              id={`${idPrefix}-address`}
              rows={2}
              value={(content.address as string) ?? ""}
              onChange={(e) => set("address", e.target.value)}
            />
          </Field>
        </div>
      );
    case "footer":
      return (
        <div className="space-y-4">
          {commonText}
          <ItemsEditor
            idPrefix={idPrefix}
            label="Footer columns"
            items={(content.columns as Array<Record<string, string>>) ?? []}
            onChange={(it) => set("columns", it)}
            fields={[
              { key: "title", label: "Column title" },
              { key: "links", label: "Links (one per line: Label|/path)", textarea: true },
            ]}
          />
          <Field id={`${idPrefix}-copyright`} label="Copyright">
            <Input
              id={`${idPrefix}-copyright`}
              value={(content.copyright as string) ?? ""}
              onChange={(e) => set("copyright", e.target.value)}
              placeholder="© 2026 BCA Gurukul"
            />
          </Field>
        </div>
      );
    default:
      return <div className="space-y-4">{commonText}</div>;
  }
}

/* ---------------- Style editor ---------------- */

function StyleEditor({
  style,
  onChange,
  idPrefix,
}: {
  style: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
  idPrefix: string;
}) {
  const set = (key: string, value: unknown) =>
    onChange({ ...style, [key]: value });
  return (
    <details className="rounded-md border bg-muted/30 p-3">
      <summary className="cursor-pointer text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Appearance
      </summary>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Field id={`${idPrefix}-bg`} label="Background color">
          <Input
            id={`${idPrefix}-bg`}
            value={(style.background as string) ?? ""}
            onChange={(e) => set("background", e.target.value)}
            placeholder="e.g. #0b1020 or hsl(var(--background))"
          />
        </Field>
        <Field id={`${idPrefix}-fg`} label="Text color">
          <Input
            id={`${idPrefix}-fg`}
            value={(style.foreground as string) ?? ""}
            onChange={(e) => set("foreground", e.target.value)}
            placeholder="e.g. #ffffff"
          />
        </Field>
        <Field id={`${idPrefix}-gradient`} label="Gradient (CSS)">
          <Input
            id={`${idPrefix}-gradient`}
            value={(style.gradient as string) ?? ""}
            onChange={(e) => set("gradient", e.target.value)}
            placeholder="linear-gradient(135deg,#…,#…)"
          />
        </Field>
        <Field id={`${idPrefix}-padding`} label="Vertical padding">
          <Select
            value={(style.padding as string) ?? "lg"}
            onValueChange={(v) => set("padding", v)}
          >
            <SelectTrigger id={`${idPrefix}-padding`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sm">Small</SelectItem>
              <SelectItem value="md">Medium</SelectItem>
              <SelectItem value="lg">Large</SelectItem>
              <SelectItem value="xl">Extra large</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>
    </details>
  );
}

/* ---------------- Buttons / items helpers ---------------- */

function ButtonsEditor({
  idPrefix,
  buttons,
  onChange,
}: {
  idPrefix: string;
  buttons: Array<Record<string, string>>;
  onChange: (b: Array<Record<string, string>>) => void;
}) {
  const update = (i: number, key: string, value: string) => {
    const next = [...buttons];
    next[i] = { ...next[i], [key]: value };
    onChange(next);
  };
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Buttons</Label>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onChange([...buttons, { label: "", href: "", variant: "default" }])}
        >
          <Plus className="mr-1 h-3.5 w-3.5" />
          Add button
        </Button>
      </div>
      {buttons.map((b, i) => (
        <div key={i} className="grid gap-2 rounded-md border p-3 sm:grid-cols-[1fr_1fr_140px_40px]">
          <Input
            placeholder="Label"
            value={b.label ?? ""}
            onChange={(e) => update(i, "label", e.target.value)}
            aria-label={`${idPrefix}-btn-label-${i}`}
          />
          <Input
            placeholder="/path or https://…"
            value={b.href ?? ""}
            onChange={(e) => update(i, "href", e.target.value)}
            aria-label={`${idPrefix}-btn-href-${i}`}
          />
          <Select value={b.variant ?? "default"} onValueChange={(v) => update(i, "variant", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Primary</SelectItem>
              <SelectItem value="outline">Outline</SelectItem>
              <SelectItem value="ghost">Ghost</SelectItem>
              <SelectItem value="secondary">Secondary</SelectItem>
            </SelectContent>
          </Select>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onChange(buttons.filter((_, j) => j !== i))}
            aria-label="Remove"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}

function ItemsEditor({
  idPrefix,
  label,
  items,
  onChange,
  fields = [
    { key: "title", label: "Title" },
    { key: "description", label: "Description", textarea: true },
    { key: "icon", label: "Icon / image URL" },
  ],
}: {
  idPrefix: string;
  label: string;
  items: Array<Record<string, string>>;
  onChange: (i: Array<Record<string, string>>) => void;
  fields?: Array<{ key: string; label: string; placeholder?: string; textarea?: boolean }>;
}) {
  const update = (i: number, key: string, value: string) => {
    const next = [...items];
    next[i] = { ...next[i], [key]: value };
    onChange(next);
  };
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
        <Button size="sm" variant="outline" onClick={() => onChange([...items, {}])}>
          <Plus className="mr-1 h-3.5 w-3.5" />
          Add item
        </Button>
      </div>
      {items.map((it, i) => (
        <div key={i} className="space-y-2 rounded-md border p-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Item {i + 1}</span>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => onChange(items.filter((_, j) => j !== i))}
              aria-label="Remove item"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="grid gap-2">
            {fields.map((f) =>
              f.textarea ? (
                <Textarea
                  key={f.key}
                  rows={2}
                  placeholder={f.placeholder ?? f.label}
                  value={it[f.key] ?? ""}
                  onChange={(e) => update(i, f.key, e.target.value)}
                  aria-label={`${idPrefix}-item-${i}-${f.key}`}
                />
              ) : (
                <Input
                  key={f.key}
                  placeholder={f.placeholder ?? f.label}
                  value={it[f.key] ?? ""}
                  onChange={(e) => update(i, f.key, e.target.value)}
                  aria-label={`${idPrefix}-item-${i}-${f.key}`}
                />
              ),
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}
