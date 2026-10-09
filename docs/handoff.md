# ICAEW LMS handoff status

Repository: `accountinglms/accountinglms.github.io`

Production URL: `https://accountinglms.github.io/`

## Completed

- GitHub repository created and writable
- GitHub Pages enabled
- automatic deployment from `main`
- Supabase Auth redirected to GitHub Pages
- core quiz and cloud sync migrated
- 52 original Chapter 1 questions migrated to Supabase
- database marked authoritative for migrated exercises
- Admin CMS active
- Lessons reader active
- Gemini AI Import active
- AI source-context mismatch protection active
- content audit history active
- content snapshots/backups active
- non-destructive hide/show controls active
- Edge Function source tracked in GitHub

## Remaining before Floot retirement

1. [x] iPhone Diagnostics regression passed.
2. [x] Cross-device Sync Probe matched between desktop and iPhone.
3. [x] Cloud progress is visible on iPhone.
4. [x] AI Import extraction has succeeded, and a temporary database-driven publish/unpublish/duplicate-guard acceptance test passed with full cleanup.
5. [ ] Final iPad check if iPad is part of normal use.
6. [ ] Retire Floot only after explicit owner approval.

## Canonical URL cutover

- New canonical frontend: `https://accountinglms.github.io/`
- GitHub Pages deployment for the new organization repository is passing.
- PWA icons are present and cached by the service worker.
- Existing password login and refresh flows are origin-independent at the frontend; email confirmation redirects still depend on Supabase Auth URL configuration.
