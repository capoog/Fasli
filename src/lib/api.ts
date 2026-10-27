import { must, supabase } from './supabase';
import type { ClassRow, Exam, Profile, Submission } from './types';

const CLASS_COLS = 'id, school_id, teacher_id, name, subject, curriculum, grade_level, join_code, created_at';
export const EXAM_COLS = 'id, class_id, title, duration_min, status, created_at, published_at';
export const SUB_COLS = 'id, exam_id, student_id, status, started_at, submitted_at, score, max_score, ai_graded';

/** The classes this person works with, depending on their role. */
export async function myClasses(me: Profile): Promise<ClassRow[]> {
  if (me.role === 'teacher') {
    return must(await supabase.from('classes').select(CLASS_COLS).eq('teacher_id', me.id).order('created_at', { ascending: false })) as ClassRow[];
  }
  if (me.role === 'student') {
    const rows = must(await supabase.from('class_members').select(`classes(${CLASS_COLS})`).eq('student_id', me.id)) as unknown as { classes: ClassRow }[];
    return rows.map((r) => r.classes).filter(Boolean);
  }
  if (me.role === 'parent') {
    const kids = await myChildren(me);
    if (!kids.length) return [];
    const rows = must(await supabase.from('class_members').select(`classes(${CLASS_COLS})`).in('student_id', kids.map((k) => k.id))) as unknown as { classes: ClassRow }[];
    const seen = new Map<string, ClassRow>();
    rows.forEach((r) => r.classes && seen.set(r.classes.id, r.classes));
    return [...seen.values()];
  }
  return must(await supabase.from('classes').select(CLASS_COLS).eq('school_id', me.school_id ?? '').order('created_at', { ascending: false })) as ClassRow[];
}

export async function getClass(id: string): Promise<ClassRow> {
  return must(await supabase.from('classes').select(CLASS_COLS).eq('id', id).single()) as ClassRow;
}

export async function myChildren(me: Profile): Promise<Profile[]> {
  const rows = must(await supabase.from('parent_links').select('student_id').eq('parent_id', me.id)) as { student_id: string }[];
  if (!rows.length) return [];
  return must(await supabase.from('profiles').select('id, full_name, role, school_id, locale').in('id', rows.map((r) => r.student_id))) as Profile[];
}

export async function examsForClasses(classIds: string[]): Promise<Exam[]> {
  if (!classIds.length) return [];
  return must(await supabase.from('exams').select(EXAM_COLS).in('class_id', classIds).order('created_at', { ascending: false })) as Exam[];
}

export async function submissionsFor(studentIds: string[]): Promise<Submission[]> {
  if (!studentIds.length) return [];
  return must(await supabase.from('submissions').select(SUB_COLS).in('student_id', studentIds).order('started_at', { ascending: false })) as Submission[];
}

export async function profilesByIds(ids: string[]): Promise<Record<string, Profile>> {
  const uniq = [...new Set(ids)].filter(Boolean);
  if (!uniq.length) return {};
  const rows = must(await supabase.from('profiles').select('id, full_name, role, school_id, locale').in('id', uniq)) as Profile[];
  return Object.fromEntries(rows.map((p) => [p.id, p]));
}

export function friendlyError(msg: string, lang: 'ar' | 'en'): string {
  const m = msg.toLowerCase();
  const ar = lang === 'ar';
  if (m.includes('invalid code')) return ar ? 'الكود ده مش صحيح.' : 'That code is not valid.';
  if (m.includes('invalid login')) return ar ? 'الإيميل أو كلمة المرور غلط.' : 'Wrong email or password.';
  if (m.includes('already registered') || m.includes('already been registered')) return ar ? 'الإيميل ده عنده حساب بالفعل.' : 'This email already has an account.';
  if (m.includes('password should be')) return ar ? 'كلمة المرور قصيرة، خليها 8 حروف على الأقل.' : 'Password is too short. Use at least 8 characters.';
  if (m.includes('already in a school')) return ar ? 'حسابك متسجل في مدرسة بالفعل.' : 'Your account already belongs to a school.';
  if (m.includes('network') || m.includes('fetch')) return ar ? 'مفيش اتصال بالإنترنت.' : 'No internet connection.';
  return msg;
}
