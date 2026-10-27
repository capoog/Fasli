import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import LiveRoom from '@/components/LiveRoom';
import { Button, Card, ErrorText, Field, Loading, Pill, Row, Screen, Txt, useToast } from '@/components/ui';
import { useT } from '@/lib/i18n';
import { callFn, supabase } from '@/lib/supabase';
import { useData } from '@/lib/useData';

type Token = { token: string; url: string; room: string; role: 'teacher' | 'student'; title: string };

export default function Live() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, rtl } = useT();
  const router = useRouter();
  const toast = useToast();
  const [notes, setNotes] = useState('');
  const [ending, setEnding] = useState(false);
  const { data, error, loading, reload } = useData(() => callFn<Token>('livekit-token', { session_id: id }), [id], { refetchOnFocus: false });

  if (loading && !data) return <Loading />;

  async function end() {
    setEnding(true);
    await supabase.from('live_sessions').update({ status: 'ended', notes: notes.trim() }).eq('id', id);
    setEnding(false);
    toast(t('ended'));
    router.back();
  }

  return (
    <Screen back title={data?.title ?? t('live')} right={data ? <Pill tone="live" text={t('liveNow')} /> : undefined}>
      {error ? (
        <Card>
          <ErrorText error={error} />
          <Button kind="ghost" title={t('retry')} onPress={reload} />
        </Card>
      ) : data ? (
        <>
          <View style={{ height: 560 }}>
            <LiveRoom rtl={rtl} token={data.token} serverUrl={data.url} onLeave={() => (data.role === 'teacher' ? null : router.back())} />
          </View>
          {data.role === 'teacher' && (
            <Card>
              <Field label={t('classNotes')} value={notes} onChangeText={setNotes} multiline />
              <Row gap={8}>
                <Button flex kind="pen" icon="x" title={t('endLive')} loading={ending} onPress={end} />
              </Row>
            </Card>
          )}
          <Txt v="small" muted center>{data.room}</Txt>
        </>
      ) : null}
    </Screen>
  );
}
