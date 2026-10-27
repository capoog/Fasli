import { Alexandria_600SemiBold, Alexandria_700Bold } from '@expo-google-fonts/alexandria';
import { IBMPlexSansArabic_400Regular, IBMPlexSansArabic_500Medium, IBMPlexSansArabic_600SemiBold } from '@expo-google-fonts/ibm-plex-sans-arabic';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ToastProvider, Loading } from '@/components/ui';
import { AuthProvider } from '@/lib/auth';
import { LangProvider, useT } from '@/lib/i18n';
import { useColors } from '@/lib/theme';

function Shell() {
  const c = useColors();
  const { ready } = useT();
  const [fontsLoaded] = useFonts({ Alexandria_600SemiBold, Alexandria_700Bold, IBMPlexSansArabic_400Regular, IBMPlexSansArabic_500Medium, IBMPlexSansArabic_600SemiBold });
  if (!fontsLoaded || !ready) return <Loading />;
  return (
    <ToastProvider>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }} />
    </ToastProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <LangProvider>
        <AuthProvider>
          <Shell />
        </AuthProvider>
      </LangProvider>
    </SafeAreaProvider>
  );
}
