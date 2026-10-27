import '@livekit/components-styles';
import { LiveKitRoom, VideoConference } from '@livekit/components-react';

export type LiveRoomProps = { token: string; serverUrl: string; onLeave: () => void; rtl?: boolean };

/** Full video classroom on the web: camera grid, screen share, chat and device controls (LiveKit). */
export default function LiveRoom({ token, serverUrl, onLeave }: LiveRoomProps) {
  return (
    <div data-lk-theme="default" style={{ height: '100%', minHeight: 520, borderRadius: 14, overflow: 'hidden', background: '#111' }}>
      <LiveKitRoom serverUrl={serverUrl} token={token} connect video audio={false} onDisconnected={onLeave} style={{ height: '100%' }}>
        <VideoConference />
      </LiveKitRoom>
    </div>
  );
}
