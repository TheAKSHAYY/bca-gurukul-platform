import { useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Download, FileText, ImageIcon, Loader2, Trash2, Upload, Video } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/admin/media")({
  head: () => ({ meta: [{ title: "Media library · Admin · BCA Gurukul" }] }),
  component: MediaAdmin,
});

type MediaRow = {
  id: string;
  bucket: string;
  object_key: string;
  filename: string;
  mime_type: string | null;
  kind: "image" | "pdf" | "video" | "audio" | "document" | "other";
  byte_size: number | null;
  alt_text: string | null;
  created_at: string;
};

const BUCKETS = ["media", "notes", "papers", "assignments", "branding"] as const;

function detectKind(mime: string): MediaRow["kind"] {
  if (mime.startsWith("image/")) return "image";
  if (mime === "application/pdf") return "pdf";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  if (mime.includes("word") || mime.includes("document") || mime.includes("spreadsheet")) return "document";
  return "other";
}

function formatBytes(n: number | null) {
  if (!n) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(1)} ${units[i]}`;
}

function KindIcon({ kind }: { kind: MediaRow["kind"] }) {
  if (kind === "image") return <ImageIcon className="h-5 w-5" />;
  if (kind === "video") return <Video className="h-5 w-5" />;
  return <FileText className="h-5 w-5" />;
}

function MediaAdmin() {
  const qc = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [bucket, setBucket] = useState<(typeof BUCKETS)[number]>("media");
  const [uploading, setUploading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "media"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("media_assets")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as MediaRow[];
    },
  });

  const uploadFiles = async (files: FileList) => {
    setUploading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id ?? null;
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop() ?? "bin";
        const key = `${new Date().getFullYear()}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from(bucket)
          .upload(key, file, { contentType: file.type, upsert: false });
        if (upErr) throw upErr;
        const { error: insErr } = await supabase.from("media_assets").insert({
          bucket,
          object_key: key,
          filename: file.name,
          mime_type: file.type,
          kind: detectKind(file.type),
          byte_size: file.size,
          uploaded_by: uid,
        });
        if (insErr) throw insErr;
      }
      toast.success("Uploaded");
      qc.invalidateQueries({ queryKey: ["admin", "media"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const removeMutation = useMutation({
    mutationFn: async (row: MediaRow) => {
      const { error: rmErr } = await supabase.storage.from(row.bucket).remove([row.object_key]);
      if (rmErr) throw rmErr;
      const { error } = await supabase.from("media_assets").delete().eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["admin", "media"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const download = async (row: MediaRow) => {
    const { data, error } = await supabase.storage.from(row.bucket).createSignedUrl(row.object_key, 60);
    if (error) {
      toast.error(error.message);
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link to="/admin" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to admin
          </Link>
          <div className="flex items-center gap-2">
            <Select value={bucket} onValueChange={(v) => setBucket(v as typeof bucket)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BUCKETS.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => fileInput.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              Upload
            </Button>
            <input
              ref={fileInput}
              type="file"
              multiple
              hidden
              onChange={(e) => e.target.files && uploadFiles(e.target.files)}
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="font-display text-3xl font-semibold text-foreground">Media library</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Central registry of all uploaded files. Pick a target bucket above before uploading. Downloads use short-lived signed URLs.
        </p>

        <section className="mt-8">
          {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!isLoading && data && data.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
              <p className="font-display text-lg text-foreground">Library is empty</p>
              <p className="mt-1 text-sm text-muted-foreground">Upload images, PDFs, videos or documents to start.</p>
            </div>
          )}
          {data && data.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-border bg-surface">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">File</th>
                    <th className="px-4 py-3">Bucket</th>
                    <th className="px-4 py-3">Kind</th>
                    <th className="px-4 py-3">Size</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.map((row) => (
                    <tr key={row.id}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
                            <KindIcon kind={row.kind} />
                          </div>
                          <div>
                            <div className="font-medium text-foreground">{row.filename}</div>
                            <div className="font-mono text-xs text-muted-foreground">{row.object_key}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary">{row.bucket}</Badge>
                      </td>
                      <td className="px-4 py-3 capitalize">{row.kind}</td>
                      <td className="px-4 py-3">{formatBytes(row.byte_size)}</td>
                      <td className="px-4 py-3 text-right">
                        <Button size="sm" variant="ghost" onClick={() => download(row)}>
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            if (confirm(`Delete ${row.filename}?`)) removeMutation.mutate(row);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
