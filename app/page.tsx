'use client';
import { useState, useEffect } from 'react';

export default function Home() {
  const [date, setDate] = useState('2026/08/18');
  
  // マスタデータ
  const [locationsList, setLocationsList] = useState<string[]>([]);
  const [leasesList, setLeasesList] = useState<any[]>([]);
  const [scrapOptions, setScrapOptions] = useState<any[]>([]);
  const [managersList, setManagersList] = useState<any[]>([]);
  const [workersList, setWorkersList] = useState<any[]>([]);
  const [vehiclesList, setVehiclesList] = useState<string[]>([]);

  // 選択中の状態
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedManagers, setSelectedManagers] = useState<string[]>([]);
  const [selectedWorkers, setSelectedWorkers] = useState<string[]>([]);
  const [selectedLeases, setSelectedLeases] = useState<string[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [disposalEntries, setDisposalEntries] = useState<{ location: string; item: string; unit: string; quantity: string }[]>([]);
  const [workDescription, setWorkDescription] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const loadSettingsFromServer = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data === 'object') {
          if (Array.isArray(data.locations)) setLocationsList(data.locations);
          if (Array.isArray(data.leases)) setLeasesList(data.leases);
          if (Array.isArray(data.scrapLocations)) setScrapOptions(data.scrapLocations);
          if (Array.isArray(data.managers)) setManagersList(data.managers);
          if (Array.isArray(data.workers)) setWorkersList(data.workers);
          if (Array.isArray(data.vehicles)) setVehiclesList(data.vehicles);
        }
      }
    } catch (e) { console.error("設定取得エラー:", e); }
  };

  useEffect(() => { loadSettingsFromServer(); }, []);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPhoto(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newReport = {
      date, locations: selectedLocations, managers: selectedManagers, workers: selectedWorkers,
      vehicle: selectedVehicle, leases: selectedLeases, disposals: disposalEntries,
      workDescription, photo, createdAt: new Date().toISOString()
    };
    try {
      await fetch('/api/reports', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newReport) });
      setSubmitted(true);
    } catch (e) { alert("送信に失敗しました"); }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-200 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl text-center w-full">
          <h1 className="text-2xl font-bold text-orange-600 mb-4">日報を送信しました！</h1>
          <button onClick={() => { setSubmitted(false); setPhoto(null); loadSettingsFromServer(); }} className="bg-orange-600 text-white px-6 py-3 rounded-xl font-bold w-full">続けて入力する</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-200 py-6 px-4 font-sans text-slate-800">
      <div className="max-w-xl mx-auto space-y-4">
        <div className="bg-[#111827] text-white p-4 rounded-2xl shadow-md text-center">
          <div className="text-xl font-extrabold">株式会社大和 - 日報入力</div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* 現場・担当者・メンバー（ボタン式） */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-3">
            <div className="text-slate-900 font-bold text-lg border-b-2 border-orange-600 pb-2">📍 現場の選択</div>
            {locationsList.map(loc => (
              <button type="button" key={loc} onClick={() => setSelectedLocations(prev => prev.includes(loc) ? prev.filter(i=>i!==loc) : [...prev, loc])} 
              className={`w-full p-4 rounded-xl font-bold border-2 ${selectedLocations.includes(loc) ? 'bg-orange-50 border-orange-600 text-orange-900' : 'bg-slate-50 border-slate-200'}`}>
                {loc} {selectedLocations.includes(loc) && '✓'}
              </button>
            ))}
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-3">
             <div className="text-slate-900 font-bold text-lg border-b-2 border-orange-600 pb-2">👤 責任者 / 👥 作業メンバー</div>
             <div className="grid grid-cols-2 gap-2">
                {managersList.map(m => (
                  <button type="button" key={m.name} onClick={() => setSelectedManagers(prev => prev.includes(m.name) ? prev.filter(i=>i!==m.name) : [...prev, m.name])}
                  className={`p-3 rounded-xl font-bold border-2 ${selectedManagers.includes(m.name) ? 'bg-orange-50 border-orange-600' : 'bg-slate-50'}`}>{m.name}</button>
                ))}
             </div>
          </div>

          {/* スクラップ・処分場搬出 */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-3">
             <div className="text-slate-900 font-bold text-lg border-b-2 border-orange-600 pb-2">🗑️ スクラップ・処分場搬出</div>
             {disposalEntries.map((entry, index) => (
                <div key={index} className="p-3 border rounded-xl bg-slate-50">
                  <select className="w-full p-3 rounded-xl mb-2" value={`${entry.location}|${entry.item}`} 
                  onChange={(e) => {
                    const [loc, item] = e.target.value.split('|');
                    const updated = [...disposalEntries];
                    updated[index] = { location: loc, item: item, unit: 't', quantity: entry.quantity };
                    setDisposalEntries(updated);
                  }}>
                    <option value="|">場所と品目を選択...</option>
                    {scrapOptions.map((sc, idx) => <option key={idx} value={`${sc.location}|${sc.item}`}>{sc.location} - {sc.item}</option>)}
                  </select>
                  <input type="number" placeholder="数量(t)" className="w-full p-3 rounded-xl border" value={entry.quantity} onChange={(e) => {
                    const updated = [...disposalEntries];
                    updated[index].quantity = e.target.value;
                    setDisposalEntries(updated);
                  }}/>
                </div>
             ))}
             <button type="button" onClick={() => setDisposalEntries([...disposalEntries, { location: '', item: '', unit: 't', quantity: '' }])} className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold">＋ 追加</button>
          </div>

          {/* 写真アップロード */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
             <label className="block font-bold mb-2">📷 現場写真</label>
             <input type="file" accept="image/*" onChange={handlePhotoUpload} className="w-full" />
             {photo && <img src={photo} className="mt-2 w-full rounded-xl" />}
          </div>

          <button type="submit" className="w-full bg-orange-600 text-white font-black text-2xl py-4 rounded-2xl">📩 送信する</button>
        </form>
      </div>
    </div>
  );
}
