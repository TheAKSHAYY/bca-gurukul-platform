import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BookText } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { PublicHeader } from "./courses.index";

export const Route = createFileRoute("/courses/$courseSlug/$semesterNumber/")({
  head: () => ({ meta: [{ title: "Semester · BCA Gurukul" }] }),
  component: SemesterDetail,
});

function SemesterDetail() {
  const { courseSlug, semesterNumber } = Route.useParams();

  const semQuery = useQuery({
    queryKey: ["public", "sem", courseSlug, semesterNumber],
    queryFn: async () => {
      const { data: course, error: ce } = await supabase
        .from("courses")
        .select("id, code, title, slug")
        .eq("slug", courseSlug)
        .eq("status", "published")
        .maybeSingle();
      if (ce) throw ce;
      if (!course) throw notFound();

      const { data: sem, error: se } = await supabase
        .from("semesters")
        .select("id, number, title, description")
        .eq("course_id", course.id)
        .eq("number", Number(semesterNumber))
        .eq("status", "published")
        .maybeSingle();
      if (se) throw se;
      if (!sem) throw notFound();

      const { data: subjects, error: sue } = await supabase
        .from("subjects")
        .select("id, code, slug, title, description, credits")
        .eq("semester_id", sem.id)
        .eq("status", "published")
        .is("deleted_at", null)
        .order("sort_order")
        .order("code");
      if (sue) throw sue;

      return { course, sem, subjects: subjects ?? [] };
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <main className="mx-auto max-w-5xl px-6 py-12">
        {semQuery.data && (
          <>
            <Link
              to="/courses/$courseSlug"
              params={{ courseSlug }}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" /> {semQuery.data.course.title}
            </Link>

            <div className="mt-6 flex items-start gap-4">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-primary text-primary-foreground font-display text-lg">
                {semQuery.data.sem.number}
              </span>
              <div>
                <h1 className="font-display text-3xl font-semibold text-foreground">
                  {semQuery.data.sem.title}
                </h1>
                {semQuery.data.sem.description && (
                  <p className="mt-2 text-muted-foreground">{semQuery.data.sem.description}</p>
                )}
              </div>
            </div>

            <section className="mt-10">
              <h2 className="font-display text-xl font-semibold text-foreground">Subjects</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {semQuery.data.subjects.length === 0 && (
                  <p className="col-span-full rounded-xl border border-dashed border-border bg-surface p-6 text-sm text-muted-foreground">
                    No subjects published yet.
                  </p>
                )}
                {semQuery.data.subjects.map((s) => (
                  <Link
                    key={s.id}
                    to="/courses/$courseSlug/$semesterNumber/$subjectSlug"
                    params={{ courseSlug, semesterNumber, subjectSlug: s.slug }}
                    className="group rounded-xl border border-border bg-surface p-5 transition hover:border-primary/50"
                  >
                    <div className="flex items-start gap-3">
                      <BookText className="mt-0.5 h-5 w-5 text-primary" />
                      <div className="flex-1">
                        <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                          {s.code}
                        </div>
                        <div className="font-display text-base font-semibold text-foreground">{s.title}</div>
                        {s.description && (
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{s.description}</p>
                        )}
                        {s.credits != null && (
                          <div className="mt-2 text-xs text-muted-foreground">{s.credits} credits</div>
                        )}
                      </div>
                    </div>
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
