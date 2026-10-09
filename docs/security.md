# ICAEW LMS Security Baseline

## Security boundary

The browser is not trusted. Authorization is enforced in Supabase:

- `private.allowed_users` decides who may use the LMS.
- `private.editor_users` decides who may manage content.
- `private.is_allowed_user()` and `private.is_editor()` are used by RLS.
- `public.get_my_access()` is a SECURITY INVOKER wrapper around a private SECURITY DEFINER helper and exposes only the current user's coarse access flags.
- User progress and preferences remain scoped to `auth.uid()`.

The Supabase publishable key is intentionally public. Service-role keys, AI provider secrets, passwords and refresh tokens must never be committed to GitHub.

## Frontend hardening

Production pages use a Content Security Policy that restricts network access to the LMS origin and Supabase and blocks plugins/foreign base URLs.

Database question text, options, T/F statements and explanations are rendered as safe text instead of being injected directly into `innerHTML`.

The current legacy learner page still requires `'unsafe-inline'` for scripts because the quiz engine is monolithic. Removing that exception is a goal of the frontend refactor.

## AI Import

`icaew-ai-import`:

- requires a valid JWT;
- verifies editor access through database-backed roles;
- accepts only the production GitHub Pages origin in browsers;
- requires source paths to belong to the authenticated user;
- limits files to 4 MB;
- verifies actual PNG/JPEG/WEBP/PDF/TXT signatures instead of trusting browser MIME alone;
- treats uploaded documents as untrusted data;
- validates AI output structure before returning a draft;
- requires human review before publication.

## Retired infrastructure

The old Supabase frontend-hosting functions are retired and require JWT before returning a 410 response.

The old `app_assets` table has been removed.

The old `icaew-lms` Storage bucket is private and has no client policy. Its historical static files may be deleted manually later; they are no longer part of the runtime.

## Current accepted warnings

Supabase may report:

1. **RLS enabled, no policy** for `private.allowed_users` and `private.editor_users`.
   This is intentional: browser clients must not query these tables directly.

2. **Leaked password protection disabled**.
   This can be enabled if the account/plan makes it available. It is recommended but is not the authorization boundary for this two-owner LMS.

3. **Unused indexes**.
   The database is currently very small; indexes should not be removed solely because the advisor has not observed them being used yet.

## Remaining hardening work

- migrate the legacy learner shell to modular frontend code;
- remove inline scripts/handlers and tighten CSP further;
- replace browser-local refresh-token storage if/when a server-session architecture is introduced;
- add MFA for owner accounts if available;
- add durable AI/API rate limiting before wider user rollout;
- enable branch protection in GitHub settings when available.
