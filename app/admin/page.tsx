'use client';
import { useState, useEffect } from 'react';

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [isAuthed, setIsAuthed] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [reports, setReports] = useState<any[]>([]);

  const [locations, setLocations] = useState<string[]>(['堺市邸解体工事', '北花田店舗改修', '美原区住宅解体', '美加の台']);
  const [leases, setLeases] = useState<{ name: string; price: number }[]>([{ name: '0.2ユンボ', price: 15000 }]);
  const [companyMachines, setCompanyMachines] = useState<{ name: string; price: number }[]>([{ name: '自社バックホウ', price: 10000 }]);
  const [vehicles, setVehicles] = useState<string[]>(['2tダンプ', '4tダンプ', '軽トラ']);
  const [disposalLocations, setDisposalLocations] = useState<{ location: string; item: string; unit: string; price: number }[]>([{ location: 'テスト処分場', item: 'ガラ', unit: 't', price: 3000 }]);
  const [scrapLocations, setScrapLocations] = useState<{ location: string; item: string; unit: string; price: number }[]>([{ location: 'テストスクラップ場', item: '鉄', unit: 't', price: 20000 }]);
  const [managers, setManagers] = useState<{ name: string; price: number }[]>([
    { name: '大和 太郎', price: 20000 },
    { name: '佐藤 次郎', price: 15000 },
    { name: '鈴木 三郎', price: 10000 },
    { name: '大和', price: 15000 }
  ]);
  const [workers, setWorkers] = useState<{ name: string; price: number }[]>([
    { name: 'Aさん', price: 15000 },
    { name: 'Bさん', price: 16000 },
    { name: 'Cさん', price: 10000 }
  ]);

  const [modalLocation, setModalLocation] = useState<string | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [filterLocation, setFilterLocation] = useState('');

  // 編集中の一時データ保持用
  const [editForm, setEditForm] = useState({
    location: '',
    manager: '',
    machine: '',
    vehicle: '',
    workDescription: ''
  });

  // 新規追加用
  const [newLocation, setNewLocation] = useState('');
  const [newLeaseName, setNewLeaseName] = useState('');
  const [newLeasePrice, setNewLeasePrice] = useState(15000);
  const [newCompName, setNewCompName] = useState('');
  const [newCompPrice, setNewCompPrice] = useState(10000);
  const [newVehicle, setNewVehicle] = useState('');
  const [newDispLoc, setNewDispLoc] = useState('');
  const [newDispItem, setNewDispItem] = useState('ガラ');
  const [newDispPrice, setNewDispPrice] = useState(3000);
  const [newScrapLoc, setNewScrapLoc] = useState('');
  const [newScrapItem, setNewScrapItem] = useState('鉄');
  const [newScrapPrice, setNewScrapPrice] = useState(20000);
  const [newManagerName, setNewManagerName] = useState('');
  const [newManagerPrice, setNewManagerPrice] = useState(20000);
  const [newWorkerName, setNewWorkerName] = useState('');
  const [newWorkerPrice, setNewWorkerPrice] = useState(15000);

  const fetchData = async () => {
    try {
      const resReports = await fetch('/api/reports');
      if (resReports.ok) {
        const data = await resReports.json();
        setReports(Array.isArray(data) ? data : []);
      }
      const resSettings = await fetch('/api/settings');
      if (resSettings.ok) {
        const data = await resSettings.json();
        if (data && typeof data === 'object') {
          if (Array.isArray(data.locations)) setLocations(data.locations);
          if (Array.isArray(data.leases)) setLeases(data.leases);
          if (Array.isArray(data.companyMachines)) setCompanyMachines(data.companyMachines);
          if (Array.isArray(data.vehicles)) setVehicles(data.vehicles);
          if (Array.isArray(data.disposalLocations)) setDisposalLocations(data.disposalLocations);
          if (Array.isArray(data.scrapLocations)) setScrapLocations(data.scrapLocations);
          if (Array.isArray(data.managers)) setManagers(data.managers);
          if (Array.isArray(data.workers)) setWorkers(data.workers);
        }
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const saveSettingsToServer = async (updatedSettings: any) => {
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSettings)
      });
    } catch (e) { console.error(e); }
  };

  const handleAdd = (type: string) => {
    let updatedLocations = [...locations];
    let updatedLeases = [...leases];
    let updatedComp = [...companyMachines];
    let updatedVehicles = [...vehicles];
    let updatedDisps = [...disposalLocations];
    let updatedScraps = [...scrapLocations];
    let updatedManagers = [...managers];
    let updatedWorkers = [...workers];

    if (type === 'location' && newLocation.trim()) {
      updatedLocations.push(newLocation.trim());
      setLocations(updatedLocations);
      setNewLocation('');
    } else if (type === 'lease' && newLeaseName.trim()) {
      updatedLeases.push({ name: newLeaseName.trim(), price: Number(newLeasePrice) });
      setLeases(updatedLeases);
      setNewLeaseName('');
    } else if (type === 'company' && newCompName.trim()) {
      updatedComp.push({ name: newCompName.trim(), price: Number(newCompPrice) });
      setCompanyMachines(updatedComp);
      setNewCompName('');
    } else if (type === 'vehicle' && newVehicle.trim()) {
      updatedVehicles.push(newVehicle.trim());
      setVehicles(updatedVehicles);
      setNewVehicle('');
    } else if (type === 'disposal' && newDispLoc.trim()) {
      updatedDisps.push({ location: newDispLoc.trim(), item: newDispItem, unit: 't', price: Number(newDispPrice) });
      setDisposalLocations(updatedDisps);
      setNewDispLoc('');
    } else if (type === 'scrap' && newScrapLoc.trim()) {
      updatedScraps.push({ location: newScrapLoc.trim(), item: newScrapItem, unit: 't', price: Number(newScrapPrice) });
      setScrapLocations(updatedScraps);
      setNewScrapLoc('');
    } else if (type === 'manager' && newManagerName.trim()) {
      updatedManagers.push({ name: newManagerName.trim(), price: Number(newManagerPrice) });
      setManagers(updatedManagers);
      setNewManagerName('');
    } else if (type === 'worker' && newWorkerName.trim()) {
      updatedWorkers.push({ name: newWorkerName.trim(), price: Number(newWorkerPrice) });
      setWorkers(updatedWorkers);
      setNewWorkerName('');
    }

    saveSettingsToServer({
      locations: updatedLocations,
      leases: updatedLeases,
      companyMachines: updatedComp,
      vehicles: updatedVehicles,
      disposalLocations: updatedDisps,
      scrapLocations: updatedScraps,
      managers: updatedManagers,
      workers: updatedWorkers
    });
  };

  const handleDelete = async (type: string, target: any) => {
    if (type === 'report') {
      const updated = reports.filter((_, i) => i !== target);
      setReports(updated);
      await fetch('/api/reports', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) });
      return;
    }

    let updatedLocations = [...locations];
    let updatedLeases = [...leases];
    let updatedComp = [...companyMachines];
    let updatedVehicles = [...vehicles];
    let updatedDisps = [...disposalLocations];
    let updatedScraps = [...scrapLocations];
    let updatedManagers = [...managers];
    let updatedWorkers = [...workers];

    if (type === 'location') updatedLocations = locations.filter(l => l !== target);
    else if (type === 'lease') updatedLeases = leases.filter(l => l.name !== target);
    else if (type === 'company') updatedComp = companyMachines.filter(m => m.name !== target);
    else if (type === 'vehicle') updatedVehicles = vehicles.filter(v => v !== target);
    else if (type === 'disposal') updatedDisps = disposalLocations.filter((_, i) => i !== target);
    else if (type === 'scrap') updatedScraps = scrapLocations.filter((_, i) => i !== target);
    else if (type === 'manager') updatedManagers = managers.filter(m => m.name !== target);
    else if (type === 'worker') updatedWorkers = workers.filter(w => w.name !== target);

    setLocations(updatedLocations);
    setLeases(updatedLeases);
    setCompanyMachines(updatedComp);
    setVehicles(updatedVehicles);
    setDisposalLocations(updatedDisps);
    setScrapLocations(updatedScraps);
    setManagers(updatedManagers);
    setWorkers(updatedWorkers);

    saveSettingsToServer({
      locations: updatedLocations,
      leases: updatedLeases,
      companyMachines: updatedComp,
      vehicles: updatedVehicles,
      disposalLocations: updatedDisps,
      scrapLocations: updatedScraps,
      managers: updatedManagers,
      workers: updatedWorkers
    });
  };

  const handleSaveEdit = async (index: number) => {
    const updated = [...reports];
    updated[index].location = editForm.location;
    updated[index].manager = editForm.manager;
    updated[index].machine = editForm.machine;
    updated[index].vehicle = editForm.vehicle;
    updated[index].workDescription = editForm.workDescription;
    setReports(updated);
    setEditingIndex(null);
    await fetch('/api/reports', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) });
  };

  const calculateCosts = (locName: string) => {
    const allMapped = reports.map((r, globalIndex) => ({ r, globalIndex }));
    const locMapped = allMapped.filter(({ r }) => {
      const locs = Array.isArray(r.locations) ? r.locations : (r.siteName ? [r.siteName] : (r.location ? [r.location] : []));
      return locs.includes(locName) || r.location === locName;
    });

    let laborCost = 0, leaseCost = 0, disposalCost = 0;

    locMapped.forEach(({ r }) => {
      const mgrs = Array.isArray(r.managers) ? r.managers : (r.manager ? [r.manager] : []);
      mgrs.forEach(mName => laborCost += (managers.find(m => m.name === mName)?.price || 20000));

      const wrks = Array.isArray(r.workers) ? r.workers : (typeof r.workers === 'string' ? r.workers.split(',').map((s: string) => s.trim()) : []);
      wrks.forEach(wName => laborCost += (workers.find(w => w.name === wName)?.price || 15000));

      const machineName = r.machine || r.lease || '';
      const leaseObj = leases.find(l => l.name === machineName);
      const compObj = companyMachines.find(m => m.name === machineName);
      if (leaseObj) leaseCost += leaseObj.price;
      if (compObj) leaseCost += compObj.price;

      const dsps = Array.isArray(r.disposals) ? r.disposals : [];
      dsps.forEach((d: any) => {
        const unitPrice = disposalLocations.find(s => s.location === d.location && s.item === d.item)?.price || 3000;
        disposalCost += Number(d.quantity || 0) * unitPrice;
      });
    });

    return { days: locMapped.length, laborCost, leaseCost, disposalCost, total: laborCost + leaseCost + disposalCost, reportsWithIndex: locMapped };
  };

  if (!isAuthed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4 font-sans">
        <div className="bg-white p-10 rounded-2xl shadow-xl w-full max-w-md border border-slate-200">
          <div className="flex items-center justify-center gap-2 mb-8">
            <span className="text-2xl">🔐</span>
            <h1 className="text-xl font-black text-slate-800 tracking-tight">事務員用 管理画面ログイン</h1>
          </div>
          <form onSubmit={(e) => {
            e.preventDefault();
            if (password === 'yamato123' || password === 'yamato') {
              setIsAuthed(true);
              setAuthError(false);
              fetchData();
            } else {
              setAuthError(true);
            }
          }} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-600 mb-2">パスワード</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setAuthError(false); }}
                className="w-full p-3 rounded-lg border border-slate-300 text-lg outline-none focus:border-orange-500"
              />
            </div>
            {authError && <p className="text-red-500 text-sm font-bold">パスワードが正しくありません</p>}
            <button type="submit" className="w-full bg-[#E56312] hover:bg-orange-700 text-white font-bold text-lg py-3.5 rounded-xl shadow transition mt-2">
              ログイン
            </button>
          </form>
        </div>
      </div>
    );
  }

  const modalData = modalLocation ? calculateCosts(modalLocation) : null;
  const filteredReports = reports.map((r, globalIndex) => ({ r, globalIndex })).filter(({ r }) => {
    if (!filterLocation) return true;
    const locs = Array.isArray(r.locations) ? r.locations.join(',') : (r.location || r.siteName || '');
    return locs.includes(filterLocation);
  });

  return (
    <div className="min-h-screen bg-slate-100 p-6 font-sans text-slate-800">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* ヘッダー */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black text-slate-800">📊 日報管理・原価詳細ダッシュボード</h1>
            <p className="text-sm text-slate-500 mt-0.5">株式会社大和 音声日報システム</p>
          </div>
          <div className="flex gap-3 items-center">
            <button onClick={fetchData} className="bg-[#0066cc] hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow transition flex items-center gap-1">🔄 更新</button>
            <button onClick={() => setIsAuthed(false)} className="bg-[#1e293b] hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow transition">ログアウト</button>
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

        {/* マスタ登録グリッド */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border space-y-6">
          <h2 className="text-lg font-black text-slate-800">⚙️ マスタ登録 (現場・重機・処分・スクラップ等)</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* 現場名一覧 */}
            <div className="border p-4 rounded-xl bg-slate-50 space-y-3">
              <h3 className="font-bold text-sm text-slate-700">🏢 現場名一覧</h3>
              <div className="flex gap-2">
                <input type="text" placeholder="新しい現場名" value={newLocation} onChange={e => setNewLocation(e.target.value)} className="w-full p-2.5 border rounded-lg text-sm bg-white outline-none focus:border-orange-500" />
                <button onClick={() => handleAdd('location')} className="bg-[#e56312] hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-bold shrink-0 shadow">追加</button>
              </div>
              <div className="max-h-40 overflow-y-auto divide-y bg-white rounded-lg border p-2">
                {locations.map(loc => (
                  <div key={loc} className="py-2 px-1 flex justify-between items-center text-sm font-bold">
                    <span>{loc}</span>
                    <button onClick={() => handleDelete('location', loc)} className="text-red-500 text-xs font-bold hover:underline">削除</button>
                  </div>
                ))}
              </div>
            </div>

            {/* リース・重機マスタ */}
            <div className="border p-4 rounded-xl bg-slate-50 space-y-3">
              <h3 className="font-bold text-sm text-slate-700">🚜 リース・重機マスタ ＆ 単価</h3>
              <input type="text" placeholder="例: 0.2ユンボ" value={newLeaseName} onChange={e => setNewLeaseName(e.target.value)} className="w-full p-2.5 border rounded-lg text-sm bg-white outline-none" />
              <div className="flex gap-2 items-center">
                <span className="text-xs font-bold text-slate-500">日額¥</span>
                <input type="number" value={newLeasePrice} onChange={e => setNewLeasePrice(Number(e.target.value))} className="w-full p-2.5 border rounded-lg text-sm bg-white outline-none" />
                <button onClick={() => handleAdd('lease')} className="bg-[#e56312] hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-bold shrink-0 shadow">追加</button>
              </div>
              <div className="max-h-40 overflow-y-auto divide-y bg-white rounded-lg border p-2">
                {leases.map(l => (
                  <div key={l.name} className="py-2 px-1 flex justify-between items-center text-sm font-bold">
                    <span>{l.name} <span className="text-xs text-slate-400 font-normal">日額¥{l.price}</span></span>
                    <button onClick={() => handleDelete('lease', l.name)} className="text-red-500 text-xs font-bold hover:underline">削除</button>
                  </div>
                ))}
              </div>
            </div>

            {/* 自社重機マスタ */}
            <div className="border p-4 rounded-xl bg-slate-50 space-y-3">
              <h3 className="font-bold text-sm text-slate-700">🏗️ 自社重機マスタ ＆ 単価</h3>
              <input type="text" placeholder="例: 自社バックホウ" value={newCompName} onChange={e => setNewCompName(e.target.value)} className="w-full p-2.5 border rounded-lg text-sm bg-white outline-none" />
              <div className="flex gap-2 items-center">
                <span className="text-xs font-bold text-slate-500">日額¥</span>
                <input type="number" value={newCompPrice} onChange={e => setNewCompPrice(Number(e.target.value))} className="w-full p-2.5 border rounded-lg text-sm bg-white outline-none" />
                <button onClick={() => handleAdd('company')} className="bg-[#e56312] hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-bold shrink-0 shadow">追加</button>
              </div>
              <div className="max-h-40 overflow-y-auto divide-y bg-white rounded-lg border p-2">
                {companyMachines.map(m => (
                  <div key={m.name} className="py-2 px-1 flex justify-between items-center text-sm font-bold">
                    <span>{m.name} <span className="text-xs text-slate-400 font-normal">日額¥{m.price}</span></span>
                    <button onClick={() => handleDelete('company', m.name)} className="text-red-500 text-xs font-bold hover:underline">削除</button>
                  </div>
                ))}
              </div>
            </div>

          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* 車両マスタ */}
            <div className="border p-4 rounded-xl bg-slate-50 space-y-3">
              <h3 className="font-bold text-sm text-slate-700">🚚 車両マスタ</h3>
              <div className="flex gap-2">
                <input type="text" placeholder="車両名" value={newVehicle} onChange={e => setNewVehicle(e.target.value)} className="w-full p-2.5 border rounded-lg text-sm bg-white outline-none" />
                <button onClick={() => handleAdd('vehicle')} className="bg-[#e56312] hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-bold shrink-0 shadow">追加</button>
              </div>
              <div className="max-h-40 overflow-y-auto divide-y bg-white rounded-lg border p-2">
                {vehicles.map(v => (
                  <div key={v} className="py-2 px-1 flex justify-between items-center text-sm font-bold">
                    <span>{v}</span>
                    <button onClick={() => handleDelete('vehicle', v)} className="text-red-500 text-xs font-bold hover:underline">削除</button>
                  </div>
                ))}
              </div>
            </div>

            {/* 処分場マスタ */}
            <div className="border p-4 rounded-xl bg-slate-50 space-y-3">
              <h3 className="font-bold text-sm text-slate-700">🗑️ 処分場マスタ ＆ 単価</h3>
              <input type="text" placeholder="処分場名" value={newDispLoc} onChange={e => setNewDispLoc(e.target.value)} className="w-full p-2.5 border rounded-lg text-sm bg-white outline-none" />
              <div className="flex gap-2">
                <input type="text" value={newDispItem} onChange={e => setNewDispItem(e.target.value)} className="w-1/2 p-2.5 border rounded-lg text-sm bg-white font-bold" />
                <span className="text-sm font-bold flex items-center">t</span>
              </div>
              <div className="flex gap-2 items-center">
                <span className="text-xs font-bold text-slate-500">単価¥</span>
                <input type="number" value={newDispPrice} onChange={e => setNewDispPrice(Number(e.target.value))} className="w-full p-2.5 border rounded-lg text-sm bg-white outline-none" />
                <button onClick={() => handleAdd('disposal')} className="bg-[#e56312] hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-bold shrink-0 shadow">追加</button>
              </div>
              <div className="max-h-40 overflow-y-auto divide-y bg-white rounded-lg border p-2">
                {disposalLocations.map((d, idx) => (
                  <div key={idx} className="py-2 px-1 flex justify-between items-center text-xs font-bold">
                    <span>{d.location} ({d.item}) ¥{d.price}</span>
                    <button onClick={() => handleDelete('disposal', idx)} className="text-red-500 font-bold hover:underline">削除</button>
                  </div>
                ))}
              </div>
            </div>

            {/* スクラップ場マスタ */}
            <div className="border p-4 rounded-xl bg-slate-50 space-y-3">
              <h3 className="font-bold text-sm text-slate-700">♻️ スクラップ場マスタ ＆ 単価</h3>
              <input type="text" placeholder="スクラップ場名" value={newScrapLoc} onChange={e => setNewScrapLoc(e.target.value)} className="w-full p-2.5 border rounded-lg text-sm bg-white outline-none" />
              <div className="flex gap-2">
                <input type="text" value={newScrapItem} onChange={e => setNewScrapItem(e.target.value)} className="w-1/2 p-2.5 border rounded-lg text-sm bg-white font-bold" />
                <span className="text-sm font-bold flex items-center">t</span>
              </div>
              <div className="flex gap-2 items-center">
                <span className="text-xs font-bold text-slate-500">単価¥</span>
                <input type="number" value={newScrapPrice} onChange={e => setNewScrapPrice(Number(e.target.value))} className="w-full p-2.5 border rounded-lg text-sm bg-white outline-none" />
                <button onClick={() => handleAdd('scrap')} className="bg-[#e56312] hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-bold shrink-0 shadow">追加</button>
              </div>
              <div className="max-h-40 overflow-y-auto divide-y bg-white rounded-lg border p-2">
                {scrapLocations.map((s, idx) => (
                  <div key={idx} className="py-2 px-1 flex justify-between items-center text-xs font-bold">
                    <span>{s.location} ({s.item}) ¥{s.price}</span>
                    <button onClick={() => handleDelete('scrap', idx)} className="text-red-500 font-bold hover:underline">削除</button>
                  </div>
                ))}
              </div>
            </div>

          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 現場責任者 */}
            <div className="border p-4 rounded-xl bg-slate-50 space-y-3">
              <h3 className="font-bold text-sm text-slate-700">👤 現場責任者 ＆ 日額単価</h3>
              <input type="text" placeholder="責任者名" value={newManagerName} onChange={e => setNewManagerName(e.target.value)} className="w-full p-2.5 border rounded-lg text-sm bg-white outline-none" />
              <div className="flex gap-2 items-center">
                <span className="text-xs font-bold text-slate-500">日額¥</span>
                <input type="number" value={newManagerPrice} onChange={e => setNewManagerPrice(Number(e.target.value))} className="w-full p-2.5 border rounded-lg text-sm bg-white outline-none" />
                <button onClick={() => handleAdd('manager')} className="bg-[#e56312] hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-bold shrink-0 shadow">追加</button>
              </div>
              <div className="max-h-40 overflow-y-auto divide-y bg-white rounded-lg border p-2">
                {managers.map(m => (
                  <div key={m.name} className="py-2 px-1 flex justify-between items-center text-sm font-bold">
                    <span>{m.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-500">日額¥{m.price}</span>
                      <button onClick={() => handleDelete('manager', m.name)} className="text-red-500 text-xs font-bold hover:underline">削除</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 作業メンバー */}
            <div className="border p-4 rounded-xl bg-slate-50 space-y-3">
              <h3 className="font-bold text-sm text-slate-700">👥 作業メンバー ＆ 日額単価</h3>
              <input type="text" placeholder="メンバー名" value={newWorkerName} onChange={e => setNewWorkerName(e.target.value)} className="w-full p-2.5 border rounded-lg text-sm bg-white outline-none" />
              <div className="flex gap-2 items-center">
                <span className="text-xs font-bold text-slate-500">日額¥</span>
                <input type="number" value={newWorkerPrice} onChange={e => setNewWorkerPrice(Number(e.target.value))} className="w-full p-2.5 border rounded-lg text-sm bg-white outline-none" />
                <button onClick={() => handleAdd('worker')} className="bg-[#e56312] hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-bold shrink-0 shadow">追加</button>
              </div>
              <div className="max-h-40 overflow-y-auto divide-y bg-white rounded-lg border p-2">
                {workers.map(w => (
                  <div key={w.name} className="py-2 px-1 flex justify-between items-center text-sm font-bold">
                    <span>{w.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-500">日額¥{w.price}</span>
                      <button onClick={() => handleDelete('worker', w.name)} className="text-red-500 text-xs font-bold hover:underline">削除</button>
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
            <h2 className="text-lg font-black text-slate-800">📥 送信された日報一覧</h2>
            <div className="flex gap-2 items-center">
              <input
                type="text"
                placeholder="現場名で絞り込み..."
                value={filterLocation}
                onChange={e => setFilterLocation(e.target.value)}
                className="p-2 border rounded-xl text-sm bg-slate-50 outline-none w-48"
              />
              <button onClick={fetchData} className="bg-[#0066cc] hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow flex items-center gap-1">🔄 最新情報に更新</button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b text-slate-500 text-sm">
                  <th className="pb-3 font-bold">日付 / 送信日時</th>
                  <th className="pb-3 font-bold">現場名</th>
                  <th className="pb-3 font-bold">責任者 / 作業者</th>
                  <th className="pb-3 font-bold">概算人件費</th>
                  <th className="pb-3 font-bold">重機 / 車両</th>
                  <th className="pb-3 font-bold">作業内容</th>
                  <th className="pb-3 font-bold">処分 / スクラップ</th>
                  <th className="pb-3 text-center font-bold">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y text-sm">
                {filteredReports.map(({ r, globalIndex }) => {
                  const mgrs = Array.isArray(r.managers) ? r.managers.join(', ') : (r.manager || '');
                  const wrks = Array.isArray(r.workers) ? r.workers : (r.workers || 'なし');
                  
                  let rLabor = 0;
                  const currentMgr = editingIndex === globalIndex ? editForm.manager : (r.manager || '');
                  if (currentMgr) rLabor += (managers.find(m => m.name === currentMgr)?.price || 20000);
                  if (Array.isArray(r.workers)) {
                    r.workers.forEach((w: string) => rLabor += (workers.find(wk => wk.name === w)?.price || 15000));
                  }

                  return (
                    <tr key={globalIndex} className="hover:bg-slate-50 align-top">
                      <td className="py-4 font-bold">
                        <div>{r.date}</div>
                        <div className="text-xs text-slate-400 font-normal">{r.createdAt ? new Date(r.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}</div>
                      </td>

                      {/* 現場名 */}
                      <td className="py-4 font-bold text-[#0066cc]">
                        {editingIndex === globalIndex ? (
                          <select
                            value={editForm.location}
                            onChange={e => setEditForm({ ...editForm, location: e.target.value })}
                            className="border p-1.5 rounded text-xs font-bold bg-white w-full"
                          >
                            <option value="">現場を選択</option>
                            {locations.map(l => <option key={l} value={l}>{l}</option>)}
                          </select>
                        ) : (
                          r.location
                        )}
                      </td>

                      {/* 責任者 / 作業者 */}
                      <td className="py-4">
                        <div className="font-bold">
                          責任者: {editingIndex === globalIndex ? (
                            <select
                              value={editForm.manager}
                              onChange={e => setEditForm({ ...editForm, manager: e.target.value })}
                              className="border p-1 rounded text-xs font-bold bg-white mt-1 w-full"
                            >
                              <option value="">責任者を選択</option>
                              {managers.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}
                            </select>
                          ) : (
                            mgrs
                          )}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">作業者: {Array.isArray(wrks) ? wrks.join(', ') : wrks}</div>
                      </td>

                      <td className="py-4 text-emerald-600 font-bold">¥{rLabor.toLocaleString()}</td>

                      {/* 重機 / 車両 */}
                      <td className="py-4 text-slate-600">
                        {editingIndex === globalIndex ? (
                          <div className="space-y-1">
                            <div>
                              <span className="text-[10px] text-slate-400 block">重機</span>
                              <select
                                value={editForm.machine}
                                onChange={e => setEditForm({ ...editForm, machine: e.target.value })}
                                className="border p-1 rounded text-xs bg-white w-full"
                              >
                                <option value="">重機なし</option>
                                {(leases || []).concat(companyMachines || []).map((m: any) => (
                                  <option key={m.name} value={m.name}>{m.name}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 block">車両</span>
                              <select
                                value={editForm.vehicle}
                                onChange={e => setEditForm({ ...editForm, vehicle: e.target.value })}
                                className="border p-1 rounded text-xs bg-white w-full"
                              >
                                <option value="">車両なし</option>
                                {vehicles.map(v => <option key={v} value={v}>{v}</option>)}
                              </select>
                            </div>
                          </div>
                        ) : (
                          <>重機: {r.machine || r.lease || 'なし'}<br/>車両: {r.vehicle || 'なし'}</>
                        )}
                      </td>

                      {/* 作業内容 */}
                      <td className="py-4">
                        {editingIndex === globalIndex ? (
                          <textarea
                            value={editForm.workDescription}
                            onChange={e => setEditForm({ ...editForm, workDescription: e.target.value })}
                            className="border p-1.5 rounded w-full text-xs bg-white"
                            rows={2}
                          />
                        ) : (
                          r.workDescription || r.content || ''
                        )}
                      </td>

                      <td className="py-4">
                        {Array.isArray(r.disposals) && r.disposals.length > 0 && (
                          <div className="text-xs text-blue-700 font-bold">【処分】{r.disposals.map((d: any, idx: number) => `${d.location}(${d.item}):${d.quantity}t`).join(', ')}</div>
                        )}
                        {Array.isArray(r.scraps) && r.scraps.length > 0 && (
                          <div className="text-xs text-orange-700 font-bold">【スクラップ】{r.scraps.map((s: any, idx: number) => `${s.location}(${s.item}):${s.quantity}t`).join(', ')}</div>
                        )}
                      </td>

                      <td className="py-4 text-center space-x-1 whitespace-nowrap">
                        {editingIndex === globalIndex ? (
                          <button onClick={() => handleSaveEdit(globalIndex)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded text-xs font-bold shadow">保存</button>
                        ) : (
                          <button onClick={() => {
                            setEditingIndex(globalIndex);
                            setEditForm({
                              location: r.location || '',
                              manager: r.manager || '',
                              machine: r.machine || r.lease || '',
                              vehicle: r.vehicle || '',
                              workDescription: r.workDescription || r.content || ''
                            });
                          }} className="bg-[#0066cc] hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-bold shadow">編集</button>
                        )}
                        <button onClick={() => handleDelete('report', globalIndex)} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs font-bold shadow">削除</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
