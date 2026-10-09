# ICAEW LMS

Production LMS migrated from Floot to GitHub Pages + Supabase.

## Production

Canonical production URL: https://accountinglms.github.io/

- LMS: https://accountinglms.github.io/
- Admin: https://accountinglms.github.io/admin.html
- Lessons: https://accountinglms.github.io/lessons.html

## Architecture

- **GitHub** — source control and change history
- **GitHub Pages** — automatic frontend deployment from the `main` branch
- **Supabase Auth** — authenticated access
- **Supabase Postgres** — course catalog, questions, lessons, progress, preferences, audit history and content snapshots
- **Supabase Storage** — private source files uploaded for AI import
- **Supabase Edge Functions** — protected AI import backend
- **Google Gemini API** — document/image extraction for AI Import Studio

## Main routes

- `/` — Quiz LMS
- `/admin.html` — Admin CMS
- `/lessons.html` — Theory/Lessons reader

## Current content source

The original 52 Chapter 1 questions have been migrated into Supabase:

- Practice Questions: 28
- Self-test Questions: 15
- User Question Bank: 9

These exercises use `content_mode = database`, so Supabase is authoritative when online. The legacy hardcoded bank remains in the frontend only as a network/offline fallback.

## Admin safety

- Publishing/unpublishing a question requires confirmation.
- Subjects, chapters and exercises can be hidden instead of deleted.
- Content INSERT/UPDATE activity is recorded in `content_audit_log`.
- Manual content backups are stored in `content_snapshots`.
- AI Import blocks publishing when the uploaded source clearly mismatches the selected Subject/Chapter/Exercise.

## AI Import

The Admin frontend invokes the protected Supabase Edge Function:

`icaew-ai-import`

Production secrets belong in Supabase Edge Function Secrets, never in GitHub.

Required secret:

`GEMINI_API_KEY`

The function retries temporary Gemini overload responses before returning an error.

## Security

- The Supabase publishable key in browser source is intentionally public and is constrained by Row Level Security.
- Never commit Gemini API keys, Supabase secret/service-role keys, passwords or refresh tokens.
- Content-management writes are restricted to editor accounts through Supabase RLS.
- Private allowlist/editor tables are not directly available to browser clients.

## Deployment

Every push to `main` is published automatically by GitHub Pages.

## Migration status

- [x] GitHub repository created
- [x] GitHub Pages enabled
- [x] Supabase Auth URL moved to GitHub Pages
- [x] Core V7.5 quiz migrated
- [x] 52 legacy questions migrated to Supabase
- [x] Database-driven course loading
- [x] Faster quiz flow and cloud sync preserved
- [x] Admin CMS
- [x] Lessons reader
- [x] Gemini AI Import
- [x] AI source-context guard
- [x] Content audit history
- [x] Content snapshots/backups
- [x] Hide/show controls for course structure
- [x] PWA manifest + service worker
- [x] iPhone cross-device regression test
- [ ] Final iPad check if used, then retire Floot only with owner approval

See `docs/operations.md` for operating and recovery procedures.
