# Accounting LMS — Engineering quality and operations

Last reviewed: 2026-10-09. This is an **internal operating checklist**, not a claim of certification.

## Free-only change policy
- Keep using the existing GitHub Pages and Supabase project.
- Do not create additional Supabase projects/branches or enable paid plans/features without explicit approval.
- Prefer existing browser/CI tools and local SQL transaction tests (BEGIN/ROLLBACK).
- Do not store Supabase service-role keys or account passwords in the public repository.

## Test gates
1. Run `node scripts/ci-check.mjs` and syntax checks.
2. Run `node tests/score-model.test.mjs`.
3. Run Playwright Chromium/WebKit suites in GitHub Actions including attempt history, account isolation, and 125-message chat pagination.
4. Confirm GitHub Pages deployed the **same commit** as the tested code.
5. Check Home, Quiz, History, Community, Progress, calculator and sign-in on phone/tablet/desktop.
6. For schema changes, inspect Supabase Security and Performance Advisors and exercise RLS with authenticated role in rollback transactions.

## Metrics: non-negotiable rules
- Quiz exam-style percentage = `score / total_questions * 100`; unanswered count toward denominator.
- Answered accuracy = `correct_count / (correct_count + wrong_count) * 100`; must NEVER substitute for exam-style percentage.
- A practice score is not an official ICAEW exam result. LMS readiness is a heuristic, **not** a predicted pass probability.
- Mark pass threshold separately from LMS buffer and adapt to the corresponding syllabus/exam type.
- Time estimates are rules of thumb, not calibrated learning predictions.

## Privacy and data separation
- Browser progress/UI preferences and offline attempt queue must be account-scoped.
- Before upload, verify queued attempt's owner matches the authenticated user.
- Do not automatically import old unscoped browser data into another account. Existing local legacy keys are left untouched for manual, authenticated recovery.
- Chat files must stay in the private `chat-files` Storage bucket.
- Chat group official status and owner permissions must be enforced server-side, not only by hidden buttons.
- Never expose member email or authentication tokens via messages, public logs or client error reports.

## Operations and incident checklist
- Before deploy: check CI results and changed migrations; capture the current production commit.
- After deploy: verify login, a new quiz attempt, History, announcements, sending a chat message, and Realtime status.
- If deployment fails: revert the application commit; **DB rollback must be planned separately** (Git rollback does not revert schema/data).
- If synchronization fails: preserve pending data; do not clear localStorage or the browser cache blindly. Record the affected account, exercise and run ID privately.
- If group permission bypass is suspected: temporarily disable affected group actions or restrict group membership at server level, then review RLS and trigger logs.
- Existing in-database content snapshots are **not** full disaster-recovery backups. Check export/restore options allowed by the free plan; maintain safe encrypted offline exports for authorized admins when practical.
- Agree on retention/deletion/export procedures for personal data before onboarding strangers or monetizing.

## Access and hosting manual checks
These operations require GitHub/Supabase administrator access and cannot be enforced by the app code alone:
1. Protect the `main` branch with a GitHub ruleset requiring a PR, reviews and passing CI. Check free-plan availability for the repository.
2. Enable Supabase leaked-password detection **only if available at zero additional cost**; otherwise strengthen password policy/MFA and document the residual risk.
3. Configure recovery contacts, MFA for administrator accounts, and audit authentication redirect allowlists.
4. Define backup restoration and incident escalation owners.

## Expansion gates
Until the P0 issues are resolved, do not claim certified exam simulation or a reliable pass forecast. Before inviting hundreds of members, obtain representative load measurements and moderation controls. Before advertising internationally, arrange independent security review, usability testing, syllabus/content licensing validation, and privacy/legal review. External audits may cost money, so are **not scheduled or purchased** by this project.

## Remaining limits
- No antivirus scanning of user uploads is provisioned. MIME limits and private Storage do not replace malware scanning or moderation.
- Full push notifications when the website is closed and large-community moderation require separate implementation.
- The current learning model uses heuristic weights and has not been calibrated against real ICAEW examination outcomes.
- Database high availability, guaranteed backups and professional monitoring are not promised under the free-only requirement.
