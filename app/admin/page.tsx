'use client';
import { useState, useEffect } from 'react';

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [isAuthed, setIsAuthed] = useState(false);
  const [reports, setReports] = useState<any[]>([]);

  // マスタデータ
  const [locations, setLocations] = useState<string[]>([]);
  const [leases, setLeases] = useState<{ name: string; price: number }[]>([]);
  const [companyMachines, setCompanyMachines] = useState<{ name: string; price: number }[]>([]);
  const [vehicles, setVehicles] = useState<{ name: string; price: number }[]>([]);
  const [disposalLocations, setDisposalLocations] = useState<{ location: string; item: string; unit: string; price: number }[]>([]);
  const [scrapLocations, setScrapLocations] = useState<{ location: string; item: string; unit: string; price: number }[]>([]);
  const [managers, setManagers] = useState<{ name: string; price: number }[]>([]);
  const [workers, setWorkers] = useState<{ name: string; price: number }[]>([]);

  // 新規追加用の一時状態
  const [newDispLoc, setNewDispLoc] = useState('');
  const [newDispItem, setNewDispItem] = useState('ガラ');
  const [newDispUnit, setNewDispUnit] = useState('t');
  const [newDispPrice, setNewDispPrice] = useState(3000);

  const [newScrapLoc, setNewScrapLoc] = useState('');
  const [newScrapItem, setNewScrapItem] = useState('鉄');
  const [newScrapUnit, setNewScrapUnit] = useState('t');
  const [newScrapPrice, setNewScrapPrice] = useState(20000);

  // 編集用状態
  const [editingReportIndex, setEditingReportIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>({});

  const fetchData = async () => {
    const [resR, resS] = await Promise.all([fetch('/api/reports'), fetch('/api/settings')]);
    if (resR.ok) setReports(await resR.json());
    if (resS.ok) {
      const s = await resS.json();
      setLocations(s.locations || []);
      setLeases(s.leases || []);
      setCompanyMachines(s.companyMachines || []);
      setVehicles(s.vehicles || []);
      setDisposalLocations(s.disposalLocations || []);
      setScrapLocations(s.scrapLocations || []);
      setManagers(s.managers || []);
      setWorkers(s.workers || []);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const saveSettings = async (newData: any) => {
    await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newData) });
    fetchData();
  };

  const updateMaster = (key: string, data: any) => saveSettings({ locations, leases, companyMachines, vehicles, disposalLocations, scrapLocations, managers, workers, [key]: data });

  const updateReport = async (index: number, newData: any) => {
    const updated = [...reports];
    updated[index] = { ...updated[index], ...newData };
    await fetch('/api/reports', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) });
    setEditingReportIndex(null);
    fetchData();
  };

  if (!isAuthed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4 font-sans">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm">
          <h1 className="text-xl font-black mb-6 text-center text-slate-800">管理画面ログイン</h1>
          <input type="password" placeholder="パスワード" className="w-full p-3 border rounded-xl mb-4 outline-none focus:border-orange-500 font-bold" onChange={e => setPassword(e.target.value)} />
          <button onClick={() => password === 'yamato' && setIsAuthed(true)} className="w-full bg-[#E56312] text-white font-bold py-3 rounded-xl shadow">ログイン</button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-slate-100 min-h-screen space-y-8 font-sans text-slate-800 max-w-7xl mx-auto">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border">
        <h1 className="text-xl font-black">📊 管理ダッシュボード</h1>
        <button onClick={fetchData} className="bg-[#0066cc] text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow">🔄 最新情報に更新</button>
      </div>

      {/* 処分場マスタ ＆ スクラップ場マスタ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* 処分場マスタ */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border space-y-4">
          <h2 className="text-lg font-black">🗑️ 処分場マスタ ＆ 単価・単位設定</h2>
          <div className="space-y-3 bg-slate-50 p-4 rounded-xl border">
            <input type="text" placeholder="処分場名" value={newDispLoc} onChange={e => setNewDispLoc(e.target.value)} className="w-full p-2.5 border rounded-lg text-sm bg-white font-bold outline-none" />
            <div className="flex gap-2">
              <input type="text" value={newDispItem} onChange={e => setNewDispItem(e.target.value)} className="w-1/2 p-2.5 border rounded-lg text-sm bg-white font-bold outline-none" placeholder="品目" />
              <select value={newDispUnit} onChange={e => setNewDispUnit(e.target.value)} className="w-1/2 p-2.5 border rounded-lg text-sm bg-white font-bold outline-none">
                <option value="t">t</option>
                <option value="m3">m3</option>
                <option value="台">台</option>
                <option value="個">個</option>
              </select>
            </div>
            <div className="flex gap-2 items-center">
              <span className="text-xs font-bold text-slate-500">単価¥</span>
              <input type="number" value={newDispPrice} onChange={e => setNewDispPrice(Number(e.target.value))} className="w-full p-2.5 border rounded-lg text-sm bg-white font-bold outline-none" />
              <button onClick={() => {
                if (!newDispLoc.trim()) return;
                const updated = [...disposalLocations, { location: newDispLoc, item: newDispItem, unit: newDispUnit, price: newDispPrice }];
                setDisposalLocations(updated);
                updateMaster('disposalLocations', updated);
                setNewDispLoc('');
              }} className="bg-[#E56312] text-white px-4 py-2.5 rounded-lg text-sm font-bold shadow shrink-0">追加</button>
            </div>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {disposalLocations.map((d, i) => (
              <div key={i} className="p-3 border rounded-xl bg-slate-50 flex justify-between items-center text-sm font-bold gap-2">
                <span className="truncate">{d.location} ({d.item}) ¥{d.price} / {d.unit || 't'}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <select value={d.unit || 't'} onChange={e => {
                    const updated = [...disposalLocations]; updated[i].unit = e.target.value;
                    setDisposalLocations(updated); updateMaster('disposalLocations', updated);
                  }} className="p-1 border rounded text-xs font-bold bg-white">
                    <option value="t">t</option><option value="m3">m3</option><option value="台">台</option><option value="個">個</option>
                  </select>
                  <input type="number" value={d.price} onChange={e => {
                    const updated = [...disposalLocations]; updated[i].price = Number(e.target.value);
                    setDisposalLocations(updated); updateMaster('disposalLocations', updated);
                  }} className="w-20 p-1 border rounded text-xs font-bold bg-white text-right" />
                  <button onClick={() => {
                    const updated = disposalLocations.filter((_, idx) => idx !== i);
                    setDisposalLocations(updated); updateMaster('disposalLocations', updated);
                  }} className="text-red-500 text-xs font-bold hover:underline">削除</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* スクラップ場マスタ */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border space-y-4">
          <h2 className="text-lg font-black">♻️ スクラップ場マスタ ＆ 単価・単位設定</h2>
          <div className="space-y-3 bg-slate-50 p-4 rounded-xl border">
            <input type="text" placeholder="スクラップ場名" value={newScrapLoc} onChange={e => setNewScrapLoc(e.target.value)} className="w-full p-2.5 border rounded-lg text-sm bg-white font-bold outline-none" />
            <div className="flex gap-2">
              <input type="text" value={newScrapItem} onChange={e => setNewScrapItem(e.target.value)} className="w-1/2 p-2.5 border rounded-lg text-sm bg-white font-bold outline-none" placeholder="品目" />
              <select value={newScrapUnit} onChange={e => setNewScrapUnit(e.target.value)} className="w-1/2 p-2.5 border rounded-lg text-sm bg-white font-bold outline-none">
                <option value="t">t</option>
                <option value="m3">m3</option>
                <option value="台">台</option>
                <option value="個">個</option>
              </select>
            </div>
            <div className="flex gap-2 items-center">
              <span className="text-xs font-bold text-slate-500">単価¥</span>
              <input type="number" value={newScrapPrice} onChange={e => setNewScrapPrice(Number(e.target.value))} className="w-full p-2.5 border rounded-lg text-sm bg-white font-bold outline-none" />
              <button onClick={() => {
                if (!newScrapLoc.trim()) return;
                const updated = [...scrapLocations, { location: newScrapLoc, item: newScrapItem, unit: newScrapUnit, price: newScrapPrice }];
                setScrapLocations(updated);
                updateMaster('scrapLocations', updated);
                setNewScrapLoc('');
              }} className="bg-[#E56312] text-white px-4 py-2.5 rounded-lg text-sm font-bold shadow shrink-0">追加</button>
            </div>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {scrapLocations.map((s, i) => (
              <div key={i} className="p-3 border rounded-xl bg-slate-50 flex justify-between items-center text-sm font-bold gap-2">
                <span className="truncate">{s.location} ({s.item}) ¥{s.price} / {s.unit || 't'}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <select value={s.unit || 't'} onChange={e => {
                    const updated = [...scrapLocations]; updated[i].unit = e.target.value;
                    setScrapLocations(updated); updateMaster('scrapLocations', updated);
                  }} className="p-1 border rounded text-xs font-bold bg-white">
                    <option value="t">t</option><option value="m3">m3</option><option value="台">台</option><option value="個">個</option>
                  </select>
                  <input type="number" value={s.price} onChange={e => {
                    const updated = [...scrapLocations]; updated[i].price = Number(e.target.value);
                    setScrapLocations(updated); updateMaster('scrapLocations', updated);
                  }} className="w-20 p-1 border rounded text-xs font-bold bg-white text-right" />
                  <button onClick={() => {
                    const updated = scrapLocations.filter((_, idx) => idx !== i);
                    setScrapLocations(updated); updateMaster('scrapLocations', updated);
                  }} className="text-red-500 text-xs font-bold hover:underline">削除</button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* 送信された日報一覧 */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border space-y-4">
        <h2 className="text-lg font-black">📥 送信された日報一覧（全項目編集可能）</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="border-b text-slate-500 text-sm">
                <th className="pb-3 font-bold">日付</th>
                <th className="pb-3 font-bold">現場名</th>
                <th className="pb-3 font-bold">責任者</th>
                <th className="pb-3 font-bold">重機 / 車両</th>
                <th className="pb-3 font-bold">作業内容</th>
                <th className="pb-3 font-bold">処分 / スクラップ</th>
                <th className="pb-3 text-center font-bold">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {reports.map((r, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="py-3 font-bold">{r.date}</td>
                  <td className="py-3">{editingReportIndex === i ? <input value={editForm.location} onChange={e=>setEditForm({...editForm, location: e.target.value})} className="border p-1 rounded w-28 text-xs font-bold"/> : r.location}</td>
                  <td className="py-3">{editingReportIndex === i ? <input value={editForm.manager} onChange={e=>setEditForm({...editForm, manager: e.target.value})} className="border p-1 rounded w-20 text-xs font-bold"/> : r.manager}</td>
                  <td className="py-3 text-xs">{r.machine} / {r.vehicle}</td>
                  <td className="py-3">{editingReportIndex === i ? <input value={editForm.workDescription} onChange={e=>setEditForm({...editForm, workDescription: e.target.value})} className="border p-1 rounded w-36 text-xs font-bold"/> : r.workDescription}</td>
                  <td className="py-3 text-xs">
                    {r.disposals?.map((d:any, idx:number)=><div key={idx} className="text-blue-700">【処分】{d.location}({d.item}):{d.quantity}{d.unit || 't'}</div>)}
                    {r.scraps?.map((s:any, idx:number)=><div key={idx} className="text-orange-700">【スクラップ】{s.location}({s.item}):{s.quantity}{s.unit || 't'}</div>)}
                  </td>
                  <td className="py-3 text-center">
                    {editingReportIndex === i ? (
                      <button onClick={() => updateReport(i, editForm)} className="bg-emerald-600 text-white px-3 py-1 rounded text-xs font-bold shadow">保存</button>
                    ) : (
                      <button onClick={() => { setEditingReportIndex(i); setEditForm(r); }} className="bg-[#0066cc] text-white px-3 py-1 rounded text-xs font-bold shadow">編集</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
