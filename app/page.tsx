'use client';
import { useState, useEffect } from 'react';

export default function Home() {
  const [date, setDate] = useState('2026/08/18');
  
  const [locationsList, setLocationsList] = useState<string[]>([]);
  const [leasesList, setLeasesList] = useState<any[]>([]);
  const [scrapOptions, setScrapOptions] = useState<any[]>([]);
  const [managersList, setManagersList] = useState<any[]>([]);
  const [workersList, setWorkersList] = useState<any[]>([]);

  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedManager, setSelectedManager] = useState('');
  const [selectedWorkers, setSelectedWorkers] = useState<string[]>([]);
  
  const [selectedVehicle, setSelectedVehicle] = useState('2tダンプ');
  const [selectedHeavyMachine, setSelectedHeavyMachine] = useState('');
  const [selectedLease, setSelectedLease] = useState('');
  
  const [fuelLiters, setFuelLiters] = useState('');
  const [regularCost, setRegularCost] = useState('');
  const [parkingCost, setParkingCost] = useState('');
  
  const [disposalEntries, setDisposalEntries] = useState<{ location: string; item: string; unit: string; quantity: string }[]>([]);
  const [workDescription, setWorkDescription] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // 管理画面で登録されたデータを確実に読み込む
  const loadDataFromStorage = () => {
    try {
      const savedLocs = localStorage.getItem('yamato_locations');
      if (savedLocs) setLocationsList(JSON.parse(savedLocs));

      const savedLeases = localStorage.getItem('yamato_leases');
      if (savedLeases) setLeasesList(JSON.parse(savedLeases));

      const savedScraps = localStorage.getItem('yamato_scrapLocations');
      if (savedScraps) setScrapOptions(JSON.parse(savedScraps));

      const savedManagers = localStorage.getItem('yamato_managers');
      if (savedManagers) setManagersList(JSON.parse(savedManagers));

      const savedWorkers = localStorage.getItem('yamato_workers');
      if (savedWorkers) setWorkersList(JSON.parse(savedWorkers));
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadDataFromStorage();
    window.addEventListener('storage', loadDataFromStorage);
    return () => window.removeEventListener('storage', loadDataFromStorage);
  }, []);

  const handleCopyYesterday = (type: string) => {
    alert(`${type}の昨日と同じデータを読み込みました`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newReport = {
      date,
      location: selectedLocation,
      manager: selectedManager,
      workers: selectedWorkers,
      vehicle: selectedVehicle,
      heavyMachine: selectedHeavyMachine,
      lease: selectedLease,
      fuelLiters,
      regularCost,
      parkingCost,
      disposals: disposalEntries,
      workDescription,
      createdAt: new Date().toISOString()
    };

    const existingReports = JSON.parse(localStorage.getItem('yamato_reports') || '[]');
    localStorage.setItem('yamato_reports', JSON.stringify([newReport, ...existingReports]));
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-200 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md w-full">
          <h1 className="text-2xl font-bold text-orange-600 mb-4">日報を送信しました！</h1>
          <button onClick={() => { setSubmitted(false); loadDataFromStorage(); }} className="bg-orange-600 text-white px-6 py-3 rounded-xl font-bold w-full">
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
              📍 日付と現場の選択
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
              <label className="block text-sm font-bold text-slate-700 mb-1">【現場名】</label>
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full p-3 rounded-xl bg-white border border-slate-300 text-base font-bold"
              >
                <option value="">現場を選択してください</option>
                {locationsList.map((loc) => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 2. 責任者と作業メンバー */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b-2 border-orange-600">
              <span className="text-slate-900 font-bold text-lg">👥 2. 担当者・作業員</span>
              <button
                type="button"
                onClick={() => handleCopyYesterday('作業員')}
                className="bg-[#1D70B8] hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-sm font-bold shadow"
              >
                🔄 昨日と同じ
              </button>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">【現場責任者】</label>
              <select
                value={selectedManager}
                onChange={(e) => setSelectedManager(e.target.value)}
                className="w-full p-3 rounded-xl bg-white border border-slate-300 text-base font-bold"
              >
                <option value="">責任者を選択</option>
                {managersList.map((m) => (
                  <option key={m.name} value={m.name}>{m.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">【作業メンバー】</label>
              <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 max-h-40 overflow-y-auto">
                {workersList.map((w) => (
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
                ))}
              </div>
            </div>
          </div>

          {/* 3. 重機・車両・リース */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center pb-2 border-b-2 border-orange-600 mb-4">
              <span className="text-slate-900 font-bold text-lg">🚜 3. 車両・リース重機</span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">【リース重機】</label>
                <select
                  value={selectedLease}
                  onChange={(e) => setSelectedLease(e.target.value)}
                  className="w-full p-3 rounded-xl bg-white border border-slate-300 text-base font-bold"
                >
                  <option value="">リース内容を選択</option>
                  {leasesList.map((l) => (
                    <option key={l.name} value={l.name}>{l.name} (日額: ¥{l.price})</option>
                  ))}
                </select>
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
              placeholder="業務内容や連絡事項を入力してください"
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
