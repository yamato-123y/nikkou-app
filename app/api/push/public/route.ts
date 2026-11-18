import { isReporter, jsonError, pushDb } from '@/app/lib/push';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET() {
  const publicKey = process.env.VAPID_PUBLIC_KEY || '';
  if (!publicKey) return jsonError('通知サービスは準備中です。', 503);
  return Response.json({ publicKey }, { headers: { 'Cache-Control': 'no-store' } });
}
export async function POST(request: Request) {
  try {
    const { reporter, subscription } = await request.json();
    if (!isReporter(reporter)) return jsonError('報告者を選択してください。');
    if (!subscription?.endpoint || !/^https:\/\//.test(subscription.endpoint) ||
        !subscription?.keys?.p256dh || !subscription?.keys?.auth ||
        String(subscription.endpoint).length > 2048) return jsonError('通知の登録情報が正しくありません。');
    const { error } = await pushDb().from('push_subscriptions').upsert({
      endpoint: subscription.endpoint, reporter,
      p256dh: subscription.keys.p256dh, auth: subscription.keys.auth,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'endpoint' });
    if (error) throw error;
    return Response.json({ success: true });
  } catch (e) { console.error('push registration failed', e); return jsonError('通知端末を登録できませんでした。', 500); }
}
