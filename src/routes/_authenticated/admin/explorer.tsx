import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { ExplorerTree } from "@/components/admin/explorer/explorer-tree";
import { ExplorerDetail } from "@/components/admin/explorer/explorer-detail";
import type { ExplorerNode } from "@/lib/explorer.functions";
import {
  ResizableHandle, ResizablePanel, ResizablePanelGroup,
} from "@/components/ui/resizable";

export const Route = createFileRoute("/_authenticated/admin/explorer")({
  component: ExplorerPage,
});

function ExplorerPage() {
  const [selected, setSelected] = useState<ExplorerNode | null>(null);

  return (
    <div className="h-[calc(100vh-3.5rem)]">
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel defaultSize={26} minSize={18} maxSize={45}>
          <div className="h-full border-r border-border/70 bg-muted/20">
            <ExplorerTree
              selectedId={selected?.id ?? null}
              onSelect={setSelected}
            />
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={74}>
          <ExplorerDetail node={selected} />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
