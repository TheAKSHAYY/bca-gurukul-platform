import type { LucideIcon } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  to,
  loading,
  className,
}: {
  label: string;
  value?: number | string | null;
  icon: LucideIcon;
  hint?: string;
  to?: string;
  loading?: boolean;
  className?: string;
}) {
  const Inner = (
    <div
      className={cn(
        "group flex items-start justify-between gap-3 rounded-xl border border-border/70 bg-surface p-4 transition hover:border-primary/40 hover:shadow-sm",
        className,
      )}
    >
      <div className="min-w-0">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="mt-1.5 font-serif text-2xl font-semibold text-foreground">
          {loading ? <Skeleton className="h-7 w-16" /> : value ?? 0}
        </div>
        {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
      </div>
      <div className="rounded-lg bg-primary/10 p-2 text-primary transition group-hover:bg-primary/15">
        <Icon className="h-4 w-4" />
      </div>
    </div>
  );
  if (to) return <Link to={to}>{Inner}</Link>;
  return Inner;
}
