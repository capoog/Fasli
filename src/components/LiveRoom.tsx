import { useEffect, useState } from 'react';
import { PermissionsAndroid, Platform, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useT } from '@/lib/i18n';
import { ErrorText, Loading } from './ui';

export type LiveRoomProps = { token: string; serverUrl: string; onLeave: () => void; rtl?: boolean };

const WEB_URL = (process.env.EXPO_PUBLIC_WEB_URL ?? '').replace(/\/$/, '');

/**
 * On iOS and Android the classroom runs the same LiveKit web room inside a WebView, so one
 * implementation serves every platform. The token travels in the URL fragment (never sent to a server).
 */
export default function LiveRoom({ token, serverUrl, onLeave }: LiveRoomProps) {
  const { t } = useT();
  const [ready, setReady] = useState(Platform.OS !== 'android');

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    PermissionsAndroid.requestMultiple([PermissionsAndroid.PERMISSIONS.CAMERA, PermissionsAndroid.PERMISSIONS.RECORD_AUDIO])
      .finally(() => setReady(true));
  }, []);

  if (!WEB_URL) return <ErrorText error={t('liveNeedsWeb')} />;
  if (!ready) return <Loading />;
  const uri = `${WEB_URL}/room#t=${encodeURIComponent(token)}&u=${encodeURIComponent(serverUrl)}`;
  return (
    <View style={{ flex: 1, minHeight: 520, borderRadius: 14, overflow: 'hidden', backgroundColor: '#111' }}>
      <WebView
        source={{ uri }}
        style={{ flex: 1, backgroundColor: '#111' }}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        mediaCapturePermissionGrantType="grant"
        javaScriptEnabled
        domStorageEnabled
        onMessage={(e) => { if (e.nativeEvent.data === 'leave') onLeave(); }}
      />
    </View>
  );
}
