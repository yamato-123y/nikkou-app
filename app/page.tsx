'use client';
import { useState, useEffect } from 'react';

export default function Home() {
  const [date, setDate] = useState('2026/08/18');
  
  const [locationsList, setLocationsList] = useState<string[]>([]);
  const [leasesList, setLeasesList] = useState<any[]>([]);
  const [scrapOptions, setScrapOptions] = useState<any[]>([]);
  const [managersList, setManagersList] = useState<any[]>([]);
  const [workersList, setWorkersList] = useState<any[]>([]);
  const [vehiclesList, setVehiclesList] = useState<string[]>(['2tダンプ', '4tダンプ', '軽トラ']);

  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedManagers, setSelectedManagers] = useState<string[]>([]);
  const [selectedWorkers, setSelectedWorkers] = useState<string[]>([]);
  const [selectedLeases, setSelectedLeases] = useState<string[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState('2tダンプ');
  
  const [fuelLiters, setFuelLiters] = useState('');
  const [regularCost, setRegularCost] = useState('');
  const [parkingCost, setParkingCost] = useState('');
  
  const [disposalEntries, setDisposalEntries] = useState<{ location: string; item: string; unit: string; quantity: string }[]>([]);
  const [workDescription, setWorkDescription] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // サーバーから設定データを読み込む
  const loadSettingsFromServer = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        if (data) {
          if (data.locations) setLocationsList(data.locations);
          if (data.leases) {
            const formattedLeases = data.leases.map((l: any) => typeof l === 'string' ? { name: l, price: 0 } : l);
            setLeasesList(formattedLeases);
          }
          if (data.scrapLocations) setScrapOptions(data.scrapLocations);
          if (data.managers) {
            const formattedMgrs = data.managers.map((m: any) => typeof m === 'string' ? { name: m, price: 0 } : m);
            setManagersList(formattedMgrs);
          }
          if (data.workers) {
            const formattedWkrs = data.workers.map((w: any) => typeof w === 'string' ? { name: w, price: 0 } : w);
            setWorkersList(formattedWkrs);
          }
          if (data.vehicles) setVehiclesList(data.vehicles);
        }
      }
    } catch (e) {
      console.error("設定取得エラー:", e);
    }
  };

  useEffect(() => {
    loadSettingsFromServer();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newReport = {
      date,
      locations: selectedLocations,
      managers: selectedManagers,
      workers: selectedWorkers,
      vehicle: selectedVehicle,
      leases: selectedLeases,
      fuelLiters,
      regularCost,
      parkingCost,
      disposals: disposalEntries,
      workDescription,
      createdAt: new Date().toISOString()
    };

    try {
      await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newReport)
      });
      setSubmitted(true);
    } catch (e) {
      alert("送信に失敗しました");
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-200 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md w-full">
          <h1 className="text-2xl font-bold text-orange-600 mb-4">日報を送信しました！</h1>
          <button onClick={() => { setSubmitted(false); loadSettingsFromServer(); }} className="bg-orange-600 text-white px-6 py-3 rounded-xl font-bold w-full">
            続けて入力する
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-200 py-6 px-4 font-sans text-slate-800">
      <div className="max-w-xl mx-auto space-y-4">
        
        <div className="bg-[#111827] text-white p-4 rounded-2xl shadow-md text-center">
          <div className="text-sm text-gray-300">📱 現場日報入力</div>
          <div className="text-lg font-bold">株式会社大和</div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* 1. 日付と現場の選択 */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <div className="text-slate-900 font-bold text-lg pb-2 border-b-2 border-orange-600">
              📍 日付と現場の選択（複数選択可）
            </div>
            
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">【日付】</label>
              <input
                type="text"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-100 border border-slate-300 text-lg font-bold text-center"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">【現場名】</label>
              <div className="grid grid-cols-1 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 max-h-40 overflow-y-auto">
                {locationsList.length === 0 ? (
                  <p className="text-xs text-slate-400">現場が登録されていません</p>
                ) : (
                  locationsList.map((loc) => (
                    <label key={loc} className="flex items-center space-x-2 p-1">
                      <input
                        type="checkbox"
                        checked={selectedLocations.includes(loc)}
                        onChange={() => {
                          if (selectedLocations.includes(loc)) {
                            setSelectedLocations(selectedLocations.filter(item => item !== loc));
                          } else {
                            setSelectedLocations([...selectedLocations, loc]);
                          }
                        }}
                        className="w-5 h-5 text-orange-600 rounded"
                      />
                      <span className="font-bold text-sm">{loc}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* 2. 担当者・作業員 */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <div className="text-slate-900 font-bold text-lg pb-2 border-b-2 border-orange-600">
              👥 担当者・作業員（複数選択可）
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">【現場責任者】</label>
              <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 max-h-40 overflow-y-auto">
                {managersList.length === 0 ? (
                  <p className="text-xs text-slate-400">責任者が登録されていません</p>
                ) : (
                  managersList.map((m) => (
                    <label key={m.name} className="flex items-center space-x-2 p-1">
                      <input
                        type="checkbox"
                        checked={selectedManagers.includes(m.name)}
                        onChange={() => {
                          if (selectedManagers.includes(m.name)) {
                            setSelectedManagers(selectedManagers.filter(item => item !== m.name));
                          } else {
                            setSelectedManagers([...selectedManagers, m.name]);
                          }
                        }}
                        className="w-5 h-5 text-orange-600 rounded"
                      />
                      <span className="font-bold text-sm">{m.name}</span>
                    </label>
                  ))
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">【作業メンバー】</label>
              <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 max-h-40 overflow-y-auto">
                {workersList.length === 0 ? (
                  <p className="text-xs text-slate-400">メンバーが登録されていません</p>
                ) : (
                  workersList.map((w) => (
                    <label key={w.name} className="flex items-center space-x-2 p-1">
                      <input
                        type="checkbox"
                        checked={selectedWorkers.includes(w.name)}
                        onChange={() => {
                          if (selectedWorkers.includes(w.name)) {
                            setSelectedWorkers(selectedWorkers.filter(item => item !== w.name));
                          } else {
                            setSelectedWorkers([...selectedWorkers, w.name]);
                          }
                        }}
                        className="w-5 h-5 text-orange-600 rounded"
                      />
                      <span className="font-bold text-sm">{w.name}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* 3. 車両・リース重機 */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <div className="text-slate-900 font-bold text-lg pb-2 border-b-2 border-orange-600">
              🚜 車両・リース重機
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">【車両】</label>
              <select
                value={selectedVehicle}
                onChange={(e) => setSelectedVehicle(e.target.value)}
                className="w-full p-3 rounded-xl bg-white border border-slate-300 text-base font-bold"
              >
                {vehiclesList.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">【リース重機】（複数選択可）</label>
              <div className="grid grid-cols-1 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 max-h-40 overflow-y-auto">
                {leasesList.length === 0 ? (
                  <p className="text-xs text-slate-400">リース重機が登録されていません</p>
                ) : (
                  leasesList.map((l) => (
                    <label key={l.name} className="flex items-center space-x-2 p-1">
                      <input
                        type="checkbox"
                        checked={selectedLeases.includes(l.name)}
                        onChange={() => {
                          if (selectedLeases.includes(l.name)) {
                            setSelectedLeases(selectedLeases.filter(item => item !== l.name));
                          } else {
                            setSelectedLeases([...selectedLeases, l.name]);
                          }
                        }}
                        className="w-5 h-5 text-orange-600 rounded"
                      />
                      <span className="font-bold text-sm">{l.name}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* 軽油・レギュラー・駐車場 */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <div>
              <label className="block font-bold text-slate-800 mb-2">⛽ 軽油 (L)</label>
              <input type="number" value={fuelLiters} onChange={(e) => setFuelLiters(e.target.value)} placeholder="0" className="w-full p-3 rounded-xl bg-slate-50 border border-slate-300 text-xl font-bold" />
            </div>
            <div>
              <label className="block font-bold text-slate-800 mb-2">⛽ レギュラー購入金額 (円)</label>
              <input type="number" value={regularCost} onChange={(e) => setRegularCost(e.target.value)} placeholder="0" className="w-full p-3 rounded-xl bg-slate-50 border border-slate-300 text-xl font-bold" />
            </div>
            <div>
              <label className="block font-bold text-slate-800 mb-2">🅿️ 駐車場代 (円)</label>
              <input type="number" value={parkingCost} onChange={(e) => setParkingCost(e.target.value)} placeholder="0" className="w-full p-3 rounded-xl bg-slate-50 border border-slate-300 text-xl font-bold" />
            </div>
          </div>

          {/* 4. 処分場のガラ搬出 */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b-2 border-orange-600">
              <span className="text-slate-900 font-bold text-lg">🗑️ 4. 処分場のガラ搬出</span>
              <button
                type="button"
                onClick={() => setDisposalEntries([...disposalEntries, { location: '', item: '', unit: 't', quantity: '' }])}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow"
              >
                + 追加する
              </button>
            </div>
            {disposalEntries.map((entry, index) => (
              <div key={index} className="p-4 rounded-xl border border-slate-300 bg-slate-50 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-slate-700">処分場選択</span>
                  <button type="button" onClick={() => setDisposalEntries(disposalEntries.filter((_, i) => i !== index))} className="text-red-600 text-sm font-bold">✕ 削除</button>
                </div>
                <select
                  value={entry.location}
                  onChange={(e) => {
                    const selected = scrapOptions.find(sc => `${sc.location} - ${sc.item}` === e.target.value);
                    const updated = [...disposalEntries];
                    if (selected) {
                      updated[index].location = selected.location;
                      updated[index].item = selected.item;
                      updated[index].unit = selected.unit || 't';
                    } else {
                      updated[index].location = '';
                      updated[index].item = '';
                    }
                    setDisposalEntries(updated);
                  }}
                  className="w-full p-3 rounded-xl bg-white border border-slate-300 text-base font-bold"
                >
                  <option value="">処分場を選択してください</option>
                  {scrapOptions.map((sc, idx) => (
                    <option key={idx} value={`${sc.location} - ${sc.item}`}>
                      {sc.location} （品目: {sc.item} / 単位: {sc.unit}）
                    </option>
                  ))}
                </select>

                {entry.location && (
                  <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200">
                    <div className="text-sm font-bold text-slate-600">
                      品目: <span className="text-blue-600">{entry.item}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-700">数量:</span>
                      <input
                        type="number"
                        placeholder="0"
                        value={entry.quantity}
                        onChange={(e) => {
                          const updated = [...disposalEntries];
                          updated[index].quantity = e.target.value;
                          setDisposalEntries(updated);
                        }}
                        className="w-24 p-2 rounded-lg bg-slate-50 border border-slate-300 text-lg font-bold text-right"
                      />
                      <span className="font-bold text-slate-700">{entry.unit}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 5. 作業内容 */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-3">
            <div className="flex justify-between items-center pb-2 border-b-2 border-orange-600">
              <span className="text-slate-900 font-bold text-lg">📝 5. 本日の作業内容・備考</span>
            </div>
            <textarea
              value={workDescription}
              onChange={(e) => setWorkDescription(e.target.value)}
              placeholder="業務内容を入力してください"
              className="w-full p-3 rounded-xl bg-slate-50 border border-slate-300 text-base font-bold"
            ></textarea>
          </div>

          <button
            type="submit"
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xl py-4 rounded-2xl shadow-lg transition"
          >
            📩 日報を送信する
          </button>
        </form>
      </div>
    </div>
  );
}
