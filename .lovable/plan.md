# BCA Gurukul — Admin Redesign

Incremental rebuild. Old admin pages keep working until each replacement lands. No destructive deletes this pass.

## Phase plan

**Phase 1 (this turn)** — new shell, IA, dashboard, command palette, quick add, primitives, `content_items` table + backfill + Content module.

**Phase 2** — migrate Papers screen and Question Bank screen onto the new primitives; move `/admin/notes` to redirect into `/admin/content?type=note`; retire old notes admin page once verified.

**Phase 3** — Settings hub (folds Homepage, Developer, Tags, Media, Branding, SEO, Flags, Users under one Settings route); polish, empty-state illustrations, keyboard shortcuts help.

Students / Analytics / Notifications are explicitly deferred.

---

## New information architecture

Sidebar (flat, seven items):

```text
Dashboard        /admin
Courses          /admin/courses          (existing, keep)
Subjects         /admin/subjects         (NEW — flat cross-course view)
Content          /admin/content          (NEW — unified)
Previous Papers  /admin/papers           (existing, restyled Phase 2)
Question Bank    /admin/quizzes          (existing, restyled Phase 2)
Settings         /admin/settings         (Phase 3 hub; links to existing pages this phase)
```

Explorer, Homepage, Developer, Media, Tags, Inbox, Super admin move under Settings in Phase 3. This phase they stay reachable via a "More" section in the sidebar so nothing breaks.

---

## Content data model (new)

New table `public.content_items`:

- `type` — enum `content_type` (`note`, `pdf`, `ppt`, `video`, `assignment`, `link`)
- `title`, `description`
- `subject_id`, `unit_id` (both nullable; subject required, unit optional)
- `file_path` (storage path), `file_url` (for `video`/`link`), `thumbnail_path`
- `tags text[]`, `visibility` (`public`|`students`|`private`), `status` (`draft`|`published`|`archived`)
- `publish_at timestamptz`, `view_count`, `download_count`
- Standard `created_by`, `created_at`, `updated_at`, `deleted_at`

Grants + RLS:
- `GRANT SELECT ON public.content_items TO anon` (only rows `status='published'` AND `visibility='public'`)
- `GRANT SELECT,INSERT,UPDATE,DELETE TO authenticated`; `GRANT ALL TO service_role`
- Public read policy (published+public); owner/admin write policies via `is_admin`
- Trigger `set_updated_at`; realtime enabled

**Backfill:** copy existing `public.notes` into `content_items` with `type='note'`, preserving `title`, `summary→description`, `subject_id`, `unit_id`, `status`, `created_by`, `created_at`, `file_path` where present. Old `notes` table stays intact; nothing points at it after Phase 2.

Papers and Quizzes are NOT migrated.

---

## New primitives (`src/components/admin/ui/`)

- `PageHeader` — title, description, actions slot, breadcrumbs
- `StatCard` — label / value / delta / icon
- `DataTable` — TanStack Table: search, sort, pagination, column visibility, row selection, bulk-action bar, empty + loading states
- `EmptyState` — icon, title, description, CTA
- `TableSkeleton`, `CardSkeleton`
- `FilterBar`, `StatusBadge`, `ConfirmDialog`

All theme-token based (`bg-surface`, `text-foreground`, `border-border`). Dark mode inherited.

---

## New admin shell (`src/components/admin/admin-shell.tsx` rewrite)

- Collapsible sidebar (icon rail on mobile, full on md+)
- Sticky top bar: sidebar trigger, breadcrumbs, `⌘K` search trigger, quick-add button, student-view link, avatar
- `⌘K` / `Ctrl+K` opens `CommandPalette` (built on shadcn `Command`) — jumps to any admin page + quick-creates (course, subject, content, paper, MCQ)
- Quick-add uses the existing `CreateWizard` (extended with "New content")
- Content tree stays in a collapsible "Explorer" section, hidden by default

---

## New routes

- `src/routes/_authenticated/admin/index.tsx` — replace with new Dashboard (stat grid, recent uploads, recent activity, quick actions). Reuses existing `getDashboardStats`, `getRecentUploads`, `getRecentActivity`.
- `src/routes/_authenticated/admin/subjects.tsx` — NEW flat subjects table across all courses/semesters
- `src/routes/_authenticated/admin/content.index.tsx` — NEW unified content list
- `src/routes/_authenticated/admin/content.new.tsx` — NEW content editor (type picker → form → upload)
- `src/routes/_authenticated/admin/content.$id.tsx` — NEW edit view
- `src/routes/_authenticated/admin/settings.index.tsx` — Phase 3 hub stub linking to existing settings pages

Old routes (`/admin/notes`, `/admin/papers`, `/admin/quizzes`, `/admin/media`, `/admin/tags`, `/admin/homepage`, `/admin/developer`, `/admin/inbox`, `/admin/explorer`, `/admin/superadmin/*`) remain untouched and reachable.

---

## Server functions

New `src/lib/content.functions.ts`:

- `listContent({ type?, status?, subjectId?, search?, page, pageSize, sort })` — auth'd, admin-scoped
- `getContent({ id })`
- `createContent({ input })`
- `updateContent({ id, patch })`
- `bulkUpdateContent({ ids, patch })` (publish / archive / restore)
- `deleteContent({ id })` (soft)
- `duplicateContent({ id })`

Storage: reuse existing `notes` bucket for `note`/`pdf`/`ppt`/`assignment`, `media` bucket for `video` thumbnails, `link`/`video` use `file_url` only.

---

## What ships this turn

1. Migration: `content_type` enum + `content_items` table + grants + RLS + trigger + realtime + backfill from `notes`.
2. `src/components/admin/ui/*` primitives.
3. `src/lib/content.functions.ts`.
4. Rewritten `admin-shell.tsx` (new IA, command palette, quick add, top bar).
5. New Dashboard, Subjects, Content list, Content new/edit routes.
6. `CommandPalette` component.
7. `CreateWizard` extended with "Content".
8. Skeletons + empty states wired in.

Nothing existing is deleted. Old sidebar links live under a collapsible "More" group so `/admin/homepage`, `/admin/developer`, `/admin/media`, `/admin/tags`, `/admin/inbox`, `/admin/explorer`, `/admin/superadmin` remain reachable.

---

## Technical notes

- All new pages use `useQuery` + server fns with query keys under `["admin","content", ...]` so the existing `useAdminRealtimeRefresh` invalidates them automatically once `content_items` is added to its watch list.
- `useAdminRealtimeRefresh` gets `content_items` appended to `ADMIN_REALTIME_TABLES`.
- Command palette uses `cmdk` (shadcn `Command` primitive — already installed).
- Tables use `@tanstack/react-table` (add if not present).
- Design tokens only — no hex, no `text-white`. Fraunces for section headers, Inter for body per project memory.

## Risks

- Bundle grows with react-table; acceptable, admin-only.
- Backfill runs once inside the migration; safe because `content_items` starts empty. Re-running the migration would double-insert — the backfill uses `ON CONFLICT DO NOTHING` on `(title, subject_id, created_by)` to be idempotent.
