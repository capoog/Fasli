import { useEffect, useRef, useState } from 'react';
import { ScrollView, View, type ScrollViewInstance } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import { Button, Chip, Empty, ErrorText, Field, IconButton, Row, Txt } from '@/components/ui';
import { myClasses } from '@/lib/api';
import { useMe } from '@/lib/auth';
import { isArabicText, useT } from '@/lib/i18n';
import { callFn, must, supabase } from '@/lib/supabase';
import { fonts, useColors } from '@/lib/theme';
import { errMsg, useData } from '@/lib/useData';

type Msg = { role: 'user' | 'assistant'; content: string };

export default function Tutor() {
  const me = useMe();
  const { t, lang } = useT();
  const c = useColors();
  const scroll = useRef<ScrollViewInstance>(null);
  const [classId, setClassId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data: classes } = useData(() => myClasses(me));

  useEffect(() => { if (!classId && classes?.length) setClassId(classes[0].id); }, [classes, classId]);
  useEffect(() => {
    if (!classId) return;
    supabase.from('tutor_messages').select('role, content').eq('user_id', me.id).eq('class_id', classId).order('created_at').limit(60)
      .then((r) => setMsgs((r.data ?? []) as Msg[]));
  }, [classId, me.id]);
  useEffect(() => { setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50); }, [msgs, busy]);

  async function send(body: string) {
    const m = body.trim();
    if (!m || !classId || busy) return;
    setText(''); setError(null); setBusy(true);
    setMsgs((x) => [...x, { role: 'user', content: m }]);
    try {
      const r = await callFn<{ reply: string }>('ai-tutor', { class_id: classId, message: m, language: lang });
      setMsgs((x) => [...x, { role: 'assistant', content: r.reply }]);
    } catch (e) {
      setError(errMsg(e));
      setMsgs((x) => x.slice(0, -1));
      setText(m);
    } finally { setBusy(false); }
  }

  async function clear() {
    if (!classId) return;
    must(await supabase.from('tutor_messages').delete().eq('user_id', me.id).eq('class_id', classId));
    setMsgs([]);
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ flex: 1, maxWidth: 720, width: '100%', alignSelf: 'center' }}>
        <View style={{ padding: 16, paddingBottom: 8, gap: 10 }}>
          <Row gap={12}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.brand, alignItems: 'center', justifyContent: 'center' }}><Icon name="ai" color={c.onBrand} /></View>
            <View style={{ flex: 1 }}><Txt v="h2">{t('tutorTitle')}</Txt><Txt v="small" muted numberOfLines={2}>{t('tutorSub')}</Txt></View>
            {msgs.length > 0 && <IconButton name="trash" label={t('clearChat')} onPress={clear} />}
          </Row>
          {classes && classes.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {classes.map((x) => <Chip key={x.id} label={x.subject || x.name} on={x.id === classId} onPress={() => setClassId(x.id)} />)}
            </ScrollView>
          )}
        </View>
        <ScrollView ref={scroll} contentContainerStyle={{ padding: 16, gap: 10 }} keyboardShouldPersistTaps="handled">
          {!classes?.length ? <Empty icon="class" text={t('noClassesS')} /> : msgs.length === 0 && (
            <View style={{ gap: 10 }}>
              <Txt muted>{t('pickClass')}</Txt>
              <Row gap={8} wrap>{(['tq1', 'tq2', 'tq3'] as const).map((k) => <Chip key={k} label={t(k)} onPress={() => send(t(k))} />)}</Row>
            </View>
          )}
          {msgs.map((m, i) => {
            const mine = m.role === 'user';
            const rtl = isArabicText(m.content);
            return (
              <View key={i} style={{ alignSelf: mine === (lang === 'ar') ? 'flex-end' : 'flex-start', maxWidth: '88%', backgroundColor: mine ? c.brand : c.surface, borderWidth: mine ? 0 : 1, borderColor: c.line, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 }}>
                <Txt selectable color={mine ? c.onBrand : c.ink} style={{ textAlign: rtl ? 'right' : 'left', writingDirection: rtl ? 'rtl' : 'ltr', fontFamily: fonts.body }}>{m.content}</Txt>
              </View>
            );
          })}
          {busy && <View style={{ alignSelf: lang === 'ar' ? 'flex-end' : 'flex-start', backgroundColor: c.surface, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: c.line }}><Txt muted>{t('thinking')}</Txt></View>}
          <ErrorText error={error} />
        </ScrollView>
        {!!classes?.length && (
          <Row gap={8} align="flex-end" style={{ padding: 12, borderTopWidth: 1, borderTopColor: c.line, backgroundColor: c.bg }}>
            <View style={{ flex: 1 }}><Field value={text} onChangeText={setText} placeholder={t('ask')} multiline style={{ minHeight: 46, maxHeight: 140 }} /></View>
            <Button title={t('send')} icon="send" loading={busy} onPress={() => send(text)} />
          </Row>
        )}
      </View>
    </SafeAreaView>
  );
}
