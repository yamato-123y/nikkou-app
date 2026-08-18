'use client';
import { useState, useEffect } from 'react';

export default function Home() {
  const [date, setDate] = useState('2026/08/18');
  const [settings, setSettings] = useState<any>({});
  
  const [location, setLocation] = useState('');
  const [manager, setManager] = useState('');
  const [workers, setWorkers] = useState<string[]>([]);
  const [machine, setMachine] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [fuel, setFuel] = useState('0');
  const [etc, setEtc] = useState('0');
  const [disposals, setDisposals] = useState<{location: string, item: string, quantity: string}[]>([]);
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetch('/api/settings').then(res => res.json()).then(setSettings);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date, location, manager, workers, machine, vehicle, fuel, etc, disposals, workDescription: description, photo, createdAt: new Date().toISOString()
      })
    });
    setSubmitted(true);
  };

  return (
    <div className="p-4 max-w-xl mx-auto space-y-4 font-sans pb-20 bg-slate-100 min-h-screen">
      <h1 className="text-xl font-black bg-slate-900 text-white p-4 rounded-xl text-center shadow-lg">株式会社大和 - 日報入力</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* 1. 現場名（一覧タップ選択） */}
        <div className="bg-white p-4 rounded-2xl border shadow-sm">
           <div className="font-bold border-b pb-1 text-orange-600 mb-2">📌 1. 現場を選択</div>
           <div className="grid grid-cols-2 gap-2">
             {settings.locations?.map((l:string) => (
               <button type="button" key={l} onClick={() => setLocation(l)} 
               className={`p-3 rounded-xl font-bold border-2 ${location === l ? 'bg-orange-500 text-white border-orange-600' : 'bg-slate-50 border-slate-200'}`}>{l}</button>
             ))}
           </div>
        </div>

        {/* 2. 責任者・作業員 */}
        <div className="bg-white p-4 rounded-2xl border shadow-sm space-y-2">
           <div className="font-bold border-b pb-1 text-orange-600">👤 責任者 / 👥 作業員</div>
           <select onChange={e=>setManager(e.target.value)} className="w-full p-3 border rounded-xl font-bold">
             <option value="">責任者を選択</option>
             {settings.managers?.map((m:any) => <option key={m.name} value={m.name}>{m.name}</option>)}
           </select>
           <div className="grid grid-cols-2 gap-2">
             {settings.workers?.map((w:any) => (
               <button type="button" key={w.name} onClick={() => setWorkers(prev => prev.includes(w.name) ? prev.filter(i=>i!==w.name) : [...prev, w.name])}
               className={`p-3 rounded-xl font-bold border-2 ${workers.includes(w.name) ? 'bg-orange-100 border-orange-500' : 'bg-slate-50'}`}>{w.name}</button>
             ))}
           </div>
        </div>

        {/* 3. 重機・車両（一覧タップ選択） */}
        <div className="bg-white p-4 rounded-2xl border shadow-sm space-y-3">
           <div className="font-bold border-b pb-1 text-orange-600">🚜 3. 重機・車両を選択</div>
           <div className="grid grid-cols-2 gap-2">
             {(settings.leases || []).concat(settings.companyMachines || []).map((m:any) => (
               <button type="button" key={m.name} onClick={() => setMachine(m.name)}
               className={`p-3 rounded-xl font-bold border-2 ${machine === m.name ? 'bg-blue-500 text-white border-blue-600' : 'bg-slate-50'}`}>{m.name}</button>
             ))}
           </div>
        </div>

        {/* 4. 処分場（修正済み追加ロジック） */}
        <div className="bg-white p-4 rounded-2xl border shadow-sm space-y-2">
           <div className="font-bold border-b pb-1 text-orange-600">🗑️ 4. 処分場・搬出</div>
           {disposals.map((entry, index) => (
              <div key={index} className="p-2 border rounded-xl bg-slate-50">
                <select className="w-full p-2 rounded-xl mb-1 border" value={`${entry.location}|${entry.item}`} 
                onChange={(e) => {
                  const [loc, item] = e.target.value.split('|');
                  const updated = [...disposals];
                  updated[index] = { location: loc, item: item, quantity: entry.quantity };
                  setDisposals(updated);
                }}>
                  <option value="|">処分場と品目を選択...</option>
                  {settings.scrapLocations?.map((sc:any, idx:number) => <option key={idx} value={`${sc.location}|${sc.item}`}>{sc.location} - {sc.item}</option>)}
                </select>
                <input type="number" placeholder="数量(t)" className="w-full p-2 rounded-xl border" value={entry.quantity} onChange={(e) => {
                  const updated = [...disposals];
                  updated[index].quantity = e.target.value;
                  setDisposals(updated);
                }}/>
              </div>
           ))}
           <button type="button" onClick={() => setDisposals([...disposals, {location: '', item: '', quantity: ''}])} className="w-full bg-emerald-600 text-white p-3 rounded-xl font-bold">＋ 追加する</button>
        </div>

        <button type="submit" className="w-full bg-orange-600 text-white font-black text-2xl py-4 rounded-2xl shadow-lg">📩 日報を送信する</button>
      </form>
    </div>
  );
}
