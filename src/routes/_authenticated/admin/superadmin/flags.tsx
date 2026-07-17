import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Flag, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { listFeatureFlags, updateFeatureFlag } from "@/lib/superadmin.functions";
import { PageHeader } from "@/components/admin/ui/page-header";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/admin/superadmin/flags")({
  head: () => ({ meta: [{ title: "Feature Flags · Super Admin" }] }),
  component: FlagsPage,
});

function FlagsPage() {
  const fetchFlags = useServerFn(listFeatureFlags);
  const update = useServerFn(updateFeatureFlag);
  const qc = useQueryClient();

  const { data: flags, isLoading } = useQuery({
    queryKey: ["superadmin", "flags"],
    queryFn: () => fetchFlags(),
  });

  const updateMut = useMutation({
    mutationFn: (vars: { key: string; enabled?: boolean; kill_switch?: boolean }) => update({ data: vars }),
    onSuccess: () => {
      toast.success("Flag updated");
      qc.invalidateQueries({ queryKey: ["superadmin", "flags"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const grouped = (flags ?? []).reduce<Record<string, typeof flags>>((acc, f) => {
    const key = f.module ?? "general";
    (acc[key] ||= [] as never).push(f);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link to="/admin/superadmin" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to Super Admin
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="font-display text-3xl font-semibold text-foreground">Feature Flags</h1>
        <p className="mt-2 text-muted-foreground">
          Enable, disable, or kill-switch entire modules without a redeploy.
        </p>

        {isLoading ? (
          <div className="mt-8 rounded-2xl border border-border bg-surface p-10 text-center text-sm text-muted-foreground">Loading…</div>
        ) : (flags ?? []).length === 0 ? (
          <div className="mt-8 rounded-2xl border border-border bg-surface p-10 text-center text-sm text-muted-foreground">
            No feature flags configured yet.
          </div>
        ) : (
          <div className="mt-8 space-y-8">
            {Object.entries(grouped).map(([module, items]) => (
              <section key={module}>
                <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">{module}</h2>
                <div className="mt-3 divide-y divide-border rounded-2xl border border-border bg-surface">
                  {(items ?? []).map((f) => (
                    <div key={f.key} className="flex items-start justify-between gap-4 p-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Flag className="h-4 w-4 text-muted-foreground" />
                          <code className="font-mono text-sm font-semibold text-foreground">{f.key}</code>
                          {f.kill_switch && (
                            <Badge variant="outline" className="border-destructive/40 bg-destructive/10 text-destructive">
                              <AlertTriangle className="mr-1 h-3 w-3" /> Killed
                            </Badge>
                          )}
                        </div>
                        {f.description && (
                          <p className="mt-1 text-sm text-muted-foreground">{f.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-6">
                        <label className="flex items-center gap-2 text-xs text-muted-foreground">
                          Enabled
                          <Switch
                            checked={f.enabled}
                            disabled={updateMut.isPending}
                            onCheckedChange={(v) => updateMut.mutate({ key: f.key, enabled: v })}
                          />
                        </label>
                        <label className="flex items-center gap-2 text-xs text-muted-foreground">
                          Kill
                          <Switch
                            checked={f.kill_switch}
                            disabled={updateMut.isPending}
                            onCheckedChange={(v) => updateMut.mutate({ key: f.key, kill_switch: v })}
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
