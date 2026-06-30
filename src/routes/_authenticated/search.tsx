import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { BookOpen, FileText, GraduationCap, Layers, ListChecks, Loader2, Search } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";

const searchSchema = z.object({ q: z.string().optional().default("") });

export const Route = createFileRoute("/_authenticated/search")({
  validateSearch: searchSchema,
  head: ({ match }) => ({
    meta: [{ title: `${match.search.q ? `${match.search.q} · ` : ""}Search · BCA Gurukul` }],
  }),
  component: SearchPage,
});

type SearchHit = {
  id: string;
  title: string;
  description: string;
  slug: string | null;
  kind: "course" | "semester" | "subject" | "unit" | "note" | "paper" | "quiz";
  rank: number;
};

type SearchResult = {
  courses: SearchHit[];
  semesters: SearchHit[];
  subjects: SearchHit[];
  units: SearchHit[];
  notes: SearchHit[];
  papers: SearchHit[];
  quizzes: SearchHit[];
};

function SearchPage() {
  const { q } = Route.useSearch();
  const navigate = useNavigate();
  const [input, setInput] = useState(q);
  const [debounced, setDebounced] = useState(q);

  useEffect(() => setInput(q), [q]);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(input.trim()), 250);
    return () => clearTimeout(id);
  }, [input]);

  // Keep URL in sync (so /search is shareable)
  useEffect(() => {
    if (debounced !== q) {
      navigate({ to: "/search", search: { q: debounced }, replace: true });
    }
  }, [debounced, q, navigate]);

  const enabled = debounced.length >= 2;
  const query = useQuery({
    queryKey: ["global-search", debounced],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("student_search", {
        _query: debounced,
        _max_results: 50,
      });
      if (error) throw error;
      const hits = ((data ?? []) as SearchHit[]).sort((a, b) => b.rank - a.rank);
      return hits.reduce<SearchResult>(
        (acc, hit) => {
          if (hit.kind === "course") acc.courses.push(hit);
          if (hit.kind === "semester") acc.semesters.push(hit);
          if (hit.kind === "subject") acc.subjects.push(hit);
          if (hit.kind === "unit") acc.units.push(hit);
          if (hit.kind === "note") acc.notes.push(hit);
          if (hit.kind === "paper") acc.papers.push(hit);
          if (hit.kind === "quiz") acc.quizzes.push(hit);
          return acc;
        },
        { courses: [], semesters: [], subjects: [], units: [], notes: [], papers: [], quizzes: [] }
      );
    },
  });

  const total = useMemo(() => {
    const d = query.data;
    return d
      ? d.courses.length +
          d.semesters.length +
          d.subjects.length +
          d.units.length +
          d.notes.length +
          d.papers.length +
          d.quizzes.length
      : 0;
  }, [query.data]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-semibold text-foreground">Search</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Find published courses, semesters, subjects, units, notes, papers and quizzes.
      </p>

      <div className="relative mt-6">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type at least 2 characters…"
          className="pl-9"
        />
      </div>

      <div className="mt-8">
        {!enabled ? (
          <EmptyState
            title="Start typing to search"
            body="Search across the entire library. Results respect your permissions."
          />
        ) : query.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Searching…
          </div>
        ) : query.error ? (
          <p className="text-sm text-destructive">Something went wrong. Try again.</p>
        ) : total === 0 ? (
          <EmptyState
            title="No matches"
            body={`Nothing found for "${debounced}". Try a different keyword.`}
          />
        ) : (
        <div className="space-y-8">
            <Group icon={GraduationCap} title="Courses" items={query.data!.courses} render={(c) => (
              <Link to="/courses/$courseSlug" params={{ courseSlug: c.slug ?? c.id }} className={linkClass}>
                {c.title}
                {c.description ? <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{c.description}</p> : null}
              </Link>
            )} />
            <Group icon={Layers} title="Semesters" items={query.data!.semesters} render={(s) => (
              <Link to="/courses" className={linkClass}>{s.title}</Link>
            )} />
            <Group icon={BookOpen} title="Subjects" items={query.data!.subjects} render={(s) => (
              <Link to="/courses" className={linkClass}>{s.title}</Link>
            )} />
            <Group icon={Layers} title="Units" items={query.data!.units} render={(u) => (
              <Link to="/courses" className={linkClass}>{u.title}</Link>
            )} />
            <Group icon={FileText} title="Notes" items={query.data!.notes} render={(n) => (
              <Link to="/notes/$noteId" params={{ noteId: n.id }} className={linkClass}>{n.title}</Link>
            )} />
            <Group icon={FileText} title="Papers" items={query.data!.papers} render={(p) => (
              <Link to="/papers/$paperId" params={{ paperId: p.id }} className={linkClass}>{p.title}</Link>
            )} />
            <Group icon={ListChecks} title="Quizzes" items={query.data!.quizzes} render={(q) => (
              <Link to="/quizzes/$quizId" params={{ quizId: q.id }} className={linkClass}>{q.title}</Link>
            )} />
          </div>
        )}
      </div>
    </div>
  );
}

const linkClass =
  "block rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground transition-colors hover:border-primary/40 hover:bg-muted";

function Group<T extends SearchHit>({
  icon: Icon,
  title,
  items,
  render,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  items: T[];
  render: (item: T) => React.ReactNode;
}) {
  if (items.length === 0) return null;
  return (
    <section>
      <h2 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {title} <span className="text-muted-foreground/70">({items.length})</span>
      </h2>
      <div className="grid gap-2 sm:grid-cols-2">
        {items.map((it) => (
          <div key={it.id}>{render(it)}</div>
        ))}
      </div>
    </section>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-surface px-6 py-12 text-center">
      <Search className="mx-auto h-6 w-6 text-muted-foreground" />
      <p className="mt-3 text-sm font-medium text-foreground">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{body}</p>
    </div>
  );
}
