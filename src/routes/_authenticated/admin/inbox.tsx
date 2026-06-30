import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Mail, Trash2, CheckCircle2, Circle, Inbox as InboxIcon, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/inbox")({
  component: InboxPage,
});

type Msg = {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  status: string;
  created_at: string;
};

function InboxPage() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const listQ = useQuery({
    queryKey: ["admin-contact-messages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_messages")
        .select("id,name,email,subject,message,status,created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as Msg[];
    },
  });

  const statusMut = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("contact_messages")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-contact-messages"] }),
    onError: (e: any) => toast.error(e?.message || "Update failed"),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contact_messages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Message deleted");
      setSelectedId(null);
      qc.invalidateQueries({ queryKey: ["admin-contact-messages"] });
    },
    onError: (e: any) => toast.error(e?.message || "Delete failed"),
  });

  const msgs = listQ.data ?? [];
  const selected = msgs.find((m) => m.id === selectedId) ?? msgs[0] ?? null;
  const unread = msgs.filter((m) => m.status === "new").length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Inbox</h1>
          <p className="text-sm text-muted-foreground">
            Messages from the developer page contact form.
          </p>
        </div>
        {unread > 0 && (
          <Badge className="bg-accent text-accent-foreground">{unread} new</Badge>
        )}
      </div>

      {listQ.isLoading ? (
        <div className="grid gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : msgs.length === 0 ? (
        <EmptyState
          icon={InboxIcon}
          title="No messages yet"
          description="When visitors send a message from the developer page, it'll show up here."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
          <div className="space-y-2 lg:max-h-[70vh] lg:overflow-y-auto lg:pr-2">
            {msgs.map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  setSelectedId(m.id);
                  if (m.status === "new") statusMut.mutate({ id: m.id, status: "read" });
                }}
                className={cn(
                  "w-full rounded-xl border p-3 text-left transition-colors",
                  selected?.id === m.id
                    ? "border-primary bg-primary/5"
                    : "border-border bg-surface hover:border-primary/30",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {m.status === "new" ? (
                        <Circle className="h-2 w-2 fill-accent text-accent" />
                      ) : (
                        <CheckCircle2 className="h-3 w-3 text-muted-foreground" />
                      )}
                      <div className="truncate font-medium text-foreground">{m.name}</div>
                    </div>
                    <div className="mt-0.5 truncate text-xs text-muted-foreground">
                      {m.subject || m.message.slice(0, 50)}
                    </div>
                  </div>
                  <div className="shrink-0 text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {selected && (
            <div className="rounded-2xl border border-border bg-surface p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-display text-xl font-semibold">{selected.name}</div>
                  <a
                    href={`mailto:${selected.email}`}
                    className="text-sm text-primary hover:underline"
                  >
                    {selected.email}
                  </a>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {new Date(selected.created_at).toLocaleString()}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button asChild size="sm" variant="outline">
                    <a href={`mailto:${selected.email}?subject=Re:${encodeURIComponent(selected.subject || "your message")}`}>
                      <Mail className="mr-1.5 h-4 w-4" /> Reply
                    </a>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteMut.mutate(selected.id)}
                    disabled={deleteMut.isPending}
                  >
                    {deleteMut.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 text-destructive" />
                    )}
                  </Button>
                </div>
              </div>
              {selected.subject && (
                <div className="mt-4">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    Subject
                  </div>
                  <div className="text-sm font-medium">{selected.subject}</div>
                </div>
              )}
              <div className="mt-4">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Message
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                  {selected.message}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
