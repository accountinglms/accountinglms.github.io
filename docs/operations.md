# ICAEW LMS Operations Guide

## Normal content workflow

1. Open `admin.html` while signed in as an editor.
2. Select the destination Subject → Chapter → Exercise.
3. Add content manually or use AI Import.
4. Review the content before publishing.
5. Publish only after the answer key and target exercise are correct.
6. Return to the learner page and smoke-test the item.

## AI Import

Supported v1 inputs:

- PNG / JPG / WEBP
- PDF
- TXT
- up to 4 MB per file

Flow:

`Upload → Gemini extraction → Draft → Human review → Publish`

The AI receives the selected Subject, Chapter and Exercise as context. If the source is clearly unrelated, it returns `SOURCE_CONTEXT_MISMATCH` and Admin disables publishing.

Gemini output should never be treated as an authoritative answer key when the source does not contain enough evidence. Low-confidence drafts require manual review.

## Course visibility

Do not delete course structure during normal operations.

Use Admin:

- **Ẩn môn / Hiện môn**
- **Ẩn chapter / Hiện chapter**
- **Ẩn exercise / Hiện exercise**

The learner catalog only loads rows with `is_active = true`.

## Questions

The original Chapter 1 bank has been migrated to Supabase and is authoritative:

- `c1_s1` — 28
- `c1_s2` — 15
- `c1_s3` — 9

New questions are appended in database order.

Changing a published question to Draft removes it from the online database-driven catalog. The legacy HTML bank is retained only as a fallback when CMS loading cannot complete.

## Audit history

`public.content_audit_log` records INSERT/UPDATE operations for:

- subjects
- chapters
- exercises
- lessons
- questions
- import_drafts

The Admin Activity & Safety panel shows the 30 most recent entries.

This is not a replacement for a database backup, but it provides a trace of what changed, when, and by which authenticated editor.

## Content snapshots

`public.content_snapshots` stores point-in-time JSON copies of:

- subjects
- chapters
- exercises
- lessons
- questions

An initial post-migration snapshot was created automatically.

Use **Backup nội dung** in Admin before a large content import or restructuring operation.

Snapshots are intentionally immutable from the normal browser workflow.

## Source control

Frontend and Edge Function source live in GitHub.

Important paths:

- `index.html`
- `admin.html`
- `lessons.html`
- `assets/`
- `supabase/functions/icaew-ai-import/index.ts`

Every push to `main` is published automatically by GitHub Pages.

## Recovery order

If a frontend change breaks the site:

1. Identify the last known-good GitHub commit.
2. Revert the offending commit.
3. Let GitHub Actions redeploy.

If content is changed incorrectly:

1. Check Admin Activity & Safety.
2. Identify the affected record and previous values.
3. Compare against the most recent content snapshot.
4. Restore only the affected content rather than replacing the whole database.

If Gemini fails:

1. Do not change or expose the API key in browser code.
2. Check Supabase Edge Function logs.
3. Temporary provider overloads are retried automatically.
4. If the configured Gemini model is retired, update the Edge Function model while retaining the same API key where supported.

## Secrets

Never commit:

- `GEMINI_API_KEY`
- Supabase secret/service-role keys
- user passwords
- access or refresh tokens

The browser may contain the Supabase publishable key; RLS is the security boundary for public client access.

## Cutover from Floot

Keep the old Floot production instance available until final regression testing is complete on:

- Windows/Desktop
- iPhone
- iPad if used

Only retire Floot after login, quiz flow, cloud progress sync, Admin, Lessons and AI Import all pass on the GitHub production URL.
