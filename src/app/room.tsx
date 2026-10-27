import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import LiveRoom from '@/components/LiveRoom';
import { Txt } from '@/components/ui';

/**
 * Bare classroom page used inside the mobile apps' WebView: /room#t=<token>&u=<livekit url>.
 * It needs no sign-in because the short-lived LiveKit token is the permission.
 */
export default function Room() {
  const [params, setParams] = useState<{ t: string; u: string } | null>(null);
  const [left, setLeft] = useState(false);
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const h = new URLSearchParams(window.location.hash.slice(1));
    const t = h.get('t'), u = h.get('u');
    if (t && u) setParams({ t, u });
  }, []);
  const leave = () => {
    setLeft(true);
    const w = window as unknown as { ReactNativeWebView?: { postMessage: (m: string) => void } };
    w.ReactNativeWebView?.postMessage('leave');
  };
  if (left || !params) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111' }}><Txt color="#fff" center>{left ? '✓' : '…'}</Txt></View>;
  }
  return <View style={{ flex: 1, backgroundColor: '#111' }}><LiveRoom token={params.t} serverUrl={params.u} onLeave={leave} /></View>;
}
