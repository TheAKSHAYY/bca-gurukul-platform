import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Shield, Palette, Search, Users, ScrollText, Flag, Activity, Database,
} from "lucide-react";

import { getPlatformStats } from "@/lib/superadmin.functions";

export const Route = createFileRoute("/_authenticated/admin/superadmin/")({
  head: () => ({ meta: [{ title: "Super Admin · BCA Gurukul" }] }),
  component: SuperAdminHome,
});

const TILES = [
  { to: "/admin/superadmin/users", icon: Users, title: "Users & Roles", desc: "Grant or revoke admin, instructor, and super admin access." },
  { to: "/admin/superadmin/audit", icon: ScrollText, title: "Audit Log", desc: "Every privileged action, who did it, when, and from where." },
  { to: "/admin/superadmin/flags", icon: Flag, title: "Feature Flags", desc: "Enable, disable, or kill-switch modules without redeploys." },
  { to: "/admin/superadmin/branding", icon: Palette, title: "Branding & Theme", desc: "Logo, colors, typography, radius, and maintenance mode." },
  { to: "/admin/superadmin/seo", icon: Search, title: "SEO Manager", desc: "Per-route titles, descriptions, Open Graph and robots rules." },
] as const;

function SuperAdminHome() {
  const fetchStats = useServerFn(getPlatformStats);
  const { data: stats } = useQuery({
    queryKey: ["superadmin", "platform-stats"],
    queryFn: () => fetchStats(),
  });

  const metrics = [
    { label: "Total users", value: stats?.total_users ?? "—", icon: Users },
    { label: "Admins", value: stats?.admins ?? "—", icon: Shield },
    { label: "Super admins", value: stats?.super_admins ?? "—", icon: Shield },
    { label: "Active sessions", value: stats?.active_sessions ?? "—", icon: Activity },
    { label: "Audit events 24h", value: stats?.audit_events_24h ?? "—", icon: Database },
  ];

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
          Identity, observability, configuration, and brand — the levers reserved for super admins.
        </p>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {metrics.map((m) => (
            <div key={m.label} className="rounded-xl border border-border bg-surface p-4">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                <m.icon className="h-3.5 w-3.5" /> {m.label}
              </div>
              <div className="mt-2 font-display text-2xl font-semibold text-foreground">{m.value}</div>
            </div>
          ))}
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {TILES.map((t) => (
            <Link
              key={t.to}
              to={t.to}
              className="group rounded-2xl border border-border bg-surface p-5 transition hover:border-primary/40 hover:shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                  <t.icon className="h-5 w-5" />
                </div>
                <h3 className="font-display text-base font-semibold text-foreground group-hover:text-primary">
                  {t.title}
                </h3>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{t.desc}</p>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
