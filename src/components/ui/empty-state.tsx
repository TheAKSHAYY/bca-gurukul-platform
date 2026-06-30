import * as React from "react";
import { Link } from "@tanstack/react-router";
import type { LinkProps } from "@tanstack/react-router";
import { ArrowRight, Lightbulb, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * Polished zero-data empty state.
 *
 * Use anywhere a list, grid or stat block would otherwise render
 * "No data". Guides the user with an icon, a short message, a primary
 * action and (optionally) a secondary link + a one-line tip.
 *
 * Variants:
 *   - "card"   (default) full bordered surface, used inside a section
 *   - "panel"  compact, fits inside a dashboard panel / sidebar widget
 *   - "inline" no border, for nesting inside an already-bordered card
 *
 * Tones bias the icon halo & accent ring without ever using raw hex —
 * everything routes through semantic tokens so it tracks light/dark
 * mode and the project's deep-indigo / saffron palette automatically.
 */

type Tone = "primary" | "accent" | "success" | "info" | "muted";
type Variant = "card" | "panel" | "inline";

type ActionLink = {
  label: string;
  /** TanStack Router `to`. Use this OR `href` (external). */
  to?: LinkProps["to"];
  /** Plain external URL or `mailto:` — opens in a new tab. */
  href?: string;
  /** Optional click handler (used when neither `to` nor `href` is given). */
  onClick?: () => void;
  icon?: LucideIcon;
};

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: React.ReactNode;
  /** Short, friendly suggestion shown with a lightbulb. Keep it one line. */
  tip?: React.ReactNode;
  primaryAction?: ActionLink;
  secondaryAction?: ActionLink;
  tone?: Tone;
  variant?: Variant;
  className?: string;
}

const TONE: Record<Tone, { halo: string; tile: string }> = {
  primary: {
    halo: "from-primary/15 via-primary/5 to-transparent",
    tile: "bg-primary/10 text-primary ring-primary/20",
  },
  accent: {
    halo: "from-accent/25 via-accent/10 to-transparent",
    tile: "bg-accent/20 text-accent-foreground ring-accent/30",
  },
  success: {
    halo: "from-success/15 via-success/5 to-transparent",
    tile: "bg-success/10 text-success ring-success/20",
  },
  info: {
    halo: "from-info/15 via-info/5 to-transparent",
    tile: "bg-info/10 text-info ring-info/20",
  },
  muted: {
    halo: "from-muted/40 via-muted/10 to-transparent",
    tile: "bg-muted text-muted-foreground ring-border",
  },
};

function ActionButton({
  action,
  variant,
}: {
  action: ActionLink;
  variant: "default" | "outline";
}) {
  const Icon = action.icon ?? (variant === "default" ? ArrowRight : undefined);
  const content = (
    <>
      {action.label}
      {Icon && (
        <Icon
          className={cn(
            "h-4 w-4",
            variant === "default" ? "ml-2" : "ml-1.5",
          )}
        />
      )}
    </>
  );

  if (action.to) {
    return (
      <Button asChild variant={variant} size="sm" className="h-9 px-4">
        <Link to={action.to}>{content}</Link>
      </Button>
    );
  }
  if (action.href) {
    return (
      <Button asChild variant={variant} size="sm" className="h-9 px-4">
        <a href={action.href} target="_blank" rel="noopener noreferrer">
          {content}
        </a>
      </Button>
    );
  }
  return (
    <Button
      variant={variant}
      size="sm"
      className="h-9 px-4"
      onClick={action.onClick}
    >
      {content}
    </Button>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  tip,
  primaryAction,
  secondaryAction,
  tone = "primary",
  variant = "card",
  className,
}: EmptyStateProps) {
  const t = TONE[tone];

  const compact = variant === "panel";
  const wrapperClass = cn(
    "relative isolate overflow-hidden text-center animate-fade-in",
    variant === "card" &&
      "rounded-2xl border border-dashed border-border bg-surface px-6 py-12 sm:px-10 sm:py-14",
    variant === "panel" &&
      "rounded-xl border border-dashed border-border/70 bg-surface-muted/40 px-5 py-8",
    variant === "inline" && "px-2 py-8",
    className,
  );

  return (
    <div className={wrapperClass}>
      {/* Soft halo */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-0 -top-16 -z-10 mx-auto h-48 w-48 rounded-full bg-gradient-radial blur-2xl",
          "bg-gradient-to-b",
          t.halo,
        )}
      />

      {/* Icon tile with concentric ring */}
      <div className="mx-auto flex items-center justify-center">
        <span
          className={cn(
            "relative grid place-items-center rounded-2xl ring-1 ring-inset",
            compact ? "h-11 w-11" : "h-14 w-14",
            t.tile,
          )}
        >
          <Icon className={compact ? "h-5 w-5" : "h-6 w-6"} />
          <span
            aria-hidden
            className={cn(
              "absolute inset-0 -m-2 rounded-2xl ring-1 ring-inset opacity-60",
              t.tile.includes("primary") && "ring-primary/15",
              t.tile.includes("accent") && "ring-accent/20",
              t.tile.includes("success") && "ring-success/15",
              t.tile.includes("info") && "ring-info/15",
              t.tile.includes("muted") && "ring-border",
            )}
          />
        </span>
      </div>

      <h3
        className={cn(
          "mt-5 font-display font-semibold text-foreground",
          compact ? "text-base" : "text-lg sm:text-xl",
        )}
      >
        {title}
      </h3>

      {description && (
        <p
          className={cn(
            "mx-auto mt-2 max-w-md text-muted-foreground",
            compact ? "text-xs" : "text-sm leading-relaxed",
          )}
        >
          {description}
        </p>
      )}

      {(primaryAction || secondaryAction) && (
        <div
          className={cn(
            "mt-6 flex flex-col items-center justify-center gap-2 sm:flex-row sm:gap-3",
            compact && "mt-5",
          )}
        >
          {primaryAction && (
            <ActionButton action={primaryAction} variant="default" />
          )}
          {secondaryAction && (
            <ActionButton action={secondaryAction} variant="outline" />
          )}
        </div>
      )}

      {tip && (
        <div
          className={cn(
            "mx-auto mt-6 inline-flex max-w-md items-start gap-2 rounded-full border border-border/60 bg-background/70 px-3.5 py-1.5 text-left text-xs text-muted-foreground",
            compact && "mt-4",
          )}
        >
          <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
          <span>{tip}</span>
        </div>
      )}
    </div>
  );
}
