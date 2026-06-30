import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, FileStack, FileText, FlaskConical, ImageIcon, LayoutDashboard, Shield, Tag as TagIcon } from "lucide-react";

import { useRoles } from "@/hooks/use-roles";

export const Route = createFileRoute("/_authenticated/_admin/admin")({
  head: () => ({ meta: [{ title: "Admin · BCA Gurukul" }] }),
  component: AdminHome,
});

function AdminHome() {
  const { isSuperAdmin } = useRoles();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <span className="font-display text-lg font-semibold">ब</span>
            </div>
            <div className="font-display text-base font-semibold text-foreground">Admin Workspace</div>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex items-center gap-3">
          <LayoutDashboard className="h-6 w-6 text-primary" />
          <h1 className="font-display text-3xl font-semibold text-foreground">Operations console</h1>
        </div>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Authoring tools, analytics, and platform controls live here. Modules unlock as later phases ship.
        </p>

        <section className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Link to="/admin/courses" className="block">
            <Tile icon={<BookOpen className="h-5 w-5" />} title="Courses & academic tree" body="Manage courses, semesters, subjects and units." />
          </Link>
          <Link to="/admin/tags" className="block">
            <Tile icon={<TagIcon className="h-5 w-5" />} title="Tags" body="Reusable labels across notes, papers and quizzes." />
          </Link>
          <Link to="/admin/media" className="block">
            <Tile icon={<ImageIcon className="h-5 w-5" />} title="Media library" body="Upload and manage images, PDFs and videos." />
          </Link>
          <Link to="/admin/notes" className="block">
            <Tile icon={<FileText className="h-5 w-5" />} title="Notes & study materials" body="Author unit notes and upload PDF resources." />
          </Link>
          <Link to="/admin/papers" className="block">
            <Tile icon={<FileStack className="h-5 w-5" />} title="Question papers" body="Archive previous-year exam papers per subject." />
          </Link>
          <Link to="/admin/quizzes" className="block">
            <Tile icon={<FlaskConical className="h-5 w-5" />} title="Quizzes & MCQ banks" body="Author quizzes with secure server-side scoring." />
          </Link>
          {isSuperAdmin && (
            <Link to="/super-admin" className="block">
              <Tile icon={<Shield className="h-5 w-5" />} title="Super admin" body="System health, backups, feature flags, branding." />
            </Link>
          )}
        </section>
      </main>
    </div>
  );
}

function Tile({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">{icon}</div>
      <h3 className="mt-4 font-display text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
// ping again
