import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName } from '@/components/Icon';
import { Loading } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useT, type TKey } from '@/lib/i18n';
import { fonts, useColors } from '@/lib/theme';
import type { Role } from '@/lib/types';

// Which tabs each role sees, in order.
const TABS: Record<Role, string[]> = {
  student: ['home', 'classes', 'exams', 'tutor', 'grades'],
  teacher: ['home', 'classes', 'exams', 'messages', 'settings'],
  parent: ['home', 'grades', 'messages', 'settings'],
  admin: ['home', 'classes', 'messages', 'settings'],
};
const ALL: { name: string; label: TKey; icon: IconName }[] = [
  { name: 'home', label: 'home', icon: 'home' },
  { name: 'classes', label: 'classes', icon: 'class' },
  { name: 'exams', label: 'exams', icon: 'exam' },
  { name: 'tutor', label: 'tutor', icon: 'bot' },
  { name: 'grades', label: 'progress', icon: 'chart' },
  { name: 'messages', label: 'messages', icon: 'msg' },
  { name: 'settings', label: 'settings', icon: 'gear' },
];

export default function TabsLayout() {
  const { session, profile, loading } = useAuth();
  const { t, rtl } = useT();
  const c = useColors();
  const insets = useSafeAreaInsets();
  if (loading) return <Loading />;
  if (!session || !profile?.role || !profile.school_id) return <Redirect href="/" />;
  const visible = TABS[profile.role];
  // Arabic reads right to left, so the first tab sits on the right.
  const shown = ALL.filter((a) => visible.includes(a.name)).sort((a, b) => visible.indexOf(a.name) - visible.indexOf(b.name));
  const ordered = [...(rtl ? shown.reverse() : shown), ...ALL.filter((a) => !visible.includes(a.name))];

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.brand,
        tabBarInactiveTintColor: c.muted,
        // Arabic glyphs need more vertical room than the default tab bar gives labels.
        tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.line, height: 68 + insets.bottom, paddingTop: 6, paddingBottom: insets.bottom + 8 },
        tabBarLabelStyle: { fontFamily: fonts.bodyMedium, fontSize: 11, lineHeight: 16 },
        sceneStyle: { backgroundColor: c.bg },
      }}
    >
      {ordered.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: t(tab.label),
            href: visible.includes(tab.name) ? undefined : null,
            tabBarIcon: ({ color }) => <Icon name={tab.icon} color={String(color ?? c.muted)} size={23} />,
          }}
        />
      ))}
    </Tabs>
  );
}
