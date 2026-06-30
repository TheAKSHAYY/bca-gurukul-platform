import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, FlaskConical, LayoutDashboard, Shield } from "lucide-react";

import { useRoles } from "@/hooks/use-roles";

export const Route = createFileRoute("/_authenticated/_admin/admin")({
  head: () => ({ meta: [{ title: "Admin · BCA Gurukul" }] }),
  component: AdminHome,
});

function AdminHome() {
  const { isSuperAdmin } = useRoles();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <span className="font-display text-lg font-semibold">ब</span>
            </div>
            <div className="font-display text-base font-semibold text-foreground">Admin Workspace</div>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex items-center gap-3">
          <LayoutDashboard className="h-6 w-6 text-primary" />
          <h1 className="font-display text-3xl font-semibold text-foreground">Operations console</h1>
        </div>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Authoring tools, analytics, and platform controls live here. Modules unlock as later phases ship.
        </p>

        <section className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Tile icon={<BookOpen className="h-5 w-5" />} title="Courses & content" body="Course tree, units, notes, papers — Phase 6+." />
          <Tile icon={<FlaskConical className="h-5 w-5" />} title="Quizzes & analytics" body="MCQ banks and student performance — Phase 10, 18." />
          {isSuperAdmin && (
            <Tile icon={<Shield className="h-5 w-5" />} title="Super admin" body="System health, backups, feature flags — Phase 19." />
          )}
        </section>
      </main>
    </div>
  );
}

function Tile({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">{icon}</div>
      <h3 className="mt-4 font-display text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
