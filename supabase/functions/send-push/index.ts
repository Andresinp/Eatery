// send-push — delivers one notification row to the recipient's phones through Expo Push.
//
// Called by the dispatch_push trigger (pg_net) with { notification_id }, authenticated by a shared
// secret, not a user JWT. Respects the person's notification preferences (Settings →
// Notifications). Text is rendered here in English from the row; the app renders the same rows
// through i18n in the Inbox.
//
// Deploy: supabase functions deploy send-push --no-verify-jwt
// Secrets: PUSH_WEBHOOK_SECRET=<random>; then, in SQL (values never committed):
//   insert into private.secrets values ('push_function_url', 'https://<ref>.supabase.co/functions/v1/send-push');
//   insert into private.secrets values ('push_webhook_secret', '<same random value>');
import { admin } from '../_shared/http.ts';

type Prefs = { bookings?: boolean; reminders?: boolean; messages?: boolean; reviews?: boolean; marketing?: boolean };

// Which preference switch governs each notification type.
const PREF_FOR_TYPE: Record<string, keyof Prefs> = {
  booking_confirmed: 'bookings',
  booking_received: 'bookings',
  order_cancelled: 'bookings',
  no_show: 'bookings',
  reminder: 'reminders',
  message: 'messages',
  review_request: 'reviews',
  review_received: 'reviews',
  system: 'bookings',
};

Deno.serve(async (req) => {
  const secret = Deno.env.get('PUSH_WEBHOOK_SECRET');
  if (!secret || req.headers.get('Authorization') !== `Bearer ${secret}`) return new Response('unauthorized', { status: 401 });
  const body: unknown = await req.json().catch(() => null);
  const id = typeof body === 'object' && body !== null && 'notification_id' in body ? String(body.notification_id) : null;
  if (!id) return new Response('missing notification_id', { status: 400 });

  const db = admin();
  const { data: n, error } = await db.from('notifications').select('user_id, type, title, body, data').eq('id', id).single();
  if (error || !n) return new Response(`notification not found: ${error?.message ?? id}`, { status: 404 });

  const { data: profile } = await db.from('profiles').select('notification_prefs').eq('id', n.user_id).maybeSingle();
  const prefs = (profile?.notification_prefs ?? {}) as Prefs;
  const pref = PREF_FOR_TYPE[n.type] ?? 'bookings';
  if (prefs[pref] === false) return new Response('muted by preference', { status: 200 });

  const { data: tokens, error: tokenError } = await db.from('push_tokens').select('token').eq('user_id', n.user_id);
  if (tokenError) return new Response(`tokens: ${tokenError.message}`, { status: 500 });
  if (!tokens?.length) return new Response('no devices', { status: 200 });

  const data = (n.data ?? {}) as Record<string, unknown>;
  const messages = tokens.map((t) => ({
    to: t.token,
    title: n.title,
    body: n.body ?? '',
    sound: 'default',
    data: { type: n.type, order_id: data.order_id ?? null, listing_id: data.listing_id ?? null },
  }));

  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(messages),
  });
  const result = (await res.json().catch(() => null)) as { data?: { status: string; details?: { error?: string } }[] } | null;
  if (!res.ok) return new Response(`expo push failed: ${res.status}`, { status: 502 });

  // Forget tokens Expo reports as gone, so they are not retried forever.
  const dead = (result?.data ?? [])
    .map((r, i) => (r.status === 'error' && r.details?.error === 'DeviceNotRegistered' ? tokens[i]?.token : null))
    .filter((t): t is string => !!t);
  if (dead.length) await db.from('push_tokens').delete().in('token', dead);
  return new Response('sent', { status: 200 });
});
