'use client';
import { useState, useEffect } from 'react';

export default function Home() {
  const [date, setDate] = useState('2026/08/18');
  const [locationsList, setLocationsList] = useState<string[]>([]);
  const [managersList, setManagersList] = useState<any[]>([]);
  const [workersList, setWorkersList] = useState<any[]>([]);
  const [leasesList, setLeasesList] = useState<any[]>([]);
  const [companyMachinesList, setCompanyMachinesList] = useState<any[]>([]);
  const [vehiclesList, setVehiclesList] = useState<string[]>([]);
  const [scrapOptions, setScrapOptions] = useState<any[]>([]);

  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedManager, setSelectedManager] = useState('');
  const [selectedWorkers, setSelectedWorkers] = useState<string[]>([]);
  const [selectedMachine, setSelectedMachine] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState('');
  
  const [fuelLiters, setFuelLiters] = useState('0');
  const [etcCost, setEtcCost] = useState('0');
  const [disposalEntries, setDisposalEntries] = useState<{ location: string; item: string; unit: string; quantity: string }[]>([]);
  const [workDescription, setWorkDescription] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const loadSettingsFromServer = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setLocationsList(data.locations || []);
        setManagersList(data.managers || []);
        setWorkersList(data.workers || []);
        setLeasesList(data.leases || []);
        setCompanyMachinesList(data.companyMachines || []);
        setVehiclesList(data.vehicles || []);
        setScrapOptions(data.scrapLocations || []);
      }
    } catch (e) { console.error(e); }
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
      date, location: selectedLocation, manager: selectedManager, workers: selectedWorkers.join(', '),
      machine: selectedMachine, vehicle: selectedVehicle, fuelLiters, etcCost,
      disposals: disposalEntries, workDescription, photo, createdAt: new Date().toISOString()
    };
    try {
      await fetch('/api/reports', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newReport) });
      setSubmitted(true);
    } catch (e) { alert("送信失敗"); }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-200 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl text-center w-full max-w-md">
          <h1 className="text-2xl font-bold text-orange-600 mb-4">送信しました！</h1>
          <button onClick={() => { setSubmitted(false); setPhoto(null); }} className="bg-orange-600 text-white px-6 py-3 rounded-xl font-bold w-full">続けて入力</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-200 py-6 px-4 font-sans">
      <div className="max-w-xl mx-auto space-y-4">
        <div className="bg-[#111827] text-white p-4 rounded-2xl text-center font-extrabold text-xl">株式会社大和 - 日報入力</div>
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* 1. 日付と現場 */}
          <div className="bg-white p-5 rounded-2xl border space-y-3">
            <div className="text-orange-600 font-bold border-b-2 border-orange-600 pb-1">📌 1. 日付と現場</div>
            <input type="text" value={date} onChange={e=>setDate(e.target.value)} className="w-full p-3 rounded-xl bg-slate-50 border font-bold text-center"/>
            <select value={selectedLocation} onChange={e=>setSelectedLocation(e.target.value)} className="w-full p-3 rounded-xl border font-bold">
              <option value="">現場を選択</option>
              {locationsList.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            <select value={selectedManager} onChange={e=>setSelectedManager(e.target.value)} className="w-full p-3 rounded-xl border font-bold">
              <option value="">責任者を選択</option>
              {managersList.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}
            </select>
          </div>

          {/* 2. 作業員 */}
          <div className="bg-white p-5 rounded-2xl border space-y-3">
            <div className="text-orange-600 font-bold border-b-2 border-orange-600 pb-1">👥 2. 作業員</div>
            <div className="grid grid-cols-2 gap-2">
              {workersList.map(w => (
                <button type="button" key={w.name} onClick={() => setSelectedWorkers(prev => prev.includes(w.name) ? prev.filter(i=>i!==w.name) : [...prev, w.name])}
                className={`p-3 rounded-xl font-bold border-2 ${selectedWorkers.includes(w.name) ? 'bg-orange-50 border-orange-600' : 'bg-slate-50'}`}>{w.name}</button>
              ))}
            </div>
          </div>

          {/* 3. 重機・車両 */}
          <div className="bg-white p-5 rounded-2xl border space-y-3">
            <div className="text-orange-600 font-bold border-b-2 border-orange-600 pb-1">🚜 3. 重機・車両</div>
            <select value={selectedMachine} onChange={e=>setSelectedMachine(e.target.value)} className="w-full p-3 rounded-xl border font-bold">
              <option value="">重機を選択</option>
              <optgroup label="リース重機">{leasesList.map(l => <option key={l.name} value={l.name}>{l.name}</option>)}</optgroup>
              <optgroup label="自社重機">{companyMachinesList.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}</optgroup>
            </select>
            <select value={selectedVehicle} onChange={e=>setSelectedVehicle(e.target.value)} className="w-full p-3 rounded-xl border font-bold">
              <option value="">車両を選択</option>
              {vehiclesList.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>

          {/* 燃料・ETC */}
          <div className="bg-white p-5 rounded-2xl border flex gap-4">
            <div className="w-1/2">
                <label className="text-xs font-bold text-slate-500">軽油(L)</label>
                <input type="number" value={fuelLiters} onChange={e=>setFuelLiters(e.target.value)} className="w-full p-3 bg-slate-50 border rounded-xl font-bold"/>
            </div>
            <div className="w-1/2">
                <label className="text-xs font-bold text-slate-500">ETC(円)</label>
                <input type="number" value={etcCost} onChange={e=>setEtcCost(e.target.value)} className="w-full p-3 bg-slate-50 border rounded-xl font-bold"/>
            </div>
          </div>

          {/* 4. 処分場 */}
          <div className="bg-white p-5 rounded-2xl border space-y-3">
             <div className="text-orange-600 font-bold border-b-2 border-orange-600 pb-1">🗑️ 4. 処分場</div>
             {disposalEntries.map((entry, index) => (
                <div key={index} className="p-2 border rounded-xl bg-slate-50">
                  <select className="w-full p-2 rounded-xl mb-1 border" value={`${entry.location}|${entry.item}`} 
                  onChange={(e) => {
                    const [loc, item] = e.target.value.split('|');
                    const updated = [...disposalEntries];
                    updated[index] = { location: loc, item: item, unit: 't', quantity: entry.quantity };
                    setDisposalEntries(updated);
                  }}>
                    <option value="|">場所と品目を選択...</option>
                    {scrapOptions.map((sc, idx) => <option key={idx} value={`${sc.location}|${sc.item}`}>{sc.location} - {sc.item}</option>)}
                  </select>
                  <input type="number" placeholder="数量(t)" className="w-full p-2 rounded-xl border" value={entry.quantity} onChange={(e) => {
                    const updated = [...disposalEntries];
                    updated[index].quantity = e.target.value;
                    setDisposalEntries(updated);
                  }}/>
                </div>
             ))}
             <button type="button" onClick={() => setDisposalEntries([...disposalEntries, { location: '', item: '', unit: 't', quantity: '' }])} className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold">＋ 追加</button>
          </div>

          <textarea value={workDescription} onChange={e=>setWorkDescription(e.target.value)} placeholder="作業内容" className="w-full p-4 rounded-2xl border h-24 font-bold"/>
          <input type="file" accept="image/*" onChange={handlePhotoUpload} className="w-full"/>
          <button type="submit" className="w-full bg-orange-600 text-white font-black text-2xl py-4 rounded-2xl shadow-lg">📩 送信する</button>
        </form>
      </div>
    </div>
  );
}
