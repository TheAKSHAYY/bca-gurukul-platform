import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  Compass,
  FileText,
  GraduationCap,
  ListChecks,
  Mail,
  PlayCircle,
  Quote,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Zap,
} from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/brand-mark";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BCA Gurukul — Master your BCA, semester by semester" },
      {
        name: "description",
        content:
          "The structured learning platform for BCA students. Notes, past papers, video lectures, and MCQ practice — organized by semester and subject.",
      },
      { property: "og:title", content: "BCA Gurukul — Master your BCA" },
      {
        property: "og:description",
        content:
          "Structured BCA learning — notes, papers, videos, and MCQs by semester and subject.",
      },
    ],
  }),
  component: Index,
});

type HomepageSection = { id: string; type: string; position: number; enabled: boolean };

function Index() {
  const { user, loading } = useAuth();
  const { data: sections, isLoading } = useQuery({
    queryKey: ["homepage_sections", "public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("homepage_sections")
        .select("id,type,position,enabled")
        .eq("enabled", true)
        .order("position", { ascending: true });
      if (error) throw error;
      return (data ?? []) as HomepageSection[];
    },
    staleTime: 60_000,
  });

  const list = sections ?? [];
  const showEmpty = !isLoading && list.length === 0;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader user={user} loading={loading} />
      <main>
        {isLoading ? (
          <LandingSkeleton />
        ) : showEmpty ? (
          <EmptyLanding user={user} loading={loading} />
        ) : (
          list.map((s) => {
            switch (s.type) {
              case "hero":
                return <Hero key={s.id} user={user} loading={loading} />;
              case "trust_bar":
                return <TrustBar key={s.id} />;
              case "features":
                return <Features key={s.id} />;
              case "why_choose":
                return <WhyChoose key={s.id} />;
              case "journey":
                return <Journey key={s.id} />;
              case "semester_overview":
                return <Semesters key={s.id} />;
              case "benefits":
                return <Benefits key={s.id} />;
              case "testimonials":
                return <Testimonials key={s.id} />;
              case "faq":
                return <FAQ key={s.id} />;
              case "cta":
                return <CTA key={s.id} user={user} loading={loading} />;
              case "contact":
                return <Contact key={s.id} />;
              default:
                return null;
            }
          })
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

function LandingSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
      <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
        <Skeleton className="mb-8 h-6 w-48 rounded-full" />
        <Skeleton className="h-14 w-full max-w-2xl rounded-lg sm:h-20" />
        <Skeleton className="mt-6 h-5 w-full max-w-xl rounded-lg" />
        <Skeleton className="mt-6 h-5 w-5/6 max-w-lg rounded-lg" />
        <div className="mt-9 flex gap-3">
          <Skeleton className="h-12 w-40 rounded-xl" />
          <Skeleton className="h-12 w-36 rounded-xl" />
        </div>
      </div>
      <div className="mt-20 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    </div>
  );
}

function EmptyLanding({ user, loading }: { user: unknown; loading: boolean }) {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto max-w-3xl px-6 py-24 text-center sm:py-32">
        <div className="mx-auto inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted-foreground">
          <Sparkles className="h-3 w-3" />
          BCA Gurukul
        </div>
        <h1 className="mt-6 font-display text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          Your platform is ready.
        </h1>
        <p className="mt-4 text-base text-muted-foreground">
          No homepage content has been published yet. An administrator can compose this
          page from the admin panel — every section is editable, nothing is hardcoded.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {!loading && !user ? (
            <Button asChild size="lg">
              <Link to="/auth">Sign in</Link>
            </Button>
          ) : null}
          {!loading && user ? (
            <Button asChild size="lg">
              <Link to="/admin">Open admin panel</Link>
            </Button>
          ) : null}

          <Button asChild variant="outline" size="lg">
            <Link to="/courses">Browse courses</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}


/* ──────────────────────────────────────────────────────────── Header */

function SiteHeader({ user, loading }: { user: unknown; loading: boolean }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-3">
          <BrandMark className="h-10 w-10" />
          <div className="leading-tight">
            <div className="font-display text-lg font-semibold text-foreground">
              BCA Gurukul
            </div>
            <div className="hidden text-xs text-muted-foreground sm:block">
              Structured learning for BCA students
            </div>
          </div>
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          <a
            href="#features"
            className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Features
          </a>
          <a
            href="#journey"
            className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Journey
          </a>
          <a
            href="#semesters"
            className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Semesters
          </a>
          <a
            href="#faq"
            className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            FAQ
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link to="/courses">Browse</Link>
          </Button>
          {loading ? null : user ? (
            <Button asChild size="sm">
              <Link to="/dashboard">
                Dashboard
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/auth" search={{ mode: "signin" }}>
                  Sign in
                </Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/auth" search={{ mode: "signup" }}>
                  Get started
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

/* ──────────────────────────────────────────────────────────── Hero */

function Hero({ user, loading }: { user: unknown; loading: boolean }) {
  return (
    <section className="relative overflow-hidden border-b border-border/60">
      {/* Soft saffron aurora behind the headline */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-[-12rem] h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-accent/25 blur-[120px]" />
        <div className="absolute left-[10%] top-1/2 h-72 w-72 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute right-[10%] top-1/3 h-72 w-72 rounded-full bg-accent/15 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              "radial-gradient(currentColor 1px, transparent 1px)",
            backgroundSize: "28px 28px",
            color: "var(--color-foreground)",
          }}
        />
      </div>

      <div className="mx-auto flex max-w-3xl flex-col items-center px-6 pb-20 pt-20 text-center sm:pt-28">
        {/* Eyebrow pill with pulsing saffron dot */}
        <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 animate-fade-in">
          <span className="relative grid h-2 w-2 place-items-center">
            <span className="absolute inset-0 animate-ping rounded-full bg-accent/60" />
            <span className="relative h-2 w-2 rounded-full bg-accent" />
          </span>
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            BCA Batch 2025–26 is live
          </span>
        </div>

        {/* Headline with italic-saffron accent word */}
        <h1 className="mt-8 font-display text-5xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
          Master your BCA <br className="hidden sm:block" />
          <span className="italic text-accent">journey</span>, with clarity.
        </h1>

        <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          One organised home for notes, past papers, video lectures and timed
          MCQ practice — curated semester by semester, so you always know
          exactly what to study next.
        </p>

        {/* Stacked-then-row CTAs, primary first */}
        <div className="mt-9 flex w-full max-w-sm flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
          {loading ? null : user ? (
            <Button asChild size="lg" className="h-12 px-7 text-base shadow-lg shadow-primary/15">
              <Link to="/dashboard">
                Open your dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          ) : (
            <Button asChild size="lg" className="h-12 px-7 text-base shadow-lg shadow-primary/15">
              <Link to="/auth" search={{ mode: "signup" }}>
                Start learning free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          )}
          <Button
            asChild
            size="lg"
            variant="outline"
            className="h-12 border-2 border-border/80 px-7 text-base"
          >
            <Link to="/courses">
              Browse syllabus
              <ArrowUpRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        </div>

        {/* Reassurance row */}
        <div className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-success" />
            Free for every BCA student
          </span>
          <span className="hidden h-1 w-1 rounded-full bg-border sm:inline-block" />
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-success" />
            No credit card
          </span>
          <span className="hidden h-1 w-1 rounded-full bg-border sm:inline-block" />
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-success" />
            Mobile-first
          </span>
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────── Trust bar */

type LandingStats = {
  students: number;
  notes: number;
  papers: number;
  quizzes: number;
  semesters: number;
};

function useLandingStats() {
  return useQuery({
    queryKey: ["landing_stats"],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<LandingStats> => {
      const head = { count: "exact" as const, head: true };
      const [s, n, p, q, sem] = await Promise.all([
        supabase.from("profiles").select("*", head),
        supabase.from("notes").select("*", head).eq("status", "published").is("deleted_at", null),
        supabase.from("papers").select("*", head).eq("status", "published").is("deleted_at", null),
        supabase.from("quizzes").select("*", head).eq("status", "published").is("deleted_at", null),
        supabase.from("semesters").select("*", head).eq("status", "published").is("deleted_at", null),
      ]);
      return {
        students: s.count ?? 0,
        notes: n.count ?? 0,
        papers: p.count ?? 0,
        quizzes: q.count ?? 0,
        semesters: sem.count ?? 0,
      };
    },
  });
}

function formatCompact(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return n.toString();
}

function TrustBar() {
  const { data } = useLandingStats();
  const stats = data ?? { students: 0, notes: 0, papers: 0, quizzes: 0, semesters: 6 };

  // Honest zero-state copy: lead with what's structurally true (6 semesters covered)
  // even before students arrive. Stars stay rendered as design signal, not as a
  // false rating.
  const items: Array<{ value: string; label: string; sub?: React.ReactNode }> = [
    {
      value: stats.students > 0 ? formatCompact(stats.students) : `${stats.semesters || 6}`,
      label: stats.students > 0 ? "Students learning" : "Semesters covered",
      sub: (
        <div className="flex -space-x-1.5">
          <span className="h-4 w-4 rounded-full border border-background bg-primary/80" />
          <span className="h-4 w-4 rounded-full border border-background bg-accent/80" />
          <span className="h-4 w-4 rounded-full border border-background bg-primary/40" />
        </div>
      ),
    },
    {
      value: stats.notes > 0 ? formatCompact(stats.notes) : "Curated",
      label: "Study notes",
    },
    {
      value: stats.papers > 0 ? formatCompact(stats.papers) : "Year-wise",
      label: "Past papers",
    },
    {
      value: stats.quizzes > 0 ? formatCompact(stats.quizzes) : "Timed",
      label: "MCQ practice",
      sub: (
        <div className="flex text-accent">
          {[0, 1, 2, 3, 4].map((i) => (
            <Star key={i} className="h-3 w-3 fill-current" />
          ))}
        </div>
      ),
    },
  ];

  return (
    <section className="border-b border-border/60 bg-surface/70 backdrop-blur-sm">
      <div className="mx-auto max-w-6xl px-6 py-10 sm:py-12">
        <p className="text-center text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
          Built for every BCA student in India
        </p>
        <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {items.map((it) => (
            <div
              key={it.label}
              className="group flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-border/60 bg-background p-5 text-center transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md hover:shadow-primary/5"
            >
              <span className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {it.value}
              </span>
              {it.sub ? <div className="mt-0.5">{it.sub}</div> : null}
              <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                {it.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────── Features */

function Features() {
  return (
    <section id="features" className="border-b border-border/60 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading
          eyebrow="Everything you need"
          title="One platform, four pillars of preparation"
          body="Each unit is paired with notes, papers, videos and a quiz — so theory, revision and practice live in the same place."
        />
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <FeatureCard
            icon={<BookOpen className="h-5 w-5" />}
            title="Structured notes"
            body="Hand-curated, semester-wise notes with diagrams, code snippets and downloadable PDFs."
          />
          <FeatureCard
            icon={<FileText className="h-5 w-5" />}
            title="Past papers"
            body="Year-wise question papers with an in-app PDF viewer and one-tap downloads."
          />
          <FeatureCard
            icon={<PlayCircle className="h-5 w-5" />}
            title="Video lectures"
            body="Curated YouTube playlists embedded next to the unit — no tab-hopping."
          />
          <FeatureCard
            icon={<ListChecks className="h-5 w-5" />}
            title="MCQ practice"
            body="Timed quizzes with detailed explanations after every question."
          />
        </div>
      </div>
    </section>
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
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-surface p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5">
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 transition-opacity group-hover:opacity-100"
      />
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
        {icon}
      </div>
      <h3 className="mt-5 font-display text-lg font-semibold text-foreground">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {body}
      </p>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────── Why choose */

function WhyChoose() {
  const reasons = [
    {
      icon: <Target className="h-5 w-5" />,
      title: "Syllabus-aligned",
      body: "Every unit maps directly to your university syllabus — no extra noise.",
    },
    {
      icon: <Zap className="h-5 w-5" />,
      title: "Fast & focused",
      body: "Built like Linear, not like a 2010 LMS. Keyboard-friendly, mobile-fast.",
    },
    {
      icon: <ShieldCheck className="h-5 w-5" />,
      title: "Made by seniors",
      body: "Curated by students who recently cleared the exam — what worked, no fluff.",
    },
    {
      icon: <Compass className="h-5 w-5" />,
      title: "Always-on guidance",
      body: "Clear progress markers tell you what's next and what's still pending.",
    },
  ];
  return (
    <section className="border-b border-border/60 bg-surface-muted/40 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading
          eyebrow="Why BCA Gurukul"
          title="Designed around how BCA students actually study"
          body="The syllabus is messy. Your study workflow shouldn't be."
        />
        <div className="mt-14 grid gap-6 sm:grid-cols-2">
          {reasons.map((r) => (
            <div
              key={r.title}
              className="flex gap-4 rounded-2xl border border-border bg-surface p-6"
            >
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent/20 text-accent-foreground">
                {r.icon}
              </div>
              <div className="min-w-0">
                <h3 className="font-display text-lg font-semibold text-foreground">
                  {r.title}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {r.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────── Journey */

function Journey() {
  const steps = [
    {
      step: "01",
      title: "Pick your semester",
      body: "Choose your course and current semester — we'll show only what's relevant.",
    },
    {
      step: "02",
      title: "Study the unit",
      body: "Read structured notes, watch the curated lecture, skim the past paper.",
    },
    {
      step: "03",
      title: "Practice with MCQs",
      body: "Lock in concepts with timed quizzes and read the explanations.",
    },
    {
      step: "04",
      title: "Walk into the exam ready",
      body: "Track progress across units — know exactly what's left before the exam.",
    },
  ];
  return (
    <section id="journey" className="border-b border-border/60 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading
          eyebrow="Your learning journey"
          title="From syllabus to confidence in four clear steps"
        />
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <div key={s.step} className="relative">
              <div className="rounded-2xl border border-border bg-surface p-6">
                <div className="font-display text-3xl font-semibold text-primary/30">
                  {s.step}
                </div>
                <h3 className="mt-2 font-display text-lg font-semibold text-foreground">
                  {s.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {s.body}
                </p>
              </div>
              {i < steps.length - 1 && (
                <div
                  aria-hidden
                  className="absolute -right-3 top-1/2 hidden h-px w-6 -translate-y-1/2 bg-border lg:block"
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────── Semesters */

function Semesters() {
  const semesters = [
    { n: 1, focus: "Foundations: C, Maths, Digital Logic" },
    { n: 2, focus: "Data Structures, OOP with C++" },
    { n: 3, focus: "DBMS, Operating Systems, Java" },
    { n: 4, focus: "Computer Networks, Web Tech, Stats" },
    { n: 5, focus: "Software Engg, Python, .NET" },
    { n: 6, focus: "Project, Cloud, AI Fundamentals" },
  ];
  return (
    <section
      id="semesters"
      className="border-b border-border/60 bg-surface-muted/40 py-20 sm:py-28"
    >
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading
          eyebrow="Semester overview"
          title="Six semesters, one organised path"
          body="A bird's-eye view of what each semester covers in the typical BCA curriculum."
        />
        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {semesters.map((s) => (
            <Link
              key={s.n}
              to="/courses"
              className="group rounded-2xl border border-border bg-surface p-5 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground">
                    <span className="font-display text-base font-semibold">
                      {s.n}
                    </span>
                  </div>
                  <div className="font-display text-base font-semibold text-foreground">
                    Semester {s.n}
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{s.focus}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────── Benefits */

function Benefits() {
  const items = [
    "Free for every BCA student — no paywalls",
    "Mobile-first — study from your phone in transit",
    "Bookmark units and pick up exactly where you left off",
    "MCQ explanations so you learn from every mistake",
    "Download notes and papers for offline reading",
    "Dark mode that's actually easy on the eyes",
  ];
  return (
    <section className="border-b border-border/60 py-20 sm:py-28">
      <div className="mx-auto grid max-w-6xl gap-12 px-6 lg:grid-cols-2 lg:items-center">
        <div>
          <SectionHeading
            align="left"
            eyebrow="Student benefits"
            title="Built for students, by students"
            body="Every decision — from typography to MCQ flow — was made by people who've sat in your seat."
          />
        </div>
        <ul className="space-y-3">
          {items.map((i) => (
            <li
              key={i}
              className="flex items-start gap-3 rounded-xl border border-border bg-surface p-4"
            >
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
              <span className="text-sm text-foreground">{i}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────── Testimonials */

function Testimonials() {
  return (
    <section className="border-b border-border/60 bg-surface-muted/40 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading
          eyebrow="What students say"
          title="Real stories, coming soon"
          body="We're rolling out across colleges this semester. Your story could be one of the first."
        />
        <div className="mx-auto mt-12 max-w-2xl rounded-3xl border border-dashed border-border bg-surface p-10 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-accent/20 text-accent-foreground">
            <Quote className="h-6 w-6" />
          </div>
          <h3 className="mt-4 font-display text-xl font-semibold text-foreground">
            Be one of the first voices
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Use BCA Gurukul this semester and share how it helped. We'll feature
            real student stories here once we have them — no fake quotes.
          </p>
          <Button asChild className="mt-6" variant="outline">
            <Link to="/auth" search={{ mode: "signup" }}>
              Join the early cohort
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────── FAQ */

function FAQ() {
  const items = [
    {
      q: "Is BCA Gurukul free?",
      a: "Yes — the core platform is free for all BCA students. You only need an email to sign up.",
    },
    {
      q: "Does it cover my university's syllabus?",
      a: "We follow the standard Indian BCA syllabus and cover the most common subjects across universities. Unit names may differ slightly, but the underlying concepts are the same.",
    },
    {
      q: "Can I use it on my phone?",
      a: "Absolutely. The interface is built mobile-first — notes, PDFs, videos and quizzes all work great on small screens.",
    },
    {
      q: "Can I download notes and past papers?",
      a: "Yes. All notes and past papers are downloadable PDFs so you can study offline before exams.",
    },
    {
      q: "How are the MCQ quizzes structured?",
      a: "Each unit has a quiz with a mix of conceptual and application-level questions. After you submit, you see your score and a detailed explanation for every question.",
    },
    {
      q: "Will more subjects be added?",
      a: "Yes — we're expanding coverage across all six semesters. New units, papers and quizzes are added every week.",
    },
  ];
  return (
    <section id="faq" className="border-b border-border/60 py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-6">
        <SectionHeading
          eyebrow="FAQ"
          title="Frequently asked questions"
        />
        <Accordion type="single" collapsible className="mt-12">
          {items.map((it, idx) => (
            <AccordionItem key={idx} value={`item-${idx}`}>
              <AccordionTrigger className="text-left font-display text-base font-semibold">
                {it.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                {it.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────── CTA */

function CTA({ user, loading }: { user: unknown; loading: boolean }) {
  return (
    <section className="border-b border-border/60 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary to-primary/80 p-10 text-center shadow-xl shadow-primary/20 sm:p-16">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-accent/30 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-32 -left-10 h-72 w-72 rounded-full bg-accent/20 blur-3xl"
          />
          <GraduationCap className="mx-auto h-10 w-10 text-primary-foreground/90" />
          <h2 className="mt-4 font-display text-3xl font-semibold text-primary-foreground sm:text-5xl">
            Your best semester starts today.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-primary-foreground/80">
            Free for students. Sign up in 30 seconds and start with your current
            semester.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {loading ? null : user ? (
              <Button asChild size="lg" variant="secondary">
                <Link to="/dashboard">
                  Open dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild size="lg" variant="secondary">
                  <Link to="/auth" search={{ mode: "signup" }}>
                    Create free account
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
                >
                  <Link to="/courses">Browse syllabus</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────── Contact */

function Contact() {
  return (
    <section id="contact" className="py-20 sm:py-24">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <SectionHeading
            align="left"
            eyebrow="Contact"
            title="Have a question or feedback?"
            body="Whether you've spotted a typo, want a unit added, or just want to say hi — we read every message."
          />
          <div className="mt-6 space-y-3 text-sm">
            <a
              href="mailto:hello@bcagurukul.app"
              className="flex items-center gap-3 text-foreground hover:text-primary"
            >
              <Mail className="h-4 w-4" />
              hello@bcagurukul.app
            </a>
          </div>
        </div>
        <form
          onSubmit={(e) => e.preventDefault()}
          className="rounded-2xl border border-border bg-surface p-6"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="contact-name"
                className="text-sm font-medium text-foreground"
              >
                Name
              </label>
              <input
                id="contact-name"
                type="text"
                className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
                placeholder="Your name"
              />
            </div>
            <div>
              <label
                htmlFor="contact-email"
                className="text-sm font-medium text-foreground"
              >
                Email
              </label>
              <input
                id="contact-email"
                type="email"
                className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
                placeholder="you@email.com"
              />
            </div>
          </div>
          <div className="mt-4">
            <label
              htmlFor="contact-msg"
              className="text-sm font-medium text-foreground"
            >
              Message
            </label>
            <textarea
              id="contact-msg"
              rows={4}
              className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
              placeholder="What's on your mind?"
            />
          </div>
          <Button type="submit" className="mt-4 w-full sm:w-auto">
            Send message
          </Button>
          <p className="mt-3 text-xs text-muted-foreground">
            Form is a placeholder until the contact backend ships.
          </p>
        </form>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────── Footer */

function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-surface-muted/60">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Link to="/" className="flex items-center gap-3">
              <BrandMark className="h-10 w-10" />
              <div className="font-display text-base font-semibold text-foreground">
                BCA Gurukul
              </div>
            </Link>
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">
              The structured learning home for BCA students across India.
            </p>
          </div>
          <FooterCol
            title="Product"
            links={[
              { label: "Browse courses", to: "/courses" },
              { label: "Features", href: "#features" },
              { label: "Semesters", href: "#semesters" },
              { label: "FAQ", href: "#faq" },
            ]}
          />
          <FooterCol
            title="Account"
            links={[
              { label: "Sign in", to: "/auth", search: { mode: "signin" as const } },
              { label: "Create account", to: "/auth", search: { mode: "signup" as const } },
              { label: "Reset password", to: "/auth", search: { mode: "forgot" as const } },
            ]}
          />
          <FooterCol
            title="Company"
            links={[
              { label: "Contact", href: "#contact" },
              { label: "Privacy", to: "/privacy" },
              { label: "Terms", to: "/terms" },
            ]}
          />
        </div>
        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-border/60 pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <span>© {new Date().getFullYear()} BCA Gurukul. All rights reserved.</span>
          <span>Built with care for BCA students.</span>
        </div>
      </div>
    </footer>
  );
}

type FooterLink =
  | { label: string; to: "/courses" | "/auth" | "/privacy" | "/terms"; search?: { mode: "signin" | "signup" | "forgot" }; href?: never }
  | { label: string; href: string; to?: never; search?: never };

function FooterCol({ title, links }: { title: string; links: FooterLink[] }) {
  return (
    <div>
      <h4 className="font-display text-sm font-semibold text-foreground">
        {title}
      </h4>
      <ul className="mt-3 space-y-2 text-sm">
        {links.map((l) =>
          l.to ? (
            <li key={l.label}>
              <Link
                to={l.to}
                search={l.search as never}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                {l.label}
              </Link>
            </li>
          ) : (
            <li key={l.label}>
              <a
                href={l.href}
                onClick={(e) => {
                  if (l.href.startsWith("#") && l.href.length > 1) {
                    const el = document.getElementById(l.href.slice(1));
                    if (el) {
                      e.preventDefault();
                      const y = el.getBoundingClientRect().top + window.scrollY - 80;
                      window.scrollTo({ top: y, behavior: "smooth" });
                    }
                  }
                }}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                {l.label}
              </a>
            </li>
          ),
        )}
      </ul>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────── Shared */

function SectionHeading({
  eyebrow,
  title,
  body,
  align = "center",
}: {
  eyebrow: string;
  title: string;
  body?: string;
  align?: "center" | "left";
}) {
  const alignment =
    align === "center" ? "text-center mx-auto items-center" : "text-left items-start";
  return (
    <div className={`flex max-w-2xl flex-col ${alignment}`}>
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
        {eyebrow}
      </span>
      <h2 className="mt-3 font-display text-3xl font-semibold leading-tight text-foreground sm:text-4xl">
        {title}
      </h2>
      {body && (
        <p className="mt-4 text-base text-muted-foreground">{body}</p>
      )}
    </div>
  );
}
