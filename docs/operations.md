# ICAEW LMS Operations Guide

## Normal content workflow

1. Open `admin.html` while signed in as an editor.
2. Select the destination Subject → Chapter → Exercise.
3. Add content manually or use AI Import.
4. Review the content before publishing.
5. Publish only after the answer key and target exercise are correct.
6. Return to the learner page and smoke-test the item.

## AI Import

Supported inputs:

- PNG / JPG / WEBP
- PDF
- TXT
- select 1–20 files together, up to 4 MB per file and 12 MB in total

Flow:

`Upload → Save source and draft → Gemini extraction → Human review → Publish`

The import request does not enable Google Search: that tool is unavailable on the project's Gemini 3.5 Flash-Lite free API tier. Extraction still handles images, PDF and TXT. Generated explanations and standard references require review; the server never labels an ungrounded response `verified`.

All selected files are sent together in one extraction request and produce one combined draft. The numbered file list allows reordering before saving. Gemini can join a question continued on the next image and read an answer key from a later file. The server requires a complete `processed_files` list and validates each question's source file numbers; a truncated response fails explicitly instead of saving a partial result. For very long question banks, split the input into smaller groups.

Each file has its own `content_sources` row. The draft's `payload.files` manifest retains all Storage paths and source IDs; `source_id` is the first source for compatibility with older drafts. Published questions point to the file where they start and retain every contributing source in `metadata.source_ids`. Lessons retain the entire source list in `content_json.source_ids`. Publishing preserves the draft's manifest and destination.

Upload progress is saved after each file. If a later upload fails, reopen the draft and choose only the missing files with their original names and sizes; files already saved are reused. AI stays disabled while a missing file is unavailable. Every source download requires the editor session, and the server checks ownership, file signatures and individual/aggregate size limits before calling Gemini. Old single-file drafts still reopen normally.

If Gemini returns quota error 429, the draft and source remain saved. Retry uses the same storage object and draft. Admin shows the provider's retry delay when supplied and does not automatically retry daily quotas. Open **Bản nháp đã lưu → Tiếp tục** after reloading the page. **Lưu bản nháp không dùng AI** and **Nhập thủ công** work without Gemini; manual items retain the source link. **Tải tệp nguồn** requires the editor's session.

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

