'use client';
import { useState, useEffect } from 'react';

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [isAuthed, setIsAuthed] = useState(false);
  const [reports, setReports] = useState<any[]>([]);

  const [locations, setLocations] = useState<string[]>([]);
  const [leases, setLeases] = useState<{ name: string; price: number }[]>([]);
  const [companyMachines, setCompanyMachines] = useState<{ name: string; price: number }[]>([]);
  const [vehicles, setVehicles] = useState<{ name: string; price: number }[]>([]);
  const [disposalLocations, setDisposalLocations] = useState<{ location: string; item: string; unit: string; price: number }[]>([]);
  const [scrapLocations, setScrapLocations] = useState<{ location: string; item: string; unit: string; price: number }[]>([]);
  const [managers, setManagers] = useState<{ name: string; price: number }[]>([]);
  const [workers, setWorkers] = useState<{ name: string; price: number }[]>([]);

  const [editingReportIndex, setEditingReportIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [modalLocation, setModalLocation] = useState<string | null>(null);
  const [filterLocation, setFilterLocation] = useState('');

  // 新規追加用
  const [newLocation, setNewLocation] = useState('');
  const [newLeaseName, setNewLeaseName] = useState('');
  const [newLeasePrice, setNewLeasePrice] = useState(15000);
  const [newDispLoc, setNewDispLoc] = useState('');
  const [newDispItem, setNewDispItem] = useState('ガラ');
  const [newDispUnit, setNewDispUnit] = useState('t');
  const [newDispPrice, setNewDispPrice] = useState(3000);
  const [newManagerName, setNewManagerName] = useState('');
  const [newManagerPrice, setNewManagerPrice] = useState(20000);
  const [newWorkerName, setNewWorkerName] = useState('');
  const [newWorkerPrice, setNewWorkerPrice] = useState(15000);

  const fetchData = async () => {
    try {
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
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

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

  const handleDeleteReport = async (index: number) => {
    const updated = reports.filter((_, i) => i !== index);
    setReports(updated);
    await fetch('/api/reports', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) });
    fetchData();
  };

  const calculateCosts = (locName: string) => {
    const locMapped = reports.filter(r => r.location === locName || r.locations?.includes(locName));
    let laborCost = 0, leaseCost = 0, disposalCost = 0;
    locMapped.forEach(r => {
      const mgrs = Array.isArray(r.managers) ? r.managers : (r.manager ? [r.manager] : []);
      mgrs.forEach((m: any) => laborCost += (managers.find(x => x.name === m)?.price || 20000));
      const wrks = Array.isArray(r.workers) ? r.workers : (typeof r.workers === 'string' ? r.workers.split(',') : []);
      wrks.forEach((w: any) => laborCost += (workers.find(x => x.name === w.trim())?.price || 15000));
      
      const mName = r.machine || r.lease;
      leaseCost += (leases.find(x => x.name === mName)?.price || 0);
      
      (r.disposals || []).forEach((d: any) => disposalCost += (Number(d.quantity || 0) * (disposalLocations.find(s => s.location === d.location && s.item === d.item)?.price || 3000)));
    });
    return { days: locMapped.length, laborCost, leaseCost, disposalCost, total: laborCost + leaseCost + disposalCost, reportsWithIndex: locMapped };
  };

  if (!isAuthed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4 font-sans">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm">
          <h1 className="text-xl font-black mb-6 text-center text-slate-800">管理画面ログイン</h1>
          <input type="password" placeholder="パスワード" className="w-full p-3 border rounded-xl mb-4 outline-none font-bold" onChange={e => setPassword(e.target.value)} />
          <button onClick={() => (password === 'yamato123' || password === 'yamato') && setIsAuthed(true)} className="w-full bg-[#1e293b] text-white font-bold py-3 rounded-xl shadow">ログイン</button>
        </div>
      </div>
    );
  }

  const modalData = modalLocation ? calculateCosts(modalLocation) : null;
  const filteredReports = reports.filter(r => !filterLocation || r.location?.includes(filterLocation) || r.locations?.includes(filterLocation));

  return (
    <div className="p-6 bg-slate-100 min-h-screen space-y-8 font-sans text-slate-800 max-w-7xl mx-auto">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border">
        <div>
          <h1 className="text-xl font-black">📊 日報管理・原価詳細ダッシュボード</h1>
          <p className="text-xs text-slate-500 mt-0.5">株式会社大和 音声日報システム</p>
        </div>
        <button onClick={() => setIsAuthed(false)} className="bg-[#1e293b] text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow">ログアウト</button>
      </div>

      {/* 現場別 経費集計サマリー */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border overflow-x-auto">
        <h2 className="text-lg font-black mb-4">🏢 現場別 経費集計サマリー</h2>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b text-slate-500 text-sm">
              <th className="pb-3 font-bold">現場名</th>
              <th className="pb-3 font-bold">稼働日数</th>
              <th className="pb-3 font-bold">人件費</th>
              <th className="pb-3 font-bold">リース費</th>
              <th className="pb-3 font-bold">処分費</th>
              <th className="pb-3 font-bold">合計経費</th>
              <th className="pb-3 text-center font-bold">詳細</th>
            </tr>
          </thead>
          <tbody className="divide-y font-bold text-base">
            {locations.map(loc => {
              const c = calculateCosts(loc);
              return (
                <tr key={loc} className="hover:bg-slate-50 transition">
                  <td className="py-4 text-[#0066cc]">{loc}</td>
                  <td>{c.days} 日</td>
                  <td>¥{c.laborCost.toLocaleString()}</td>
                  <td>¥{c.leaseCost.toLocaleString()}</td>
                  <td>¥{c.disposalCost.toLocaleString()}</td>
                  <td className="text-emerald-600 font-black">¥{c.total.toLocaleString()}</td>
                  <td className="text-center">
                    <button onClick={() => setModalLocation(loc)} className="bg-[#0066cc] hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-sm shadow">詳細 →</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* マスタ登録エリア */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border space-y-6">
        <h2 className="text-lg font-black">⚙️ マスタ登録（現場・担当者・リース・処分場）</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* 現場名一覧 */}
          <div className="bg-slate-50 p-4 rounded-xl border space-y-3">
            <h3 className="font-bold text-sm">🏢 現場名一覧</h3>
            <div className="flex gap-2">
              <input type="text" placeholder="新しい現場名" value={newLocation} onChange={e => setNewLocation(e.target.value)} className="w-full p-2 border rounded-lg text-sm bg-white outline-none" />
              <button onClick={() => { if(!newLocation.trim())return; const up=[...locations, newLocation]; setLocations(up); updateMaster('locations', up); setNewLocation(''); }} className="bg-[#E56312] text-white px-3 py-2 rounded-lg text-sm font-bold shadow">追加</button>
            </div>
            <div className="max-h-40 overflow-y-auto divide-y border rounded-lg p-2 bg-white">
              {locations.map(l => (
                <div key={l} className="py-1.5 px-1 flex justify-between items-center text-sm font-bold">
                  <span>{l}</span>
                  <button onClick={() => { const up=locations.filter(x=>x!==l); setLocations(up); updateMaster('locations', up); }} className="text-red-500 text-xs">削除</button>
                </div>
              ))}
            </div>
          </div>

          {/* リース・重機マスタ */}
          <div className="bg-slate-50 p-4 rounded-xl border space-y-3">
            <h3 className="font-bold text-sm">🚜 リース・重機マスタ ＆ 日額単価</h3>
            <input type="text" placeholder="例: 0.2ユンボ" value={newLeaseName} onChange={e => setNewLeaseName(e.target.value)} className="w-full p-2 border rounded-lg text-sm bg-white outline-none" />
            <div className="flex gap-2 items-center">
              <input type="number" value={newLeasePrice} onChange={e => setNewLeasePrice(Number(e.target.value))} className="w-full p-2 border rounded-lg text-sm bg-white outline-none" />
              <button onClick={() => { if(!newLeaseName.trim())return; const up=[...leases, {name: newLeaseName, price: newLeasePrice}]; setLeases(up); updateMaster('leases', up); setNewLeaseName(''); }} className="bg-[#E56312] text-white px-3 py-2 rounded-lg text-sm font-bold shadow">追加</button>
            </div>
            <div className="max-h-40 overflow-y-auto divide-y border rounded-lg p-2 bg-white space-y-2">
              {leases.map((l, i) => (
                <div key={i} className="py-1 px-1 flex justify-between items-center text-sm font-bold gap-2">
                  <span className="truncate">{l.name}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-xs text-slate-400">日額¥</span>
                    <input type="number" value={l.price} onChange={e => { const up=[...leases]; up[i].price=Number(e.target.value); setLeases(up); updateMaster('leases', up); }} className="w-16 p-1 border rounded text-xs font-bold text-right" />
                    <button onClick={() => { const up=leases.filter((_,idx)=>idx!==i); setLeases(up); updateMaster('leases', up); }} className="text-red-500 text-xs">削除</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 処分場マスタ */}
          <div className="bg-slate-50 p-4 rounded-xl border space-y-3">
            <h3 className="font-bold text-sm">🗑️ 処分場マスタ ＆ 単価設定</h3>
            <input type="text" placeholder="処分場名" value={newDispLoc} onChange={e => setNewDispLoc(e.target.value)} className="w-full p-2 border rounded-lg text-sm bg-white outline-none" />
            <div className="flex gap-2">
              <input type="text" value={newDispItem} onChange={e => setNewDispItem(e.target.value)} className="w-1/2 p-2 border rounded-lg text-sm bg-white outline-none" placeholder="品目" />
              <select value={newDispUnit} onChange={e => setNewDispUnit(e.target.value)} className="w-1/2 p-2 border rounded-lg text-sm bg-white outline-none">
                <option value="t">t</option><option value="m3">m3</option><option value="台">台</option><option value="個">個</option>
              </select>
            </div>
            <div className="flex gap-2 items-center">
              <input type="number" value={newDispPrice} onChange={e => setNewDispPrice(Number(e.target.value))} className="w-full p-2 border rounded-lg text-sm bg-white outline-none" />
              <button onClick={() => { if(!newDispLoc.trim())return; const up=[...disposalLocations, {location: newDispLoc, item: newDispItem, unit: newDispUnit, price: newDispPrice}]; setDisposalLocations(up); updateMaster('disposalLocations', up); setNewDispLoc(''); }} className="bg-[#E56312] text-white px-3 py-2 rounded-lg text-sm font-bold shadow">追加</button>
            </div>
            <div className="max-h-32 overflow-y-auto divide-y border rounded-lg p-2 bg-white">
              {disposalLocations.map((d, i) => (
                <div key={i} className="py-1 flex justify-between items-center text-xs font-bold">
                  <span>{d.location} ({d.item}/{d.unit}) ¥{d.price}</span>
                  <button onClick={() => { const up=disposalLocations.filter((_,idx)=>idx!==i); setDisposalLocations(up); updateMaster('disposalLocations', up); }} className="text-red-500">削除</button>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* 現場責任者 ＆ 作業メンバー マスタ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
          
          {/* 現場責任者マスタ */}
          <div className="bg-slate-50 p-4 rounded-xl border space-y-3">
            <h3 className="font-bold text-sm">👤 現場責任者 ＆ 日額単価</h3>
            <div className="flex gap-2">
              <input type="text" placeholder="責任者名" value={newManagerName} onChange={e => setNewManagerName(e.target.value)} className="w-full p-2 border rounded-lg text-sm bg-white outline-none" />
              <input type="number" value={newManagerPrice} onChange={e => setNewManagerPrice(Number(e.target.value))} className="w-28 p-2 border rounded-lg text-sm bg-white outline-none" />
              <button onClick={() => { if(!newManagerName.trim())return; const up=[...managers, {name: newManagerName, price: newManagerPrice}]; setManagers(up); updateMaster('managers', up); setNewManagerName(''); }} className="bg-[#E56312] text-white px-3 py-2 rounded-lg text-sm font-bold shadow">追加</button>
            </div>
            <div className="max-h-36 overflow-y-auto divide-y border rounded-lg p-2 bg-white space-y-1">
              {managers.map((m, i) => (
                <div key={i} className="py-1 flex justify-between items-center text-sm font-bold">
                  <span>{m.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">日額¥</span>
                    <input type="number" value={m.price} onChange={e => { const up=[...managers]; up[i].price=Number(e.target.value); setManagers(up); updateMaster('managers', up); }} className="w-20 p-1 border rounded text-xs font-bold text-right" />
                    <button onClick={() => { const up=managers.filter((_,idx)=>idx!==i); setManagers(up); updateMaster('managers', up); }} className="text-red-500 text-xs">削除</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 作業メンバーマスタ */}
          <div className="bg-slate-50 p-4 rounded-xl border space-y-3">
            <h3 className="font-bold text-sm">👥 作業メンバー ＆ 日額単価</h3>
            <div className="flex gap-2">
              <input type="text" placeholder="メンバー名" value={newWorkerName} onChange={e => setNewWorkerName(e.target.value)} className="w-full p-2 border rounded-lg text-sm bg-white outline-none" />
              <input type="number" value={newWorkerPrice} onChange={e => setNewWorkerPrice(Number(e.target.value))} className="w-28 p-2 border rounded-lg text-sm bg-white outline-none" />
              <button onClick={() => { if(!newWorkerName.trim())return; const up=[...workers, {name: newWorkerName, price: newWorkerPrice}]; setWorkers(up); updateMaster('workers', up); setNewWorkerName(''); }} className="bg-[#E56312] text-white px-3 py-2 rounded-lg text-sm font-bold shadow">追加</button>
            </div>
            <div className="max-h-36 overflow-y-auto divide-y border rounded-lg p-2 bg-white space-y-1">
              {workers.map((w, i) => (
                <div key={i} className="py-1 flex justify-between items-center text-sm font-bold">
                  <span>{w.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">日額¥</span>
                    <input type="number" value={w.price} onChange={e => { const up=[...workers]; up[i].price=Number(e.target.value); setWorkers(up); updateMaster('workers', up); }} className="w-20 p-1 border rounded text-xs font-bold text-right" />
                    <button onClick={() => { const up=workers.filter((_,idx)=>idx!==i); setWorkers(up); updateMaster('workers', up); }} className="text-red-500 text-xs">削除</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* 送信された日報一覧 */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border space-y-4">
        <div className="flex justify-between items-center flex-wrap gap-3">
          <h2 className="text-lg font-black">📥 送信された日報一覧</h2>
          <input type="text" placeholder="現場名で絞り込み..." value={filterLocation} onChange={e => setFilterLocation(e.target.value)} className="p-2 border rounded-xl text-sm bg-slate-50 outline-none w-48" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="border-b text-slate-500 text-sm">
                <th className="pb-3 font-bold">日付 / 送信日時</th>
                <th className="pb-3 font-bold">現場名</th>
                <th className="pb-3 font-bold">責任者 / 作業者</th>
                <th className="pb-3 font-bold">概算人件費</th>
                <th className="pb-3 font-bold">リース重機</th>
                <th className="pb-3 font-bold">作業内容</th>
                <th className="pb-3 font-bold">処分内容 / 搬出量</th>
                <th className="pb-3 text-center font-bold">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredReports.map((r, i) => {
                const mgrs = Array.isArray(r.managers) ? r.managers.join(', ') : (r.manager || 'なし');
                const wrks = Array.isArray(r.workers) ? r.workers.join(', ') : (r.workers || 'なし');
                const mPrice = managers.find(x => x.name === r.manager)?.price || 20000;
                const wCount = Array.isArray(r.workers) ? r.workers.length : (r.workers ? r.workers.split(',').length : 0);
                const wPriceSum = wCount * 15000;
                const estLabor = mPrice + wPriceSum;

                return (
                  <tr key={i} className="hover:bg-slate-50 align-top">
                    <td className="py-3 font-bold">
                      <div>{r.date}</div>
                      <div className="text-xs text-slate-400 font-normal">{r.createdAt ? new Date(r.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}</div>
                    </td>
                    <td className="py-3 font-bold text-[#0066cc]">{editingReportIndex === i ? <input value={editForm.location} onChange={e=>setEditForm({...editForm, location: e.target.value})} className="border p-1 rounded w-28 text-xs font-bold"/> : r.location}</td>
                    <td className="py-3 text-xs">
                      <div>責任者: <span className="font-bold">{mgrs}</span></div>
                      <div className="text-slate-500">作業者: {wrks}</div>
                    </td>
                    <td className="py-3 font-bold text-emerald-600">¥{estLabor.toLocaleString()}</td>
                    <td className="py-3 text-xs">
                      <div>{r.machine || r.lease || 'なし'}</div>
                      <div className="text-slate-500">¥{leases.find(x => x.name === (r.machine || r.lease))?.price || 0}</div>
                    </td>
                    <td className="py-3 text-xs max-w-[150px]">
                      {editingReportIndex === i ? <input value={editForm.workDescription} onChange={e=>setEditForm({...editForm, workDescription: e.target.value})} className="border p-1 rounded w-full text-xs"/> : (r.workDescription || '-')}
                    </td>
                    <td className="py-3 text-xs">
                      {r.disposals?.map((d:any, idx:number)=><div key={idx} className="text-blue-700 font-bold">{d.location} ({d.item}): {d.quantity}{d.unit || 't'}</div>)}
                    </td>
                    <td className="py-3 text-center space-x-1">
                      {editingReportIndex === i ? (
                        <button onClick={() => updateReport(i, editForm)} className="bg-emerald-600 text-white px-3 py-1 rounded text-xs font-bold shadow">保存</button>
                      ) : (
                        <button onClick={() => { setEditingReportIndex(i); setEditForm(r); }} className="bg-[#0066cc] text-white px-3 py-1 rounded text-xs font-bold shadow">編集</button>
                      )}
                      <button onClick={() => handleDeleteReport(i)} className="bg-red-500 text-white px-3 py-1 rounded text-xs font-bold shadow">削除</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 詳細モーダル */}
      {modalLocation && modalData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-3xl p-6 max-h-[90vh] overflow-y-auto space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b pb-3">
              <h2 className="text-xl font-black">{modalLocation} (現場詳細分析)</h2>
              <button onClick={() => setModalLocation(null)} className="bg-slate-700 text-white px-4 py-2 rounded-xl text-sm font-bold">閉じる</button>
            </div>
            <div className="grid grid-cols-4 gap-3 text-center">
              <div className="bg-slate-50 p-3 rounded-xl border"><div className="text-xs text-slate-500">稼働日数</div><div className="text-lg font-black">{modalData.days}日</div></div>
              <div className="bg-emerald-50 p-3 rounded-xl border"><div className="text-xs text-emerald-600">人件費</div><div className="text-lg font-black text-emerald-700">¥{modalData.laborCost.toLocaleString()}</div></div>
              <div className="bg-blue-50 p-3 rounded-xl border"><div className="text-xs text-blue-600">リース費</div><div className="text-lg font-black text-blue-700">¥{modalData.leaseCost.toLocaleString()}</div></div>
              <div className="bg-amber-50 p-3 rounded-xl border"><div className="text-xs text-amber-600">処分費</div><div className="text-lg font-black text-amber-700">¥{modalData.disposalCost.toLocaleString()}</div></div>
            </div>
            <div className="space-y-3">
              <h3 className="font-bold text-sm">日報内訳一覧</h3>
              {modalData.reportsWithIndex.map((r, globalIndex) => {
                const mgrs = Array.isArray(r.managers) ? r.managers.join(', ') : (r.manager || 'なし');
                const wrks = Array.isArray(r.workers) ? r.workers.join(', ') : (r.workers || 'なし');
                return (
                  <div key={globalIndex} className="border p-4 rounded-xl bg-slate-50 text-xs space-y-2">
                    <div className="font-black text-sm text-[#0066cc] border-b pb-1 flex justify-between">
                      <span>📅 {r.date}</span>
                      <span className="text-slate-400 font-normal">{r.createdAt ? new Date(r.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1 font-bold">
                      <div>👤 責任者: <span className="font-normal text-slate-700">{mgrs}</span></div>
                      <div>👥 作業者: <span className="font-normal text-slate-700">{wrks}</span></div>
                      <div>🚜 リース重機: <span className="font-normal text-slate-700">{r.machine || r.lease || 'なし'}</span></div>
                      <div>💰 日付合計: <span className="font-normal text-emerald-600">人件費等計</span></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
