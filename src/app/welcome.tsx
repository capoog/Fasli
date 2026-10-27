import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { LogoMark } from '@/components/Logo';
import { Button, Card, ErrorText, Screen, Seg, Stack, Txt } from '@/components/ui';
import { useT } from '@/lib/i18n';
import { configured } from '@/lib/supabase';
import { fonts, useColors } from '@/lib/theme';
import type { Lang } from '@/lib/types';

export default function Welcome() {
  const { t, lang, setLang } = useT();
  const router = useRouter();
  const c = useColors();
  return (
    <Screen>
      <View style={{ alignItems: 'center', gap: 14, paddingTop: 48, paddingBottom: 12 }}>
        <LogoMark size={96} />
        <Txt center style={{ fontFamily: fonts.display, fontSize: 40, lineHeight: 52 }}>{lang === 'ar' ? 'فصلي' : 'Fasli'}</Txt>
        <Txt center style={{ fontFamily: fonts.displaySemi, letterSpacing: 6, fontSize: 12, color: c.muted }}>{lang === 'ar' ? 'FASLI' : 'فصلي'}</Txt>
        <Txt center muted style={{ maxWidth: 340 }}>{t('tagline')}</Txt>
      </View>
      <Seg<Lang> value={lang} onChange={setLang} options={[{ value: 'ar', label: 'العربية' }, { value: 'en', label: 'English' }]} />
      <Card>
        <Stack gap={10}>
          <Button title={t('createAccount')} onPress={() => router.push('/auth?mode=signup')} disabled={!configured} />
          <Button title={t('signIn')} kind="ghost" onPress={() => router.push('/auth?mode=signin')} disabled={!configured} />
        </Stack>
      </Card>
      {!configured && <ErrorText error={t('notConfigured')} />}
      <Stack gap={8} style={{ paddingTop: 8 }}>
        {(['student', 'teacher', 'parent', 'admin'] as const).map((r) => (
          <Txt key={r} v="small" muted center>{`${t(r)} · ${t(`${r}D`)}`}</Txt>
        ))}
      </Stack>
    </Screen>
  );
}
