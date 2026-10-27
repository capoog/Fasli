import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Button, Card, Empty, ErrorText, Field, ListItem, Row, Stack, Txt, useToast } from '@/components/ui';
import { SessionStatus, useFmt } from '@/features/common';
import { useT } from '@/lib/i18n';
import { must, supabase } from '@/lib/supabase';
import type { ClassRow, Session } from '@/lib/types';
import { errMsg, useData } from '@/lib/useData';

const pad = (n: number) => String(n).padStart(2, '0');

export function LiveTab({ cls, isTeacher }: { cls: ClassRow; isTeacher: boolean }) {
  const { t, lang } = useT();
  const router = useRouter();
  const toast = useToast();
  const fmt = useFmt();
  const tomorrow = new Date(Date.now() + 86400000);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(`${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`);
  const [time, setTime] = useState('08:00');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { data, reload } = useData(async () =>
    must(await supabase.from('live_sessions').select('id, class_id, title, starts_at, status, notes').eq('class_id', cls.id).order('starts_at', { ascending: false }).limit(30)) as Session[], [cls.id]);

  async function create(now: boolean) {
    setError(null);
    const when = now ? new Date() : new Date(`${date}T${time}:00`);
    if (isNaN(when.getTime())) { setError(t('when')); return; }
    setBusy(now ? 'now' : 'later');
    try {
      const s = must(await supabase.from('live_sessions').insert({
        class_id: cls.id, title: title.trim() || (lang === 'ar' ? `حصة ${cls.subject || cls.name}` : `${cls.subject || cls.name} class`),
        starts_at: when.toISOString(), status: 'scheduled',
      }).select('id').single()) as { id: string };
      setTitle('');
      if (now) router.push(`/live/${s.id}`); else { toast(t('saved')); reload(); }
    } catch (e) { setError(errMsg(e)); } finally { setBusy(null); }
  }

  const live = (data ?? []).filter((s) => s.status === 'live');
  const rest = (data ?? []).filter((s) => s.status !== 'live');

  return (
    <Stack>
      {live.map((s) => (
        <Card key={s.id} tone="brand">
          <Row justify="space-between"><SessionStatus s={s} /><Txt v="small" muted>{fmt.time(s.starts_at)}</Txt></Row>
          <Txt v="h3" auto>{s.title}</Txt>
          <Button kind="pen" icon="video" title={isTeacher ? t('open') : t('joinLive')} onPress={() => router.push(`/live/${s.id}`)} />
        </Card>
      ))}
      {isTeacher && (
        <Card>
          <Field label={t('sessionTitle')} value={title} onChangeText={setTitle} />
          <Button icon="video" title={t('startNow')} loading={busy === 'now'} onPress={() => create(true)} />
          <Row gap={8} align="flex-end">
            <View style={{ flex: 2 }}><Field label={t('when')} value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" style={{ textAlign: 'center' }} /></View>
            <View style={{ flex: 1 }}><Field value={time} onChangeText={setTime} placeholder="HH:MM" style={{ textAlign: 'center' }} /></View>
          </Row>
          <Button kind="ghost" icon="clock" title={t('schedule')} loading={busy === 'later'} onPress={() => create(false)} />
          <ErrorText error={error} />
        </Card>
      )}
      <Card>
        {rest.length ? rest.map((s, i) => (
          <ListItem key={s.id} first={i === 0} title={s.title} subtitle={`${fmt.dateTime(s.starts_at)}${s.notes ? ` · ${s.notes.slice(0, 80)}` : ''}`}
            right={<SessionStatus s={s} />} onPress={isTeacher && s.status === 'scheduled' ? () => router.push(`/live/${s.id}`) : undefined} />
        )) : <Empty icon="video" text={t('nothingYet')} />}
      </Card>
    </Stack>
  );
}
