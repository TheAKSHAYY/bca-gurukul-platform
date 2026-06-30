import { ExternalLink, FileText, Loader2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export function PdfViewer({ url, title }: { url: string; title: string }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface-muted px-4 py-3">
        <div className="flex min-w-0 items-center gap-2 text-sm font-medium text-foreground">
          <FileText className="h-4 w-4 shrink-0 text-primary" />
          <span className="truncate">{title}</span>
        </div>
        <Button asChild variant="ghost" size="sm">
          <a href={url} target="_blank" rel="noreferrer">
            <ExternalLink className="mr-2 h-4 w-4" /> Open full screen
          </a>
        </Button>
      </div>
      <div className="relative min-h-[70vh] bg-background">
        {!loaded && (
          <div className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading PDF…
            </span>
          </div>
        )}
        <iframe
          src={`${url}#toolbar=1&navpanes=0&view=FitH`}
          title={title}
          className="h-[75vh] w-full bg-background"
          onLoad={() => setLoaded(true)}
        />
      </div>
    </div>
  );
}