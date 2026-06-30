import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  BookMarked,
  Code2,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Search,
  Settings,
  ShieldCheck,
  User as UserIcon,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useRoles } from "@/hooks/use-roles";
import { BrandMark } from "@/components/brand-mark";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { ScrollArea } from "@/components/ui/scroll-area";

function initialsOf(name?: string | null, email?: string | null) {
  const src = (name || email || "U").trim();
  const parts = src.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return src.slice(0, 2).toUpperCase();
}

type NotificationRow = {
  id: string;
  title: string;
  body: string | null;
  read_at: string | null;
  created_at: string;
  kind: string;
};

export function AppNavbar() {
  const { user } = useAuth();
  const { isAdmin, isSuperAdmin } = useRoles();
  const router = useRouter();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  const profileQuery = useQuery({
    queryKey: ["profile-mini", user?.id],
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("user_id", user!.id)

        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const notifQuery = useQuery({
    queryKey: ["nav-notifications", user?.id],
    enabled: !!user?.id,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("id,title,body,read_at,created_at,kind")
        .order("created_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      return (data ?? []) as NotificationRow[];
    },
  });

  const unread = useMemo(
    () => (notifQuery.data ?? []).filter((n) => !n.read_at).length,
    [notifQuery.data],
  );

  // Cmd/Ctrl + K to focus search
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        document.getElementById("nav-global-search")?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function onSignOut() {
    await supabase.auth.signOut();
    qc.clear();
    toast.success("Signed out");
    await router.invalidate();
    navigate({ to: "/", replace: true });
  }

  async function onSubmitSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = search.trim();
    if (!q) return;
    navigate({ to: "/search", search: { q } });
  }

  async function markAllRead() {
    if (!user) return;
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .is("read_at", null)
      .eq("user_id", user.id);
    qc.invalidateQueries({ queryKey: ["nav-notifications", user.id] });
  }

  const name = profileQuery.data?.full_name ?? user?.user_metadata?.full_name ?? null;
  const email = user?.email ?? null;
  const initials = initialsOf(name, email);
  const role = isSuperAdmin ? "Super Admin" : isAdmin ? "Admin" : "Student";

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/70 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Link to="/dashboard" className="flex items-center gap-2 font-display text-base font-semibold text-foreground">
          <BrandMark className="h-8 w-8" />
          <span className="hidden sm:inline">BCA Gurukul</span>
        </Link>

        <form onSubmit={onSubmitSearch} className="ml-2 hidden flex-1 max-w-xl md:flex">
          <div className="relative w-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="nav-global-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notes, papers, units…"
              className="pl-9 pr-14"
            />
            <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-flex">
              ⌘K
            </kbd>
          </div>
        </form>

        <div className="ml-auto flex items-center gap-1">
          <Button asChild variant="ghost" size="icon" className="md:hidden" aria-label="Search">
            <Link to="/search" search={{ q: "" }}>
              <Search className="h-4 w-4" />
            </Link>
          </Button>

          <ThemeToggle />

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
                <Bell className="h-4 w-4" />
                {unread > 0 && (
                  <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-background" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0">
              <div className="flex items-center justify-between border-b border-border px-3 py-2">
                <div className="text-sm font-medium">Notifications</div>
                {unread > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-xs text-primary hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <ScrollArea className="max-h-80">
                {(notifQuery.data ?? []).length === 0 ? (
                  <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                    You're all caught up.
                  </div>
                ) : (
                  <ul className="divide-y divide-border">
                    {(notifQuery.data ?? []).map((n) => (
                      <li key={n.id} className="px-3 py-2.5">
                        <div className="flex items-start gap-2">
                          <span
                            className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                              n.read_at ? "bg-muted" : "bg-primary"
                            }`}
                          />
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium text-foreground">
                              {n.title}
                            </div>
                            {n.body && (
                              <div className="line-clamp-2 text-xs text-muted-foreground">
                                {n.body}
                              </div>
                            )}
                            <div className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                              {n.kind}
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </ScrollArea>
            </PopoverContent>
          </Popover>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="ml-1 flex items-center gap-2 rounded-full border border-transparent p-0.5 pr-2 transition-colors hover:border-border hover:bg-muted"
                aria-label="Account menu"
              >
                <Avatar className="h-7 w-7">
                  {profileQuery.data?.avatar_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profileQuery.data.avatar_url}
                      alt=""
                      className="h-full w-full rounded-full object-cover"
                    />
                  )}
                  <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden text-sm font-medium text-foreground sm:inline">
                  {name?.split(" ")[0] ?? "Account"}
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <div className="px-2 py-2.5">
                <div className="flex items-center gap-2">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-foreground">
                      {name ?? "Unnamed"}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">{email}</div>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-1.5">
                  <span className="inline-flex h-2 w-2 rounded-full bg-success" />
                  <span className="text-[11px] text-muted-foreground">Online</span>
                  <Badge variant="secondary" className="ml-auto text-[10px]">
                    {role}
                  </Badge>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/dashboard">
                  <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/profile">
                  <UserIcon className="mr-2 h-4 w-4" /> Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/bookmarks">
                  <BookMarked className="mr-2 h-4 w-4" /> Bookmarks
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/settings">
                  <Settings className="mr-2 h-4 w-4" /> Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/developer">
                  <Code2 className="mr-2 h-4 w-4" /> Developer
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/help">
                  <HelpCircle className="mr-2 h-4 w-4" /> Help
                </Link>
              </DropdownMenuItem>
              {isAdmin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    Staff
                  </DropdownMenuLabel>
                  <DropdownMenuItem asChild>
                    <Link to="/admin">
                      <ShieldCheck className="mr-2 h-4 w-4" /> Admin console
                    </Link>
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onSignOut} className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
