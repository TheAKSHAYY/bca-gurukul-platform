import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, FileText, ListChecks, PlayCircle } from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BCA Gurukul — Learn BCA, the right way" },
      {
        name: "description",
        content:
          "A structured learning platform for BCA students. Notes, past papers, videos, and MCQ practice — organized by semester and subject.",
      },
      { property: "og:title", content: "BCA Gurukul" },
      {
        property: "og:description",
        content:
          "Structured BCA learning — notes, papers, videos, and MCQs by semester and subject.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { user, loading } = useAuth();
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link to="/" className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <span className="font-display text-lg font-semibold">ब</span>
            </div>
            <div className="leading-tight">
              <div className="font-display text-lg font-semibold text-foreground">
                BCA Gurukul
              </div>
              <div className="text-xs text-muted-foreground">
                Structured learning for BCA students
              </div>
            </div>
          </Link>
          <nav className="flex items-center gap-2">
            {loading ? null : user ? (
              <Button asChild size="sm">
                <Link to="/dashboard">
                  Open dashboard
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/auth" search={{ mode: "signin" }}>Sign in</Link>
                </Button>
                <Button asChild size="sm">
                  <Link to="/auth" search={{ mode: "signup" }}>Get started</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
        <section className="max-w-3xl">
          <span className="inline-flex items-center rounded-full border border-accent/40 bg-accent/15 px-3 py-1 text-xs font-medium text-accent-foreground">
            Phase 3 · Authentication live
          </span>
          <h1 className="mt-6 font-display text-4xl font-semibold leading-tight text-foreground sm:text-6xl">
            Learn BCA, the{" "}
            <span className="text-primary">right way.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
            Notes, past papers, videos, and MCQ practice — organized course by
            course, semester by semester, subject by subject. No clutter, no
            guesswork, just a clean path through your syllabus.
          </p>
          {!user && !loading && (
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/auth" search={{ mode: "signup" }}>
                  Create your free account
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/auth" search={{ mode: "signin" }}>I already have an account</Link>
              </Button>
            </div>
          )}
        </section>

        <section className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <FeatureCard
            icon={<BookOpen className="h-5 w-5" />}
            title="Notes"
            body="Curated, semester-wise notes with rich formatting and attachments."
          />
          <FeatureCard
            icon={<FileText className="h-5 w-5" />}
            title="Past papers"
            body="Year-wise PDF papers with an in-app viewer and progress tracking."
          />
          <FeatureCard
            icon={<PlayCircle className="h-5 w-5" />}
            title="Videos"
            body="Lectures embedded from YouTube or uploaded, with resume position."
          />
          <FeatureCard
            icon={<ListChecks className="h-5 w-5" />}
            title="MCQ practice"
            body="Timed quizzes with explanations after every question."
          />
        </section>

        <section className="mt-16 rounded-2xl border border-border bg-surface p-6 sm:p-8">
          <h2 className="font-display text-xl font-semibold text-foreground">
            What's live right now
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Phase 1 establishes the design foundation: typography, color tokens,
            routing shell, and error boundaries. Authentication, the course
            catalog, and the admin CMS follow in the next phases per the
            approved plan.
          </p>
        </section>
      </main>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-3 px-6 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <span>© {new Date().getFullYear()} BCA Gurukul</span>
          <span>Built with care for BCA students.</span>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="group rounded-2xl border border-border bg-surface p-5 transition-colors hover:border-primary/30">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
        {icon}
      </div>
      <h3 className="mt-4 font-display text-base font-semibold text-foreground">
        {title}
      </h3>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
        {body}
      </p>
    </div>
  );
}
