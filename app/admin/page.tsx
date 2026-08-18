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

  useEffect(() => {
    const loadAll = () => {
      const savedLocs = localStorage.getItem('yamato_locations');
      if (savedLocs) setLocations(JSON.parse(savedLocs));

      const savedLeases = localStorage.getItem('yamato_leases');
      if (savedLeases) setLeases(JSON.parse(savedLeases));

      const savedVehicles = localStorage.getItem('yamato_vehicles');
      if (savedVehicles) setVehicles(JSON.parse(savedVehicles));

      const savedScraps = localStorage.getItem('yamato_scrapLocations');
      if (savedScraps) setScrapLocations(JSON.parse(savedScraps));

      const savedManagers = localStorage.getItem('yamato_managers');
      if (savedManagers) setManagers(JSON.parse(savedManagers));

      const savedWorkers = localStorage.getItem('yamato_workers');
      if (savedWorkers) setWorkers(JSON.parse(savedWorkers));

      const savedReports = localStorage.getItem('yamato_reports');
      if (savedReports) setReports(JSON.parse(savedReports));
    };

    loadAll();
    window.addEventListener('storage', loadAll);
    return () => window.removeEventListener('storage', loadAll);
  }, []);

  const saveToStorage = (key: string, data: any) => {
    localStorage.setItem(key, JSON.stringify(data));
    window.dispatchEvent(new Event('storage'));
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'yamato123' || password === 'yamato') {
      setIsAuthed(true);
      setAuthError(false);
    } else {
      setAuthError(true);
    }
  };

  const handleAdd = (type: string) => {
    if (type === 'location' && newLocation.trim()) {
      const updated = [...locations, newLocation.trim()];
      setLocations(updated);
      saveToStorage('yamato_locations', updated);
      setNewLocation('');
    } else if (type === 'lease' && newLeaseName.trim()) {
      const updated = [...leases, { name: newLeaseName.trim(), price: Number(newLeasePrice) }];
      setLeases(updated);
      saveToStorage('yamato_leases', updated);
      setNewLeaseName('');
    } else if (type === 'vehicle' && newVehicle.trim()) {
      const updated = [...vehicles, newVehicle.trim()];
      setVehicles(updated);
      saveToStorage('yamato_vehicles', updated);
      setNewVehicle('');
    } else if (type === 'scrap' && newScrapLoc.trim() && newScrapItem.trim()) {
      const updated = [...scrapLocations, { location: newScrapLoc.trim(), item: newScrapItem.trim(), unit: newScrapUnit, price: Number(newScrapPrice) }];
      setScrapLocations(updated);
      saveToStorage('yamato_scrapLocations', updated);
      setNewScrapLoc('');
      setNewScrapItem('');
    } else if (type === 'manager' && newManagerName.trim()) {
      const updated = [...managers, { name: newManagerName.trim(), price: Number(newManagerPrice) }];
      setManagers(updated);
      saveToStorage('yamato_managers', updated);
      setNewManagerName('');
    } else if (type === 'worker' && newWorkerName.trim()) {
      const updated = [...workers, { name: newWorkerName.trim(), price: Number(newWorkerPrice) }];
      setWorkers(updated);
      saveToStorage('yamato_workers', updated);
      setNewWorkerName('');
    }
  };

  const handleDelete = (type: string, target: any) => {
    if (!confirm('本当に削除しますか？')) return;
    if (type === 'location') {
      const updated = locations.filter(l => l !== target);
      setLocations(updated);
      saveToStorage('yamato_locations', updated);
    } else if (type === 'lease') {
      const updated = leases.filter(l => l.name !== target);
      setLeases(updated);
      saveToStorage('yamato_leases', updated);
    } else if (type === 'vehicle') {
      const updated = vehicles.filter(v => v !== target);
      setVehicles(updated);
      saveToStorage('yamato_vehicles', updated);
    } else if (type === 'scrap') {
      const updated = scrapLocations.filter(s => !(s.location === target.location && s.item === target.item));
      setScrapLocations(updated);
      saveToStorage('yamato_scrapLocations', updated);
    } else if (type === 'manager') {
      const updated = managers.filter(m => m.name !== target);
      setManagers(updated);
      saveToStorage('yamato_managers', updated);
    } else if (type === 'worker') {
      const updated = workers.filter(w => w.name !== target);
      setWorkers(updated);
      saveToStorage('yamato_workers', updated);
    } else if (type === 'report') {
      const updated = reports.filter((_, idx) => idx !== target);
      setReports(updated);
      saveToStorage('yamato_reports', updated);
    }
  };

  const handlePriceChange = (type: string, targetName: string, newPrice: number) => {
    if (type === 'lease') {
      const updated = leases.map(l => l.name === targetName ? { ...l, price: newPrice } : l);
      setLeases(updated);
      saveToStorage('yamato_leases', updated);
    } else if (type === 'manager') {
      const updated = managers.map(m => m.name === targetName ? { ...m, price: newPrice } : m);
      setManagers(updated);
      saveToStorage('yamato_managers', updated);
    } else if (type === 'worker') {
      const updated = workers.map(w => w.name === targetName ? { ...w, price: newPrice } : w);
      setWorkers(updated);
      saveToStorage('yamato_workers', updated);
    }
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

  return (
    <div className="min-h-screen bg-slate-100 p-6 font-sans text-slate-800">
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
                  <th className="pb-3 font-bold">合計経費</th>
                  <th className="pb-3 font-bold text-center">詳細</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-base font-bold">
                {locations.length === 0 ? (
                  <tr><td colSpan={4} className="py-4 text-center text-slate-400 text-sm">現場が登録されていません</td></tr>
                ) : (
                  locations.map((loc) => {
                    const locReports = reports.filter(r => (r?.locations && r.locations.includes(loc)) || r?.location === loc);
                    return (
                      <tr key={loc} className="hover:bg-slate-50">
                        <td className="py-4 text-[#1D70B8]">{loc}</td>
                        <td className="py-4 text-slate-700">{locReports.length} 日</td>
                        <td className="py-4 text-emerald-600">¥0</td>
                        <td className="py-4 text-center">
                          <button className="bg-[#1D70B8] hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-sm font-bold shadow">
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
          <h2 className="text-lg font-black text-slate-900">⚙️ マスタ登録・編集削除</h2>

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
            <button onClick={() => window.location.reload()} className="bg-[#1D70B8] text-white px-4 py-2 rounded-xl text-sm font-bold shadow">
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
    </div>
  );
}
