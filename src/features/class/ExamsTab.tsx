import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { Icon } from '@/components/Icon';
import { Button, Card, Empty, ListItem, Stack } from '@/components/ui';
import { ExamStatusPill, SubStatusPill } from '@/features/common';
import { examsForClasses, submissionsFor } from '@/lib/api';
import { useMe } from '@/lib/auth';
import { useT } from '@/lib/i18n';
import { useColors } from '@/lib/theme';
import type { ClassRow } from '@/lib/types';
import { useData } from '@/lib/useData';

export function ExamsTab({ cls, isTeacher }: { cls: ClassRow; isTeacher: boolean }) {
  const me = useMe();
  const { t } = useT();
  const c = useColors();
  const router = useRouter();
  const { data } = useData(async () => {
    const exams = await examsForClasses([cls.id]);
    const subs = me.role === 'student' ? await submissionsFor([me.id]) : [];
    return { exams, subs };
  }, [cls.id]);

  return (
    <Stack>
      {isTeacher && <Button icon="plus" title={t('newExam')} onPress={() => router.push(`/exam/new?class=${cls.id}`)} />}
      <Card>
        {data?.exams.length ? data.exams.map((e, i) => {
          const mine = data.subs.find((s) => s.exam_id === e.id);
          return (
            <ListItem key={e.id} first={i === 0} title={e.title} subtitle={`${e.duration_min} ${t('min')}`}
              left={<View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: c.brandSoft, alignItems: 'center', justifyContent: 'center' }}><Icon name="exam" color={c.brand} size={20} /></View>}
              right={mine && mine.status !== 'in_progress' ? <SubStatusPill s={mine} /> : <ExamStatusPill e={e} />}
              onPress={() => router.push(mine && mine.status !== 'in_progress' ? `/submission/${mine.id}` : `/exam/${e.id}`)} />
          );
        }) : <Empty icon="exam" text={t('noExams')} />}
      </Card>
    </Stack>
  );
}
