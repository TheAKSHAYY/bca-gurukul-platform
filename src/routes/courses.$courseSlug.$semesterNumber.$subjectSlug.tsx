import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, FileStack, ListTree } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { PublicHeader } from "./courses.index";

export const Route = createFileRoute("/courses/$courseSlug/$semesterNumber/$subjectSlug")({
  head: () => ({ meta: [{ title: "Subject · BCA Gurukul" }] }),
  component: SubjectDetail,
});

function SubjectDetail() {
  const { courseSlug, semesterNumber, subjectSlug } = Route.useParams();

  const subjectQuery = useQuery({
    queryKey: ["public", "subject", courseSlug, semesterNumber, subjectSlug],
    queryFn: async () => {
      const { data: course, error: ce } = await supabase
        .from("courses")
        .select("id, title")
        .eq("slug", courseSlug)
        .eq("status", "published")
        .maybeSingle();
      if (ce) throw ce;
      if (!course) throw notFound();

      const { data: sem, error: se } = await supabase
        .from("semesters")
        .select("id, number, title")
        .eq("course_id", course.id)
        .eq("number", Number(semesterNumber))
        .eq("status", "published")
        .maybeSingle();
      if (se) throw se;
      if (!sem) throw notFound();

      const { data: subject, error: sue } = await supabase
        .from("subjects")
        .select("id, code, title, description, credits")
        .eq("semester_id", sem.id)
        .eq("slug", subjectSlug)
        .eq("status", "published")
        .maybeSingle();
      if (sue) throw sue;
      if (!subject) throw notFound();

      const { data: units, error: ue } = await supabase
        .from("units")
        .select("id, number, title, summary")
        .eq("subject_id", subject.id)
        .eq("status", "published")
        .order("number");
      if (ue) throw ue;

      const { data: papers } = await supabase
        .from("papers")
        .select("id, title, year, exam_type, paper_number")
        .eq("subject_id", subject.id)
        .eq("status", "published")
        .order("year", { ascending: false });

      return { course, sem, subject, units: units ?? [], papers: papers ?? [] };
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <main className="mx-auto max-w-5xl px-6 py-12">
        {subjectQuery.data && (
          <>
            <Link
              to="/courses/$courseSlug/$semesterNumber"
              params={{ courseSlug, semesterNumber }}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" /> {subjectQuery.data.sem.title}
            </Link>

            <div className="mt-6">
              <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                {subjectQuery.data.subject.code}
              </div>
              <h1 className="font-display text-4xl font-semibold text-foreground">
                {subjectQuery.data.subject.title}
              </h1>
              {subjectQuery.data.subject.description && (
                <p className="mt-3 max-w-3xl text-muted-foreground">
                  {subjectQuery.data.subject.description}
                </p>
              )}
              {subjectQuery.data.subject.credits != null && (
                <div className="mt-2 text-sm text-muted-foreground">
                  {subjectQuery.data.subject.credits} credits
                </div>
              )}
            </div>

            <section className="mt-10">
              <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-foreground">
                <ListTree className="h-5 w-5 text-primary" /> Units
              </h2>
              <ol className="mt-4 space-y-3">
                {subjectQuery.data.units.length === 0 && (
                  <li className="rounded-xl border border-dashed border-border bg-surface p-6 text-sm text-muted-foreground">
                    Units coming soon.
                  </li>
                )}
                {subjectQuery.data.units.map((u) => (
                  <li key={u.id}>
                    <Link
                      to="/courses/$courseSlug/$semesterNumber/$subjectSlug/$unitNumber"
                      params={{
                        courseSlug,
                        semesterNumber,
                        subjectSlug,
                        unitNumber: String(u.number),
                      }}
                      className="block rounded-xl border border-border bg-surface p-5 transition hover:border-primary"
                    >
                      <div className="flex items-start gap-4">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 font-display text-sm font-semibold text-primary">
                          {u.number}
                        </span>
                        <div>
                          <h3 className="font-display text-lg font-semibold text-foreground">{u.title}</h3>
                          {u.summary && <p className="mt-1 text-sm text-muted-foreground">{u.summary}</p>}
                          <p className="mt-3 text-xs text-primary">Open unit →</p>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ol>
            </section>


            <section className="mt-12">
              <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-foreground">
                <FileStack className="h-5 w-5 text-primary" /> Previous-year papers
              </h2>
              <div className="mt-4 space-y-3">
                {subjectQuery.data.papers.length === 0 && (
                  <p className="rounded-xl border border-dashed border-border bg-surface p-6 text-sm text-muted-foreground">
                    No past papers archived yet for this subject.
                  </p>
                )}
                {subjectQuery.data.papers.map((p) => (
                  <Link key={p.id} to="/papers/$paperId" params={{ paperId: p.id }}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4 transition hover:border-primary">
                    <div>
                      <div className="font-display text-base font-semibold text-foreground">{p.title}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <Badge>{p.year}</Badge>
                        <Badge variant="outline">{p.exam_type.replace("_", " ")}</Badge>
                        {p.paper_number && <Badge variant="outline">#{p.paper_number}</Badge>}
                      </div>
                    </div>
                    <span className="text-xs text-primary">Open paper →</span>
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
