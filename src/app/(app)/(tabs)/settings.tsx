import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Button, Card, Field, Row, Screen, Seg, Stack, Txt, useToast } from '@/components/ui';
import { Wordmark } from '@/components/Logo';
import { CodeBox, CodesCard } from '@/features/settings/CodesCard';
import { useAuth, useMe } from '@/lib/auth';
import { useT } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import type { Lang } from '@/lib/types';
import { useData } from '@/lib/useData';

export default function Settings() {
  const me = useMe();
  const { refresh, signOut, session } = useAuth();
  const { t, lang, setLang } = useT();
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState(me.full_name);
  const { data: link } = useData(async () => (me.role === 'student' ? ((await supabase.rpc('my_link_code')).data as string | null) : null));
  const { data: school } = useData(async () => (await supabase.from('schools').select('id, name').eq('id', me.school_id ?? '').maybeSingle()).data as { name: string } | null);

  async function changeLang(l: Lang) {
    setLang(l);
    await supabase.from('profiles').update({ locale: l }).eq('id', me.id);
  }

  return (
    <Screen title={t('settings')} back={router.canGoBack()}>
      <Card>
        <Txt v="h3">{t('profile')}</Txt>
        <Txt muted>{`${t(me.role ?? 'student')}${school?.name ? ` · ${school.name}` : ''}`}</Txt>
        <Txt v="small" muted>{session?.user.email}</Txt>
        <Field label={t('fullName')} value={name} onChangeText={setName} />
        <Button small kind="ghost" title={t('save')} onPress={async () => { await supabase.from('profiles').update({ full_name: name.trim() }).eq('id', me.id); await refresh(); toast(t('saved')); }} />
      </Card>
      <Card>
        <Txt v="h3">{t('language')}</Txt>
        <Seg<Lang> value={lang} onChange={changeLang} options={[{ value: 'ar', label: 'العربية' }, { value: 'en', label: 'English' }]} />
      </Card>
      {link ? <Card><CodeBox label={`${t('myCode')} · ${t('childCodeHint')}`} code={link} /></Card> : null}
      {(me.role === 'admin' || me.role === 'teacher') && <CodesCard />}
      <Button kind="line" title={t('signOut')} onPress={async () => { await signOut(); router.replace('/'); }} />
      <Stack gap={6} style={{ alignItems: 'center', paddingTop: 12 }}>
        <Wordmark size={34} />
        <Row gap={6}><Txt v="small" muted>{`${t('version')} ${Constants.expoConfig?.version ?? '1.0.0'}`}</Txt></Row>
      </Stack>
    </Screen>
  );
}
