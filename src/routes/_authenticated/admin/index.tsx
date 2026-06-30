import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Users, GraduationCap, Library, Layers, FileText, FileStack, FlaskConical,
  ImageIcon, Download, Activity, Eye, ListChecks,
} from "lucide-react";

import { getDashboardStats, getRecentUploads, getRecentActivity } from "@/lib/admin.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "Admin · BCA Gurukul" }] }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const fetchStats = useServerFn(getDashboardStats);
  const fetchUploads = useServerFn(getRecentUploads);
  const fetchActivity = useServerFn(getRecentActivity);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["admin", "dashboard-stats"],
    queryFn: () => fetchStats(),
  });
  const { data: uploads } = useQuery({
    queryKey: ["admin", "recent-uploads"],
    queryFn: () => fetchUploads(),
  });
  const { data: activity } = useQuery({
    queryKey: ["admin", "recent-activity"],
    queryFn: () => fetchActivity(),
  });

  const tiles = [
    { label: "Students", value: stats?.students, icon: Users, hint: "Registered profiles", to: undefined },
    { label: "Active 24h", value: stats?.active_users_24h, icon: Activity, hint: "Sessions seen today" },
    { label: "Semesters", value: stats?.semesters, icon: GraduationCap, to: "/admin/courses" },
    { label: "Subjects", value: stats?.subjects, icon: Library, to: "/admin/courses" },
    { label: "Units", value: stats?.units, icon: Layers, to: "/admin/courses" },
    { label: "Notes", value: stats?.notes, icon: FileText, to: "/admin/notes" },
    { label: "Papers", value: stats?.papers, icon: FileStack, to: "/admin/papers" },
    { label: "Quizzes", value: stats?.quizzes, icon: FlaskConical, to: "/admin/quizzes" },
    { label: "MCQ questions", value: stats?.mcqs, icon: ListChecks, to: "/admin/quizzes" },
    { label: "Media", value: stats?.media, icon: ImageIcon, to: "/admin/media" },
    { label: "Downloads", value: stats?.downloads, icon: Download },
    { label: "Note views", value: stats?.note_views, icon: Eye },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-foreground">Operations dashboard</h1>
          <p className="text-sm text-muted-foreground">A live view of every piece of content and student activity.</p>
        </div>
      </div>

      <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {tiles.map((t) => {
          const inner = (
            <div className={cn(
              "group h-full rounded-xl border border-border/70 bg-surface p-4 transition",
              t.to && "hover:border-primary/40 hover:shadow-sm",
            )}>
              <div className="flex items-center justify-between">
                <div className="rounded-md bg-primary/10 p-1.5 text-primary">
                  <t.icon className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3 font-display text-2xl font-semibold tabular-nums text-foreground">
                {statsLoading ? "…" : (t.value ?? 0).toLocaleString()}
              </div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">{t.label}</div>
            </div>
          );
          return t.to ? <Link key={t.label} to={t.to}>{inner}</Link> : <div key={t.label}>{inner}</div>;
        })}
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-2">
        <Panel title="Recent uploads" empty={!uploads?.length ? "No uploads yet." : null}>
          <ul className="divide-y divide-border/60">
            {uploads?.map((u) => (
              <li key={`${u.kind}-${u.id}`} className="flex items-center gap-3 py-2.5 text-sm">
                <KindBadge kind={u.kind} />
                <span className="flex-1 truncate text-foreground">{u.title || "Untitled"}</span>
                <span className="text-xs text-muted-foreground">{relativeTime(u.created_at)}</span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Recent student activity" empty={!activity?.length ? "No activity yet." : null}>
          <ul className="divide-y divide-border/60">
            {activity?.map((a, i) => (
              <li key={i} className="flex items-center gap-3 py-2.5 text-sm">
                <ActivityIcon kind={a.kind} />
                <span className="flex-1 truncate text-foreground">
                  <span className="text-muted-foreground">{activityLabel(a.kind)} · </span>
                  {a.title ?? "—"}
                </span>
                <span className="text-xs text-muted-foreground">{relativeTime(a.at)}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </section>
    </div>
  );
}

function Panel({ title, children, empty }: { title: string; children: React.ReactNode; empty: string | null }) {
  return (
    <div className="rounded-xl border border-border/70 bg-surface p-4">
      <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
      <div className="mt-2">{empty ? <p className="py-6 text-center text-sm text-muted-foreground">{empty}</p> : children}</div>
    </div>
  );
}

function KindBadge({ kind }: { kind: string }) {
  const map: Record<string, string> = {
    note: "bg-blue-500/10 text-blue-600",
    paper: "bg-amber-500/10 text-amber-700",
    quiz: "bg-emerald-500/10 text-emerald-700",
    media: "bg-purple-500/10 text-purple-700",
  };
  return <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium uppercase", map[kind] ?? "bg-muted text-foreground")}>{kind}</span>;
}

function ActivityIcon({ kind }: { kind: string }) {
  const Icon = kind === "note_view" ? Eye : kind === "paper_download" ? Download : FlaskConical;
  return <Icon className="h-4 w-4 text-muted-foreground" />;
}

function activityLabel(kind: string) {
  return kind === "note_view" ? "Viewed note" : kind === "paper_download" ? "Downloaded paper" : "Attempted quiz";
}

function relativeTime(iso: string) {
  if (!iso) return "";
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  return `${days}d ago`;
}
