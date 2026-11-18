'use client';
import { useState } from 'react';
const PEOPLE = ['岩橋','寺岡','塩澤','徳本','吉田','湯浅','島村','鳥羽','嶋田'];
const TEMPLATES = [
 '未入力の日報があります。確認して入力をお願いします。',
 '日報の内容を確認してください。',
 '明日の現場予定を確認してください。',
 '会社からのお知らせがあります。',
];
type History = { id: number; created_at: string; recipients: string[]; message: string; success_count: number; failure_count: number };
export default function PushAdmin({ onClose }: { onClose: () => void }) {
  const [key, setKey] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState(TEMPLATES[0]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [history, setHistory] = useState<History[]>([]);
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState('最初に通知管理キーを入力して「接続確認」を押してください。');
  const headers = () => ({ 'Content-Type': 'application/json', 'x-push-admin-key': key });
  const refresh = async () => {
    if (!key) { setInfo('通知管理キーを入力してください。'); return; }
    setBusy(true);
    try {
      const res = await fetch('/api/push/admin', { headers: headers(), cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '接続できませんでした。');
      setCounts(data.counts || {}); setHistory(data.history || []); setInfo('通知先と履歴を読み込みました。');
    } catch (e: any) { setInfo(e.message); } finally { setBusy(false); }
  };
  const send = async () => {
    if (!selected.length || !message.trim() || !key) { setInfo('送信先・本文・通知管理キーを確認してください。'); return; }
    if (!window.confirm(`${selected.join('・')} の ${selected.length}名に通知を送信しますか？\n\n${message}`)) return;
    setBusy(true);
    try {
      const res = await fetch('/api/push/admin', { method: 'POST', headers: headers(), body: JSON.stringify({ recipients: selected, message }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '送信に失敗しました。');
      setInfo(`送信処理完了：成功 ${data.successCount}端末、失敗 ${data.failureCount}端末。${data.unregistered?.length ? `未登録：${data.unregistered.join('・')}。` : ''}実際の受信は端末設定・通信状態によります。`);
      await refresh();
    } catch (e: any) { setInfo(e.message); } finally { setBusy(false); }
  };
  return <div className="fixed inset-0 z-[9999] bg-black/60 p-3 md:p-8 overflow-y-auto" role="dialog" aria-modal="true" aria-label="プッシュ通知の送信">
    <div className="max-w-3xl mx-auto bg-white rounded-2xl p-5 space-y-5 shadow-xl text-slate-900">
      <div className="flex justify-between items-center"><h2 className="text-xl font-bold">🔔 スマホへ通知を送信</h2><button type="button" className="rounded-lg bg-slate-100 px-4 py-2" onClick={onClose}>閉じる ✕</button></div>
      <p className="text-sm text-slate-600">管理者が選んだ日報担当者へ、定型文または自由入力で通知します。自動送信はありません。</p>
      <div className="space-y-2"><label className="text-sm font-bold block">通知管理キー（別途Renderに設定する専用キー）</label><div className="flex gap-2"><input type="password" autoComplete="off" value={key} onChange={e=>setKey(e.target.value)} className="min-w-0 flex-1 rounded-lg border p-3" placeholder="通知管理キー" /><button type="button" onClick={refresh} disabled={busy} className="rounded-lg bg-slate-800 text-white px-4">接続確認</button></div></div>
      <div><div className="flex justify-between mb-2"><strong>通知先を選択</strong><button type="button" className="text-blue-700 underline" onClick={()=>setSelected(selected.length===PEOPLE.length?[]:[...PEOPLE])}>{selected.length===PEOPLE.length?'全解除':'全員選択'}</button></div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">{PEOPLE.map(name=><label key={name} className="rounded-lg border p-3 flex items-center gap-2"><input type="checkbox" checked={selected.includes(name)} onChange={e=>setSelected(old=>e.target.checked?[...old,name]:old.filter(x=>x!==name))}/><span>{name}</span><span className="text-xs text-slate-500">({counts[name]||0}台)</span></label>)}</div>
      </div>
      <div className="space-y-2"><label className="font-bold block">定型文</label><select className="w-full rounded-lg border p-3" value={TEMPLATES.includes(message)?message:'other'} onChange={e=>{if(e.target.value!=='other')setMessage(e.target.value)}}>{TEMPLATES.map(t=><option key={t} value={t}>{t}</option>)}<option value="other">自由入力・編集</option></select><label className="font-bold block">通知本文（編集できます・300文字まで）</label><textarea value={message} maxLength={300} onChange={e=>setMessage(e.target.value)} rows={4} className="w-full rounded-lg border p-3" /></div>
      <div role="status" className="bg-slate-100 rounded-lg p-3 text-sm whitespace-pre-wrap">{info}</div>
      <button type="button" onClick={send} disabled={busy||!selected.length||!message.trim()||!key} className="w-full bg-blue-700 text-white rounded-xl py-3 font-bold disabled:opacity-40">{busy?'処理中…':`選択した ${selected.length}名に送信`}</button>
      <div><h3 className="font-bold mb-2">送信履歴（最新30件）</h3><div className="space-y-2 max-h-56 overflow-auto">{history.map(h=><div className="rounded-lg border p-3 text-sm" key={h.id}><div className="text-slate-500">{new Date(h.created_at).toLocaleString('ja-JP')}｜{h.recipients?.join('・')}｜成功 {h.success_count}台・失敗 {h.failure_count}台</div><div>{h.message}</div></div>)}</div></div>
    </div>
  </div>;
}
