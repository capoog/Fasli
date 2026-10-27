// Reads an uploaded book, PDF, photo or text file and stores its text so AI can build questions from it.
import { handler, need, assertTeacher, HttpError } from '../_shared/http.ts';
import { ask } from '../_shared/ai.ts';

Deno.serve(handler(async ({ userId, admin, body }) => {
  const id = String(body.material_id ?? '');
  const { data: m } = await admin.from('materials').select('id, class_id, kind, storage_path, mime_type, title').eq('id', id).maybeSingle();
  const mat = need(m, 'Material not found.');
  await assertTeacher(admin, userId, mat.class_id);
  if (!mat.storage_path) return { status: 'ready' };

  try {
    const { data: file, error } = await admin.storage.from('materials').download(mat.storage_path);
    if (error || !file) throw new HttpError(404, 'File not found in storage.');
    const bytes = new Uint8Array(await file.arrayBuffer());
    let text: string;
    if (mat.kind === 'text') {
      text = new TextDecoder().decode(bytes);
    } else {
      const mime = mat.mime_type || (mat.kind === 'pdf' ? 'application/pdf' : 'image/jpeg');
      text = await ask({
        turns: [{
          role: 'user',
          files: [{ mime, bytes }],
          text: 'This is school course material (a textbook, worksheet, lesson notes or a photo of a page). ' +
            'Transcribe all of its educational content as plain text in its original language. Keep headings, ' +
            'definitions, rules, formulas (write them in plain text, e.g. x^2, H2O), worked examples and exercises. ' +
            'Skip page numbers, headers and decorations. Output only the transcription.',
        }],
        maxTokens: 32000,
      });
    }
    text = text.slice(0, 400000);
    await admin.from('materials').update({ text_content: text, status: 'ready' }).eq('id', id);
    return { status: 'ready', words: text.split(/\s+/).filter(Boolean).length };
  } catch (e) {
    await admin.from('materials').update({ status: 'failed' }).eq('id', id);
    throw e;
  }
}));
