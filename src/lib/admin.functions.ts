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
