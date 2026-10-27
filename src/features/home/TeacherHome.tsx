import { useRouter } from 'expo-router';
import { Avatar, Button, Card, ErrorText, ListItem, Pill, Row, Screen, Stat, Txt } from '@/components/ui';
import { ClassBadge, HomeHeader, SectionTitle, SessionStatus, useFmt } from '@/features/common';
import { examsForClasses, myClasses, profilesByIds, SUB_COLS } from '@/lib/api';
import { useMe } from '@/lib/auth';
import { useT } from '@/lib/i18n';
import { must, supabase } from '@/lib/supabase';
import type { Session, Submission } from '@/lib/types';
import { useData } from '@/lib/useData';

export function TeacherHome() {
  const me = useMe();
  const { t } = useT();
  const router = useRouter();
  const fmt = useFmt();
  const { data, error, refreshing, refresh } = useData(async () => {
    const classes = await myClasses(me);
    const ids = classes.map((x) => x.id);
    if (!ids.length) return { classes, students: 0, sessions: [] as Session[], review: [] as Submission[], names: {}, examTitles: {} as Record<string, string> };
    const [exams, sessions, students] = await Promise.all([
      examsForClasses(ids),
      must(await supabase.from('live_sessions').select('id, class_id, title, starts_at, status, notes').in('class_id', ids).neq('status', 'ended').order('starts_at').limit(8)) as Session[],
      (await supabase.from('class_members').select('student_id', { count: 'exact', head: true }).in('class_id', ids)).count ?? 0,
    ]);
    const examIds = exams.map((e) => e.id);
    const review = examIds.length ? must(await supabase.from('submissions').select(SUB_COLS).in('exam_id', examIds).in('status', ['graded', 'grading']).order('submitted_at', { ascending: false }).limit(20)) as Submission[] : [];
    const names = await profilesByIds(review.map((r) => r.student_id));
    return { classes, students, sessions, review, names, examTitles: Object.fromEntries(exams.map((e) => [e.id, e.title])) };
  });
  const byClass = new Map((data?.classes ?? []).map((x) => [x.id, x]));

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <HomeHeader eyebrow={t('teacher')} />
      <ErrorText error={error} />
      <Row gap={10} wrap>
        <Stat value={String(data?.classes.length ?? '—')} label={t('classes')} />
        <Stat value={String(data?.students ?? '—')} label={t('people')} />
        <Stat value={String(data?.review.length ?? '—')} label={t('needReview')} />
      </Row>

      {data && !data.classes.length && (
        <Card tone="dashed">
          <Txt v="h3">{t('newClass')}</Txt>
          <Txt muted>{t('noClassesT')}</Txt>
          <Button title={t('newClass')} icon="plus" onPress={() => router.push('/classes')} />
        </Card>
      )}

      {!!data?.sessions.length && (
        <Card>
          <SectionTitle title={t('live')} />
          {data.sessions.map((s, i) => (
            <ListItem key={s.id} first={i === 0} title={s.title} subtitle={`${byClass.get(s.class_id)?.name ?? ''} · ${fmt.dateTime(s.starts_at)}`}
              left={byClass.get(s.class_id) ? <ClassBadge cls={byClass.get(s.class_id)!} /> : undefined}
              right={s.status === 'live' ? <Button small kind="pen" title={t('open')} onPress={() => router.push(`/live/${s.id}`)} /> : <SessionStatus s={s} />}
              onPress={() => router.push(`/live/${s.id}`)} />
          ))}
        </Card>
      )}

      {!!data?.review.length && (
        <Card>
          <SectionTitle title={t('needReview')} right={<Pill tone="warn" text={String(data.review.length)} />} />
          {data.review.slice(0, 8).map((s, i) => (
            <ListItem key={s.id} first={i === 0} title={(data.names as Record<string, { full_name: string }>)[s.student_id]?.full_name ?? '—'}
              subtitle={`${data.examTitles[s.exam_id] ?? ''} · ${s.score}/${s.max_score}`}
              left={<Avatar name={(data.names as Record<string, { full_name: string }>)[s.student_id]?.full_name ?? '?'} id={s.student_id} />}
              right={<Pill tone={s.status === 'grading' ? 'brand' : 'warn'} text={s.status === 'grading' ? t('grading') : t('edit')} />}
              onPress={() => router.push(`/submission/${s.id}`)} />
          ))}
        </Card>
      )}

      {!!data?.classes.length && (
        <Card>
          <SectionTitle title={t('myClasses')} right={<Button small kind="ghost" icon="plus" title={t('newExam')} onPress={() => router.push(`/exam/new?class=${data.classes[0].id}`)} />} />
          {data.classes.map((x, i) => (
            <ListItem key={x.id} first={i === 0} title={x.name} subtitle={`${x.subject} · ${t('classCode')}: ${x.join_code}`} left={<ClassBadge cls={x} />} onPress={() => router.push(`/class/${x.id}`)} />
          ))}
        </Card>
      )}
    </Screen>
  );
}
