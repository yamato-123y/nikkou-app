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

  const [newLocation, setNewLocation] = useState('');
  const [newLeaseName, setNewLeaseName] = useState('');
  const [newLeasePrice, setNewLeasePrice] = useState(15000);
  const [newCompName, setNewCompName] = useState('');
  const [newCompPrice, setNewCompPrice] = useState(10000);
  const [newVehicleName, setNewVehicleName] = useState('');
  const [newVehiclePrice, setNewVehiclePrice] = useState(5000);
  const [newManagerName, setNewManagerName] = useState('');
  const [newManagerPrice, setNewManagerPrice] = useState(20000);
  const [newWorkerName, setNewWorkerName] = useState('');
  const [newWorkerPrice, setNewWorkerPrice] = useState(15000);

  // 編集用状態
  const [editingReportIndex, setEditingReportIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [modalLocation, setModalLocation] = useState<string | null>(null);
  const [filterLocation, setFilterLocation] = useState('');

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
      const vName = r.vehicle;
      leaseCost += (leases.find(x => x.name === mName)?.price || 0) + (companyMachines.find(x => x.name === mName)?.price || 0) + (vehicles.find(x => x.name === vName)?.price || 0);
      
      (r.disposals || []).forEach((d: any) => disposalCost += (Number(d.quantity || 0) * (disposalLocations.find(s => s.location === d.location && s.item === d.item)?.price || 3000)));
    });
    return { days: locMapped.length, laborCost, leaseCost, disposalCost, total: laborCost + leaseCost + disposalCost, reportsWithIndex: locMapped };
  };

  if (!isAuthed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4 font-sans">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm">
          <h1 className="text-xl font-black mb-6 text-center text-slate-800">事務員用 管理画面ログイン</h1>
          <input type="password" placeholder="パスワード" className="w-full p-3 border rounded-xl mb-4 outline-none focus:border-orange-500 font-bold" onChange={e => setPassword(e.target.value)} />
          <button onClick={() => (password === 'yamato123' || password === 'yamato') && setIsAuthed(true)} className="w-full bg-[#E56312] text-white font-bold py-3 rounded-xl shadow">ログイン</button>
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
          <h1 className="text-xl font-black text-slate-800">📊 日報管理・原価詳細ダッシュボード</h1>
          <p className="text-xs text-slate-500 mt-0.5">株式会社大和 音声日報システム</p>
        </div>
        <div className="flex gap-3 items-center">
          <button onClick={fetchData} className="bg-[#0066cc] hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow">🔄 最新情報に更新</button>
          <button onClick={() => setIsAuthed(false)} className="bg-[#1e293b] text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow">ログアウト</button>
        </div>
      </div>

      {/* 現場別 経費集計サマリー */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border overflow-x-auto">
        <h2 className="text-lg font-black mb-4 text-slate-800">🏢 現場別 経費集計サマリー</h2>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b text-slate-500 text-sm">
              <th className="pb-3 font-bold">現場名</th>
              <th className="pb-3 font-bold">稼働日数</th>
              <th className="pb-3 font-bold">人件費</th>
              <th className="pb-3 font-bold">リース費・車両費</th>
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

      {/* 各種マスタ設定エリア */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* 現場名一覧 */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border space-y-3">
          <h3 className="font-bold text-sm text-slate-700">🏢 現場名一覧</h3>
          <div className="flex gap-2">
            <input type="text" placeholder="新しい現場名" value={newLocation} onChange={e => setNewLocation(e.target.value)} className="w-full p-2 border rounded-lg text-sm bg-white outline-none" />
            <button onClick={() => { if(!newLocation.trim())return; const up=[...locations, newLocation]; setLocations(up); updateMaster('locations', up); setNewLocation(''); }} className="bg-[#E56312] text-white px-4 py-2 rounded-lg text-sm font-bold shrink-0 shadow">追加</button>
          </div>
          <div className="max-h-40 overflow-y-auto divide-y border rounded-lg p-2 bg-slate-50">
            {locations.map(l => (
              <div key={l} className="py-2 px-1 flex justify-between items-center text-sm font-bold">
                <span>{l}</span>
                <button onClick={() => { const up=locations.filter(x=>x!==l); setLocations(up); updateMaster('locations', up); }} className="text-red-500 text-xs hover:underline">削除</button>
              </div>
            ))}
          </div>
        </div>

        {/* リース・重機マスタ */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border space-y-3">
          <h3 className="font-bold text-sm text-slate-700">🚜 リース・重機 ＆ 日額単価</h3>
          <input type="text" placeholder="重機名" value={newLeaseName} onChange={e => setNewLeaseName(e.target.value)} className="w-full p-2 border rounded-lg text-sm bg-white outline-none" />
          <div className="flex gap-2 items-center">
            <span className="text-xs font-bold text-slate-500">日額¥</span>
            <input type="number" value={newLeasePrice} onChange={e => setNewLeasePrice(Number(e.target.value))} className="w-full p-2 border rounded-lg text-sm bg-white outline-none" />
            <button onClick={() => { if(!newLeaseName.trim())return; const up=[...leases, {name: newLeaseName, price: newLeasePrice}]; setLeases(up); updateMaster('leases', up); setNewLeaseName(''); }} className="bg-[#E56312] text-white px-4 py-2 rounded-lg text-sm font-bold shrink-0 shadow">追加</button>
          </div>
          <div className="max-h-40 overflow-y-auto divide-y border rounded-lg p-2 bg-slate-50 space-y-2">
            {leases.map((l, i) => (
              <div key={i} className="py-1 px-1 flex justify-between items-center text-sm font-bold gap-2">
                <span className="truncate">{l.name}</span>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-xs text-slate-400">¥</span>
                  <input type="number" value={l.price} onChange={e => { const up=[...leases]; up[i].price=Number(e.target.value); setLeases(up); updateMaster('leases', up); }} className="w-20 p-1 border rounded text-xs font-bold bg-white text-right" />
                  <button onClick={() => { const up=leases.filter((_,idx)=>idx!==i); setLeases(up); updateMaster('leases', up); }} className="text-red-500 text-xs">削除</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 車両マスタ */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border space-y-3">
          <h3 className="font-bold text-sm text-slate-700">🚚 車両マスタ ＆ 日額単価</h3>
          <input type="text" placeholder="車両名" value={newVehicleName} onChange={e => setNewVehicleName(e.target.value)} className="w-full p-2 border rounded-lg text-sm bg-white outline-none" />
          <div className="flex gap-2 items-center">
            <span className="text-xs font-bold text-slate-500">日額¥</span>
            <input type="number" value={newVehiclePrice} onChange={e => setNewVehiclePrice(Number(e.target.value))} className="w-full p-2 border rounded-lg text-sm bg-white outline-none" />
            <button onClick={() => { if(!newVehicleName.trim())return; const up=[...vehicles, {name: newVehicleName, price: newVehiclePrice}]; setVehicles(up); updateMaster('vehicles', up); setNewVehicleName(''); }} className="bg-[#E56312] text-white px-4 py-2 rounded-lg text-sm font-bold shrink-0 shadow">追加</button>
          </div>
          <div className="max-h-40 overflow-y-auto divide-y border rounded-lg p-2 bg-slate-50 space-y-2">
            {vehicles.map((v, i) => (
              <div key={i} className="py-1 px-1 flex justify-between items-center text-sm font-bold gap-2">
                <span className="truncate">{v.name}</span>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-xs text-slate-400">¥</span>
                  <input type="number" value={v.price} onChange={e => { const up=[...vehicles]; up[i].price=Number(e.target.value); setVehicles(up); updateMaster('vehicles', up); }} className="w-20 p-1 border rounded text-xs font-bold bg-white text-right" />
                  <button onClick={() => { const up=vehicles.filter((_,idx)=>idx!==i); setVehicles(up); updateMaster('vehicles', up); }} className="text-red-500 text-xs">削除</button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* 処分場・スクラップ場マスタエリア */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* 処分場マスタ */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border space-y-4">
          <h2 className="text-lg font-black">🗑️ 処分場マスタ ＆ 単価・単位設定</h2>
          <div className="space-y-3 bg-slate-50 p-4 rounded-xl border">
            <input type="text" placeholder="処分場名" value={newDispLoc} onChange={e => setNewDispLoc(e.target.value)} className="w-full p-2.5 border rounded-lg text-sm bg-white font-bold outline-none" />
            <div className="flex gap-2">
              <input type="text" value={newDispItem} onChange={e => setNewDispItem(e.target.value)} className="w-1/2 p-2.5 border rounded-lg text-sm bg-white font-bold outline-none" placeholder="品目" />
              <select value={newDispUnit} onChange={e => setNewDispUnit(e.target.value)} className="w-1/2 p-2.5 border rounded-lg text-sm bg-white font-bold outline-none">
                <option value="t">t</option><option value="m3">m3</option><option value="台">台</option><option value="個">個</option>
              </select>
            </div>
            <div className="flex gap-2 items-center">
              <span className="text-xs font-bold text-slate-500">単価¥</span>
              <input type="number" value={newDispPrice} onChange={e => setNewDispPrice(Number(e.target.value))} className="w-full p-2.5 border rounded-lg text-sm bg-white font-bold outline-none" />
              <button onClick={() => {
                if (!newDispLoc.trim()) return;
                const updated = [...disposalLocations, { location: newDispLoc, item: newDispItem, unit: newDispUnit, price: newDispPrice }];
                setDisposalLocations(updated); updateMaster('disposalLocations', updated); setNewDispLoc('');
              }} className="bg-[#E56312] text-white px-4 py-2.5 rounded-lg text-sm font-bold shadow shrink-0">追加</button>
            </div>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {disposalLocations.map((d, i) => (
              <div key={i} className="p-3 border rounded-xl bg-slate-50 flex justify-between items-center text-sm font-bold gap-2">
                <span className="truncate">{d.location} ({d.item}) ¥{d.price} / {d.unit || 't'}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <select value={d.unit || 't'} onChange={e => { const up=[...disposalLocations]; up[i].unit=e.target.value; setDisposalLocations(up); updateMaster('disposalLocations', up); }} className="p-1 border rounded text-xs font-bold bg-white">
                    <option value="t">t</option><option value="m3">m3</option><option value="台">台</option><option value="個">個</option>
                  </select>
                  <input type="number" value={d.price} onChange={e => { const up=[...disposalLocations]; up[i].price=Number(e.target.value); setDisposalLocations(up); updateMaster('disposalLocations', up); }} className="w-20 p-1 border rounded text-xs font-bold bg-white text-right" />
                  <button onClick={() => { const up=disposalLocations.filter((_,idx)=>idx!==i); setDisposalLocations(up); updateMaster('disposalLocations', up); }} className="text-red-500 text-xs">削除</button>
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
                <option value="t">t</option><option value="m3">m3</option><option value="台">台</option><option value="個">個</option>
              </select>
            </div>
            <div className="flex gap-2 items-center">
              <span className="text-xs font-bold text-slate-500">単価¥</span>
              <input type="number" value={newScrapPrice} onChange={e => setNewScrapPrice(Number(e.target.value))} className="w-full p-2.5 border rounded-lg text-sm bg-white font-bold outline-none" />
              <button onClick={() => {
                if (!newScrapLoc.trim()) return;
                const updated = [...scrapLocations, { location: newScrapLoc, item: newScrapItem, unit: newScrapUnit, price: newScrapPrice }];
                setScrapLocations(updated); updateMaster('scrapLocations', updated); setNewScrapLoc('');
              }} className="bg-[#E56312] text-white px-4 py-2.5 rounded-lg text-sm font-bold shadow shrink-0">追加</button>
            </div>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {scrapLocations.map((s, i) => (
              <div key={i} className="p-3 border rounded-xl bg-slate-50 flex justify-between items-center text-sm font-bold gap-2">
                <span className="truncate">{s.location} ({s.item}) ¥{s.price} / {s.unit || 't'}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <select value={s.unit || 't'} onChange={e => { const up=[...scrapLocations]; up[i].unit=e.target.value; setScrapLocations(up); updateMaster('scrapLocations', up); }} className="p-1 border rounded text-xs font-bold bg-white">
                    <option value="t">t</option><option value="m3">m3</option><option value="台">台</option><option value="個">個</option>
                  </select>
                  <input type="number" value={s.price} onChange={e => { const up=[...scrapLocations]; up[i].price=Number(e.target.value); setScrapLocations(up); updateMaster('scrapLocations', up); }} className="w-20 p-1 border rounded text-xs font-bold bg-white text-right" />
                  <button onClick={() => { const up=scrapLocations.filter((_,idx)=>idx!==i); setScrapLocations(up); updateMaster('scrapLocations', up); }} className="text-red-500 text-xs">削除</button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* 送信された日報一覧 */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border space-y-4">
        <div className="flex justify-between items-center flex-wrap gap-3">
          <h2 className="text-lg font-black">📥 送信された日報一覧（全項目編集可能）</h2>
          <input type="text" placeholder="現場名で絞り込み..." value={filterLocation} onChange={e => setFilterLocation(e.target.value)} className="p-2 border rounded-xl text-sm bg-slate-50 outline-none w-48" />
        </div>
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
              {filteredReports.map((r, i) => (
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
                  <td className="py-3 text-center space-x-1">
                    {editingReportIndex === i ? (
                      <button onClick={() => updateReport(i, editForm)} className="bg-emerald-600 text-white px-3 py-1 rounded text-xs font-bold shadow">保存</button>
                    ) : (
                      <button onClick={() => { setEditingReportIndex(i); setEditForm(r); }} className="bg-[#0066cc] text-white px-3 py-1 rounded text-xs font-bold shadow">編集</button>
                    )}
                    <button onClick={() => handleDeleteReport(i)} className="bg-red-500 text-white px-3 py-1 rounded text-xs font-bold shadow">削除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 詳細モーダル */}
      {modalLocation && modalData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b pb-3">
              <h2 className="text-xl font-black">{modalLocation} 詳細分析</h2>
              <button onClick={() => setModalLocation(null)} className="bg-slate-700 text-white px-4 py-2 rounded-xl text-sm font-bold">閉じる</button>
            </div>
            <div className="grid grid-cols-4 gap-3 text-center">
              <div className="bg-slate-50 p-3 rounded-xl border"><div className="text-xs text-slate-500">稼働日数</div><div className="text-lg font-black">{modalData.days}日</div></div>
              <div className="bg-emerald-50 p-3 rounded-xl border"><div className="text-xs text-emerald-600">人件費</div><div className="text-lg font-black text-emerald-700">¥{modalData.laborCost.toLocaleString()}</div></div>
              <div className="bg-blue-50 p-3 rounded-xl border"><div className="text-xs text-blue-600">リース・車両費</div><div className="text-lg font-black text-blue-700">¥{modalData.leaseCost.toLocaleString()}</div></div>
              <div className="bg-amber-50 p-3 rounded-xl border"><div className="text-xs text-amber-600">処分費</div><div className="text-lg font-black text-amber-700">¥{modalData.disposalCost.toLocaleString()}</div></div>
            </div>
            <div className="space-y-3">
              <h3 className="font-bold text-sm">日報内訳（詳細）</h3>
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
                      <div>👥 作業員: <span className="font-normal text-slate-700">{wrks}</span></div>
                      <div>🚜 重機: <span className="font-normal text-slate-700">{r.machine || r.lease || 'なし'}</span></div>
                      <div>🚚 車両: <span className="font-normal text-slate-700">{r.vehicle || 'なし'}</span></div>
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
