import { useRouter } from 'expo-router';
import { Button, Card, Screen, Txt } from './ui';
import { useAuth } from '@/lib/auth';
import { useT } from '@/lib/i18n';

/** Shown when signed in but the account details could not be loaded (usually a bad connection). */
export function AccountProblem() {
  const { refresh, signOut } = useAuth();
  const { lang, t } = useT();
  const router = useRouter();
  return (
    <Screen>
      <Card style={{ marginTop: 60 }}>
        <Txt v="h2">{lang === 'ar' ? 'مقدرناش نحمّل حسابك' : 'We couldn’t load your account'}</Txt>
        <Txt muted>{lang === 'ar' ? 'اتأكد من الإنترنت وجرّب تاني.' : 'Check your connection and try again.'}</Txt>
        <Button title={t('retry')} onPress={refresh} />
        <Button kind="line" title={t('signOut')} onPress={async () => { await signOut(); router.replace('/'); }} />
      </Card>
    </Screen>
  );
}
