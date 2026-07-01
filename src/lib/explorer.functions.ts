import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type NodeType = "course" | "semester" | "subject" | "unit";
export type NodeStatus = "draft" | "published" | "archived";

export type NodeMeta = {
  slug?: string | null;
  code?: string | null;
  number?: number | null;
  description?: string | null;
  summary?: string | null;
};

export type ExplorerNode = {
  id: string;
  type: NodeType;
  name: string;
  status: NodeStatus;
  position: number;
  parentId: string | null;
  meta: NodeMeta;
  childCount: number;
  children?: ExplorerNode[];
};

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 60) || `item-${Date.now().toString(36)}`
  );
}

const TYPE = z.enum(["course", "semester", "subject", "unit"]);

function tableFor(type: NodeType): "courses" | "semesters" | "subjects" | "units" {
  return type === "course"
    ? "courses"
    : type === "semester"
      ? "semesters"
      : type === "subject"
        ? "subjects"
        : "units";
}

// ---------------- TREE ----------------
export const getExplorerTree = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase;
    const [courses, semesters, subjects, units] = await Promise.all([
      sb
        .from("courses")
        .select("id,title,status,sort_order,slug,code,description")
        .is("deleted_at", null)
        .order("sort_order"),
      sb
        .from("semesters")
        .select("id,title,number,status,course_id,description")
        .is("deleted_at", null)
        .order("number"),
      sb
        .from("subjects")
        .select("id,title,sort_order,status,semester_id,slug,code,description")
        .is("deleted_at", null)
        .order("sort_order"),
      sb
        .from("units")
        .select("id,title,number,status,subject_id,summary")
        .is("deleted_at", null)
        .order("number"),
    ]);
    const err = courses.error ?? semesters.error ?? subjects.error ?? units.error;
    if (err) throw new Error(err.message);

    const u = units.data ?? [];
    const sj = subjects.data ?? [];
    const sm = semesters.data ?? [];
    const cs = courses.data ?? [];

    const tree: ExplorerNode[] = cs.map((c) => {
      const courseSems = sm.filter((x) => x.course_id === c.id);
      return {
        id: c.id,
        type: "course",
        name: c.title,
        status: c.status as NodeStatus,
        position: c.sort_order,
        parentId: null,
        meta: { slug: c.slug, code: c.code, description: c.description },
        childCount: courseSems.length,
        children: courseSems.map((s) => {
          const semSubs = sj.filter((x) => x.semester_id === s.id);
          return {
            id: s.id,
            type: "semester",
            name: s.title || `Semester ${s.number}`,
            status: s.status as NodeStatus,
            position: s.number,
            parentId: c.id,
            meta: { number: s.number, description: s.description },
            childCount: semSubs.length,
            children: semSubs.map((subj) => {
              const subjUnits = u.filter((x) => x.subject_id === subj.id);
              return {
                id: subj.id,
                type: "subject",
                name: subj.title,
                status: subj.status as NodeStatus,
                position: subj.sort_order,
                parentId: s.id,
                meta: { slug: subj.slug, code: subj.code, description: subj.description },
                childCount: subjUnits.length,
                children: subjUnits.map((un) => ({
                  id: un.id,
                  type: "unit",
                  name: un.title,
                  status: un.status as NodeStatus,
                  position: un.number,
                  parentId: subj.id,
                  meta: { number: un.number, summary: un.summary },
                  childCount: 0,
                })),
              };
            }),
          };
        }),
      };
    });
    return tree;
  });

// ---------------- CREATE ----------------
export const createExplorerNode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        type: TYPE,
        parentId: z.string().uuid().nullable().optional(),
        name: z.string().min(1).max(160),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const { type, parentId, name } = data;

    if (type === "course") {
      const { data: row, error } = await sb
        .from("courses")
        .insert({
          title: name,
          slug: slugify(name) + "-" + Math.random().toString(36).slice(2, 6),
          code:
            name
              .replace(/[^A-Za-z0-9]/g, "")
              .slice(0, 12)
              .toUpperCase() || "COURSE",
          total_semesters: 6,
          status: "draft",
          created_by: context.userId,
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return { id: row.id as string };
    }
    if (!parentId) throw new Error("parentId required");

    if (type === "semester") {
      const { data: existing } = await sb
        .from("semesters")
        .select("number")
        .eq("course_id", parentId)
        .is("deleted_at", null)
        .order("number", { ascending: false })
        .limit(1);
      const next = ((existing?.[0]?.number as number | undefined) ?? 0) + 1;
      const { data: row, error } = await sb
        .from("semesters")
        .insert({
          course_id: parentId,
          title: name,
          number: next,
          status: "draft",
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return { id: row.id as string };
    }
    if (type === "subject") {
      const { data: existing } = await sb
        .from("subjects")
        .select("sort_order")
        .eq("semester_id", parentId)
        .is("deleted_at", null)
        .order("sort_order", { ascending: false })
        .limit(1);
      const next = ((existing?.[0]?.sort_order as number | undefined) ?? 0) + 1;
      const { data: row, error } = await sb
        .from("subjects")
        .insert({
          semester_id: parentId,
          title: name,
          slug: slugify(name) + "-" + Math.random().toString(36).slice(2, 6),
          code:
            name
              .replace(/[^A-Za-z0-9]/g, "")
              .slice(0, 12)
              .toUpperCase() || "SUBJ",
          sort_order: next,
          status: "draft",
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return { id: row.id as string };
    }
    // unit
    const { data: existing } = await sb
      .from("units")
      .select("number")
      .eq("subject_id", parentId)
      .is("deleted_at", null)
      .order("number", { ascending: false })
      .limit(1);
    const next = ((existing?.[0]?.number as number | undefined) ?? 0) + 1;
    const { data: row, error } = await sb
      .from("units")
      .insert({
        subject_id: parentId,
        title: name,
        number: next,
        status: "draft",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });

// ---------------- UPDATE ----------------
export const updateExplorerNode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        type: TYPE,
        id: z.string().uuid(),
        patch: z.object({
          name: z.string().min(1).max(200).optional(),
          description: z.string().nullable().optional(),
          summary: z.string().nullable().optional(),
          slug: z.string().nullable().optional(),
          code: z.string().nullable().optional(),
          number: z.number().int().positive().optional(),
          status: z.enum(["draft", "published", "archived"]).optional(),
        }),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const { type, id, patch } = data;
    const table = tableFor(type);

    const payload: Record<string, unknown> = {};
    if (patch.name != null) payload.title = patch.name;
    if (patch.status != null) payload.status = patch.status;
    if (patch.number != null && (type === "semester" || type === "unit"))
      payload.number = patch.number;
    if (patch.slug != null && (type === "course" || type === "subject")) payload.slug = patch.slug;
    if (patch.code != null && (type === "course" || type === "subject")) payload.code = patch.code;
    if (type === "unit") {
      if (patch.summary !== undefined) payload.summary = patch.summary;
    } else if (patch.description !== undefined) {
      payload.description = patch.description;
    }
    if (Object.keys(payload).length === 0) return { ok: true };

    const { error } = await sb.from(table).update(payload).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------------- DELETE (soft) ----------------
export const deleteExplorerNode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ type: TYPE, id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const { error } = await sb
      .from(tableFor(data.type))
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------------- DUPLICATE ----------------
export const duplicateExplorerNode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ type: TYPE, id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const table = tableFor(data.type);
    const { data: src, error } = await sb.from(table).select("*").eq("id", data.id).single();
    if (error) throw new Error(error.message);

    const copy: Record<string, unknown> = { ...src };
    delete copy.id;
    delete copy.created_at;
    delete copy.updated_at;
    copy.title = `${src.title} (copy)`;
    copy.status = "draft";

    if (data.type === "course" || data.type === "subject") {
      copy.slug = slugify(String(copy.title)) + "-" + Math.random().toString(36).slice(2, 6);
      copy.code = String(src.code ?? "COPY") + "C";
      const parentField = data.type === "subject" ? "semester_id" : null;
      let q = sb.from(table).select("sort_order").is("deleted_at", null);
      if (parentField) q = q.eq(parentField, src[parentField]);
      const { data: next } = await q.order("sort_order", { ascending: false }).limit(1);
      copy.sort_order = ((next?.[0]?.sort_order as number | undefined) ?? 0) + 1;
    } else {
      const parentField = data.type === "semester" ? "course_id" : "subject_id";
      const { data: next } = await sb
        .from(table)
        .select("number")
        .eq(parentField, src[parentField])
        .is("deleted_at", null)
        .order("number", { ascending: false })
        .limit(1);
      copy.number = ((next?.[0]?.number as number | undefined) ?? 0) + 1;
    }

    const { data: ins, error: e2 } = await sb.from(table).insert(copy).select("id").single();
    if (e2) throw new Error(e2.message);
    return { id: ins.id as string };
  });

// ---------------- REORDER ----------------
export const reorderExplorerNode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        type: TYPE,
        id: z.string().uuid(),
        direction: z.enum(["up", "down"]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const { type, id, direction } = data;
    const table = tableFor(type);
    const orderField = type === "semester" || type === "unit" ? "number" : "sort_order";
    const parentField =
      type === "course"
        ? null
        : type === "semester"
          ? "course_id"
          : type === "subject"
            ? "semester_id"
            : "subject_id";

    const { data: cur, error } = await sb.from(table).select("*").eq("id", id).single();
    if (error) throw new Error(error.message);

    let q = sb.from(table).select(`id,${orderField}`).is("deleted_at", null);
    if (parentField) q = q.eq(parentField, cur[parentField]);
    q =
      direction === "up"
        ? q.lt(orderField, cur[orderField]).order(orderField, { ascending: false }).limit(1)
        : q.gt(orderField, cur[orderField]).order(orderField, { ascending: true }).limit(1);

    const { data: neighbor } = await q;
    const n = neighbor?.[0];
    if (!n) return { ok: true };

    await sb
      .from(table)
      .update({ [orderField]: n[orderField] })
      .eq("id", cur.id);
    await sb
      .from(table)
      .update({ [orderField]: cur[orderField] })
      .eq("id", n.id);
    return { ok: true };
  });
