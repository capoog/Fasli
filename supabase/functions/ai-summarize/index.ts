// Turns a library material into a short revision sheet. Saved on the material for everyone in the class.
import { handler, need, classRole, HttpError } from '../_shared/http.ts';
import { ask, langName } from '../_shared/ai.ts';

Deno.serve(handler(async ({ userId, admin, body }) => {
  const { data: m } = await admin.from('materials').select('id, class_id, title, text_content, summary').eq('id', String(body.material_id ?? '')).maybeSingle();
  const mat = need(m, 'Material not found.');
  const role = await classRole(admin, userId, mat.class_id);
  if (mat.summary && !(role === 'teacher' && body.refresh)) return { summary: mat.summary };
  if (!mat.text_content) throw new HttpError(400, 'This material has no readable text yet.');
  const lang = body.language === 'en' ? 'en' : body.language === 'ar' ? 'ar' : (/[؀-ۿ]/.test(mat.text_content.slice(0, 2000)) ? 'ar' : 'en');
  const summary = await ask({
    turns: [{
      role: 'user',
      text: `Write a revision sheet for students from this lesson material, in ${langName(lang)}.
Include: the key ideas, definitions, rules or formulas, and one short worked example. Use short lines and simple words.
Use "•" for bullet points. No markdown headings or bold. Under 300 words.

MATERIAL (${mat.title}):
${mat.text_content.slice(0, 200000)}`,
    }],
    maxTokens: 2000,
  });
  await admin.from('materials').update({ summary }).eq('id', mat.id);
  return { summary };
}));
