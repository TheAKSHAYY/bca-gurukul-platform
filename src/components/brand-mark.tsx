import { cn } from "@/lib/utils";

/**
 * BrandMark — BCA Gurukul logo.
 * A glowing diya (oil lamp) resting above an open book: the gurukul tradition
 * of lighting the lamp of knowledge, rendered in indigo + saffron.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative inline-grid place-items-center overflow-hidden rounded-xl",
        "bg-gradient-to-br from-primary via-primary to-[oklch(0.28_0.12_268)]",
        "shadow-[0_8px_24px_-12px_oklch(0.36_0.13_268/0.6)] ring-1 ring-primary/40",
        className,
      )}
      aria-label="BCA Gurukul"
    >
      {/* subtle radial glow behind the flame */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(circle at 50% 32%, oklch(0.78 0.16 60 / 0.35), transparent 55%)",
        }}
      />
      <svg
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative h-[68%] w-[68%]"
        aria-hidden
      >
        {/* Flame */}
        <path
          d="M20 6.5c1.8 2.6 3.6 4.6 3.6 7.1a3.6 3.6 0 1 1-7.2 0c0-2.5 1.8-4.5 3.6-7.1z"
          fill="oklch(0.86 0.17 70)"
        />
        <path
          d="M20 9.5c.9 1.5 1.9 2.7 1.9 4.1a1.9 1.9 0 1 1-3.8 0c0-1.4 1-2.6 1.9-4.1z"
          fill="oklch(0.95 0.12 95)"
        />
        {/* Diya bowl */}
        <path
          d="M12 18.5h16c-.6 2.4-3.6 4-8 4s-7.4-1.6-8-4z"
          fill="oklch(0.78 0.16 60)"
        />
        {/* Open book pages */}
        <path
          d="M6 26.5c3.6-1.6 8-1.6 14 1 6-2.6 10.4-2.6 14-1v6.2c-3.6-1.6-8-1.6-14 1-6-2.6-10.4-2.6-14-1V26.5z"
          fill="oklch(0.98 0.01 95)"
          fillOpacity="0.95"
        />
        {/* Spine */}
        <path
          d="M20 27.5v6.2"
          stroke="oklch(0.36 0.13 268)"
          strokeWidth="1"
          strokeLinecap="round"
          opacity="0.5"
        />
      </svg>
    </span>
  );
}
