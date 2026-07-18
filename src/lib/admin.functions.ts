import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type DashboardStats = {
  students: number;
  semesters: number;
  subjects: number;
  units: number;
  notes: number;
  papers: number;
  quizzes: number;
  mcqs: number;
  media: number;
  downloads: number;
  note_views: number;
  active_users_24h: number;
};

export const getDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("admin_dashboard_stats");
    if (error) throw new Error(error.message);
    return data as unknown as DashboardStats;
  });

export type RecentUpload = {
  kind: "note" | "paper" | "quiz" | "media";
  id: string;
  title: string;
  created_at: string;
};

export const getRecentUploads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("admin_recent_uploads", { _limit: 10 });
    if (error) throw new Error(error.message);
    return (data ?? []) as RecentUpload[];
  });

export type RecentActivity = {
  kind: "note_view" | "paper_download" | "quiz_attempt";
  user_id: string;
  ref_id: string;
  title: string | null;
  at: string;
};

export const getRecentActivity = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("admin_recent_activity", { _limit: 15 });
    if (error) throw new Error(error.message);
    return (data ?? []) as RecentActivity[];
  });

export type WorkflowSummary = {
  drafts_count: number;
  drafts: Array<{ id: string; title: string; updated_at: string; type: string }>;
  unread_messages: number;
  latest_messages: Array<{ id: string; name: string; subject: string | null; created_at: string }>;
  published_7d: number;
  attempts_7d: number;
  new_students_7d: number;
  gap_subjects: Array<{ id: string; title: string }>;
};

export const getWorkflowSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<WorkflowSummary> => {
    const sb = context.supabase;
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [
      draftsCountRes,
      draftsListRes,
      unreadCountRes,
      latestMsgsRes,
      publishedRes,
      attemptsRes,
      newStudentsRes,
      subjectsRes,
      publishedItemsRes,
    ] = await Promise.all([
      sb.from("content_items").select("id", { count: "exact", head: true })
        .eq("status", "draft").is("deleted_at", null),
      sb.from("content_items").select("id,title,updated_at,type")
        .eq("status", "draft").is("deleted_at", null)
        .order("updated_at", { ascending: false }).limit(5),
      sb.from("contact_messages").select("id", { count: "exact", head: true })
        .eq("status", "new"),
      sb.from("contact_messages").select("id,name,subject,created_at")
        .eq("status", "new").order("created_at", { ascending: false }).limit(4),
      sb.from("content_items").select("id", { count: "exact", head: true })
        .eq("status", "published").gte("updated_at", weekAgo).is("deleted_at", null),
      sb.from("quiz_attempts").select("id", { count: "exact", head: true })
        .gte("created_at", weekAgo),
      sb.from("profiles").select("id", { count: "exact", head: true })
        .gte("created_at", weekAgo),
      sb.from("subjects").select("id,title").is("deleted_at", null).limit(500),
      sb.from("content_items").select("subject_id")
        .eq("status", "published").is("deleted_at", null).not("subject_id", "is", null).limit(2000),
    ]);

    const withContent = new Set(
      (publishedItemsRes.data ?? []).map((r) => r.subject_id).filter(Boolean) as string[],
    );
    const gap_subjects = (subjectsRes.data ?? [])
      .filter((s) => !withContent.has(s.id))
      .slice(0, 5)
      .map((s) => ({ id: s.id, title: s.title }));

    return {
      drafts_count: draftsCountRes.count ?? 0,
      drafts: (draftsListRes.data ?? []) as WorkflowSummary["drafts"],
      unread_messages: unreadCountRes.count ?? 0,
      latest_messages: (latestMsgsRes.data ?? []) as WorkflowSummary["latest_messages"],
      published_7d: publishedRes.count ?? 0,
      attempts_7d: attemptsRes.count ?? 0,
      new_students_7d: newStudentsRes.count ?? 0,
      gap_subjects,
    };
  });

export type TreeNode = {
  id: string;
  name: string;
  children?: TreeNode[];
  counts?: { notes: number; papers: number; quizzes: number };
};

export const getContentTree = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase;
    const [coursesRes, semestersRes, subjectsRes, unitsRes] = await Promise.all([
      sb.from("courses").select("id,title,sort_order").is("deleted_at", null).order("sort_order"),
      sb.from("semesters").select("id,title,number,course_id").is("deleted_at", null).order("number"),
      sb.from("subjects").select("id,title,semester_id").is("deleted_at", null).order("title"),
      sb.from("units").select("id,title,subject_id").is("deleted_at", null).order("title"),
    ]);
    const err = coursesRes.error ?? semestersRes.error ?? subjectsRes.error ?? unitsRes.error;
    if (err) throw new Error(err.message);

    const courses = coursesRes.data ?? [];
    const semesters = semestersRes.data ?? [];
    const subjects = subjectsRes.data ?? [];
    const units = unitsRes.data ?? [];

    const tree: TreeNode[] = courses.map((c) => ({
      id: c.id,
      name: c.title,
      children: semesters
        .filter((s) => s.course_id === c.id)
        .map((s) => ({
          id: s.id,
          name: s.title ?? `Semester ${s.number}`,
          children: subjects
            .filter((sj) => sj.semester_id === s.id)
            .map((sj) => ({
              id: sj.id,
              name: sj.title,
              children: units
                .filter((u) => u.subject_id === sj.id)
                .map((u) => ({ id: u.id, name: u.title })),
            })),
        })),
    }));
    return tree;
  });
