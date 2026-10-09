# Universal Translation Layer

## Goal

Translation is a platform capability, not a per-question or per-chapter customization.

Adding or editing content through Admin should not require a code change for translation support.

## Supported content types

- `question`
- `lesson`
- `theory`
- `document`

The current user-facing integrations are:

- Quiz → question stem + options/statements.
- Theory Library → lesson title + summary + content.
- Files imported as Questions or Lessons inherit the same translation behavior after publication.

The shared client already accepts `document` segments, so a future raw-document reader can use the same backend/cache without creating another AI service.

## Direction

The source language remains authoritative. UI detects common EN/VI source text and offers the opposite target:

- EN → VI
- VI → EN

Translated content is always a temporary view. The source database record is never overwritten.

## Lazy translation

AI is invoked only after an explicit user action.

```text
Open content
  ↓
Show original
  ↓
User presses Translate
  ↓
Memory cache?
  ├─ yes → show
  └─ no
       ↓
Universal Edge Function
       ↓
Shared DB cache?
       ├─ yes → show
       └─ no → Gemini → validate → cache → show
```

## Cache invalidation

Cache identity includes the source segments and target language. Editing a question, option, lesson title, summary or body changes the source hash. The next translation request therefore generates a fresh translation automatically.

No manual cache purge is needed when normal content is edited.

## Accounting terminology

The translation prompt requires conservative terminology aligned with IFRS, IAS, ICAEW and accounting/finance disciplines. It preserves numbers, formulas, currencies, standard names and technical distinctions.

For assessment questions the service never receives the correct answer or explanation and is explicitly prohibited from answering, ranking, eliminating or hinting at options.

## Long content

The browser client splits long content into bounded segments/batches before calling the Edge Function and reassembles the translated result. This lets the same API support ordinary lessons and longer document text without changing the backend contract.

## Security

- JWT required.
- LMS database access role required.
- MFA/AAL state is respected through `get_my_access`.
- Output shape is validated.
- Translated learner content is rendered as text, not arbitrary HTML.
- Translation data is cached in `public.content_translations` under RLS.
