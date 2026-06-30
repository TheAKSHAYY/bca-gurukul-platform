# BCA Gurukul → Enterprise No-Code CMS

This is a multi-week build. To keep your app stable, I'll ship it in **10 sequenced phases**, each independently usable. Existing design system, routes, auth, and DB stay intact — we only extend.

I'll wait for your approval on this plan, then execute phase by phase (asking before starting each new phase so you can re-prioritize).

---

## Phase 1 — Homepage Section Builder (WordPress-style)
Goal: every landing-page section editable, reorderable, toggleable from `/admin/homepage`.

- Extend `homepage_sections` with: `kind` (hero|about|features|why_us|universities|courses|categories|stats|testimonials|faculty|process|faq|blog|footer|contact|newsletter|cta), `content jsonb` (typed per kind), `style jsonb` (bg, gradient, colors), `visible`, `order_index`, `status` (draft|published), `published_content jsonb`.
- Admin UI: section list with drag-reorder, add/duplicate/delete/hide, per-kind form (title, subtitle, description, images, buttons, links, bg/gradient), Save Draft / Publish / Preview (renders `/` with draft overlay).
- Rewrite `src/routes/index.tsx` to render sections from DB in order; remove hardcoded copy.

## Phase 2 — Branding, Theme & SEO Manager
- Extend `branding`: logo, logo_text, favicon, primary/secondary/accent colors, font_heading, font_body, radius, dark/light overrides.
- `/admin/theme`: live color pickers writing CSS variables; font picker (Google Fonts allow-list); radius slider.
- `/admin/seo`: per-route SEO table (`seo_meta`: path, title, description, keywords, og_image, twitter, robots, canonical). Root route reads it via server fn.
- Auto-generated `sitemap.xml` + `robots.txt` server routes.

## Phase 3 — Course Tree CMS (VS Code explorer)
- Add `topics` table (under `units`) and `learning_contents` (typed: note|mcq|quiz|paper|assignment|video|pdf|download|flashcard|resource).
- New `/admin/content` page: left tree (Course→Sem→Subject→Unit→Topic→Content) with create/rename/delete/duplicate/move/archive/publish, right pane = editor for selected node.
- Keyboard nav, context menu, search-in-tree, bulk actions.

## Phase 4 — Notion-style Notes Editor
- Replace current note editor with **Tiptap** + extensions: headings, bold/italic/underline, highlight, image, video embed, PDF embed, tables, code blocks (lowlight syntax highlight), math (KaTeX), callouts, lists, checklists, links.
- Autosave (debounced server fn), version history table `note_versions` with restore.

## Phase 5 — MCQ & Quiz Builder Pro
- Manual builder (already partly done) + bulk import: CSV / JSON / XLSX parsers client-side, preview + commit.
- Per-question: difficulty, tags, topic, negative marks, timer, explanation (rich), image, code block, shuffle flag.
- Export (CSV/JSON), duplicate, import library.

## Phase 6 — Media Library + Video Manager + PYQ
- `/admin/media`: grid view of `media_assets` with folders (`media_folders`), search, rename, delete, multi-upload, drag-drop, type filters.
- Video manager: source = youtube|vimeo|upload; thumbnail, duration, captions (vtt), description, attached resources.
- PYQ upload form: year, university, course, semester, subject, unit, description, PDF preview & download tracker (already partial).

## Phase 7 — User & Role Management Console
- `/admin/users`: list with filter by role, search, invite, change role (super_admin only), ban/suspend (`status` on profiles), soft-delete, activity timeline (from `audit_logs`+`user_sessions`).
- Permissions matrix view (role × permission) backed by existing `role_permissions`.

## Phase 8 — Global Search + Analytics Dashboard
- Postgres FTS materialized view `search_index` over courses/subjects/units/topics/notes/papers/quizzes/users.
- `/admin/search` + ⌘K everywhere (already partial — extend to all entities).
- `/admin/analytics`: KPIs, most-viewed notes, most-attempted quizzes, downloads, traffic (from `user_sessions`), engagement funnels. Charts via `recharts`.

## Phase 9 — Import / Export / Backup
- Per-entity CSV/Excel/JSON export buttons.
- Zip backup: server fn dumps selected tables to JSON + media manifest → downloadable zip.
- Restore: upload zip → preview diff → commit (super_admin only).

## Phase 10 — AI-Ready Hooks + Polish
- Buttons (disabled stubs wired to Lovable AI Gateway later): Generate Notes / MCQ / Quiz / Flashcards / Summary from a topic.
- Performance pass: route-level code splitting, `React.lazy` for admin, virtualized tables (`@tanstack/react-virtual`) for long lists, image `loading="lazy"`, query caching tuning.
- UX pass: skeletons, empty states, error states across every admin page; a11y audit; mobile admin layout.

---

## Cross-cutting rules I'll keep

- No hardcoded copy or colors in components — everything via DB + CSS tokens.
- Every new table: GRANTs + RLS + `deleted_at` + audit trigger.
- Draft/Publish on every content entity (`status` + `published_*` snapshot).
- All writes go through `createServerFn` with `requireSupabaseAuth` + role check.
- Existing routes, auth flow, design system untouched.

---

## What I need from you

1. **Approve the phase order** (or reshuffle — e.g., if you want Course Tree before Homepage Builder).
2. Confirm I should **start with Phase 1 (Homepage Section Builder)** right after approval.
3. Any section kinds I missed for Phase 1?

Reply "go" to start Phase 1, or tell me what to change.