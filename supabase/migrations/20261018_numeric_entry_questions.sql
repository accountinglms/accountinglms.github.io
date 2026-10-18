-- Allow short numeric-entry questions with multiple named answer fields.
-- options stores exact answer-field labels; correct_answer is a JSON number array.
ALTER TABLE public.questions DROP CONSTRAINT IF EXISTS questions_question_type_check;
ALTER TABLE public.questions ADD CONSTRAINT questions_question_type_check CHECK (question_type = ANY (ARRAY['single'::text,'multiple'::text,'tf'::text,'numeric'::text]));
