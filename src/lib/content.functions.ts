import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

export type ContentType = Database["public"]["Enums"]["content_type"];
export type ContentVisibility = Database["public"]["Enums"]["content_visibility"];
export type ContentStatus = "draft" | "published" | "archived";

export type ContentItem = Database["public"]["Tables"]["content_items"]["Row"] & {
  subject?: { id: string; title: string } | null;
  unit?: { id: string; title: string } | null;
};

const listSchema = z.object({
  type: z.string().optional(),
  status: z.string().optional(),
  subjectId: z.string().uuid().optional(),
  search: z.string().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  sort: z.enum(["created_at", "title", "updated_at"]).default("created_at"),
  dir: z.enum(["asc", "desc"]).default("desc"),
});

export const listContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: z.input<typeof listSchema>) => listSchema.parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const from = (data.page - 1) * data.pageSize;
    const to = from + data.pageSize - 1;
    let q = sb
      .from("content_items")
      .select(
        "id,type,title,description,status,visibility,subject_id,unit_id,file_path,file_url,tags,view_count,download_count,created_at,updated_at,subject:subjects(id,title),unit:units(id,title)",
        { count: "exact" },
      )
      .is("deleted_at", null);
    if (data.type && data.type !== "all") q = q.eq("type", data.type as ContentType);
    if (data.status && data.status !== "all") q = q.eq("status", data.status);
    if (data.subjectId) q = q.eq("subject_id", data.subjectId);
    if (data.search && data.search.trim()) q = q.ilike("title", `%${data.search.trim()}%`);
    q = q.order(data.sort, { ascending: data.dir === "asc" }).range(from, to);
    const { data: rows, error, count } = await q;
    if (error) throw new Error(error.message);
    return { items: (rows ?? []) as unknown as ContentItem[], total: count ?? 0 };
  });

export const getContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("content_items")
      .select(
        "*,subject:subjects(id,title),unit:units(id,title)",
      )
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Not found");
    return row as unknown as ContentItem;
  });

const contentInputSchema = z.object({
  type: z.enum(["note", "pdf", "ppt", "video", "assignment", "link"]),
  title: z.string().min(1).max(300),
  description: z.string().optional().nullable(),
  subject_id: z.string().uuid().optional().nullable(),
  unit_id: z.string().uuid().optional().nullable(),
  file_bucket: z.string().optional().nullable(),
  file_path: z.string().optional().nullable(),
  file_mime: z.string().optional().nullable(),
  file_size_bytes: z.number().optional().nullable(),
  file_url: z.string().url().optional().nullable().or(z.literal("")),
  thumbnail_path: z.string().optional().nullable(),
  tags: z.array(z.string()).default([]),
  visibility: z.enum(["public", "students", "private"]).default("students"),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
});

export const createContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: z.input<typeof contentInputSchema>) => contentInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const payload = { ...data, created_by: context.userId, file_url: data.file_url || null };
    const { data: row, error } = await context.supabase
      .from("content_items")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; patch: Partial<z.input<typeof contentInputSchema>> }) =>
    z.object({ id: z.string().uuid(), patch: contentInputSchema.partial() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const patch = { ...data.patch, file_url: data.patch.file_url || null };
    const { error } = await context.supabase
      .from("content_items")
      .update(patch)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const bulkUpdateContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { ids: string[]; patch: { status?: ContentStatus; visibility?: ContentVisibility } }) =>
    z.object({
      ids: z.array(z.string().uuid()).min(1),
      patch: z.object({
        status: z.enum(["draft", "published", "archived"]).optional(),
        visibility: z.enum(["public", "students", "private"]).optional(),
      }),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("content_items")
      .update(data.patch)
      .in("id", data.ids);
    if (error) throw new Error(error.message);
    return { ok: true, count: data.ids.length };
  });

export const deleteContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { ids: string[] }) =>
    z.object({ ids: z.array(z.string().uuid()).min(1) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("content_items")
      .update({ deleted_at: new Date().toISOString() })
      .in("id", data.ids);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const duplicateContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: src, error: e1 } = await context.supabase
      .from("content_items").select("*").eq("id", data.id).single();
    if (e1) throw new Error(e1.message);
    const copy = {
      ...src,
      id: undefined,
      title: `${src.title} (copy)`,
      status: "draft" as const,
      view_count: 0,
      download_count: 0,
      created_at: undefined,
      updated_at: undefined,
      deleted_at: null,
      created_by: context.userId,
    };
    delete (copy as Record<string, unknown>).id;
    delete (copy as Record<string, unknown>).created_at;
    delete (copy as Record<string, unknown>).updated_at;
    const { data: row, error: e2 } = await context.supabase
      .from("content_items").insert(copy).select("id").single();
    if (e2) throw new Error(e2.message);
    return row;
  });

export const listSubjectsFlat = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("subjects")
      .select("id,title,code,status,semester:semesters(number,course:courses(title))")
      .is("deleted_at", null)
      .order("title");
    if (error) throw new Error(error.message);
    return data ?? [];
  });
