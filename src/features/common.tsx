import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { Avatar, Pill, Row, Txt } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useT, type TKey } from '@/lib/i18n';
import { CURRICULUM_COLOR, useColors } from '@/lib/theme';
import type { ClassRow, Exam, Session, Submission } from '@/lib/types';

export function greeting(t: (k: TKey) => string) {
  return new Date().getHours() < 15 ? t('goodMorning') : t('goodEvening');
}

/** Header strip: greeting + avatar that opens settings. */
export function HomeHeader({ eyebrow }: { eyebrow?: string }) {
  const { profile } = useAuth();
  const { t, lang } = useT();
  const router = useRouter();
  const first = (profile?.full_name ?? '').split(' ')[0];
  return (
    <Row justify="space-between" style={{ paddingTop: 6 }}>
      <View style={{ flex: 1 }}>
        {eyebrow ? <Txt v="eyebrow" auto numberOfLines={1}>{eyebrow}</Txt> : null}
        <Txt v="h1">{`${greeting(t)}${first ? `${lang === 'ar' ? '،' : ','} ${first}` : ''}`}</Txt>
      </View>
      <Pressable onPress={() => router.push('/settings')} accessibilityRole="button" accessibilityLabel={t('settings')}>
        <Avatar name={profile?.full_name ?? '?'} id={profile?.id} size={42} />
      </Pressable>
    </Row>
  );
}

export function CurriculumPill({ c }: { c: ClassRow['curriculum'] }) {
  const { t } = useT();
  const col = CURRICULUM_COLOR[c];
  return (
    <View style={{ backgroundColor: col + '22', borderRadius: 99, paddingHorizontal: 9, paddingVertical: 2 }}>
      <Txt v="small" color={col} style={{ fontSize: 11.5 }}>{t(c)}</Txt>
    </View>
  );
}

export function ClassBadge({ cls, size = 40 }: { cls: Pick<ClassRow, 'id' | 'name' | 'curriculum'>; size?: number }) {
  const col = CURRICULUM_COLOR[cls.curriculum];
  return (
    <View style={{ width: size, height: size, borderRadius: 12, backgroundColor: col, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name="class" color="#fff" size={size * 0.5} />
    </View>
  );
}

export function SessionStatus({ s }: { s: Session }) {
  const { t } = useT();
  if (s.status === 'live') return <Pill tone="live" text={t('liveNow')} />;
  if (s.status === 'ended') return <Pill text={t('ended')} />;
  return <Pill tone="brand" text={t('scheduled')} />;
}

export function ExamStatusPill({ e }: { e: Exam }) {
  const { t } = useT();
  return e.status === 'published' ? <Pill tone="ok" text={t('published')} /> : e.status === 'closed' ? <Pill text={t('closed')} /> : <Pill tone="warn" text={t('draft')} />;
}

export function SubStatusPill({ s }: { s: Submission }) {
  const { t } = useT();
  if (s.status === 'approved') return <Pill tone="ok" text={t('approved')} />;
  if (s.status === 'graded') return <Pill tone="warn" text={t('awaitingReview')} />;
  if (s.status === 'grading') return <Pill tone="brand" text={t('grading')} />;
  return <Pill text={t('inProgress')} />;
}

export function useFmt() {
  const { lang } = useT();
  const loc = lang === 'ar' ? 'ar-EG' : 'en-GB';
  return {
    date: (d: string | Date) => new Intl.DateTimeFormat(loc, { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(d)),
    time: (d: string | Date) => new Intl.DateTimeFormat(loc, { hour: 'numeric', minute: '2-digit' }).format(new Date(d)),
    dateTime: (d: string | Date) => new Intl.DateTimeFormat(loc, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(d)),
  };
}

export function SectionTitle({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <Row justify="space-between" style={{ marginBottom: 2 }}>
      <Txt v="h2" style={{ flex: 1 }}>{title}</Txt>
      {right}
    </Row>
  );
}

export function useTint() { return useColors(); }
