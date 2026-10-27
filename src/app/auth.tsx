import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Button, Card, ErrorText, Field, Screen, Stack, Txt, useToast } from '@/components/ui';
import { friendlyError } from '@/lib/api';
import { useT } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import { useColors } from '@/lib/theme';
import { errMsg } from '@/lib/useData';

export default function Auth() {
  const { mode: m } = useLocalSearchParams<{ mode?: string }>();
  const [mode, setMode] = useState<'signin' | 'signup'>(m === 'signup' ? 'signup' : 'signin');
  const { t, lang } = useT();
  const router = useRouter();
  const toast = useToast();
  const c = useColors();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function go() {
    setError(null); setInfo(null);
    if (!email.includes('@') || password.length < (mode === 'signup' ? 8 : 1) || (mode === 'signup' && !name.trim())) {
      setError(mode === 'signup' ? `${t('fullName')} · ${t('email')} · ${t('passwordHint')}` : `${t('email')} · ${t('password')}`);
      return;
    }
    setBusy(true);
    try {
      if (mode === 'signup') {
        const { data, error: e } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { full_name: name.trim(), locale: lang } } });
        if (e) throw e;
        if (!data.session) { setInfo(t('checkEmail')); setMode('signin'); return; }
      } else {
        const { error: e } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (e) throw e;
      }
      router.replace('/');
    } catch (e) {
      setError(friendlyError(errMsg(e), lang));
    } finally {
      setBusy(false);
    }
  }

  async function forgot() {
    if (!email.includes('@')) { setError(t('email')); return; }
    const { error: e } = await supabase.auth.resetPasswordForEmail(email.trim());
    if (e) setError(friendlyError(e.message, lang)); else toast(t('resetSent'));
  }

  return (
    <Screen back title={mode === 'signup' ? t('createAccount') : t('signIn')}>
      <Card>
        <Stack gap={14}>
          {mode === 'signup' && <Field label={t('fullName')} value={name} onChangeText={setName} autoComplete="name" textContentType="name" />}
          <Field label={t('email')} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" textContentType="emailAddress" style={{ textAlign: 'left', writingDirection: 'ltr' }} />
          <Field label={t('password')} hint={mode === 'signup' ? t('passwordHint') : undefined} value={password} onChangeText={setPassword} secureTextEntry autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} onSubmitEditing={go} />
          <ErrorText error={error} />
          {info ? <Txt v="small" color={c.ok}>{info}</Txt> : null}
          <Button title={mode === 'signup' ? t('createAccount') : t('signIn')} onPress={go} loading={busy} />
          <Button title={mode === 'signup' ? t('haveAccount') : t('noAccount')} kind="line" onPress={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setError(null); }} />
          {mode === 'signin' && <Button title={t('forgot')} kind="ghost" small onPress={forgot} />}
        </Stack>
      </Card>
    </Screen>
  );
}
