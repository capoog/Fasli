import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, View, type ScrollViewInstance } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Icon } from '@/components/Icon';
import { Avatar, Button, ErrorText, Field, Pill, Row, Txt } from '@/components/ui';
import { useFmt } from '@/features/common';
import { useMe } from '@/lib/auth';
import { isArabicText, useT } from '@/lib/i18n';
import { must, supabase } from '@/lib/supabase';
import { useColors } from '@/lib/theme';
import type { Message, Profile } from '@/lib/types';
import { errMsg } from '@/lib/useData';

export default function Chat() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useMe();
  const { t, rtl } = useT();
  const c = useColors();
  const fmt = useFmt();
  const router = useRouter();
  const scroll = useRef<ScrollViewInstance>(null);
  const [other, setOther] = useState<Profile | null>(null);
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const rows = must(await supabase.from('messages').select('id, sender_id, recipient_id, body, created_at, read_at')
        .or(`and(sender_id.eq.${me.id},recipient_id.eq.${id}),and(sender_id.eq.${id},recipient_id.eq.${me.id})`).order('created_at').limit(500)) as Message[];
      if (alive) setMsgs(rows);
      const unread = rows.filter((m) => m.recipient_id === me.id && !m.read_at).map((m) => m.id);
      if (unread.length) await supabase.from('messages').update({ read_at: new Date().toISOString() }).in('id', unread);
    };
    supabase.from('profiles').select('id, full_name, role, school_id, locale').eq('id', id).maybeSingle().then((r) => alive && setOther(r.data as Profile));
    load().catch((e) => setError(errMsg(e)));
    // Live updates for new messages to me.
    const ch = supabase.channel(`chat-${me.id}-${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `recipient_id=eq.${me.id}` }, (p) => {
        const m = p.new as Message;
        if (m.sender_id === id) setMsgs((x) => (x.some((y) => y.id === m.id) ? x : [...x, m]));
      }).subscribe();
    return () => { alive = false; supabase.removeChannel(ch); };
  }, [id, me.id]);

  useEffect(() => { setTimeout(() => scroll.current?.scrollToEnd({ animated: false }), 50); }, [msgs]);

  async function send() {
    const body = text.trim();
    if (!body) return;
    setBusy(true); setError(null);
    try {
      const m = must(await supabase.from('messages').insert({ sender_id: me.id, recipient_id: id, body }).select('id, sender_id, recipient_id, body, created_at, read_at').single()) as Message;
      setMsgs((x) => [...x, m]); setText('');
    } catch (e) { setError(errMsg(e)); } finally { setBusy(false); }
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ flex: 1, maxWidth: 720, width: '100%', alignSelf: 'center' }}>
        <Row gap={10} style={{ padding: 16, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: c.line }}>
          <Button small kind="ghost" title="" icon={rtl ? 'fwd' : 'back'} onPress={() => (router.canGoBack() ? router.back() : router.replace('/messages'))} />
          <Avatar name={other?.full_name ?? '?'} id={id} />
          <View style={{ flex: 1 }}><Txt v="h3" auto numberOfLines={1}>{other?.full_name ?? ''}</Txt></View>
          {other?.role ? <Pill text={t(other.role)} /> : null}
        </Row>
        <ScrollView ref={scroll} contentContainerStyle={{ padding: 16, gap: 8 }}>
          {msgs.map((m) => {
            const mine = m.sender_id === me.id;
            const r = isArabicText(m.body);
            return (
              <View key={m.id} style={{ alignSelf: mine === rtl ? 'flex-end' : 'flex-start', maxWidth: '85%', backgroundColor: mine ? c.brand : c.surface, borderWidth: mine ? 0 : 1, borderColor: c.line, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 9 }}>
                <Txt selectable color={mine ? c.onBrand : c.ink} style={{ textAlign: r ? 'right' : 'left', writingDirection: r ? 'rtl' : 'ltr' }}>{m.body}</Txt>
                <Txt v="small" color={mine ? c.onBrand : c.muted} style={{ opacity: 0.7, fontSize: 11 }}>{fmt.time(m.created_at)}</Txt>
              </View>
            );
          })}
          {!msgs.length && <View style={{ alignItems: 'center', padding: 24 }}><Icon name="msg" color={c.muted} /><Txt muted center>{t('noMessages')}</Txt></View>}
        </ScrollView>
        <ErrorText error={error} />
        <Row gap={8} align="flex-end" style={{ padding: 12, borderTopWidth: 1, borderTopColor: c.line }}>
          <View style={{ flex: 1 }}><Field value={text} onChangeText={setText} placeholder={t('typeMessage')} multiline style={{ minHeight: 46, maxHeight: 140 }} /></View>
          <Button title={t('send')} icon="send" loading={busy} onPress={send} />
        </Row>
      </View>
    </SafeAreaView>
  );
}
