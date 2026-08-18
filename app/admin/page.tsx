'use client';
import { useState, useEffect } from 'react';

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [isAuthed, setIsAuthed] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [reports, setReports] = useState<any[]>([]);

  const [locations, setLocations] = useState<string[]>(['堺市邸解体工事', '北花田店舗改修', '美原区住宅解体', '美加の台']);
  const [leases, setLeases] = useState<{ name: string; price: number }[]>([
    { name: '0.2ユンボ', price: 15000 }
  ]);
  const [vehicles, setVehicles] = useState<string[]>(['2tダンプ', '4tダンプ', '軽トラ']);
  const [scrapLocations, setScrapLocations] = useState<{ location: string; item: string; unit: string; price: number }[]>([
    { location: 'テスト場', item: 'ガラ', unit: 't', price: 3000 }
  ]);
  const [managers, setManagers] = useState<{ name: string; price: number }[]>([
    { name: '大和 太郎', price: 20000 },
    { name: '佐藤 次郎', price: 15000 }
  ]);
  const [workers, setWorkers] = useState<{ name: string; price: number }[]>([
    { name: 'Aさん', price: 15000 },
    { name: 'Bさん', price: 16000 }
  ]);

  const [modalLocation, setModalLocation] = useState<string | null>(null);

  const [newLocation, setNewLocation] = useState('');
  const [newLeaseName, setNewLeaseName] = useState('');
  const [newLeasePrice, setNewLeasePrice] = useState(15000);
  const [newVehicle, setNewVehicle] = useState('');
  
  const [newScrapLoc, setNewScrapLoc] = useState('');
  const [newScrapItem, setNewScrapItem] = useState('');
  const [newScrapUnit, setNewScrapUnit] = useState('t');
  const [newScrapPrice, setNewScrapPrice] = useState(3000);

  const [newManagerName, setNewManagerName] = useState('');
  const [newManagerPrice, setNewManagerPrice] = useState(20000);

  const [newWorkerName, setNewWorkerName] = useState('');
  const [newWorkerPrice, setNewWorkerPrice] = useState(15000);

  const [filterLocation, setFilterLocation] = useState('');

  // サーバー（API）およびローカルからデータを一括取得
  const fetchData = async () => {
    try {
      const resReports = await fetch('/api/reports');
      if (resReports.ok) {
        const data = await resReports.json();
        setReports(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.log('レポート取得失敗');
    }

    try {
      const resSettings = await fetch('/api/settings');
      if (resSettings.ok) {
        const data = await resSettings.json();
        if (data && typeof data === 'object') {
          if (data.locations) setLocations(data.locations);
          if (data.leases) setLeases(data.leases);
          if (data.vehicles) setVehicles(data.vehicles);
          if (data.scrapLocations) setScrapLocations(data.scrapLocations);
          if (data.managers) setManagers(data.managers);
          if (data.workers) setWorkers(data.workers);
        }
      }
    } catch (e) {
      console.log('設定取得失敗');
    }
  };

  useEffect(() => {
    fetchData();
    // 5秒ごとに自動で最新データをサーバーから取得（リアルタイム同期）
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'yamato123' || password === 'yamato') {
      setIsAuthed(true);
      setAuthError(false);
      fetchData();
    } else {
      setAuthError(true);
    }
  };

  // サーバーへ設定を保存する関数
  const saveSettingsToServer = async (updatedSettings: any) => {
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSettings)
      });
    } catch (e) {
      console.error(e);
    }
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
      updatedScraps.push({ location: newScrapLoc.trim(), item: newScrapItem.trim(), unit: newScrapUnit, price: Number(newScrapPrice) });
      setScrapLocations(updatedScraps);
      setNewScrapLoc('');
      setNewScrapItem('');
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

  const handleDelete = async (type: string, target: any) => {
    if (!confirm('本当に削除しますか？')) return;

    let updatedLocations = [...locations];
    let updatedLeases = [...leases];
    let updatedVehicles = [...vehicles];
    let updatedScraps = [...scrapLocations];
    let updatedManagers = [...managers];
    let updatedWorkers = [...workers];

    if (type === 'location') {
      updatedLocations = locations.filter(l => l !== target);
      setLocations(updatedLocations);
    } else if (type === 'lease') {
      updatedLeases = leases.filter(l => l.name !== target);
      setLeases(updatedLeases);
    } else if (type === 'vehicle') {
      updatedVehicles = vehicles.filter(v => v !== target);
      setVehicles(updatedVehicles);
    } else if (type === 'scrap') {
      updatedScraps = scrapLocations.filter(s => !(s.location === target.location && s.item === target.item));
      setScrapLocations(updatedScraps);
    } else if (type === 'manager') {
      updatedManagers = managers.filter(m => m.name !== target);
      setManagers(updatedManagers);
    } else if (type === 'worker') {
      updatedWorkers = workers.filter(w => w.name !== target);
      setWorkers(updatedWorkers);
    } else if (type === 'report') {
      const updatedReports = reports.filter((_, idx) => idx !== target);
      setReports(updatedReports);
      // レポート削除のAPI連携が必要な場合はここに追加
      return;
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

  const handlePriceChange = (type: string, targetName: string, newPrice: number) => {
    let updatedLeases = [...leases];
    let updatedManagers = [...managers];
    let updatedWorkers = [...workers];

    if (type === 'lease') {
      updatedLeases = leases.map(l => l.name === targetName ? { ...l, price: newPrice } : l);
      setLeases(updatedLeases);
    } else if (type === 'manager') {
      updatedManagers = managers.map(m => m.name === targetName ? { ...m, price: newPrice } : m);
      setManagers(updatedManagers);
    } else if (type === 'worker') {
      updatedWorkers = workers.map(w => w.name === targetName ? { ...w, price: newPrice } : w);
      setWorkers(updatedWorkers);
    }

    saveSettingsToServer({
      locations,
      leases: updatedLeases,
      vehicles,
      scrapLocations,
      managers: updatedManagers,
      workers: updatedWorkers
    });
  };

  const calculateCosts = (locName: string) => {
    const locReports = reports.filter(r => (r?.locations && r.locations.includes(locName)) || r?.location === locName);
    let laborCost = 0;
    let leaseCost = 0;
    let disposalCost = 0;

    locReports.forEach(r => {
      if (r.manager) {
        const mObj = managers.find(m => m.name === r.manager);
        laborCost += mObj ? mObj.price : 0;
      }
      if (Array.isArray(r.managers)) {
        r.managers.forEach((mName: string) => {
          const mObj = managers.find(m => m.name === mName);
          laborCost += mObj ? mObj.price : 0;
        });
      }
      if (Array.isArray(r.workers)) {
        r.workers.forEach((wName: string) => {
          const wObj = workers.find(wo => wo.name === wName);
          laborCost += wObj ? wObj.price : 0;
        });
      }

      if (r.lease) {
        const lObj = leases.find(l => l.name === r.lease);
        leaseCost += lObj ? lObj.price : 0;
      }
      if (Array.isArray(r.leases)) {
        r.leases.forEach((lName: string) => {
          const lObj = leases.find(l => l.name === lName);
          leaseCost += lObj ? lObj.price : 0;
        });
      }

      if (Array.isArray(r.disposals)) {
        r.disposals.forEach((d: any) => {
          const sObj = scrapLocations.find(s => s.location === d.location && s.item === d.item);
          const unitPrice = sObj ? sObj.price : 0;
          disposalCost += Number(d.quantity || 0) * unitPrice;
        });
      }
    });

    return {
      days: locReports.length,
      laborCost,
      leaseCost,
      disposalCost,
      total: laborCost + leaseCost + disposalCost,
      reports: locReports
    };
  };

  if (!isAuthed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4 font-sans">
        <div className="bg-white p-10 rounded-2xl shadow-xl w-full max-w-md border border-slate-200">
          <div className="flex items-center justify-center gap-2 mb-8">
            <span className="text-2xl">🔒</span>
            <h1 className="text-xl font-black text-slate-800 tracking-tight">事務員用 管理画面ログイン</h1>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
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

  const filteredReports = filterLocation.trim() 
    ? reports.filter(r => (r?.locations && r.locations.some((l: string) => l.includes(filterLocation))) || r?.location?.includes(filterLocation))
    : reports;

  const modalData = modalLocation ? calculateCosts(modalLocation) : null;

  return (
    <div className="min-h-screen bg-slate-100 p-6 font-sans text-slate-800 relative">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* ヘッダー */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
              📊 日報管理・原価詳細ダッシュボード
            </h1>
            <p className="text-sm font-bold text-slate-500 mt-1">株式会社大和 音声日報システム</p>
          </div>
          <button
            onClick={() => setIsAuthed(false)}
            className="bg-slate-800 hover:bg-slate-900 text-white font-bold px-5 py-2.5 rounded-xl shadow transition text-sm"
          >
            ログアウト
          </button>
        </div>

        {/* 現場別 経費集計サマリー */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          <h2 className="text-lg font-black text-slate-900">🏢 現場別 経費集計サマリー</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 text-sm">
                  <th className="pb-3 font-bold">現場名</th>
                  <th className="pb-3 font-bold">稼働日数</th>
                  <th className="pb-3 font-bold">人件費</th>
                  <th className="pb-3 font-bold">リース費</th>
                  <th className="pb-3 font-bold">処分費</th>
                  <th className="pb-3 font-bold">合計経費</th>
                  <th className="pb-3 font-bold text-center">詳細</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-base font-bold">
                {locations.length === 0 ? (
                  <tr><td colSpan={7} className="py-4 text-center text-slate-400 text-sm">現場が登録されていません</td></tr>
                ) : (
                  locations.map((loc) => {
                    const costs = calculateCosts(loc);
                    return (
                      <tr key={loc} className="hover:bg-slate-50">
                        <td className="py-4 text-[#1D70B8]">{loc}</td>
                        <td className="py-4 text-slate-700">{costs.days} 日</td>
                        <td className="py-4 text-slate-700">¥{costs.laborCost.toLocaleString()}</td>
                        <td className="py-4 text-slate-700">¥{costs.leaseCost.toLocaleString()}</td>
                        <td className="py-4 text-slate-700">¥{costs.disposalCost.toLocaleString()}</td>
                        <td className="py-4 text-emerald-600 font-black">¥{costs.total.toLocaleString()}</td>
                        <td className="py-4 text-center">
                          <button
                            onClick={() => setModalLocation(loc)}
                            className="bg-[#1D70B8] hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-sm font-bold shadow"
                          >
                            詳細 →
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* マスタ登録エリア */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
          <h2 className="text-lg font-black text-slate-900">⚙️ マスタ登録（現場・担当者・リース・処分場）</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* 現場名一覧 */}
            <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-sm">🏢 現場名一覧</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="新しい現場名"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300 text-sm bg-white"
                />
                <button onClick={() => handleAdd('location')} className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 rounded-lg text-sm font-bold shrink-0">追加</button>
              </div>
              <div className="divide-y divide-slate-200 max-h-48 overflow-y-auto">
                {locations.map((loc) => (
                  <div key={loc} className="py-2 flex justify-between items-center text-sm font-bold">
                    <span>{loc}</span>
                    <button onClick={() => handleDelete('location', loc)} className="text-red-500 hover:text-red-700 text-xs font-bold">削除</button>
                  </div>
                ))}
              </div>
            </div>

            {/* リース・重機マスタ */}
            <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-sm">🚜 リース・重機マスタ ＆ 日額単価</h3>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="例: 0.2ユンボ"
                  value={newLeaseName}
                  onChange={(e) => setNewLeaseName(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300 text-sm bg-white"
                />
                <div className="flex gap-2 items-center">
                  <span className="text-xs font-bold text-slate-600">日額¥</span>
                  <input
                    type="number"
                    value={newLeasePrice}
                    onChange={(e) => setNewLeasePrice(Number(e.target.value))}
                    className="w-full p-2 rounded-lg border border-slate-300 text-sm bg-white"
                  />
                  <button onClick={() => handleAdd('lease')} className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 rounded-lg text-sm font-bold shrink-0">追加</button>
                </div>
              </div>
              <div className="divide-y divide-slate-200 max-h-40 overflow-y-auto">
                {leases.map((l) => (
                  <div key={l.name} className="py-2 flex justify-between items-center text-sm font-bold gap-2">
                    <span>{l.name}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-slate-500">日額¥</span>
                      <input
                        type="number"
                        value={l.price}
                        onChange={(e) => handlePriceChange('lease', l.name, Number(e.target.value))}
                        className="w-20 p-1 rounded border text-xs text-right"
                      />
                      <button onClick={() => handleDelete('lease', l.name)} className="text-red-500 hover:text-red-700 text-xs font-bold ml-1">削除</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 処分場マスタ */}
            <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-sm">🗑️ 処分場マスタ ＆ 単価設定</h3>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="処分場名"
                  value={newScrapLoc}
                  onChange={(e) => setNewScrapLoc(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300 text-sm bg-white"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="品目"
                    value={newScrapItem}
                    onChange={(e) => setNewScrapItem(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-300 text-sm bg-white"
                  />
                  <select
                    value={newScrapUnit}
                    onChange={(e) => setNewScrapUnit(e.target.value)}
                    className="p-2 rounded-lg border border-slate-300 text-sm bg-white"
                  >
                    <option value="t">t</option>
                    <option value="kg">kg</option>
                    <option value="m3">m3</option>
                  </select>
                </div>
                <div className="flex gap-2 items-center">
                  <span className="text-xs font-bold text-slate-600">単価¥</span>
                  <input
                    type="number"
                    value={newScrapPrice}
                    onChange={(e) => setNewScrapPrice(Number(e.target.value))}
                    className="w-full p-2 rounded-lg border border-slate-300 text-sm bg-white"
                  />
                  <button onClick={() => handleAdd('scrap')} className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 rounded-lg text-sm font-bold shrink-0">追加</button>
                </div>
              </div>
              <div className="divide-y divide-slate-200 max-h-32 overflow-y-auto">
                {scrapLocations.map((sc, idx) => (
                  <div key={idx} className="py-2 flex justify-between items-center text-xs font-bold">
                    <span>{sc.location} ({sc.item}/{sc.unit}) 単価¥{sc.price}</span>
                    <button onClick={() => handleDelete('scrap', sc)} className="text-red-500 hover:text-red-700 text-xs font-bold">削除</button>
                  </div>
                ))}
              </div>
            </div>

          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* 車両 */}
            <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-sm">🚚 車両マスタ</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="車両名"
                  value={newVehicle}
                  onChange={(e) => setNewVehicle(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300 text-sm bg-white"
                />
                <button onClick={() => handleAdd('vehicle')} className="bg-orange-600 text-white px-3 py-2 rounded-lg text-sm font-bold shrink-0">追加</button>
              </div>
              <div className="divide-y divide-slate-200 max-h-40 overflow-y-auto">
                {vehicles.map((v) => (
                  <div key={v} className="py-2 flex justify-between items-center text-sm font-bold">
                    <span>{v}</span>
                    <button onClick={() => handleDelete('vehicle', v)} className="text-red-500 hover:text-red-700 text-xs font-bold">削除</button>
                  </div>
                ))}
              </div>
            </div>

            {/* 現場責任者 */}
            <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-sm">👤 現場責任者 ＆ 日額単価</h3>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="責任者名"
                  value={newManagerName}
                  onChange={(e) => setNewManagerName(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300 text-sm bg-white"
                />
                <div className="flex gap-2 items-center">
                  <span className="text-xs font-bold text-slate-600">日額¥</span>
                  <input
                    type="number"
                    value={newManagerPrice}
                    onChange={(e) => setNewManagerPrice(Number(e.target.value))}
                    className="w-full p-2 rounded-lg border border-slate-300 text-sm bg-white"
                  />
                  <button onClick={() => handleAdd('manager')} className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 rounded-lg text-sm font-bold shrink-0">追加</button>
                </div>
              </div>
              <div className="divide-y divide-slate-200 max-h-40 overflow-y-auto">
                {managers.map((m) => (
                  <div key={m.name} className="py-2 flex justify-between items-center text-sm font-bold gap-2">
                    <span>{m.name}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-slate-500">日額¥</span>
                      <input
                        type="number"
                        value={m.price}
                        onChange={(e) => handlePriceChange('manager', m.name, Number(e.target.value))}
                        className="w-20 p-1 rounded border text-xs text-right"
                      />
                      <button onClick={() => handleDelete('manager', m.name)} className="text-red-500 hover:text-red-700 text-xs font-bold ml-1">削除</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 作業メンバー */}
            <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-sm">👥 作業メンバー ＆ 日額単価</h3>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="メンバー名"
                  value={newWorkerName}
                  onChange={(e) => setNewWorkerName(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300 text-sm bg-white"
                />
                <div className="flex gap-2 items-center">
                  <span className="text-xs font-bold text-slate-600">日額¥</span>
                  <input
                    type="number"
                    value={newWorkerPrice}
                    onChange={(e) => setNewWorkerPrice(Number(e.target.value))}
                    className="w-full p-2 rounded-lg border border-slate-300 text-sm bg-white"
                  />
                  <button onClick={() => handleAdd('worker')} className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 rounded-lg text-sm font-bold shrink-0">追加</button>
                </div>
              </div>
              <div className="divide-y divide-slate-200 max-h-40 overflow-y-auto">
                {workers.map((w) => (
                  <div key={w.name} className="py-2 flex justify-between items-center text-sm font-bold gap-2">
                    <span>{w.name}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-slate-500">日額¥</span>
                      <input
                        type="number"
                        value={w.price}
                        onChange={(e) => handlePriceChange('worker', w.name, Number(e.target.value))}
                        className="w-20 p-1 rounded border text-xs text-right"
                      />
                      <button onClick={() => handleDelete('worker', w.name)} className="text-red-500 hover:text-red-700 text-xs font-bold ml-1">削除</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* 送信された日報一覧 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-black text-slate-900">📥 送信された日報一覧</h2>
            <button onClick={fetchData} className="bg-[#1D70B8] text-white px-4 py-2 rounded-xl text-sm font-bold shadow">
              🔄 更新
            </button>
          </div>

          <input
            type="text"
            placeholder="現場名で絞り込み..."
            value={filterLocation}
            onChange={(e) => setFilterLocation(e.target.value)}
            className="p-2 rounded-lg border border-slate-300 text-sm max-w-sm w-full bg-slate-50"
          />

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 text-sm">
                  <th className="pb-3 font-bold">日付</th>
                  <th className="pb-3 font-bold">現場名</th>
                  <th className="pb-3 font-bold">責任者 / 作業者</th>
                  <th className="pb-3 font-bold">作業内容</th>
                  <th className="pb-3 font-bold text-center">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredReports.length === 0 ? (
                  <tr><td colSpan={5} className="py-6 text-center text-slate-400">日報データはありません</td></tr>
                ) : (
                  filteredReports.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="py-4 font-bold">{r.date}</td>
                      <td className="py-4 font-bold text-[#1D70B8]">{r.locations ? r.locations.join(', ') : r.location}</td>
                      <td className="py-4">
                        <div>責任者: {r.managers ? r.managers.join(', ') : r.manager}</div>
                        <div className="text-xs text-slate-500">作業者: {Array.isArray(r.workers) ? r.workers.join(', ') : ''}</div>
                      </td>
                      <td className="py-4 text-slate-600">{r.workDescription}</td>
                      <td className="py-4 text-center">
                        <button onClick={() => handleDelete('report', i)} className="bg-red-500 text-white px-3 py-1 rounded text-xs font-bold">削除</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* ── 詳細ポップアップモーダル ── */}
      {modalLocation && modalData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            
            <div className="flex justify-between items-center border-b pb-4">
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                🏢 {modalLocation} <span className="text-sm font-normal text-slate-500">（現場詳細分析）</span>
              </h2>
              <button
                onClick={() => setModalLocation(null)}
                className="bg-slate-700 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-sm font-bold"
              >
                閉じる
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="bg-slate-50 p-3 rounded-xl border text-center">
                <div className="text-xs text-slate-500 font-bold">稼働日数</div>
                <div className="text-lg font-black text-slate-800 mt-1">{modalData.days} 日</div>
              </div>
              <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-center">
                <div className="text-xs text-emerald-600 font-bold">人件費</div>
                <div className="text-lg font-black text-emerald-700 mt-1">¥{modalData.laborCost.toLocaleString()}</div>
              </div>
              <div className="bg-blue-50 p-3 rounded-xl border border-blue-200 text-center">
                <div className="text-xs text-blue-600 font-bold">リース費</div>
                <div className="text-lg font-black text-blue-700 mt-1">¥{modalData.leaseCost.toLocaleString()}</div>
              </div>
              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-center">
                <div className="text-xs text-amber-600 font-bold">処分費</div>
                <div className="text-lg font-black text-amber-700 mt-1">¥{modalData.disposalCost.toLocaleString()}</div>
              </div>
              <div className="bg-orange-50 p-3 rounded-xl border border-orange-200 text-center col-span-2 sm:col-span-1">
                <div className="text-xs text-orange-600 font-bold">合計経費</div>
                <div className="text-lg font-black text-orange-700 mt-1">¥{modalData.total.toLocaleString()}</div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-bold text-slate-800 text-sm">📅 提出された日報一覧（内訳）</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b bg-slate-50 text-slate-500 text-xs">
                      <th className="p-2.5 font-bold">日付</th>
                      <th className="p-2.5 font-bold">人員 / リース</th>
                      <th className="p-2.5 font-bold">人件費+リース</th>
                      <th className="p-2.5 font-bold">処分明細 / 処分費</th>
                      <th className="p-2.5 font-bold text-right">1日合計</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-bold">
                    {modalData.reports.length === 0 ? (
                      <tr><td colSpan={5} className="py-6 text-center text-slate-400">この現場の日報データはありません</td></tr>
                    ) : (
                      modalData.reports.reports?.map?.length ? modalData.reports : modalData.reports.map((r: any, idx: number) => {
                        let dayLabor = 0;
                        if (r.manager) {
                          const mObj = managers.find(m => m.name === r.manager);
                          dayLabor += mObj ? mObj.price : 0;
                        }
                        if (Array.isArray(r.managers)) {
                          r.managers.forEach((mName: string) => {
                            const mObj = managers.find(m => m.name === mName);
                            dayLabor += mObj ? mObj.price : 0;
                          });
                        }
                        if (Array.isArray(r.workers)) {
                          r.workers.forEach((wName: string) => {
                            const wObj = workers.find(wo => wo.name === wName);
                            dayLabor += wObj ? wObj.price : 0;
                          });
                        }

                        let dayLease = 0;
                        if (r.lease) {
                          const lObj = leases.find(l => l.name === r.lease);
                          dayLease += lObj ? lObj.price : 0;
                        }
                        if (Array.isArray(r.leases)) {
                          r.leases.forEach((lName: string) => {
                            const lObj = leases.find(l => l.name === lName);
                            dayLease += lObj ? lObj.price : 0;
                          });
                        }

                        let dayDisposal = 0;
                        let disposalTexts: string[] = [];
                        if (Array.isArray(r.disposals)) {
                          r.disposals.forEach((d: any) => {
                            const sObj = scrapLocations.find(s => s.location === d.location && s.item === d.item);
                            const unitPrice = sObj ? sObj.price : 0;
                            const subTotal = Number(d.quantity || 0) * unitPrice;
                            dayDisposal += subTotal;
                            disposalTexts.push(`${d.location} (${d.item}): ${d.quantity}${d.unit} (¥${subTotal.toLocaleString()})`);
                          });
                        }

                        const dayTotal = dayLabor + dayLease + dayDisposal;

                        return (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-2.5">{r.date}</td>
                            <td className="p-2.5 text-slate-600">
                              <div>責任者: {r.managers ? r.managers.join(', ') : r.manager || 'なし'}</div>
                              <div>作業者: {Array.isArray(r.workers) ? r.workers.join(', ') : 'なし'}</div>
                              <div className="text-blue-600">リース: {r.leases ? r.leases.join(', ') : r.lease || 'なし'}</div>
                            </td>
                            <td className="p-2.5 text-emerald-600">¥{(dayLabor + dayLease).toLocaleString()}</td>
                            <td className="p-2.5 text-slate-600">
                              {disposalTexts.length > 0 ? disposalTexts.map((txt, i) => <div key={i}>{txt}</div>) : 'なし'}
                              <div className="text-amber-600 mt-0.5">小計: ¥{dayDisposal.toLocaleString()}</div>
                            </td>
                            <td className="p-2.5 text-right font-black text-orange-600 text-sm">¥{dayTotal.toLocaleString()}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
