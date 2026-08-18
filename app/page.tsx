'use client';
import { useState, useEffect } from 'react';

export default function Home() {
  const [settings, setSettings] = useState<any>({});
  
  // 入力状態
  const [date, setDate] = useState(new Date().toLocaleDateString());
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
      body: JSON.stringify({ date, location, manager, workers, machine, vehicle, fuel, etc, disposals, scraps, workDescription: description, createdAt: new Date().toISOString() })
    });
    setStatus('success');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => setStatus('idle'), 3000);
  };

  return (
    <div className="p-4 max-w-xl mx-auto space-y-6 font-sans pb-20 bg-slate-50 min-h-screen">
      <h1 className="text-xl font-black bg-slate-900 text-white p-4 rounded-xl text-center shadow-lg">株式会社大和 - 日報入力</h1>
      
      {status === 'success' && <div className="bg-emerald-500 text-white p-4 rounded-xl font-bold text-center">送信しました！</div>}

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* 現場 */}
        <div className="bg-white p-4 rounded-2xl border shadow-sm">
           <div className="font-bold border-b-2 pb-1 mb-3 text-sm">📌 現場を選択</div>
           <div className="grid grid-cols-2 gap-2">
             {settings.locations?.map((l:string) => (
               <button type="button" key={l} onClick={() => setLocation(l)} className={`p-3 rounded-xl font-bold border-2 text-sm ${location === l ? 'bg-slate-800 text-white' : 'bg-slate-50'}`}>{l}</button>
             ))}
           </div>
        </div>

        {/* 責任者・作業員 */}
        <div className="bg-white p-4 rounded-2xl border shadow-sm">
           <div className="font-bold border-b-2 pb-1 mb-3 text-sm">👤 責任者 / 👥 作業員</div>
           <select value={manager} onChange={e=>setManager(e.target.value)} className="w-full p-3 border rounded-xl font-bold mb-3 text-sm">
             <option value="">責任者を選択</option>
             {settings.managers?.map((m:any) => <option key={m.name} value={m.name}>{m.name}</option>)}
           </select>
           <div className="grid grid-cols-2 gap-2">
             {settings.workers?.map((w:any) => (
               <button type="button" key={w.name} onClick={() => setWorkers(prev => prev.includes(w.name) ? prev.filter(i=>i!==w.name) : [...prev, w.name])}
               className={`p-3 rounded-xl font-bold border-2 text-sm ${workers.includes(w.name) ? 'bg-slate-800 text-white' : 'bg-slate-50'}`}>{w.name}</button>
             ))}
           </div>
        </div>

        {/* 車両・重機 */}
        <div className="bg-white p-4 rounded-2xl border shadow-sm grid grid-cols-1 gap-4">
           <div>
             <div className="font-bold border-b-2 pb-1 mb-3 text-sm">🚚 車両</div>
             <div className="grid grid-cols-2 gap-2">
               {settings.vehicles?.map((v:any) => (
                 <button type="button" key={v.name} onClick={() => setVehicle(v.name)} className={`p-2 rounded-xl font-bold border-2 text-sm ${vehicle === v.name ? 'bg-slate-800 text-white' : 'bg-slate-50'}`}>{v.name}</button>
               ))}
             </div>
           </div>
           <div>
             <div className="font-bold border-b-2 pb-1 mb-3 text-sm">🚜 重機</div>
             <div className="grid grid-cols-2 gap-2">
               {(settings.leases || []).concat(settings.companyMachines || []).map((m:any) => (
                 <button type="button" key={m.name} onClick={() => setMachine(m.name)} className={`p-2 rounded-xl font-bold border-2 text-sm ${machine === m.name ? 'bg-slate-800 text-white' : 'bg-slate-50'}`}>{m.name}</button>
               ))}
             </div>
           </div>
        </div>

        {/* 処分場 */}
        <div className="bg-white p-4 rounded-2xl border shadow-sm space-y-3">
           <div className="font-bold border-b-2 pb-1 text-sm">🗑️ 処分場搬出</div>
           {disposals.map((entry, index) => (
              <div key={index} className="p-3 border rounded-xl bg-slate-50 flex flex-col gap-2">
                <select className="w-full p-2 rounded-lg border font-bold text-sm" value={`${entry.location}|${entry.item}`} onChange={(e) => {
                  const [loc, item] = e.target.value.split('|');
                  const target = settings.disposalLocations.find((d:any) => d.location === loc && d.item === item);
                  const updated = [...disposals];
                  updated[index] = { location: loc, item: item, quantity: entry.quantity, unit: target?.unit || 't' };
                  setDisposals(updated);
                }}>
                  <option value="|">処分場を選択...</option>
                  {settings.disposalLocations?.map((d:any, idx:number) => <option key={idx} value={`${d.location}|${d.item}`}>{d.location} ({d.item})</option>)}
                </select>
                <div className="flex items-center gap-2">
                  <input type="number" placeholder="数量" className="w-full p-2 rounded-lg border font-bold" value={entry.quantity} onChange={(e) => {
                    const updated = [...disposals]; updated[index].quantity = e.target.value; setDisposals(updated);
                  }}/>
                  <span className="font-bold text-sm">{entry.unit}</span>
                </div>
              </div>
           ))}
           <button type="button" onClick={() => setDisposals([...disposals, {location: '', item: '', quantity: '', unit: 't'}])} className="w-full bg-slate-700 text-white p-2 rounded-xl font-bold text-sm">＋ 処分を追加</button>
        </div>

        {/* 自由記述・送信 */}
        <textarea placeholder="作業内容を入力..." value={description} onChange={e => setDescription(e.target.value)} className="w-full p-4 rounded-2xl border shadow-sm h-24" />
        <button type="submit" className="w-full bg-[#E56312] text-white font-black text-2xl py-4 rounded-2xl shadow-lg">📩 送信する</button>
      </form>
    </div>
  );
}
