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
  const [newLoc, setNewLoc] = useState(''); const [newLocPrice, setNewLocPrice] = useState<any>('');
  const [newMgr, setNewMgr] = useState(''); const [newMgrPrice, setNewMgrPrice] = useState<any>('');
  const [newWrk, setNewWrk] = useState(''); const [newWrkPrice, setNewWrkPrice] = useState<any>('');
  const [newVeh, setNewVeh] = useState(''); const [newVehPrice, setNewVehPrice] = useState<any>('');
  const [newComMac, setNewComMac] = useState(''); const [newComMacPrice, setNewComMacPrice] = useState<any>('');
  const [newLease, setNewLease] = useState(''); const [newLeasePrice, setNewLeasePrice] = useState<any>('');
  
  const [newDispLoc, setNewDispLoc] = useState(''); const [newDispItem, setNewDispItem] = useState('ガラ'); const [newDispUnit, setNewDispUnit] = useState('t'); const [newDispPrice, setNewDispPrice] = useState<any>('');
  const [newScrapLoc, setNewScrapLoc] = useState(''); const [newScrapItem, setNewScrapItem] = useState('鉄スクラップ'); const [newScrapUnit, setNewScrapUnit] = useState('t'); const [newScrapPrice, setNewScrapPrice] = useState<any>('');

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

  const downloadLocationCSV = (locName: string) => {
    const locReports = reports.filter(r => r.location === locName);
    const headers = ["日付", "現場名", "責任者", "作業者", "重機", "車両", "軽油L", "ETC", "雑費名", "雑費金額", "作業内容"];
    const rows = locReports.map(r => [
      r.date, r.location, r.manager, (r.workers || []).join('/'), 
      r.machine, r.vehicle, r.fuel || 0, r.etcPrice || 0, 
      r.otherItem || '', r.otherPrice || 0, `"${(r.workDescription || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${locName}_日報データ_${new Date().toLocaleDateString()}.csv`;
    link.click();
  };

  // 各日報ごとの個別コストを計算するヘルパー
  const calculateReportDailyCost = (r: any) => {
    let lCost = 0;
    if (r.manager) lCost += (managers.find(x => x.name === r.manager)?.price || 0);
    (r.workers || []).forEach((w: string) => lCost += (workers.find(x => x.name === w)?.price || 0));

    let leaseC = 0;
    const mName = r.machine;
    leaseC += (leases.find(x => x.name === mName)?.price || companyMachines.find(x => x.name === mName)?.price || 0);

    let dispC = 0;
    (r.disposals || []).forEach((d: any) => {
      const uPrice = disposalLocations.find(s => s.location === d.location && s.item === d.item)?.price || 0;
      dispC += (Number(d.quantity || 0) * uPrice);
    });

    let scrapC = 0;
    (r.scraps || []).forEach((sc: any) => {
      const uPrice = scrapLocations.find(s => s.location === sc.location && s.item === sc.item)?.price || 0;
      scrapC += (Number(sc.quantity || 0) * uPrice);
    });

    const fC = Number(r.fuelPrice || 0);
    const eC = Number(r.etcPrice || 0);
    const oC = Number(r.otherPrice || 0);
    const totalDailyCost = lCost + leaseC + dispC + fC + eC + oC;

    return { lCost, leaseC, dispC, fC, eC, oC, scrapC, totalDailyCost };
  };

  const calculateCosts = (locName: string) => {
    const locMapped = reports.filter(r => r.location === locName);
    let laborCost = 0, leaseCost = 0, disposalCost = 0, fuelCost = 0, etcCost = 0, otherCost = 0, scrapTotal = 0;
    
    locMapped.forEach(r => {
      const dc = calculateReportDailyCost(r);
      laborCost += dc.lCost;
      leaseCost += dc.leaseC;
      disposalCost += dc.dispC;
      fuelCost += dc.fC;
      etcCost += dc.eC;
      otherCost += dc.oC;
      scrapTotal += dc.scrapC;
    });

    const totalCost = laborCost + leaseCost + disposalCost + fuelCost + etcCost + otherCost;
    const contractPrice = locations.find(l => l.name === locName)?.price || 0;
    const profit = (contractPrice - totalCost) + scrapTotal;

    return { 
      days: locMapped.length, laborCost, leaseCost, disposalCost, fuelCost, etcCost, otherCost, scrapTotal, 
      total: totalCost, contractPrice, profit, reportsWithIndex: locMapped 
    };
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
              <th className="pb-3 text-center font-bold">詳細・CSV</th>
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
                  <td className="text-center space-x-2">
                    <button onClick={() => setModalLocation(loc.name)} className="bg-[#0066cc] hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-sm shadow">詳細 →</button>
                    <button onClick={() => downloadLocationCSV(loc.name)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-sm shadow">CSV</button>
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
            <input type="number" placeholder="金額を入力" value={newLocPrice} onChange={e=>setNewLocPrice(e.target.value === '' ? '' : Number(e.target.value))} className="w-full p-2 border rounded-lg text-sm bg-white" />
            <button onClick={() => { if(!newLoc.trim())return; const up=[...locations, {name:newLoc, price:Number(newLocPrice)||0}]; setLocations(up); saveSettings({locations:up, managers, workers, vehicles, companyMachines, leases, disposalLocations, scrapLocations}); setNewLoc(''); setNewLocPrice(''); }} className="w-full bg-[#E56312] text-white py-2 rounded-lg font-bold text-sm shadow">追加</button>
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
            <input type="number" placeholder="金額を入力" value={newMgrPrice} onChange={e=>setNewMgrPrice(e.target.value === '' ? '' : Number(e.target.value))} className="w-full p-2 border rounded-lg text-sm bg-white" />
            <button onClick={() => { if(!newMgr.trim())return; const up=[...managers, {name:newMgr, price:Number(newMgrPrice)||0}]; setManagers(up); saveSettings({locations, managers:up, workers, vehicles, companyMachines, leases, disposalLocations, scrapLocations}); setNewMgr(''); setNewMgrPrice(''); }} className="w-full bg-[#E56312] text-white py-2 rounded-lg font-bold text-sm shadow">追加</button>
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
            <input type="number" placeholder="金額を入力" value={newWrkPrice} onChange={e=>setNewWrkPrice(e.target.value === '' ? '' : Number(e.target.value))} className="w-full p-2 border rounded-lg text-sm bg-white" />
            <button onClick={() => { if(!newWrk.trim())return; const up=[...workers, {name:newWrk, price:Number(newWrkPrice)||0}]; setWorkers(up); saveSettings({locations, managers, workers:up, vehicles, companyMachines, leases, disposalLocations, scrapLocations}); setNewWrk(''); setNewWrkPrice(''); }} className="w-full bg-[#E56312] text-white py-2 rounded-lg font-bold text-sm shadow">追加</button>
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
            <input type="number" placeholder="金額を入力" value={newVehPrice} onChange={e=>setNewVehPrice(e.target.value === '' ? '' : Number(e.target.value))} className="w-full p-2 border rounded-lg text-sm bg-white" />
            <button onClick={() => { if(!newVeh.trim())return; const up=[...vehicles, {name:newVeh, price:Number(newVehPrice)||0}]; setVehicles(up); saveSettings({locations, managers, workers, vehicles:up, companyMachines, leases, disposalLocations, scrapLocations}); setNewVeh(''); setNewVehPrice(''); }} className="w-full bg-[#E56312] text-white py-2 rounded-lg font-bold text-sm shadow">追加</button>
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
            <input type="number" placeholder="金額を入力" value={newComMacPrice} onChange={e=>setNewComMacPrice(e.target.value === '' ? '' : Number(e.target.value))} className="w-full p-2 border rounded-lg text-sm bg-white" />
            <button onClick={() => { if(!newComMac.trim())return; const up=[...companyMachines, {name:newComMac, price:Number(newComMacPrice)||0}]; setCompanyMachines(up); saveSettings({locations, managers, workers, vehicles, companyMachines:up, leases, disposalLocations, scrapLocations}); setNewComMac(''); setNewComMacPrice(''); }} className="w-full bg-[#E56312] text-white py-2 rounded-lg font-bold text-sm shadow">追加</button>
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
            <input type="number" placeholder="金額を入力" value={newLeasePrice} onChange={e=>setNewLeasePrice(e.target.value === '' ? '' : Number(e.target.value))} className="w-full p-2 border rounded-lg text-sm bg-white" />
            <button onClick={() => { if(!newLease.trim())return; const up=[...leases, {name:newLease, price:Number(newLeasePrice)||0}]; setLeases(up); saveSettings({locations, managers, workers, vehicles, companyMachines, leases:up, disposalLocations, scrapLocations}); setNewLease(''); setNewLeasePrice(''); }} className="w-full bg-[#E56312] text-white py-2 rounded-lg font-bold text-sm shadow">追加</button>
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
            <input type="number" placeholder="金額を入力" value={newDispPrice} onChange={e=>setNewDispPrice(e.target.value === '' ? '' : Number(e.target.value))} className="w-full p-2 border rounded-lg text-sm bg-white" />
            <button onClick={() => { if(!newDispLoc.trim())return; const up=[...disposalLocations, {location:newDispLoc, item:newDispItem, unit:newDispUnit, price:Number(newDispPrice)||0}]; setDisposalLocations(up); saveSettings({locations, managers, workers, vehicles, companyMachines, leases, disposalLocations:up, scrapLocations}); setNewDispLoc(''); setNewDispPrice(''); }} className="w-full bg-[#E56312] text-white py-2 rounded-lg font-bold text-sm shadow">追加</button>
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
            <input type="number" placeholder="金額を入力" value={newScrapPrice} onChange={e=>setNewScrapPrice(e.target.value === '' ? '' : Number(e.target.value))} className="w-full p-2 border rounded-lg text-sm bg-white" />
            <button onClick={() => { if(!newScrapLoc.trim())return; const up=[...scrapLocations, {location:newScrapLoc, item:newScrapItem, unit:newScrapUnit, price:Number(newScrapPrice)||0}]; setScrapLocations(up); saveSettings({locations, managers, workers, vehicles, companyMachines, leases, disposalLocations, scrapLocations:up}); setNewScrapLoc(''); setNewScrapPrice(''); }} className="w-full bg-[#E56312] text-white py-2 rounded-lg font-bold text-sm shadow">追加</button>
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

      {/* 現場詳細モーダル（すべての経費の内訳と合計、さらに日報ごとの個別内訳を表示） */}
      {modalLocation && modalData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-4xl p-6 max-h-[90vh] overflow-y-auto space-y-6 shadow-2xl">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h2 className="text-xl font-black">{modalLocation} (詳細分析)</h2>
                <p className="text-xs text-slate-500">お金の流れと日報ごとの内訳</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => downloadLocationCSV(modalLocation)} className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow">この現場のCSVダウンロード</button>
                <button onClick={() => setModalLocation(null)} className="bg-slate-700 text-white px-4 py-2 rounded-xl text-sm font-bold">閉じる</button>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3 text-center">
              <div className="bg-slate-50 p-3 rounded-xl border"><div className="text-xs text-slate-500">請負金額</div><div className="text-md font-black">¥{modalData.contractPrice.toLocaleString()}</div></div>
              <div className="bg-emerald-50 p-3 rounded-xl border"><div className="text-xs text-emerald-600">合計経費</div><div className="text-md font-black text-emerald-700">¥{modalData.total.toLocaleString()}</div></div>
              <div className="bg-blue-50 p-3 rounded-xl border"><div className="text-xs text-blue-600">粗利（売却益込）</div><div className="text-md font-black text-blue-700">¥{modalData.profit.toLocaleString()}</div></div>
              <div className="bg-amber-50 p-3 rounded-xl border"><div className="text-xs text-amber-600">稼働日数</div><div className="text-md font-black text-amber-700">{modalData.days}日</div></div>
            </div>

            {/* 経費の詳細内訳グリッド */}
            <div className="bg-slate-50 p-4 rounded-xl border space-y-3">
              <h3 className="font-bold text-sm text-slate-700">📋 経費・収支の内訳明細（総合計）</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                <div className="bg-white p-3 rounded-lg border flex justify-between"><span className="text-slate-500">人件費:</span><span className="font-bold">¥{modalData.laborCost.toLocaleString()}</span></div>
                <div className="bg-white p-3 rounded-lg border flex justify-between"><span className="text-slate-500">重機リース:</span><span className="font-bold">¥{modalData.leaseCost.toLocaleString()}</span></div>
                <div className="bg-white p-3 rounded-lg border flex justify-between"><span className="text-slate-500">処分費:</span><span className="font-bold">¥{modalData.disposalCost.toLocaleString()}</span></div>
                <div className="bg-white p-3 rounded-lg border flex justify-between"><span className="text-slate-500">燃料代 (軽油):</span><span className="font-bold">¥{modalData.fuelCost.toLocaleString()}</span></div>
                <div className="bg-white p-3 rounded-lg border flex justify-between"><span className="text-slate-500">高速代・ETC:</span><span className="font-bold">¥{modalData.etcCost.toLocaleString()}</span></div>
                <div className="bg-white p-3 rounded-lg border flex justify-between"><span className="text-slate-500">その他雑費:</span><span className="font-bold">¥{modalData.otherCost.toLocaleString()}</span></div>
                <div className="bg-emerald-50 p-3 rounded-lg border flex justify-between col-span-full"><span className="text-emerald-700 font-bold">♻️ スクラップ売却計:</span><span className="font-black text-emerald-700">+ ¥{modalData.scrapTotal.toLocaleString()}</span></div>
              </div>
            </div>

            {/* 1日分ずつ報告された日報ごとの経費リスト */}
            <div className="bg-slate-50 p-4 rounded-xl border space-y-3">
              <h3 className="font-bold text-sm text-slate-700">📅 1日ごとの日報データ・経費明細</h3>
              {modalData.reportsWithIndex.length === 0 ? (
                <p className="text-xs text-slate-400">この現場の日報はまだありません</p>
              ) : (
                <div className="space-y-3 max-h-72 overflow-y-auto">
                  {modalData.reportsWithIndex.map((r, idx) => {
                    const daily = calculateReportDailyCost(r);
                    return (
                      <div key={idx} className="bg-white p-4 rounded-xl border shadow-sm space-y-2">
                        <div className="flex justify-between items-center border-b pb-2 text-xs font-bold text-slate-600">
                          <span>📅 日付: {r.date}</span>
                          <span className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded">日報合計経費: ¥{daily.totalDailyCost.toLocaleString()}</span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                          <div><span className="text-slate-400">責任者:</span> {r.manager || '-'}</div>
                          <div><span className="text-slate-400">作業員:</span> {(r.workers || []).join(', ') || '-'}</div>
                          <div><span className="text-slate-400">重機/車両:</span> {r.machine || '-'} / {r.vehicle || '-'}</div>
                          <div><span className="text-slate-400">軽油:</span> {r.fuel || 0} L</div>
                          <div><span className="text-slate-400">ETC:</span> ¥{Number(r.etcPrice || 0).toLocaleString()}</div>
                          <div><span className="text-slate-400">雑費({r.otherItem || 'なし'}):</span> ¥{Number(r.otherPrice || 0).toLocaleString()}</div>
                        </div>
                        {r.workDescription && (
                          <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded">
                            <span className="font-bold text-slate-700">作業内容:</span> {r.workDescription}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
