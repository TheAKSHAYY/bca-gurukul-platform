import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ChevronRight, BookOpen, GraduationCap, Library, Layers,
  MoreHorizontal, Plus, Trash2, Copy, ArrowUp, ArrowDown,
  Eye, EyeOff, Pencil,
} from "lucide-react";
import { toast } from "sonner";

import {
  getExplorerTree, createExplorerNode, updateExplorerNode,
  deleteExplorerNode, duplicateExplorerNode, reorderExplorerNode,
  type ExplorerNode, type NodeType,
} from "@/lib/explorer.functions";
import {
  ContextMenu, ContextMenuContent, ContextMenuItem,
  ContextMenuSeparator, ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const ICONS: Record<NodeType, typeof BookOpen> = {
  course: BookOpen,
  semester: GraduationCap,
  subject: Library,
  unit: Layers,
};

const CHILD_TYPE: Record<NodeType, NodeType | null> = {
  course: "semester",
  semester: "subject",
  subject: "unit",
  unit: null,
};

const CHILD_LABEL: Record<NodeType, string> = {
  course: "Semester",
  semester: "Subject",
  subject: "Unit",
  unit: "",
};

type Props = {
  selectedId: string | null;
  onSelect: (node: ExplorerNode | null) => void;
};

export function ExplorerTree({ selectedId, onSelect }: Props) {
  const fetchTree = useServerFn(getExplorerTree);
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "explorer-tree"],
    queryFn: () => fetchTree(),
  });

  const create = useServerFn(createExplorerNode);
  const qc = useQueryClient();
  const createRoot = useMutation({
    mutationFn: (name: string) => create({ data: { type: "course", name } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "explorer-tree"] });
      toast.success("Course created");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [newCourseOpen, setNewCourseOpen] = useState(false);

  if (isLoading) {
    return <div className="p-3 text-xs text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border/70 px-3 py-2">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Explorer
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 gap-1 px-2 text-xs"
          onClick={() => setNewCourseOpen(true)}
        >
          <Plus className="h-3.5 w-3.5" /> Course
        </Button>
      </div>
      <div className="flex-1 overflow-auto py-1">
        {(!data || data.length === 0) ? (
          <div className="px-4 py-8 text-center text-xs text-muted-foreground">
            No courses yet.
            <div className="mt-2">
              <Button size="sm" variant="outline" onClick={() => setNewCourseOpen(true)}>
                <Plus className="mr-1 h-3.5 w-3.5" /> New course
              </Button>
            </div>
          </div>
        ) : (
          data.map((node) => (
            <TreeRow
              key={node.id}
              node={node}
              depth={0}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ))
        )}
      </div>

      <NamePromptDialog
        open={newCourseOpen}
        onOpenChange={setNewCourseOpen}
        title="New course"
        placeholder="e.g. Bachelor of Computer Applications"
        onSubmit={(name) => createRoot.mutate(name)}
      />
    </div>
  );
}

function TreeRow({
  node, depth, selectedId, onSelect,
}: {
  node: ExplorerNode;
  depth: number;
  selectedId: string | null;
  onSelect: (n: ExplorerNode) => void;
}) {
  const [open, setOpen] = useState(depth < 1);
  const [addOpen, setAddOpen] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const hasChildren = (node.children?.length ?? 0) > 0;
  const Icon = ICONS[node.type];
  const childType = CHILD_TYPE[node.type];
  const qc = useQueryClient();

  const create = useServerFn(createExplorerNode);
  const update = useServerFn(updateExplorerNode);
  const del = useServerFn(deleteExplorerNode);
  const dup = useServerFn(duplicateExplorerNode);
  const reorder = useServerFn(reorderExplorerNode);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin", "explorer-tree"] });

  const addChild = useMutation({
    mutationFn: (name: string) =>
      create({ data: { type: childType!, parentId: node.id, name } }),
    onSuccess: () => { invalidate(); toast.success(`${CHILD_LABEL[node.type]} added`); setOpen(true); },
    onError: (e: Error) => toast.error(e.message),
  });

  const togglePublish = useMutation({
    mutationFn: () => update({ data: {
      type: node.type, id: node.id,
      patch: { status: node.status === "published" ? "draft" : "published" },
    } }),
    onSuccess: () => { invalidate(); toast.success(node.status === "published" ? "Moved to draft" : "Published"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: () => del({ data: { type: node.type, id: node.id } }),
    onSuccess: () => { invalidate(); toast.success("Moved to trash"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const duplicate = useMutation({
    mutationFn: () => dup({ data: { type: node.type, id: node.id } }),
    onSuccess: () => { invalidate(); toast.success("Duplicated"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const move = useMutation({
    mutationFn: (direction: "up" | "down") =>
      reorder({ data: { type: node.type, id: node.id, direction } }),
    onSuccess: () => invalidate(),
    onError: (e: Error) => toast.error(e.message),
  });

  const selected = selectedId === node.id;

  return (
    <div>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            className={cn(
              "group relative flex items-center gap-1 rounded-md py-1 pr-1 text-sm",
              "hover:bg-muted/60",
              selected && "bg-primary/10 text-primary",
            )}
            style={{ paddingLeft: `${depth * 14 + 6}px` }}
          >
            <button
              type="button"
              onClick={() => hasChildren && setOpen((o) => !o)}
              className="grid h-5 w-5 place-items-center text-muted-foreground"
              aria-label={open ? "Collapse" : "Expand"}
            >
              <ChevronRight
                className={cn(
                  "h-3.5 w-3.5 transition-transform",
                  hasChildren ? "" : "opacity-0",
                  open ? "rotate-90" : "",
                )}
              />
            </button>
            <button
              type="button"
              onClick={() => onSelect(node)}
              className="flex flex-1 items-center gap-1.5 truncate text-left"
            >
              <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">{node.name}</span>
              {node.status !== "published" && (
                <Badge variant="outline" className="ml-1 h-4 px-1 text-[10px]">
                  {node.status}
                </Badge>
              )}
            </button>
            <div className="flex shrink-0 items-center gap-0.5 opacity-0 group-hover:opacity-100">
              {childType && (
                <button
                  type="button"
                  className="grid h-5 w-5 place-items-center rounded text-muted-foreground hover:bg-background hover:text-foreground"
                  onClick={(e) => { e.stopPropagation(); setAddOpen(true); }}
                  aria-label={`Add ${CHILD_LABEL[node.type]}`}
                  title={`Add ${CHILD_LABEL[node.type]}`}
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="grid h-5 w-5 place-items-center rounded text-muted-foreground hover:bg-background hover:text-foreground"
                    onClick={(e) => e.stopPropagation()}
                    aria-label="More"
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <NodeMenu
                  node={node}
                  onAddChild={childType ? () => setAddOpen(true) : undefined}
                  onRename={() => onSelect(node)}
                  onTogglePublish={() => togglePublish.mutate()}
                  onDuplicate={() => duplicate.mutate()}
                  onMoveUp={() => move.mutate("up")}
                  onMoveDown={() => move.mutate("down")}
                  onDelete={() => setConfirmDel(true)}
                />
              </DropdownMenu>
            </div>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          {childType && (
            <ContextMenuItem onSelect={() => setAddOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> New {CHILD_LABEL[node.type]}
            </ContextMenuItem>
          )}
          <ContextMenuItem onSelect={() => onSelect(node)}>
            <Pencil className="mr-2 h-4 w-4" /> Rename / edit
          </ContextMenuItem>
          <ContextMenuItem onSelect={() => togglePublish.mutate()}>
            {node.status === "published"
              ? <><EyeOff className="mr-2 h-4 w-4" /> Unpublish</>
              : <><Eye className="mr-2 h-4 w-4" /> Publish</>}
          </ContextMenuItem>
          <ContextMenuItem onSelect={() => duplicate.mutate()}>
            <Copy className="mr-2 h-4 w-4" /> Duplicate
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onSelect={() => move.mutate("up")}>
            <ArrowUp className="mr-2 h-4 w-4" /> Move up
          </ContextMenuItem>
          <ContextMenuItem onSelect={() => move.mutate("down")}>
            <ArrowDown className="mr-2 h-4 w-4" /> Move down
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            className="text-destructive focus:text-destructive"
            onSelect={() => setConfirmDel(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" /> Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {open && hasChildren && (
        <div>
          {node.children!.map((c) => (
            <TreeRow
              key={c.id}
              node={c}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}

      {childType && (
        <NamePromptDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          title={`New ${CHILD_LABEL[node.type].toLowerCase()}`}
          placeholder={`Name this ${CHILD_LABEL[node.type].toLowerCase()}`}
          onSubmit={(name) => addChild.mutate(name)}
        />
      )}

      <AlertDialog open={confirmDel} onOpenChange={setConfirmDel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{node.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This moves the {node.type} (and its children) to trash. You can restore it later from the Trash view.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => remove.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function NodeMenu({
  node, onAddChild, onRename, onTogglePublish, onDuplicate, onMoveUp, onMoveDown, onDelete,
}: {
  node: ExplorerNode;
  onAddChild?: () => void;
  onRename: () => void;
  onTogglePublish: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
}) {
  return (
    <DropdownMenuContent align="end" className="w-48">
      {onAddChild && (
        <DropdownMenuItem onSelect={onAddChild}>
          <Plus className="mr-2 h-4 w-4" /> New {CHILD_LABEL[node.type]}
        </DropdownMenuItem>
      )}
      <DropdownMenuItem onSelect={onRename}>
        <Pencil className="mr-2 h-4 w-4" /> Rename / edit
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={onTogglePublish}>
        {node.status === "published"
          ? <><EyeOff className="mr-2 h-4 w-4" /> Unpublish</>
          : <><Eye className="mr-2 h-4 w-4" /> Publish</>}
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={onDuplicate}>
        <Copy className="mr-2 h-4 w-4" /> Duplicate
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onSelect={onMoveUp}>
        <ArrowUp className="mr-2 h-4 w-4" /> Move up
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={onMoveDown}>
        <ArrowDown className="mr-2 h-4 w-4" /> Move down
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        className="text-destructive focus:text-destructive"
        onSelect={onDelete}
      >
        <Trash2 className="mr-2 h-4 w-4" /> Delete
      </DropdownMenuItem>
    </DropdownMenuContent>
  );
}

function NamePromptDialog({
  open, onOpenChange, title, placeholder, onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  placeholder: string;
  onSubmit: (name: string) => void;
}) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setValue("");
      setTimeout(() => ref.current?.focus(), 30);
    }
  }, [open]);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
        </AlertDialogHeader>
        <Input
          ref={ref}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          onKeyDown={(e) => {
            if (e.key === "Enter" && value.trim()) {
              onSubmit(value.trim());
              onOpenChange(false);
            }
          }}
        />
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={!value.trim()}
            onClick={() => { onSubmit(value.trim()); onOpenChange(false); }}
          >
            Create
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
