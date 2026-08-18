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
  const [fuel, setFuel] = useState('');
  const [etc, setEtc] = useState('');
  const [disposals, setDisposals] = useState<{location: string, item: string, quantity: string}[]>([]);
  const [scraps, setScraps] = useState<{location: string, item: string, quantity: string}[]>([]);
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
    setTimeout(() => setStatus('idle'), 3000);
  };

  const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <div className="font-bold border-b-2 border-slate-800 pb-1 text-slate-800 mb-3 text-lg">{children}</div>
  );

  return (
    <div className="p-4 max-w-xl mx-auto space-y-4 font-sans pb-20 bg-slate-50 min-h-screen">
      <h1 className="text-xl font-black bg-slate-900 text-white p-4 rounded-xl text-center shadow-lg">株式会社大和 - 日報入力</h1>
      
      {status === 'success' && (
        <div className="bg-emerald-500 text-white p-4 rounded-xl font-bold text-center animate-bounce">送信しました！</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-white p-4 rounded-2xl border shadow-sm">
           <SectionTitle>📌 1. 現場を選択</SectionTitle>
           <div className="grid grid-cols-2 gap-2">
             {settings.locations?.map((l:string) => (
               <button type="button" key={l} onClick={() => setLocation(l)} 
               className={`p-3 rounded-xl font-bold border-2 transition ${location === l ? 'bg-slate-800 text-white border-slate-900' : 'bg-slate-50 border-slate-200'}`}>{l}</button>
             ))}
           </div>
        </div>

        {/* 車両を移動 */}
        <div className="bg-white p-4 rounded-2xl border shadow-sm space-y-3">
           <SectionTitle>🚚 2. 車両を選択</SectionTitle>
           <div className="grid grid-cols-2 gap-2">
             {settings.vehicles?.map((v:string) => (
               <button type="button" key={v} onClick={() => setVehicle(v)}
               className={`p-3 rounded-xl font-bold border-2 transition ${vehicle === v ? 'bg-slate-800 text-white border-slate-900' : 'bg-slate-50'}`}>{v}</button>
             ))}
           </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border shadow-sm space-y-3">
           <SectionTitle>👤 責任者 / 👥 作業員</SectionTitle>
           <select value={manager} onChange={e=>setManager(e.target.value)} className="w-full p-3 border rounded-xl font-bold bg-white">
             <option value="">責任者を選択</option>
             {settings.managers?.map((m:any) => <option key={m.name} value={m.name}>{m.name}</option>)}
           </select>
           <div className="grid grid-cols-2 gap-2">
             {settings.workers?.map((w:any) => (
               <button type="button" key={w.name} onClick={() => setWorkers(prev => prev.includes(w.name) ? prev.filter(i=>i!==w.name) : [...prev, w.name])}
               className={`p-3 rounded-xl font-bold border-2 transition ${workers.includes(w.name) ? 'bg-slate-800 text-white border-slate-900' : 'bg-slate-50'}`}>{w.name}</button>
             ))}
           </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border shadow-sm space-y-3">
           <SectionTitle>🚜 3. 重機を選択</SectionTitle>
           <div className="grid grid-cols-2 gap-2">
             {(settings.leases || []).concat(settings.companyMachines || []).map((m:any) => (
               <button type="button" key={m.name} onClick={() => setMachine(m.name)}
               className={`p-3 rounded-xl font-bold border-2 transition ${machine === m.name ? 'bg-slate-800 text-white border-slate-900' : 'bg-slate-50'}`}>{m.name}</button>
             ))}
           </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border shadow-sm flex gap-2">
           <div className="w-1/2">
             <label className="block text-xs font-bold text-slate-500 mb-1">⛽ 軽油 (L)</label>
             <input type="number" placeholder="0" value={fuel} onChange={e=>setFuel(e.target.value)} className="w-full p-3 border rounded-xl font-bold"/>
           </div>
           <div className="w-1/2">
             <label className="block text-xs font-bold text-slate-500 mb-1">💳 ETC (円)</label>
             <input type="number" placeholder="0" value={etc} onChange={e=>setEtc(e.target.value)} className="w-full p-3 border rounded-xl font-bold"/>
           </div>
        </div>

        {/* 処分場のガラ搬出 */}
        <div className="bg-white p-4 rounded-2xl border shadow-sm space-y-3">
           <SectionTitle>🗑️ 4. 処分場のガラ搬出</SectionTitle>
           {disposals.map((entry, index) => (
              <div key={index} className="p-3 border rounded-xl bg-slate-50 shadow-inner space-y-2">
                <div className="flex justify-between"><span className="text-xs font-bold">先 {index + 1}</span><button type="button" onClick={() => setDisposals(disposals.filter((_, i) => i !== index))} className="text-red-500 text-xs">削除</button></div>
                <select className="w-full p-2 rounded-xl border font-bold" value={`${entry.location}|${entry.item}`} onChange={(e) => {
                  const [loc, item] = e.target.value.split('|');
                  const updated = [...disposals];
                  updated[index] = { location: loc, item: item, quantity: entry.quantity };
                  setDisposals(updated);
                }}>
                  <option value="|">処分場を選択...</option>
                  {settings.disposalLocations?.map((d:any, idx:number) => <option key={idx} value={`${d.location}|${d.item}`}>{d.location} - {d.item}</option>)}
                </select>
                <div className="flex items-center gap-2">
                  <input type="number" placeholder="0" className="w-20 p-2 rounded-xl border font-bold" value={entry.quantity} onChange={(e) => {
                    const updated = [...disposals];
                    updated[index].quantity = e.target.value;
                    setDisposals(updated);
                  }}/>
                  <span className="font-bold">t</span>
                </div>
              </div>
           ))}
           <button type="button" onClick={() => setDisposals([...disposals, {location: '', item: '', quantity: ''}])} className="w-full bg-slate-700 text-white p-3 rounded-xl font-bold">＋ 処分を追加</button>
        </div>

        {/* スクラップ搬出 */}
        <div className="bg-white p-4 rounded-2xl border shadow-sm space-y-3">
           <SectionTitle>♻️ 5. スクラップ搬出</SectionTitle>
           {scraps.map((entry, index) => (
              <div key={index} className="p-3 border rounded-xl bg-slate-50 shadow-inner space-y-2">
                <div className="flex justify-between"><span className="text-xs font-bold">先 {index + 1}</span><button type="button" onClick={() => setScraps(scraps.filter((_, i) => i !== index))} className="text-red-500 text-xs">削除</button></div>
                <select className="w-full p-2 rounded-xl border font-bold" value={`${entry.location}|${entry.item}`} onChange={(e) => {
                  const [loc, item] = e.target.value.split('|');
                  const updated = [...scraps];
                  updated[index] = { location: loc, item: item, quantity: entry.quantity };
                  setScrap(updated);
                }}>
                  <option value="|">スクラップ場を選択...</option>
                  {settings.scrapLocations?.map((s:any, idx:number) => <option key={idx} value={`${s.location}|${s.item}`}>{s.location} - {s.item}</option>)}
                </select>
                <div className="flex items-center gap-2">
                  <input type="number" placeholder="0" className="w-20 p-2 rounded-xl border font-bold" value={entry.quantity} onChange={(e) => {
                    const updated = [...scraps];
                    updated[index].quantity = e.target.value;
                    setScraps(updated);
                  }}/>
                  <span className="font-bold">t</span>
                </div>
              </div>
           ))}
           <button type="button" onClick={() => setScraps([...scraps, {location: '', item: '', quantity: ''}])} className="w-full bg-slate-700 text-white p-3 rounded-xl font-bold">＋ スクラップを追加</button>
        </div>

        <textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="作業内容" className="w-full p-4 rounded-2xl border h-24 font-bold"/>
        <button type="submit" className="w-full bg-[#E56312] text-white font-black text-2xl py-4 rounded-2xl shadow-lg transition hover:bg-orange-700">📩 日報を送信する</button>
      </form>
    </div>
  );
}
