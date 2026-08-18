'use client';
import { useState, useEffect } from 'react';

export default function AdminPage() {
  const [reports, setReports] = useState<any[]>([]);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/reports');
      if (res.ok) setReports(await res.json());
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <div className="p-6 bg-slate-100 min-h-screen font-sans">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border mb-6">
        <h1 className="text-xl font-black text-slate-800">📊 管理ダッシュボード</h1>
        <button onClick={fetchData} className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold">🔄 最新データ更新</button>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border">
        <h2 className="text-lg font-black mb-4">📥 送信された日報 ({reports.length}件)</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-slate-500 border-b">
              <tr><th className="p-3">日付</th><th className="p-3">現場</th><th className="p-3">責任者/作業員</th><th className="p-3">重機/車両</th><th className="p-3">詳細内訳</th></tr>
            </thead>
            <tbody>
              {reports.map((r, i) => (
                <tr key={i} className="border-b align-top">
                  <td className="p-3 font-bold">{r.date}</td>
                  <td className="p-3 font-bold text-[#0066cc]">{r.location || '-'}</td>
                  <td className="p-3">
                    <div>責: {r.manager || '-'}</div>
                    <div className="text-xs text-slate-500">員: {Array.isArray(r.workers) ? r.workers.join(', ') : r.workers || '-'}</div>
                  </td>
                  <td className="p-3 text-xs">重: {r.machine || '-'}<br/>車: {r.vehicle || '-'}</td>
                  <td className="p-3 text-xs">
                    {r.disposals?.map((d:any, idx:number)=><div key={idx} className="text-blue-700">【処分】{d.location}({d.item}):{d.quantity}{d.unit}</div>)}
                    {r.scraps?.map((s:any, idx:number)=><div key={idx} className="text-orange-700">【スクラップ】{s.location}({s.item}):{s.quantity}{s.unit}</div>)}
                    <div className="text-slate-600 mt-1">{r.workDescription}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
