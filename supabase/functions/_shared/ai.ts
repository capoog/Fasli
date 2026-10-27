// One small adapter for the AI provider, chosen with the AI_PROVIDER secret:
//   gemini     → Google Gemini (has a free tier). Needs GEMINI_API_KEY. Optional GEMINI_MODEL.
//   anthropic  → Claude. Needs ANTHROPIC_API_KEY. Optional ANTHROPIC_MODEL.
import { encodeBase64 } from 'jsr:@std/encoding@1/base64';
import { HttpError } from './http.ts';

export type FilePart = { mime: string; bytes: Uint8Array };
export type Turn = { role: 'user' | 'assistant'; text: string; files?: FilePart[] };
export type AskOptions = { system?: string; turns: Turn[]; json?: boolean; maxTokens?: number };

const provider = () => (Deno.env.get('AI_PROVIDER') ?? 'gemini').toLowerCase();

export function aiConfigured(): boolean {
  return provider() === 'anthropic' ? !!Deno.env.get('ANTHROPIC_API_KEY') : !!Deno.env.get('GEMINI_API_KEY');
}

export async function ask(o: AskOptions): Promise<string> {
  if (!aiConfigured()) throw new HttpError(503, 'AI is not set up yet. Add the API key in Supabase secrets.');
  return provider() === 'anthropic' ? askClaude(o) : askGemini(o);
}

async function askGemini(o: AskOptions): Promise<string> {
  const model = Deno.env.get('GEMINI_MODEL') ?? 'gemini-2.5-flash';
  const body = {
    ...(o.system ? { systemInstruction: { parts: [{ text: o.system }] } } : {}),
    contents: o.turns.map((t) => ({
      role: t.role === 'assistant' ? 'model' : 'user',
      parts: [
        ...(t.files ?? []).map((f) => ({ inline_data: { mime_type: f.mime, data: encodeBase64(f.bytes) } })),
        { text: t.text },
      ],
    })),
    generationConfig: {
      maxOutputTokens: o.maxTokens ?? 8192,
      ...(o.json ? { responseMimeType: 'application/json' } : {}),
    },
  };
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': Deno.env.get('GEMINI_API_KEY')! },
    body: JSON.stringify(body),
  });
  const data = await r.json();
  if (!r.ok) {
    console.error('gemini', r.status, JSON.stringify(data).slice(0, 500));
    throw new HttpError(r.status === 429 ? 429 : 502, r.status === 429 ? 'AI is busy. Try again in a minute.' : 'AI request failed.');
  }
  const text = (data.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? '').join('');
  if (!text) throw new HttpError(502, 'AI returned an empty answer.');
  return text;
}

async function askClaude(o: AskOptions): Promise<string> {
  const model = Deno.env.get('ANTHROPIC_MODEL') ?? 'claude-sonnet-5-5';
  const messages = o.turns.map((t) => ({
    role: t.role,
    content: [
      ...(t.files ?? []).map((f) =>
        f.mime === 'application/pdf'
          ? { type: 'document', source: { type: 'base64', media_type: f.mime, data: encodeBase64(f.bytes) } }
          : { type: 'image', source: { type: 'base64', media_type: f.mime, data: encodeBase64(f.bytes) } },
      ),
      { type: 'text', text: t.text + (o.json && t === o.turns[o.turns.length - 1] ? '\n\nReply with only valid JSON.' : '') },
    ],
  }));
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({ model, max_tokens: o.maxTokens ?? 8192, ...(o.system ? { system: o.system } : {}), messages }),
  });
  const data = await r.json();
  if (!r.ok) {
    console.error('anthropic', r.status, JSON.stringify(data).slice(0, 500));
    throw new HttpError(r.status === 429 ? 429 : 502, r.status === 429 ? 'AI is busy. Try again in a minute.' : 'AI request failed.');
  }
  const text = (data.content ?? []).filter((b: { type: string }) => b.type === 'text').map((b: { text: string }) => b.text).join('');
  if (!text) throw new HttpError(502, 'AI returned an empty answer.');
  return text;
}

/** Reads JSON out of a model reply, tolerating code fences or a sentence around it. */
export function parseJSON<T = unknown>(text: string): T {
  const t = text.trim();
  try { return JSON.parse(t); } catch { /* fall through */ }
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) { try { return JSON.parse(fence[1]); } catch { /* fall through */ } }
  const start = Math.min(...['{', '['].map((c) => t.indexOf(c)).filter((i) => i >= 0));
  const end = Math.max(t.lastIndexOf('}'), t.lastIndexOf(']'));
  if (Number.isFinite(start) && end > start) return JSON.parse(t.slice(start, end + 1));
  throw new HttpError(502, 'AI reply was not valid JSON.');
}

export const langName = (l: string) => (l === 'ar' ? 'Arabic (clear, simple, suitable for Egyptian students)' : 'English');
