import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Bordered surface panel used for admin sections. Optional header (title +
 * description + actions) and optional footer. Content is padded by default;
 * pass `padded={false}` for tables or divided lists.
 */
export function SectionCard({
  title,
  description,
  actions,
  footer,
  padded = true,
  className,
  headerClassName,
  bodyClassName,
  children,
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  padded?: boolean;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
  children: ReactNode;
}) {
  const hasHeader = title || description || actions;
  return (
    <section
      className={cn(
        "overflow-hidden rounded-xl border border-border/70 bg-surface shadow-[0_1px_0_rgba(0,0,0,0.02)]",
        className,
      )}
    >
      {hasHeader && (
        <header
          className={cn(
            "flex items-start justify-between gap-3 border-b border-border/70 px-4 py-3 sm:px-5",
            headerClassName,
          )}
        >
          <div className="min-w-0">
            {title && (
              <h2 className="font-serif text-base font-semibold text-foreground">{title}</h2>
            )}
            {description && (
              <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cn(padded ? "p-4 sm:p-5" : undefined, bodyClassName)}>{children}</div>
      {footer && (
        <footer className="border-t border-border/70 bg-surface-muted px-4 py-2.5 text-xs text-muted-foreground sm:px-5">
          {footer}
        </footer>
      )}
    </section>
  );
}
