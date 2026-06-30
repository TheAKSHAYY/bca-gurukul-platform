import { createFileRoute, Link } from "@tanstack/react-router";
import { Shield } from "lucide-react";

export const Route = createFileRoute("/_authenticated/_admin/_superadmin/super-admin")({
  head: () => ({ meta: [{ title: "Super Admin · BCA Gurukul" }] }),
  component: SuperAdminHome,
});

function SuperAdminHome() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link to="/admin" className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Shield className="h-5 w-5" />
            </div>
            <div className="font-display text-base font-semibold text-foreground">Super Admin</div>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="font-display text-3xl font-semibold text-foreground">Platform controls</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          System health, backups & restore, feature flags, sessions, and error monitoring land here in Phase 19+.
        </p>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            to="/branding"
            className="group rounded-2xl border border-border bg-surface p-5 transition hover:border-primary/40 hover:shadow-sm"
          >
            <h3 className="font-display text-base font-semibold text-foreground group-hover:text-primary">
              Branding & SEO
            </h3>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Site name, logo, footer, SEO defaults, and maintenance mode.
            </p>
          </Link>
        </div>
      </main>
    </div>
  );
}
