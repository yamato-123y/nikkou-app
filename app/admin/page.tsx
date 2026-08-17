'tsx'
// 管理画面・詳細分析ページ（外注・ガソリン・重機・スクラップ対応版）
'use client';
import { useState, useEffect } from 'react';

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [isAuthed, setIsAuthed] = useState(false);
  const [reports, setReports] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({
    workers: [],
    locations: [],
    vehicles: [],
    heavyMachines: [],
    scrapLocations: [],
    subcontractors: []
  });
  const [tab, setTab] = useState<'reports' | 'analysis' | 'settings'>('reports');

  // 設定追加用の入力状態
  const [newWorker, setNewWorker] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newVehicle, setNewVehicle] = useState('');
  const [newHeavyMachine, setNewHeavyMachine] = useState('');
  const [newScrapLocation, setNewScrapLocation] = useState('');
  const [newScrapItem, setNewScrapItem] = useState('');
  const [newSubcontractor, setNewSubcontractor] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // パスワード認証（環境変数またはデフォルトyamato123）
    setIsAuthed(true);
    fetchData();
  };

  const fetchData = async () => {
    try {
      const resReports = await fetch('/api/reports');
      const dataReports = await resReports.json();
      setReports(dataReports);

      const resSettings = await fetch('/api/settings');
      const dataSettings = await resSettings.json();
      setSettings(dataSettings);
    } catch (err) {
      console.error(err);
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
      if (type === 'worker') setNewWorker('');
      if (type === 'location') setNewLocation('');
      if (type === 'vehicle') setNewVehicle('');
      if (type === 'heavyMachine') setNewHeavyMachine('');
      if (type === 'scrapLocation') {
        setNewScrapLocation('');
        setNewScrapItem('');
      }
      if (type === 'subcontractor') setNewSubcontractor('');
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
            placeholder="パスワードを入力"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border p-2 mb-4 rounded"
          />
          <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded font-bold">
            ログイン
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">日報管理・原価詳細ダッシュボード</h1>
          <div className="space-x-2">
            <button
              onClick={() => setTab('reports')}
              className={`px-4 py-2 rounded ${tab === 'reports' ? 'bg-blue-600 text-white' : 'bg-white border'}`}
            >
              日報一覧
            </button>
            <button
              onClick={() => setTab('analysis')}
              className={`px-4 py-2 rounded ${tab === 'analysis' ? 'bg-blue-600 text-white' : 'bg-white border'}`}
            >
              現場詳細分析
            </button>
            <button
              onClick={() => setTab('settings')}
              className={`px-4 py-2 rounded ${tab === 'settings' ? 'bg-blue-600 text-white' : 'bg-white border'}`}
            >
              マスター設定
            </button>
          </div>
        </div>

        {tab === 'reports' && (
          <div className="bg-white rounded shadow overflow-x-auto p-4">
            <h2 className="text-lg font-bold mb-4">送信された日報一覧</h2>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b bg-gray-100">
                  <th className="p-2">日時</th>
                  <th className="p-2">現場</th>
                  <th className="p-2">作業員</th>
                  <th className="p-2">車両・重機・燃料</th>
                  <th className="p-2">外注・スクラップ</th>
                  <th className="p-2">業務内容</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r, i) => (
                  <tr key={i} className="border-b">
                    <td className="p-2 text-sm">{new Date(r.createdAt).toLocaleString()}</td>
                    <td className="p-2 font-bold">{r.location}</td>
                    <td className="p-2 text-sm">
                      {Array.isArray(r.workers) ? r.workers.join(', ') : r.workers}
                    </td>
                    <td className="p-2 text-sm">
                      <div>車両: {r.vehicle || 'なし'} ({r.distance || 0}km)</div>
                      <div>重機: {r.heavyMachine || 'なし'}</div>
                      <div>軽油: {r.fuelLiters || 0}L (¥{r.fuelCost || 0})</div>
                      <div>レギュラー: ¥{r.regularGasCost || 0}</div>
                    </td>
                    <td className="p-2 text-sm">
                      {r.subcontractors && r.subcontractors.length > 0 && (
                        <div className="text-blue-700">
                          外注: {r.subcontractors.map((s: any) => `${s.name}(土工${s.doko}人/解体${s.kaitai}人)`).join(', ')}
                        </div>
                      )}
                      {r.scraps && r.scraps.length > 0 && (
                        <div className="text-green-700">
                          スクラップ: {r.scraps.map((sc: any) => `${sc.location} ${sc.item} (${sc.value})`).join(', ')}
                        </div>
                      )}
                    </td>
                    <td className="p-2 text-sm">{r.workDescription}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'analysis' && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold">現場別詳細分析・原価詳細</h2>
            {settings.locations.map((loc: string) => {
              const locReports = reports.filter(r => r.location === loc);
              const totalFuelCost = locReports.reduce((sum, r) => sum + Number(r.fuelCost || 0) + Number(r.regularGasCost || 0), 0);
              const totalSubCost = locReports.reduce((sum, r) => {
                if (!r.subcontractors) return sum;
                // 仮の単価計算例: 土工1人1.5万円、解体1人1.8万円などとするか人数を表示
                return sum;
              }, 0);
              
              return (
                <div key={loc} className="bg-white p-4 rounded shadow">
                  <h3 className="text-xl font-bold text-blue-600 mb-2">📍 現場名: {loc}</h3>
                  <p className="text-sm text-gray-600 mb-4">総日報提出数: {locReports.length}件</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="bg-gray-50 p-3 rounded border">
                      <div className="text-xs text-gray-500">燃料費合計 (軽油+レギュラー)</div>
                      <div className="text-lg font-bold">¥{totalFuelCost.toLocaleString()}</div>
                    </div>
                  </div>

                  <h4 className="font-bold text-sm mb-2">外注費・作業員内訳</h4>
                  <ul className="list-disc pl-5 text-sm space-y-1 text-gray-700">
                    {locReports.map((r, idx) => (
                      <li key={idx}>
                        {new Date(r.createdAt).toLocaleDateString()}: 
                        {r.subcontractors && r.subcontractors.map((s: any) => ` [外注:${s.name} 土工${s.doko}名/解体${s.kaitai}名]`).join('')}
                        {r.scraps && r.scraps.map((sc: any) => ` [スクラップ:${sc.location}/${sc.item} -> ${sc.value}]`).join('')}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}

        {tab === 'settings' && (
          <div className="bg-white rounded shadow p-6 space-y-6">
            <h2 className="text-lg font-bold mb-4">マスター設定・事前登録</h2>

            {/* 外注会社 */}
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
                <button
                  onClick={() => handleAddSetting('subcontractor', newSubcontractor)}
                  className="bg-green-600 text-white px-4 py-2 rounded"
                >
                  追加
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {settings.subcontractors?.map((sub: string) => (
                  <span key={sub} className="bg-gray-100 px-3 py-1 rounded border flex items-center gap-2">
                    {sub}
                    <button onClick={() => handleDeleteSetting('subcontractor', sub)} className="text-red-500 font-bold">×</button>
                  </span>
                ))}
              </div>
            </div>

            {/* 自社重機 */}
            <div className="border-b pb-4">
              <h3 className="font-bold mb-2">自社重機一覧</h3>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="重機名を入力"
                  value={newHeavyMachine}
                  onChange={(e) => setNewHeavyMachine(e.target.value)}
                  className="border p-2 rounded flex-1"
                />
                <button
                  onClick={() => handleAddSetting('heavyMachine', newHeavyMachine)}
                  className="bg-green-600 text-white px-4 py-2 rounded"
                >
                  追加
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {settings.heavyMachines?.map((hm: string) => (
                  <span key={hm} className="bg-gray-100 px-3 py-1 rounded border flex items-center gap-2">
                    {hm}
                    <button onClick={() => handleDeleteSetting('heavyMachine', hm)} className="text-red-500 font-bold">×</button>
                  </span>
                ))}
              </div>
            </div>

            {/* スクラップ場・品目 */}
            <div className="border-b pb-4">
              <h3 className="font-bold mb-2">スクラップ場・品目一覧</h3>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                placeholder="処分場・場所名"
                  value={newScrapLocation}
                  onChange={(e) => setNewScrapLocation(e.target.value)}
                  className="border p-2 rounded flex-1"
                />
                <input
                  type="text"
                  placeholder="品目(鉄・線・銅など)"
                  value={newScrapItem}
                  onChange={(e) => setNewScrapItem(e.target.value)}
                  className="border p-2 rounded flex-1"
                />
                <button
                  onClick={() => handleAddSetting('scrapLocation', { location: newScrapLocation, item: newScrapItem })}
                  className="bg-green-600 text-white px-4 py-2 rounded"
                >
                  追加
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {settings.scrapLocations?.map((sc: any, idx: number) => (
                  <span key={idx} className="bg-gray-100 px-3 py-1 rounded border flex items-center gap-2">
                    {sc.location} - {sc.item}
                    <button onClick={() => handleDeleteSetting('scrapLocation', `${sc.location}:${sc.item}`)} className="text-red-500 font-bold">×</button>
                  </span>
                ))}
              </div>
            </div>

            {/* 現場 */}
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
                <button
                  onClick={() => handleAddSetting('location', newLocation)}
                  className="bg-green-600 text-white px-4 py-2 rounded"
                >
                  追加
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {settings.locations?.map((loc: string) => (
                  <span key={loc} className="bg-gray-100 px-3 py-1 rounded border flex items-center gap-2">
                    {loc}
                    <button onClick={() => handleDeleteSetting('location', loc)} className="text-red-500 font-bold">×</button>
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