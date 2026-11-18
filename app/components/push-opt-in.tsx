'use client';
import { useEffect, useState } from 'react';
function b64key(value: string) {
  const padding = '='.repeat((4 - value.length % 4) % 4);
  const raw = atob((value + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, char => char.charCodeAt(0));
}
export default function PushOptIn({ reporter }: { reporter: string }) {
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  useEffect(() => {
    setStatus(''); setSubscribed(false);
    if (!reporter || !('serviceWorker' in navigator) || !('PushManager' in window)) return;
    navigator.serviceWorker.getRegistration('/').then(r => r?.pushManager.getSubscription()).then(s => setSubscribed(Boolean(s))).catch(() => {});
  }, [reporter]);
  if (!reporter) return null;
  const supports = typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  const enable = async () => {
    setBusy(true); setStatus('');
    try {
      if (!supports) throw new Error('このブラウザは通知に対応していません。iPhoneはSafariからホーム画面に追加して開いてください。');
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') throw new Error('通知が許可されていません。スマホの設定を確認してください。');
      const res = await fetch('/api/push/public', { cache: 'no-store' });
      const config = await res.json();
      if (!res.ok) throw new Error(config.error || '通知設定を取得できませんでした。');
      const registration = await navigator.serviceWorker.register('/push-sw.js', { scope: '/' });
      await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64key(config.publicKey) });
      const saved = await fetch('/api/push/public', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reporter, subscription: subscription.toJSON() }) });
      const payload = await saved.json();
      if (!saved.ok) throw new Error(payload.error || '登録に失敗しました。');
      setSubscribed(true); setStatus(`${reporter}さんへの通知を受け取る設定が完了しました。`);
    } catch (e: any) { setStatus(e.message || '登録できませんでした。'); }
    finally { setBusy(false); }
  };
  return <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 space-y-2">
    <div className="font-bold text-slate-900">🔔 会社からのスマホ通知</div>
    <div className="text-sm text-slate-600">最初に1回だけ、通知を受け取る設定をしてください。通知先：{reporter}さん</div>
    <button type="button" disabled={busy} onClick={enable} className="rounded-xl bg-blue-700 text-white px-4 py-2.5 font-bold disabled:opacity-50">{busy ? '設定中…' : subscribed ? '通知の登録を更新する' : 'スマホ通知を許可する'}</button>
    {status && <div role="status" className="text-sm text-slate-800">{status}</div>}
    {!supports && <div className="text-xs text-amber-800">iPhoneはSafariでホーム画面に追加した後、ホーム画面のアイコンから開いてください。</div>}
    <div className="text-xs text-slate-500">報告者を変更した場合は、このボタンで通知先を更新してください。</div>
  </div>;
}
