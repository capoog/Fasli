import { Redirect, Stack } from 'expo-router';
import { AccountProblem } from '@/components/AccountProblem';
import { Loading } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useColors } from '@/lib/theme';

/** Everything in here needs a signed-in person who has finished joining a school. */
export default function AppLayout() {
  const { session, profile, loading, profileTried } = useAuth();
  const c = useColors();
  if (loading || (session && !profile && !profileTried)) return <Loading />;
  if (session && !profile) return <AccountProblem />;
  if (!session || !profile?.role || !profile.school_id) return <Redirect href="/" />;
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }} />;
}
