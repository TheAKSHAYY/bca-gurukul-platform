import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Grouped form section — title on the left, controls on the right (desktop).
 * On mobile it stacks. Use inside a <form> or <SectionCard>.
 */
export function FormSection({
  title,
  description,
  children,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "grid gap-4 border-b border-border/60 py-6 last:border-none sm:grid-cols-[minmax(0,220px)_minmax(0,1fr)] sm:gap-8",
        className,
      )}
    >
      <div className="min-w-0">
        <h3 className="font-serif text-sm font-semibold text-foreground">{title}</h3>
        {description && (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

/** Individual labelled control row inside a FormSection. */
export function FormRow({
  label,
  hint,
  htmlFor,
  required,
  error,
  children,
  className,
}: {
  label?: ReactNode;
  hint?: ReactNode;
  htmlFor?: string;
  required?: boolean;
  error?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <Label htmlFor={htmlFor} className="text-xs font-medium text-foreground">
          {label}
          {required && <span className="ml-1 text-destructive">*</span>}
        </Label>
      )}
      {children}
      {hint && !error && (
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      )}
      {error && <p className="text-[11px] text-destructive">{error}</p>}
    </div>
  );
}
