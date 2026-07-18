import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  FileText, FileStack, FlaskConical, Plus, ArrowUpRight, BookOpen,
  Inbox, AlertCircle, TrendingUp, Users, Sparkles, ChevronRight,
  CheckCircle2, MessageSquare, Library,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import {
  getDashboardStats,
  getRecentUploads,
  getRecentActivity,
  getWorkflowSummary,
} from "@/lib/admin.functions";
import { useAuth } from "@/hooks/use-auth";
import {
  PageContainer, PageHeader, SectionCard,
} from "@/components/admin/ui";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "Admin · BCA Gurukul" }] }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const { user } = useAuth();
  const fetchStats = useServerFn(getDashboardStats);
  const fetchUploads = useServerFn(getRecentUploads);
  const fetchActivity = useServerFn(getRecentActivity);
  const fetchWorkflow = useServerFn(getWorkflowSummary);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["admin", "dashboard-stats"],
    queryFn: () => fetchStats(),
  });
  const { data: workflow, isLoading: workflowLoading } = useQuery({
    queryKey: ["admin", "workflow-summary"],
    queryFn: () => fetchWorkflow(),
    staleTime: 30_000,
  });
  const { data: uploads } = useQuery({
    queryKey: ["admin", "recent-uploads"],
    queryFn: () => fetchUploads(),
  });
  const { data: activity } = useQuery({
    queryKey: ["admin", "recent-activity"],
    queryFn: () => fetchActivity(),
  });

  const firstName =
    (user?.user_metadata as { full_name?: string; name?: string } | undefined)?.full_name?.split(" ")[0] ??
    (user?.user_metadata as { name?: string } | undefined)?.name?.split(" ")[0] ??
    user?.email?.split("@")[0] ??
    "Admin";

  const isColdStart = !statsLoading && stats
    ? ((stats.semesters ?? 0) + (stats.subjects ?? 0) + (stats.units ?? 0) +
       (stats.notes ?? 0) + (stats.papers ?? 0) + (stats.quizzes ?? 0)) === 0
    : false;

  const attention = [
    workflow?.drafts_count ?? 0,
    workflow?.unread_messages ?? 0,
    workflow?.gap_subjects.length ?? 0,
  ].reduce((a, b) => a + b, 0);

  const trendTiles = [
    { label: "Published this week", value: workflow?.published_7d, icon: FileText, tone: "primary" as const },
    { label: "Quiz attempts", value: workflow?.attempts_7d, icon: FlaskConical, tone: "accent" as const },
    { label: "New students", value: workflow?.new_students_7d, icon: Users, tone: "success" as const },
    { label: "Active (24h)", value: stats?.active_users_24h, icon: TrendingUp, tone: "info" as const },
  ];

  return (
    <PageContainer>
      {/* Focus bar — greet + primary CTA */}
      <div className="mb-6 grid gap-4 rounded-2xl border border-border/70 bg-gradient-to-br from-primary/8 via-surface to-surface p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Good to see you, {firstName}
          </div>
          <h1 className="mt-1.5 font-serif text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {attention > 0
              ? `${attention} item${attention === 1 ? "" : "s"} need your attention`
              : "You’re all caught up"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review drafts, reply to students, and fill content gaps below.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/content"><FileText className="mr-1.5 h-4 w-4" /> Content</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/admin/content/new"><Plus className="mr-1.5 h-4 w-4" /> New content</Link>
          </Button>
        </div>
      </div>

      {isColdStart && (
        <EmptyState
          className="mb-6"
          icon={BookOpen}
          title="Set up your first course"
          description="Create a course, add a semester and subjects, then upload content."
          primaryAction={{ label: "Create course", to: "/admin/courses", icon: Plus }}
        />
      )}

      {/* Needs attention — 3 action cards */}
      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <AttentionCard
          tone="warning"
          icon={FileText}
          title="Drafts waiting to publish"
          count={workflow?.drafts_count ?? 0}
          loading={workflowLoading}
          empty="Every content item is published."
          actionLabel="Review drafts"
          actionTo="/admin/content"
        >
          {(workflow?.drafts ?? []).slice(0, 3).map((d) => (
            <Link
              key={d.id}
              to="/admin/content/$id"
              params={{ id: d.id }}
              className="group flex items-center justify-between gap-3 rounded-md border border-transparent px-2 py-1.5 -mx-2 transition hover:border-border/70 hover:bg-surface-muted"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-foreground">{d.title}</div>
                <div className="text-[11px] capitalize text-muted-foreground">
                  {d.type} · edited {formatDistanceToNow(new Date(d.updated_at), { addSuffix: true })}
                </div>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
            </Link>
          ))}
        </AttentionCard>

        <AttentionCard
          tone="info"
          icon={Inbox}
          title="Unread messages"
          count={workflow?.unread_messages ?? 0}
          loading={workflowLoading}
          empty="Inbox is clear."
          actionLabel="Open inbox"
          actionTo="/admin/inbox"
        >
          {(workflow?.latest_messages ?? []).slice(0, 3).map((m) => (
            <div key={m.id} className="flex items-start gap-2 px-2 py-1.5 -mx-2">
              <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-info" />
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-foreground">
                  {m.subject ?? "(no subject)"}
                </div>
                <div className="truncate text-[11px] text-muted-foreground">
                  {m.name} · {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
                </div>
              </div>
            </div>
          ))}
        </AttentionCard>

        <AttentionCard
          tone="destructive"
          icon={AlertCircle}
          title="Subjects with no content"
          count={workflow?.gap_subjects.length ?? 0}
          loading={workflowLoading}
          empty="Every subject has at least one published item."
          actionLabel="Manage subjects"
          actionTo="/admin/subjects"
        >
          {(workflow?.gap_subjects ?? []).slice(0, 3).map((s) => (
            <div key={s.id} className="flex items-center gap-2 px-2 py-1.5 -mx-2">
              <Library className="h-3.5 w-3.5 shrink-0 text-destructive" />
              <div className="truncate text-sm text-foreground">{s.title}</div>
            </div>
          ))}
        </AttentionCard>
      </div>

      {/* Trend strip — last 7 days */}
      <section className="mb-8">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="font-serif text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Last 7 days
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {trendTiles.map((t) => (
            <TrendTile key={t.label} {...t} loading={workflowLoading || statsLoading} />
          ))}
        </div>
      </section>

      {/* Library totals — collapsed reference */}
      <section className="mb-8">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="font-serif text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Library totals
          </h2>
          <Link to="/admin/explorer" className="text-xs text-primary hover:underline">
            Open explorer <ArrowUpRight className="ml-0.5 inline h-3 w-3" />
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-2 rounded-xl border border-border/70 bg-surface p-3 sm:grid-cols-6">
          <MiniStat label="Students" value={stats?.students} loading={statsLoading} />
          <MiniStat label="Subjects" value={stats?.subjects} loading={statsLoading} to="/admin/subjects" />
          <MiniStat label="Content" value={stats?.notes} loading={statsLoading} to="/admin/content" />
          <MiniStat label="Papers" value={stats?.papers} loading={statsLoading} to="/admin/papers" />
          <MiniStat label="Quizzes" value={stats?.quizzes} loading={statsLoading} to="/admin/quizzes" />
          <MiniStat label="MCQs" value={stats?.mcqs} loading={statsLoading} to="/admin/quizzes" />
        </div>
      </section>

      {/* Recent uploads + activity */}
      <section className="grid gap-6 lg:grid-cols-2">
        <SectionCard
          padded={false}
          title="Recent uploads"
          actions={
            <Link to="/admin/content" className="text-xs text-primary hover:underline">
              View all <ArrowUpRight className="ml-0.5 inline h-3 w-3" />
            </Link>
          }
        >
          <div className="divide-y divide-border/60">
            {(uploads ?? []).slice(0, 6).map((u) => (
              <div key={`${u.kind}-${u.id}`} className="flex items-center justify-between gap-3 px-4 py-2.5 sm:px-5">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-foreground">{u.title}</div>
                  <div className="text-xs capitalize text-muted-foreground">{u.kind}</div>
                </div>
                <div className="shrink-0 text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(u.created_at), { addSuffix: true })}
                </div>
              </div>
            ))}
            {(!uploads || uploads.length === 0) && (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">No uploads yet.</div>
            )}
          </div>
        </SectionCard>

        <SectionCard padded={false} title="Recent student activity">
          <div className="divide-y divide-border/60">
            {(activity ?? []).slice(0, 6).map((a, i) => (
              <div key={i} className="flex items-center justify-between gap-3 px-4 py-2.5 sm:px-5">
                <div className="min-w-0">
                  <div className="truncate text-sm text-foreground">{a.title ?? "—"}</div>
                  <div className="text-xs capitalize text-muted-foreground">{a.kind.replace("_", " ")}</div>
                </div>
                <div className="shrink-0 text-xs text-muted-foreground">
                  {a.at ? formatDistanceToNow(new Date(a.at), { addSuffix: true }) : ""}
                </div>
              </div>
            ))}
            {(!activity || activity.length === 0) && (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">No activity yet.</div>
            )}
          </div>
        </SectionCard>
      </section>
    </PageContainer>
  );
}

/* -------------------------------------------------------------- */
/* Sub-components                                                  */
/* -------------------------------------------------------------- */

const TONE_STYLES = {
  warning: { badge: "bg-warning/15 text-warning border-warning/30", icon: "text-warning" },
  info: { badge: "bg-info/15 text-info border-info/30", icon: "text-info" },
  destructive: { badge: "bg-destructive/15 text-destructive border-destructive/30", icon: "text-destructive" },
  success: { badge: "bg-success/15 text-success border-success/30", icon: "text-success" },
} as const;

function AttentionCard({
  tone,
  icon: Icon,
  title,
  count,
  loading,
  empty,
  actionLabel,
  actionTo,
  children,
}: {
  tone: keyof typeof TONE_STYLES;
  icon: typeof FileText;
  title: string;
  count: number;
  loading?: boolean;
  empty: string;
  actionLabel: string;
  actionTo: string;
  children?: React.ReactNode;
}) {
  const styles = TONE_STYLES[tone];
  const isClear = !loading && count === 0;
  return (
    <div className="flex min-h-[220px] flex-col rounded-xl border border-border/70 bg-surface p-4 shadow-[0_1px_0_rgba(0,0,0,0.02)]">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className={cn("rounded-lg border p-1.5", styles.badge)}>
            <Icon className={cn("h-4 w-4", styles.icon)} />
          </div>
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {title}
            </div>
            <div className="font-serif text-2xl font-semibold text-foreground">
              {loading ? <Skeleton className="h-7 w-10" /> : count}
            </div>
          </div>
        </div>
      </div>

      <div className="mb-3 flex-1 space-y-0.5 text-sm">
        {isClear && (
          <div className="flex items-center gap-2 rounded-md bg-success/10 px-2.5 py-2 text-xs text-success">
            <CheckCircle2 className="h-3.5 w-3.5" /> {empty}
          </div>
        )}
        {!isClear && children}
      </div>

      <Button asChild variant="ghost" size="sm" className="mt-auto justify-between px-2 text-primary hover:text-primary">
        <Link to={actionTo}>
          {actionLabel} <ChevronRight className="h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}

function TrendTile({
  label, value, icon: Icon, tone, loading,
}: {
  label: string;
  value?: number | null;
  icon: typeof TrendingUp;
  tone: "primary" | "accent" | "success" | "info";
  loading?: boolean;
}) {
  const tint = {
    primary: "bg-primary/10 text-primary",
    accent: "bg-accent/15 text-accent-foreground",
    success: "bg-success/15 text-success",
    info: "bg-info/15 text-info",
  }[tone];
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-surface p-3.5">
      <div className={cn("grid h-9 w-9 place-items-center rounded-lg", tint)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        <div className="font-serif text-xl font-semibold text-foreground">
          {loading ? <Skeleton className="h-6 w-10" /> : (value ?? 0)}
        </div>
      </div>
    </div>
  );
}

function MiniStat({
  label, value, loading, to,
}: {
  label: string;
  value?: number | null;
  loading?: boolean;
  to?: string;
}) {
  const inner = (
    <div className="rounded-lg px-2 py-1.5 transition hover:bg-surface-muted">
      <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="font-serif text-base font-semibold text-foreground">
        {loading ? <Skeleton className="h-5 w-8" /> : (value ?? 0)}
      </div>
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
}
