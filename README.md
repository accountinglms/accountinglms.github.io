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
- [x] Supabase Auth Site URL switched to `https://accountinglms.github.io/`
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

## LMS brand icon v46 (2026-10-10)

The approved white-cloud mascot with its **LMS** speech bubble is the canonical LMS icon.
Browser favicons (16/32/ICO), Apple touch (180) and PWA icons (192/512) are produced from the same approved artwork.
All pages declare favicon links; the service-worker cache is versioned v46 to refresh offline assets.
In-browser tabs, the portal header and installed PWAs use these local icons with no third-party dependency.

## Community social upgrade v47 (2026-10-10)

The Community portal now has three tabs: Groups, Direct messages and Friends.
Friends are request/accept based; private rooms use Supabase row-level security, with two members only.
The Supabase SQL migrations `social_friends_and_direct_chat_v47`, `direct_voice_calls_beta_v47`,
`grant_voice_call_rls_helper_v47` and `safe_voice_start_rpc_v47` are applied to production.
Group creation is now an authenticated server-side RPC instead of direct browser insertion.
Private attachments reuse `chat-files` storage and inherit group-based access checks.
Safe image formats can be previewed inline. Voice calls use WebRTC (beta, STUN-only, no TURN fallback):
network conditions may prevent the peer-to-peer connection. No audio is recorded/stored by the app.


## Community 2.0 — v48 (2026-10-10)

Improved Vietnamese typography and multi-device chat layout; grouped, scrollable emoji picker, stickers, in-room message search, message replies/edits, typing indicators and DM read receipts. Member profiles with name, bio and avatar colour, reporting and blocking; drag/drop and clipboard image attachments, notification tray. WebRTC video/audio remain beta and use STUN only, so TURN is required for production reliability. Messages and private files remain protected by Supabase RLS. Database migrations: `community_2_experience_security_v48` and `community_2_media_reports_replies_v48`.

## Mobile navigation v49 (2026-10-10)

Accounting LMS member pages (`home.html`, `community.html`, `progress.html`) share a revised navigation design. Desktop/tablet uses labeled, accessible SVG links; on phones the header keeps branding and profile/notifications while a five-item bottom tab bar provides large touch targets and visible labels. The mobile tab bar sits outside the blur-filtered header to avoid fixed-position clipping on iOS. The Community conversation viewport, drawer, composer and call panel reserve tab/safe-area space. `portal-navigation.css` is cached under the v49 PWA service worker. Browser E2E asserts mobile (320/375/390/430) and tablet (820) navigation labels, hit boxes, and placement.

## Community mobile refinement and member avatars v50 (2026-10-10)

Header buttons use 44px hit targets and 22px SVGs, with a mobile overflow menu for calls and group details. Messages, image previews and composer spacing have been redesigned; all member pages share private profile avatars. Members can choose device photos, crop/zoom on a 400px canvas, upload compressed WebP/JPEG to the `profile-avatars` *private* Supabase Storage bucket, and reset to initials. Profiles store `avatar_path`; only the authenticated user's own folder is writable, and only authenticated LMS members may fetch stored avatars. Crop/uploads are limited to 3 MB, storage objects have immutable UUID filenames. Database migration `member_private_photo_avatars_v50` was applied. Avatar changes are displayed across Home, Community, Progress and Account on refresh; Community also refreshes when profiles update.
