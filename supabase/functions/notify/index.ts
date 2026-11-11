// Sends one web push per device: when a friend reacts to something of yours,
// and when a deadline the app parked for itself comes due.
// Called by the database triggers in supabase-social.sql, section 8.
//
//   supabase secrets set VAPID_PUBLIC=... VAPID_PRIVATE=... PUSH_SECRET=...
//   supabase functions deploy notify --no-verify-jwt
//
// The shared secret stands in for the JWT: only the database knows it.
import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const SECRET = Deno.env.get('PUSH_SECRET') ?? '';
const db = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

webpush.setVapidDetails(
  'mailto:' + (Deno.env.get('VAPID_MAIL') ?? 'tracker@example.com'),
  Deno.env.get('VAPID_PUBLIC') ?? '',
  Deno.env.get('VAPID_PRIVATE') ?? ''
);

const LINE: Record<string, string> = {
  like: ' liked your workout',
  comment: ' commented on your workout',
  reply: ' replied to your comment',
  thread: ' replied in a thread you are in',
  follow: ' started following you'
};

// A notification with nobody behind it: the app asked for this one itself,
// because a sleeping phone cannot run its own timers.
const SELF: Record<string, { title: string; body: string }> = {
  rest: { title: 'Rest over', body: 'Back to it \u2014 next set.' },
  stale: {
    title: 'Tracker',
    body: 'Finished your workout? You still have a session in progress.'
  },
  // sent by the database on Sundays, to whoever trained that week
  recap: { title: 'Tracker', body: 'Your week is wrapped. Tap to see how it went.' }
};

Deno.serve(async (req) => {
  if (req.headers.get('x-push-secret') !== SECRET) {
    return new Response('no', { status: 401 });
  }

  const { kind, target, actor, post_user, post_id } = await req.json();
  const self = SELF[kind as string];
  if (!kind || !target || (!self && (!actor || target === actor))) {
    return new Response('skip', { status: 200 });
  }

  const [{ data: who }, { data: subs }] = await Promise.all([
    self
      ? Promise.resolve({ data: null })
      : db.from('profiles').select('username').eq('user_id', actor).maybeSingle(),
    db.from('push_subs').select('endpoint,p256dh,auth').eq('user_id', target)
  ]);
  if (!subs?.length) return new Response('nobody listening', { status: 200 });

  const body = self ? self.body : (who?.username ?? 'Someone') + (LINE[kind] ?? '');
  // where a tap should land: the session for a like, its comments for a comment
  // or a reply, the person for a follow. Its own notification opens the app.
  const go = self
    ? (kind === 'recap' ? { go: 'r' } : {})
    : kind === 'follow'
      ? { go: 'u', id: actor }
      : { go: kind === 'like' ? 'w' : 'c', pu: post_user, pi: post_id };
  const payload = JSON.stringify({
    title: self ? self.title : 'Tracker', body, tag: kind, ...go
  });

  // a subscription the browser has thrown away answers 404 or 410, and is
  // not worth keeping around
  const dead: string[] = [];
  await Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload
      );
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) dead.push(s.endpoint);
    }
  }));
  if (dead.length) await db.from('push_subs').delete().in('endpoint', dead);

  return new Response('sent', { status: 200 });
});
