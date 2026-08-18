'use client';
import { useState, useEffect } from 'react';

export default function Home() {
  const [workersList, setWorkersList] = useState<string[]>([]);
  const [locationsList, setLocationsList] = useState<string[]>([]);
  const [vehiclesList, setVehiclesList] = useState<string[]>([]);
  const [heavyMachinesList, setHeavyMachinesList] = useState<string[]>([]);
  const [scrapOptions, setScrapOptions] = useState<any[]>([]);
  const [subcontractorsList, setSubcontractorsList] = useState<string[]>([]);
  const [leasesList, setLeasesList] = useState<string[]>([]);

  // 日付を「2026/08/18」のようなテキストとして安全に管理
  const [date, setDate] = useState('2026/08/18');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [selectedWorkers, setSelectedWorkers] = useState<string[]>([]);
  const [selectedSubcontractor, setSelectedSubcontractor] = useState('');
  const [subCount, setSubCount] = useState('');
  const [selectedHeavyMachine, setSelectedHeavyMachine] = useState('');
  const [fuelLiters, setFuelLiters] = useState('');
  const [regularCost, setRegularCost] = useState('');
  const [parkingCost, setParkingCost] = useState('');
  const [selectedLease, setSelectedLease] = useState('');
  
  const [disposalEntries, setDisposalEntries] = useState<{ location: string; quantity: string }[]>([]);
  const [scrapEntries, setScrapEntries] = useState<{ location: string; quantity: string }[]>([]);
  const [workDescription, setWorkDescription] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.workers) setWorkersList(data.workers);
      if (data.locations) setLocationsList(data.locations);
      if (data.vehicles) setVehiclesList(data.vehicles);
      if (data.heavyMachines) setHeavyMachinesList(data.heavyMachines);
      if (data.scrapLocations) setScrapOptions(data.scrapLocations);
      if (data.subcontractors) setSubcontractorsList(data.subcontractors);
      if (data.leases) setLeasesList(data.leases);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopyYesterday = (type: string) => {
    alert(`${type}の昨日と同じデータを読み込みました`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-200 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md w-full">
          <h1 className="text-2xl font-bold text-orange-600 mb-4">日報を送信しました！</h1>
          <button onClick={() => setSubmitted(false)} className="bg-orange-600 text-white px-6 py-3 rounded-xl font-bold w-full">
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
            
            {/* 日付（テキスト入力にすることで絶対に枠からはみ出さないように修正） */}
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

          {/* 2. 作業員 */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center pb-2 border-b-2 border-orange-600 mb-4">
              <span className="text-slate-900 font-bold text-lg">👥 2. 作業員</span>
              <button
                type="button"
                onClick={() => handleCopyYesterday('自社作業員')}
                className="bg-[#1D70B8] hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-sm font-bold shadow"
              >
                🔄 昨日と同じ
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">【自社作業員】</label>
                <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 max-h-40 overflow-y-auto">
                  {workersList.map((w) => (
                    <label key={w} className="flex items-center space-x-2 p-1">
                      <input
                        type="checkbox"
                        checked={selectedWorkers.includes(w)}
                        onChange={() => {
                          if (selectedWorkers.includes(w)) {
                            setSelectedWorkers(selectedWorkers.filter(item => item !== w));
                          } else {
                            setSelectedWorkers([...selectedWorkers, w]);
                          }
                        }}
                        className="w-5 h-5 text-orange-600 rounded"
                      />
                      <span className="font-bold text-sm">{w}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">【外注・派遣作業員】</label>
                <div className="space-y-2">
                  <select
                    value={selectedSubcontractor}
                    onChange={(e) => setSelectedSubcontractor(e.target.value)}
                    className="w-full p-3 rounded-xl bg-white border border-slate-300 text-base font-bold"
                  >
                    <option value="">外注会社を選択</option>
                    {subcontractorsList.map((sub) => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    placeholder="人数を入力"
                    value={subCount}
                    onChange={(e) => setSubCount(e.target.value)}
                    className="w-full p-3 rounded-xl bg-white border border-slate-300 text-base font-bold"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 3. 重機・車両・リース */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center pb-2 border-b-2 border-orange-600 mb-4">
              <span className="text-slate-900 font-bold text-lg">🚜 3. 重機・車両・リース</span>
              <button
                type="button"
                onClick={() => handleCopyYesterday('重機・車両')}
                className="bg-[#1D70B8] hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-sm font-bold shadow"
              >
                🔄 昨日と同じ
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">【車両】</label>
                <select
                  value={selectedVehicle}
                  onChange={(e) => setSelectedVehicle(e.target.value)}
                  className="w-full p-3 rounded-xl bg-white border border-slate-300 text-base font-bold"
                >
                  <option value="">車両を選択</option>
                  {vehiclesList.map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">【自社重機】</label>
                <select
                  value={selectedHeavyMachine}
                  onChange={(e) => setSelectedHeavyMachine(e.target.value)}
                  className="w-full p-3 rounded-xl bg-white border border-slate-300 text-base font-bold"
                >
                  <option value="">重機を選択</option>
                  {heavyMachinesList.map((hm) => (
                    <option key={hm} value={hm}>{hm}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">【リース重機】</label>
                <select
                  value={selectedLease}
                  onChange={(e) => setSelectedLease(e.target.value)}
                  className="w-full p-3 rounded-xl bg-white border border-slate-300 text-base font-bold"
                >
                  <option value="">リース内容を選択</option>
                  {leasesList.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 軽油 (L) */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <label className="block font-bold text-slate-800 mb-2">⛽ 軽油 (L)</label>
            <input
              type="number"
              value={fuelLiters}
              onChange={(e) => setFuelLiters(e.target.value)}
              placeholder="0"
              className="w-full p-3 rounded-xl bg-slate-50 border border-slate-300 text-xl font-bold"
            />
          </div>

          {/* レギュラー購入金額 (円) */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <label className="block font-bold text-slate-800 mb-2">⛽ レギュラー購入金額 (円)</label>
            <input
              type="number"
              value={regularCost}
              onChange={(e) => setRegularCost(e.target.value)}
              placeholder="0"
              className="w-full p-3 rounded-xl bg-slate-50 border border-slate-300 text-xl font-bold"
            />
          </div>

          {/* 駐車場代 (円) */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <label className="block font-bold text-slate-800 mb-2">🅿️ 駐車場代 (円)</label>
            <input
              type="number"
              value={parkingCost}
              onChange={(e) => setParkingCost(e.target.value)}
              placeholder="0"
              className="w-full p-3 rounded-xl bg-slate-50 border border-slate-300 text-xl font-bold"
            />
          </div>

          {/* 4. 処分場のガラ搬出 */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b-2 border-orange-600">
              <span className="text-slate-900 font-bold text-lg">🗑️ 4. 処分場のガラ搬出</span>
              <button
                type="button"
                onClick={() => setDisposalEntries([...disposalEntries, { location: '', quantity: '0' }])}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow"
              >
                + 追加する
              </button>
            </div>
            {disposalEntries.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-2">処分場搬出がある場合は「+ 追加する」を押してください</p>
            ) : (
              disposalEntries.map((entry, index) => (
                <div key={index} className="p-4 rounded-xl border border-slate-300 bg-slate-50 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-slate-700">処分場・品目</span>
                    <button
                      type="button"
                      onClick={() => setDisposalEntries(disposalEntries.filter((_, i) => i !== index))}
                      className="text-red-600 text-sm font-bold hover:underline"
                    >
                      ✕ 削除
                    </button>
                  </div>
                  <select
                    value={entry.location}
                    onChange={(e) => {
                      const updated = [...disposalEntries];
                      updated[index].location = e.target.value;
                      setDisposalEntries(updated);
                    }}
                    className="w-full p-3 rounded-xl bg-white border border-slate-300 text-base font-bold"
                  >
                    <option value="">処分場を選択</option>
                    {scrapOptions.map((sc, idx) => (
                      <option key={idx} value={`${sc.location}:${sc.item}`}>{sc.location} - {sc.item}</option>
                    ))}
                  </select>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-700">数量:</span>
                    <div className="relative flex-1">
                      <input
                        type="number"
                        value={entry.quantity}
                        onChange={(e) => {
                          const updated = [...disposalEntries];
                          updated[index].quantity = e.target.value;
                          setDisposalEntries(updated);
                        }}
                        className="w-full p-3 pr-8 rounded-xl bg-white border border-slate-300 text-lg font-bold"
                      />
                      <span className="absolute right-3 top-3 font-bold text-slate-600">t</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* スクラップ */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b-2 border-orange-600">
              <span className="text-slate-900 font-bold text-lg">♻️ スクラップ</span>
              <button
                type="button"
                onClick={() => setScrapEntries([...scrapEntries, { location: '', quantity: '0' }])}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow"
              >
                + 追加する
              </button>
            </div>
            {scrapEntries.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-2">スクラップがある場合は「+ 追加する」を押してください</p>
            ) : (
              scrapEntries.map((entry, index) => (
                <div key={index} className="p-4 rounded-xl border border-slate-300 bg-slate-50 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-slate-700">スクラップ品目</span>
                    <button
                      type="button"
                      onClick={() => setScrapEntries(scrapEntries.filter((_, i) => i !== index))}
                      className="text-red-600 text-sm font-bold hover:underline"
                    >
                      ✕ 削除
                    </button>
                  </div>
                  <select
                    value={entry.location}
                    onChange={(e) => {
                      const updated = [...scrapEntries];
                      updated[index].location = e.target.value;
                      setScrapEntries(updated);
                    }}
                    className="w-full p-3 rounded-xl bg-white border border-slate-300 text-base font-bold"
                  >
                    <option value="">スクラップを選択</option>
                    {scrapOptions.map((sc, idx) => (
                      <option key={idx} value={`${sc.location}:${sc.item}`}>{sc.location} - {sc.item}</option>
                    ))}
                  </select>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-700">数量:</span>
                    <div className="relative flex-1">
                      <input
                        type="number"
                        value={entry.quantity}
                        onChange={(e) => {
                          const updated = [...scrapEntries];
                          updated[index].quantity = e.target.value;
                          setScrapEntries(updated);
                        }}
                        className="w-full p-3 pr-8 rounded-xl bg-white border border-slate-300 text-lg font-bold"
                      />
                      <span className="absolute right-3 top-3 font-bold text-slate-600">kg</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* 5. 本日の作業内容 */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-3">
            <div className="flex justify-between items-center pb-2 border-b-2 border-orange-600">
              <span className="text-slate-900 font-bold text-lg">📝 5. 本日の作業内容・備考</span>
            </div>
            <textarea
              value={workDescription}
              onChange={(e) => setWorkDescription(e.target.value)}
              placeholder="業務内容や連絡事項などを入力してください"
              className="w-full p-3 rounded-xl bg-slate-50 border border-slate-300 text-base font-bold"
            ></textarea>
          </div>

          {/* 送信ボタン */}
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
