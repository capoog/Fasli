import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { Icon } from '@/components/Icon';
import { Button, Card, Empty, ErrorText, ListItem, Pill, Row, Screen, Stat, Txt } from '@/components/ui';
import { ClassBadge, HomeHeader, SectionTitle, useFmt } from '@/features/common';
import { examsForClasses, myClasses, submissionsFor } from '@/lib/api';
import { useMe } from '@/lib/auth';
import { pct } from '@/lib/curricula';
import { useT } from '@/lib/i18n';
import { must, supabase } from '@/lib/supabase';
import { useColors } from '@/lib/theme';
import type { Session } from '@/lib/types';
import { useData } from '@/lib/useData';

export function StudentHome() {
  const me = useMe();
  const { t } = useT();
  const c = useColors();
  const router = useRouter();
  const fmt = useFmt();
  const { data, error, refreshing, refresh } = useData(async () => {
    const classes = await myClasses(me);
    const ids = classes.map((x) => x.id);
    const [exams, subs, sessions, att] = await Promise.all([
      examsForClasses(ids),
      submissionsFor([me.id]),
      ids.length ? must(await supabase.from('live_sessions').select('id, class_id, title, starts_at, status, notes').in('class_id', ids).neq('status', 'ended').order('starts_at').limit(10)) as Session[] : Promise.resolve([] as Session[]),
      ids.length ? (await supabase.from('live_sessions').select('id', { count: 'exact', head: true }).in('class_id', ids).eq('status', 'ended')).count ?? 0 : 0,
    ]);
    const attended = (await supabase.from('attendance').select('session_id', { count: 'exact', head: true }).eq('student_id', me.id)).count ?? 0;
    return { classes, exams, subs, sessions, attRate: att ? Math.min(100, Math.round((attended / att) * 100)) : null };
  });

  const byClass = new Map((data?.classes ?? []).map((x) => [x.id, x]));
  const open = (data?.exams ?? []).filter((e) => e.status === 'published' && !data?.subs.find((s) => s.exam_id === e.id && s.status !== 'in_progress'));
  const done = (data?.subs ?? []).filter((s) => s.status === 'graded' || s.status === 'approved');
  const avg = done.length ? Math.round(done.reduce((a, s) => a + pct(s.score, s.max_score), 0) / done.length) : null;

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <HomeHeader />
      <ErrorText error={error} />
      {data && !data.classes.length && (
        <Card tone="dashed">
          <Txt v="h3">{t('joinClass')}</Txt>
          <Txt muted>{t('noClassesS')}</Txt>
          <Button title={t('joinClass')} icon="plus" onPress={() => router.push('/classes')} />
        </Card>
      )}

      {(data?.sessions ?? []).filter((s) => s.status === 'live').map((s) => (
        <Card key={s.id} tone="ink">
          <Row justify="space-between"><Pill tone="live" text={t('liveNow')} /><Txt v="small" color={c.bg} style={{ opacity: 0.7 }} auto>{byClass.get(s.class_id)?.name ?? ''}</Txt></Row>
          <Txt v="h2" color={c.bg} auto>{s.title}</Txt>
          <Button kind="onInk" title={t('joinLive')} icon="video" onPress={() => router.push(`/live/${s.id}`)} />
        </Card>
      ))}

      {open.length > 0 && (
        <Card>
          <SectionTitle title={t('exams')} right={<Pill tone="warn" text={String(open.length)} />} />
          {open.slice(0, 4).map((e, i) => (
            <ListItem key={e.id} first={i === 0} title={e.title} subtitle={`${byClass.get(e.class_id)?.name ?? ''} · ${e.duration_min} ${t('min')}`}
              left={<View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: c.brandSoft, alignItems: 'center', justifyContent: 'center' }}><Icon name="exam" color={c.brand} size={20} /></View>}
              right={<Button small title={t('startExam')} onPress={() => router.push(`/exam/${e.id}`)} />} onPress={() => router.push(`/exam/${e.id}`)} />
          ))}
        </Card>
      )}

      <Row gap={10} wrap>
        <Stat value={data?.attRate != null ? `${data.attRate}%` : '—'} label={t('attendanceRate')} />
        <Stat value={avg != null ? `${avg}%` : '—'} label={t('average')} />
        <Stat value={String(done.length)} label={t('examsTaken')} />
      </Row>

      <Card onPress={() => router.push('/tutor')}>
        <Row gap={12}>
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.brand, alignItems: 'center', justifyContent: 'center' }}><Icon name="ai" color={c.onBrand} /></View>
          <View style={{ flex: 1 }}><Txt v="medium">{t('tutorTitle')}</Txt><Txt v="small" muted>{t('tutorSub')}</Txt></View>
        </Row>
      </Card>

      {(data?.sessions ?? []).some((s) => s.status === 'scheduled') && (
        <Card>
          <SectionTitle title={t('live')} />
          {(data?.sessions ?? []).filter((s) => s.status === 'scheduled').map((s, i) => (
            <ListItem key={s.id} first={i === 0} title={s.title} subtitle={`${byClass.get(s.class_id)?.name ?? ''} · ${fmt.dateTime(s.starts_at)}`}
              left={byClass.get(s.class_id) ? <ClassBadge cls={byClass.get(s.class_id)!} /> : undefined} right={<Pill tone="brand" text={t('scheduled')} />} />
          ))}
        </Card>
      )}

      {data?.classes.length ? (
        <Card>
          <SectionTitle title={t('myClasses')} />
          {data.classes.map((x, i) => (
            <ListItem key={x.id} first={i === 0} title={x.name} subtitle={x.subject} left={<ClassBadge cls={x} />} onPress={() => router.push(`/class/${x.id}`)} />
          ))}
        </Card>
      ) : data ? null : <Empty text={t('loading')} />}
    </Screen>
  );
}
