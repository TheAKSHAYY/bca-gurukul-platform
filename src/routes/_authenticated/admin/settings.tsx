import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Layout, UserCircle2, Tag as TagIcon, ImageIcon, Palette, Search as SearchIcon,
  Shield, Users, Inbox, FolderTree, ScrollText, Flag,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { PageHeader } from "@/components/admin/ui/page-header";
import { useRoles } from "@/hooks/use-roles";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  head: () => ({ meta: [{ title: "Settings · Admin · BCA Gurukul" }] }),
  component: SettingsPage,
});

type Card = { label: string; description: string; to: string; icon: LucideIcon; super?: boolean };
type Section = { title: string; description: string; cards: Card[] };

const SECTIONS: Section[] = [
  {
    title: "Site & Content",
    description: "How the public site looks and what shows up on it.",
    cards: [
      { label: "Homepage sections", description: "Hero, features, testimonials on the landing page.", to: "/admin/homepage", icon: Layout },
      { label: "Content tree", description: "Hierarchical view of courses → units.", to: "/admin/explorer", icon: FolderTree },
      { label: "Tags", description: "Manage taxonomy across content.", to: "/admin/tags", icon: TagIcon },
      { label: "Media library", description: "Uploaded images, videos, and assets.", to: "/admin/media", icon: ImageIcon },
    ],
  },
  {
    title: "Communication",
    description: "Inbound messages and developer identity.",
    cards: [
      { label: "Inbox", description: "Messages sent through the contact form.", to: "/admin/inbox", icon: Inbox },
      { label: "Developer profile", description: "Public developer bio, skills, projects.", to: "/admin/developer", icon: UserCircle2 },
    ],
  },
  {
    title: "Platform",
    description: "Reserved for super admins.",
    cards: [
      { label: "Branding & theme", description: "Site name, logo, colors, typography.", to: "/admin/superadmin/branding", icon: Palette, super: true },
      { label: "SEO manager", description: "Per-route titles, descriptions, Open Graph.", to: "/admin/superadmin/seo", icon: SearchIcon, super: true },
      { label: "Users & roles", description: "Grant or revoke admin access.", to: "/admin/superadmin/users", icon: Users, super: true },
      { label: "Feature flags", description: "Enable, disable, or kill-switch modules.", to: "/admin/superadmin/flags", icon: Flag, super: true },
      { label: "Audit log", description: "Every privileged action, who did it, when.", to: "/admin/superadmin/audit", icon: ScrollText, super: true },
      { label: "Super admin home", description: "Platform overview and metrics.", to: "/admin/superadmin", icon: Shield, super: true },
    ],
  },
];

function SettingsPage() {
  const { isSuperAdmin } = useRoles();

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="Settings"
        description="Configure your site, taxonomy, appearance, and access."
      />

      <div className="space-y-10">
        {SECTIONS.map((section) => {
          const cards = section.cards.filter((c) => !c.super || isSuperAdmin);
          if (!cards.length) return null;
          return (
            <section key={section.title}>
              <div className="mb-3 flex items-baseline justify-between gap-4">
                <div>
                  <h2 className="font-serif text-lg font-semibold text-foreground">{section.title}</h2>
                  <p className="text-sm text-muted-foreground">{section.description}</p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {cards.map((c) => (
                  <Link
                    key={c.to}
                    to={c.to}
                    className="group flex gap-3 rounded-xl border border-border/70 bg-surface p-4 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                  >
                    <div className="rounded-lg bg-primary/10 p-2 text-primary transition group-hover:bg-primary/15">
                      <c.icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-foreground">{c.label}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">{c.description}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
