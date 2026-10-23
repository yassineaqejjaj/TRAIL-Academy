-- DEVELOPMENT / DEMO ONLY. Never apply to production.
-- Synthetic structure so the player, quiz, assignment and completion flow can be exercised and shown locally.
-- Lesson titles come from the module syllabus; every body is a clearly marked placeholder. There is NO video and NO real course content:
-- the instructor's validated content comes in through the admin.
update courses set status = 'published' where code = 'M4';

with ch as (
  insert into chapters (course_id, title, position)
  select id, t.title, t.pos from courses, (values ('Fondamentaux du prompting', 1), ('Aller plus loin', 2)) as t(title, pos) where code = 'M4'
  returning id, course_id, position
)
insert into lessons (chapter_id, course_id, title, kind, position, content_status, body_md, required)
select ch.id, ch.course_id, t.title, 'reading', t.pos, 'published', '[CONTENU DE TEST] Texte de remplacement. Le contenu validé du formateur remplacera ce texte.', true
from ch join (values
  (1, 1, 'Structure et patterns de prompts'), (1, 2, 'Few-shot prompting'), (1, 3, 'Sorties structurées'),
  (2, 1, 'Appel d''outils'), (2, 2, 'Évaluation de prompts')
) as t(chap, pos, title) on t.chap = ch.position;

with q as (insert into quizzes (course_id, title, pass_percent) select id, 'Quiz du module', 70 from courses where code = 'M4' returning id),
     qq as (insert into quiz_questions (quiz_id, kind, prompt, feedback, position) select id, 'single_choice', '[TEST] Question à choix unique', 'Retour de test', 1 from q returning id),
     ft as (insert into quiz_questions (quiz_id, kind, prompt, feedback, position) select id, 'free_text', '[TEST] Question à réponse libre (relue par le formateur)', null, 2 from q returning id)
insert into quiz_options (question_id, label, is_correct, position) select id, o.label, o.ok, o.pos from qq, (values ('Bonne réponse (test)', true, 1), ('Mauvaise réponse (test)', false, 2)) as o(label, ok, pos);

insert into assignments (course_id, title, instructions_md, required)
select id, 'Livrable pratique', '[CONTENU DE TEST] Consignes de remplacement : décrivez en quelques lignes le prompt que vous avez conçu.', true from courses where code = 'M4';
