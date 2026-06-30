# BCA Gurukul

A production-grade, enterprise Learning Management System for BCA (Bachelor of Computer Applications) students — built as a single-developer SaaS on TanStack Start, React 19, Supabase, and PostgreSQL.

> Scholarly + modern. Multi-course (Course → Semester → Subject → Unit). 100% no-code editable from the Super Admin CMS.

---

## ✨ Highlights

- **Multi-tier academic hierarchy** — Course → Semester → Subject → Unit, with Notes, PYQs, and Quizzes attached at any level.
- **Three-way authentication** — Email + password, phone OTP, and Google OAuth, all unified through a single onboarding flow.
- **Role-based access** — `student`, `instructor`, `admin`, `super_admin` stored in a separate `user_roles` table with a `has_role()` security-definer function. No privilege-escalation surface.
- **Enterprise CMS** — VS Code-style content explorer, drag-free hierarchical CRUD, homepage section builder, branding manager, SEO manager, developer-portfolio CMS, contact inbox.
- **Super Admin control plane** — Users & roles, audit log, feature flags, branding & theme, SEO — every action recorded.
- **Secure grading** — Quiz answers and correctness are computed server-side via Postgres RPC; clients never see correct options.
- **Ranked global search** — Postgres full-text search with weighted titles, exact-match boosts, and a ⌘K palette.
- **Progress & bookmarks** — Per-user reading progress, bookmarks, and a streak system.
- **PDF viewer, note views, paper downloads, quiz attempts** — first-class analytics for everything students touch.
- **Maintenance mode, feature flags, kill-switches** — operate the platform without redeploys.
- **Server-side everything** — TanStack `createServerFn` with Supabase auth middleware; no business logic in the browser.
- **SEO + social** — per-route metadata, Open Graph, Twitter cards, JSON-LD ready, OG image baked in.
- **Mobile-first, dark-mode-ready, design-token-driven** — never a hardcoded color in component code.

---

## 🧱 Tech Stack

| Layer | Choice |
|---|---|
| Framework | **TanStack Start v1** (React 19, SSR + server functions) |
| Build | **Vite 7** |
| Routing | **TanStack Router** (file-based, type-safe) |
| Data | **TanStack Query v5** |
| Forms | **React Hook Form + Zod** |
| Styling | **Tailwind CSS v4** + semantic design tokens (`src/styles.css`) |
| Components | **shadcn/ui** + Lucide icons |
| Database | **PostgreSQL** (Supabase) — RLS, triggers, RPC, FTS |
| Auth & Storage | **Supabase Auth** (email/OTP/Google), **Supabase Storage** |
| Server | TanStack server functions on Cloudflare Workers (edge) |
| Typography | **Fraunces** (display) + **Inter** (body) |

---

## 🚀 Getting started

```bash
# 1. Install
bun install

# 2. Configure env (auto-populated when connected to Lovable / Supabase)
cp .env.example .env
#   VITE_SUPABASE_URL
#   VITE_SUPABASE_PUBLISHABLE_KEY
#   SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SERVICE_ROLE_KEY (server)

# 3. Run
bun run dev          # http://localhost:8080
bun run build        # production build
```

### First-time setup

1. Visit `/setup` and create the first super admin (one-time bootstrap).
2. Sign in at `/auth`.
3. Open `/admin` → **Courses** to seed your academic tree.
4. Open `/admin/homepage` to build the landing page.
5. Open `/admin/superadmin/branding` to set logo, colors, and typography.

---

## 🗂️ Project structure

```
src/
├─ routes/                        # File-based routing (TanStack Router)
│  ├─ __root.tsx                  # Root layout, head/meta, providers
│  ├─ index.tsx                   # Landing page (CMS-driven)
│  ├─ auth.tsx, setup.tsx         # Auth + first-time bootstrap
│  ├─ developer.tsx               # Developer portfolio
│  ├─ _authenticated/             # Gated routes (redirects to /auth)
│  │  ├─ dashboard.tsx            # Student dashboard
│  │  ├─ search.tsx               # Ranked global search
│  │  ├─ notes/, papers/, quizzes/
│  │  └─ admin/                   # Admin CMS
│  │     ├─ explorer.tsx          # VS Code-style content explorer
│  │     ├─ courses, notes, papers, quizzes, media, tags
│  │     ├─ homepage, developer, inbox
│  │     └─ superadmin/           # Super-admin-only control plane
│  │        ├─ users, audit, flags
│  │        └─ branding, seo
│  └─ api/                        # Public HTTP routes (webhooks, cron)
├─ lib/                           # *.functions.ts → createServerFn
├─ components/                    # shadcn/ui + product components
├─ hooks/                         # use-auth, use-roles, ...
├─ integrations/supabase/         # Generated client + auth middleware
└─ styles.css                     # Tailwind v4 + semantic tokens

supabase/migrations/              # All schema changes (managed)
```

---

## 🔐 Security model

- **Roles in a separate table.** `public.user_roles(user_id, role)` with `app_role` enum. Roles are checked via `public.has_role(_user_id, _role)` — a `SECURITY DEFINER` function — never via client-side flags.
- **Row Level Security on every public table.** Every `CREATE TABLE` migration ships with explicit `GRANT` + `ENABLE RLS` + `CREATE POLICY`.
- **Server-graded quizzes.** Correct options never leave the server. Attempts are scored by `grade_quiz_attempt()` RPC.
- **Audit log.** Privileged actions (`role.grant`, `role.revoke`, `flag.update`, …) are written to `audit_logs` and viewable at `/admin/superadmin/audit`.
- **Session management.** `user_sessions` tracks device, IP, last-seen, and revocation state.
- **Rate limiting.** `rate_limits` table enforces per-action throttles on sensitive RPCs.
- **No secrets in the browser.** Service-role key lives only inside server functions, loaded inside handler bodies.

---

## 🛠️ Super Admin powers

Reachable from `/admin/superadmin`:

| Module | What you can do |
|---|---|
| **Users & Roles** | Search every user, see their roles, grant/revoke admin / instructor / super admin. |
| **Audit Log** | Filter by action, see actor email, IP, entity, metadata. |
| **Feature Flags** | Per-module enable, rollout %, kill switch. |
| **Branding & Theme** | Site name, logo, primary/accent colors, fonts, radius, maintenance mode. |
| **SEO Manager** | Per-route titles, descriptions, OG, robots. |
| **Homepage Builder** | Order, hide, and edit landing-page sections without touching code. |
| **Developer CMS** | Portfolio profile, projects, skills, achievements, social links. |
| **Inbox** | Contact-form messages with split-pane list/detail. |
| **Explorer** | Hierarchical Course → Semester → Subject → Unit CRUD. |

---

## 🧭 Routes cheat sheet

| Path | Audience |
|---|---|
| `/` | Public — landing |
| `/developer` | Public — developer portfolio |
| `/auth`, `/setup` | Public — sign in / bootstrap |
| `/dashboard`, `/search`, `/notes/*`, `/papers/*`, `/quizzes/*` | Authenticated students |
| `/onboarding` | First sign-in flow |
| `/admin/*` | `admin` or `super_admin` |
| `/admin/superadmin/*` | `super_admin` only |

---

## 🧪 Quality gates

```bash
bun x tsgo --noEmit     # Strict TypeScript
bun run build           # Production build (must pass)
bunx vitest run         # Unit tests (where present)
```

The repo also ships a Playwright workflow for browser-driven verification (see internal docs).

---

## 📦 Deployment

- Edge runtime: **Cloudflare Workers** (via TanStack Start adapter).
- Database & auth: **Supabase**.
- Migrations live in `supabase/migrations/` and run via the Supabase migration tool.
- Stable URLs for cron/webhooks: `project--<id>.lovable.app` (prod) and `project--<id>-dev.lovable.app` (preview).

---

## 🧑‍💻 Developer

Maintained by the developer profile visible at `/developer` (editable from `/admin/developer`). The site doubles as a portfolio and a working production reference for a single-dev SaaS LMS.

---

## 📜 License

Proprietary — © BCA Gurukul. All rights reserved.
