import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  FileText, Search, Plus, Trash2, Copy, Archive, CheckCircle2, XCircle,
  MoreHorizontal, FileType, Video, Link as LinkIcon, ClipboardList, FileImage,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import {
  listContent,
  bulkUpdateContent,
  deleteContent,
  duplicateContent,
  type ContentItem,
  type ContentType,
} from "@/lib/content.functions";
import { PageHeader } from "@/components/admin/ui/page-header";
import { StatusBadge } from "@/components/admin/ui/status-badge";
import { TableSkeleton } from "@/components/admin/ui/table-skeleton";
import { ConfirmDialog } from "@/components/admin/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_authenticated/admin/content")({
  head: () => ({ meta: [{ title: "Content · Admin · BCA Gurukul" }] }),
  component: ContentPage,
});

const TYPE_ICON: Record<ContentType, LucideIcon> = {
  note: FileText,
  pdf: FileType,
  ppt: FileImage,
  video: Video,
  assignment: ClipboardList,
  link: LinkIcon,
};

const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All types" },
  { value: "note", label: "Notes" },
  { value: "pdf", label: "PDFs" },
  { value: "ppt", label: "Slides" },
  { value: "video", label: "Videos" },
  { value: "assignment", label: "Assignments" },
  { value: "link", label: "Links" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
];

function ContentPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const list = useServerFn(listContent);
  const bulk = useServerFn(bulkUpdateContent);
  const del = useServerFn(deleteContent);
  const dup = useServerFn(duplicateContent);

  const [search, setSearch] = useState("");
  const [type, setType] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "content", { type, status, search, page }],
    queryFn: () => list({ data: { type, status, search, page, pageSize, sort: "created_at", dir: "desc" } }),
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin", "content"] });

  const bulkMutation = useMutation({
    mutationFn: bulk,
    onSuccess: () => { invalidate(); setSelected(new Set()); toast.success("Updated"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const deleteMutation = useMutation({
    mutationFn: del,
    onSuccess: () => { invalidate(); setSelected(new Set()); setConfirmDelete(false); toast.success("Deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const duplicateMutation = useMutation({
    mutationFn: dup,
    onSuccess: () => { invalidate(); toast.success("Duplicated"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const allChecked = items.length > 0 && items.every((i) => selected.has(i.id));
  const toggleAll = () => {
    if (allChecked) setSelected(new Set());
    else setSelected(new Set(items.map((i) => i.id)));
  };
  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const selectedIds = useMemo(() => Array.from(selected), [selected]);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="Content"
        description="All learning content in one place — notes, slides, videos, assignments, links."
        actions={
          <Button asChild size="sm">
            <Link to="/admin/content/new"><Plus className="mr-1.5 h-4 w-4" /> New content</Link>
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search title…"
            className="h-9 pl-8"
          />
        </div>
        <Select value={type} onValueChange={(v) => { setType(v); setPage(1); }}>
          <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            {TYPE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="ml-auto text-xs text-muted-foreground">{total} items</div>
      </div>

      {selectedIds.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-primary/40 bg-primary/5 px-3 py-2 text-sm">
          <span className="font-medium">{selectedIds.length} selected</span>
          <Button size="sm" variant="outline" onClick={() => bulkMutation.mutate({ data: { ids: selectedIds, patch: { status: "published" } } })}>
            <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Publish
          </Button>
          <Button size="sm" variant="outline" onClick={() => bulkMutation.mutate({ data: { ids: selectedIds, patch: { status: "draft" } } })}>
            <XCircle className="mr-1.5 h-3.5 w-3.5" /> Unpublish
          </Button>
          <Button size="sm" variant="outline" onClick={() => bulkMutation.mutate({ data: { ids: selectedIds, patch: { status: "archived" } } })}>
            <Archive className="mr-1.5 h-3.5 w-3.5" /> Archive
          </Button>
          <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
        </div>
      )}

      {isLoading ? (
        <TableSkeleton rows={8} cols={5} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={search || type !== "all" || status !== "all" ? "No matches" : "No content yet"}
          description={
            search || type !== "all" || status !== "all"
              ? "Try clearing filters or adjusting your search."
              : "Add your first content item to get started."
          }
          action={
            <Button asChild size="sm"><Link to="/admin/content/new"><Plus className="mr-1.5 h-4 w-4" /> New content</Link></Button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border/70 bg-surface">
          <table className="w-full">
            <thead className="border-b border-border/70 bg-surface-muted text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="w-10 px-3 py-2.5">
                  <Checkbox checked={allChecked} onCheckedChange={toggleAll} aria-label="Select all" />
                </th>
                <th className="px-3 py-2.5">Title</th>
                <th className="px-3 py-2.5 hidden md:table-cell">Subject</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5 hidden lg:table-cell">Updated</th>
                <th className="w-10 px-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {items.map((row: ContentItem) => {
                const Icon = TYPE_ICON[row.type] ?? FileText;
                return (
                  <tr key={row.id} className="text-sm hover:bg-surface-muted/40">
                    <td className="px-3 py-2.5">
                      <Checkbox
                        checked={selected.has(row.id)}
                        onCheckedChange={() => toggleOne(row.id)}
                        aria-label={`Select ${row.title}`}
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <button
                        type="button"
                        onClick={() => navigate({ to: "/admin/content/$id", params: { id: row.id } })}
                        className="flex items-start gap-2.5 text-left"
                      >
                        <span className="mt-0.5 rounded-md bg-primary/10 p-1 text-primary">
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-foreground hover:text-primary">{row.title}</span>
                          <span className="text-xs capitalize text-muted-foreground">{row.type}</span>
                        </span>
                      </button>
                    </td>
                    <td className="px-3 py-2.5 hidden md:table-cell text-muted-foreground">
                      {row.subject?.title ?? "—"}
                    </td>
                    <td className="px-3 py-2.5"><StatusBadge value={row.status} /></td>
                    <td className="px-3 py-2.5 hidden lg:table-cell text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(row.updated_at), { addSuffix: true })}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate({ to: "/admin/content/$id", params: { id: row.id } })}>
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => duplicateMutation.mutate({ data: { id: row.id } })}>
                            <Copy className="mr-2 h-3.5 w-3.5" /> Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {row.status !== "published" ? (
                            <DropdownMenuItem onClick={() => bulkMutation.mutate({ data: { ids: [row.id], patch: { status: "published" } } })}>
                              Publish
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => bulkMutation.mutate({ data: { ids: [row.id], patch: { status: "draft" } } })}>
                              Unpublish
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => bulkMutation.mutate({ data: { ids: [row.id], patch: { status: "archived" } } })}>
                            Archive
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => { setSelected(new Set([row.id])); setConfirmDelete(true); }}
                          >
                            <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-end gap-2">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <div className="text-xs text-muted-foreground">Page {page} of {totalPages}</div>
          <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete ${selectedIds.length} item${selectedIds.length === 1 ? "" : "s"}?`}
        description="This is a soft delete — items are hidden but can be restored from the database."
        confirmLabel="Delete"
        destructive
        onConfirm={() => deleteMutation.mutate({ data: { ids: selectedIds } })}
      />
    </div>
  );
}
