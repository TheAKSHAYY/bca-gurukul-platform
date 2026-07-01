# Production MCQ System — Build Plan

This is a large scope. Existing project already has `quizzes`, `quiz_questions`, `quiz_options`, `quiz_attempts`, `quiz_attempt_answers`, `bookmarks`, and the Course→Semester→Subject→Unit tree. I'll **extend** that, not replace it, and ship in phases so each is usable end-to-end.

## Approach

- Reuse `quizzes` table as "Tests". Add missing columns (negative_marking, randomize, schedule, public/private, passing_marks).
- Reuse `quiz_questions` + `quiz_options` for the question bank. Add: difficulty, marks, negative_marks, tags, year, exam_name, image_url, university.
- Add new tables only where existing ones don't fit: `question_reports`, `wrong_questions` (view), `daily_quiz`, `leaderboard_snapshots`, `student_stats` (materialized).
- Extend `bookmarks` (already exists) to cover questions.
- Server-side scoring already exists (`submit_quiz_attempt` RPC) — extend for negative marking, skipped tracking, and resume.

## Phased Delivery

### Phase 1 — Data model + admin bulk tools  (foundation)
- Migration: add columns to `quiz_questions` (difficulty, marks, negative_marks, tags text[], year, exam_name, university, image_url).
- Migration: add columns to `quizzes` (negative_marking, randomize_questions, randomize_options, is_public, start_date, end_date, passing_marks).
- New table: `question_reports` (user_id, question_id, reason, status).
- New table: `daily_quiz` (date unique, question_id).
- Extend `submit_quiz_attempt` RPC: negative marking, skipped count, resume support.
- Admin: **Bulk MCQ paste/import** (paste 20 questions in a textbox → parse → preview → import). CSV import.
- Admin: question editor with image upload, difficulty, tags, explanation, year, exam.

### Phase 2 — Student practice mode
- `/practice` route: pick Subject → Unit → filters (difficulty, count, timed/untimed, random).
- Question UI: bookmark, report, palette, timer, prev/next, dark mode already supported.
- Instant feedback mode (show correct + explanation after each answer).
- Wrong-question auto-save (derived view over `quiz_attempt_answers`).

### Phase 3 — Mock test mode
- `/tests` list: filter by subject, semester, public/scheduled.
- Real exam UI: fullscreen, autosave to `quiz_attempts.answers_draft`, resume, submit-confirm, auto-submit on timeout.
- Result page: score, %, accuracy, time, topic breakdown, strong/weak areas, retake, share, PDF download (client-side via `jspdf`).

### Phase 4 — PYQs + Search + Bookmarks
- `/pyqs` filtered browser (year, exam, university, subject, unit).
- Global question search with FTS index on question text + tags.
- `/bookmarks/questions` — practice from bookmarks only.
- `/wrong-questions` — retry only previously wrong ones.

### Phase 5 — Analytics + Leaderboard
- Student dashboard widgets: solved, accuracy, streak (already), avg score, weekly progress chart, weak subjects.
- `/leaderboard` — weekly / monthly / all-time via SQL views.
- Admin analytics: hardest questions, lowest-accuracy topics, most-active students, completion rate. Charts with Recharts.

### Phase 6 — Gamification + Daily Quiz
- Daily Quiz card on dashboard.
- Achievements table + badges (streak, 100 solved, first perfect score).
- XP / level system derived from attempts.

## Technical Details

**Reuse over rebuild.** Don't create parallel `subjects`, `units`, `questions`, `tests`, `attempts`, `answers` tables — the project already has them under different names. Duplicating would fork the whole app.

**RLS pattern (already in place):**
- Students: read published quizzes/questions; write own attempts/answers/bookmarks/reports.
- Admins: full CRUD via `has_role(auth.uid(), 'admin')`.

**Scoring stays server-side** (`submit_quiz_attempt` RPC). Client never sees `is_correct` for unsubmitted attempts (already enforced via `get_quiz_options` RPC).

**Bulk paste parser** — accepts formats like:
```
Q: What is 2+2?
A) 3
B) 4 *
C) 5
D) 6
E: Basic arithmetic.
```
The `*` marks correct answer. Parse client-side, preview table, insert in one transaction.

**Folder structure:**
```
src/routes/_authenticated/
  practice.tsx, practice.$subjectId.tsx
  tests.index.tsx, tests.$testId.tsx, tests.$testId.result.tsx
  pyqs.tsx, leaderboard.tsx, wrong-questions.tsx
  admin/questions.tsx, admin/questions.import.tsx, admin/test-builder.tsx
src/components/mcq/
  question-card.tsx, question-palette.tsx, exam-timer.tsx,
  result-summary.tsx, difficulty-badge.tsx, bulk-paste-parser.tsx
src/lib/mcq/
  scoring.ts, parser.ts, analytics.functions.ts
```

## Estimated Scope

~20 files per phase, ~6 migrations total, ~4-6 phases. Full build is roughly a week of dedicated work in one shot. Each phase is independently shippable.

## Question for You

1. **Start with Phase 1** (bulk import + expanded question editor) so you can actually upload MCQs faster right now? That's what your last message was about.
2. Or start with a different phase?
3. Any features to drop (e.g., PDF result, leaderboard, gamification) to keep scope tight?

Reply with the phase order you want and I'll start.
