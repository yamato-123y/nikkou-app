'use client';
import { useState, useEffect } from 'react';

export default function Home() {
  const [workersList, setWorkersList] = useState<string[]>([]);
  const [locationsList, setLocationsList] = useState<string[]>([]);
  const [vehiclesList, setVehiclesList] = useState<string[]>([]);
  const [heavyMachinesList, setHeavyMachinesList] = useState<string[]>([]);
  const [scrapOptions, setScrapOptions] = useState<any[]>([]);
  const [subcontractorsList, setSubcontractorsList] = useState<string[]>([]);

  // 入力フォームの状態
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedWorkers, setSelectedWorkers] = useState<string[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [distance, setDistance] = useState('');
  const [fuelLiters, setFuelLiters] = useState('');
  const [fuelCost, setFuelCost] = useState('');
  const [regularGasCost, setRegularGasCost] = useState(''); // レギュラーガソリン金額
  const [selectedHeavyMachine, setSelectedHeavyMachine] = useState(''); // 自社重機
  const [workDescription, setWorkDescription] = useState('');

  // 外注（会社ごと：土工人数、解体工人数）
  const [subcontractorEntries, setSubcontractorEntries] = useState<{ name: string; doko: string; kaitai: string }[]>([]);

  // スクラップ入力
  const [scrapEntries, setScrapEntries] = useState<{ location: string; item: string; value: string }[]>([]);

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
    } catch (err) {
      console.error(err);
    }
  };

  const handleWorkerToggle = (worker: string) => {
    if (selectedWorkers.includes(worker)) {
      setSelectedWorkers(selectedWorkers.filter(w => w !== worker));
    } else {
      setSelectedWorkers([...selectedWorkers, worker]);
    }
  };

  const addSubcontractorEntry = (name: string) => {
    if (!subcontractorEntries.some(s => s.name === name)) {
      setSubcontractorEntries([...subcontractorEntries, { name, doko: '', kaitai: '' }]);
    }
  };

  const updateSubcontractorCount = (name: string, field: 'doko' | 'kaitai', val: string) => {
    setSubcontractorEntries(subcontractorEntries.map(s => s.name === name ? { ...s, [field]: val } : s));
  };

  const removeSubcontractorEntry = (name: string) => {
    setSubcontractorEntries(subcontractorEntries.filter(s => s.name !== name));
  };

  const addScrapEntry = (locItemStr: string) => {
    if (!locItemStr) return;
    const [loc, item] = locItemStr.split(':');
    if (!scrapEntries.some(sc => sc.location === loc && sc.item === item)) {
      setScrapEntries([...scrapEntries, { location: loc, item, value: '' }]);
    }
  };

  const updateScrapValue = (index: number, val: string) => {
    const updated = [...scrapEntries];
    updated[index].value = val;
    setScrapEntries(updated);
  };

  const removeScrapEntry = (index: number) => {
    setScrapEntries(scrapEntries.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLocation) {
      alert('現場を選択してください');
      return;
    }

    const reportData = {
      location: selectedLocation,
      workers: selectedWorkers,
      vehicle: selectedVehicle,
      distance: Number(distance) || 0,
      fuelLiters: Number(fuelLiters) || 0,
      fuelCost: Number(fuelCost) || 0,
      regularGasCost: Number(regularGasCost) || 0,
      heavyMachine: selectedHeavyMachine,
      subcontractors: subcontractorEntries,
      scraps: scrapEntries,
      workDescription,
      createdAt: new Date().toISOString()
    };

    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportData)
      });
      if (res.ok) {
        setSubmitted(true);
      } else {
        alert('送信に失敗しました');
      }
    } catch (err) {
      console.error(err);
      alert('通信エラーが発生しました');
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-green-50 p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg text-center max-w-lg w-full border-2 border-green-300">
          <h1 className="text-3xl font-extrabold text-green-700 mb-6">日報を送信しました！</h1>
          <p className="text-xl text-gray-700 mb-8 font-medium">お疲れ様でした。</p>
          <button
            onClick={() => {
              setSubmitted(false);
              setSelectedWorkers([]);
              setWorkDescription('');
              setSubcontractorEntries([]);
              setScrapEntries([]);
              setRegularGasCost('');
              setSelectedHeavyMachine('');
            }}
            className="bg-blue-600 text-white px-8 py-4 rounded-xl text-xl font-bold w-full shadow-md hover:bg-blue-700"
          >
            続けて入力する
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-10 px-4">
      <div className="max-w-3xl mx-auto bg-white p-8 rounded-2xl shadow-xl border border-gray-200">
        <h1 className="text-3xl font-extrabold mb-8 text-center text-gray-900 border-b pb-4">作業日報入力</h1>
        
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* 現場選択 */}
          <div className="bg-gray-50 p-6 rounded-xl border-2 border-gray-300 shadow-sm">
            <label className="block text-xl font-bold mb-3 text-gray-900">現場名 <span className="text-red-600">*</span></label>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="w-full border-2 border-gray-400 p-4 rounded-xl text-xl bg-white text-gray-900 font-bold focus:border-blue-600 focus:outline-none"
              required
            >
              <option value="">現場を選択してください</option>
              {locationsList.map((loc) => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>

          {/* 自社作業員選択 */}
          <div className="bg-gray-50 p-6 rounded-xl border-2 border-gray-300 shadow-sm">
            <label className="block text-xl font-bold mb-3 text-gray-900">自社作業員</label>
            <div className="grid grid-cols-2 gap-3 border-2 border-gray-400 p-4 rounded-xl max-h-60 overflow-y-auto bg-white">
              {workersList.map((w) => (
                <label key={w} className="flex items-center space-x-3 p-2 hover:bg-gray-100 rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedWorkers.includes(w)}
                    onChange={() => handleWorkerToggle(w)}
                    className="w-6 h-6 text-blue-600 rounded"
                  />
                  <span className="text-xl font-bold text-gray-800">{w}</span>
                </label>
              ))}
            </div>
          </div>

          {/* ① 外注・派遣作業員 */}
          <div className="bg-gray-50 p-6 rounded-xl border-2 border-gray-300 shadow-sm">
            <label className="block text-xl font-bold mb-3 text-gray-900">外注・派遣作業員</label>
            <div className="flex gap-3 mb-4">
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    addSubcontractorEntry(e.target.value);
                    e.target.value = '';
                  }
                }}
                className="w-full border-2 border-gray-400 p-4 rounded-xl text-xl bg-white text-gray-900 font-bold"
              >
                <option value="">外注会社を選択して追加</option>
                {subcontractorsList.map((sub) => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>
            <div className="space-y-3">
              {subcontractorEntries.map((sub) => (
                <div key={sub.name} className="flex items-center gap-3 bg-white p-4 rounded-xl border-2 border-gray-300 shadow-sm">
                  <span className="font-bold text-xl w-40 truncate text-gray-900">{sub.name}</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      placeholder="土工人数"
                      value={sub.doko}
                      onChange={(e) => updateSubcontractorCount(sub.name, 'doko', e.target.value)}
                      className="border-2 border-gray-400 p-3 w-28 rounded-xl text-xl text-center font-bold"
                    />
                    <span className="text-lg font-bold text-gray-800">名</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      placeholder="解体工人数"
                      value={sub.kaitai}
                      onChange={(e) => updateSubcontractorCount(sub.name, 'kaitai', e.target.value)}
                      className="border-2 border-gray-400 p-3 w-28 rounded-xl text-xl text-center font-bold"
                    />
                    <span className="text-lg font-bold text-gray-800">名</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeSubcontractorEntry(sub.name)}
                    className="text-red-600 font-extrabold text-2xl ml-auto px-4 py-1 hover:bg-red-50 rounded-lg"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* ③ 自社重機選択 */}
          <div className="bg-gray-50 p-6 rounded-xl border-2 border-gray-300 shadow-sm">
            <label className="block text-xl font-bold mb-3 text-gray-900">自社重機</label>
            <select
              value={selectedHeavyMachine}
              onChange={(e) => setSelectedHeavyMachine(e.target.value)}
              className="w-full border-2 border-gray-400 p-4 rounded-xl text-xl bg-white text-gray-900 font-bold"
            >
              <option value="">重機を選択（なしの場合は空欄）</option>
              {heavyMachinesList.map((hm) => (
                <option key={hm} value={hm}>{hm}</option>
              ))}
            </select>
          </div>

          {/* 車両・燃料関連 */}
          <div className="bg-gray-50 p-6 rounded-xl border-2 border-gray-300 shadow-sm space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xl font-bold mb-3 text-gray-900">車両</label>
                <select
                  value={selectedVehicle}
                  onChange={(e) => setSelectedVehicle(e.target.value)}
                  className="w-full border-2 border-gray-400 p-4 rounded-xl text-xl bg-white text-gray-900 font-bold"
                >
                  <option value="">車両を選択</option>
                  {vehiclesList.map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xl font-bold mb-3 text-gray-900">走行距離 (km)</label>
                <input
                  type="number"
                  value={distance}
                  onChange={(e) => setDistance(e.target.value)}
                  className="w-full border-2 border-gray-400 p-4 rounded-xl text-xl bg-white text-gray-900 font-bold"
                  placeholder="例: 50"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xl font-bold mb-3 text-gray-900">軽油 (L)</label>
                <input
                  type="number"
                  value={fuelLiters}
                  onChange={(e) => setFuelLiters(e.target.value)}
                  className="w-full border-2 border-gray-400 p-4 rounded-xl text-xl bg-white text-gray-900 font-bold"
                />
              </div>
              <div>
                <label className="block text-xl font-bold mb-3 text-gray-900">軽油金額 (円)</label>
                <input
                  type="number"
                  value={fuelCost}
                  onChange={(e) => setFuelCost(e.target.value)}
                  className="w-full border-2 border-gray-400 p-4 rounded-xl text-xl bg-white text-gray-900 font-bold"
                />
              </div>
              <div>
                <label className="block text-xl font-bold mb-3 text-gray-900">②レギュラー購入金額 (円)</label>
                <input
                  type="number"
                  value={regularGasCost}
                  onChange={(e) => setRegularGasCost(e.target.value)}
                  className="w-full border-2 border-gray-400 p-4 rounded-xl text-xl bg-white text-gray-900 font-bold"
                  placeholder="例: 3000"
                />
              </div>
            </div>
          </div>

          {/* ④ スクラップ項目 */}
          <div className="bg-gray-50 p-6 rounded-xl border-2 border-gray-300 shadow-sm">
            <label className="block text-xl font-bold mb-3 text-gray-900">スクラップ</label>
            <div className="flex gap-3 mb-4">
              <select
                onChange={(e) => {
                  addScrapEntry(e.target.value);
                  e.target.value = '';
                }}
                className="w-full border-2 border-gray-400 p-4 rounded-xl text-xl bg-white text-gray-900 font-bold"
              >
                <option value="">スクラップ場・品目を選択して追加</option>
                {scrapOptions.map((sc, idx) => (
                  <option key={idx} value={`${sc.location}:${sc.item}`}>
                    {sc.location} - {sc.item}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-3">
              {scrapEntries.map((sc, index) => (
                <div key={index} className="flex items-center gap-3 bg-white p-4 rounded-xl border-2 border-gray-300 shadow-sm">
                  <span className="font-bold text-lg w-48 truncate text-gray-900">{sc.location} / {sc.item}</span>
                  <input
                    type="text"
                    placeholder="金額または数量"
                    value={sc.value}
                    onChange={(e) => updateScrapValue(index, e.target.value)}
                    className="border-2 border-gray-400 p-3 flex-1 rounded-xl text-xl font-bold"
                  />
                  <button
                    type="button"
                    onClick={() => removeScrapEntry(index)}
                    className="text-red-600 font-extrabold text-2xl px-4 py-1 hover:bg-red-50 rounded-lg"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 業務内容 */}
          <div className="bg-gray-50 p-6 rounded-xl border-2 border-gray-300 shadow-sm">
            <label className="block text-xl font-bold mb-3 text-gray-900">業務内容・備考</label>
            <textarea
              value={workDescription}
              onChange={(e) => setWorkDescription(e.target.value)}
              className="w-full border-2 border-gray-400 p-4 rounded-xl text-xl bg-white text-gray-900 h-32 font-bold"
              placeholder="本日の作業内容を入力してください"
            ></textarea>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white font-extrabold text-2xl p-5 rounded-xl shadow-lg hover:bg-blue-700 transition"
          >
            日報を送信する
          </button>
        </form>
      </div>
    </div>
  );
}
