import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

/**
 * Lightweight counts that drive numeric chips in the admin sidebar.
 * Values are only used for badges — RLS gates the underlying tables.
 */
export function useAdminSidebarBadges() {
  const inbox = useQuery({
    queryKey: ["admin", "sidebar-badge", "inbox"],
    staleTime: 30_000,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("contact_messages")
        .select("id", { count: "exact", head: true })
        .eq("status", "new");
      if (error) throw error;
      return count ?? 0;
    },
  });

  const drafts = useQuery({
    queryKey: ["admin", "sidebar-badge", "content-drafts"],
    staleTime: 30_000,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("content_items")
        .select("id", { count: "exact", head: true })
        .eq("status", "draft")
        .is("deleted_at", null);
      if (error) throw error;
      return count ?? 0;
    },
  });

  return {
    inboxUnread: inbox.data ?? 0,
    contentDrafts: drafts.data ?? 0,
  };
}
