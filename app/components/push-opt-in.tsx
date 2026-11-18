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
  const [expanded, setExpanded] = useState(true);
  const [registeredReporter, setRegisteredReporter] = useState('');
  const [unreadCount, setUnreadCount] = useState<number | null>(null);
  useEffect(() => {
    setStatus(''); setSubscribed(false); setExpanded(true); setRegisteredReporter('');
    if (!reporter || !('serviceWorker' in navigator) || !('PushManager' in window)) return;
    let mounted = true;
    let previousReporter = '';
    try { previousReporter = localStorage.getItem('yamato-push-registered-reporter') || ''; } catch (_) {}
    navigator.serviceWorker.getRegistration('/')
      .then(r => r?.pushManager.getSubscription())
      .then(subscription => {
        if (!mounted) return;
        const active = Boolean(subscription) && 'Notification' in window && Notification.permission === 'granted';
        setSubscribed(active);
        setRegisteredReporter(previousReporter);
        // A different reporter must re-register this smartphone before showing as configured.
        setExpanded(!active || Boolean(previousReporter && previousReporter !== reporter));
      }).catch(() => {});
    return () => { mounted = false; };
  }, [reporter]);
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const receive = (event: MessageEvent) => {
      if (event.data?.type === 'yamato-push-unread' && Number.isFinite(event.data.count)) {
        setUnreadCount(event.data.count);
      }
    };
    navigator.serviceWorker.addEventListener('message', receive);
    const requestCount = async () => {
      const reg = await navigator.serviceWorker.getRegistration('/');
      reg?.active?.postMessage({ type: 'yamato-push-get-unread' });
    };
    requestCount().catch(() => {});
    return () => navigator.serviceWorker.removeEventListener('message', receive);
  }, [reporter]);
  const markRead = async () => {
    try {
      const reg = await navigator.serviceWorker.getRegistration('/');
      reg?.active?.postMessage({ type: 'yamato-push-read-all' });
    } catch (_) { setStatus('未確認件数の更新に失敗しました。'); }
  };
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
      setSubscribed(true); setRegisteredReporter(reporter); setExpanded(false);
      try { localStorage.setItem('yamato-push-registered-reporter', reporter); } catch (_) {}
      setStatus('');
      registration.active?.postMessage({ type: 'yamato-push-get-unread' });
    } catch (e: any) { setStatus(e.message || '登録できませんでした。'); }
    finally { setBusy(false); }
  };
  return <div className={subscribed && !expanded
    ? "rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 space-y-2"
    : "rounded-2xl border border-emerald-200 bg-emerald-50 p-4 space-y-3"}>
    {subscribed && !expanded ? <>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="font-bold text-emerald-900 text-sm">✅ {registeredReporter === reporter ? '通知設定済み' : '通知は許可済み'}</span>
        <button type="button" onClick={() => setExpanded(true)} className="text-xs font-bold text-emerald-800 rounded-lg border border-emerald-300 bg-white px-3 py-1.5">設定を確認・変更</button>
      </div>
      {unreadCount !== null && <div className="flex items-center gap-3 flex-wrap text-xs text-slate-700">
        <span>未確認の通知：<strong>{unreadCount}件</strong></span>
        {unreadCount > 0 && <button type="button" onClick={markRead} className="rounded-lg border border-emerald-300 bg-white px-2 py-1 font-bold text-emerald-800">確認済みにする</button>}
      </div>}
      {registeredReporter !== reporter && <div className="text-xs text-amber-800">通知先の登録を確認してください。「設定を確認・変更」から登録できます。</div>}
    </> : <>
      <div className="font-bold text-slate-900">🔔 会社からの通知</div>
      <div className="text-sm text-slate-700">このスマホで会社からのお知らせを受け取れます。</div>
      <div className="flex gap-2 flex-wrap items-center">
        <button type="button" disabled={busy} onClick={enable} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 font-bold disabled:opacity-50">{busy ? '設定中…' : subscribed ? '通知先を設定する' : '通知を受け取る'}</button>
        {subscribed && <button type="button" onClick={() => setExpanded(false)} className="rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm font-bold text-slate-600">閉じる</button>}
      </div>
      {unreadCount !== null && <div className="flex items-center gap-3 flex-wrap text-sm text-slate-700">
        <span>未確認の通知：<strong>{unreadCount}件</strong></span>
        {unreadCount > 0 && <button type="button" onClick={markRead} className="rounded-lg border border-emerald-300 bg-white px-3 py-1 font-bold text-emerald-800">確認済みにする</button>}
      </div>}
      {!supports && <div className="text-xs text-amber-800">iPhoneはSafariからホーム画面に追加して、ホーム画面のアイコンで開いてください。</div>}
      <div className="text-xs text-slate-500">報告者を変更した場合は、通知先を設定し直してください。</div>
    </>}
    {status && <div role="status" className="text-sm text-red-700">{status}</div>}
  </div>;
}
