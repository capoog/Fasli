import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Bar, Card, Chip, Empty, ErrorText, ListItem, Row, Screen, Stat, Txt } from '@/components/ui';
import { SubStatusPill } from '@/features/common';
import { LinkChildCard } from '@/features/home/ParentHome';
import { EXAM_COLS, myChildren, submissionsFor } from '@/lib/api';
import { useMe } from '@/lib/auth';
import { gradeFor, pct } from '@/lib/curricula';
import { useT } from '@/lib/i18n';
import { must, supabase } from '@/lib/supabase';
import type { ClassRow, Exam } from '@/lib/types';
import { useData } from '@/lib/useData';

/** Results for a student, or for a parent's children. */
export default function Grades() {
  const me = useMe();
  const { t, lang } = useT();
  const router = useRouter();
  const [child, setChild] = useState<string | null>(null);
  const { data, error, refreshing, refresh, reload } = useData(async () => {
    const kids = me.role === 'parent' ? await myChildren(me) : [];
    const ids = me.role === 'parent' ? kids.map((k) => k.id) : [me.id];
    const subs = (await submissionsFor(ids)).filter((s) => s.status === 'graded' || s.status === 'approved');
    const exams = subs.length ? must(await supabase.from('exams').select(EXAM_COLS).in('id', [...new Set(subs.map((s) => s.exam_id))])) as Exam[] : [];
    const classIds = [...new Set(exams.map((e) => e.class_id))];
    const classes = classIds.length ? must(await supabase.from('classes').select('id, name, subject, curriculum').in('id', classIds)) as ClassRow[] : [];
    return { kids, subs, exams: Object.fromEntries(exams.map((e) => [e.id, e])), classes: Object.fromEntries(classes.map((x) => [x.id, x])) };
  });

  const who = child ?? data?.kids[0]?.id ?? me.id;
  const subs = (data?.subs ?? []).filter((s) => s.student_id === who);
  const avg = subs.length ? Math.round(subs.reduce((a, s) => a + pct(s.score, s.max_score), 0) / subs.length) : null;
  const perClass = new Map<string, number[]>();
  subs.forEach((s) => { const cid = data?.exams[s.exam_id]?.class_id; if (cid) perClass.set(cid, [...(perClass.get(cid) ?? []), pct(s.score, s.max_score)]); });

  return (
    <Screen title={t('progress')} refreshing={refreshing} onRefresh={refresh}>
      <ErrorText error={error} />
      {me.role === 'parent' && (data?.kids.length ?? 0) > 1 && (
        <Row gap={8} wrap>{data!.kids.map((k) => <Chip key={k.id} label={k.full_name} on={k.id === who} onPress={() => setChild(k.id)} />)}</Row>
      )}
      {me.role === 'parent' && data && !data.kids.length && <LinkChildCard onDone={reload} />}
      <Row gap={10} wrap>
        <Stat value={avg != null ? `${avg}%` : '—'} label={t('average')} />
        <Stat value={String(subs.length)} label={t('examsTaken')} />
      </Row>
      {perClass.size > 0 && (
        <Card>
          <Txt v="h2">{t('classes')}</Txt>
          {[...perClass.entries()].map(([cid, ps]) => <Bar key={cid} label={data?.classes[cid]?.subject || data?.classes[cid]?.name || ''} value={ps.reduce((a, b) => a + b, 0) / ps.length} />)}
        </Card>
      )}
      <Card>
        <Txt v="h2">{t('recentResults')}</Txt>
        {subs.length ? subs.map((s, i) => {
          const ex = data?.exams[s.exam_id];
          const cls = ex ? data?.classes[ex.class_id] : undefined;
          const g = cls ? gradeFor(cls.curriculum, pct(s.score, s.max_score), lang) : null;
          return (
            <ListItem key={s.id} first={i === 0} title={ex?.title ?? '—'} subtitle={`${cls?.name ?? ''} · ${s.score}/${s.max_score}${g ? ` · ${g.big}` : ''}`}
              right={<SubStatusPill s={s} />} onPress={() => router.push(`/submission/${s.id}`)} />
          );
        }) : <Empty icon="chart" text={t('noResults')} />}
      </Card>
    </Screen>
  );
}
