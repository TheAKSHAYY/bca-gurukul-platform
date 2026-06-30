import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookMarked, Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

type Bookmark = {
  id: string;
  kind: string;
  target_id: string;
  title: string | null;
  created_at: string;
};

export const Route = createFileRoute("/_authenticated/bookmarks")({
  head: () => ({ meta: [{ title: "Your bookmarks · BCA Gurukul" }] }),
  component: BookmarksPage,
});

function routeFor(b: Bookmark): { to: string; params?: Record<string, string> } {
  switch (b.kind) {
    case "note":
      return { to: "/notes/$noteId", params: { noteId: b.target_id } };
    case "paper":
      return { to: "/papers/$paperId", params: { paperId: b.target_id } };
    case "quiz":
      return { to: "/quizzes/$quizId", params: { quizId: b.target_id } };
    default:
      return { to: "/courses" };
  }
}

function BookmarksPage() {
  const { user } = useAuth();
  const q = useQuery({
    queryKey: ["all-bookmarks", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("student_bookmarks", { p_limit: 200 });
      if (error) throw error;
      return (data ?? []) as Bookmark[];
    },
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-semibold text-foreground">Bookmarks</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Your saved notes, papers, quizzes and units.
      </p>

      <div className="mt-6">
        {q.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : (q.data ?? []).length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface px-6 py-12 text-center">
            <BookMarked className="mx-auto h-6 w-6 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium text-foreground">No bookmarks yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Save anything you want to revisit and it'll show up here.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {(q.data ?? []).map((b) => {
              const r = routeFor(b);
              return (
                <li key={b.id}>
                  <Link
                    {...(r as any)}
                    className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3 transition-colors hover:border-primary/40 hover:bg-muted"
                  >
                    <span className="text-sm font-medium text-foreground">
                      {b.title ?? "Untitled"}
                    </span>
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {b.kind}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
