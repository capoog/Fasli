// Issues a LiveKit access token for a class's live session and records attendance.
// Secrets: LIVEKIT_URL (wss://…livekit.cloud), LIVEKIT_API_KEY, LIVEKIT_API_SECRET.
import { handler, need, classRole, HttpError } from '../_shared/http.ts';

const b64url = (data: Uint8Array | string) => {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  let s = '';
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

async function sign(payload: Record<string, unknown>, secret: string) {
  const head = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64url(JSON.stringify(payload));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${head}.${body}`)));
  return `${head}.${body}.${b64url(sig)}`;
}

Deno.serve(handler(async ({ userId, admin, body }) => {
  const url = Deno.env.get('LIVEKIT_URL'), apiKey = Deno.env.get('LIVEKIT_API_KEY'), secret = Deno.env.get('LIVEKIT_API_SECRET');
  if (!url || !apiKey || !secret) throw new HttpError(503, 'Live video is not set up yet. Add the LiveKit keys in Supabase secrets.');

  const { data: s } = await admin.from('live_sessions').select('id, class_id, status, title').eq('id', String(body.session_id ?? '')).maybeSingle();
  const session = need(s, 'Session not found.');
  const role = await classRole(admin, userId, session.class_id);
  if (session.status === 'ended') throw new HttpError(400, 'This class has ended.');
  if (role === 'student' && session.status !== 'live') throw new HttpError(400, 'The teacher has not started the class yet.');
  if (role === 'teacher' && session.status !== 'live') await admin.from('live_sessions').update({ status: 'live' }).eq('id', session.id);
  if (role === 'student') await admin.from('attendance').upsert({ session_id: session.id, student_id: userId }, { onConflict: 'session_id,student_id', ignoreDuplicates: true });

  const { data: me } = await admin.from('profiles').select('full_name').eq('id', userId).single();
  const now = Math.floor(Date.now() / 1000);
  const token = await sign({
    iss: apiKey,
    sub: userId,
    name: me?.full_name || 'Fasli',
    nbf: now - 10,
    exp: now + 4 * 3600,
    metadata: JSON.stringify({ role }),
    video: {
      room: `fasli-${session.id}`,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      roomAdmin: role === 'teacher',
    },
  }, secret);
  return { token, url, room: `fasli-${session.id}`, role, title: session.title };
}));
