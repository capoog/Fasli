import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { Card, ErrorText, ListItem, Row, Screen, Stat, Txt } from '@/components/ui';
import { ClassBadge, CurriculumPill, HomeHeader, SectionTitle } from '@/features/common';
import { myClasses } from '@/lib/api';
import { useMe } from '@/lib/auth';
import { CURRICULA } from '@/lib/curricula';
import { useT } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import { CURRICULUM_COLOR, useColors } from '@/lib/theme';
import { useData } from '@/lib/useData';
import { CodesCard } from '@/features/settings/CodesCard';

type Stats = { students: number; teachers: number; parents: number; classes: number; avg_score: number | null; curricula: Record<string, number> };

export function AdminHome() {
  const me = useMe();
  const { t } = useT();
  const c = useColors();
  const router = useRouter();
  const { data, error, refreshing, refresh } = useData(async () => {
    const [{ data: stats, error: e }, { data: school }, classes] = await Promise.all([
      supabase.rpc('school_stats'),
      supabase.from('schools').select('id, name').eq('id', me.school_id ?? '').maybeSingle(),
      myClasses(me),
    ]);
    if (e) throw e;
    return { stats: stats as Stats, school, classes };
  });
  const s = data?.stats;
  const mixTotal = s ? Object.values(s.curricula ?? {}).reduce((a, b) => a + b, 0) : 0;

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <HomeHeader eyebrow={data?.school?.name ?? t('dashboard')} />
      <ErrorText error={error} />
      <Row gap={10} wrap>
        <Stat value={String(s?.students ?? '—')} label={t('people')} />
        <Stat value={String(s?.teachers ?? '—')} label={t('teachers')} />
        <Stat value={String(s?.classes ?? '—')} label={t('classes')} />
        <Stat value={s?.avg_score != null ? `${s.avg_score}%` : '—'} label={t('avgScore')} />
      </Row>
      <CodesCard />
      {mixTotal > 0 && (
        <Card>
          <SectionTitle title={t('curricula')} />
          <View style={{ flexDirection: 'row', height: 14, borderRadius: 99, overflow: 'hidden', backgroundColor: c.surface2 }}>
            {CURRICULA.map((k) => <View key={k} style={{ width: `${((s?.curricula?.[k] ?? 0) / mixTotal) * 100}%`, backgroundColor: CURRICULUM_COLOR[k] }} />)}
          </View>
          <Row gap={12} wrap>
            {CURRICULA.filter((k) => s?.curricula?.[k] != null).map((k) => (
              <Row key={k} gap={6}><View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: CURRICULUM_COLOR[k] }} /><Txt v="small" muted>{`${t(k)} · ${s?.curricula?.[k] ?? 0}`}</Txt></Row>
            ))}
          </Row>
        </Card>
      )}
      <Card>
        <SectionTitle title={t('allClasses')} />
        {data?.classes.length ? data.classes.slice(0, 12).map((x, i) => (
          <ListItem key={x.id} first={i === 0} title={x.name} subtitle={x.subject} left={<ClassBadge cls={x} />} right={<CurriculumPill c={x.curriculum} />} onPress={() => router.push(`/class/${x.id}`)} />
        )) : <Txt muted>{t('nothingYet')}</Txt>}
      </Card>
    </Screen>
  );
}
