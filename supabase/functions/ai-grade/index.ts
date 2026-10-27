// Marks the written answers of one submission against each question's rubric. Objective questions
// were already marked in the database by submit_exam(). The teacher reviews and approves afterwards.
import { handler, need, HttpError, CURRICULA } from '../_shared/http.ts';
import { ask, parseJSON, aiConfigured, langName } from '../_shared/ai.ts';

type Mark = { n: string; max: number; got: number; note: string };

Deno.serve(handler(async ({ userId, admin, body }) => {
  const id = String(body.submission_id ?? '');
  const { data: s } = await admin.from('submissions').select('id, exam_id, student_id, status').eq('id', id).maybeSingle();
  const sub = need(s, 'Submission not found.');
  const { data: e } = await admin.from('exams').select('class_id, title').eq('id', sub.exam_id).maybeSingle();
  const exam = need(e);
  const { data: c } = await admin.from('classes').select('teacher_id, curriculum, subject').eq('id', exam.class_id).maybeSingle();
  const cls = need(c);
  const isTeacher = cls.teacher_id === userId;
  if (!isTeacher && sub.student_id !== userId) throw new HttpError(403, 'Not allowed.');
  if (sub.status === 'in_progress') throw new HttpError(400, 'Submit the exam first.');
  if (sub.status !== 'grading' && !(isTeacher && body.regrade)) return { status: sub.status };

  const { data: profile } = await admin.from('profiles').select('locale').eq('id', sub.student_id).maybeSingle();
  const lang = profile?.locale ?? 'ar';
  const { data: qs } = await admin.from('questions').select('id, prompt, rubric, points').eq('exam_id', sub.exam_id).eq('type', 'written');
  const { data: ans } = await admin.from('answers').select('question_id, response').eq('submission_id', id);
  const byQ = new Map((ans ?? []).map((a) => [a.question_id, a.response]));

  let aiUsed = false;
  for (const q of qs ?? []) {
    const rubric: { n: string; max: number }[] = Array.isArray(q.rubric) && q.rubric.length ? q.rubric : [{ n: 'Answer', max: Number(q.points) }];
    const response = String(byQ.get(q.id) ?? '').trim();
    let marks: Mark[];
    if (!response) {
      marks = rubric.map((r) => ({ ...r, got: 0, note: lang === 'ar' ? 'لا توجد إجابة.' : 'No answer given.' }));
    } else if (aiConfigured()) {
      try {
        const reply = parseJSON<{ n?: string; got?: number; note?: string }[]>(await ask({
          json: true,
          turns: [{
            role: 'user',
            text: `You are an experienced examiner for a ${CURRICULA[cls.curriculum]} class (${cls.subject}).
Mark the student's answer strictly against the rubric, the way a fair real examiner for this curriculum would. Give partial credit only where the rubric allows it.
Question: ${q.prompt}
Rubric: ${JSON.stringify(rubric)}
Student answer: """${response.slice(0, 6000)}"""
Return a JSON array with one object per rubric criterion, in the same order: {"n": the criterion name exactly as given, "got": integer between 0 and max, "note": one short, kind, specific sentence of feedback for the student in ${langName(lang)}}.`,
          }],
        }));
        marks = rubric.map((r, i) => {
          const o = reply[i] ?? {};
          return { n: r.n, max: r.max, got: Math.max(0, Math.min(r.max, Math.round(Number(o.got) || 0))), note: String(o.note ?? '') };
        });
        aiUsed = true;
      } catch (err) {
        console.error('grade failed', err);
        marks = rubric.map((r) => ({ ...r, got: 0, note: lang === 'ar' ? 'بانتظار تصحيح المدرس.' : 'Waiting for the teacher to mark.' }));
      }
    } else {
      marks = rubric.map((r) => ({ ...r, got: 0, note: lang === 'ar' ? 'بانتظار تصحيح المدرس.' : 'Waiting for the teacher to mark.' }));
    }
    const points = marks.reduce((a, m) => a + m.got, 0);
    await admin.from('answers').update({ marks, ai_marks: aiUsed ? marks : [], points }).eq('submission_id', id).eq('question_id', q.id);
  }

  const { data: all } = await admin.from('answers').select('points').eq('submission_id', id);
  const score = (all ?? []).reduce((a, r) => a + Number(r.points), 0);
  await admin.from('submissions').update({ status: 'graded', score, ai_graded: aiUsed }).eq('id', id);
  return { status: 'graded', score, ai: aiUsed };
}));
