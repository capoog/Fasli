import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Avatar, Button, Card, Empty, ErrorText, ListItem, Pill, Screen, Txt } from '@/components/ui';
import { useFmt } from '@/features/common';
import { profilesByIds } from '@/lib/api';
import { useMe } from '@/lib/auth';
import { useT } from '@/lib/i18n';
import { must, supabase } from '@/lib/supabase';
import type { Message, Profile } from '@/lib/types';
import { useData } from '@/lib/useData';

export default function Messages() {
  const me = useMe();
  const { t } = useT();
  const router = useRouter();
  const fmt = useFmt();
  const [picking, setPicking] = useState(false);
  const { data, error, refreshing, refresh } = useData(async () => {
    const msgs = must(await supabase.from('messages').select('id, sender_id, recipient_id, body, created_at, read_at')
      .or(`sender_id.eq.${me.id},recipient_id.eq.${me.id}`).order('created_at', { ascending: false }).limit(300)) as Message[];
    const threads = new Map<string, { last: Message; unread: number }>();
    for (const m of msgs) {
      const other = m.sender_id === me.id ? m.recipient_id : m.sender_id;
      const th = threads.get(other) ?? { last: m, unread: 0 };
      if (m.recipient_id === me.id && !m.read_at) th.unread++;
      threads.set(other, th);
    }
    const people = await profilesByIds([...threads.keys()]);
    // People this person may start a conversation with: teachers ↔ students/parents in the school.
    const roles = me.role === 'teacher' ? ['parent', 'student', 'admin', 'teacher'] : ['teacher', 'admin'];
    const contacts = must(await supabase.from('profiles').select('id, full_name, role, school_id, locale').eq('school_id', me.school_id ?? '').in('role', roles).neq('id', me.id).order('full_name').limit(200)) as Profile[];
    return { threads: [...threads.entries()], people, contacts };
  });

  return (
    <Screen title={t('messages')} refreshing={refreshing} onRefresh={refresh}
      right={<Button small icon={picking ? 'x' : 'plus'} kind={picking ? 'ghost' : 'primary'} title={picking ? t('cancel') : t('newMessage')} onPress={() => setPicking(!picking)} />}>
      <ErrorText error={error} />
      {picking && (
        <Card>
          <Txt v="h3">{t('pickPerson')}</Txt>
          {data?.contacts.length ? data.contacts.map((p, i) => (
            <ListItem key={p.id} first={i === 0} title={p.full_name || '—'} left={<Avatar name={p.full_name} id={p.id} size={36} />} right={<Pill text={t(p.role ?? 'student')} />}
              onPress={() => { setPicking(false); router.push(`/chat/${p.id}`); }} />
          )) : <Txt muted>{t('nothingYet')}</Txt>}
        </Card>
      )}
      <Card>
        {data?.threads.length ? data.threads.map(([other, th], i) => (
          <ListItem key={other} first={i === 0} title={data.people[other]?.full_name ?? '—'} subtitle={th.last.body}
            left={<Avatar name={data.people[other]?.full_name ?? '?'} id={other} />}
            right={th.unread ? <Pill tone="live" text={String(th.unread)} /> : <Txt v="small" muted>{fmt.date(th.last.created_at)}</Txt>}
            onPress={() => router.push(`/chat/${other}`)} />
        )) : <Empty icon="msg" text={t('noMessages')} />}
      </Card>
    </Screen>
  );
}
