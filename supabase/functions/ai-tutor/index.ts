// The student's study coach. Grounded in the class library and the student's recent results.
import { handler, classRole, HttpError, CURRICULA } from '../_shared/http.ts';
import { ask, langName, type Turn } from '../_shared/ai.ts';

Deno.serve(handler(async ({ userId, admin, body }) => {
  const classId = String(body.class_id ?? '');
  const message = String(body.message ?? '').trim().slice(0, 4000);
  if (!message) throw new HttpError(400, 'Write a message.');
  await classRole(admin, userId, classId);

  const [{ data: cls }, { data: me }, { data: mats }, { data: history }, { data: subs }] = await Promise.all([
    admin.from('classes').select('name, subject, curriculum, grade_level').eq('id', classId).single(),
    admin.from('profiles').select('full_name, locale').eq('id', userId).single(),
    admin.from('materials').select('title, summary, text_content').eq('class_id', classId).eq('status', 'ready').order('created_at', { ascending: false }).limit(8),
    admin.from('tutor_messages').select('role, content').eq('user_id', userId).eq('class_id', classId).order('created_at', { ascending: false }).limit(16),
    admin.from('submissions').select('score, max_score, exams!inner(title, class_id)').eq('student_id', userId).eq('exams.class_id', classId).in('status', ['graded', 'approved']).limit(5),
  ]);

  const lang = body.language === 'en' || body.language === 'ar' ? String(body.language) : me?.locale ?? 'ar';
  const per = Math.floor(60000 / Math.max(1, mats?.length ?? 1));
  const library = (mats ?? []).map((m) => `--- ${m.title} ---\n${(m.summary || m.text_content).slice(0, per)}`).join('\n\n');
  const results = (subs ?? []).map((s) => {
    const ex = s.exams as unknown as { title: string };
    return `${ex.title}: ${s.score}/${s.max_score}`;
  }).join('; ');

  const system = `You are Fasli Tutor, a patient, encouraging study coach for ${me?.full_name || 'a student'} in a ${CURRICULA[cls!.curriculum]} class: ${cls!.name} (${cls!.subject}).
Reply in ${langName(lang)}. Keep curriculum terms in the language the course uses.
Teach step by step, keep replies under 180 words, and end with one short question that checks understanding.
When the student asks for homework or exam answers, guide them with hints and the method first instead of giving the final answer straight away.
Use plain text (no markdown headings). Stay on school topics.
${results ? `Recent results: ${results}.` : ''}
${library ? `Teach from the teacher's course materials when relevant:\n${library}` : ''}`;

  const turns: Turn[] = [...(history ?? []).reverse().map((h) => ({ role: h.role as 'user' | 'assistant', text: h.content })), { role: 'user', text: message }];
  while (turns.length && turns[0].role !== 'user') turns.shift();
  const reply = await ask({ system, turns, maxTokens: 1500 });

  await admin.from('tutor_messages').insert([
    { user_id: userId, class_id: classId, role: 'user', content: message },
    { user_id: userId, class_id: classId, role: 'assistant', content: reply },
  ]);
  return { reply };
}));
