
# BCA Gurukul — Enterprise Implementation Plan (v3, Final Pre-Build Review)

> Documentation only. No code, no migrations until approved.
> Stack: TanStack Start, TS, Vite, Tailwind, shadcn/ui, Supabase (Postgres + Auth + Storage + Realtime + pg_cron + pg_net), TanStack Query, RHF + Zod.

---

## A. Final Review Outcomes (addresses your 10 checks)

### 1. Multi-Course support — confirmed
Top-level entity is **Course** (not just BCA), so the platform scales to BBA, MCA, B.Tech, diploma programs, certifications, etc.
```
Course (program)
└── Semester (or "Term"/"Level" — generic label per course)
    └── Subject
        └── Unit
            └── Notes | Videos | Papers | Assignments | Quizzes
```
- `courses` table: code, name, slug, description, duration_terms, term_label (`Semester|Year|Level|Module`), cover_url, is_published, order_index, deleted_at.
- `semesters.course_id` FK (NOT NULL). All downstream queries scope by course_id.
- `profiles.current_course_id` + `current_semester_id` for personalized dashboard.
- `enrollments` (user_id, course_id, status, enrolled_at) — many-to-many so a student can follow multiple courses.
- Slugs unique **per course** (`unique(course_id, slug)`), not globally — prevents collisions across programs.
- Admin CMS gains a Course switcher at the top of the workspace; all CRUD inherits the selected course.

### 2. System Health Dashboard (Super Admin) — added
Route `/admin/system-health`. Widgets:
- DB: connection count, slow queries (from `pg_stat_statements`), bloat, table sizes, index hit ratio (read via `supabaseAdmin` RPC `system_metrics()`).
- Auth: signups last 24h/7d, failed logins, active sessions.
- Storage: bucket usage per bucket, signed-URL request rate.
- Realtime: active channels, message throughput.
- Cron: last run + status for each `cron.job` (publish, purge, refresh MV, backups).
- Server fns: p50/p95 latency + error rate from `request_logs` table (sampled).
- Edge: 4xx/5xx counters, average TTFB.
- Background jobs: `import_jobs`, `export_jobs`, `ai_jobs` queue depth and failures.
- Feature flag state snapshot + maintenance mode toggle.
- Live status pills: Green/Yellow/Red with thresholds in `system_health_thresholds`.

### 3. Backup & Restore Architecture — added
- **Database**: Supabase PITR (7–14 day window) — primary safety net.
- **Logical backups**: nightly cron (`pg_cron`) runs `/api/public/cron/backup` which streams `pg_dump --schema=public --data-only` per critical table to the `backups` private bucket; objects keyed `daily/YYYY-MM-DD/<table>.sql.gz`; retention 30 days, weekly snapshot kept 12 weeks, monthly kept 12 months.
- **Storage backups**: weekly job mirrors private buckets (`notes`, `papers`, `assignments`, `submissions`) to `backups/storage/YYYY-WW/` (rsync-style diff via signed URLs).
- **Config backup**: nightly dump of `branding`, `app_settings`, `feature_flags`, `maintenance`, `permissions`, `role_permissions` to `backups/config/`.
- **Restore UI** (super_admin → `/admin/backups`): list snapshots, preview manifest, dry-run restore into a staging schema (`restore_staging`), diff against live, then promote selected tables. Full restore documented as a runbook (PITR + bucket re-sync).
- **Verification**: nightly `restore_smoke_test` cron restores latest backup into staging schema, runs row-count + checksum assertions, writes result to `backup_audit`.
- `backup_runs` table tracks every backup (kind, started_at, finished_at, size_bytes, object_key, status, error).

### 4. Module-level Feature Flags — added
- `feature_flags` extended: `module` enum (`quizzes|assignments|videos|papers|notes|announcements|comments|notifications|search|ai|bulk_import|analytics|landing_signup|...`), `enabled`, `rollout_pct`, `audience jsonb` (role/course/user filters), `kill_switch`.
- Server helper `isFeatureEnabled(key, ctx)` consulted by route gates, navigation, and server fns. Disabled module → hidden in nav + 404 on direct visit + write-blocked at server.
- Super-admin UI `/admin/feature-flags` with live preview impact (counts affected users) and per-module on/off + rollout slider + audience builder.

### 5. Session Management — added
- `user_sessions` table: id, user_id, refresh_jti, user_agent, ip, country, city, device_kind (`web|android|ios`), created_at, last_seen_at, revoked_at.
- Populated by a server fn on each successful sign-in and refreshed by a lightweight heartbeat (every 5 min via TanStack Query background) that updates `last_seen_at`.
- Student `/settings/sessions` page lists active sessions and offers "Sign out this device" / "Sign out all other devices" (admin-side too).
- Super-admin can force-revoke any session (writes `revoked_at`; auth middleware checks `revoked_at` via `has_active_session(jti)` and rejects if revoked).
- Idle timeout: configurable in `app_settings.session_idle_minutes`; client clears session when exceeded.
- Concurrent-session cap optional per role.

### 6. Download Analytics — added
- `download_events` (user_id, entity_type, entity_id, file_key, bucket, bytes, ip, ua, country, occurred_at) — partitioned monthly.
- All file access goes through `/api/public/v1/files/sign` server fn which:
  1. Verifies caller permission via RLS-aware Supabase client.
  2. Inserts a `download_events` row.
  3. Returns a short-TTL signed URL.
- Direct bucket URLs are never exposed. Admin analytics: downloads per resource, per course, per semester, per user, time series; top downloaded papers/notes; export CSV.
- Student-facing: "Recently downloaded" list, optional "downloaded for offline" badge.

### 7. Error Monitoring — added
- Client: existing `reportLovableError` plus structured `error_events` insert (best-effort) via `/api/public/v1/telemetry/error` (rate-limited, no PII, scrubs tokens).
- Server fns: wrap every handler with `withErrorBoundary` that records `{ fn_name, user_id?, code, message, stack_hash, request_id }` to `error_events`.
- `error_events` table partitioned monthly; aggregated MV `error_events_hourly`.
- `/admin/errors` page: timeline, top errors by hash, affected users, first/last seen, status (`open|ack|resolved`), link to related route. Filter by route, severity, deployment.
- Server route `/api/public/v1/telemetry/error` validates payload (Zod), drops payloads > 8KB, dedupes by `(stack_hash, route, user_id)` per 60s window.
- Optional outbound integration slot (Sentry/Logflare) gated behind a feature flag.

### 8. REST API Versioning for Android — added
- All externally-facing endpoints live under `/api/public/v1/...`. Future breaking changes ship as `/api/public/v2/...`; v1 stays online with a deprecation header.
- Endpoint families (v1):
  - `auth/` — token exchange via Supabase JS on device; this layer only exposes `auth/session/refresh-meta`.
  - `catalog/courses`, `catalog/semesters`, `catalog/subjects`, `catalog/units` (read).
  - `content/notes/:id`, `content/papers/:id`, `content/videos/:id` (read).
  - `quizzes/:id`, `quizzes/:id/start`, `quizzes/:id/submit`.
  - `files/sign` (POST) — returns signed URL + records download.
  - `me/profile`, `me/progress`, `me/bookmarks`, `me/notifications`, `me/devices/register` (FCM token), `me/sessions`.
  - `search` (POST with filters).
  - `telemetry/error`, `telemetry/activity`.
- Conventions: JSON only; `Accept: application/vnd.bcagurukul.v1+json`; consistent envelope `{ data, error, meta: { request_id, deprecation? } }`; cursor pagination (`?cursor=&limit=`); ETag + `If-None-Match` on read endpoints; `Retry-After` on 429.
- OpenAPI spec generated from Zod schemas and published at `/api/public/v1/openapi.json` — drives Android client codegen.
- Auth: device sends Supabase JWT in `Authorization: Bearer`; same RLS as web. Refresh handled by Supabase SDK on device.
- Versioning policy documented; v1 minimum support window 12 months after v2 ships.

### 9. Database Normalization Review — verified
- **3NF compliance**: lookups (`courses`, `semesters`, `subjects`, `units`, `tags`, `categories`) referenced by FK; no repeating groups; no derived fields stored except documented denormalizations.
- **Polymorphism contained**: `taggables`, `bookmarks`, `progress`, `comments`, `activity_events`, `notifications`, `entity_versions` all use `(entity_type, entity_id)`. Each gets a CHECK constraint restricting `entity_type` to an allowed set + partial unique indexes per entity type, and a trigger validates the referenced row exists (cheap lookup against the right table by `entity_type`). This trades pure relational purity for one well-known polymorphic pattern instead of N junction tables — accepted.
- **Controlled denormalization** (with triggers to keep in sync):
  - `notes.reading_minutes`, `notes.body_plain` (derived from `body_richtext`).
  - `quiz_attempts.score`, `.pct`, `.passed` (computed at submit, immutable after).
  - `search_documents` projection table (separate from source).
  - `progress.progress_pct` cached; recomputable.
  - All denormalized fields documented in `/docs/db-derived-fields.md` with the trigger that owns them.
- **Many-to-many** correctly modeled: `enrollments`, `taggables`, `role_permissions`, `notification_preferences`.
- **No FKs into `auth.users`** beyond what Supabase manages; app FKs go to `profiles.user_id`.
- **Naming**: snake_case, singular column names, plural tables, `*_id` suffix for FKs, `*_at` for timestamps, `is_*` for booleans.
- **Enums** for closed sets (`app_role`, `entity_type`, `notification_channel`, `quiz_question_type`, `import_kind`, etc.) — values are stable; new values added via migration.
- **No nullable FKs on ownership columns** (`user_id NOT NULL` everywhere RLS depends on it).

### 10. Scalability to 1M Users — assessed
Target: 1M registered, ~50k DAU peak, ~5k concurrent.
- **Postgres sizing**: Supabase Pro/Team plan with read replicas for analytics queries; connection pool via Supavisor (transaction mode) — server fns use pooled connection string.
- **Indexes**: all FKs; `(course_id, semester_id, is_published, published_at desc)`; GIN on `search_documents.tsv` and on tag arrays; BRIN on `activity_events.occurred_at`; partial indexes (`WHERE deleted_at IS NULL`) on hot tables.
- **Partitioning** (monthly, declarative): `activity_events`, `audit_logs`, `notifications`, `download_events`, `error_events`. Detach + archive partitions older than 13 months to cold storage.
- **Materialized views** refreshed by `pg_cron`: `mv_dau`, `mv_wau`, `mv_mau`, `mv_top_content`, `mv_quiz_stats`, `mv_download_top`, `mv_error_hourly`. CONCURRENTLY refresh.
- **Hot paths cached**: catalog tree, branding, feature flags, public landing data → server-side cache (Cache-Control + s-maxage on the edge; in-memory per-worker LRU with short TTL keyed by version stamp in `app_settings.cache_version`).
- **Realtime**: subscribe per-user channels only (notifications), not broad table changes; this caps fan-out and Realtime bill.
- **Storage**: private buckets + short signed URLs; CDN in front of public buckets (branding/media); HLS layout reserved for future adaptive video.
- **Search**: tsvector + GIN scales to multi-million rows; embedding/pgvector + IVFFLAT reserved for AI semantic search (1M docs feasible).
- **Rate limiting**: token bucket in Postgres keyed by `(user_id|ip, route_bucket)`; aggressive limits on auth, search, file-sign, telemetry.
- **Background work**: `pg_cron` + `pg_net` for fan-out (notifications, scheduled publish, backups, MV refresh, partition rotation, trash purge).
- **App layer**: per-request `QueryClient`; loaders use `ensureQueryData`; route-level code splitting; image CDN; list virtualization for any list > 200 rows.
- **Cost guardrails**: `ai_jobs` daily cap; download events sampled at 100% but partitioned + rolled up; activity events down-sampled for chatty events (e.g. `view`) to 1-in-N after threshold.
- **Capacity tests** (Phase 19): k6 scripts hitting catalog read, search, quiz submit, file-sign at 5k VU.

---

## B. Architecture Updates Folded Into the Plan

### Updated Information Architecture
```
Course → Semester → Subject → Unit → {Notes, Videos, Papers, Assignments, Quizzes}
Cross-cutting: Tags, Categories, Enrollments, Announcements, Notifications,
Bookmarks, Progress, Activity, Downloads, Comments, Search, Versions, Trash,
Audit, Errors, Sessions, Backups, Branding, Settings, Feature Flags, AI-ready.
```

### Updated Folder Structure (additions)
```
src/features/
  courses/  enrollments/  sessions/  downloads/  errors/  health/  backups/
src/routes/_authenticated/_admin/_superadmin/
  system-health.tsx  backups.tsx  feature-flags.tsx  sessions.tsx  errors.tsx
src/routes/api/public/v1/
  catalog/  content/  quizzes/  files/  me/  search/  telemetry/  openapi.ts
src/routes/api/public/cron/
  publish.ts  purge-trash.ts  refresh-mv.ts  backup.ts  restore-smoke.ts
  rotate-partitions.ts  rollup-activity.ts  rollup-errors.ts
```

### Updated Database Schema (new/changed tables)
- `courses`, `enrollments`
- `user_sessions`
- `download_events` (partitioned)
- `error_events` (partitioned) + `error_groups` (by stack_hash)
- `backup_runs`, `backup_audit`
- `feature_flags` (extended), `system_health_thresholds`, `system_metrics_snapshots`
- `request_logs` (sampled), `rate_limits`
- `semesters.course_id` FK added; uniqueness scoped per course
- `profiles.current_course_id` added
- All grants + RLS + service_role policies maintained per the public-schema-grants rule.

### Updated RLS Highlights
- `enrollments`: user manages own; admin reads all.
- `user_sessions`: user reads/revokes own; super_admin reads/revokes any.
- `download_events`, `error_events`: insert via server fn; SELECT admin+.
- `feature_flags`, `system_health_thresholds`, `backup_runs`: super_admin only; `feature_flags` exposes a sanitized public read (key + enabled) via view `feature_flags_public`.
- `courses`: SELECT authenticated where `is_published`; admin full.

### Updated Security
- Session revocation enforced in `requireSupabaseAuth` (checks `user_sessions.revoked_at` via cached RPC).
- Rate limiter middleware on auth, telemetry, file-sign, search.
- Telemetry payloads sanitized (token/email scrubbing) before insert.
- Backups encrypted at rest (bucket-level) + signed-URL-only access.
- API v1 endpoints require Bearer + apply per-route role checks.

### Updated Performance / Scalability
Partitioning, MVs, BRIN/GIN indexes, Supavisor pooling, read replicas, CDN, edge cache with version stamp, k6 load tests in Phase 19. Detailed above in §A.10.

### Updated Mobile / Android Readiness
- All data accessible via `/api/public/v1/*` with stable contract + OpenAPI.
- `device_tokens` for FCM; `user_sessions.device_kind` distinguishes platforms.
- Push notification server fn already abstracted by channel.
- Auth uses Supabase SDK on device — no custom token endpoint needed.
- File access via `files/sign` so Android obeys the same audit/download trail.

---

## C. Final 22-Phase Roadmap (revised from v2's 20)

**Phase 1 — Foundation & Bootstrap Recovery** (verify router shell, tokens, theming, clean build).
**Phase 2 — Identity, Roles, Permissions, Audit** (profiles, app_role, user_roles, permissions, has_role, audit_logs, app_settings, feature_flags scaffold, maintenance).
**Phase 3 — Authentication & Session Management** (sign up/in/out, reset, root onAuthStateChange, `user_sessions`, revoke, idle timeout).
**Phase 4 — Authorization, Route Gates, Rate Limiting** (`_authenticated`, `_admin`, `_superadmin`, isFeatureEnabled, rate_limits table).
**Phase 5 — Branding, Settings, Maintenance, Landing Page** (super-admin editors + polished public landing).
**Phase 6 — Courses & Academic Tree CMS** (courses, semesters scoped by course, subjects, units, enrollments, drag-reorder, soft delete, versions).
**Phase 7 — Tags, Categories, Media Library, Storage Buckets** (with download proxy stub).
**Phase 8 — Rich Text Editor & Notes** (Tiptap, attachments, reading time, versions, scheduling).
**Phase 9 — PDF Viewer, Video Embedding, Papers** (in-app react-pdf, YouTube + HTML5, captions, resume).
**Phase 10 — Quizzes, MCQ, Explanations, Secure Scoring** (public view masks `is_correct`).
**Phase 11 — Assignments & Submissions**.
**Phase 12 — Global Search** (tsv + GIN; pgvector column reserved).
**Phase 13 — Bookmarks, Progress, Activity Tracking**.
**Phase 14 — Notifications (in-app, web push, FCM device tokens)**.
**Phase 15 — Announcements & Scheduled Publishing via Cron**.
**Phase 16 — Versions, Trash & Restore, Partition Rotation Cron**.
**Phase 17 — Bulk Upload, CSV Import/Export, Download Proxy & Analytics**.
**Phase 18 — Student Dashboard, Admin Analytics, MVs, Error Monitoring**.
**Phase 19 — System Health Dashboard, Backups & Restore, Feature Flags UI**.
**Phase 20 — REST API v1 for Android, OpenAPI, FCM Integration, Versioning Headers**.
**Phase 21 — SEO, A11y, Responsive, Performance, k6 Load Tests, Lighthouse, axe**.
**Phase 22 — Production Hardening & Deployment** (RLS linter, security scan, secrets review, custom domain, monitoring, runbook, restore drill, publish).

---

## D. Production-Readiness Confirmation

The architecture as updated is **production-ready** for an enterprise LMS targeting up to 1M users, with:
- Multi-course taxonomy and per-course slugging.
- Full CMS, search, MCQ explanations, RTE, PDF viewer, video, bulk/CSV, versioning, trash, branding, maintenance, notifications, AI-ready schema, professional landing.
- Super-admin operations: system health, backups & restore, feature flags, session control, error monitoring, audit.
- Download analytics + signed-URL proxy enforcing access control on every byte served.
- REST API v1 + OpenAPI for Android, with stable URLs and deprecation policy.
- Defense in depth: RLS + role checks + rate limits + session revocation + telemetry scrubbing + encrypted backups.
- Scalability: partitioning, MVs, pooling, replicas, CDN, edge cache, cost guardrails, load-test plan.
- Normalized schema (3NF) with documented, trigger-maintained denormalizations.

Awaiting your approval to switch to Build Mode and begin Phase 1 (which also fixes the current bootstrap build failure before any feature work).
