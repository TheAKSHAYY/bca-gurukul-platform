import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, FileText, Bookmark, BookOpen } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { EmptyState } from "@/components/ui/empty-state";
import { PublicHeader } from "./courses.index";

export const Route = createFileRoute("/courses/$courseSlug/$semesterNumber/$subjectSlug/$unitNumber")({
  head: () => ({ meta: [{ title: "Unit · BCA Gurukul" }] }),
  component: UnitDetail,
});

function UnitDetail() {
  const { courseSlug, semesterNumber, subjectSlug, unitNumber } = Route.useParams();

  const dataQuery = useQuery({
    queryKey: ["public", "unit", courseSlug, semesterNumber, subjectSlug, unitNumber],
    queryFn: async () => {
      const { data: course } = await supabase
        .from("courses").select("id, title").eq("slug", courseSlug).eq("status", "published").maybeSingle();
      if (!course) throw notFound();
      const { data: sem } = await supabase
        .from("semesters").select("id, number, title").eq("course_id", course.id)
        .eq("number", Number(semesterNumber)).eq("status", "published").maybeSingle();
      if (!sem) throw notFound();
      const { data: subject } = await supabase
        .from("subjects").select("id, code, title").eq("semester_id", sem.id)
        .eq("slug", subjectSlug).eq("status", "published").maybeSingle();
      if (!subject) throw notFound();
      const { data: unit } = await supabase
        .from("units").select("id, number, title, summary").eq("subject_id", subject.id)
        .eq("number", Number(unitNumber)).eq("status", "published").maybeSingle();
      if (!unit) throw notFound();

      const { data: notes } = await supabase
        .from("notes")
        .select("id, title, summary, file_path")
        .eq("unit_id", unit.id)
        .eq("status", "published")
        .order("sort_order")
        .order("created_at");

      return { course, sem, subject, unit, notes: notes ?? [] };
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <main className="mx-auto max-w-5xl px-6 py-12">
        {dataQuery.data && (
          <>
            <Link
              to="/courses/$courseSlug/$semesterNumber/$subjectSlug"
              params={{ courseSlug, semesterNumber, subjectSlug }}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" /> {dataQuery.data.subject.title}
            </Link>

            <div className="mt-6 flex items-start gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/10 font-display text-base font-semibold text-primary">
                {dataQuery.data.unit.number}
              </span>
              <div>
                <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                  Unit {dataQuery.data.unit.number}
                </div>
                <h1 className="font-display text-3xl font-semibold text-foreground">
                  {dataQuery.data.unit.title}
                </h1>
                {dataQuery.data.unit.summary && (
                  <p className="mt-2 max-w-3xl text-muted-foreground">{dataQuery.data.unit.summary}</p>
                )}
              </div>
            </div>


            <section className="mt-10">
              <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-foreground">
                <FileText className="h-5 w-5 text-primary" /> Notes
              </h2>
              <div className="mt-4 space-y-3">
                {dataQuery.data.notes.length === 0 && (
                  <EmptyState
                    icon={FileText}
                    tone="accent"
                    title="Notes are being prepared"
                    description="A senior is curating structured, exam-ready notes for this unit. As soon as they're published, you'll see them right here."
                    tip="Bookmark this unit and we'll keep your spot — pick up exactly where you left off."
                    primaryAction={{
                      label: "Bookmark this unit",
                      to: "/dashboard",
                      icon: Bookmark,
                    }}
                    secondaryAction={{
                      label: "Explore other units",
                      to: "/courses",
                      icon: BookOpen,
                    }}
                  />
                )}
                {dataQuery.data.notes.map((n) => (
                  <Link
                    key={n.id}
                    to="/notes/$noteId"
                    params={{ noteId: n.id }}
                    className="block rounded-xl border border-border bg-surface p-5 transition hover:border-primary"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      <h3 className="font-display text-base font-semibold text-foreground">{n.title}</h3>
                      {n.file_path && <span className="text-xs text-muted-foreground">· PDF</span>}
                    </div>
                    {n.summary && <p className="mt-1 text-sm text-muted-foreground">{n.summary}</p>}
                  </Link>
                ))}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
