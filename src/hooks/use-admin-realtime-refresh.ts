import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

const ADMIN_REALTIME_TABLES = [
  "audit_logs",
  "branding",
  "contact_messages",
  "content_items",
  "courses",
  "feature_flags",
  "homepage_sections",
  "maintenance",
  "media_assets",
  "notes",
  "papers",
  "profiles",
  "quiz_options",
  "quiz_questions",
  "quizzes",
  "semesters",
  "seo_meta",
  "subjects",
  "tags",
  "units",
  "user_roles",
  "user_sessions",
] as const;

function shouldRefreshQuery(queryKey: readonly unknown[]) {
  const [first, second] = queryKey;
  if (first === "admin" || first === "superadmin") return true;
  if (typeof first === "string" && (first.startsWith("admin-") || first.startsWith("admin_"))) return true;
  if (first === "user-roles") return true;
  if (first === "public" || first === "public-quiz" || first === "public-quiz-questions" || first === "public-quiz-options") return true;
  if (first === "homepage_sections" && second === "public") return true;
  if (first === "public-branding" || first === "branding") return true;
  if (first === "maintenance" || first === "seo-meta") return true;
  if (first === "landing_stats" || first === "global-search") return true;
  if (typeof first === "string" && first.startsWith("dev-")) return true;
  if (typeof first === "string" && first.startsWith("onboarding-")) return true;
  return false;
}

export function useAdminRealtimeRefresh() {
  const queryClient = useQueryClient();

  useEffect(() => {
    let refreshTimer: number | undefined;

    const scheduleRefresh = () => {
      window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => {
        queryClient.invalidateQueries({
          predicate: (query) => shouldRefreshQuery(query.queryKey),
        });
      }, 120);
    };

    const channel = supabase.channel("admin-live-refresh");
    for (const table of ADMIN_REALTIME_TABLES) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        scheduleRefresh,
      );
    }
    channel.subscribe();

    return () => {
      window.clearTimeout(refreshTimer);
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}