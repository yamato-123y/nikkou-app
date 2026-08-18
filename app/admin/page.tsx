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
  const [scrapLocations, setScrapLocations] = useState<{ location: string; item: string; unit: string; price: number }[]>([]);
  const [managers, setManagers] = useState<{ name: string; price: number }[]>([]);
  const [workers, setWorkers] = useState<{ name: string; price: number }[]>([]);
  const [vehicles, setVehicles] = useState<string[]>([]);

  // 編集用の一時状態
  const [editTarget, setEditTarget] = useState<any>(null);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setLocations(data.locations || []);
        setLeases(data.leases || []);
        setCompanyMachines(data.companyMachines || []);
        setScrapLocations(data.scrapLocations || []);
        setManagers(data.managers || []);
        setWorkers(data.workers || []);
        setVehicles(data.vehicles || []);
      }
      const resReports = await fetch('/api/reports');
      if (resReports.ok) setReports(await resReports.json());
    } catch (e) { console.error(e); }
  };

  const saveSettings = async (newData: any) => {
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newData)
    });
    fetchData();
  };

  useEffect(() => { if (isAuthed) fetchData(); }, [isAuthed]);

  if (!isAuthed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <form onSubmit={(e) => { e.preventDefault(); if (password === 'yamato') setIsAuthed(true); }} className="bg-white p-8 rounded-xl shadow-md">
          <h2 className="mb-4 font-bold">管理画面ログイン</h2>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-2 border mb-4" />
          <button type="submit" className="w-full bg-orange-600 text-white p-2 rounded">ログイン</button>
        </form>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen space-y-8">
      <h1 className="text-2xl font-black">⚙️ マスタ管理・原価ダッシュボード</h1>
      
      {/* 登録セクション（グリッドレイアウトで整理） */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* リース重機 */}
        <div className="bg-white p-4 rounded-xl border shadow-sm">
          <h3 className="font-bold border-b mb-2">🚜 リース重機</h3>
          {leases.map((item, i) => (
            <div key={i} className="flex justify-between text-sm py-1">
              <span>{item.name} (¥{item.price})</span>
              <button onClick={() => saveSettings({ leases: leases.filter((_, idx) => idx !== i) })} className="text-red-500 font-bold">削除</button>
            </div>
          ))}
        </div>

        {/* 自社重機 */}
        <div className="bg-white p-4 rounded-xl border shadow-sm">
          <h3 className="font-bold border-b mb-2">🏗️ 自社重機</h3>
          {companyMachines.map((item, i) => (
            <div key={i} className="flex justify-between text-sm py-1">
              <span>{item.name} (¥{item.price})</span>
              <button onClick={() => saveSettings({ companyMachines: companyMachines.filter((_, idx) => idx !== i) })} className="text-red-500 font-bold">削除</button>
            </div>
          ))}
        </div>
        
        {/* 他にも現場名、車両、責任者等を同様の構造で記述 */}
      </div>

      {/* 日報一覧 */}
      <div className="bg-white p-6 rounded-xl shadow-sm">
        <h2 className="font-bold mb-4">📥 受信日報</h2>
        <table className="w-full text-sm">
          <thead><tr className="border-b"><th>日付</th><th>現場</th><th>作業者</th><th>重機</th><th>内容</th></tr></thead>
          <tbody>
            {reports.map((r, i) => (
              <tr key={i} className="border-b">
                <td className="py-2">{r.date}</td>
                <td>{r.location}</td>
                <td>{r.workers}</td>
                <td>{r.machine}</td>
                <td>{r.workDescription}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
