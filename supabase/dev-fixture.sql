-- DEVELOPMENT / TEST ONLY. Never apply to production.
-- Synthetic placeholders so the player, quiz, assignment and completion flow can be exercised locally.
-- This is NOT course content and contains no video. Real content comes from the instructor via admin.
update courses set status = 'published' where code = 'M4';

with ch as (insert into chapters (course_id, title, position) select id, '[TEST] Chapitre', 1 from courses where code = 'M4' returning id, course_id)
insert into lessons (chapter_id, course_id, title, kind, position, content_status, body_md, required)
select ch.id, ch.course_id, t.title, 'reading', t.pos, 'published', '[CONTENU DE TEST] Texte de remplacement. Remplacez par le contenu validé du formateur.', true
from ch, (values ('[TEST] Leçon 1', 1), ('[TEST] Leçon 2', 2)) as t(title, pos);

with q as (insert into quizzes (course_id, title, pass_percent) select id, '[TEST] Quiz', 70 from courses where code = 'M4' returning id),
     qq as (insert into quiz_questions (quiz_id, kind, prompt, feedback, position) select id, 'single_choice', '[TEST] Question à choix unique', 'Retour de test', 1 from q returning id)
insert into quiz_options (question_id, label, is_correct, position) select id, o.label, o.ok, o.pos from qq, (values ('Bonne réponse (test)', true, 1), ('Mauvaise réponse (test)', false, 2)) as o(label, ok, pos);

insert into assignments (course_id, title, instructions_md, required) select id, '[TEST] Livrable', '[CONTENU DE TEST] Consignes de remplacement.', true from courses where code = 'M4';
