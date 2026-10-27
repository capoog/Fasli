import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

export const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export type Ctx = { userId: string; db: SupabaseClient; admin: SupabaseClient; body: Record<string, unknown> };

/** Wraps a handler with CORS, auth and error handling. `db` acts as the caller (RLS applies); `admin` bypasses RLS. */
export function handler(fn: (ctx: Ctx) => Promise<unknown>) {
  return async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
    if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
    try {
      const url = Deno.env.get('SUPABASE_URL')!;
      const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
      const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const auth = req.headers.get('Authorization') ?? '';
      const db = createClient(url, anon, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
      const { data, error } = await db.auth.getUser(auth.replace(/^Bearer\s+/i, ''));
      if (error || !data.user) throw new HttpError(401, 'Sign in again.');
      const admin = createClient(url, service, { auth: { persistSession: false } });
      const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
      return json(await fn({ userId: data.user.id, db, admin, body }));
    } catch (e) {
      const status = e instanceof HttpError ? e.status : 500;
      console.error(e);
      return json({ error: e instanceof Error ? e.message : String(e) }, status);
    }
  };
}

export function need<T>(v: T | null | undefined, msg = 'Not found', status = 404): T {
  if (v === null || v === undefined) throw new HttpError(status, msg);
  return v;
}

/** Throws unless the caller teaches the class. */
export async function assertTeacher(admin: SupabaseClient, userId: string, classId: string) {
  const { data } = await admin.from('classes').select('id').eq('id', classId).eq('teacher_id', userId).maybeSingle();
  if (!data) throw new HttpError(403, 'Only the class teacher can do this.');
}

/** Returns 'teacher' | 'student' for someone in the class, or throws. */
export async function classRole(admin: SupabaseClient, userId: string, classId: string): Promise<'teacher' | 'student'> {
  const { data: c } = await admin.from('classes').select('teacher_id').eq('id', classId).maybeSingle();
  if (!c) throw new HttpError(404, 'Class not found.');
  if (c.teacher_id === userId) return 'teacher';
  const { data: m } = await admin.from('class_members').select('student_id').eq('class_id', classId).eq('student_id', userId).maybeSingle();
  if (!m) throw new HttpError(403, 'You are not in this class.');
  return 'student';
}

export const CURRICULA: Record<string, string> = {
  american: 'American Diploma (Common Core / SAT / AP style)',
  igcse: 'Cambridge / Edexcel IGCSE (mark-scheme style: M marks for method, A marks for accuracy, B marks independent)',
  stem: 'Egyptian STEM schools (capstone projects, applied problem solving, rubric levels)',
  bac: 'Egyptian Baccalaureate (Arabic-medium, ministry exam style)',
};
