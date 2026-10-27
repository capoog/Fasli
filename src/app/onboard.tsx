import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Icon, type IconName } from '@/components/Icon';
import { Button, Card, ErrorText, Field, Row, Screen, Stack, Txt } from '@/components/ui';
import { friendlyError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useT } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import { useColors } from '@/lib/theme';
import type { Role } from '@/lib/types';
import { errMsg } from '@/lib/useData';

const ROLES: { role: Role; icon: IconName }[] = [
  { role: 'student', icon: 'class' }, { role: 'teacher', icon: 'pen' }, { role: 'parent', icon: 'users' }, { role: 'admin', icon: 'building' },
];

export default function Onboard() {
  const { t, lang } = useT();
  const c = useColors();
  const router = useRouter();
  const { profile, refresh, signOut } = useAuth();
  const [role, setRole] = useState<Role | null>(null);
  const [name, setName] = useState(profile?.full_name ?? '');
  const [code, setCode] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function finish() {
    if (!role) return;
    setError(null);
    if (!name.trim() || (role === 'admin' ? !schoolName.trim() : !code.trim())) { setError(`${t('fullName')} · ${role === 'admin' ? t('schoolName') : t('schoolCode')}`); return; }
    setBusy(true);
    try {
      const res = role === 'admin'
        ? await supabase.rpc('create_school', { school_name: schoolName.trim(), admin_name: name.trim() })
        : await supabase.rpc('join_school', { code: code.trim(), as_role: role, person_name: name.trim() });
      if (res.error) throw res.error;
      await supabase.from('profiles').update({ locale: lang }).eq('id', profile?.id ?? '');
      await refresh();
      router.replace('/');
    } catch (e) {
      setError(friendlyError(errMsg(e), lang));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen title={t('whoAreYou')} right={<Button small kind="line" title={t('signOut')} onPress={async () => { await signOut(); router.replace('/'); }} />}>
      <Stack gap={10}>
        {ROLES.map(({ role: r, icon }) => {
          const on = role === r;
          return (
            <Pressable key={r} onPress={() => setRole(r)} accessibilityRole="button" accessibilityState={{ selected: on }}>
              <Row gap={14} style={{ padding: 14, borderRadius: 14, borderWidth: 1.5, borderColor: on ? c.brand : c.line, backgroundColor: on ? c.brandSoft : c.surface }}>
                <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: on ? c.brand : c.surface2, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={icon} color={on ? c.onBrand : c.ink} />
                </View>
                <View style={{ flex: 1 }}>
                  <Txt v="medium">{t(r)}</Txt>
                  <Txt v="small" muted>{t(`${r}D`)}</Txt>
                </View>
              </Row>
            </Pressable>
          );
        })}
      </Stack>
      {role && (
        <Card>
          <Stack gap={14}>
            <Field label={t('fullName')} value={name} onChangeText={setName} />
            {role === 'admin' ? (
              <Field label={t('schoolName')} value={schoolName} onChangeText={setSchoolName} />
            ) : (
              <Field label={t('schoolCode')} hint={role === 'teacher' ? t('staffCodeHint') : t('studentCodeHint')} value={code}
                onChangeText={(v) => setCode(v.toUpperCase())} autoCapitalize="characters" style={{ textAlign: 'center', letterSpacing: 4 }} />
            )}
            <ErrorText error={error} />
            <Button title={role === 'admin' ? t('createSchool') : t('joinSchool')} onPress={finish} loading={busy} />
          </Stack>
        </Card>
      )}
    </Screen>
  );
}
