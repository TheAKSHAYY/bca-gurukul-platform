import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Users, GraduationCap, Library, Layers, FileText, FileStack, FlaskConical,
  ImageIcon, Download, Activity, Eye, ListChecks, Plus, ArrowUpRight, BookOpen,
} from "lucide-react";

import { getDashboardStats, getRecentUploads, getRecentActivity } from "@/lib/admin.functions";
import { PageContainer, PageHeader, SectionCard, StatCard } from "@/components/admin/ui";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";

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

  const primary = [
    { label: "Students", value: stats?.students, icon: Users, hint: "Registered profiles" },
    { label: "Active 24h", value: stats?.active_users_24h, icon: Activity, hint: "Live sessions" },
    { label: "Content items", value: (stats?.notes ?? 0), icon: FileText, to: "/admin/content" },
    { label: "Papers", value: stats?.papers, icon: FileStack, to: "/admin/papers" },
  ];

  const secondary = [
    { label: "Semesters", value: stats?.semesters, icon: GraduationCap, to: "/admin/courses" },
    { label: "Subjects", value: stats?.subjects, icon: Library, to: "/admin/subjects" },
    { label: "Units", value: stats?.units, icon: Layers, to: "/admin/courses" },
    { label: "Quizzes", value: stats?.quizzes, icon: FlaskConical, to: "/admin/quizzes" },
    { label: "MCQs", value: stats?.mcqs, icon: ListChecks, to: "/admin/quizzes" },
    { label: "Media", value: stats?.media, icon: ImageIcon, to: "/admin/media" },
    { label: "Downloads", value: stats?.downloads, icon: Download },
    { label: "Note views", value: stats?.note_views, icon: Eye },
  ];

  const isColdStart = !statsLoading && stats
    ? ((stats.semesters ?? 0) + (stats.subjects ?? 0) + (stats.units ?? 0) +
       (stats.notes ?? 0) + (stats.papers ?? 0) + (stats.quizzes ?? 0)) === 0
    : false;

  return (
    <PageContainer>
      <PageHeader
        title="Dashboard"
        description="Overview of the BCA Gurukul library, activity, and workflow."
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link to="/admin/content"><FileText className="mr-1.5 h-4 w-4" /> Content</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/admin/content/new"><Plus className="mr-1.5 h-4 w-4" /> New content</Link>
            </Button>
          </>
        }
      />

      {isColdStart && (
        <EmptyState
          className="mb-6"
          icon={BookOpen}
          title="Set up your first course"
          description="Create a course, add a semester and subjects, then upload content."
          primaryAction={{ label: "Create course", to: "/admin/courses", icon: Plus }}
        />
      )}

      <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {primary.map((t) => (
          <StatCard key={t.label} {...t} loading={statsLoading} />
        ))}
      </section>

      <section className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        {secondary.map((t) => (
          <StatCard key={t.label} {...t} loading={statsLoading} />
        ))}
      </section>

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
            {(uploads ?? []).slice(0, 8).map((u) => (
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

        <SectionCard padded={false} title="Recent activity">
          <div className="divide-y divide-border/60">
            {(activity ?? []).slice(0, 8).map((a, i) => (
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
