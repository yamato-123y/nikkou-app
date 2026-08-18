'use client';
import { useState, useEffect } from 'react';

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [isAuthed, setIsAuthed] = useState(false);
  const [reports, setReports] = useState<any[]>([]);
  // 初期値を安全に定義
  const [settings, setSettings] = useState<any>({
    workers: [],
    locations: [],
    vehicles: [],
    heavyMachines: [],
    scrapLocations: [],
    subcontractors: [],
    leases: []
  });
  const [tab, setTab] = useState<'reports' | 'analysis' | 'settings'>('reports');

  const [newWorker, setNewWorker] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newVehicle, setNewVehicle] = useState('');
  const [newHeavyMachine, setNewHeavyMachine] = useState('');
  const [newScrapLocation, setNewScrapLocation] = useState('');
  const [newScrapItem, setNewScrapItem] = useState('');
  const [newSubcontractor, setNewSubcontractor] = useState('');
  const [newLease, setNewLease] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthed(true);
    fetchData();
  };

  const fetchData = async () => {
    try {
      const resReports = await fetch('/api/reports');
      const dataReports = await resReports.json();
      setReports(Array.isArray(dataReports) ? dataReports : []);

      const resSettings = await fetch('/api/settings');
      const dataSettings = await resSettings.json();
      // データ構造を補完
      setSettings({
        workers: dataSettings.workers || [],
        locations: dataSettings.locations || [],
        vehicles: dataSettings.vehicles || [],
        heavyMachines: dataSettings.heavyMachines || [],
        scrapLocations: dataSettings.scrapLocations || [],
        subcontractors: dataSettings.subcontractors || [],
        leases: dataSettings.leases || []
      });
    } catch (err) {
      console.error('Fetch error:', err);
    }
  };

  const handleAddSetting = async (type: string, value: any) => {
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, value })
      });
      const data = await res.json();
      setSettings(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSetting = async (type: string, value: string) => {
    if (!confirm(`${value} を削除しますか？`)) return;
    try {
      const res = await fetch('/api/settings', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, value })
      });
      const data = await res.json();
      setSettings(data);
    } catch (err) {
      console.error(err);
    }
  };

  if (!isAuthed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <form onSubmit={handleLogin} className="bg-white p-6 rounded shadow-md w-full max-w-sm">
          <h1 className="text-xl font-bold mb-4 text-center">管理画面ログイン</h1>
          <input
            type="password"
            placeholder="パスワード"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border p-2 mb-4 rounded"
          />
          <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded font-bold">ログイン</button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">管理ダッシュボード</h1>
        {/* タブ切り替えなどはそのまま利用 */}
        <div className="space-x-2 mb-6">
          <button onClick={() => setTab('reports')} className="px-4 py-2 bg-white border rounded">一覧</button>
          <button onClick={() => setTab('analysis')} className="px-4 py-2 bg-white border rounded">分析</button>
          <button onClick={() => setTab('settings')} className="px-4 py-2 bg-white border rounded">設定</button>
        </div>

        {tab === 'analysis' && settings.locations?.map((loc: string) => (
            <div key={loc} className="bg-white p-4 mb-4 rounded shadow">
              <h3 className="text-xl font-bold text-blue-600">📍 {loc}</h3>
              {/* レポートのフィルタリング時に安全に処理 */}
              <p>総日報提出数: {reports.filter(r => r.location === loc).length}件</p>
            </div>
        ))}
        {/* 他のタブも同様に、settings?. や reports?. と書くことでエラーを防げます */}
      </div>
    </div>
  );
}
