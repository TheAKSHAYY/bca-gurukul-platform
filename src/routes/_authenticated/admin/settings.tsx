import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Layout, UserCircle2, Tag as TagIcon, ImageIcon, Palette, Search as SearchIcon,
  Shield, Users, Inbox, FolderTree,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { PageHeader } from "@/components/admin/ui/page-header";
import { useRoles } from "@/hooks/use-roles";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  head: () => ({ meta: [{ title: "Settings · Admin · BCA Gurukul" }] }),
  component: SettingsPage,
});

type Card = { label: string; description: string; to: string; icon: LucideIcon; super?: boolean };

const CARDS: Card[] = [
  { label: "Homepage sections", description: "Edit landing page hero, features, testimonials.", to: "/admin/homepage", icon: Layout },
  { label: "Developer profile", description: "Public developer bio, skills, projects.", to: "/admin/developer", icon: UserCircle2 },
  { label: "Tags", description: "Manage taxonomy across content.", to: "/admin/tags", icon: TagIcon },
  { label: "Media library", description: "Uploaded images, videos, and assets.", to: "/admin/media", icon: ImageIcon },
  { label: "Content tree", description: "Hierarchical view of courses → units.", to: "/admin/explorer", icon: FolderTree },
  { label: "Inbox", description: "Messages sent through the contact form.", to: "/admin/inbox", icon: Inbox },
  { label: "Branding", description: "Site name, logo, colors, favicon.", to: "/admin/superadmin/branding", icon: Palette, super: true },
  { label: "SEO", description: "Titles, descriptions, sitemaps.", to: "/admin/superadmin/seo", icon: SearchIcon, super: true },
  { label: "Users & roles", description: "Manage admin access.", to: "/admin/superadmin/users", icon: Users, super: true },
  { label: "Super admin", description: "Feature flags, maintenance, audit logs.", to: "/admin/superadmin", icon: Shield, super: true },
];

function SettingsPage() {
  const { isSuperAdmin } = useRoles();
  const visible = CARDS.filter((c) => !c.super || isSuperAdmin);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="Settings"
        description="Configure your site, taxonomy, appearance, and access."
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((c) => (
          <Link
            key={c.to}
            to={c.to}
            className="group flex gap-3 rounded-xl border border-border/70 bg-surface p-4 transition hover:border-primary/40 hover:shadow-sm"
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
    </div>
  );
}
