// Builds exam questions from the teacher's library materials (or a topic) in the style of the class curriculum.
import { handler, assertTeacher, need, HttpError, CURRICULA } from '../_shared/http.ts';
import { ask, parseJSON } from '../_shared/ai.ts';

type Q = { type: string; prompt: string; options?: string[]; answer?: unknown; points?: number; tag?: string; rubric?: { n: string; max: number }[] };

Deno.serve(handler(async ({ userId, admin, body }) => {
  const classId = String(body.class_id ?? '');
  await assertTeacher(admin, userId, classId);
  const { data: c } = await admin.from('classes').select('name, subject, curriculum, grade_level').eq('id', classId).maybeSingle();
  const cls = need(c, 'Class not found.');

  const count = Math.min(Math.max(Number(body.count) || 5, 1), 20);
  const topic = String(body.topic ?? '').slice(0, 300);
  const language = body.language === 'ar' ? 'Arabic' : body.language === 'en' ? 'English' : (cls.curriculum === 'bac' ? 'Arabic' : 'English');
  const difficulty = ['easy', 'medium', 'hard', 'mixed'].includes(String(body.difficulty)) ? String(body.difficulty) : 'mixed';
  const types = Array.isArray(body.types) && body.types.length ? (body.types as string[]) : ['mcq', 'tf', 'num', 'written'];
  const ids = Array.isArray(body.material_ids) ? (body.material_ids as string[]).slice(0, 10) : [];

  let sources = '';
  if (ids.length) {
    const { data: mats } = await admin.from('materials').select('title, text_content').in('id', ids).eq('class_id', classId);
    const per = Math.floor(300000 / Math.max(1, mats?.length ?? 1));
    sources = (mats ?? []).filter((m) => m.text_content).map((m) => `--- SOURCE: ${m.title} ---\n${m.text_content.slice(0, per)}`).join('\n\n');
    if (!sources) throw new HttpError(400, 'The selected materials have no readable text yet.');
  }
  if (!sources && !topic) throw new HttpError(400, 'Choose a material or write a topic.');

  const prompt = `Write ${count} exam questions for a ${CURRICULA[cls.curriculum]} class.
Class: ${cls.name}. Subject: ${cls.subject || cls.name}. Grade: ${cls.grade_level || 'not specified'}.
${topic ? `Topic/focus: ${topic}.` : ''}
Difficulty: ${difficulty}. Write every question in ${language}. Match the real style, wording and difficulty of this curriculum's exams.
Allowed types: ${types.join(', ')} (mcq = multiple choice with 4 options, tf = true/false, num = single numeric answer, written = open answer marked with a rubric).
${sources ? `Base every question strictly on the source material below. Do not test anything it does not cover.\n\n${sources}\n\n--- END OF SOURCES ---` : ''}

Return a JSON array. Each item:
{"type":"mcq"|"tf"|"num"|"written","prompt":string,"tag":short syllabus code or lesson name,"points":integer,
 "options":[4 strings] (mcq only),
 "answer": mcq → the exact text of the correct option; tf → true or false; num → a number; written → null,
 "rubric":[{"n":criterion,"max":integer}] (written only; the maxes add up to points)}`;

  const raw = parseJSON<Q[] | { questions: Q[] }>(await ask({ turns: [{ role: 'user', text: prompt }], json: true }));
  const list = Array.isArray(raw) ? raw : raw.questions ?? [];
  const questions = list.map((q) => {
    const type = String(q.type);
    const out: Q = { type, prompt: String(q.prompt ?? '').trim(), tag: String(q.tag ?? ''), points: Math.max(1, Math.round(Number(q.points) || 1)) };
    if (!out.prompt) return null;
    if (type === 'mcq') {
      out.options = (q.options ?? []).map(String).slice(0, 6);
      out.answer = String(q.answer);
      if (out.options.length < 2 || !out.options.includes(out.answer as string)) return null;
    } else if (type === 'tf') {
      out.answer = q.answer === true || q.answer === 'true';
    } else if (type === 'num') {
      out.answer = Number(q.answer);
      if (!Number.isFinite(out.answer)) return null;
    } else if (type === 'written') {
      out.rubric = (q.rubric ?? []).map((r) => ({ n: String(r.n), max: Math.max(1, Math.round(Number(r.max) || 1)) }));
      if (!out.rubric.length) out.rubric = [{ n: language === 'Arabic' ? 'الإجابة كاملة وصحيحة' : 'Complete, correct answer', max: out.points! }];
      out.points = out.rubric.reduce((a, r) => a + r.max, 0);
      out.answer = null;
    } else return null;
    return out;
  }).filter(Boolean);

  if (!questions.length) throw new HttpError(502, 'AI could not build questions. Try again or change the topic.');
  return { questions };
}));
