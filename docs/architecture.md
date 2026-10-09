# ICAEW LMS architecture

```text
GitHub
├── Repository (source of truth)
└── GitHub Pages
       │
       ▼
Production site
├── index.html        Quiz LMS / PWA
├── admin.html        Admin CMS
└── lessons.html      Theory reader
       │
       ▼
Supabase
├── Auth
├── Postgres
│   ├── subjects
│   ├── chapters
│   ├── exercises
│   ├── questions
│   ├── lessons
│   ├── user_progress
│   ├── user_preferences
│   ├── content_sources
│   ├── import_drafts
│   ├── content_audit_log
│   ├── content_snapshots
│   └── content_translations
├── Storage
│   └── content-imports (private)
└── Edge Functions
    ├── icaew-ai-import
    └── icaew-translate
           │
           ▼
      Google Gemini API
```

GitHub owns source control and deployment. Supabase owns authenticated data, storage, audit history, backups and protected backend execution. Gemini only creates drafts; Admin review is required before content is published.

The original Chapter 1 exercises use `content_mode = database`, so Supabase is authoritative when the CMS catalog loads successfully. The V7.5 hardcoded bank remains only as an offline/network fallback.

Floot is not part of the active runtime architecture. Keep the old deployment available only until final cross-device regression testing passes.


## Universal translation layer

Question, lesson/theory and future document-text readers use the same protected translation service.

```text
Published content
      │
      ├── Question
      ├── Lesson / Theory
      └── Document text
              ↓
      User presses Translate
              ↓
      assets/common.js
              ↓
      icaew-translate
              ↓
      content_translations cache
              ↓
      Gemini only on cache miss
```

Translation is lazy/on-demand. Publishing new content does not call AI automatically. New Questions and Lessons inherit translation support because the feature is attached to the shared quiz/theory readers rather than to individual records or chapters.
