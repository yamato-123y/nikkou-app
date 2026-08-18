'use client';
import { useState, useEffect } from 'react';

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [isAuthed, setIsAuthed] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [reports, setReports] = useState<any[]>([]);

  const [locations, setLocations] = useState<string[]>(['堺市邸解体工事', '北花田店舗改修', '美原区住宅解体', '美加の台']);
  const [leases, setLeases] = useState<{ name: string; price: number }[]>([{ name: '0.2ユンボ', price: 15000 }]);
  const [vehicles, setVehicles] = useState<string[]>(['2tダンプ', '4tダンプ', '軽トラ']);
  const [scrapLocations, setScrapLocations] = useState<{ location: string; item: string; unit: string; price: number }[]>([{ location: 'テスト場', item: '鉄', unit: 't', price: 3000 }]);
  const [managers, setManagers] = useState<{ name: string; price: number }[]>([{ name: '大和 太郎', price: 20000 }]);
  const [workers, setWorkers] = useState<{ name: string; price: number }[]>([{ name: 'Aさん', price: 15000 }]);

  const [modalLocation, setModalLocation] = useState<string | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editDesc, setEditDesc] = useState('');

  // 編集中のマスタ状態
  const [editingMaster, setEditingMaster] = useState<{ type: string; index: number; name: string; price: number; item?: string } | null>(null);

  const [newLocation, setNewLocation] = useState('');
  const [newLeaseName, setNewLeaseName] = useState('');
  const [newLeasePrice, setNewLeasePrice] = useState(15000);
  const [newVehicle, setNewVehicle] = useState('');
  const [newScrapLoc, setNewScrapLoc] = useState('');
  const [newScrapItem, setNewScrapItem] = useState('鉄');
  const [newScrapPrice, setNewScrapPrice] = useState(3000);
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
          if (Array.isArray(data.vehicles)) setVehicles(data.vehicles);
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
    let updatedVehicles = [...vehicles];
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
    } else if (type === 'vehicle' && newVehicle.trim()) {
      updatedVehicles.push(newVehicle.trim());
      setVehicles(updatedVehicles);
      setNewVehicle('');
    } else if (type === 'scrap' && newScrapLoc.trim() && newScrapItem.trim()) {
      updatedScraps.push({ location: newScrapLoc.trim(), item: newScrapItem.trim(), unit: 't', price: Number(newScrapPrice) });
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
      vehicles: updatedVehicles,
      scrapLocations: updatedScraps,
      managers: updatedManagers,
      workers: updatedWorkers
    });
  };

  const handleDelete = (type: string, target: any) => {
    let updatedLocations = [...locations];
    let updatedLeases = [...leases];
    let updatedVehicles = [...vehicles];
    let updatedScraps = [...scrapLocations];
    let updatedManagers = [...managers];
    let updatedWorkers = [...workers];

    if (type === 'location') updatedLocations = locations.filter(l => l !== target);
    else if (type === 'lease') updatedLeases = leases.filter(l => l.name !== target);
    else if (type === 'vehicle') updatedVehicles = vehicles.filter(v => v !== target);
    else if (type === 'scrap') updatedScraps = scrapLocations.filter((_, i) => i !== target);
    else if (type === 'manager') updatedManagers = managers.filter(m => m.name !== target);
    else if (type === 'worker') updatedWorkers = workers.filter(w => w.name !== target);

    setLocations(updatedLocations);
    setLeases(updatedLeases);
    setVehicles(updatedVehicles);
    setScrapLocations(updatedScraps);
    setManagers(updatedManagers);
    setWorkers(updatedWorkers);

    saveSettingsToServer({
      locations: updatedLocations,
      leases: updatedLeases,
      vehicles: updatedVehicles,
      scrapLocations: updatedScraps,
      managers: updatedManagers,
      workers: updatedWorkers
    });
  };

  const handleSaveMasterEdit = () => {
    if (!editingMaster) return;
    const { type, index, name, price, item } = editingMaster;

    let updatedLocations = [...locations];
    let updatedLeases = [...leases];
    let updatedVehicles = [...vehicles];
    let updatedScraps = [...scrapLocations];
    let updatedManagers = [...managers];
    let updatedWorkers = [...workers];

    if (type === 'location') updatedLocations[index] = name;
    else if (type === 'lease') updatedLeases[index] = { name, price };
    else if (type === 'vehicle') updatedVehicles[index] = name;
    else if (type === 'scrap') updatedScraps[index] = { ...updatedScraps[index], location: name, item: item || '鉄', price };
    else if (type === 'manager') updatedManagers[index] = { name, price };
    else if (type === 'worker') updatedWorkers[index] = { name, price };

    setLocations(updatedLocations);
    setLeases(updatedLeases);
    setVehicles(updatedVehicles);
    setScrapLocations(updatedScraps);
    setManagers(updatedManagers);
    setWorkers(updatedWorkers);
    setEditingMaster(null);

    saveSettingsToServer({
      locations: updatedLocations,
      leases: updatedLeases,
      vehicles: updatedVehicles,
      scrapLocations: updatedScraps,
      managers: updatedManagers,
      workers: updatedWorkers
    });
  };

  const handleSaveEdit = async (index: number) => {
    const updated = [...reports];
    updated[index].workDescription = editDesc;
    setReports(updated);
    setEditingIndex(null);
    await fetch('/api/reports', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) });
  };

  const calculateCosts = (locName: string) => {
    const locReports = reports.filter(r => {
      const locs = Array.isArray(r.locations) ? r.locations : (r.siteName ? [r.siteName] : (r.location ? [r.location] : []));
      return locs.includes(locName);
    });

    let laborCost = 0, leaseCost = 0, disposalCost = 0;

    locReports.forEach(r => {
      const mgrs = Array.isArray(r.managers) ? r.managers : (r.manager ? [r.manager] : []);
      mgrs.forEach(mName => laborCost += (managers.find(m => m.name === mName)?.price || 0));

      const wrks = Array.isArray(r.workers) ? r.workers : (typeof r.workers === 'string' ? r.workers.split(',').map((s: string) => s.trim()) : []);
      wrks.forEach(wName => laborCost += (workers.find(w => w.name === wName)?.price || 0));

      const lses = Array.isArray(r.leases) ? r.leases : (r.lease ? [r.lease] : []);
      lses.forEach(lName => leaseCost += (leases.find(l => l.name === lName)?.price || 0));

      const dsps = Array.isArray(r.disposals) ? r.disposals : [];
      dsps.forEach((d: any) => {
        const unitPrice = scrapLocations.find(s => s.location === d.location && s.item === d.item)?.price || 0;
        disposalCost += Number(d.quantity || 0) * unitPrice;
      });
    });

    return { days: locReports.length, laborCost, leaseCost, disposalCost, total: laborCost + leaseCost + disposalCost, reports: locReports };
  };

  if (!isAuthed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4 font-sans">
        <div className="bg-white p-10 rounded-2xl shadow-xl w-full max-w-md border border-slate-200">
          <div className="flex items-center justify-center gap-2 mb-8">
            <span className="text-2xl">🔒</span>
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
            <button type="submit" className="w-full bg-[#E56312] hover:bg-[#d0570f] text-white font-bold text-lg py-3.5 rounded-xl shadow transition mt-2">
              ログイン
            </button>
          </form>
        </div>
      </div>
    );
  }

  const modalData = modalLocation ? calculateCosts(modalLocation) : null;

  return (
    <div className="min-h-screen bg-slate-100 p-6 font-sans text-slate-800">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border flex justify-between items-center">
          <h1 className="text-2xl font-black">📊 原価詳細ダッシュボード</h1>
          <button onClick={() => setIsAuthed(false)} className="bg-slate-800 text-white px-4 py-2 rounded-xl font-bold text-sm">ログアウト</button>
        </div>

        {/* サマリーテーブル */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border overflow-x-auto">
          <h2 className="text-lg font-black mb-4">🏢 現場別 経費集計サマリー</h2>
          <table className="w-full text-left border-collapse">
            <thead><tr className="border-b text-slate-500 text-sm"><th className="pb-3">現場名</th><th className="pb-3">稼働日数</th><th className="pb-3">人件費</th><th className="pb-3">リース費</th><th className="pb-3">処分費</th><th className="pb-3">合計</th><th className="pb-3 text-center">詳細</th></tr></thead>
            <tbody className="divide-y font-bold text-base">
              {locations.map(loc => {
                const c = calculateCosts(loc);
                return (
                  <tr key={loc} className="hover:bg-slate-50">
                    <td className="py-4 text-[#1D70B8]">{loc}</td>
                    <td>{c.days} 日</td>
                    <td>¥{c.laborCost.toLocaleString()}</td>
                    <td>¥{c.leaseCost.toLocaleString()}</td>
                    <td>¥{c.disposalCost.toLocaleString()}</td>
                    <td className="text-emerald-600 font-black">¥{c.total.toLocaleString()}</td>
                    <td className="text-center"><button onClick={() => setModalLocation(loc)} className="bg-[#1D70B8] text-white px-4 py-1.5 rounded-lg text-sm shadow">詳細 →</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* マスタ登録一覧（編集・削除機能付き・確認なし） */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border space-y-6">
          <h2 className="text-lg font-black">⚙️ マスタ登録一覧</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* 現場名 */}
            <div className="border p-4 rounded-xl bg-slate-50 space-y-3">
              <h3 className="font-bold text-sm">🏢 現場名</h3>
              <div className="flex gap-2">
                <input type="text" placeholder="新しい現場名" value={newLocation} onChange={e => setNewLocation(e.target.value)} className="w-full p-2 border rounded text-sm bg-white" />
                <button onClick={() => handleAdd('location')} className="bg-orange-600 text-white px-3 py-2 rounded text-sm font-bold shrink-0">追加</button>
              </div>
              <div className="max-h-36 overflow-y-auto divide-y">
                {locations.map((loc, idx) => (
                  <div key={loc} className="py-2 flex justify-between items-center text-sm font-bold">
                    {editingMaster?.type === 'location' && editingMaster.index === idx ? (
                      <div className="flex gap-1 w-full mr-2">
                        <input value={editingMaster.name} onChange={e => setEditingMaster({ ...editingMaster, name: e.target.value })} className="border p-1 text-xs w-full rounded bg-white" />
                        <button onClick={handleSaveMasterEdit} className="bg-emerald-600 text-white px-2 py-0.5 rounded text-xs">保存</button>
                      </div>
                    ) : (
                      <>
                        <span>{loc}</span>
                        <div className="space-x-2 shrink-0">
                          <button onClick={() => setEditingMaster({ type: 'location', index: idx, name: loc, price: 0 })} className="text-blue-600 text-xs font-bold">編集</button>
                          <button onClick={() => handleDelete('location', loc)} className="text-red-500 text-xs font-bold">削除</button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* リース重機 */}
            <div className="border p-4 rounded-xl bg-slate-50 space-y-3">
              <h3 className="font-bold text-sm">🚜 リース・重機 ＆ 単価</h3>
              <input type="text" placeholder="リース名" value={newLeaseName} onChange={e => setNewLeaseName(e.target.value)} className="w-full p-2 border rounded text-sm bg-white" />
              <div className="flex gap-2 items-center">
                <span className="text-xs font-bold">日額¥</span>
                <input type="number" value={newLeasePrice} onChange={e => setNewLeasePrice(Number(e.target.value))} className="w-full p-2 border rounded text-sm bg-white" />
                <button onClick={() => handleAdd('lease')} className="bg-orange-600 text-white px-3 py-2 rounded text-sm font-bold shrink-0">追加</button>
              </div>
              <div className="max-h-36 overflow-y-auto divide-y">
                {leases.map((l, idx) => (
                  <div key={l.name} className="py-2 flex justify-between items-center text-sm font-bold">
                    {editingMaster?.type === 'lease' && editingMaster.index === idx ? (
                      <div className="flex gap-1 w-full mr-2 items-center">
                        <input value={editingMaster.name} onChange={e => setEditingMaster({ ...editingMaster, name: e.target.value })} className="border p-1 text-xs w-full rounded bg-white" />
                        <input type="number" value={editingMaster.price} onChange={e => setEditingMaster({ ...editingMaster, price: Number(e.target.value) })} className="border p-1 text-xs w-20 rounded bg-white" />
                        <button onClick={handleSaveMasterEdit} className="bg-emerald-600 text-white px-2 py-0.5 rounded text-xs shrink-0">保存</button>
                      </div>
                    ) : (
                      <>
                        <span>{l.name} (¥{l.price})</span>
                        <div className="space-x-2 shrink-0">
                          <button onClick={() => setEditingMaster({ type: 'lease', index: idx, name: l.name, price: l.price })} className="text-blue-600 text-xs font-bold">編集</button>
                          <button onClick={() => handleDelete('lease', l.name)} className="text-red-500 text-xs font-bold">削除</button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 処分場・スクラップ */}
            <div className="border p-4 rounded-xl bg-slate-50 space-y-3">
              <h3 className="font-bold text-sm">🗑️ 処分場・スクラップ ＆ 単価</h3>
              <input type="text" placeholder="処分場名" value={newScrapLoc} onChange={e => setNewScrapLoc(e.target.value)} className="w-full p-2 border rounded text-sm bg-white" />
              <select value={newScrapItem} onChange={e => setNewScrapItem(e.target.value)} className="w-full p-2 border rounded text-sm bg-white font-bold">
                <option value="鉄">鉄</option>
                <option value="アルミ">アルミ</option>
                <option value="銅">銅</option>
                <option value="その他">その他</option>
              </select>
              <div className="flex gap-2 items-center">
                <span className="text-xs font-bold">単価¥</span>
                <input type="number" value={newScrapPrice} onChange={e => setNewScrapPrice(Number(e.target.value))} className="w-full p-2 border rounded text-sm bg-white" />
                <button onClick={() => handleAdd('scrap')} className="bg-orange-600 text-white px-3 py-2 rounded text-sm font-bold shrink-0">追加</button>
              </div>
              <div className="max-h-36 overflow-y-auto divide-y">
                {scrapLocations.map((sc, idx) => (
                  <div key={idx} className="py-2 flex justify-between items-center text-xs font-bold">
                    {editingMaster?.type === 'scrap' && editingMaster.index === idx ? (
                      <div className="flex gap-1 w-full mr-2 items-center">
                        <input value={editingMaster.name} onChange={e => setEditingMaster({ ...editingMaster, name: e.target.value })} className="border p-1 text-xs w-full rounded bg-white" />
                        <input type="number" value={editingMaster.price} onChange={e => setEditingMaster({ ...editingMaster, price: Number(e.target.value) })} className="border p-1 text-xs w-16 rounded bg-white" />
                        <button onClick={handleSaveMasterEdit} className="bg-emerald-600 text-white px-2 py-0.5 rounded text-xs shrink-0">保存</button>
                      </div>
                    ) : (
                      <>
                        <span>{sc.location} ({sc.item}) ¥{sc.price}</span>
                        <div className="space-x-2 shrink-0">
                          <button onClick={() => setEditingMaster({ type: 'scrap', index: idx, name: sc.location, price: sc.price, item: sc.item })} className="text-blue-600 text-xs font-bold">編集</button>
                          <button onClick={() => handleDelete('scrap', idx)} className="text-red-500 text-xs font-bold">削除</button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* 車両 */}
            <div className="border p-4 rounded-xl bg-slate-50 space-y-3">
              <h3 className="font-bold text-sm">🚚 車両マスタ</h3>
              <div className="flex gap-2">
                <input type="text" placeholder="車両名" value={newVehicle} onChange={e => setNewVehicle(e.target.value)} className="w-full p-2 border rounded text-sm bg-white" />
                <button onClick={() => handleAdd('vehicle')} className="bg-orange-600 text-white px-3 py-2 rounded text-sm font-bold shrink-0">追加</button>
              </div>
              <div className="max-h-36 overflow-y-auto divide-y">
                {vehicles.map((v, idx) => (
                  <div key={v} className="py-2 flex justify-between items-center text-sm font-bold">
                    {editingMaster?.type === 'vehicle' && editingMaster.index === idx ? (
                      <div className="flex gap-1 w-full mr-2">
                        <input value={editingMaster.name} onChange={e => setEditingMaster({ ...editingMaster, name: e.target.value })} className="border p-1 text-xs w-full rounded bg-white" />
                        <button onClick={handleSaveMasterEdit} className="bg-emerald-600 text-white px-2 py-0.5 rounded text-xs">保存</button>
                      </div>
                    ) : (
                      <>
                        <span>{v}</span>
                        <div className="space-x-2 shrink-0">
                          <button onClick={() => setEditingMaster({ type: 'vehicle', index: idx, name: v, price: 0 })} className="text-blue-600 text-xs font-bold">編集</button>
                          <button onClick={() => handleDelete('vehicle', v)} className="text-red-500 text-xs font-bold">削除</button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 現場責任者 */}
            <div className="border p-4 rounded-xl bg-slate-50 space-y-3">
              <h3 className="font-bold text-sm">👤 現場責任者 ＆ 単価</h3>
              <input type="text" placeholder="責任者名" value={newManagerName} onChange={e => setNewManagerName(e.target.value)} className="w-full p-2 border rounded text-sm bg-white" />
              <div className="flex gap-2 items-center">
                <span className="text-xs font-bold">日額¥</span>
                <input type="number" value={newManagerPrice} onChange={e => setNewManagerPrice(Number(e.target.value))} className="w-full p-2 border rounded text-sm bg-white" />
                <button onClick={() => handleAdd('manager')} className="bg-orange-600 text-white px-3 py-2 rounded text-sm font-bold shrink-0">追加</button>
              </div>
              <div className="max-h-36 overflow-y-auto divide-y">
                {managers.map((m, idx) => (
                  <div key={m.name} className="py-2 flex justify-between items-center text-sm font-bold">
                    {editingMaster?.type === 'manager' && editingMaster.index === idx ? (
                      <div className="flex gap-1 w-full mr-2 items-center">
                        <input value={editingMaster.name} onChange={e => setEditingMaster({ ...editingMaster, name: e.target.value })} className="border p-1 text-xs w-full rounded bg-white" />
                        <input type="number" value={editingMaster.price} onChange={e => setEditingMaster({ ...editingMaster, price: Number(e.target.value) })} className="border p-1 text-xs w-20 rounded bg-white" />
                        <button onClick={handleSaveMasterEdit} className="bg-emerald-600 text-white px-2 py-0.5 rounded text-xs shrink-0">保存</button>
                      </div>
                    ) : (
                      <>
                        <span>{m.name} (¥{m.price})</span>
                        <div className="space-x-2 shrink-0">
                          <button onClick={() => setEditingMaster({ type: 'manager', index: idx, name: m.name, price: m.price })} className="text-blue-600 text-xs font-bold">編集</button>
                          <button onClick={() => handleDelete('manager', m.name)} className="text-red-500 text-xs font-bold">削除</button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 作業メンバー */}
            <div className="border p-4 rounded-xl bg-slate-50 space-y-3">
              <h3 className="font-bold text-sm">👥 作業メンバー ＆ 単価</h3>
              <input type="text" placeholder="メンバー名" value={newWorkerName} onChange={e => setNewWorkerName(e.target.value)} className="w-full p-2 border rounded text-sm bg-white" />
              <div className="flex gap-2 items-center">
                <span className="text-xs font-bold">日額¥</span>
                <input type="number" value={newWorkerPrice} onChange={e => setNewWorkerPrice(Number(e.target.value))} className="w-full p-2 border rounded text-sm bg-white" />
                <button onClick={() => handleAdd('worker')} className="bg-orange-600 text-white px-3 py-2 rounded text-sm font-bold shrink-0">追加</button>
              </div>
              <div className="max-h-36 overflow-y-auto divide-y">
                {workers.map((w, idx) => (
                  <div key={w.name} className="py-2 flex justify-between items-center text-sm font-bold">
                    {editingMaster?.type === 'worker' && editingMaster.index === idx ? (
                      <div className="flex gap-1 w-full mr-2 items-center">
                        <input value={editingMaster.name} onChange={e => setEditingMaster({ ...editingMaster, name: e.target.value })} className="border p-1 text-xs w-full rounded bg-white" />
                        <input type="number" value={editingMaster.price} onChange={e => setEditingMaster({ ...editingMaster, price: Number(e.target.value) })} className="border p-1 text-xs w-20 rounded bg-white" />
                        <button onClick={handleSaveMasterEdit} className="bg-emerald-600 text-white px-2 py-0.5 rounded text-xs shrink-0">保存</button>
                      </div>
                    ) : (
                      <>
                        <span>{w.name} (¥{w.price})</span>
                        <div className="space-x-2 shrink-0">
                          <button onClick={() => setEditingMaster({ type: 'worker', index: idx, name: w.name, price: w.price })} className="text-blue-600 text-xs font-bold">編集</button>
                          <button onClick={() => handleDelete('worker', w.name)} className="text-red-500 text-xs font-bold">削除</button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* 送信日報一覧 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-black">📥 送信された日報一覧</h2>
            <button onClick={fetchData} className="bg-[#1D70B8] text-white px-4 py-2 rounded-xl text-sm font-bold shadow">🔄 更新</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead><tr className="border-b text-slate-500 text-sm"><th className="pb-3">日付</th><th className="pb-3">現場名</th><th className="pb-3">作業者</th><th className="pb-3">作業内容</th><th className="pb-3">写真</th><th className="pb-3 text-center">操作</th></tr></thead>
              <tbody className="divide-y text-sm">
                {reports.map((r, i) => {
                  const locs = Array.isArray(r.locations) ? r.locations.join(', ') : (r.siteName || r.location || '');
                  const mgrs = Array.isArray(r.managers) ? r.managers.join(', ') : (r.manager || '');
                  const wrks = Array.isArray(r.workers) ? r.workers.join(', ') : (r.workers || '');
                  return (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="py-4 font-bold">{r.date}</td>
                      <td className="font-bold text-[#1D70B8]">{locs}</td>
                      <td>
                        <div>責: {mgrs}</div>
                        <div className="text-xs text-slate-500">作: {wrks}</div>
                      </td>
                      <td>
                        {editingIndex === i ? <input value={editDesc} onChange={e => setEditDesc(e.target.value)} className="border p-1.5 rounded w-full text-sm" /> : (r.workDescription || r.content || '')}
                      </td>
                      <td>{r.photo && <img src={r.photo} className="w-14 h-14 object-cover rounded shadow" />}</td>
                      <td className="text-center space-x-2">
                        {editingIndex === i ? <button onClick={() => handleSaveEdit(i)} className="bg-emerald-600 text-white px-3 py-1 rounded text-xs font-bold">保存</button> 
                        : <button onClick={() => {setEditingIndex(i); setEditDesc(r.workDescription || r.content || '');}} className="bg-blue-600 text-white px-3 py-1 rounded text-xs font-bold">編集</button>}
                        <button onClick={() => handleDelete('report', i)} className="bg-red-500 text-white px-3 py-1 rounded text-xs font-bold">削除</button>
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
