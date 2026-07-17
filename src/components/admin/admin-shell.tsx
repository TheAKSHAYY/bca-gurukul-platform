import { useState } from "react";
import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  FileText,
  FileStack,
  FlaskConical,
  BookOpen,
  Library,
  Shield,
  ShieldCheck,
  Search,
  Plus,
  Home,
  Settings,
  Keyboard,
  Inbox,
  Image as ImageIcon,
  Tag,
  LayoutTemplate,
  Sparkles,
  Users,
  ScrollText,
  Flag,
  Palette,
  Search as SearchIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useAdminRealtimeRefresh } from "@/hooks/use-admin-realtime-refresh";
import { useAdminSidebarBadges } from "@/hooks/use-admin-sidebar-badges";
import { useRoles } from "@/hooks/use-roles";
import { cn } from "@/lib/utils";

import { BrandMark } from "@/components/brand-mark";

import { CreateWizard } from "./create-wizard";
import { CommandPalette } from "./command-palette";
import {
  KeyboardShortcutsDialog,
  useKeyboardShortcutsDialog,
} from "./keyboard-shortcuts";

type NavItem = {
  label: string;
  to: string;
  icon: LucideIcon;
  exact?: boolean;
  badgeKey?: "inbox" | "drafts";
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const LEARNING: NavItem[] = [
  { label: "Dashboard", to: "/admin", icon: LayoutDashboard, exact: true },
  { label: "Courses", to: "/admin/courses", icon: BookOpen },
  { label: "Subjects", to: "/admin/subjects", icon: Library },
  { label: "Content", to: "/admin/content", icon: FileText, badgeKey: "drafts" },
  { label: "Previous papers", to: "/admin/papers", icon: FileStack },
  { label: "Question bank", to: "/admin/quizzes", icon: FlaskConical },
];

const SITE: NavItem[] = [
  { label: "Homepage", to: "/admin/homepage", icon: LayoutTemplate },
  { label: "Inbox", to: "/admin/inbox", icon: Inbox, badgeKey: "inbox" },
  { label: "Media", to: "/admin/media", icon: ImageIcon },
  { label: "Tags", to: "/admin/tags", icon: Tag },
  { label: "Developer", to: "/admin/developer", icon: Sparkles },
];

const SYSTEM: NavItem[] = [
  { label: "Settings", to: "/admin/settings", icon: Settings },
];

const PLATFORM: NavItem[] = [
  { label: "Overview", to: "/admin/superadmin", icon: ShieldCheck, exact: true },
  { label: "Users & roles", to: "/admin/superadmin/users", icon: Users },
  { label: "Audit log", to: "/admin/superadmin/audit", icon: ScrollText },
  { label: "Feature flags", to: "/admin/superadmin/flags", icon: Flag },
  { label: "Branding", to: "/admin/superadmin/branding", icon: Palette },
  { label: "SEO", to: "/admin/superadmin/seo", icon: SearchIcon },
];

export function AdminShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { isSuperAdmin } = useRoles();
  const badges = useAdminSidebarBadges();
  const [wizardOpen, setWizardOpen] = useState(false);
  const shortcuts = useKeyboardShortcutsDialog();
  useAdminRealtimeRefresh();

  const isActive = (to: string, exact?: boolean) =>
    exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");

  const inPlatform = pathname.startsWith("/admin/superadmin");

  const getBadge = (item: NavItem): number | undefined => {
    if (item.badgeKey === "inbox") return badges.inboxUnread || undefined;
    if (item.badgeKey === "drafts") return badges.contentDrafts || undefined;
    return undefined;
  };

  const groups: NavGroup[] = [
    { label: "Learning", items: LEARNING },
    { label: "Site", items: SITE },
    { label: "System", items: SYSTEM },
  ];

  return (
    <SidebarProvider>
      <div className="flex min-h-dvh w-full bg-background">
        <Sidebar collapsible="icon" className="border-r border-border/70">
          <SidebarContent>
            <div className="flex items-center gap-2 px-3 py-3">
              <BrandMark className="h-8 w-8" />
              <div className="min-w-0">
                <div className="truncate font-serif text-sm font-semibold text-foreground">
                  BCA Gurukul
                </div>
                <div className="truncate text-[10px] uppercase tracking-wider text-muted-foreground">
                  Admin CMS
                </div>
              </div>
            </div>

            {groups.map((group) => (
              <SidebarGroup key={group.label}>
                <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.items.map((item) => (
                      <NavRow
                        key={item.to}
                        item={item}
                        active={isActive(item.to, item.exact)}
                        badge={getBadge(item)}
                      />
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))}

            {isSuperAdmin && (
              <SidebarGroup>
                <SidebarGroupLabel className="flex items-center gap-1.5">
                  <span
                    aria-hidden
                    className="inline-block h-1.5 w-1.5 rounded-full bg-destructive"
                  />
                  Platform
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {PLATFORM.map((item) => (
                      <NavRow
                        key={item.to}
                        item={item}
                        active={isActive(item.to, item.exact)}
                      />
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            <SidebarGroup className="mt-auto">
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => shortcuts.setOpen(true)}>
                      <Keyboard className="h-4 w-4" />
                      <span>Keyboard shortcuts</span>
                      <kbd className="ml-auto rounded border border-border bg-background px-1 py-0.5 text-[10px] font-medium">
                        ?
                      </kbd>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border/70 bg-background/85 px-3 backdrop-blur sm:px-4">
            <SidebarTrigger aria-label="Toggle sidebar" />
            {inPlatform && (
              <span
                className="inline-flex items-center gap-1.5 rounded-full border border-destructive/30 bg-destructive/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-destructive"
                title="You are in Platform (Super Admin) mode"
              >
                <ShieldCheck className="h-3 w-3" />
                Platform
              </span>
            )}
            <button
              type="button"
              onClick={() =>
                document.dispatchEvent(
                  new KeyboardEvent("keydown", {
                    key: "k",
                    metaKey: true,
                    ctrlKey: true,
                  }),
                )
              }
              className="hidden h-9 w-full max-w-md items-center gap-2 rounded-md border border-border/70 bg-surface px-3 text-sm text-muted-foreground transition hover:border-primary/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:flex"
              aria-label="Open command palette"
            >
              <Search className="h-4 w-4" />
              <span className="truncate">Search or jump to…</span>
              <kbd className="ml-auto rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium">
                ⌘K
              </kbd>
            </button>
            <div className="ml-auto flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="hidden h-9 w-9 md:inline-flex"
                onClick={() => shortcuts.setOpen(true)}
                aria-label="Keyboard shortcuts"
                title="Keyboard shortcuts (?)"
              >
                <Keyboard className="h-4 w-4" />
              </Button>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="hidden md:inline-flex"
              >
                <Link to="/dashboard">
                  <Home className="mr-1.5 h-4 w-4" /> Student view
                </Link>
              </Button>
              <Button size="sm" onClick={() => setWizardOpen(true)} className="gap-1.5">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Create</span>
              </Button>
            </div>
          </header>

          <main className={cn("flex-1 min-w-0")}>
            <Outlet />
          </main>
        </div>
      </div>

      <CreateWizard open={wizardOpen} onOpenChange={setWizardOpen} />
      <CommandPalette />
      <KeyboardShortcutsDialog open={shortcuts.open} onOpenChange={shortcuts.setOpen} />
    </SidebarProvider>
  );
}

function NavRow({
  item,
  active,
  badge,
}: {
  item: NavItem;
  active: boolean;
  badge?: number;
}) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
        <Link to={item.to} className="flex items-center gap-2">
          <item.icon className="h-4 w-4" />
          <span className="truncate">{item.label}</span>
          {badge ? (
            <span
              className="ml-auto inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-accent/90 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-accent-foreground"
              aria-label={`${badge} pending`}
            >
              {badge > 99 ? "99+" : badge}
            </span>
          ) : null}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
