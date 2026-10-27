import { Redirect } from 'expo-router';
import { AccountProblem } from '@/components/AccountProblem';
import { Loading } from '@/components/ui';
import { useAuth } from '@/lib/auth';

/** Sends people to the right place: welcome, finishing setup, or the app. */
export default function Index() {
  const { session, profile, loading, profileTried } = useAuth();
  if (loading) return <Loading />;
  if (!session) return <Redirect href="/welcome" />;
  if (!profile) return profileTried ? <AccountProblem /> : <Loading />;
  if (!profile.role || !profile.school_id) return <Redirect href="/onboard" />;
  return <Redirect href="/home" />;
}
