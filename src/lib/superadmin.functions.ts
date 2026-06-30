import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AppRole = "super_admin" | "admin" | "instructor" | "student";

async function assertSuperAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "super_admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: super_admin required");
}

export type AdminUserRow = {
  user_id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  roles: AppRole[];
};

export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { search?: string; limit?: number } | undefined) => data ?? {})
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const limit = Math.min(data?.limit ?? 200, 1000);
    const { data: authList, error: authErr } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: limit,
    });
    if (authErr) throw new Error(authErr.message);

    const ids = authList.users.map((u) => u.id);
    const [profilesRes, rolesRes] = await Promise.all([
      supabaseAdmin.from("profiles").select("user_id,full_name,avatar_url").in("user_id", ids),
      supabaseAdmin.from("user_roles").select("user_id,role").in("user_id", ids),
    ]);
    if (profilesRes.error) throw new Error(profilesRes.error.message);
    if (rolesRes.error) throw new Error(rolesRes.error.message);

    const profileMap = new Map((profilesRes.data ?? []).map((p) => [p.user_id, p]));
    const roleMap = new Map<string, AppRole[]>();
    for (const r of rolesRes.data ?? []) {
      const arr = roleMap.get(r.user_id) ?? [];
      arr.push(r.role as AppRole);
      roleMap.set(r.user_id, arr);
    }

    const search = (data?.search ?? "").toLowerCase().trim();
    let rows: AdminUserRow[] = authList.users.map((u) => {
      const prof = profileMap.get(u.id);
      return {
        user_id: u.id,
        email: u.email ?? null,
        full_name: prof?.full_name ?? null,
        avatar_url: prof?.avatar_url ?? null,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at ?? null,
        roles: roleMap.get(u.id) ?? [],
      };
    });
    if (search) {
      rows = rows.filter(
        (r) =>
          (r.email ?? "").toLowerCase().includes(search) ||
          (r.full_name ?? "").toLowerCase().includes(search),
      );
    }
    rows.sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
    return rows;
  });

export const grantRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string; role: AppRole }) => data)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("user_roles")
      .upsert(
        { user_id: data.userId, role: data.role, granted_by: context.userId },
        { onConflict: "user_id,role", ignoreDuplicates: true },
      );
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("audit_logs").insert({
      actor_id: context.userId,
      action: "role.grant",
      entity_type: "user_role",
      entity_id: data.userId,
      metadata: { role: data.role },
    });
    return { ok: true };
  });

export const revokeRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string; role: AppRole }) => data)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    if (data.userId === context.userId && data.role === "super_admin") {
      throw new Error("You cannot revoke your own super_admin role.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.userId)
      .eq("role", data.role);
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("audit_logs").insert({
      actor_id: context.userId,
      action: "role.revoke",
      entity_type: "user_role",
      entity_id: data.userId,
      metadata: { role: data.role },
    });
    return { ok: true };
  });

export type AuditLogRow = {
  id: string;
  actor_id: string | null;
  actor_email: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: string | null;
  ip: string | null;
  created_at: string;
};

export const listAuditLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { limit?: number; action?: string } | undefined) => data ?? {})
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const limit = Math.min(data?.limit ?? 200, 1000);
    let q = supabaseAdmin
      .from("audit_logs")
      .select("id,actor_id,action,entity_type,entity_id,metadata,ip,created_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (data?.action) q = q.ilike("action", `%${data.action}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const actorIds = Array.from(new Set((rows ?? []).map((r) => r.actor_id).filter(Boolean))) as string[];
    const emailMap = new Map<string, string>();
    if (actorIds.length) {
      const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      for (const u of list?.users ?? []) {
        if (actorIds.includes(u.id) && u.email) emailMap.set(u.id, u.email);
      }
    }
    return (rows ?? []).map((r) => ({
      ...r,
      metadata: r.metadata ? JSON.stringify(r.metadata) : null,
      actor_email: r.actor_id ? emailMap.get(r.actor_id) ?? null : null,
    })) as AuditLogRow[];
  });

export type FeatureFlagRow = {
  key: string;
  module: string | null;
  description: string | null;
  enabled: boolean;
  rollout_pct: number | null;
  kill_switch: boolean;
  updated_at: string;
};

export const listFeatureFlags = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("feature_flags")
      .select("key,module,description,enabled,rollout_pct,kill_switch,updated_at")
      .order("module")
      .order("key");
    if (error) throw new Error(error.message);
    return (data ?? []) as FeatureFlagRow[];
  });

export const updateFeatureFlag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { key: string; enabled?: boolean; kill_switch?: boolean; rollout_pct?: number }) => data)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: Record<string, unknown> = { updated_by: context.userId, updated_at: new Date().toISOString() };
    if (typeof data.enabled === "boolean") patch.enabled = data.enabled;
    if (typeof data.kill_switch === "boolean") patch.kill_switch = data.kill_switch;
    if (typeof data.rollout_pct === "number") patch.rollout_pct = data.rollout_pct;
    const { error } = await supabaseAdmin.from("feature_flags").update(patch).eq("key", data.key);
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("audit_logs").insert({
      actor_id: context.userId,
      action: "flag.update",
      entity_type: "feature_flag",
      entity_id: data.key,
      metadata: patch,
    });
    return { ok: true };
  });

export type PlatformStats = {
  total_users: number;
  admins: number;
  super_admins: number;
  active_sessions: number;
  audit_events_24h: number;
};

export const getPlatformStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const [users, admins, supers, sessions, audits] = await Promise.all([
      supabaseAdmin.from("profiles").select("user_id", { count: "exact", head: true }),
      supabaseAdmin.from("user_roles").select("user_id", { count: "exact", head: true }).eq("role", "admin"),
      supabaseAdmin.from("user_roles").select("user_id", { count: "exact", head: true }).eq("role", "super_admin"),
      supabaseAdmin.from("user_sessions").select("id", { count: "exact", head: true }).is("revoked_at", null),
      supabaseAdmin.from("audit_logs").select("id", { count: "exact", head: true }).gte("created_at", since),
    ]);
    return {
      total_users: users.count ?? 0,
      admins: admins.count ?? 0,
      super_admins: supers.count ?? 0,
      active_sessions: sessions.count ?? 0,
      audit_events_24h: audits.count ?? 0,
    } as PlatformStats;
  });
