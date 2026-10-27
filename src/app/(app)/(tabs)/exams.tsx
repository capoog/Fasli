import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { Icon } from '@/components/Icon';
import { Button, Card, Empty, ErrorText, ListItem, Pill, Screen } from '@/components/ui';
import { ExamStatusPill, SubStatusPill } from '@/features/common';
import { examsForClasses, myClasses, submissionsFor } from '@/lib/api';
import { useMe } from '@/lib/auth';
import { useT } from '@/lib/i18n';
import { must, supabase } from '@/lib/supabase';
import { useColors } from '@/lib/theme';
import { useData } from '@/lib/useData';

export default function Exams() {
  const me = useMe();
  const { t } = useT();
  const c = useColors();
  const router = useRouter();
  const { data, error, refreshing, refresh } = useData(async () => {
    const classes = await myClasses(me);
    const exams = await examsForClasses(classes.map((x) => x.id));
    const subs = me.role === 'student' ? await submissionsFor([me.id]) : [];
    let pending: Record<string, number> = {};
    if (me.role === 'teacher' && exams.length) {
      const rows = must(await supabase.from('submissions').select('exam_id').in('exam_id', exams.map((e) => e.id)).in('status', ['graded', 'grading'])) as { exam_id: string }[];
      pending = rows.reduce<Record<string, number>>((a, r) => ({ ...a, [r.exam_id]: (a[r.exam_id] ?? 0) + 1 }), {});
    }
    return { classes, exams, subs, pending };
  });
  const byClass = new Map((data?.classes ?? []).map((x) => [x.id, x]));
  const visible = (data?.exams ?? []).filter((e) => me.role !== 'student' || e.status !== 'draft');

  return (
    <Screen title={t('exams')} refreshing={refreshing} onRefresh={refresh}
      right={me.role === 'teacher' && data?.classes.length ? <Button small icon="plus" title={t('newExam')} onPress={() => router.push(`/exam/new?class=${data.classes[0].id}`)} /> : undefined}>
      <ErrorText error={error} />
      <Card>
        {visible.length ? visible.map((e, i) => {
          const mine = data?.subs.find((s) => s.exam_id === e.id);
          const finished = mine && mine.status !== 'in_progress';
          return (
            <ListItem key={e.id} first={i === 0} title={e.title} subtitle={`${byClass.get(e.class_id)?.name ?? ''} · ${e.duration_min} ${t('min')}`}
              left={<View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: c.brandSoft, alignItems: 'center', justifyContent: 'center' }}><Icon name="exam" color={c.brand} size={20} /></View>}
              right={me.role === 'teacher'
                ? (data?.pending[e.id] ? <Pill tone="warn" text={`${data.pending[e.id]} ${t('needReview')}`} /> : <ExamStatusPill e={e} />)
                : finished ? <SubStatusPill s={mine} /> : <Pill tone="brand" text={mine ? t('resume') : t('startExam')} />}
              onPress={() => router.push(finished ? `/submission/${mine!.id}` : `/exam/${e.id}`)} />
          );
        }) : <Empty icon="exam" text={t('noExams')} />}
      </Card>
    </Screen>
  );
}
