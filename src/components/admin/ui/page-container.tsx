import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Standard admin page wrapper — centralizes max-width, gutter, and vertical rhythm
 * so every admin route shares the same outer chrome.
 *
 * Widths: `default` (max-w-7xl) for data-heavy pages, `narrow` (max-w-4xl) for
 * settings / forms, `wide` (max-w-screen-2xl) for full-bleed dashboards.
 */
export function PageContainer({
  children,
  width = "default",
  className,
}: {
  children: ReactNode;
  width?: "narrow" | "default" | "wide";
  className?: string;
}) {
  const max =
    width === "narrow"
      ? "max-w-4xl"
      : width === "wide"
        ? "max-w-screen-2xl"
        : "max-w-7xl";
  return (
    <div className={cn("mx-auto w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-8", max, className)}>
      {children}
    </div>
  );
}
