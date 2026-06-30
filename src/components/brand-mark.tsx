import { cn } from "@/lib/utils";

/**
 * BrandMark — BCA Gurukul logo.
 * A graduation cap (mortarboard) with a saffron tassel on a deep-indigo
 * rounded tile. Minimal, recognisable, optimised for navbars and favicons.
 */
export function BrandMark({
  className,
  variant = "filled",
}: {
  className?: string;
  /**
   * "filled" — indigo tile with light cap (default; for headers, navbars).
   * "inverse" — light tile with indigo cap (for dark hero backgrounds).
   */
  variant?: "filled" | "inverse";
}) {
  const isInverse = variant === "inverse";
  return (
    <span
      className={cn(
        "relative inline-grid place-items-center overflow-hidden rounded-[28%]",
        isInverse
          ? "bg-primary-foreground ring-1 ring-primary/15"
          : "bg-primary ring-1 ring-primary/30",
        "shadow-[0_6px_18px_-10px_oklch(0.36_0.13_268/0.55)]",
        className,
      )}
      aria-label="BCA Gurukul"
    >
      <svg
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative h-[64%] w-[64%]"
        aria-hidden
      >
        {/* Mortarboard top (rhombus) */}
        <path
          d="M20 8 L34 15 L20 22 L6 15 Z"
          fill={isInverse ? "oklch(0.36 0.13 268)" : "oklch(0.98 0.01 95)"}
        />
        {/* Cap base */}
        <path
          d="M11 18 V24 C11 26.5 15 28.5 20 28.5 C25 28.5 29 26.5 29 24 V18 L20 22.5 Z"
          fill={isInverse ? "oklch(0.36 0.13 268)" : "oklch(0.98 0.01 95)"}
          opacity="0.92"
        />
        {/* Tassel cord */}
        <path
          d="M33 15 V22"
          stroke="oklch(0.78 0.16 60)"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        {/* Tassel knot */}
        <circle cx="33" cy="22" r="1.6" fill="oklch(0.78 0.16 60)" />
        {/* Tassel strands */}
        <path
          d="M33 23.4 V27.5 M31.8 23.2 V27 M34.2 23.2 V27"
          stroke="oklch(0.78 0.16 60)"
          strokeWidth="0.9"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}
