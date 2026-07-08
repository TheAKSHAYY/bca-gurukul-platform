import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { FileText, FileType, Video, Link as LinkIcon, ClipboardList, FileImage, UploadCloud } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import {
  createContent, updateContent, listSubjectsFlat,
  type ContentItem, type ContentType,
} from "@/lib/content.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const TYPE_META: Record<ContentType, { label: string; icon: LucideIcon; accept?: string; needsFile: boolean; needsUrl: boolean }> = {
  note: { label: "Note", icon: FileText, accept: ".pdf,.doc,.docx,.md,.txt", needsFile: false, needsUrl: false },
  pdf: { label: "PDF", icon: FileType, accept: ".pdf", needsFile: true, needsUrl: false },
  ppt: { label: "Slides", icon: FileImage, accept: ".ppt,.pptx,.pdf", needsFile: true, needsUrl: false },
  video: { label: "Video", icon: Video, needsFile: false, needsUrl: true },
  assignment: { label: "Assignment", icon: ClipboardList, accept: ".pdf,.doc,.docx", needsFile: false, needsUrl: false },
  link: { label: "External link", icon: LinkIcon, needsFile: false, needsUrl: true },
};

export function ContentEditor({
  initialType,
  initial,
  contentId,
  onSaved,
}: {
  initialType: ContentType;
  initial?: Partial<ContentItem>;
  contentId?: string;
  onSaved?: (id: string) => void;
}) {
  const qc = useQueryClient();
  const create = useServerFn(createContent);
  const update = useServerFn(updateContent);
  const listSubjects = useServerFn(listSubjectsFlat);

  const [type, setType] = useState<ContentType>(initialType);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [subjectId, setSubjectId] = useState<string>(initial?.subject_id ?? "");
  const [visibility, setVisibility] = useState<"public" | "students" | "private">(
    (initial?.visibility as "public" | "students" | "private") ?? "students",
  );
  const [fileUrl, setFileUrl] = useState(initial?.file_url ?? "");
  const [tagsText, setTagsText] = useState((initial?.tags ?? []).join(", "));
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const meta = TYPE_META[type];

  const { data: subjects } = useQuery({
    queryKey: ["admin", "subjects-flat"],
    queryFn: () => listSubjects(),
  });

  const saveMutation = useMutation({
    mutationFn: async (status: "draft" | "published") => {
      if (!title.trim()) throw new Error("Title is required");
      if (meta.needsUrl && !fileUrl.trim()) throw new Error("URL is required");

      let file_bucket: string | null = initial?.file_bucket ?? null;
      let file_path: string | null = initial?.file_path ?? null;
      let file_mime: string | null = initial?.file_mime ?? null;
      let file_size_bytes: number | null = initial?.file_size_bytes ?? null;

      if (file) {
        setBusy(true);
        const bucket = type === "video" ? "media" : "notes";
        const path = `content/${type}/${Date.now()}-${file.name}`;
        const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
        if (upErr) throw new Error(upErr.message);
        file_bucket = bucket;
        file_path = path;
        file_mime = file.type;
        file_size_bytes = file.size;
      }

      const tags = tagsText.split(",").map((t) => t.trim()).filter(Boolean);
      const payload = {
        type,
        title: title.trim(),
        description: description || null,
        subject_id: subjectId || null,
        unit_id: initial?.unit_id ?? null,
        file_bucket,
        file_path,
        file_mime,
        file_size_bytes,
        file_url: fileUrl || null,
        thumbnail_path: initial?.thumbnail_path ?? null,
        tags,
        visibility,
        status,
      };

      if (contentId) {
        await update({ data: { id: contentId, patch: payload } });
        return contentId;
      } else {
        const res = await create({ data: payload });
        return res.id as string;
      }
    },
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: ["admin", "content"] });
      toast.success(contentId ? "Content updated" : "Content created");
      setBusy(false);
      if (!contentId) onSaved?.(id);
    },
    onError: (e: Error) => { setBusy(false); toast.error(e.message); },
  });

  return (
    <div className="space-y-6">
      {!contentId && (
        <div>
          <Label className="mb-2 block">Type</Label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {(Object.keys(TYPE_META) as ContentType[]).map((t) => {
              const m = TYPE_META[t];
              const active = t === type;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border p-3 text-left text-sm transition",
                    active
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border bg-surface hover:border-primary/40",
                  )}
                >
                  <m.icon className="h-4 w-4 shrink-0" />
                  <span className="font-medium">{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid gap-4 rounded-xl border border-border/70 bg-surface p-4 sm:p-5">
        <div>
          <Label htmlFor="title">Title *</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Data Structures — Unit 1 Notes"
            className="mt-1.5"
          />
        </div>

        <div>
          <Label htmlFor="desc">Description</Label>
          <Textarea
            id="desc"
            value={description ?? ""}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="mt-1.5"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Subject</Label>
            <Select value={subjectId} onValueChange={setSubjectId}>
              <SelectTrigger className="mt-1.5"><SelectValue placeholder="Choose subject" /></SelectTrigger>
              <SelectContent>
                {(subjects ?? []).map((s: unknown) => {
                  const row = s as {
                    id: string; title: string;
                    semester?: { number?: number; course?: { title?: string } | null } | null;
                  };
                  return (
                    <SelectItem key={row.id} value={row.id}>
                      {row.semester?.course?.title ?? ""} · Sem {row.semester?.number} · {row.title}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Visibility</Label>
            <Select value={visibility} onValueChange={(v) => setVisibility(v as typeof visibility)}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Public (anyone)</SelectItem>
                <SelectItem value="students">Students only</SelectItem>
                <SelectItem value="private">Private (admin only)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {meta.needsUrl && (
          <div>
            <Label htmlFor="url">{type === "video" ? "Video URL" : "External URL"} *</Label>
            <Input
              id="url"
              type="url"
              value={fileUrl}
              onChange={(e) => setFileUrl(e.target.value)}
              placeholder="https://…"
              className="mt-1.5"
            />
          </div>
        )}

        {meta.accept && (
          <div>
            <Label htmlFor="file">
              File {meta.needsFile ? "*" : "(optional)"}
              {initial?.file_path && !file && (
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  Existing: {initial.file_path.split("/").pop()}
                </span>
              )}
            </Label>
            <div className="mt-1.5 flex items-center gap-2">
              <UploadCloud className="h-4 w-4 shrink-0 text-muted-foreground" />
              <Input
                id="file"
                type="file"
                accept={meta.accept}
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>
        )}

        <div>
          <Label htmlFor="tags">Tags</Label>
          <Input
            id="tags"
            value={tagsText}
            onChange={(e) => setTagsText(e.target.value)}
            placeholder="dsa, arrays, sorting"
            className="mt-1.5"
          />
          <p className="mt-1 text-xs text-muted-foreground">Comma-separated.</p>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={busy || saveMutation.isPending}
          onClick={() => saveMutation.mutate("draft")}
        >
          Save draft
        </Button>
        <Button
          type="button"
          disabled={busy || saveMutation.isPending}
          onClick={() => saveMutation.mutate("published")}
        >
          {saveMutation.isPending ? "Saving…" : contentId ? "Save & publish" : "Publish"}
        </Button>
      </div>
    </div>
  );
}
