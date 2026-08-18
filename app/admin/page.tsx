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
  const [scrapLocations, setScrapLocations] = useState<{ location: string; item: string; unit: string; price: number }[]>([{ location: 'テスト場', item: 'ガラ', unit: 't', price: 3000 }]);
  const [managers, setManagers] = useState<{ name: string; price: number }[]>([{ name: '大和 太郎', price: 20000 }]);
  const [workers, setWorkers] = useState<{ name: string; price: number }[]>([{ name: 'Aさん', price: 15000 }]);

  const [modalLocation, setModalLocation] = useState<string | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editDesc, setEditDesc] = useState('');
  const [filterLocation, setFilterLocation] = useState('');

  const fetchData = async () => {
    try {
      const resReports = await fetch('/api/reports');
      if (resReports.ok) setReports(await resReports.json());
      const resSettings = await fetch('/api/settings');
      if (resSettings.ok) {
        const data = await resSettings.json();
        if (data.locations) setLocations(data.locations);
        if (data.leases) setLeases(data.leases);
        if (data.scrapLocations) setScrapLocations(data.scrapLocations);
        if (data.managers) setManagers(data.managers);
        if (data.workers) setWorkers(data.workers);
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

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
    const locReports = reports.filter(r => r.locations?.includes(locName) || r.location === locName);
    let laborCost = 0, leaseCost = 0, disposalCost = 0;

    locReports.forEach(r => {
      (r.managers || []).forEach(mName => laborCost += (managers.find(m => m.name === mName)?.price || 0));
      (r.workers || []).forEach(wName => laborCost += (workers.find(w => w.name === wName)?.price || 0));
      (r.leases || []).forEach(lName => leaseCost += (leases.find(l => l.name === lName)?.price || 0));
      (r.disposals || []).forEach((d: any) => disposalCost += Number(d.quantity || 0) * (scrapLocations.find(s => s.location === d.location && s.item === d.item)?.price || 0));
    });

    return { days: locReports.length, laborCost, leaseCost, disposalCost, total: laborCost + leaseCost + disposalCost, reports: locReports };
  };

  if (!isAuthed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm">
          <h1 className="text-xl font-black mb-6 text-center">管理画面ログイン</h1>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-3 border rounded-xl mb-4" />
          <button onClick={() => (password === 'yamato123' ? setIsAuthed(true) : setAuthError(true))} className="w-full bg-orange-600 text-white font-bold py-3 rounded-xl">ログイン</button>
        </div>
      </div>
    );
  }

  const modalData = modalLocation ? calculateCosts(modalLocation) : null;

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border flex justify-between items-center">
          <h1 className="text-2xl font-black">📊 原価詳細ダッシュボード</h1>
          <button onClick={() => setIsAuthed(false)} className="bg-slate-800 text-white px-4 py-2 rounded-xl font-bold">ログアウト</button>
        </div>

        {/* サマリーテーブル */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border">
          <table className="w-full text-left">
            <thead><tr className="border-b text-slate-500"><th>現場名</th><th>稼働日数</th><th>人件費</th><th>リース費</th><th>処分費</th><th>合計</th><th>詳細</th></tr></thead>
            <tbody className="divide-y font-bold">
              {locations.map(loc => {
                const c = calculateCosts(loc);
                return (
                  <tr key={loc} className="hover:bg-slate-50">
                    <td className="py-4 text-[#1D70B8]">{loc}</td>
                    <td>{c.days} 日</td>
                    <td>¥{c.laborCost.toLocaleString()}</td>
                    <td>¥{c.leaseCost.toLocaleString()}</td>
                    <td>¥{c.disposalCost.toLocaleString()}</td>
                    <td className="text-emerald-600">¥{c.total.toLocaleString()}</td>
                    <td><button onClick={() => setModalLocation(loc)} className="bg-[#1D70B8] text-white px-4 py-1 rounded-lg">詳細 →</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 送信日報一覧 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border">
          <h2 className="text-lg font-black mb-4">📥 送信された日報一覧</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b text-left text-slate-500 text-sm"><th>日付</th><th>現場名</th><th>作業者</th><th>作業内容</th><th>写真</th><th>操作</th></tr></thead>
              <tbody>
                {reports.map((r, i) => (
                  <tr key={i} className="border-b hover:bg-slate-50">
                    <td className="py-4">{r.date}</td>
                    <td className="font-bold">{r.locations?.join(', ')}</td>
                    <td className="text-sm">責: {r.managers?.join(', ')}<br/>作: {r.workers?.join(', ')}</td>
                    <td className="text-sm">
                      {editingIndex === i ? <input value={editDesc} onChange={e => setEditDesc(e.target.value)} className="border p-1 w-full" /> : r.workDescription}
                    </td>
                    <td>{r.photo && <img src={r.photo} className="w-16 h-16 object-cover rounded shadow" />}</td>
                    <td className="space-x-2">
                      {editingIndex === i ? <button onClick={() => handleSaveEdit(i)} className="bg-emerald-600 text-white px-2 py-1 rounded">保存</button> 
                      : <button onClick={() => {setEditingIndex(i); setEditDesc(r.workDescription);}} className="bg-blue-600 text-white px-2 py-1 rounded">編集</button>}
                      <button onClick={() => handleDelete(i)} className="bg-red-500 text-white px-2 py-1 rounded">削除</button>
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
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between mb-4"><h2 className="text-xl font-black">{modalLocation} 分析</h2><button onClick={() => setModalLocation(null)} className="bg-slate-700 text-white px-4 py-2 rounded-xl">閉じる</button></div>
            <div className="grid grid-cols-4 gap-4 mb-6 text-center">
              <div>稼働<br/>{modalData.days}日</div>
              <div className="text-emerald-600">人件<br/>¥{modalData.laborCost.toLocaleString()}</div>
              <div className="text-blue-600">リース<br/>¥{modalData.leaseCost.toLocaleString()}</div>
              <div className="text-amber-600">処分<br/>¥{modalData.disposalCost.toLocaleString()}</div>
            </div>
            {modalData.reports.map((r: any, idx: number) => (
              <div key={idx} className="border-t py-4 text-sm">
                <div className="font-bold mb-1">{r.date}</div>
                <div>処分内訳: {(r.disposals || []).map((d: any) => `${d.location}(${d.quantity}${d.unit})`).join(', ') || 'なし'}</div>
                {r.photo && <img src={r.photo} className="w-20 h-20 mt-2 rounded shadow" />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
