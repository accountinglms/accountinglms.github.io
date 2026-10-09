# ICAEW LMS Frontend Architecture

## Current learner runtime

The learner application is intentionally split into small static assets while GitHub Pages remains the production host:

```text
index.html
├── assets/learner.css
├── assets/theme-init.js
├── assets/learner-core.js
└── assets/cloud-sync.js
```

### Responsibilities

- `index.html` — semantic page shell and fixed UI controls only.
- `assets/learner.css` — learner layout, responsive rules, quiz states, light/dark theme styles.
- `assets/theme-init.js` — very small pre-render theme bootstrap.
- `assets/learner-core.js` — quiz engine, local progress state, navigation, scoring, database-catalog adapter, accessibility behavior.
- `assets/cloud-sync.js` — Supabase Auth, role lookup, database catalog loading, cross-device progress/preferences sync and service-worker registration.

The previous `assets/lms-patch.js` monkey-patch layer has been removed. Final quiz behavior is implemented directly in the learner core and cloud data layer.

## Data flow

```text
GitHub Pages learner shell
        │
        ├── bundled question bank (offline fallback only)
        │
        └── authenticated Supabase catalog
                ├── subjects
                ├── chapters
                ├── exercises
                └── published questions
```

When an authenticated database catalog is available it becomes authoritative for exercises with `content_mode = database`. The bundled Chapter 1 bank remains only as a fallback for offline/network failure.

## Quiz flow

A complete selected answer is saved immediately as a draft and counts as answered for navigation/progress.

- **Kiểm tra đáp án** is optional and gives immediate feedback.
- Users can move between questions without checking each one.
- The final action is **Nộp bài & chấm tất cả**.
- Complete drafts are graded at submission.
- Incomplete questions remain unanswered.
- Blue navigation state means an answer is saved but not yet graded.

## Production safety

- Frontend changes go through a branch + pull request.
- CI checks file integrity, public-source secret leaks, JavaScript syntax, Edge Function typecheck and static smoke tests.
- The service worker caches the modular learner assets.
- Database content is rendered as safe text rather than injected directly into HTML.

## Refactor stop point

This document marks the end of the requested frontend refactor phase.

The visual redesign (including the approved Van Gogh-inspired homepage and subject-cover redesign) is intentionally **not started here** and requires a separate owner instruction.
