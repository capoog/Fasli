import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Avatar, Bar, Button, Card, ErrorText, Field, ListItem, Row, Screen, Stack, Stat, Txt, useToast } from '@/components/ui';
import { HomeHeader, SectionTitle, SubStatusPill } from '@/features/common';
import { friendlyError, myChildren, submissionsFor, EXAM_COLS } from '@/lib/api';
import { useMe } from '@/lib/auth';
import { pct } from '@/lib/curricula';
import { useT } from '@/lib/i18n';
import { must, supabase } from '@/lib/supabase';
import type { Exam } from '@/lib/types';
import { errMsg, useData } from '@/lib/useData';

export function LinkChildCard({ onDone }: { onDone: () => void }) {
  const { t, lang } = useT();
  const toast = useToast();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <Card tone="dashed">
      <Txt v="h3">{t('linkChild')}</Txt>
      <Field label={t('childCode')} hint={t('childCodeHint')} value={code} onChangeText={(v) => setCode(v.toUpperCase())} autoCapitalize="characters" style={{ textAlign: 'center', letterSpacing: 4 }} />
      <ErrorText error={error} />
      <Button title={t('linkChild')} icon="link" loading={busy} onPress={async () => {
        setBusy(true); setError(null);
        const { error: e } = await supabase.rpc('link_child', { code: code.trim() });
        setBusy(false);
        if (e) setError(friendlyError(e.message, lang)); else { setCode(''); toast(t('done')); onDone(); }
      }} />
    </Card>
  );
}

export function ParentHome() {
  const me = useMe();
  const { t } = useT();
  const router = useRouter();
  const { data, error, refreshing, refresh, reload } = useData(async () => {
    const kids = await myChildren(me);
    const subs = await submissionsFor(kids.map((k) => k.id));
    const exams = subs.length ? must(await supabase.from('exams').select(EXAM_COLS).in('id', [...new Set(subs.map((s) => s.exam_id))])) as Exam[] : [];
    const att: Record<string, number> = {};
    for (const k of kids) att[k.id] = (await supabase.from('attendance').select('session_id', { count: 'exact', head: true }).eq('student_id', k.id)).count ?? 0;
    return { kids, subs, exams: Object.fromEntries(exams.map((e) => [e.id, e])), att };
  });

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <HomeHeader eyebrow={t('parent')} />
      <ErrorText error={error} />
      {data?.kids.map((k) => {
        const done = data.subs.filter((s) => s.student_id === k.id && (s.status === 'graded' || s.status === 'approved'));
        const avg = done.length ? Math.round(done.reduce((a, s) => a + pct(s.score, s.max_score), 0) / done.length) : null;
        return (
          <Stack key={k.id} gap={12}>
            <Row gap={12}><Avatar name={k.full_name} id={k.id} size={48} /><Txt v="h2" auto style={{ flex: 1 }}>{k.full_name}</Txt></Row>
            <Row gap={10} wrap>
              <Stat value={avg != null ? `${avg}%` : '—'} label={t('average')} />
              <Stat value={String(done.length)} label={t('examsTaken')} />
              <Stat value={String(data.att[k.id] ?? 0)} label={t('attendance')} />
            </Row>
            <Card>
              <SectionTitle title={t('recentResults')} />
              {done.length ? done.slice(0, 6).map((s, i) => (
                <ListItem key={s.id} first={i === 0} title={data.exams[s.exam_id]?.title ?? '—'} subtitle={`${s.score}/${s.max_score}`} right={<SubStatusPill s={s} />} onPress={() => router.push(`/submission/${s.id}`)} />
              )) : <Txt muted>{t('noResults')}</Txt>}
              {done.length > 0 && <Bar label={t('average')} value={avg ?? 0} />}
            </Card>
          </Stack>
        );
      })}
      {data && <LinkChildCard onDone={reload} />}
      <Button kind="ghost" icon="msg" title={t('messages')} onPress={() => router.push('/messages')} />
    </Screen>
  );
}

export const _err = errMsg;
