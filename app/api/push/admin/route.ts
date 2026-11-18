import { authorized, isReporter, jsonError, pushDb } from '@/app/lib/push';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const templates = [
  '未入力の日報があります。確認して入力をお願いします。',
  '日報の内容を確認してください。',
  '明日の現場予定を確認してください。',
  '会社からのお知らせがあります。',
];
function preparePush() {
  const vapidPublic = process.env.VAPID_PUBLIC_KEY || '';
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY || '';
  if (!vapidPublic || !vapidPrivate) throw new Error('VAPIDの設定が不足しています。');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const webpush = require('web-push');
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:notifications@example.com', vapidPublic, vapidPrivate);
  return webpush;
}
export async function GET(request: Request) {
  if (!authorized(request)) return jsonError('通知管理キーが正しくありません。', 401);
  try {
    const db = pushDb();
    const [{ data: devices, error: deviceError }, { data: history, error: historyError }] = await Promise.all([
      db.from('push_subscriptions').select('reporter'),
      db.from('push_history').select('id, created_at, recipients, message, success_count, failure_count').order('created_at', { ascending: false }).limit(30),
    ]);
    if (deviceError || historyError) throw deviceError || historyError;
    const counts: Record<string, number> = {};
    for (const device of devices || []) counts[device.reporter] = (counts[device.reporter] || 0) + 1;
    return Response.json({ counts, history: history || [], templates });
  } catch (e) { console.error(e); return jsonError('通知の情報を取得できませんでした。テーブル設定を確認してください。', 500); }
}
export async function POST(request: Request) {
  if (!authorized(request)) return jsonError('通知管理キーが正しくありません。', 401);
  try {
    const { recipients, message } = await request.json();
    const names = Array.isArray(recipients) ? Array.from(new Set(recipients)) : [];
    if (!names.length || names.some((n) => !isReporter(n))) return jsonError('通知先を選択してください。');
    const body = String(message || '').trim();
    if (!body || body.length > 300) return jsonError('本文は1～300文字で入力してください。');
    const db = pushDb();
    const { data: subscriptions, error } = await db.from('push_subscriptions')
      .select('endpoint, reporter, p256dh, auth').in('reporter', names);
    if (error) throw error;
    const webpush = preparePush();
    let successes = 0, failures = 0;
    const stale: string[] = [];
    const errors: string[] = [];
    const sent = await Promise.allSettled((subscriptions || []).map(async (row) => {
      try {
        await webpush.sendNotification({ endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
          JSON.stringify({ title: '大和 日報アプリ', body, url: '/' }), { TTL: 86400 });
        successes++;
      } catch (e: any) {
        failures++;
        if (e?.statusCode === 404 || e?.statusCode === 410) stale.push(row.endpoint);
        else errors.push(`${row.reporter}: ${e?.statusCode || '送信エラー'}`);
      }
    }));
    if (stale.length) await db.from('push_subscriptions').delete().in('endpoint', stale);
    const { error: historyError } = await db.from('push_history').insert({
      recipients: names, message: body, success_count: successes, failure_count: failures,
    });
    if (historyError) throw historyError;
    return Response.json({ success: true, successCount: successes, failureCount: failures,
      unregistered: names.filter(n => !(subscriptions || []).some(s => s.reporter === n)), errors });
  } catch (e) { console.error('push send failed', e); return jsonError('通知の送信に失敗しました。環境設定・テーブルを確認してください。', 500); }
}
