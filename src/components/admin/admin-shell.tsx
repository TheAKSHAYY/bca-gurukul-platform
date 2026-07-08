import { useState } from "react";
import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  FileText,
  FileStack,
  FlaskConical,
  ImageIcon,
  Tag as TagIcon,
  BookOpen,
  Library,
  Shield,
  Search,
  Plus,
  Home,
  Layout,
  FolderTree,
  UserCircle2,
  Inbox,
  Settings,
  ChevronsUpDown,
} from "lucide-react";

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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { useAdminRealtimeRefresh } from "@/hooks/use-admin-realtime-refresh";
import { useRoles } from "@/hooks/use-roles";
import { cn } from "@/lib/utils";

import { BrandMark } from "@/components/brand-mark";

import { CreateWizard } from "./create-wizard";
import { CommandPalette } from "./command-palette";

const PRIMARY_NAV = [
  { label: "Dashboard", to: "/admin", icon: LayoutDashboard, exact: true },
  { label: "Courses", to: "/admin/courses", icon: BookOpen },
  { label: "Subjects", to: "/admin/subjects", icon: Library },
  { label: "Content", to: "/admin/content", icon: FileText },
  { label: "Previous Papers", to: "/admin/papers", icon: FileStack },
  { label: "Question Bank", to: "/admin/quizzes", icon: FlaskConical },
  { label: "Settings", to: "/admin/settings", icon: Settings },
];

const MORE_NAV = [
  { label: "Content tree", to: "/admin/explorer", icon: FolderTree },
  { label: "Media", to: "/admin/media", icon: ImageIcon },
  { label: "Tags", to: "/admin/tags", icon: TagIcon },
  { label: "Homepage", to: "/admin/homepage", icon: Layout },
  { label: "Developer", to: "/admin/developer", icon: UserCircle2 },
  { label: "Inbox", to: "/admin/inbox", icon: Inbox },
  { label: "Notes (legacy)", to: "/admin/notes", icon: FileText },
];

export function AdminShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { isSuperAdmin } = useRoles();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  useAdminRealtimeRefresh();

  const isActive = (to: string, exact?: boolean) =>
    exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <Sidebar collapsible="icon" className="border-r border-border/70">
          <SidebarContent>
            <div className="flex items-center gap-2 px-3 py-3">
              <BrandMark className="h-8 w-8" />
              <div className="min-w-0">
                <div className="truncate font-serif text-sm font-semibold text-foreground">BCA Gurukul</div>
                <div className="truncate text-[10px] uppercase tracking-wider text-muted-foreground">Admin CMS</div>
              </div>
            </div>

            <SidebarGroup>
              <SidebarGroupLabel>Manage</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {PRIMARY_NAV.map((item) => (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton asChild isActive={isActive(item.to, item.exact)}>
                        <Link to={item.to} className="flex items-center gap-2">
                          <item.icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                  {isSuperAdmin && (
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={pathname.startsWith("/admin/superadmin")}>
                        <Link to="/admin/superadmin" className="flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          <span>Super admin</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <Collapsible open={moreOpen} onOpenChange={setMoreOpen}>
                <CollapsibleTrigger asChild>
                  <button className="flex w-full items-center justify-between px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground">
                    More
                    <ChevronsUpDown className="h-3 w-3" />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {MORE_NAV.map((item) => (
                        <SidebarMenuItem key={item.to}>
                          <SidebarMenuButton asChild isActive={isActive(item.to)}>
                            <Link to={item.to} className="flex items-center gap-2">
                              <item.icon className="h-4 w-4" />
                              <span>{item.label}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </Collapsible>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border/70 bg-background/85 px-3 backdrop-blur sm:px-4">
            <SidebarTrigger />
            <button
              type="button"
              onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, ctrlKey: true }))}
              className="hidden h-9 w-full max-w-md items-center gap-2 rounded-md border border-border/70 bg-surface px-3 text-sm text-muted-foreground transition hover:border-primary/40 hover:text-foreground md:flex"
            >
              <Search className="h-4 w-4" />
              <span className="truncate">Search or jump to…</span>
              <kbd className="ml-auto rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium">⌘K</kbd>
            </button>
            <div className="ml-auto flex items-center gap-2">
              <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex">
                <Link to="/dashboard"><Home className="mr-1.5 h-4 w-4" /> Student view</Link>
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
    </SidebarProvider>
  );
}
