'client';
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

  // スクリプト/スクラップ入力
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
        <div className="bg-white p-8 rounded shadow text-center max-w-md w-full">
          <h1 className="text-2xl font-bold text-green-600 mb-4">日報を送信しました！</h1>
          <p className="text-gray-600 mb-6">お疲れ様でした。</p>
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
            className="bg-blue-600 text-white px-6 py-2 rounded font-bold w-full"
          >
            続けて入力する
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto bg-white p-6 rounded shadow">
        <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">作業日報入力</h1>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 現場選択 */}
          <div>
            <label className="block font-bold mb-2">現場名 <span className="text-red-500">*</span></label>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="w-full border p-3 rounded"
              required
            >
              <option value="">現場を選択してください</option>
              {locationsList.map((loc) => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>

          {/* 自社作業員選択 */}
          <div>
            <label className="block font-bold mb-2">自社作業員</label>
            <div className="grid grid-cols-2 gap-2 border p-3 rounded max-h-40 overflow-y-auto">
              {workersList.map((w) => (
                <label key={w} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedWorkers.includes(w)}
                    onChange={() => handleWorkerToggle(w)}
                    className="w-4 h-4"
                  />
                  <span>{w}</span>
                </label>
              ))}
            </div>
          </div>

          {/* ① 外注・派遣作業員 */}
          <div>
            <label className="block font-bold mb-2">外注・派遣作業員</label>
            <div className="flex gap-2 mb-2">
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    addSubcontractorEntry(e.target.value);
                    e.target.value = '';
                  }
                }}
                className="w-full border p-2 rounded"
              >
                <option value="">外注会社を選択して追加</option>
                {subcontractorsList.map((sub) => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              {subcontractorEntries.map((sub) => (
                <div key={sub.name} className="flex items-center gap-2 bg-gray-50 p-2 rounded border">
                  <span className="font-bold w-32 truncate">{sub.name}</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      placeholder="土工人数"
                      value={sub.doko}
                      onChange={(e) => updateSubcontractorCount(sub.name, 'doko', e.target.value)}
                      className="border p-1 w-20 rounded text-center"
                    />
                    <span className="text-sm">名</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      placeholder="解体工人数"
                      value={sub.kaitai}
                      onChange={(e) => updateSubcontractorCount(sub.name, 'kaitai', e.target.value)}
                      className="border p-1 w-20 rounded text-center"
                    />
                    <span className="text-sm">名</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeSubcontractorEntry(sub.name)}
                    className="text-red-500 font-bold ml-auto px-2"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* ③ 自社重機選択 */}
          <div>
            <label className="block font-bold mb-2">自社重機</label>
            <select
              value={selectedHeavyMachine}
              onChange={(e) => setSelectedHeavyMachine(e.target.value)}
              className="w-full border p-3 rounded"
            >
              <option value="">重機を選択（なしの場合は空欄）</option>
              {heavyMachinesList.map((hm) => (
                <option key={hm} value={hm}>{hm}</option>
              ))}
            </select>
          </div>

          {/* 車両・燃料関連 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold mb-2">車両</label>
              <select
                value={selectedVehicle}
                onChange={(e) => setSelectedVehicle(e.target.value)}
                className="w-full border p-3 rounded"
              >
                <option value="">車両を選択</option>
                {vehiclesList.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-bold mb-2">走行距離 (km)</label>
              <input
                type="number"
                value={distance}
                onChange={(e) => setDistance(e.target.value)}
                className="w-full border p-3 rounded"
                placeholder="例: 50"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block font-bold mb-2">軽油 (L)</label>
              <input
                type="number"
                value={fuelLiters}
                onChange={(e) => setFuelLiters(e.target.value)}
                className="w-full border p-3 rounded"
              />
            </div>
            <div>
              <label className="block font-bold mb-2">軽油金額 (円)</label>
              <input
                type="number"
                value={fuelCost}
                onChange={(e) => setFuelCost(e.target.value)}
                className="w-full border p-3 rounded"
              />
            </div>
            <div>
              <label className="block font-bold mb-2">②レギュラー購入金額 (円)</label>
              <input
                type="number"
                value={regularGasCost}
                onChange={(e) => setRegularGasCost(e.target.value)}
                className="w-full border p-3 rounded"
                placeholder="例: 3000"
              />
            </div>
          </div>

          {/* ④ スクラップ項目 */}
          <div>
            <label className="block font-bold mb-2">スクラップ</label>
            <div className="flex gap-2 mb-2">
              <select
                onChange={(e) => {
                  addScrapEntry(e.target.value);
                  e.target.value = '';
                }}
                className="w-full border p-2 rounded"
              >
                <option value="">スクラップ場・品目を選択して追加</option>
                {scrapOptions.map((sc, idx) => (
                  <option key={idx} value={`${sc.location}:${sc.item}`}>
                    {sc.location} - {sc.item}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              {scrapEntries.map((sc, index) => (
                <div key={index} className="flex items-center gap-2 bg-gray-50 p-2 rounded border">
                  <span className="font-bold text-sm w-40 truncate">{sc.location} / {sc.item}</span>
                  <input
                    type="text"
                    placeholder="金額または数量"
                    value={sc.value}
                    onChange={(e) => updateScrapValue(index, e.target.value)}
                    className="border p-1 flex-1 rounded"
                  />
                  <button
                    type="button"
                    onClick={() => removeScrapEntry(index)}
                    className="text-red-500 font-bold px-2"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 業務内容 */}
          <div>
            <label className="block font-bold mb-2">業務内容・備考</label>
            <textarea
              value={workDescription}
              onChange={(e) => setWorkDescription(e.target.value)}
              className="w-full border p-3 rounded h-24"
              placeholder="本日の作業内容を入力してください"
            ></textarea>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white font-bold p-3 rounded hover:bg-blue-700 transition"
          >
            日報を送信する
          </button>
        </form>
      </div>
    </div>
  );
}