import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Award,
  Download,
  ExternalLink,
  Github,
  Globe,
  Home,
  Instagram,
  Linkedin,
  Mail,
  Sparkles,
  Star,
  Twitter,
  Youtube,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ContactForm } from "@/components/developer/contact-form";

export const Route = createFileRoute("/developer")({
  head: () => ({
    meta: [
      { title: "About the Developer — BCA Gurukul" },
      {
        name: "description",
        content:
          "Meet the developer behind BCA Gurukul — projects, skills, achievements, and ways to connect.",
      },
      { property: "og:title", content: "About the Developer — BCA Gurukul" },
      {
        property: "og:description",
        content:
          "Projects, skills, achievements, and contact details for the developer behind BCA Gurukul.",
      },
    ],
  }),
  component: DeveloperPage,
});

type Profile = {
  full_name: string | null;
  professional_title: string | null;
  short_intro: string | null;
  bio: string | null;
  education: string | null;
  current_goal: string | null;
  career_objective: string | null;
  interests: string | null;
  email: string | null;
  photo_url: string | null;
  resume_url: string | null;
  github_username: string | null;
  hero_cta_primary_label: string | null;
  hero_cta_secondary_label: string | null;
  enabled: boolean;
};

type Social = {
  id: string;
  platform: string;
  url: string;
  label: string | null;
};

type Project = {
  id: string;
  name: string;
  description: string | null;
  thumbnail_url: string | null;
  tech_stack: string[] | null;
  github_url: string | null;
  live_url: string | null;
  category: string | null;
  featured: boolean;
};

type Skill = {
  id: string;
  name: string;
  category: string;
  icon: string | null;
};

type Achievement = {
  id: string;
  title: string;
  kind: string;
  issuer: string | null;
  description: string | null;
  date_awarded: string | null;
  url: string | null;
  image_url: string | null;
};

function platformIcon(p: string) {
  const k = p.toLowerCase();
  if (k.includes("github")) return Github;
  if (k.includes("linkedin")) return Linkedin;
  if (k.includes("instagram")) return Instagram;
  if (k.includes("youtube")) return Youtube;
  if (k.includes("twitter") || k === "x") return Twitter;
  if (k.includes("mail") || k.includes("email")) return Mail;
  return Globe;
}

function DeveloperPage() {
  const profileQ = useQuery({
    queryKey: ["dev-profile"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("developer_profile")
        .select("*")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
  });

  const socialQ = useQuery({
    queryKey: ["dev-social"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("developer_social_links")
        .select("id,platform,url,label")
        .eq("enabled", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Social[];
    },
  });

  const projectsQ = useQuery({
    queryKey: ["dev-projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("developer_projects")
        .select(
          "id,name,description,thumbnail_url,tech_stack,github_url,live_url,category,featured",
        )
        .eq("status", "published")
        .order("featured", { ascending: false })
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Project[];
    },
  });

  const skillsQ = useQuery({
    queryKey: ["dev-skills"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("developer_skills")
        .select("id,name,category,icon")
        .eq("enabled", true)
        .order("category", { ascending: true })
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Skill[];
    },
  });

  const achievementsQ = useQuery({
    queryKey: ["dev-achievements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("developer_achievements")
        .select("*")
        .eq("enabled", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Achievement[];
    },
  });

  const profile = profileQ.data;
  const loading = profileQ.isLoading;

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-16">
        <Skeleton className="h-72 w-full rounded-3xl" />
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!profile || profile.enabled === false) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-24 text-center">
        <Sparkles className="mx-auto h-10 w-10 text-accent" />
        <h1 className="mt-4 font-display text-3xl font-semibold">Developer profile coming soon</h1>
        <p className="mt-3 text-muted-foreground">
          The developer hasn't published their portfolio yet. Check back soon.
        </p>
        <Button asChild className="mt-6">
          <Link to="/">Back to home</Link>
        </Button>
      </div>
    );
  }

  const name = profile.full_name || "The Developer";
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
  const socials = socialQ.data ?? [];
  const projects = projectsQ.data ?? [];
  const skills = skillsQ.data ?? [];
  const achievements = achievementsQ.data ?? [];

  const skillGroups = skills.reduce<Record<string, Skill[]>>((acc, s) => {
    (acc[s.category] ||= []).push(s);
    return acc;
  }, {});

  const githubSocial = socials.find((s) => s.platform.toLowerCase() === "github");
  const githubUsername =
    profile.github_username ||
    (githubSocial ? githubSocial.url.replace(/\/$/, "").split("/").pop() : null);

  return (
    <div className="bg-background">
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-border/60">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-[-10rem] h-[30rem] w-[30rem] -translate-x-1/2 rounded-full bg-accent/20 blur-[120px]" />
          <div className="absolute left-[8%] top-1/2 h-72 w-72 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl" />
        </div>
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-20 sm:py-28 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <div className="animate-fade-in">
            <span className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
              <Sparkles className="h-3.5 w-3.5" /> Meet the developer
            </span>
            <h1 className="mt-5 font-display text-4xl font-semibold leading-tight text-foreground sm:text-5xl">
              {name}
            </h1>
            {profile.professional_title && (
              <p className="mt-2 font-display text-lg text-accent">{profile.professional_title}</p>
            )}
            {profile.short_intro && (
              <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
                {profile.short_intro}
              </p>
            )}
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild variant="outline" size="lg">
                <Link to="/">
                  <Home className="mr-1.5 h-4 w-4" /> Back to Home
                </Link>
              </Button>
              <Button asChild size="lg">
                <a href="#projects">
                  {profile.hero_cta_primary_label || "View Projects"}
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </a>
              </Button>
              {profile.resume_url && (
                <Button asChild variant="outline" size="lg">
                  <a href={profile.resume_url} target="_blank" rel="noreferrer">
                    <Download className="mr-1.5 h-4 w-4" />
                    {profile.hero_cta_secondary_label || "Download Resume"}
                  </a>
                </Button>
              )}
              <Button asChild variant="ghost" size="lg">
                <a href="#contact">
                  <Mail className="mr-1.5 h-4 w-4" /> Contact Me
                </a>
              </Button>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-sm animate-scale-in">
            <div className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-br from-accent/30 via-primary/20 to-transparent blur-2xl" />
            <div className="overflow-hidden rounded-3xl border border-border bg-surface p-2 shadow-xl">
              <div className="aspect-square w-full overflow-hidden rounded-2xl bg-muted">
                {profile.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.photo_url} alt={name} className="h-full w-full object-cover" />
                ) : (
                  <Avatar className="h-full w-full rounded-2xl">
                    <AvatarFallback className="h-full w-full rounded-2xl bg-primary/10 font-display text-6xl text-primary">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ABOUT */}
      {(profile.bio ||
        profile.education ||
        profile.current_goal ||
        profile.career_objective ||
        profile.interests) && (
        <section className="border-b border-border/60 py-20">
          <div className="mx-auto max-w-6xl px-6">
            <SectionHeading eyebrow="About" title="Behind the keyboard" />
            <div className="mt-12 grid gap-6 lg:grid-cols-3">
              {profile.bio && <Card title="Bio" body={profile.bio} className="lg:col-span-3" />}
              {profile.education && <Card title="Education" body={profile.education} />}
              {profile.current_goal && <Card title="Current Goal" body={profile.current_goal} />}
              {profile.career_objective && (
                <Card title="Career Objective" body={profile.career_objective} />
              )}
              {profile.interests && (
                <Card title="Interests" body={profile.interests} className="lg:col-span-3" />
              )}
            </div>
          </div>
        </section>
      )}

      {/* SOCIAL */}
      {socials.length > 0 && (
        <section className="border-b border-border/60 bg-surface-muted/40 py-20">
          <div className="mx-auto max-w-6xl px-6">
            <SectionHeading eyebrow="Connect" title="Find me online" />
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {socials.map((s) => {
                const Icon = platformIcon(s.platform);
                return (
                  <a
                    key={s.id}
                    href={s.url}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex items-center gap-4 rounded-2xl border border-border bg-surface p-5 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg"
                  >
                    <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-display text-base font-semibold capitalize text-foreground">
                        {s.label || s.platform}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {s.url.replace(/^https?:\/\//, "")}
                      </div>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </a>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* PROJECTS */}
      <section id="projects" className="border-b border-border/60 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <SectionHeading eyebrow="Projects" title="Work I'm proud of" />
          {projects.length === 0 ? (
            <div className="mt-12 rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
              <p className="text-sm text-muted-foreground">No projects published yet.</p>
            </div>
          ) : (
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((p) => (
                <article
                  key={p.id}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-surface transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg"
                >
                  <div className="relative aspect-video w-full overflow-hidden bg-muted">
                    {p.thumbnail_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.thumbnail_url}
                        alt={p.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="grid h-full place-items-center text-muted-foreground/40">
                        <Sparkles className="h-10 w-10" />
                      </div>
                    )}
                    {p.featured && (
                      <Badge className="absolute left-3 top-3 gap-1 bg-accent text-accent-foreground hover:bg-accent">
                        <Star className="h-3 w-3" /> Featured
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    {p.category && (
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        {p.category}
                      </div>
                    )}
                    <h3 className="mt-1 font-display text-lg font-semibold text-foreground">
                      {p.name}
                    </h3>
                    {p.description && (
                      <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                        {p.description}
                      </p>
                    )}
                    {p.tech_stack && p.tech_stack.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {p.tech_stack.slice(0, 6).map((t) => (
                          <span
                            key={t}
                            className="rounded-md border border-border bg-muted/50 px-2 py-0.5 text-[10px] font-medium text-foreground"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="mt-4 flex items-center gap-2 border-t border-border pt-3">
                      {p.github_url && (
                        <Button asChild size="sm" variant="ghost">
                          <a href={p.github_url} target="_blank" rel="noreferrer">
                            <Github className="mr-1 h-3.5 w-3.5" /> Code
                          </a>
                        </Button>
                      )}
                      {p.live_url && (
                        <Button asChild size="sm" variant="ghost">
                          <a href={p.live_url} target="_blank" rel="noreferrer">
                            <ExternalLink className="mr-1 h-3.5 w-3.5" /> Live
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* SKILLS */}
      {skills.length > 0 && (
        <section className="border-b border-border/60 bg-surface-muted/40 py-20">
          <div className="mx-auto max-w-6xl px-6">
            <SectionHeading eyebrow="Skills" title="Tools of the trade" />
            <div className="mt-12 space-y-8">
              {Object.entries(skillGroups).map(([cat, list]) => (
                <div key={cat}>
                  <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    {cat}
                  </h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {list.map((s, i) => (
                      <span
                        key={s.id}
                        style={{ animationDelay: `${i * 30}ms` }}
                        className="animate-fade-in rounded-full border border-border bg-surface px-4 py-1.5 text-sm font-medium text-foreground shadow-sm transition-transform hover:-translate-y-0.5 hover:border-primary/30"
                      >
                        {s.icon && <span className="mr-1.5">{s.icon}</span>}
                        {s.name}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ACHIEVEMENTS */}
      {achievements.length > 0 && (
        <section className="border-b border-border/60 py-20">
          <div className="mx-auto max-w-6xl px-6">
            <SectionHeading eyebrow="Milestones" title="Achievements & badges" />
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {achievements.map((a) => (
                <a
                  key={a.id}
                  href={a.url || "#"}
                  target={a.url ? "_blank" : undefined}
                  rel="noreferrer"
                  className="group flex gap-4 rounded-2xl border border-border bg-surface p-5 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg"
                >
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-accent/20 text-accent-foreground">
                    <Award className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {a.kind}
                    </div>
                    <div className="font-display text-base font-semibold text-foreground">
                      {a.title}
                    </div>
                    {a.issuer && <div className="text-xs text-muted-foreground">{a.issuer}</div>}
                    {a.description && (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {a.description}
                      </p>
                    )}
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* GITHUB SHOWCASE */}
      {githubUsername && (
        <section className="border-b border-border/60 bg-surface-muted/40 py-20">
          <div className="mx-auto max-w-6xl px-6">
            <SectionHeading eyebrow="GitHub" title="Open-source on display" />
            <div className="mt-12 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
              <div className="overflow-hidden rounded-2xl border border-border bg-surface p-2">
                <img
                  src={`https://ghchart.rshah.org/2f4858/${githubUsername}`}
                  alt={`${githubUsername} GitHub contributions`}
                  className="w-full"
                  loading="lazy"
                />
              </div>
              <div className="rounded-2xl border border-border bg-surface p-6">
                <div className="flex items-center gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-xl bg-foreground text-background">
                    <Github className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">GitHub</div>
                    <div className="font-display text-lg font-semibold">@{githubUsername}</div>
                  </div>
                </div>
                <p className="mt-4 text-sm text-muted-foreground">
                  Follow along with my projects, contributions, and experiments.
                </p>
                <Button asChild className="mt-5 w-full">
                  <a href={`https://github.com/${githubUsername}`} target="_blank" rel="noreferrer">
                    <Github className="mr-1.5 h-4 w-4" /> View Profile
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* CONTACT */}
      <section id="contact" className="py-20">
        <div className="mx-auto max-w-3xl px-6">
          <SectionHeading eyebrow="Contact" title="Let's build something together" />
          <p className="mx-auto mt-4 max-w-xl text-center text-muted-foreground">
            Open to collaborations, feedback, and a friendly hello.
          </p>

          <div className="mt-10">
            <ContactForm />
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
            {profile.email && (
              <Button asChild variant="outline" size="sm">
                <a href={`mailto:${profile.email}`}>
                  <Mail className="mr-1.5 h-4 w-4" /> Email directly
                </a>
              </Button>
            )}
            {profile.resume_url && (
              <Button asChild variant="ghost" size="sm">
                <a href={profile.resume_url} target="_blank" rel="noreferrer">
                  <Download className="mr-1.5 h-4 w-4" /> Resume
                </a>
              </Button>
            )}
            {socials.slice(0, 4).map((s) => {
              const Icon = platformIcon(s.platform);
              return (
                <Button asChild key={s.id} variant="ghost" size="sm">
                  <a href={s.url} target="_blank" rel="noreferrer">
                    <Icon className="mr-1.5 h-4 w-4" />
                    <span className="capitalize">{s.platform}</span>
                  </a>
                </Button>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">{eyebrow}</div>
      <h2 className="mt-2 font-display text-3xl font-semibold text-foreground sm:text-4xl">
        {title}
      </h2>
    </div>
  );
}

function Card({ title, body, className }: { title: string; body: string; className?: string }) {
  return (
    <div className={"rounded-2xl border border-border bg-surface p-6 " + (className || "")}>
      <h3 className="font-display text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
        {body}
      </p>
    </div>
  );
}
