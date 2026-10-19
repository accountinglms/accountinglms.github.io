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

Before uploading, Admin keeps the selected file bytes, order, destination and progress in account-scoped IndexedDB. **Bản nháp đã lưu → Khôi phục** restores a selection interrupted before its first cloud draft; **Tiếp tục** restores the remaining local files in a partially uploaded cloud draft. Completed cloud files are reused. Only files unavailable both locally and remotely require re-selection. This local recovery works in the same browser profile; clearing website data or browser eviction can remove it. If local storage is denied/full, Admin reports that fact and still allows uploading and publishing.

Upload paths and source/draft IDs are allocated before sending and retained for retries. An existing object is accepted only after its bytes match the original; it is never overwritten. Lost database responses are reconciled by ID with an owner-scoped read. Successful AI output awaiting a database save is also checkpointed, preventing an unnecessary second AI call after reload. Locally cached AI output is discarded once the server acknowledges it. Local source bytes are released only after their cloud manifest is acknowledged. Every source download still requires the editor session. Old single-file drafts continue to work.

If Gemini returns quota error 429, the draft and source remain saved. Retry uses the same storage object and draft. Admin shows the provider's retry delay when supplied and does not automatically retry daily quotas. Open **Bản nháp đã lưu → Tiếp tục** after reloading the page. **Lưu bản nháp không dùng AI** and **Nhập thủ công** work without Gemini; manual items retain the source link. **Tải tệp nguồn** requires the editor's session.

The AI receives the selected Subject, Chapter and Exercise as context. `SOURCE_CONTEXT_MISMATCH` is an advisory warning; the editor's confirmed destination and choice to publish remain authoritative. **Xuất bản tệp gốc ngay** saves the sources and publishes a linked reading lesson without requesting AI or external verification. A working connection is needed to finish the cloud save/publication.

Gemini output is not an authoritative answer key when the source lacks evidence. Review flags remain visible without blocking publication; missing answer keys remain ungraded.

## Course visibility

Use hide/show for temporary visibility changes. The two course owners can remove unwanted structure with recoverable deletion.

Use Admin:

- **Ẩn môn / Hiện môn**
- **Ẩn chapter / Hiện chapter**
- **Ẩn exercise / Hiện exercise**

To remove a duplicate, select its exact destination in **Nơi lưu nội dung**, expand **Cấu trúc khóa học**, then use **Xoá môn học / Xoá chương / Xoá bài tập**. Check the confirmation path, creation date and question/lesson counts, particularly when two titles match. Cancel leaves the item unchanged.

**Mục đã xoá → Khôi phục** reverses removal. Restore a deleted parent first. Descendants, import sources/drafts, progress and attempt history stay intact; a previously hidden item remains hidden after restore. Deletion/restore generates the normal content audit event. Ownership is tied to the two verified Auth identities in `private.content_owners`, not merely to the editor role. RPCs and direct writes enforce ownership, live sessions and MFA on the server.

The learner catalog only loads rows with `is_active = true` and `deleted_at IS NULL`. An intentionally empty online or cached catalog clears the legacy fallback as well. Devices using an older offline catalog will see the change after their next successful catalog refresh.

Creating the same normalized title under the same parent reuses the existing node. The database serializes matching inserts and rejects duplicates created concurrently on different devices.

## Questions

The original Chapter 1 bank has been migrated to Supabase and is authoritative:

- `c1_s1` — 28
- `c1_s2` — 15
- `c1_s3` — 9

New questions are appended in database order.

Changing a published question to Draft removes it from the online database-driven catalog. The legacy HTML bank is retained only as a fallback when CMS loading cannot complete.

### Numeric Entry and attempt grading (v76)

Numeric questions store one label and one numeric answer per box. Admin's manual form and import review expose the question's unit, comparison mode, decimal places, rounding method and absolute tolerance. The default compares values rounded to two decimal places, with ties rounded away from zero. Exact and absolute-tolerance comparisons are also available. Every box must match for the question to count as correct; there is no partial credit.

A missing or invalid answer key or numeric policy leaves the answer **Chưa chấm**. Those questions are excluded from the score denominator; unanswered questions with a usable key remain in it. An entirely ungradable attempt displays **Chưa có điểm**, and is excluded from score averages and charts. These checks do not block publishing.

Each new attempt preserves the entered values, labels, answer key, grading policy and grading version in its snapshot. History displays each numeric box separately, including partially completed input. Later content edits and submission retries do not rewrite a saved attempt. Legacy scores and statuses remain as recorded.

Deploy `20261018232728_numeric_attempt_grading.sql` before the v76 frontend. It adds `ungraded_count` and nullable `gradable_questions`, retains the existing RPC arguments and RLS, and supports old cached clients and queued submissions. It does not recalculate historical scores. Frontend rollback can leave this compatible migration in place.

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

# Publish recovery v77 (2026-10-19)

- Gemini HTTP 200 responses without usable text are retried once. Filtered and truncated responses have separate error codes and are never retried as empty output. Sources and drafts remain available.
- Publishing saved originals works independently of AI, restores an existing hidden lesson, and recovers a committed insertion after a lost response without creating duplicates.
- Confirmed publication is retained even if draft status synchronization or an unrelated admin refresh fails. The page distinguishes these follow-up errors from failed publication.
- Published originals appear in the chapter's **Tài liệu** area, with an immediate **Mở để học** link in Import Studio. They do not add interactive quiz questions.

