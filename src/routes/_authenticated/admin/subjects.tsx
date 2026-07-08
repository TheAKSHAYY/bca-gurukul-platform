import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Library, Search, Plus } from "lucide-react";

import { listSubjectsFlat } from "@/lib/content.functions";
import { PageHeader } from "@/components/admin/ui/page-header";
import { StatusBadge } from "@/components/admin/ui/status-badge";
import { TableSkeleton } from "@/components/admin/ui/table-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin/subjects")({
  head: () => ({ meta: [{ title: "Subjects · Admin · BCA Gurukul" }] }),
  component: SubjectsPage,
});

function SubjectsPage() {
  const fetchSubjects = useServerFn(listSubjectsFlat);
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "subjects-flat"],
    queryFn: () => fetchSubjects(),
  });
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const list = data ?? [];
    if (!q.trim()) return list;
    const needle = q.toLowerCase();
    return list.filter((s: unknown) => {
      const row = s as { title?: string; code?: string };
      return (row.title ?? "").toLowerCase().includes(needle) ||
        (row.code ?? "").toLowerCase().includes(needle);
    });
  }, [data, q]);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="Subjects"
        description="Every subject across every course and semester."
        actions={
          <Button asChild size="sm">
            <Link to="/admin/courses"><Plus className="mr-1.5 h-4 w-4" /> New via course</Link>
          </Button>
        }
      />

      <div className="mb-4 flex items-center gap-2">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search subjects…"
            className="h-9 pl-8"
          />
        </div>
        <div className="text-xs text-muted-foreground">{rows.length} results</div>
      </div>

      {isLoading ? (
        <TableSkeleton rows={8} cols={4} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Library}
          title="No subjects yet"
          description="Create a course and semester first, then add subjects."
          primaryAction={{ label: "Go to courses", to: "/admin/courses" }}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border/70 bg-surface">
          <table className="w-full">
            <thead className="border-b border-border/70 bg-surface-muted text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5">Subject</th>
                <th className="px-4 py-2.5 hidden md:table-cell">Code</th>
                <th className="px-4 py-2.5 hidden sm:table-cell">Course / Sem</th>
                <th className="px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {rows.map((s: unknown) => {
                const row = s as {
                  id: string;
                  title: string;
                  code: string | null;
                  status: string;
                  semester?: { number?: number; course?: { title?: string } | null } | null;
                };
                return (
                  <tr key={row.id} className="text-sm hover:bg-surface-muted/40">
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-foreground">{row.title}</div>
                    </td>
                    <td className="px-4 py-2.5 hidden md:table-cell text-muted-foreground">{row.code ?? "—"}</td>
                    <td className="px-4 py-2.5 hidden sm:table-cell text-muted-foreground">
                      {row.semester?.course?.title ?? "—"} · Sem {row.semester?.number ?? "?"}
                    </td>
                    <td className="px-4 py-2.5"><StatusBadge value={row.status} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
