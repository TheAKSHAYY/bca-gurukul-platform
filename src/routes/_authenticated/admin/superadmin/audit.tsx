import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Search } from "lucide-react";

import { listAuditLogs } from "@/lib/superadmin.functions";
import { PageHeader } from "@/components/admin/ui/page-header";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/admin/superadmin/audit")({
  head: () => ({ meta: [{ title: "Audit Log · Super Admin" }] }),
  component: AuditPage,
});

function AuditPage() {
  const [filter, setFilter] = useState("");
  const fetchLogs = useServerFn(listAuditLogs);
  const { data: logs, isLoading } = useQuery({
    queryKey: ["superadmin", "audit", filter],
    queryFn: () => fetchLogs({ data: { action: filter || undefined, limit: 300 } }),
  });

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="Audit log"
        description="Tamper-evident timeline of every privileged action. Filter by action prefix (e.g. role., flag.)."
      />

      <div className="mb-4 relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by action…"
          className="pl-9"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-border/70 bg-surface">
          {isLoading ? (
            <div className="p-10 text-center text-sm text-muted-foreground">Loading…</div>
          ) : (logs ?? []).length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">No audit events found.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">When</th>
                  <th className="px-4 py-3">Actor</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Entity</th>
                  <th className="px-4 py-3">Metadata</th>
                </tr>
              </thead>
              <tbody>
                {(logs ?? []).map((row) => (
                  <tr key={row.id} className="border-b border-border/60 last:border-0 align-top">
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {new Date(row.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{row.actor_email ?? "system"}</div>
                      {row.ip && <div className="text-xs text-muted-foreground">{row.ip}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="font-mono text-[11px]">{row.action}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {row.entity_type && <div className="text-xs">{row.entity_type}</div>}
                      {row.entity_id && <div className="font-mono text-[11px]">{row.entity_id.slice(0, 18)}…</div>}
                    </td>
                    <td className="px-4 py-3">
                      {row.metadata && (
                        <pre className="max-w-md overflow-hidden text-ellipsis whitespace-pre-wrap break-words rounded bg-muted/40 p-2 font-mono text-[11px] text-muted-foreground">
                          {row.metadata}
                        </pre>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
