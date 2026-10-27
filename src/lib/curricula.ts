import type { Curriculum, Lang } from './types';

/** How each curriculum reports a percentage. */
export function gradeFor(c: Curriculum, pct: number, lang: Lang): { big: string; small: string } {
  const p = Math.round(pct);
  if (c === 'american') {
    const t: [number, string, string][] = [[93, 'A', '4.0'], [90, 'A-', '3.7'], [87, 'B+', '3.3'], [83, 'B', '3.0'], [80, 'B-', '2.7'], [77, 'C+', '2.3'], [70, 'C', '2.0'], [60, 'D', '1.0']];
    const g = t.find((x) => p >= x[0]) ?? [0, 'F', '0.0'];
    return { big: g[1], small: `GPA ${g[2]}` };
  }
  if (c === 'igcse') {
    const t: [number, string][] = [[90, '9'], [80, '8'], [70, '7'], [60, '6'], [50, '5'], [40, '4'], [30, '3'], [20, '2']];
    const g = t.find((x) => p >= x[0]) ?? [0, '1'];
    return { big: g[1], small: lang === 'ar' ? 'الدرجة 9–1 (تقديري)' : 'Grade 9–1 (estimated)' };
  }
  if (c === 'stem') {
    const g = p >= 85 ? ['Exceeds', 'يتجاوز'] : p >= 70 ? ['Meets', 'يحقق'] : p >= 50 ? ['Approaching', 'يقترب'] : ['Beginning', 'مبتدئ'];
    return { big: lang === 'ar' ? g[1] : g[0], small: lang === 'ar' ? 'مستوى المعايير' : 'Rubric level' };
  }
  const r = p >= 85 ? ['امتياز', 'Excellent'] : p >= 75 ? ['جيد جدًا', 'Very good'] : p >= 65 ? ['جيد', 'Good'] : p >= 50 ? ['مقبول', 'Pass'] : ['يحتاج دعم', 'Needs support'];
  return { big: `${p}/100`, small: lang === 'ar' ? r[0] : r[1] };
}

export const CURRICULA: Curriculum[] = ['american', 'igcse', 'stem', 'bac'];
export const pct = (score: number, max: number) => (max > 0 ? (Number(score) / Number(max)) * 100 : 0);
