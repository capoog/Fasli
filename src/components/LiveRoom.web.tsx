import '@livekit/components-styles';
import { LiveKitRoom, VideoConference } from '@livekit/components-react';
import { useState } from 'react';

export type LiveRoomProps = { token: string; serverUrl: string; onLeave: () => void; rtl?: boolean };

/** Full video classroom on the web: camera grid, screen share, chat and device controls (LiveKit). */
export default function LiveRoom({ token, serverUrl, onLeave, rtl }: LiveRoomProps) {
  const [error, setError] = useState<string | null>(null);
  return (
    <div data-lk-theme="default" style={{ position: 'relative', height: '100%', minHeight: 520, borderRadius: 14, overflow: 'hidden', background: '#111' }}>
      <LiveKitRoom
        serverUrl={serverUrl}
        token={token}
        connect
        video
        audio={false}
        onDisconnected={onLeave}
        onError={(e) => setError(e?.message || String(e))}
        style={{ height: '100%' }}
      >
        <VideoConference />
      </LiveKitRoom>
      {error && (
        <div
          dir={rtl ? 'rtl' : 'ltr'}
          style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24, background: 'rgba(10,14,22,.92)', color: '#fff', textAlign: 'center', fontFamily: 'inherit' }}
        >
          <div style={{ fontSize: 16, fontWeight: 600 }}>{rtl ? 'تعذّر الاتصال بالحصة' : 'Could not connect to the class'}</div>
          <div style={{ fontSize: 13, opacity: 0.75, direction: 'ltr', wordBreak: 'break-word' }}>{error}</div>
          <button
            onClick={() => location.reload()}
            style={{ marginTop: 4, padding: '10px 18px', borderRadius: 10, border: 0, background: '#1D5C8C', color: '#fff', fontSize: 14, cursor: 'pointer' }}
          >
            {rtl ? 'حاول تاني' : 'Try again'}
          </button>
        </div>
      )}
    </div>
  );
}
