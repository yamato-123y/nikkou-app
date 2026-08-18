'use client';
import { useState, useEffect } from 'react';

export default function Home() {
  const [settings, setSettings] = useState<any>({});
  
  const [date, setDate] = useState('2026/08/18');
  const [location, setLocation] = useState('');
  const [manager, setManager] = useState('');
  const [selectedWorkers, setSelectedWorkers] = useState<string[]>([]);
  const [machine, setMachine] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [fuel, setFuel] = useState('');
  const [etcPrice, setEtcPrice] = useState('');
  
  const [otherItem, setOtherItem] = useState('');
  const [otherPrice, setOtherPrice] = useState('');
  
  const [disposals, setDisposals] = useState<{location: string, item: string, quantity: string, unit: string}[]>([]);
  const [scraps, setScraps] = useState<{location: string, item: string, quantity: string, unit: string}[]>([]);
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'success'>('idle');

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (!data) return;
        if (Array.isArray(data.locations)) {
          data.locations = data.locations.map((l: any) => typeof l === 'string' ? l : (l.name || ''));
        }
        setSettings(data || {});
      })
      .catch(err => console.error(err));
  }, []);

  const handleCopyPrevious = (type: string) => {
    // 簡易的な前日コピーロジック（実際にはlocalStorage等から取得可能）
    if (type === 'workers') setSelectedWorkers(['Aさん', 'Bさん']);
    if (type === 'machine') { setMachine('0.2ユンボ'); setVehicle('2tダンプ'); }
    if (type === 'fuel') setFuel('50');
    if (type === 'etc') setEtcPrice('1500');
  };

  const handleVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('お使いのブラウザは音声入力に対応していません。');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'ja-JP';
    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      setDescription(prev => prev ? prev + ' ' + text : text);
    };
    recognition.start();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date, location, manager, workers: selectedWorkers, machine, vehicle, 
        fuel: fuel || '0', etcPrice: etcPrice || '0', 
        otherItem, otherPrice: otherPrice || '0',
        disposals, scraps, workDescription: description, photo, 
        createdAt: new Date().toISOString()
      })
    });
    setStatus('success');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setDisposals([]); setScraps([]); setDescription(''); setPhoto(null);
    setFuel(''); setEtcPrice(''); setOtherItem(''); setOtherPrice('');
    setTimeout(() => setStatus('idle'), 3000);
  };

  return (
    <div className="p-4 max-w-xl mx-auto space-y-4 font-sans pb-20 bg-slate-100 min-h-screen text-slate-800">
      <div className="bg-[#10172a] text-white p-4 rounded-2xl text-center shadow-md">
        <h1 className="text-lg font-black">📱 現場日報入力</h1>
        <p className="text-xs text-slate-400">株式会社大和</p>
      </div>
      
      {status === 'success' && <div className="bg-emerald-500 text-white p-4 rounded-xl font-bold text-center shadow">日報を送信しました！</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 1. 日付と現場 */}
        <div className="bg-white p-4 rounded-2xl border shadow-sm space-y-3">
           <div className="font-bold border-b-2 pb-1 text-sm text-orange-600">📍 1. 日付と現場</div>
           <input type="text" value={date} onChange={e=>setDate(e.target.value)} className="w-full p-3 border rounded-xl font-black bg-slate-100 text-center text-base" />
           <select value={location} onChange={e=>setLocation(e.target.value)} className="w-full p-3 border rounded-xl font-bold bg-white">
             <option value="">現場名を選択</option>
             {settings.locations?.map((l:string)=><option key={l} value={l}>{l}</option>)}
           </select>
           <select value={manager} onChange={e=>setManager(e.target.value)} className="w-full p-3 border rounded-xl font-bold bg-white">
             <option value="">責任者を選択</option>
             {settings.managers?.map((m:any)=><option key={m.name} value={m.name}>{m.name}</option>)}
           </select>
        </div>

        {/* 2. 作業員 */}
        <div className="bg-white p-4 rounded-2xl border shadow-sm space-y-3">
           <div className="flex justify-between items-center border-b-2 pb-1">
             <span className="font-bold text-sm text-orange-600">👥 2. 作業員</span>
             <button type="button" onClick={() => handleCopyPrevious('workers')} className="bg-[#0066cc] text-white text-xs px-3 py-1 rounded-lg font-bold shadow">🔄 昨日と同じ</button>
           </div>
           <div className="grid grid-cols-2 gap-2">
             {settings.workers?.map((w:any) => (
               <button type="button" key={w.name} onClick={() => setSelectedWorkers(prev => prev.includes(w.name) ? prev.filter(i=>i!==w.name) : [...prev, w.name])}
               className={`p-3 rounded-xl font-bold border-2 text-sm transition ${selectedWorkers.includes(w.name) ? 'bg-slate-800 text-white' : 'bg-slate-50'}`}>{w.name}</button>
             ))}
           </div>
        </div>

        {/* 3. 重機・車両 */}
        <div className="bg-white p-4 rounded-2xl border shadow-sm space-y-3">
           <div className="flex justify-between items-center border-b-2 pb-1">
             <span className="font-bold text-sm text-orange-600">🚜 3. 重機・車両</span>
             <button type="button" onClick={() => handleCopyPrevious('machine')} className="bg-[#0066cc] text-white text-xs px-3 py-1 rounded-lg font-bold shadow">🔄 昨日と同じ</button>
           </div>
           <div className="grid grid-cols-2 gap-2">
             {(settings.leases || []).concat(settings.companyMachines || []).map((m:any) => (
               <button type="button" key={m.name} onClick={() => setMachine(m.name)} className={`p-2 rounded-xl font-bold border-2 text-xs ${machine === m.name ? 'bg-slate-800 text-white' : 'bg-slate-50'}`}>{m.name}</button>
             ))}
           </div>
           <div className="grid grid-cols-2 gap-2">
             {settings.vehicles?.map((v:any) => (
               <button type="button" key={v.name} onClick={() => setVehicle(v.name)} className={`p-2 rounded-xl font-bold border-2 text-xs ${vehicle === v.name ? 'bg-slate-800 text-white' : 'bg-slate-50'}`}>{v.name}</button>
             ))}
           </div>
        </div>

        {/* 燃料・ETC */}
        <div className="bg-white p-4 rounded-2xl border shadow-sm space-y-3">
           <div className="flex justify-between items-center"><span className="font-bold text-sm">⛽ 軽油 (L)</span><button type="button" onClick={() => handleCopyPrevious('fuel')} className="text-xs text-blue-600 font-bold">前日コピー</button></div>
           <input type="number" placeholder="0" value={fuel} onChange={e=>setFuel(e.target.value)} className="w-full p-3 border rounded-xl font-bold text-lg" />
           <div className="flex justify-between items-center"><span className="font-bold text-sm">💳 高速代・ETC (円)</span><button type="button" onClick={() => handleCopyPrevious('etc')} className="text-xs text-blue-600 font-bold">前日コピー</button></div>
           <input type="number" placeholder="0" value={etcPrice} onChange={e=>setEtcPrice(e.target.value)} className="w-full p-3 border rounded-xl font-bold text-lg" />
        </div>

        {/* 4. 処分場への搬出 */}
        <div className="bg-white p-4 rounded-2xl border shadow-sm">
           <div className="flex justify-between border-b-2 pb-1 mb-3"><span className="font-bold text-sm text-orange-600">🗑️ 4. 処分場への搬出</span><button type="button" onClick={() => setDisposals([...disposals, {location: '', item: '', quantity: '', unit: 't'}])} className="bg-emerald-600 text-white text-xs px-2 py-1 rounded-lg">＋ 追加</button></div>
           {disposals.map((d, i) => (
             <div key={i} className="flex gap-2 mb-2">
               <input placeholder="数量" className="w-full p-2 border rounded-lg" value={d.quantity} onChange={(e)=>{const u=[...disposals]; u[i].quantity=e.target.value; setDisposals(u);}} />
               <button onClick={()=>setDisposals(disposals.filter((_,idx)=>idx!==i))} className="text-red-500">削除</button>
             </div>
           ))}
        </div>

        {/* 5. スクラップの搬出 */}
        <div className="bg-white p-4 rounded-2xl border shadow-sm">
           <div className="flex justify-between border-b-2 pb-1 mb-3"><span className="font-bold text-sm text-orange-600">♻️ 5. スクラップの搬出</span><button type="button" onClick={() => setScraps([...scraps, {location: '', item: '', quantity: '', unit: 't'}])} className="bg-emerald-600 text-white text-xs px-2 py-1 rounded-lg">＋ 追加</button></div>
           {scraps.map((s, i) => (
             <div key={i} className="flex gap-2 mb-2">
               <input placeholder="数量" className="w-full p-2 border rounded-lg" value={s.quantity} onChange={(e)=>{const u=[...scraps]; u[i].quantity=e.target.value; setScraps(u);}} />
               <button onClick={()=>setScraps(scraps.filter((_,idx)=>idx!==i))} className="text-red-500">削除</button>
             </div>
           ))}
        </div>

        {/* 送信 */}
        <button type="submit" className="w-full bg-[#E56312] text-white font-black text-xl py-4 rounded-2xl shadow-lg">📩 日報を送信する</button>
      </form>
    </div>
  );
}
