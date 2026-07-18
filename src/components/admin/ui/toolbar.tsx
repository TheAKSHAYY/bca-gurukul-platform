import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Filter / search / action bar used above tables and lists.
 * Layout: left-aligned filters, right-aligned actions, collapses on mobile.
 */
export function Toolbar({
  filters,
  actions,
  className,
}: {
  filters?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      {filters && (
        <div className="flex min-w-0 flex-wrap items-center gap-2">{filters}</div>
      )}
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      )}
    </div>
  );
}
