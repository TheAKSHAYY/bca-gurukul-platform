import { createFileRoute, Link } from "@tanstack/react-router";
import { Monitor, Moon, Settings as SettingsIcon, Sun, User } from "lucide-react";

import { useTheme } from "@/components/theme/theme-provider";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings · BCA Gurukul" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
          <SettingsIcon className="h-5 w-5" />
        </span>
        <h1 className="font-display text-2xl font-semibold text-foreground">Settings</h1>
      </div>

      <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-foreground">Appearance</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Choose how BCA Gurukul looks on this device.
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <ThemeChoice active={theme === "light"} onClick={() => setTheme("light")} icon={Sun} label="Light" />
          <ThemeChoice active={theme === "dark"} onClick={() => setTheme("dark")} icon={Moon} label="Dark" />
          <ThemeChoice active={theme === "system"} onClick={() => setTheme("system")} icon={Monitor} label="System" />
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-foreground">Account</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Update your display name, avatar and bio.
        </p>
        <Button asChild className="mt-4" variant="secondary">
          <Link to="/profile">
            <User className="mr-2 h-4 w-4" /> Edit profile
          </Link>
        </Button>
      </section>
    </div>
  );
}

function ThemeChoice({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-2 rounded-xl border px-4 py-4 text-sm transition-colors ${
        active
          ? "border-primary bg-primary/5 text-foreground"
          : "border-border bg-background text-muted-foreground hover:bg-muted"
      }`}
    >
      <Icon className="h-5 w-5" />
      {label}
    </button>
  );
}
