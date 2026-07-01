import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronRight, BookOpen, GraduationCap, Library, Layers } from "lucide-react";

import { getContentTree, type TreeNode } from "@/lib/admin.functions";
import { cn } from "@/lib/utils";

const ICONS = [BookOpen, GraduationCap, Library, Layers];

export function ContentTree() {
  const fetchTree = useServerFn(getContentTree);
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "content-tree"],
    queryFn: () => fetchTree(),
  });

  if (isLoading) {
    return <div className="px-3 py-2 text-xs text-muted-foreground">Loading tree…</div>;
  }
  if (!data || data.length === 0) {
    return (
      <div className="px-3 py-2 text-xs text-muted-foreground">
        No courses yet. Use <span className="font-medium text-foreground">+ Create</span> to add
        one.
      </div>
    );
  }
  return (
    <div className="space-y-0.5 px-1 py-1">
      {data.map((node) => (
        <TreeRow key={node.id} node={node} depth={0} />
      ))}
    </div>
  );
}

function TreeRow({ node, depth }: { node: TreeNode; depth: number }) {
  const [open, setOpen] = useState(depth < 1);
  const hasChildren = (node.children?.length ?? 0) > 0;
  const Icon = ICONS[Math.min(depth, ICONS.length - 1)];
  return (
    <div>
      <button
        type="button"
        onClick={() => hasChildren && setOpen((o) => !o)}
        className={cn(
          "group flex w-full items-center gap-1.5 rounded-md py-1 pr-2 text-left text-sm hover:bg-muted/60",
          "transition-colors",
        )}
        style={{ paddingLeft: `${depth * 12 + 6}px` }}
      >
        <ChevronRight
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform",
            hasChildren ? "" : "opacity-0",
            open ? "rotate-90" : "",
          )}
        />
        <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="truncate text-foreground/90">{node.name}</span>
      </button>
      {open && hasChildren && (
        <div>
          {node.children!.map((c) => (
            <TreeRow key={c.id} node={c} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
