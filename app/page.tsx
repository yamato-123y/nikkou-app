'use client';
import { useState, useEffect } from 'react';

export default function Home() {
  const [locations, setLocations] = useState<string[]>([]);
  const [managers, setManagers] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [leases, setLeases] = useState<any[]>([]);
  const [companyMachines, setCompanyMachines] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [disposalLocations, setDisposalLocations] = useState<any[]>([]);
  const [scrapLocations, setScrapLocations] = useState<any[]>([]);
  
  const [date, setDate] = useState('2026/08/18');
  const [location, setLocation] = useState('');
  const [manager, setManager] = useState('');
  const [selectedWorkers, setSelectedWorkers] = useState<string[]>([]);
  const [machine, setMachine] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [fuel, setFuel] = useState('0');
  const [etcPrice, setEtcPrice] = useState('0');
  
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
        // どんな形式で保存されていても安全に配列に変換する
        if (Array.isArray(data.locations)) {
          setLocations(data.locations.map((l: any) => typeof l === 'string' ? l : (l.name || '')));
        }
        if (Array.isArray(data.managers)) setManagers(data.managers);
        if (Array.isArray(data.workers)) setWorkers(data.workers);
        if (Array.isArray(data.leases)) setLeases(data.leases);
        if (Array.isArray(data.companyMachines)) setCompanyMachines(data.companyMachines);
        if (Array.isArray(data.vehicles)) setVehicles(data.vehicles);
        if (Array.isArray(data.disposalLocations)) setDisposalLocations(data.disposalLocations);
        if (Array.isArray(data.scrapLocations)) setScrapLocations(data.scrapLocations);
      })
      .catch(err => console.error(err));
  }, []);

  const handleCopyPrevious = (type: string) => {
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

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        setPhoto(uploadEvent.target?.result as string);
      };
      reader.readAsDataURL(e.target.files[0]);
    }
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
    setFuel('0'); setEtcPrice('0'); setOtherItem(''); setOtherPrice('');
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
        
        {/* 1. 日付と現場の選択 */}
        <div className="bg-white p-4 rounded-2xl border shadow-sm space-y-3">
           <div className="font-bold border-b-2 pb-1 text-sm text-orange-600">📍 1. 日付と現場の選択</div>
           
           <div>
             <label className="text-xs font-bold text-slate-600">【日付】</label>
             <input type="text" value={date} onChange={e=>setDate(e.target.value)} className="w-full p-3 border rounded-xl font-black bg-slate-100 text-center text-base mt-1" />
           </div>

           <div>
             <label className="text-xs font-bold text-slate-600">【現場名】</label>
             <select value={location} onChange={e=>setLocation(e.target.value)} className="w-full p-3 border rounded-xl font-bold bg-white mt-1">
               <option value="">現場を選択してください</option>
               {locations.map((l)=><option key={l} value={l}>{l}</option>)}
             </select>
           </div>

           <div>
             <label className="text-xs font-bold text-slate-600">【現場責任者】</label>
             <select value={manager} onChange={e=>setManager(e.target.value)} className="w-full p-3 border rounded-xl font-bold bg-white mt-1">
               <option value="">責任者を選択してください</option>
               {managers.map((m:any)=><option key={m.name || m} value={m.name || m}>{m.name || m}</option>)}
             </select>
           </div>
        </div>

        {/* 2. 作業員 */}
        <div className="bg-white p-4 rounded-2xl border shadow-sm space-y-3">
           <div className="flex justify-between items-center border-b-2 pb-1">
             <span className="font-bold text-sm text-orange-600">👥 2. 作業員</span>
             <button type="button" onClick={() => handleCopyPrevious('workers')} className="bg-[#0066cc] text-white text-xs px-3 py-1 rounded-lg font-bold shadow">🔄 昨日と同じ</button>
           </div>
           <div className="grid grid-cols-2 gap-2 pt-1">
             {workers.map((w:any) => {
               const wName = w.name || w;
               return (
                 <button type="button" key={wName} onClick={() => setSelectedWorkers(prev => prev.includes(wName) ? prev.filter(i=>i!==wName) : [...prev, wName])}
                 className={`p-3 rounded-xl font-bold border-2 text-sm transition ${selectedWorkers.includes(wName) ? 'bg-slate-800 text-white border-slate-800' : 'bg-slate-50 text-slate-700'}`}>{wName}</button>
               );
             })}
           </div>
        </div>

        {/* 3. 重機・車両 */}
        <div className="bg-white p-4 rounded-2xl border shadow-sm space-y-3">
           <div className="flex justify-between items-center border-b-2 pb-1">
             <span className="font-bold text-sm text-orange-600">🚜 3. 重機・車両</span>
             <button type="button" onClick={() => handleCopyPrevious('machine')} className="bg-[#0066cc] text-white text-xs px-3 py-1 rounded-lg font-bold shadow">🔄 昨日と同じ</button>
           </div>
           <div className="space-y-2 pt-1">
             <label className="text-xs font-bold text-slate-500">重機（リース/自社）</label>
             <div className="grid grid-cols-2 gap-2">
               {leases.concat(companyMachines).map((m:any) => {
                 const mName = m.name || m;
                 return (
                   <button type="button" key={mName} onClick={() => setMachine(mName)} className={`p-2.5 rounded-xl font-bold border-2 text-xs ${machine === mName ? 'bg-slate-800 text-white' : 'bg-slate-50'}`}>{mName}</button>
                 );
               })}
             </div>
             <label className="text-xs font-bold text-slate-500 pt-2 block">自社車両</label>
             <div className="grid grid-cols-2 gap-2">
               {vehicles.map((v:any) => {
                 const vName = v.name || v;
                 return (
                   <button type="button" key={vName} onClick={() => setVehicle(vName)} className={`p-2.5 rounded-xl font-bold border-2 text-xs ${vehicle === vName ? 'bg-slate-800 text-white' : 'bg-slate-50'}`}>{vName}</button>
                 );
               })}
             </div>
           </div>
        </div>

        {/* 軽油 (L) */}
        <div className="bg-white p-4 rounded-2xl border shadow-sm space-y-2">
           <div className="flex justify-between items-center">
             <span className="font-bold text-sm">⛽ 軽油 (L)</span>
             <button type="button" onClick={() => handleCopyPrevious('fuel')} className="border border-blue-500 text-blue-600 text-xs px-2.5 py-1 rounded-lg font-bold">前日コピー</button>
           </div>
           <input type="number" value={fuel} onChange={e=>setFuel(e.target.value)} className="w-full p-3 border rounded-xl font-bold text-lg" />
        </div>

        {/* 高速代・ETC (円) */}
        <div className="bg-white p-4 rounded-2xl border shadow-sm space-y-2">
           <div className="flex justify-between items-center">
             <span className="font-bold text-sm">💳 高速代・ETC (円)</span>
             <button type="button" onClick={() => handleCopyPrevious('etc')} className="border border-blue-500 text-blue-600 text-xs px-2.5 py-1 rounded-lg font-bold">前日コピー</button>
           </div>
           <input type="number" value={etcPrice} onChange={e=>setEtcPrice(e.target.value)} className="w-full p-3 border rounded-xl font-bold text-lg" />
        </div>

        {/* 4. 処分場への搬出 */}
        <div className="bg-white p-4 rounded-2xl border shadow-sm space-y-3">
           <div className="flex justify-between items-center border-b-2 pb-1">
             <span className="font-bold text-sm text-orange-600">🗑️ 4. 処分場への搬出</span>
             <button type="button" onClick={() => setDisposals([...disposals, {location: '', item: '', quantity: '', unit: 't'}])} className="bg-emerald-600 text-white text-xs px-3 py-1.5 rounded-lg font-bold shadow">＋ 追加する</button>
           </div>
           {disposals.length === 0 ? (
             <p className="text-xs text-slate-400 py-1">搬出がある場合は「＋ 追加する」を押してください</p>
           ) : (
             disposals.map((entry, index) => (
               <div key={index} className="p-3 border rounded-xl bg-slate-50 space-y-2">
                 <select className="w-full p-2.5 rounded-lg border font-bold text-sm bg-white" value={`${entry.location}|${entry.item}`} onChange={(e) => {
                   const [loc, item] = e.target.value.split('|');
                   const target = disposalLocations.find((d:any) => d.location === loc && d.item === item);
                   const updated = [...disposals];
                   updated[index] = { location: loc, item: item, quantity: entry.quantity, unit: target?.unit || 't' };
                   setDisposals(updated);
                 }}>
                   <option value="|">処分場・品目を選択...</option>
                   {disposalLocations.map((d:any, idx:number)=><option key={idx} value={`${d.location}|${d.item}`}>{d.location} ({d.item})</option>)}
                 </select>
                 <div className="flex items-center gap-2">
                   <input type="number" placeholder="数量" className="w-full p-2.5 rounded-lg border font-bold bg-white" value={entry.quantity} onChange={(e)=>{
                     const updated = [...disposals]; updated[index].quantity = e.target.value; setDisposals(updated);
                   }}/>
                   <span className="font-bold text-sm shrink-0">{entry.unit || 't'}</span>
                   <button type="button" onClick={() => setDisposals(disposals.filter((_,i)=>i!==index))} className="text-red-500 font-bold text-xs p-1">削除</button>
                 </div>
               </div>
             ))
           )}
        </div>

        {/* 5. スクラップの搬出 */}
        <div className="bg-white p-4 rounded-2xl border shadow-sm space-y-3">
           <div className="flex justify-between items-center border-b-2 pb-1">
             <span className="font-bold text-sm text-orange-600">♻️ 5. スクラップの搬出</span>
             <button type="button" onClick={() => setScraps([...scraps, {location: '', item: '', quantity: '', unit: 't'}])} className="bg-emerald-600 text-white text-xs px-3 py-1.5 rounded-lg font-bold shadow">＋ 追加する</button>
           </div>
           {scraps.length === 0 ? (
             <p className="text-xs text-slate-400 py-1">スクラップ搬出がある場合は「＋ 追加する」を押してください</p>
           ) : (
             scraps.map((entry, index) => (
               <div key={index} className="p-3 border rounded-xl bg-slate-50 space-y-2">
                 <select className="w-full p-2.5 rounded-lg border font-bold text-sm bg-white" value={`${entry.location}|${entry.item}`} onChange={(e) => {
                   const [loc, item] = e.target.value.split('|');
                   const target = scrapLocations.find((s:any) => s.location === loc && s.item === item);
                   const updated = [...scraps];
                   updated[index] = { location: loc, item: item, quantity: entry.quantity, unit: target?.unit || 't' };
                   setScraps(updated);
                 }}>
                   <option value="|">スクラップ場・品目を選択...</option>
                   {scrapLocations.map((s:any, idx:number)=><option key={idx} value={`${s.location}|${s.item}`}>{s.location} ({s.item})</option>)}
                 </select>
                 <div className="flex items-center gap-2">
                   <input type="number" placeholder="数量" className="w-full p-2.5 rounded-lg border font-bold bg-white" value={entry.quantity} onChange={(e)=>{
                     const updated = [...scraps]; updated[index].quantity = e.target.value; setScraps(updated);
                   }}/>
                   <span className="font-bold text-sm shrink-0">{entry.unit || 't'}</span>
                   <button type="button" onClick={() => setScraps(scraps.filter((_,i)=>i!==index))} className="text-red-500 font-bold text-xs p-1">削除</button>
                 </div>
               </div>
             ))
           )}
        </div>

        {/* その他 雑費・消耗品等 */}
        <div className="bg-white p-4 rounded-2xl border shadow-sm space-y-3">
           <div className="font-bold border-b-2 pb-1 text-sm">📦 その他 雑費・消耗品等</div>
           <input type="text" placeholder="品名・内容 (例: 養生テープ)" value={otherItem} onChange={e=>setOtherItem(e.target.value)} className="w-full p-3 border rounded-xl font-bold text-sm bg-white" />
           <input type="number" placeholder="金額 (円)" value={otherPrice} onChange={e=>setOtherPrice(e.target.value)} className="w-full p-3 border rounded-xl font-bold text-sm bg-white" />
        </div>

        {/* 6. 本日の作業内容 */}
        <div className="bg-white p-4 rounded-2xl border shadow-sm space-y-3">
           <div className="flex justify-between items-center border-b-2 pb-1">
             <span className="font-bold text-sm text-orange-600">📝 6. 本日の作業内容</span>
             <button type="button" onClick={handleVoiceInput} className="bg-[#E56312] text-white text-xs px-3 py-1.5 rounded-lg font-bold shadow flex items-center gap-1">🎙️ 声で入力</button>
           </div>
           <textarea placeholder="【声で入力】ボタンを押して話すか、直接入力してください" value={description} onChange={e=>setDescription(e.target.value)} className="w-full p-3 rounded-xl border h-28 text-sm outline-none bg-slate-50" />
        </div>

        {/* 7. 現場写真添付 */}
        <div className="bg-white p-4 rounded-2xl border shadow-sm space-y-2">
           <div className="font-bold text-sm text-slate-700">📷 7. 現場写真添付 <span className="text-xs font-normal text-slate-400">(※無ければ飛ばしてOK)</span></div>
           <div className="border-2 border-dashed p-4 rounded-xl text-center bg-slate-50">
             <input type="file" accept="image/*" onChange={handlePhotoUpload} className="text-xs file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-200 file:text-slate-700 hover:file:bg-slate-300" />
             {photo && <p className="text-xs text-emerald-600 font-bold mt-2">✓ 写真が選択されました</p>}
           </div>
        </div>

        {/* 送信ボタン */}
        <button type="submit" className="w-full bg-[#E56312] text-white font-black text-xl py-4 rounded-2xl shadow-lg hover:bg-orange-700 transition">
          📩 日報を送信する
        </button>

      </form>
    </div>
  );
}
