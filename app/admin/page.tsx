'use client';
import { useState, useEffect } from 'react';

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [isAuthed, setIsAuthed] = useState(false);
  const [reports, setReports] = useState<any[]>([]);

  // 8つのマスタデータ
  const [locations, setLocations] = useState<{name: string, price: number}[]>([]);
  const [managers, setManagers] = useState<{name: string, price: number}[]>([]);
  const [workers, setWorkers] = useState<{name: string, price: number}[]>([]);
  const [vehicles, setVehicles] = useState<{name: string, price: number}[]>([]);
  const [companyMachines, setCompanyMachines] = useState<{name: string, price: number}[]>([]);
  const [leases, setLeases] = useState<{name: string, price: number}[]>([]);
  const [disposalLocations, setDisposalLocations] = useState<{location: string, item: string, unit: string, price: number}[]>([]);
  const [scrapLocations, setScrapLocations] = useState<{location: string, item: string, unit: string, price: number}[]>([]);

  // 新規追加用ステート
  const [newLoc, setNewLoc] = useState(''); const [newLocPrice, setNewLocPrice] = useState(0);
  const [newMgr, setNewMgr] = useState(''); const [newMgrPrice, setNewMgrPrice] = useState(20000);
  const [newWrk, setNewWrk] = useState(''); const [newWrkPrice, setNewWrkPrice] = useState(15000);
  const [newVeh, setNewVeh] = useState(''); const [newVehPrice, setNewVehPrice] = useState(5000);
  const [newComMac, setNewComMac] = useState(''); const [newComMacPrice, setNewComMacPrice] = useState(10000);
  const [newLease, setNewLease] = useState(''); const [newLeasePrice, setNewLeasePrice] = useState(15000);
  
  const [newDispLoc, setNewDispLoc] = useState(''); const [newDispItem, setNewDispItem] = useState('ガラ'); const [newDispUnit, setNewDispUnit] = useState('t'); const [newDispPrice, setNewDispPrice] = useState(3000);
  const [newScrapLoc, setNewScrapLoc] = useState(''); const [newScrapItem, setNewScrapItem] = useState('鉄スクラップ'); const [newScrapUnit, setNewScrapUnit] = useState('t'); const [newScrapPrice, setNewScrapPrice] = useState(0);

  const [modalLocation, setModalLocation] = useState<string | null>(null);
  const [filterLocation, setFilterLocation] = useState('');

  const fetchData = async () => {
    try {
      const [resR, resS] = await Promise.all([fetch('/api/reports'), fetch('/api/settings')]);
      if (resR.ok) setReports(await resR.json());
      if (resS.ok) {
        const s = await resS.json();
        setLocations((s.locations || []).map((l: any) => typeof l === 'string' ? { name: l, price: 0 } : l));
        setManagers(s.managers || []);
        setWorkers(s.workers || []);
        setVehicles(s.vehicles || []);
        setCompanyMachines(s.companyMachines || []);
        setLeases(s.leases || []);
        setDisposalLocations(s.disposalLocations || []);
        setScrapLocations(s.scrapLocations || []);
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => { if (isAuthed) fetchData(); }, [isAuthed]);

  const saveSettings = async (newData: any) => {
    await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newData) });
    fetchData();
  };

  // CSVダウンロード
  const downloadAllCSV = () => {
    const headers = ["日付", "現場名", "責任者", "作業者", "重機", "車両", "軽油L", "ETC", "作業内容"];
    const rows = reports.map(r => [r.date, r.location, r.manager, (r.workers || []).join('/'), r.machine, r.vehicle, r.fuel, r.etcPrice, r.workDescription]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `全日報データ_${new Date().toLocaleDateString()}.csv`;
    link.click();
  };

  // 経費・原価計算ロジック
  const calculateCosts = (locName: string) => {
    const locMapped = reports.filter(r => r.location === locName);
    let laborCost = 0, leaseCost = 0, disposalCost = 0, fuelCost = 0, etcCost = 0, otherCost = 0;
    
    locMapped.forEach(r => {
      if (r.manager) laborCost += (managers.find(x => x.name === r.manager)?.price || 20000);
      (r.workers || []).forEach((w: string) => laborCost += (workers.find(x => x.name === w)?.price || 15000));
      
      const mName = r.machine;
      leaseCost += (leases.find(x => x.name === mName)?.price || companyMachines.find(x => x.name === mName)?.price || 0);
      
      (r.disposals || []).forEach((d: any) => {
        const unitPrice = disposalLocations.find(s => s.location === d.location && s.item === d.item)?.price || 3000;
        disposalCost += (Number(d.quantity || 0) * unitPrice);
      });

      fuelCost += Number(r.fuelPrice || 0);
      etcCost += Number(r.etcPrice || 0);
      otherCost += Number(r.otherPrice || 0);
    });

    const totalCost = laborCost + leaseCost + disposalCost + fuelCost + etcCost + otherCost;
    const contractPrice = locations.find(l => l.name === locName)?.price || 0;
    const profit = contractPrice - totalCost;

    return { days: locMapped.length, laborCost, leaseCost, disposalCost, fuelCost, etcCost, otherCost, total: totalCost, contractPrice, profit, reportsWithIndex: locMapped };
  };

  if (!isAuthed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4 font-sans">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm space-y-4">
          <h1 className="text-xl font-bold text-center text-slate-800">🔒管理画面ログイン</h1>
          <input type="password" placeholder="パスワードを入力" className="w-full p-3 border rounded-xl outline-none font-bold" onChange={e => setPassword(e.target.value)} />
          <button onClick={() => (password === 'yamato123' || password === 'yamato') && setIsAuthed(true)} className="w-full bg-[#E56312] text-white font-bold py-3 rounded-xl shadow">ログイン</button>
        </div>
      </div>
    );
  }

  const modalData = modalLocation ? calculateCosts(modalLocation) : null;
  const filteredReports = reports.filter(r => !filterLocation || r.location?.includes(filterLocation));

  return (
    <div className="p-6 bg-slate-100 min-h-screen space-y-8 font-sans text-slate-800 max-w-7xl mx-auto">
      
      {/* ヘッダー */}
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border">
        <div>
          <h1 className="text-xl font-black">📊 日報管理・原価詳細ダッシュボード</h1>
          <p className="text-xs text-slate-500 mt-0.5">株式会社大和 音声日報システム</p>
        </div>
        <div className="flex gap-2">
          <button onClick={downloadAllCSV} className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow">全日報CSVダウンロード</button>
          <button onClick={() => setIsAuthed(false)} className="bg-[#1e293b] text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow">ログアウト</button>
        </div>
      </div>

      {/* 現場別 経費集計サマリー */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border overflow-x-auto">
        <h2 className="text-lg font-black mb-4">🏢 現場別 経費集計サマリー</h2>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b text-slate-500 text-sm">
              <th className="pb-3 font-bold">現場名</th>
              <th className="pb-3 font-bold">請負金額</th>
              <th className="pb-3 font-bold">稼働日数</th>
              <th className="pb-3 font-bold">合計経費</th>
              <th className="pb-3 font-bold">粗利</th>
              <th className="pb-3 text-center font-bold">詳細</th>
            </tr>
          </thead>
          <tbody className="divide-y font-bold text-base">
            {locations.map(loc => {
              const c = calculateCosts(loc.name);
              return (
                <tr key={loc.name} className="hover:bg-slate-50 transition">
                  <td className="py-4 text-[#0066cc]">{loc.name}</td>
                  <td className="text-slate-700">¥{loc.price.toLocaleString()}</td>
                  <td>{c.days} 日</td>
                  <td>¥{c.total.toLocaleString()}</td>
                  <td className={c.profit >= 0 ? "text-emerald-600 font-black" : "text-red-600 font-black"}>¥{c.profit.toLocaleString()}</td>
                  <td className="text-center">
                    <button onClick={() => setModalLocation(loc.name)} className="bg-[#0066cc] hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-sm shadow">詳細 →</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ⚙️ 8つのマスタ登録エリア */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border space-y-6">
        <h2 className="text-lg font-black">⚙️ 各種マスタ登録・単価設定</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* 1. 現場名・請負金額 */}
          <div className="bg-slate-50 p-4 rounded-xl border space-y-3">
            <h3 className="font-bold text-sm text-orange-600">🏢 現場名・請負金額</h3>
            <input type="text" placeholder="現場名" value={newLoc} onChange={e=>setNewLoc(e.target.value)} className="w-full p-2 border rounded-lg text-sm bg-white" />
            <input type="number" placeholder="請負金額(円)" value={newLocPrice} onChange={e=>setNewLocPrice(Number(e.target.value))} className="w-full p-2 border rounded-lg text-sm bg-white" />
            <button onClick={() => { if(!newLoc.trim())return; const up=[...locations, {name:newLoc, price:newLocPrice}]; setLocations(up); saveSettings({locations:up, managers, workers, vehicles, companyMachines, leases, disposalLocations, scrapLocations}); setNewLoc(''); setNewLocPrice(0); }} className="w-full bg-[#E56312] text-white py-2 rounded-lg font-bold text-sm shadow">追加</button>
            <div className="max-h-32 overflow-y-auto divide-y bg-white border rounded-lg p-2">
              {locations.map((l, idx)=>(
                <div key={idx} className="py-1 flex justify-between items-center text-xs font-bold">
                  <span>{l.name} (¥{l.price.toLocaleString()})</span>
                  <button onClick={()=>{const up=locations.filter((_,i)=>i!==idx); setLocations(up); saveSettings({locations:up, managers, workers, vehicles, companyMachines, leases, disposalLocations, scrapLocations});}} className="text-red-500">削除</button>
                </div>
              ))}
            </div>
          </div>

          {/* 2. 責任者 */}
          <div className="bg-slate-50 p-4 rounded-xl border space-y-3">
            <h3 className="font-bold text-sm text-orange-600">👤 現場責任者・日額単価</h3>
            <input type="text" placeholder="責任者名" value={newMgr} onChange={e=>setNewMgr(e.target.value)} className="w-full p-2 border rounded-lg text-sm bg-white" />
            <input type="number" placeholder="日額単価" value={newMgrPrice} onChange={e=>setNewMgrPrice(Number(e.target.value))} className="w-full p-2 border rounded-lg text-sm bg-white" />
            <button onClick={() => { if(!newMgr.trim())return; const up=[...managers, {name:newMgr, price:newMgrPrice}]; setManagers(up); saveSettings({locations, managers:up, workers, vehicles, companyMachines, leases, disposalLocations, scrapLocations}); setNewMgr(''); }} className="w-full bg-[#E56312] text-white py-2 rounded-lg font-bold text-sm shadow">追加</button>
            <div className="max-h-32 overflow-y-auto divide-y bg-white border rounded-lg p-2">
              {managers.map((m, idx)=>(
                <div key={idx} className="py-1 flex justify-between items-center text-xs font-bold">
                  <span>{m.name} (¥{m.price.toLocaleString()})</span>
                  <button onClick={()=>{const up=managers.filter((_,i)=>i!==idx); setManagers(up); saveSettings({locations, managers:up, workers, vehicles, companyMachines, leases, disposalLocations, scrapLocations});}} className="text-red-500">削除</button>
                </div>
              ))}
            </div>
          </div>

          {/* 3. 作業員 */}
          <div className="bg-slate-50 p-4 rounded-xl border space-y-3">
            <h3 className="font-bold text-sm text-orange-600">👥 作業員・日額単価</h3>
            <input type="text" placeholder="作業員名" value={newWrk} onChange={e=>setNewWrk(e.target.value)} className="w-full p-2 border rounded-lg text-sm bg-white" />
            <input type="number" placeholder="日額単価" value={newWrkPrice} onChange={e=>setNewWrkPrice(Number(e.target.value))} className="w-full p-2 border rounded-lg text-sm bg-white" />
            <button onClick={() => { if(!newWrk.trim())return; const up=[...workers, {name:newWrk, price:newWrkPrice}]; setWorkers(up); saveSettings({locations, managers, workers:up, vehicles, companyMachines, leases, disposalLocations, scrapLocations}); setNewWrk(''); }} className="w-full bg-[#E56312] text-white py-2 rounded-lg font-bold text-sm shadow">追加</button>
            <div className="max-h-32 overflow-y-auto divide-y bg-white border rounded-lg p-2">
              {workers.map((w, idx)=>(
                <div key={idx} className="py-1 flex justify-between items-center text-xs font-bold">
                  <span>{w.name} (¥{w.price.toLocaleString()})</span>
                  <button onClick={()=>{const up=workers.filter((_,i)=>i!==idx); setWorkers(up); saveSettings({locations, managers, workers:up, vehicles, companyMachines, leases, disposalLocations, scrapLocations});}} className="text-red-500">削除</button>
                </div>
              ))}
            </div>
          </div>

          {/* 4. 自社車両 */}
          <div className="bg-slate-50 p-4 rounded-xl border space-y-3">
            <h3 className="font-bold text-sm text-orange-600">🚚 自社車両・日額単価</h3>
            <input type="text" placeholder="車両名" value={newVeh} onChange={e=>setNewVeh(e.target.value)} className="w-full p-2 border rounded-lg text-sm bg-white" />
            <input type="number" placeholder="日額単価" value={newVehPrice} onChange={e=>setNewVehPrice(Number(e.target.value))} className="w-full p-2 border rounded-lg text-sm bg-white" />
            <button onClick={() => { if(!newVeh.trim())return; const up=[...vehicles, {name:newVeh, price:newVehPrice}]; setVehicles(up); saveSettings({locations, managers, workers, vehicles:up, companyMachines, leases, disposalLocations, scrapLocations}); setNewVeh(''); }} className="w-full bg-[#E56312] text-white py-2 rounded-lg font-bold text-sm shadow">追加</button>
            <div className="max-h-32 overflow-y-auto divide-y bg-white border rounded-lg p-2">
              {vehicles.map((v, idx)=>(
                <div key={idx} className="py-1 flex justify-between items-center text-xs font-bold">
                  <span>{v.name} (¥{v.price.toLocaleString()})</span>
                  <button onClick={()=>{const up=vehicles.filter((_,i)=>i!==idx); setVehicles(up); saveSettings({locations, managers, workers, vehicles:up, companyMachines, leases, disposalLocations, scrapLocations});}} className="text-red-500">削除</button>
                </div>
              ))}
            </div>
          </div>

          {/* 5. 自社重機 */}
          <div className="bg-slate-50 p-4 rounded-xl border space-y-3">
            <h3 className="font-bold text-sm text-orange-600">🚜 自社重機・日額単価</h3>
            <input type="text" placeholder="重機名" value={newComMac} onChange={e=>setNewComMac(e.target.value)} className="w-full p-2 border rounded-lg text-sm bg-white" />
            <input type="number" placeholder="日額単価" value={newComMacPrice} onChange={e=>setNewComMacPrice(Number(e.target.value))} className="w-full p-2 border rounded-lg text-sm bg-white" />
            <button onClick={() => { if(!newComMac.trim())return; const up=[...companyMachines, {name:newComMac, price:newComMacPrice}]; setCompanyMachines(up); saveSettings({locations, managers, workers, vehicles, companyMachines:up, leases, disposalLocations, scrapLocations}); setNewComMac(''); }} className="w-full bg-[#E56312] text-white py-2 rounded-lg font-bold text-sm shadow">追加</button>
            <div className="max-h-32 overflow-y-auto divide-y bg-white border rounded-lg p-2">
              {companyMachines.map((cm, idx)=>(
                <div key={idx} className="py-1 flex justify-between items-center text-xs font-bold">
                  <span>{cm.name} (¥{cm.price.toLocaleString()})</span>
                  <button onClick={()=>{const up=companyMachines.filter((_,i)=>i!==idx); setCompanyMachines(up); saveSettings({locations, managers, workers, vehicles, companyMachines:up, leases, disposalLocations, scrapLocations});}} className="text-red-500">削除</button>
                </div>
              ))}
            </div>
          </div>

          {/* 6. リース重機 */}
          <div className="bg-slate-50 p-4 rounded-xl border space-y-3">
            <h3 className="font-bold text-sm text-orange-600">🏗️ リース重機・日額単価</h3>
            <input type="text" placeholder="リース名" value={newLease} onChange={e=>setNewLease(e.target.value)} className="w-full p-2 border rounded-lg text-sm bg-white" />
            <input type="number" placeholder="日額単価" value={newLeasePrice} onChange={e=>setNewLeasePrice(Number(e.target.value))} className="w-full p-2 border rounded-lg text-sm bg-white" />
            <button onClick={() => { if(!newLease.trim())return; const up=[...leases, {name:newLease, price:newLeasePrice}]; setLeases(up); saveSettings({locations, managers, workers, vehicles, companyMachines, leases:up, disposalLocations, scrapLocations}); setNewLease(''); }} className="w-full bg-[#E56312] text-white py-2 rounded-lg font-bold text-sm shadow">追加</button>
            <div className="max-h-32 overflow-y-auto divide-y bg-white border rounded-lg p-2">
              {leases.map((ls, idx)=>(
                <div key={idx} className="py-1 flex justify-between items-center text-xs font-bold">
                  <span>{ls.name} (¥{ls.price.toLocaleString()})</span>
                  <button onClick={()=>{const up=leases.filter((_,i)=>i!==idx); setLeases(up); saveSettings({locations, managers, workers, vehicles, companyMachines, leases:up, disposalLocations, scrapLocations});}} className="text-red-500">削除</button>
                </div>
              ))}
            </div>
          </div>

          {/* 7. 処分場 */}
          <div className="bg-slate-50 p-4 rounded-xl border space-y-3">
            <h3 className="font-bold text-sm text-orange-600">🗑️ 処分場・品目・単価</h3>
            <input type="text" placeholder="処分場名" value={newDispLoc} onChange={e=>setNewDispLoc(e.target.value)} className="w-full p-2 border rounded-lg text-sm bg-white" />
            <div className="flex gap-2">
              <input type="text" placeholder="品目" value={newDispItem} onChange={e=>setNewDispItem(e.target.value)} className="w-1/2 p-2 border rounded-lg text-sm bg-white" />
              <select value={newDispUnit} onChange={e=>setNewDispUnit(e.target.value)} className="w-1/2 p-2 border rounded-lg text-sm bg-white">
                <option value="t">t</option><option value="m3">m3</option><option value="台">台</option><option value="個">個</option>
              </select>
            </div>
            <input type="number" placeholder="単価" value={newDispPrice} onChange={e=>setNewDispPrice(Number(e.target.value))} className="w-full p-2 border rounded-lg text-sm bg-white" />
            <button onClick={() => { if(!newDispLoc.trim())return; const up=[...disposalLocations, {location:newDispLoc, item:newDispItem, unit:newDispUnit, price:newDispPrice}]; setDisposalLocations(up); saveSettings({locations, managers, workers, vehicles, companyMachines, leases, disposalLocations:up, scrapLocations}); setNewDispLoc(''); }} className="w-full bg-[#E56312] text-white py-2 rounded-lg font-bold text-sm shadow">追加</button>
            <div className="max-h-32 overflow-y-auto divide-y bg-white border rounded-lg p-2">
              {disposalLocations.map((d, idx)=>(
                <div key={idx} className="py-1 flex justify-between items-center text-xs font-bold">
                  <span>{d.location} ({d.item}/{d.unit}) ¥{d.price}</span>
                  <button onClick={()=>{const up=disposalLocations.filter((_,i)=>i!==idx); setDisposalLocations(up); saveSettings({locations, managers, workers, vehicles, companyMachines, leases, disposalLocations:up, scrapLocations});}} className="text-red-500">削除</button>
                </div>
              ))}
            </div>
          </div>

          {/* 8. スクラップ */}
          <div className="bg-slate-50 p-4 rounded-xl border space-y-3">
            <h3 className="font-bold text-sm text-orange-600">♻️ スクラップ・品目・単価</h3>
            <input type="text" placeholder="スクラップ場名" value={newScrapLoc} onChange={e=>setNewScrapLoc(e.target.value)} className="w-full p-2 border rounded-lg text-sm bg-white" />
            <div className="flex gap-2">
              <input type="text" placeholder="品目" value={newScrapItem} onChange={e=>setNewScrapItem(e.target.value)} className="w-1/2 p-2 border rounded-lg text-sm bg-white" />
              <select value={newScrapUnit} onChange={e=>setNewScrapUnit(e.target.value)} className="w-1/2 p-2 border rounded-lg text-sm bg-white">
                <option value="t">t</option><option value="m3">m3</option><option value="台">台</option><option value="個">個</option>
              </select>
            </div>
            <input type="number" placeholder="単価" value={newScrapPrice} onChange={e=>setNewScrapPrice(Number(e.target.value))} className="w-full p-2 border rounded-lg text-sm bg-white" />
            <button onClick={() => { if(!newScrapLoc.trim())return; const up=[...scrapLocations, {location:newScrapLoc, item:newScrapItem, unit:newScrapUnit, price:newScrapPrice}]; setScrapLocations(up); saveSettings({locations, managers, workers, vehicles, companyMachines, leases, disposalLocations, scrapLocations:up}); setNewScrapLoc(''); }} className="w-full bg-[#E56312] text-white py-2 rounded-lg font-bold text-sm shadow">追加</button>
            <div className="max-h-32 overflow-y-auto divide-y bg-white border rounded-lg p-2">
              {scrapLocations.map((sc, idx)=>(
                <div key={idx} className="py-1 flex justify-between items-center text-xs font-bold">
                  <span>{sc.location} ({sc.item}/{sc.unit}) ¥{sc.price}</span>
                  <button onClick={()=>{const up=scrapLocations.filter((_,i)=>i!==idx); setScrapLocations(up); saveSettings({locations, managers, workers, vehicles, companyMachines, leases, disposalLocations, scrapLocations:up});}} className="text-red-500">削除</button>
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
                <th className="pb-3 font-bold">日付</th>
                <th className="pb-3 font-bold">現場名</th>
                <th className="pb-3 font-bold">責任者 / 作業者</th>
                <th className="pb-3 font-bold">重機 / 車両</th>
                <th className="pb-3 font-bold">作業内容</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredReports.map((r, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="py-3 font-bold">{r.date}</td>
                  <td className="py-3 font-bold text-[#0066cc]">{r.location}</td>
                  <td className="py-3 text-xs">{r.manager} / {(r.workers || []).join(', ')}</td>
                  <td className="py-3 text-xs">{r.machine || '-'} / {r.vehicle || '-'}</td>
                  <td className="py-3 text-xs">{r.workDescription || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 現場詳細モーダル */}
      {modalLocation && modalData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-3xl p-6 max-h-[90vh] overflow-y-auto space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b pb-3">
              <h2 className="text-xl font-black">{modalLocation} (詳細分析)</h2>
              <button onClick={() => setModalLocation(null)} className="bg-slate-700 text-white px-4 py-2 rounded-xl text-sm font-bold">閉じる</button>
            </div>
            <div className="grid grid-cols-4 gap-3 text-center">
              <div className="bg-slate-50 p-3 rounded-xl border"><div className="text-xs text-slate-500">請負金額</div><div className="text-md font-black">¥{modalData.contractPrice.toLocaleString()}</div></div>
              <div className="bg-emerald-50 p-3 rounded-xl border"><div className="text-xs text-emerald-600">合計経費</div><div className="text-md font-black text-emerald-700">¥{modalData.total.toLocaleString()}</div></div>
              <div className="bg-blue-50 p-3 rounded-xl border"><div className="text-xs text-blue-600">粗利</div><div className="text-md font-black text-blue-700">¥{modalData.profit.toLocaleString()}</div></div>
              <div className="bg-amber-50 p-3 rounded-xl border"><div className="text-xs text-amber-600">稼働日数</div><div className="text-md font-black text-amber-700">{modalData.days}日</div></div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
