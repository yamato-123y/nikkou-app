'use client';
import { useState, useEffect } from 'react';

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [isAuthed, setIsAuthed] = useState(false);
  const [reports, setReports] = useState<any[]>([]);

  // 設定データ
  const [locations, setLocations] = useState<{name: string, price: number}[]>([]);
  const [leases, setLeases] = useState<{ name: string; price: number }[]>([]);
  const [disposalLocations, setDisposalLocations] = useState<{ location: string; item: string; unit: string; price: number }[]>([]);
  const [managers, setManagers] = useState<{ name: string; price: number }[]>([]);
  const [workers, setWorkers] = useState<{ name: string; price: number }[]>([]);

  // 新規登録用ステート
  const [newLocName, setNewLocName] = useState('');
  const [newLocPrice, setNewLocPrice] = useState(0);
  const [newMgrName, setNewMgrName] = useState('');
  const [newMgrPrice, setNewMgrPrice] = useState(20000);
  const [newWrkName, setNewWrkName] = useState('');
  const [newWrkPrice, setNewWrkPrice] = useState(15000);

  const fetchData = async () => {
    try {
      const [resR, resS] = await Promise.all([fetch('/api/reports'), fetch('/api/settings')]);
      if (resR.ok) setReports(await resR.json());
      if (resS.ok) {
        const s = await resS.json();
        setLocations(s.locations?.map((l:any)=>typeof l==='string'?{name:l, price:0}:l)||[]);
        setLeases(s.leases||[]);
        setDisposalLocations(s.disposalLocations||[]);
        setManagers(s.managers||[]);
        setWorkers(s.workers||[]);
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => { if (isAuthed) fetchData(); }, [isAuthed]);

  const saveSettings = async (newData: any) => {
    await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newData) });
    fetchData();
  };

  const downloadCSV = () => {
    const headers = ["日付", "現場", "責任者", "作業者", "軽油L", "ETC", "作業内容"];
    const csv = [headers.join(','), ...reports.map(r => [r.date, r.location, r.manager, (r.workers||[]).join('/'), r.fuel, r.etcPrice, r.workDescription].join(','))].join('\n');
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = '日報データ.csv'; a.click();
  };

  if (!isAuthed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm space-y-4">
          <h1 className="text-xl font-bold text-center">🔒 管理画面ログイン</h1>
          <input type="password" placeholder="パスワード" className="w-full p-3 border rounded-xl" onChange={e => setPassword(e.target.value)} />
          <button onClick={() => (password === 'yamato123' || password === 'yamato') && setIsAuthed(true)} className="w-full bg-[#E56312] text-white py-3 rounded-xl font-bold">ログイン</button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-slate-100 min-h-screen space-y-8 max-w-5xl mx-auto">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm">
        <h1 className="text-xl font-black">📊 管理ダッシュボード</h1>
        <button onClick={downloadCSV} className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold text-sm">CSVダウンロード</button>
      </div>

      {/* マスタ登録エリア */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border space-y-3">
          <h2 className="font-bold text-sm">🏢 現場・請負金額追加</h2>
          <div className="flex gap-2">
            <input placeholder="現場名" value={newLocName} onChange={e=>setNewLocName(e.target.value)} className="w-full p-2 border rounded-lg" />
            <input type="number" value={newLocPrice} onChange={e=>setNewLocPrice(Number(e.target.value))} className="w-24 p-2 border rounded-lg" />
            <button onClick={() => { const up=[...locations, {name:newLocName, price:newLocPrice}]; setLocations(up); saveSettings({locations:up, managers, workers, leases, disposalLocations}); }} className="bg-[#E56312] text-white px-4 rounded-lg font-bold">追加</button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border space-y-3">
          <h2 className="font-bold text-sm">👤 責任者・日額単価追加</h2>
          <div className="flex gap-2">
            <input placeholder="名前" value={newMgrName} onChange={e=>setNewMgrName(e.target.value)} className="w-full p-2 border rounded-lg" />
            <input type="number" value={newMgrPrice} onChange={e=>setNewMgrPrice(Number(e.target.value))} className="w-24 p-2 border rounded-lg" />
            <button onClick={() => { const up=[...managers, {name:newMgrName, price:newMgrPrice}]; setManagers(up); saveSettings({locations, managers:up, workers, leases, disposalLocations}); }} className="bg-[#E56312] text-white px-4 rounded-lg font-bold">追加</button>
          </div>
        </div>
      </div>

      {/* レポート一覧 */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border">
        <h2 className="text-lg font-black mb-4">📥 受信日報 ({reports.length}件)</h2>
        <div className="space-y-3">
          {reports.map((r, i) => (
            <div key={i} className="p-4 border rounded-xl bg-slate-50 flex justify-between items-center text-sm">
              <span className="font-bold">{r.date} - {r.location}</span>
              <span className="text-slate-500">{r.manager} / {r.workers?.join(',')}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
