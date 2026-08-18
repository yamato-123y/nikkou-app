'use client';
import { useState, useEffect } from 'react';

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
  const [loading, setLoading] = useState(false);

  // マスタ追加用の入力状態
  const [newLocation, setNewLocation] = useState('');
  const [newLease, setNewLease] = useState('');
  const [newScrapLoc, setNewScrapLoc] = useState('');
  const [newScrapItem, setNewScrapItem] = useState('');
  const [newWorker, setNewWorker] = useState('');

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
        if (type === 'lease') setNewLease('');
        if (type === 'scrapLocation') { setNewScrapLoc(''); setNewScrapItem(''); }
        if (type === 'worker') setNewWorker('');
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
  const safeLeases = Array.isArray(settings?.leases) ? settings.leases : [];
  const safeScrapLocs = Array.isArray(settings?.scrapLocations) ? settings.scrapLocations : [];
  const safeWorkers = Array.isArray(settings?.workers) ? settings.workers : [];

  return (
    <div className="min-h-screen bg-slate-100 p-6 font-sans text-slate-800">
      <div className="max-w-6xl mx-auto space-y-6">
        
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

        {loading && <p className="text-center py-4 font-bold text-slate-600">読み込み中...</p>}

        {/* 現場別 経費集計サマリー */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            🏢 現場別 経費集計サマリー
          </h2>

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
                {safeLocations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-4 text-center text-slate-400 text-sm">現場が登録されていません</td>
                  </tr>
                ) : (
                  safeLocations.map((loc: string) => {
                    const locReports = safeReports.filter(r => r?.location === loc);
                    return (
                      <tr key={loc} className="hover:bg-slate-50">
                        <td className="py-4 text-[#1D70B8]">{loc}</td>
                        <td className="py-4 text-slate-700">{locReports.length}日</td>
                        <td className="py-4 text-slate-700">¥0</td>
                        <td className="py-4 text-slate-700">¥0</td>
                        <td className="py-4 text-slate-700">¥0</td>
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

        {/* マスタ登録（現場・リース・処分場） */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            ⚙️ マスタ登録（現場・リース・処分場）
          </h2>

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
                <button
                  onClick={() => handleAddSetting('location', newLocation)}
                  className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 rounded-lg text-sm font-bold shrink-0 shadow"
                >
                  追加
                </button>
              </div>
              <div className="divide-y divide-slate-200 max-h-48 overflow-y-auto">
                {safeLocations.map((loc: string) => (
                  <div key={loc} className="py-2 flex justify-between items-center text-sm font-bold">
                    <span>{loc}</span>
                    <button
                      onClick={() => handleDeleteSetting('location', loc)}
                      className="text-red-500 hover:text-red-700 text-xs font-bold"
                    >
                      削除
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* リース・重機マスタ */}
            <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-sm">🚜 リース・重機マスタ</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="例: 0.2ユンボ"
                  value={newLease}
                  onChange={(e) => setNewLease(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300 text-sm bg-white"
                />
                <button
                  onClick={() => handleAddSetting('lease', newLease)}
                  className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 rounded-lg text-sm font-bold shrink-0 shadow"
                >
                  追加
                </button>
              </div>
              <div className="divide-y divide-slate-200 max-h-48 overflow-y-auto">
                {safeLeases.map((l: string) => (
                  <div key={l} className="py-2 flex justify-between items-center text-sm font-bold">
                    <span>{l}</span>
                    <button
                      onClick={() => handleDeleteSetting('lease', l)}
                      className="text-red-500 hover:text-red-700 text-xs font-bold"
                    >
                      削除
                    </button>
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
                  placeholder="処分場名 (例: 堺処分場)"
                  value={newScrapLoc}
                  onChange={(e) => setNewScrapLoc(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300 text-sm bg-white"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="品目 (例: ガラ)"
                    value={newScrapItem}
                    onChange={(e) => setNewScrapItem(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-300 text-sm bg-white"
                  />
                  <button
                    onClick={() => handleAddSetting('scrapLocation', { location: newScrapLoc, item: newScrapItem })}
                    className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 rounded-lg text-sm font-bold shrink-0 shadow"
                  >
                    追加
                  </button>
                </div>
              </div>
              <div className="divide-y divide-slate-200 max-h-36 overflow-y-auto">
                {safeScrapLocs.map((sc: any, idx: number) => (
                  <div key={idx} className="py-2 flex justify-between items-center text-sm font-bold">
                    <span>{sc.location} - {sc.item}</span>
                    <button
                      onClick={() => handleDeleteSetting('scrapLocation', `${sc.location}:${sc.item}`)}
                      className="text-red-500 hover:text-red-700 text-xs font-bold"
                    >
                      削除
                    </button>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
