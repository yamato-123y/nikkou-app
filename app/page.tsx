'use client';
import { useState, useEffect } from 'react';

export default function Home() {
  const [settings, setSettings] = useState<any>({});
  
  const [date, setDate] = useState('2026/08/18');
  const [location, setLocation] = useState('');
  const [manager, setManager] = useState('');
  const [workers, setWorkers] = useState<string[]>([]);
  const [machine, setMachine] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [fuel, setFuel] = useState('');
  const [etc, setEtc] = useState('');
  
  const [disposals, setDisposals] = useState<{location: string, item: string, quantity: string, unit: string}[]>([]);
  const [scraps, setScraps] = useState<{location: string, item: string, quantity: string, unit: string}[]>([]);
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'idle' | 'success'>('idle');

  useEffect(() => {
    fetch('/api/settings').then(res => res.json()).then(setSettings);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date, location, manager, workers, machine, vehicle, fuel: fuel || '0', etc: etc || '0', disposals, scraps, workDescription: description, createdAt: new Date().toISOString()
      })
    });
    setStatus('success');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setDisposals([]); setScraps([]); setDescription('');
    setTimeout(() => setStatus('idle'), 3000);
  };

  return (
    <div className="p-4 max-w-xl mx-auto space-y-4 font-sans pb-20 bg-slate-50 min-h-screen">
      <h1 className="text-xl font-black bg-slate-900 text-white p-4 rounded-xl text-center shadow-lg">株式会社大和 - 日報入力</h1>
      
      {status === 'success' && <div className="bg-emerald-500 text-white p-4 rounded-xl font-bold text-center">送信しました！</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 1. 現場 */}
        <div className="bg-white p-4 rounded-2xl border shadow-sm">
           <div className="font-bold border-b-2 pb-1 mb-3">📌 1. 現場を選択</div>
           <div className="grid grid-cols-2 gap-2">
             {settings.locations?.map((l:string) => (
               <button type="button" key={l} onClick={() => setLocation(l)} className={`p-3 rounded-xl font-bold border-2 ${location === l ? 'bg-slate-800 text-white' : 'bg-slate-50'}`}>{l}</button>
             ))}
           </div>
        </div>

        {/* 2. 責任者・作業員 */}
        <div className="bg-white p-4 rounded-2xl border shadow-sm">
           <div className="font-bold border-b-2 pb-1 mb-3">👤 2. 責任者 / 👥 作業員</div>
           <select value={manager} onChange={e=>setManager(e.target.value)} className="w-full p-3 border rounded-xl font-bold mb-2">
             <option value="">責任者を選択</option>
             {settings.managers?.map((m:any) => <option key={m.name} value={m.name}>{m.name}</option>)}
           </select>
           <div className="grid grid-cols-2 gap-2">
             {settings.workers?.map((w:any) => (
               <button type="button" key={w.name} onClick={() => setWorkers(prev => prev.includes(w.name) ? prev.filter(i=>i!==w.name) : [...prev, w.name])}
               className={`p-3 rounded-xl font-bold border-2 ${workers.includes(w.name) ? 'bg-slate-800 text-white' : 'bg-slate-50'}`}>{w.name}</button>
             ))}
           </div>
        </div>

        {/* 3. リース・重機 */}
        <div className="bg-white p-4 rounded-2xl border shadow-sm">
           <div className="font-bold border-b-2 pb-1 mb-3">🚜 3. リース・重機を選択</div>
           <div className="grid grid-cols-2 gap-2">
             {settings.leases?.map((m:any) => (
               <button type="button" key={m.name} onClick={() => setMachine(m.name)} className={`p-3 rounded-xl font-bold border-2 ${machine === m.name ? 'bg-slate-800 text-white' : 'bg-slate-50'}`}>{m.name}</button>
             ))}
           </div>
        </div>

        {/* 4. 処分場のガラ搬出 */}
        <div className="bg-white p-4 rounded-2xl border shadow-sm space-y-3">
           <div className="font-bold border-b-2 pb-1">🗑️ 4. 処分場のガラ搬出</div>
           {disposals.map((entry, index) => (
              <div key={index} className="p-3 border rounded-xl bg-slate-50 space-y-2">
                <select className="w-full p-2 rounded-xl border font-bold" value={`${entry.location}|${entry.item}`} onChange={(e) => {
                  const [loc, item] = e.target.value.split('|');
                  const target = settings.disposalLocations.find((d:any) => d.location === loc && d.item === item);
                  const updated = [...disposals];
                  updated[index] = { location: loc, item: item, quantity: entry.quantity, unit: target?.unit || 't' };
                  setDisposals(updated);
                }}>
                  <option value="|">処分場を選択...</option>
                  {settings.disposalLocations?.map((d:any, idx:number) => <option key={idx} value={`${d.location}|${d.item}`}>{d.location} - {d.item} ({d.unit || 't'})</option>)}
                </select>
                <div className="flex items-center gap-2">
                  <input type="number" placeholder="0" className="w-24 p-2 rounded-xl border font-bold" value={entry.quantity} onChange={(e) => {
                    const updated = [...disposals]; updated[index].quantity = e.target.value; setDisposals(updated);
                  }}/>
                  <span className="font-bold">{entry.unit || 't'}</span>
                </div>
              </div>
           ))}
           <button type="button" onClick={() => setDisposals([...disposals, {location: '', item: '', quantity: '', unit: 't'}])} className="w-full bg-slate-700 text-white p-3 rounded-xl font-bold">＋ 処分を追加</button>
        </div>

        {/* 作業内容 */}
        <div className="bg-white p-4 rounded-2xl border shadow-sm">
          <div className="font-bold border-b-2 pb-1 mb-3">📝 5. 作業内容</div>
          <textarea placeholder="作業内容を入力..." value={description} onChange={e => setDescription(e.target.value)} className="w-full p-3 rounded-xl border h-24" />
        </div>

        <button type="submit" className="w-full bg-[#E56312] text-white font-black text-2xl py-4 rounded-2xl shadow-lg">📩 送信する</button>
      </form>
    </div>
  );
}
