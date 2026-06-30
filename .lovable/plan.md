# Admin CMS Redesign — BCA Gurukul

Transform the scattered `/admin/*` pages into a single unified Enterprise CMS shell with one dashboard, one universal create wizard, a content tree sidebar, and consistent CRUD on every entity. Student portal untouched.

## 1. New Admin Shell (`/admin` layout)

Replace the current bare admin routes with a persistent shell:

```text
┌───────────────────────────────────────────────────────────┐
│  Logo   Global Search ⌘K          [+ Create]  Avatar      │
├──────────────┬────────────────────────────────────────────┤
│ Content Tree │                                            │
│  BCA         │            Main Workspace                  │
│  └ Sem 1     │   (Dashboard / Editor / List / Media)      │
│    └ Subj    │                                            │
│      └ Unit  │                                            │
│        └ ... │                                            │
└──────────────┴────────────────────────────────────────────┘
```

- `src/routes/_authenticated/admin/route.tsx` → `<AdminShell>` with sidebar + topbar + `<Outlet/>`.
- Sidebar uses shadcn `Sidebar` (collapsible icon mode) with a live **Content Tree** (Course → Semester → Subject → Unit → leaf counts for notes/papers/quizzes). Click any node to filter the workspace.
- Topbar: global ⌘K search, breadcrumbs, single primary `[+ Create]` button, profile menu.
- Style: Linear/Notion-inspired — dense, keyboard-first, semantic tokens only (deep indigo + saffron already in `styles.css`).

## 2. Dashboard (`/admin` index)

Single page, real Supabase counts, no demo data:

- KPI cards: Students, Semesters, Subjects, Units, Notes, PDFs, Videos, MCQs, Quizzes, Papers, Downloads, Active Users (last 24h from `user_sessions`).
- Recent Uploads feed (union of latest 10 across notes/papers/quizzes/media).
- Recent Student Activity (latest `note_views` + `paper_downloads` + quiz attempts).
- All counts via one server fn `getDashboardStats` (parallel `count: 'exact', head: true` queries).

## 3. Universal Create Wizard

One `[+ Create]` button → shadcn `Dialog` wizard:

- **Step 1** — choose type: Semester · Subject · Unit · Note · PDF · Video · MCQ Quiz · Previous Year Paper · Assignment · Announcement.
- **Step 2** — dynamic form (React Hook Form + Zod schema per type). Cascading selects Course→Semester→Subject→Unit prefilled from current tree selection.
- **Step 3** — file upload to correct Supabase bucket (drag-drop, progress, accepts PDF/DOCX/Image/Video/ZIP/CSV).
- **Step 4** — Publish or Save as Draft (writes `status` column).

Single component `CreateWizard.tsx` with a registry mapping content type → schema + form + submit handler.

## 4. New / Extended DB

Migration adds what's missing to support the brief:

- `videos` table (title, description, provider (`youtube`|`vimeo`|`upload`), url, subject_id, unit_id, status, deleted_at, …) + RLS + GRANTs + storage policies on `media` bucket for uploads.
- `assignments` table (title, description, due_date, file_path, subject_id, status, …).
- `announcements` table (title, body, audience, pinned, published_at, …).
- Add missing `status`/`deleted_at` columns where absent for uniform publish/archive/trash.
- RPC `admin_dashboard_stats()` returning one JSON blob (security definer, admin-only via `is_admin`).
- RPC `admin_recent_activity(_limit int)` unioning views/downloads/attempts.

(Existing tables `notes`, `papers`, `quizzes`, `media_assets`, `tags`, course tree are reused.)

## 5. CRUD Standardization

Every entity gets the same toolbar in its list view:
Create · View · Edit · Duplicate · Move · Publish · Unpublish · Archive · Delete · Restore.
Implemented once as `<EntityTable>` with column + action props; reused for notes, papers, quizzes, videos, assignments, announcements.

Bulk actions row when rows are selected: Bulk Publish/Unpublish/Move/Delete + CSV Import / CSV Export (papaparse).

## 6. MCQ Builder

Rebuild `/admin/quizzes/$id` into a single-page builder:
- Left: question list (drag-reorder).
- Right: question editor — stem, 4 options (radio for correct), explanation (rich text), difficulty (Easy/Medium/Hard), marks. Autosave on blur.
- Top: quiz metadata + Publish toggle.

## 7. Rich Notes Editor

Tiptap with extensions: Heading, Table, Image (uploads to `media` bucket), CodeBlockLowlight (syntax highlighting), Link, Mathematics (KaTeX), Attachment (file link), Preview tab. Replaces current plain textarea on `/admin/notes/$id`.

## 8. Media Library (`/admin/media`)

Grid view with: search, type filter, preview modal, Replace (re-upload to same path), Delete, Copy URL (signed URL for private buckets). Backed by existing `media_assets`.

## 9. Global Search (⌘K)

`cmdk` palette over a `search_documents` view (UNION of notes/papers/quizzes/videos/assignments/units/subjects with `title`, `type`, `route`). Server fn `globalSearch(q)` with `ilike` + ranking; navigates on select.

## 10. Filters

Persistent filter bar on every list page: Semester · Subject · Unit · Type · Status (Published/Draft/Archived). State synced to URL search params via TanStack Router.

## 11. Security

- All admin routes already gated by `_authenticated` + role check; reaffirm `is_admin(auth.uid())` in every new RLS policy and RPC.
- Students: existing public routes only read `status='published' AND deleted_at IS NULL` — verify on new `videos`/`assignments`/`announcements`.
- No new public endpoints. CSV import runs through an authenticated server fn that validates each row with Zod before insert.

## 12. Cleanup

- Remove standalone scattered pages where the wizard + unified table replace them (keep route files but redirect old paths to the new unified list view).
- No seed/demo data anywhere.

## Phasing (so we can ship incrementally)

1. Shell + sidebar tree + topbar + dashboard with real stats.
2. Universal Create Wizard (covers existing types first: Note, Paper, Quiz, Semester, Subject, Unit).
3. DB migration: `videos`, `assignments`, `announcements` + RPCs.
4. Unified `<EntityTable>` + CRUD actions + bulk actions + CSV.
5. MCQ Builder rebuild.
6. Tiptap rich editor for notes.
7. Media Library polish + ⌘K global search.
8. Final pass: remove dead pages, verify RLS, screenshot every admin route.

## Technical notes

- Stack unchanged: TanStack Start, TanStack Query, React Hook Form + Zod, shadcn/ui, Tailwind, Supabase. New deps: `cmdk`, `@tiptap/react` + extensions, `lowlight`, `katex`, `papaparse`, `react-dropzone`.
- All data through `createServerFn` (`requireSupabaseAuth`) — no direct admin-key calls from the browser.
- Existing design tokens (Fraunces/Inter, indigo/saffron) reused; no new color palette.

Reply "go" to start with Phase 1 (shell + dashboard).
