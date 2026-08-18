'use client';
import { useState, useEffect } from 'react';

export default function AdminPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [locations, setLocations] = useState<string[]>([]);

  const fetchData = async () => {
    try {
      const [resR, resS] = await Promise.all([fetch('/api/reports'), fetch('/api/settings')]);
      if (resR.ok) setReports(await resR.json());
      if (resS.ok) {
        const s = await resS.json();
        setLocations(s.locations || []);
      }
    } catch (e) { console.error("データ読み込みエラー:", e); }
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <div className="p-6 bg-slate-100 min-h-screen space-y-6 font-sans">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border">
        <h1 className="text-xl font-black text-slate-800">📊 管理ダッシュボード</h1>
        <button onClick={fetchData} className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold">🔄 最新データ更新</button>
      </div>

      {/* 送信された日報一覧 */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border">
        <h2 className="text-lg font-black mb-4">📥 送信された日報 ({reports.length}件)</h2>
        <table className="w-full text-sm text-left">
          <thead className="text-slate-500 border-b">
            <tr><th className="p-2">日付</th><th className="p-2">現場</th><th className="p-2">責任者</th><th className="p-2">重機/車両</th></tr>
          </thead>
          <tbody>
            {reports.map((r, i) => (
              <tr key={i} className="border-b">
                <td className="p-2 font-bold">{r.date}</td>
                <td className="p-2">{r.location}</td>
                <td className="p-2">{r.manager}</td>
                <td className="p-2 text-xs text-slate-500">{r.machine} / {r.vehicle}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 現場マスタ */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border">
        <h2 className="text-lg font-black mb-4">⚙️ 現場マスタ ({locations.length}件)</h2>
        <div className="flex flex-wrap gap-2">
          {locations.map(l => <span key={l} className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg text-sm font-bold border border-blue-200">{l}</span>)}
        </div>
      </div>
    </div>
  );
}
