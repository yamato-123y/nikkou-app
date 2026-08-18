'use client';
import { useState, useEffect } from 'react';

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [isAuthed, setIsAuthed] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [reports, setReports] = useState<any[]>([]);

  // マスタデータ
  const [locations, setLocations] = useState<string[]>(['堺市邸解体工事', '北花田店舗改修', '美原区住宅解体', '美加の台']);
  const [leases, setLeases] = useState<{ name: string; price: number }[]>([{ name: '0.2ユンボ', price: 15000 }]);
  const [vehicles, setVehicles] = useState<string[]>(['2tダンプ', '4tダンプ', '軽トラ']);
  const [scrapLocations, setScrapLocations] = useState<{ location: string; item: string; unit: string; price: number }[]>([{ location: 'テスト場', item: '鉄', unit: 't', price: 3000 }]);
  const [managers, setManagers] = useState<{ name: string; price: number }[]>([{ name: '大和 太郎', price: 20000 }]);
  const [workers, setWorkers] = useState<{ name: string; price: number }[]>([{ name: 'Aさん', price: 15000 }]);

  const [modalLocation, setModalLocation] = useState<string | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editDesc, setEditDesc] = useState('');
  const [filterLocation, setFilterLocation] = useState('');

  // 新規マスタ追加用の状態
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

  const handleDelete = async (index: number) => {
    if (!confirm('本当に削除しますか？')) return;
    const updated = reports.filter((_, i) => i !== index);
    setReports(updated);
    await fetch('/api/reports', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) });
  };

  const handleSaveEdit = async (index: number) => {
    const updated = [...reports];
    updated[index].workDescription = editDesc;
    setReports(updated);
    setEditingIndex(null);
    await fetch('/api/reports', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) });
  };

  const calculateCosts = (locName: string) => {
    const locReports = reports.filter(r => (Array.isArray(r.locations) && r.locations.includes(locName)) || r.location === locName);
    let laborCost = 0, leaseCost = 0, disposalCost = 0;

    locReports.forEach(r => {
      const mgrs = Array.isArray(r.managers) ? r.managers : (r.manager ? [r.manager] : []);
      mgrs.forEach(mName => laborCost += (managers.find(m => m.name === mName)?.price || 0));

      const wrks = Array.isArray(r.workers) ? r.workers : [];
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
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm">
          <h1 className="text-xl font-black mb-6 text-center">管理画面ログイン</h1>
          <input type="password" placeholder="パスワード" value={password} onChange={e => { setPassword(e.target.value); setAuthError(false); }} className="w-full p-3 border rounded-xl mb-2" />
          {authError && <p className="text-red-500 text-xs font-bold mb-2">パスワードが違います</p>}
          <button onClick={() => (password === 'yamato123' || password === 'yamato' ? setIsAuthed(true) : setAuthError(true))} className="w-full bg-orange-600 text-white font-bold py-3 rounded-xl">ログイン</button>
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

        {/* スクラップ・処分場マスタ登録エリア */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border space-y-4">
          <h2 className="text-lg font-black">⚙️ スクラップ・処分場マスタ登録</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border p-4 rounded-xl bg-slate-50 space-y-3">
              <h3 className="font-bold text-sm">🗑️ 処分場 ＆ 品目追加</h3>
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
            </div>

            <div className="border p-4 rounded-xl bg-slate-50 col-span-2 space-y-2">
              <h3 className="font-bold text-sm">登録済みスクラップ・処分場一覧</h3>
              <div className="max-h-36 overflow-y-auto divide-y">
                {scrapLocations.map((sc, idx) => (
                  <div key={idx} className="py-2 flex justify-between items-center text-sm font-bold">
                    <span>{sc.location} （品目: {sc.item}） 単価: ¥{sc.price}</span>
                    <button onClick={() => {
                      const updated = scrapLocations.filter((_, i) => i !== idx);
                      setScrapLocations(updated);
                      saveSettingsToServer({ locations, leases, vehicles, scrapLocations: updated, managers, workers });
                    }} className="text-red-500 text-xs font-bold">削除</button>
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
                {reports.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="py-4 font-bold">{r.date}</td>
                    <td className="font-bold text-[#1D70B8]">{Array.isArray(r.locations) ? r.locations.join(', ') : r.location}</td>
                    <td>
                      <div>責: {Array.isArray(r.managers) ? r.managers.join(', ') : r.manager}</div>
                      <div className="text-xs text-slate-500">作: {Array.isArray(r.workers) ? r.workers.join(', ') : ''}</div>
                    </td>
                    <td>
                      {editingIndex === i ? <input value={editDesc} onChange={e => setEditDesc(e.target.value)} className="border p-1.5 rounded w-full text-sm" /> : r.workDescription}
                    </td>
                    <td>{r.photo && <img src={r.photo} className="w-14 h-14 object-cover rounded shadow" />}</td>
                    <td className="text-center space-x-2">
                      {editingIndex === i ? <button onClick={() => handleSaveEdit(i)} className="bg-emerald-600 text-white px-3 py-1 rounded text-xs font-bold">保存</button> 
                      : <button onClick={() => {setEditingIndex(i); setEditDesc(r.workDescription || '');}} className="bg-blue-600 text-white px-3 py-1 rounded text-xs font-bold">編集</button>}
                      <button onClick={() => handleDelete(i)} className="bg-red-500 text-white px-3 py-1 rounded text-xs font-bold">削除</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 詳細モーダル */}
      {modalLocation && modalData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex justify-between items-center border-b pb-3"><h2 className="text-xl font-black">{modalLocation} 詳細分析</h2><button onClick={() => setModalLocation(null)} className="bg-slate-700 text-white px-4 py-2 rounded-xl text-sm font-bold">閉じる</button></div>
            <div className="grid grid-cols-4 gap-3 text-center">
              <div className="bg-slate-50 p-3 rounded-xl border"><div className="text-xs text-slate-500">稼働日数</div><div className="text-lg font-black">{modalData.days}日</div></div>
              <div className="bg-emerald-50 p-3 rounded-xl border"><div className="text-xs text-emerald-600">人件費</div><div className="text-lg font-black text-emerald-700">¥{modalData.laborCost.toLocaleString()}</div></div>
              <div className="bg-blue-50 p-3 rounded-xl border"><div className="text-xs text-blue-600">リース費</div><div className="text-lg font-black text-blue-700">¥{modalData.leaseCost.toLocaleString()}</div></div>
              <div className="bg-amber-50 p-3 rounded-xl border"><div className="text-xs text-amber-600">処分費</div><div className="text-lg font-black text-amber-700">¥{modalData.disposalCost.toLocaleString()}</div></div>
            </div>
            <div className="space-y-3">
              <h3 className="font-bold text-sm">日報内訳</h3>
              {modalData.reports.map((r: any, idx: number) => (
                <div key={idx} className="border p-3 rounded-xl bg-slate-50 text-xs space-y-1">
                  <div className="font-bold">{r.date} - 担当: {Array.isArray(r.managers) ? r.managers.join(', ') : r.manager}</div>
                  <div>スクラップ・処分内訳: {(Array.isArray(r.disposals) ? r.disposals : []).map((d: any) => `${d.location} (${d.item}): ${d.quantity}${d.unit || 't'}`).join(', ') || 'なし'}</div>
                  {r.photo && <img src={r.photo} className="w-20 h-20 mt-2 rounded shadow object-cover" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
