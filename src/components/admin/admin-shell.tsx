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
  Shield,
  Search,
  Plus,
  Home,
  Layout,
  FolderTree,
  UserCircle2,
  Inbox,
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRoles } from "@/hooks/use-roles";
import { cn } from "@/lib/utils";

import { BrandMark } from "@/components/brand-mark";

import { ContentTree } from "./content-tree";
import { CreateWizard } from "./create-wizard";

const NAV = [
  { label: "Dashboard", to: "/admin", icon: LayoutDashboard, exact: true },
  { label: "Explorer", to: "/admin/explorer", icon: FolderTree },
  { label: "Courses", to: "/admin/courses", icon: BookOpen },
  { label: "Notes", to: "/admin/notes", icon: FileText },
  { label: "Papers", to: "/admin/papers", icon: FileStack },
  { label: "Quizzes", to: "/admin/quizzes", icon: FlaskConical },
  { label: "Media", to: "/admin/media", icon: ImageIcon },
  { label: "Tags", to: "/admin/tags", icon: TagIcon },
  { label: "Homepage", to: "/admin/homepage", icon: Layout },
  { label: "Developer", to: "/admin/developer", icon: UserCircle2 },
  { label: "Inbox", to: "/admin/inbox", icon: Inbox },
];



export function AdminShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { isSuperAdmin } = useRoles();
  const [wizardOpen, setWizardOpen] = useState(false);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <Sidebar collapsible="icon" className="border-r border-border/70">
          <SidebarContent>
            <div className="flex items-center gap-2 px-3 py-3">
              <BrandMark className="h-8 w-8" />
              <div className="text-sm font-semibold text-foreground">BCA Gurukul CMS</div>
            </div>

            <SidebarGroup>
              <SidebarGroupLabel>Workspace</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {NAV.map((item) => {
                    const active = item.exact
                      ? pathname === item.to
                      : pathname === item.to || pathname.startsWith(item.to + "/");
                    return (
                      <SidebarMenuItem key={item.to}>
                        <SidebarMenuButton asChild isActive={active}>
                          <Link to={item.to} className="flex items-center gap-2">
                            <item.icon className="h-4 w-4" />
                            <span>{item.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
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
              <SidebarGroupLabel>Content tree</SidebarGroupLabel>
              <SidebarGroupContent>
                <ContentTree />
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border/70 bg-background/80 px-4 backdrop-blur">
            <SidebarTrigger />
            <div className="hidden flex-1 items-center md:flex">
              <div className="relative w-full max-w-md">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search content, students, settings…"
                  className="h-9 pl-8"
                  aria-label="Global search"
                />
              </div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex">
                <Link to="/dashboard"><Home className="mr-1.5 h-4 w-4" /> Student view</Link>
              </Button>
              <Button size="sm" onClick={() => setWizardOpen(true)} className="gap-1.5">
                <Plus className="h-4 w-4" />
                Create
              </Button>
            </div>
          </header>

          <main className={cn("flex-1 min-w-0")}>
            <Outlet />
          </main>
        </div>
      </div>

      <CreateWizard open={wizardOpen} onOpenChange={setWizardOpen} />
    </SidebarProvider>
  );
}
