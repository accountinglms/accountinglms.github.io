-- Original source bytes remain in the private content-imports bucket.
-- Only LMS members can read files referenced by a *published* source-fallback
-- lesson. Unpublished drafts remain editor-only under the existing policies.
CREATE POLICY allowed_member_read_published_lesson_sources
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id='content-imports'
  AND (SELECT private.is_allowed_user())
  AND EXISTS (
    SELECT 1 FROM public.lessons AS lesson
    WHERE lesson.status='published'
      AND lesson.content_json->>'source_fallback'='true'
      AND EXISTS (
        SELECT 1
        FROM jsonb_array_elements(
          CASE WHEN jsonb_typeof(lesson.content_json->'source_files')='array'
            THEN lesson.content_json->'source_files'
            ELSE '[]'::jsonb END
        ) AS file
        WHERE file->>'storagePath'=storage.objects.name
      )
  )
);
-- Retries and concurrent tabs cannot create duplicate published PDF lessons.
CREATE UNIQUE INDEX IF NOT EXISTS lessons_one_published_original_per_draft
ON public.lessons ((content_json->>'import_draft_id'))
WHERE status='published' AND content_json->>'source_fallback'='true'
  AND content_json->>'import_draft_id' IS NOT NULL;
