// delete-account — App Store guideline 5.1.1(v): a person can delete their account from inside
// the app. Before the auth user is deleted (which cascades to the profile, listings, orders,
// messages, notifications, push tokens and blocks), every upcoming booking that involves them —
// as guest or as host — is cancelled and its deposit refunded, so nobody is left holding a
// booking with a person who no longer exists. Their uploaded photos are removed from Storage.
//
// Deploy: supabase functions deploy delete-account      Secrets: STRIPE_SECRET_KEY (refunds)
import { admin, caller, CORS, fail, json } from '../_shared/http.ts';
import { refundDeposit } from '../_shared/stripe.ts';

async function removeFolder(db: ReturnType<typeof admin>, bucket: string, userId: string): Promise<void> {
  const { data: files, error } = await db.storage.from(bucket).list(userId, { limit: 1000 });
  if (error) {
    console.error(`list ${bucket}`, error.message);
    return;
  }
  if (!files?.length) return;
  const { error: rerr } = await db.storage.from(bucket).remove(files.map((f) => `${userId}/${f.name}`));
  if (rerr) console.error(`remove ${bucket}`, rerr.message);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return fail('method_not_allowed', 405);
  const user = await caller(req);
  if (!user) return fail('not_signed_in', 401);

  const db = admin();
  const { data: orders, error } = await db.rpc('server_orders_to_refund', { p_user: user.id });
  if (error) return fail('unknown', 500, error);

  for (const order of (orders ?? []) as { order_id: string; payment_intent_id: string | null; deposit: number; guest_id: string }[]) {
    const refundable = !!order.payment_intent_id && Number(order.deposit) > 0;
    if (refundable) {
      try {
        await refundDeposit(order.payment_intent_id as string, order.order_id);
      } catch (refundError) {
        // Do not delete while money is owed back; the person can retry, refunds are idempotent.
        return fail('payments_unavailable', 502, refundError);
      }
    }
    const isGuest = order.guest_id === user.id;
    const { error: uerr } = await db
      .from('orders')
      .update({ status: isGuest ? 'cancelled_by_guest' : 'cancelled_by_host', deposit_refunded: refundable })
      .eq('id', order.order_id)
      .eq('status', 'confirmed');
    if (uerr) return fail('unknown', 500, uerr);
  }

  await removeFolder(db, 'avatars', user.id);
  await removeFolder(db, 'listing-photos', user.id);

  const { error: derr } = await db.auth.admin.deleteUser(user.id);
  if (derr) return fail('unknown', 500, derr);
  return json({ deleted: true });
});
