import { cn } from "@/lib/utils";

const STYLES: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  published: "bg-success/15 text-success",
  archived: "bg-warning/15 text-warning",
  public: "bg-info/15 text-info",
  students: "bg-primary/10 text-primary",
  private: "bg-muted text-muted-foreground",
};

export function StatusBadge({ value, className }: { value: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize",
        STYLES[value] ?? "bg-muted text-muted-foreground",
        className,
      )}
    >
      {value}
    </span>
  );
}
