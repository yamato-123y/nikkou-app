'use client';
import { useState, useEffect } from 'react';

export default function Home() {
  const [date, setDate] = useState('2026/08/18');
  const [settings, setSettings] = useState<any>({});
  
  // 入力状態
  const [location, setLocation] = useState('');
  const [manager, setManager] = useState('');
  const [workers, setWorkers] = useState<string[]>([]);
  const [lease, setLease] = useState('');
  const [machine, setMachine] = useState(''); // 自社重機用
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
        date, location, manager, workers, lease, machine, vehicle, fuel, etc, disposals, workDescription: description, photo, createdAt: new Date().toISOString()
      })
    });
    setSubmitted(true);
  };

  if (submitted) return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl text-center">
        <h1 className="text-2xl font-black text-orange-600 mb-4">送信しました！</h1>
        <button onClick={() => window.location.reload()} className="bg-slate-800 text-white px-8 py-3 rounded-xl font-bold">戻る</button>
      </div>
    </div>
  );

  return (
    <div className="p-4 max-w-xl mx-auto space-y-4 font-sans pb-20">
      <h1 className="text-xl font-black bg-slate-900 text-white p-4 rounded-xl text-center">株式会社大和 - 日報入力</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* 1. 現場・責任者 */}
        <div className="bg-white p-4 rounded-2xl border space-y-2">
           <div className="font-bold border-b pb-1 text-orange-600">📌 1. 現場と責任者</div>
           <input type="text" value={date} onChange={e=>setDate(e.target.value)} className="w-full p-3 border rounded-xl font-bold text-center"/>
           <select onChange={e=>setLocation(e.target.value)} className="w-full p-3 border rounded-xl font-bold">
             <option value="">現場を選択</option>
             {settings.locations?.map((l:string) => <option key={l} value={l}>{l}</option>)}
           </select>
           <select onChange={e=>setManager(e.target.value)} className="w-full p-3 border rounded-xl font-bold">
             <option value="">責任者を選択</option>
             {settings.managers?.map((m:any) => <option key={m.name} value={m.name}>{m.name}</option>)}
           </select>
        </div>

        {/* 2. 作業員 */}
        <div className="bg-white p-4 rounded-2xl border">
           <div className="font-bold border-b pb-1 text-orange-600 mb-2">👥 2. 作業員</div>
           <div className="grid grid-cols-2 gap-2">
             {settings.workers?.map((w:any) => (
               <button type="button" key={w.name} onClick={() => setWorkers(prev => prev.includes(w.name) ? prev.filter(i=>i!==w.name) : [...prev, w.name])}
               className={`p-3 rounded-xl font-bold border-2 ${workers.includes(w.name) ? 'bg-orange-100 border-orange-500' : 'bg-slate-50'}`}>{w.name}</button>
             ))}
           </div>
        </div>

        {/* 3. 重機・車両 */}
        <div className="bg-white p-4 rounded-2xl border space-y-2">
           <div className="font-bold border-b pb-1 text-orange-600">🚜 3. 重機・車両</div>
           <select onChange={e=>setLease(e.target.value)} className="w-full p-3 border rounded-xl font-bold">
             <option value="">リース重機を選択</option>
             {settings.leases?.map((l:any) => <option key={l.name} value={l.name}>{l.name}</option>)}
           </select>
           <select onChange={e=>setMachine(e.target.value)} className="w-full p-3 border rounded-xl font-bold">
             <option value="">自社重機を選択</option>
             {settings.companyMachines?.map((m:any) => <option key={m.name} value={m.name}>{m.name}</option>)}
           </select>
        </div>

        {/* 4. 燃料・ETC */}
        <div className="bg-white p-4 rounded-2xl border flex gap-2">
           <input type="number" placeholder="軽油(L)" onChange={e=>setFuel(e.target.value)} className="w-1/2 p-3 border rounded-xl"/>
           <input type="number" placeholder="ETC(円)" onChange={e=>setEtc(e.target.value)} className="w-1/2 p-3 border rounded-xl"/>
        </div>

        {/* 5. 処分場 */}
        <button type="button" onClick={() => setDisposals([...disposals, {location:'', item:'', quantity:''}])} className="w-full bg-emerald-600 text-white p-3 rounded-xl font-bold">＋ 処分場を追加</button>

        <textarea onChange={e=>setDescription(e.target.value)} placeholder="作業内容" className="w-full p-4 rounded-2xl border h-24"/>
        <button type="submit" className="w-full bg-orange-600 text-white p-4 rounded-2xl font-black text-xl shadow-lg">日報を送信する</button>
      </form>
    </div>
  );
}
