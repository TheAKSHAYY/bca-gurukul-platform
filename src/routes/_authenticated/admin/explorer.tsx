import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { ExplorerTree } from "@/components/admin/explorer/explorer-tree";
import { ExplorerDetail } from "@/components/admin/explorer/explorer-detail";
import type { ExplorerNode } from "@/lib/explorer.functions";

export const Route = createFileRoute("/_authenticated/admin/explorer")({
  component: ExplorerPage,
});

function ExplorerPage() {
  const [selected, setSelected] = useState<ExplorerNode | null>(null);

  return (
    <div className="flex h-[calc(100vh-3.5rem)] w-full">
      <aside className="hidden w-72 shrink-0 border-r border-border/70 bg-muted/20 md:block lg:w-80">
        <ExplorerTree selectedId={selected?.id ?? null} onSelect={setSelected} />
      </aside>
      <div className="min-w-0 flex-1">
        <div className="md:hidden border-b border-border/70 bg-muted/20 max-h-72 overflow-auto">
          <ExplorerTree selectedId={selected?.id ?? null} onSelect={setSelected} />
        </div>
        <ExplorerDetail node={selected} />
      </div>
    </div>
  );
}
