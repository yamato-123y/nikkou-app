'use client';
import { useState, useEffect } from 'react';

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [isAuthed, setIsAuthed] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [reports, setReports] = useState<any[]>([]);

  // マスタ設定の状態
  const [locations, setLocations] = useState<string[]>(['堺市邸解体工事', '北花田店舗改修', '美原区住宅解体', '美加の台']);
  const [leases, setLeases] = useState<string[]>(['0.2ユンボ', '0.4ユンボ']);
  const [scrapLocations, setScrapLocations] = useState<{ location: string; item: string }[]>([
    { location: '堺処分場', item: 'ガラ' }
  ]);
  const [workers, setWorkers] = useState<string[]>([
    '山田 太郎', '鈴木 次郎', '佐藤 花子', '田中 一郎'
  ]);

  // 入力用
  const [newLocation, setNewLocation] = useState('');
  const [newLease, setNewLease] = useState('');
  const [newScrapLoc, setNewScrapLoc] = useState('');
  const [newScrapItem, setNewScrapItem] = useState('');
  const [newWorker, setNewWorker] = useState('');

  useEffect(() => {
    const savedLocs = localStorage.getItem('yamato_locations');
    if (savedLocs) setLocations(JSON.parse(savedLocs));

    const savedLeases = localStorage.getItem('yamato_leases');
    if (savedLeases) setLeases(JSON.parse(savedLeases));

    const savedScraps = localStorage.getItem('yamato_scrapLocations');
    if (savedScraps) setScrapLocations(JSON.parse(savedScraps));

    const savedWorkers = localStorage.getItem('yamato_workers');
    if (savedWorkers) setWorkers(JSON.parse(savedWorkers));

    const savedReports = localStorage.getItem('yamato_reports');
    if (savedReports) setReports(JSON.parse(savedReports));
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
    } else if (type === 'lease' && newLease.trim()) {
      const updated = [...leases, newLease.trim()];
      setLeases(updated);
      saveToStorage('yamato_leases', updated);
      setNewLease('');
    } else if (type === 'scrap' && newScrapLoc.trim() && newScrapItem.trim()) {
      const updated = [...scrapLocations, { location: newScrapLoc.trim(), item: newScrapItem.trim() }];
      setScrapLocations(updated);
      saveToStorage('yamato_scrapLocations', updated);
      setNewScrapLoc('');
      setNewScrapItem('');
    } else if (type === 'worker' && newWorker.trim()) {
      const updated = [...workers, newWorker.trim()];
      setWorkers(updated);
      saveToStorage('yamato_workers', updated);
      setNewWorker('');
    }
  };

  const handleDelete = (type: string, target: any) => {
    if (!confirm('本当に削除しますか？')) return;

    if (type === 'location') {
      const updated = locations.filter(l => l !== target);
      setLocations(updated);
      saveToStorage('yamato_locations', updated);
    } else if (type === 'lease') {
      const updated = leases.filter(l => l !== target);
      setLeases(updated);
      saveToStorage('yamato_leases', updated);
    } else if (type === 'scrap') {
      const updated = scrapLocations.filter(s => !(s.location === target.location && s.item === target.item));
      setScrapLocations(updated);
      saveToStorage('yamato_scrapLocations', updated);
    } else if (type === 'worker') {
      const updated = workers.filter(w => w !== target);
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
                {locations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-4 text-center text-slate-400 text-sm">現場が登録されていません</td>
                  </tr>
                ) : (
                  locations.map((loc: string) => {
                    const locReports = reports.filter(r => r?.location === loc);
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

        {/* マスタ登録（現場・リース・処分場・作業員） */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            ⚙️ マスタ登録（現場・リース・処分場・作業員）
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
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
                  onClick={() => handleAdd('location')}
                  className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-bold shrink-0 shadow"
                >
                  追加
                </button>
              </div>
              <div className="divide-y divide-slate-200 max-h-48 overflow-y-auto">
                {locations.map((loc: string) => (
                  <div key={loc} className="py-2.5 flex justify-between items-center text-sm font-bold">
                    <span>{loc}</span>
                    <button
                      onClick={() => handleDelete('location', loc)}
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
                  onClick={() => handleAdd('lease')}
                  className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-bold shrink-0 shadow"
                >
                  追加
                </button>
              </div>
              <div className="divide-y divide-slate-200 max-h-48 overflow-y-auto">
                {leases.map((l: string) => (
                  <div key={l} className="py-2.5 flex justify-between items-center text-sm font-bold">
                    <span>{l}</span>
                    <button
                      onClick={() => handleDelete('lease', l)}
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
                    onClick={() => handleAdd('scrap')}
                    className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-bold shrink-0 shadow"
                  >
                    追加
                  </button>
                </div>
              </div>
              <div className="divide-y divide-slate-200 max-h-36 overflow-y-auto">
                {scrapLocations.map((sc: any, idx: number) => (
                  <div key={idx} className="py-2.5 flex justify-between items-center text-sm font-bold">
                    <span>{sc.location} - {sc.item}</span>
                    <button
                      onClick={() => handleDelete('scrap', sc)}
                      className="text-red-500 hover:text-red-700 text-xs font-bold"
                    >
                      削除
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* 自社作業員マスタ */}
            <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-sm">👥 自社作業員マスタ</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="氏名を入力"
                  value={newWorker}
                  onChange={(e) => setNewWorker(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300 text-sm bg-white"
                />
                <button
                  onClick={() => handleAdd('worker')}
                  className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-bold shrink-0 shadow"
                >
                  追加
                </button>
              </div>
              <div className="divide-y divide-slate-200 max-h-48 overflow-y-auto">
                {workers.map((w: string) => (
                  <div key={w} className="py-2.5 flex justify-between items-center text-sm font-bold">
                    <span>{w}</span>
                    <button
                      onClick={() => handleDelete('worker', w)}
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
