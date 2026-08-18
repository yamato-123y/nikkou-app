'use client';
import { useState } from 'react';

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [isAuthed, setIsAuthed] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [reports, setReports] = useState<any[]>([]);
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
  const [loading, setLoading] = useState(false);

  const [newLocation, setNewLocation] = useState('');
  const [newSubcontractor, setNewSubcontractor] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // パスワード認証（デフォルト設定：yamato123）
    if (password === 'yamato123' || password === 'yamato') {
      setIsAuthed(true);
      setAuthError(false);
      fetchData();
    } else {
      setAuthError(true);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const resReports = await fetch('/api/reports');
      if (resReports.ok) {
        const dataReports = await resReports.json();
        setReports(Array.isArray(dataReports) ? dataReports : []);
      }
    } catch (e) {
      setReports([]);
    }

    try {
      const resSettings = await fetch('/api/settings');
      if (resSettings.ok) {
        const dataSettings = await resSettings.json();
        if (dataSettings && typeof dataSettings === 'object') {
          setSettings({
            workers: Array.isArray(dataSettings.workers) ? dataSettings.workers : [],
            locations: Array.isArray(dataSettings.locations) ? dataSettings.locations : [],
            vehicles: Array.isArray(dataSettings.vehicles) ? dataSettings.vehicles : [],
            heavyMachines: Array.isArray(dataSettings.heavyMachines) ? dataSettings.heavyMachines : [],
            scrapLocations: Array.isArray(dataSettings.scrapLocations) ? dataSettings.scrapLocations : [],
            subcontractors: Array.isArray(dataSettings.subcontractors) ? dataSettings.subcontractors : [],
            leases: Array.isArray(dataSettings.leases) ? dataSettings.leases : []
          });
        }
      }
    } catch (e) {
      // 失敗時はデフォルトを維持
    }
    setLoading(false);
  };

  const handleAddSetting = async (type: string, value: any) => {
    if (!value) return;
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, value })
      });
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data === 'object') {
          setSettings({
            workers: Array.isArray(data.workers) ? data.workers : [],
            locations: Array.isArray(data.locations) ? data.locations : [],
            vehicles: Array.isArray(data.vehicles) ? data.vehicles : [],
            heavyMachines: Array.isArray(data.heavyMachines) ? data.heavyMachines : [],
            scrapLocations: Array.isArray(data.scrapLocations) ? data.scrapLocations : [],
            subcontractors: Array.isArray(data.subcontractors) ? data.subcontractors : [],
            leases: Array.isArray(data.leases) ? data.leases : []
          });
        }
        if (type === 'location') setNewLocation('');
        if (type === 'subcontractor') setNewSubcontractor('');
      }
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
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data === 'object') {
          setSettings({
            workers: Array.isArray(data.workers) ? data.workers : [],
            locations: Array.isArray(data.locations) ? data.locations : [],
            vehicles: Array.isArray(data.vehicles) ? data.vehicles : [],
            heavyMachines: Array.isArray(data.heavyMachines) ? data.heavyMachines : [],
            scrapLocations: Array.isArray(data.scrapLocations) ? data.scrapLocations : [],
            subcontractors: Array.isArray(data.subcontractors) ? data.subcontractors : [],
            leases: Array.isArray(data.leases) ? data.leases : []
          });
        }
      }
    } catch (err) {
      console.error(err);
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

            {authError && (
              <p className="text-red-500 text-sm font-bold">パスワードが正しくありません</p>
            )}

            <button
              type="submit"
              className="w-full bg-[#E56312] hover:bg-[#d0570f] text-white font-bold text-lg py-3.5 rounded-xl shadow transition mt-2"
            >
              ログイン
            </button>
          </form>
        </div>
      </div>
    );
  }

  const safeReports = Array.isArray(reports) ? reports : [];
  const safeLocations = Array.isArray(settings?.locations) ? settings.locations : [];
  const safeSubcontractors = Array.isArray(settings?.subcontractors) ? settings.subcontractors : [];

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">日報管理ダッシュボード</h1>
          <div className="space-x-2">
            <button onClick={() => setTab('reports')} className={`px-4 py-2 rounded ${tab === 'reports' ? 'bg-orange-600 text-white' : 'bg-white border'}`}>日報一覧</button>
            <button onClick={() => setTab('analysis')} className={`px-4 py-2 rounded ${tab === 'analysis' ? 'bg-orange-600 text-white' : 'bg-white border'}`}>現場分析</button>
            <button onClick={() => setTab('settings')} className={`px-4 py-2 rounded ${tab === 'settings' ? 'bg-orange-600 text-white' : 'bg-white border'}`}>マスター設定</button>
          </div>
        </div>

        {loading && <p className="text-center py-4 font-bold text-gray-600">読み込み中...</p>}

        {!loading && tab === 'reports' && (
          <div className="bg-white rounded shadow p-4">
            <h2 className="text-lg font-bold mb-4">送信された日報一覧</h2>
            {safeReports.length === 0 ? (
              <p className="text-gray-500">まだ日報データはありません。</p>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b bg-gray-100">
                    <th className="p-2">日時</th>
                    <th className="p-2">現場</th>
                    <th className="p-2">作業員</th>
                    <th className="p-2">内容</th>
                  </tr>
                </thead>
                <tbody>
                  {safeReports.map((r, i) => (
                    <tr key={i} className="border-b">
                      <td className="p-2 text-sm">{r?.createdAt ? new Date(r.createdAt).toLocaleString() : ''}</td>
                      <td className="p-2 font-bold">{r?.location || ''}</td>
                      <td className="p-2 text-sm">{Array.isArray(r?.workers) ? r.workers.join(', ') : ''}</td>
                      <td className="p-2 text-sm">{r?.workDescription || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {!loading && tab === 'analysis' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold">現場別分析</h2>
            {safeLocations.length === 0 ? (
              <p className="text-gray-500">現場が登録されていません。「マスター設定」から現場を追加してください。</p>
            ) : (
              safeLocations.map((loc: string) => (
                <div key={loc} className="bg-white p-4 rounded shadow">
                  <h3 className="text-xl font-bold text-orange-600 mb-2">📍 {loc}</h3>
                  <p className="text-sm text-gray-600">提出数: {safeReports.filter(r => r?.location === loc).length}件</p>
                </div>
              ))
            )}
          </div>
        )}

        {!loading && tab === 'settings' && (
          <div className="bg-white rounded shadow p-6 space-y-6">
            <h2 className="text-lg font-bold mb-4">マスター設定</h2>
            
            <div className="border-b pb-4">
              <h3 className="font-bold mb-2">現場一覧</h3>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="現場名を入力"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  className="border p-2 rounded flex-1"
                />
                <button onClick={() => handleAddSetting('location', newLocation)} className="bg-green-600 text-white px-4 py-2 rounded font-bold">追加</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {safeLocations.map((loc: string) => (
                  <span key={loc} className="bg-gray-100 px-3 py-1 rounded border flex items-center gap-2 font-bold">
                    {loc}
                    <button onClick={() => handleDeleteSetting('location', loc)} className="text-red-500 font-bold">×</button>
                  </span>
                ))}
              </div>
            </div>

            <div className="border-b pb-4">
              <h3 className="font-bold mb-2">外注会社一覧</h3>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="外注会社名を入力"
                  value={newSubcontractor}
                  onChange={(e) => setNewSubcontractor(e.target.value)}
                  className="border p-2 rounded flex-1"
                />
                <button onClick={() => handleAddSetting('subcontractor', newSubcontractor)} className="bg-green-600 text-white px-4 py-2 rounded font-bold">追加</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {safeSubcontractors.map((sub: string) => (
                  <span key={sub} className="bg-gray-100 px-3 py-1 rounded border flex items-center gap-2 font-bold">
                    {sub}
                    <button onClick={() => handleDeleteSetting('subcontractor', sub)} className="text-red-500 font-bold">×</button>
                  </span>
                ))}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
