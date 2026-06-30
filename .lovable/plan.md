# BCA Gurukul — Audit & Remediation Plan

This is a **plan only**. No code is written until you approve. Work is grouped into batches so we can ship and verify in small, safe steps. Each batch ends with a verification checklist.

---

## Section 0 — Audit Snapshot (current state)

What already exists and works:
- Auth (email + password, sign in/up/forgot), auth gate, role tables (`user_roles` + `has_role`).
- Content tree: courses → semesters → subjects → units, with parent-chain RLS.
- Notes, papers, quizzes (with server-graded MCQ), media library, tags.
- Admin shell, universal Create Wizard, dashboard stats RPC.
- Homepage driven by `homepage_sections` (with hardcoded fallback).
- Student dashboard: search, bookmarks, continue-learning, notifications widget.
- Branding + maintenance mode.

Confirmed gaps vs. your spec:
1. **Demo/seed risk** — no seed scripts exist, but some fallbacks (homepage `DEFAULT_SECTIONS`) render placeholder content when DB is empty. Must be cleaned so empty = empty.
2. **First-time Super Admin setup** — no bootstrap flow; today roles must be set manually in DB.
3. **Sign-up role exposure** — `/auth` sign-up creates a normal user (good) but there is no enforcement guarantee blocking client-side role injection; needs a DB-level guard (already partial via `prevent_role_self_escalation`).
4. **Auth UX** — no show/hide password, no Remember me, no Caps Lock warning, no field-level validation feedback, limited loading states.
5. **Navbar** — students/admins have minimal headers; no global search dropdown, no notifications bell, no theme toggle, no avatar menu.
6. **Profile** — `profiles` table exists but no profile page/route; no avatar upload UI.
7. **Dark mode** — not implemented (no theme provider, no toggle, tokens are light-only).
8. **CMS** — Create Wizard exists, but: no Videos entity, no Announcements entity, no Assignments student-side, "publish immediately" flow not unified.
9. **Homepage** — sections table exists but: testimonials/FAQ/contact sections are not all wired; admin editor exists but is JSON-only (not friendly).
10. **Navigation** — some cards on dashboard route to `/courses` generically instead of deep-linking.
11. **Search** — dashboard search exists; no global navbar search; no Videos/MCQ surface.
12. **Portfolio** — not implemented at all.
13. **Polish** — skeletons, empty states, hover/transition consistency, mobile audit pending.

---

## Section 1 — Guarantee a Clean Slate

Goal: a fresh deployment shows zero of everything; dashboards read "0"; no demo content anywhere.

- Verify there are no `INSERT` seed migrations for content tables. (Today: none for courses/notes/etc.)
- Remove the **hardcoded homepage fallback** (`DEFAULT_SECTIONS` in `src/routes/index.tsx`) and instead render a real "empty homepage" state when no `homepage_sections` rows exist. The homepage editor will seed the standard 8 sections on first save (admin-initiated), not on first visit.
- Audit every dashboard widget to render a true 0/empty state (no skeleton-as-content, no "example" rows).
- Add a one-shot SQL purge note (manual, not auto-run) that you can use if any test data leaked in: truncate content tables in dependency order. Not executed unless you confirm.

Verification: with an empty DB, `/`, `/dashboard`, `/admin`, `/courses` all render empty states with zero numbers and zero placeholder content.

---

## Section 2 — First-time Super Admin Bootstrap (secure)

- New public route `/setup` that:
  - Queries `count(*) from user_roles where role = 'super_admin'` via a `SECURITY DEFINER` RPC `bootstrap_status()` (returns only a boolean).
  - If a super admin already exists → redirects to `/auth`. Page is effectively dead after first use.
  - If none exists → renders a one-time form: full name, email, password (with strength meter), confirm password.
- New RPC `bootstrap_super_admin(email, password, full_name)`:
  - `SECURITY DEFINER`, runs in a transaction.
  - Re-checks "no super admin exists" inside the txn (race-safe).
  - Creates the auth user via admin API (server function using `supabaseAdmin`), inserts profile, inserts `user_roles(super_admin)`.
  - Any subsequent call throws.
- `/auth` sign-up continues to create only normal students. The existing `prevent_role_self_escalation` trigger already blocks client role writes; we'll add a regression test note.
- Hide `/setup` link everywhere; it's discoverable only by URL.

Verification: visit `/setup` on a clean DB → can create one super admin → second visit redirects away; signup cannot grant admin/super_admin under any condition.

---

## Section 3 — Auth UX Upgrade

Pure frontend on `/auth` and a new `/reset-password`:
- Show/Hide password eye button (sign-in, sign-up, reset).
- Remember me checkbox (controls Supabase session persistence via `supabase.auth` options for that session).
- Inline Zod validation with friendly messages; submit button shows spinner + disables.
- Caps Lock warning under password fields (keyboard event listener).
- `autoComplete` attributes: `email`, `current-password`, `new-password` for proper browser/password-manager autofill.
- Polished split-screen design refresh (already split-screen — tighten spacing, add micro-interactions, fix mobile).
- Add `/reset-password` page handling `type=recovery` and `updateUser({ password })`.

Verification: password managers autofill; caps-lock toast appears; validation errors are inline; loading state visible.

---

## Section 4 — Theme System (Light / Dark / System)

- Add a theme provider (`next-themes`-style, project-local) wired in `__root.tsx`.
- Extend `src/styles.css` with a `.dark` token set mirroring the existing scholarly palette (indigo/saffron) — preserve brand, not generic AI dark gradients.
- Persist preference in `localStorage` + respect `prefers-color-scheme` for "system".
- Add a `<ThemeToggle />` (Sun/Moon/Monitor) used in navbar.

Verification: toggle works on every page, persists across reload, no flash of wrong theme on first paint, semantic tokens used everywhere (no hardcoded colors).

---

## Section 5 — App Navbar + User Profile

- New `<AppNavbar />` rendered inside `_authenticated/route.tsx` (and a public variant on the landing for non-authed users).
  - Left: Logo + product name.
  - Center: Global search input (opens a command-palette style dropdown, ⌘K).
  - Right: Notifications bell (badge = unread count, opens popover list), Theme toggle, Avatar menu.
- Avatar menu (shadcn `DropdownMenu`):
  - Header row: avatar, name, email, role badge, online dot.
  - Items: Dashboard, Profile, Bookmarks, Settings, Help, Sign out.
- New `/profile` route:
  - View + edit `profiles` (full_name, display_name, avatar upload to `media` bucket, bio).
  - Read-only: email, role badge, joined date.
- New `/bookmarks`, `/settings`, `/help` routes (minimal first pass; bookmarks reuses RPC).
- Online status = derived from `user_sessions.last_seen_at < 5m`.

Verification: navbar consistent on all authenticated pages; profile edit persists; avatar shows everywhere; sign-out flow follows the four-step hygiene we already use.

---

## Section 6 — Global Search

- Promote the dashboard search into a `<GlobalSearch />` command palette accessible from the navbar and `⌘K`.
- Search across: courses, semesters, subjects, units, notes, papers, quizzes, videos, MCQs (videos/MCQ added in Section 7).
- Group results, keyboard nav, "View all results" link.
- Server: a single `global_search(query)` RPC with `SECURITY INVOKER` so RLS handles visibility. Limit per group.

Verification: ⌘K opens palette anywhere; results route to the correct viewer; empty/loading states clean.

---

## Section 7 — CMS Completion (Universal Create)

Extend the existing Create Wizard:
- Add **Videos** entity:
  - New `videos` table (title, provider: youtube/vimeo/url, video_id/url, duration, unit_id, status, soft-delete).
  - Public viewer `/videos/$videoId` with responsive embed; tracks `video_views`.
- Add **Announcements** entity:
  - New `announcements` table (title, body rich text, audience: all/role/course/semester, publish_at).
  - Publishing an announcement fan-outs `notifications` rows to targeted students via SQL function.
- Add **Assignments** entity:
  - `assignments` table (already partially scaffolded via bucket `assignments`/`submissions`). Wire CRUD + student submission upload.
- Unify wizard step order: **Type → Course → Semester → Subject → Unit → Details → Publish**, with "Publish now" toggle that flips `status` to `published` and stamps `published_at`.
- Bulk upload: drag-and-drop multiple PDFs in Notes/Papers (already partial), each becomes its own record under the chosen unit.

Verification: admin can create all 7 content types end-to-end without leaving the wizard; student sees them instantly after publish.

---

## Section 8 — Homepage CMS (no hardcoding)

- Replace JSON props editor with **typed editors per section** (Hero, Features, Learning Journey, Why Choose Us, Testimonials, FAQ, Contact, Footer).
- Each section type has its own form (title, subtitle, items array with add/remove/reorder).
- Testimonials reuse existing `homepage_testimonials` table; FAQ gets new `homepage_faqs` table; Contact stores email/phone/socials in a single section's props.
- Live preview pane next to the editor.
- Remove all default hardcoded fallback so the page truly reflects DB state.

Verification: super admin can rebuild the entire landing page without touching code; empty DB = empty (or "site coming soon") state.

---

## Section 9 — Navigation Integrity

- Replace every generic `to="/courses"` placeholder link on dashboards with the deep link (course → semester → subject → unit).
- Audit every card, button, and breadcrumb across `/`, `/dashboard`, `/admin`, `/courses/*`, `/notes/*`, `/papers/*`, `/quizzes/*` for dead/broken routes.
- Add breadcrumbs to public content viewers.
- 404 page (custom) on `notFoundComponent` for root.

Verification: clicking through any path from home → unit content works; no dead buttons; back nav preserves scroll.

---

## Section 10 — Developer Portfolio (CMS-driven)

- New tables (all admin-editable, RLS public-read of published rows only):
  - `portfolio_profile` (singleton: name, headline, bio, avatar, email, location, resume_url).
  - `portfolio_skills` (name, category, level, icon, order).
  - `portfolio_projects` (title, summary, body, cover, repo_url, live_url, tags, featured, order).
  - `portfolio_links` (label, url, kind: github/linkedin/twitter/other, order).
  - `portfolio_certificates` (title, issuer, issued_at, credential_url, file).
  - `portfolio_achievements` (title, description, date, icon).
- Public route `/portfolio` rendering all of the above with a premium layout (hero, skills grid, project cards, certificates wall, contact).
- Admin route `/admin/portfolio` with section-by-section editors and reordering.

Verification: portfolio renders nothing on empty DB; once admin fills sections, the page composes them; nothing is hardcoded.

---

## Section 11 — Visual Design Pass (SaaS-grade)

- Tokens: refine spacing scale, shadow tokens (`shadow-elegant`, `shadow-soft`), motion tokens, focus rings.
- Components: standardize Card hover/lift, Button variants (primary, secondary, ghost, premium-gradient), Skeleton primitives, EmptyState primitive.
- Micro-interactions via Motion (existing) on hero, dashboard cards, modal open.
- Mobile audit on `/`, `/dashboard`, `/admin`, `/courses/*`, viewers; fix any overflow / tap target / nav issues.
- Accessibility sweep: focus visible, labels, aria on icon-only buttons, color contrast in both themes.

Verification: side-by-side comparison against current state shows clear premium uplift; Lighthouse a11y ≥ 95; no console errors.

---

## Execution Order (so each step is shippable)

```text
Batch 1  Section 1 (Clean slate)            ← foundational, do first
Batch 2  Section 2 (Super Admin bootstrap)  ← unblocks ownership
Batch 3  Section 3 (Auth UX)
Batch 4  Section 4 (Theme system)           ← needed before navbar polish
Batch 5  Section 5 (Navbar + Profile)
Batch 6  Section 6 (Global search)
Batch 7  Section 7 (CMS: videos/announcements/assignments)
Batch 8  Section 8 (Homepage CMS editors)
Batch 9  Section 9 (Navigation integrity)
Batch 10 Section 10 (Portfolio)
Batch 11 Section 11 (Visual polish + final QA)
```

After each batch I'll run a quick QA pass (build, click-through, console) and report back before starting the next.

---

## Technical Details (for reference)

- New tables: `videos`, `announcements`, `homepage_faqs`, `portfolio_profile`, `portfolio_skills`, `portfolio_projects`, `portfolio_links`, `portfolio_certificates`, `portfolio_achievements`. All with `deleted_at`, `status`, `created_at`, `updated_at`, RLS + grants per project convention.
- New RPCs: `bootstrap_status()`, `bootstrap_super_admin(...)`, `global_search(q)`, `announcement_publish(id)` (fan-out to notifications).
- New routes: `/setup`, `/reset-password`, `/profile`, `/bookmarks`, `/settings`, `/help`, `/videos/$videoId`, `/portfolio`, `/admin/portfolio`, `/admin/videos`, `/admin/announcements`, `/admin/assignments`.
- Theme: token additions to `src/styles.css` (`.dark` block), `<ThemeProvider />` in `__root.tsx`, `<ThemeToggle />` component.
- Storage: reuse `media` bucket for avatars; reuse `assignments`/`submissions` buckets; add object-level RLS where missing.
- Security: every privileged server fn re-checks role via `has_role`; `bootstrap_super_admin` race-safe; sign-up cannot escalate.

---

## What I will NOT do

- No rewrite of working modules (auth core, notes/papers/quizzes flows, branding, parent-chain RLS).
- No demo/seed data inserted anywhere.
- No generic AI purple-on-white aesthetic — we keep the scholarly indigo + saffron identity, extended to dark mode.

---

**Please approve this plan (or tell me which batches to drop/reorder) and I'll start with Batch 1: Clean Slate.**
