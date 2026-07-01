import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BookOpen, Layers } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { PublicHeader } from "./courses.index";

export const Route = createFileRoute("/courses/$courseSlug/")({
  head: () => ({ meta: [{ title: "Course · BCA Gurukul" }] }),
  component: CourseDetail,
  notFoundComponent: () => (
    <div className="grid min-h-screen place-items-center bg-background p-6 text-center">
      <div>
        <h1 className="font-display text-2xl text-foreground">Course not found</h1>
        <Link to="/courses" className="mt-3 inline-block text-primary hover:underline">
          Back to all courses
        </Link>
      </div>
    </div>
  ),
});

function CourseDetail() {
  const { courseSlug } = Route.useParams();

  const courseQuery = useQuery({
    queryKey: ["public", "course", courseSlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, code, title, description, duration_years, total_semesters")
        .eq("slug", courseSlug)
        .eq("status", "published")
        .maybeSingle();
      if (error) throw error;
      if (!data) throw notFound();
      return data;
    },
  });

  const semestersQuery = useQuery({
    queryKey: ["public", "semesters", courseQuery.data?.id],
    enabled: !!courseQuery.data?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("semesters")
        .select("id, number, title, description")
        .eq("course_id", courseQuery.data!.id)
        .eq("status", "published")
        .order("number");
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <main className="mx-auto max-w-5xl px-6 py-12">
        <Link
          to="/courses"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> All courses
        </Link>

        {courseQuery.data && (
          <div className="mt-6 flex items-start gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                {courseQuery.data.code}
              </div>
              <h1 className="font-display text-4xl font-semibold text-foreground">
                {courseQuery.data.title}
              </h1>
              {courseQuery.data.description && (
                <p className="mt-3 max-w-3xl text-muted-foreground">
                  {courseQuery.data.description}
                </p>
              )}
            </div>
          </div>
        )}

        <section className="mt-10">
          <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-foreground">
            <Layers className="h-5 w-5 text-primary" /> Semesters
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {semestersQuery.data?.length === 0 && (
              <p className="col-span-full rounded-xl border border-dashed border-border bg-surface p-6 text-sm text-muted-foreground">
                Semesters are being prepared.
              </p>
            )}
            {semestersQuery.data?.map((s) => (
              <Link
                key={s.id}
                to="/courses/$courseSlug/$semesterNumber"
                params={{ courseSlug, semesterNumber: String(s.number) }}
                className="group rounded-xl border border-border bg-surface p-5 transition hover:border-primary/50"
              >
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary text-primary-foreground font-display text-base">
                    {s.number}
                  </span>
                  <div>
                    <div className="font-display text-base font-semibold text-foreground">
                      {s.title}
                    </div>
                    {s.description && (
                      <div className="text-xs text-muted-foreground">{s.description}</div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
