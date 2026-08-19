'use client';
import { useState, useEffect } from 'react';

export default function Home() {
  const [settings, setSettings] = useState<any>({});
  
  const [date, setDate] = useState(() => new Date().toLocaleDateString('ja-JP').replace(/\//g, '/'));
  const [location, setLocation] = useState('');
  const [manager, setManager] = useState('');
  const [selectedWorkers, setSelectedWorkers] = useState<string[]>([]);
  
  // 複数選択用
  const [selectedMachines, setSelectedMachines] = useState<string[]>([]);
  const [selectedOwnMachines, setSelectedOwnMachines] = useState<string[]>([]);
  const [selectedVehicles, setSelectedVehicles] = useState<string[]>([]);
  
  const [fuel, setFuel] = useState('');
  const [etcPrice, setEtcPrice] = useState('');
  const [parkingPrice, setParkingPrice] = useState('');
  
  const [otherItem, setOtherItem] = useState('');
  const [otherPrice, setOtherPrice] = useState('');
  
  const [disposals, setDisposals] = useState<{location: string, item: string, quantity: string, unit: string}[]>([]);
  const [scraps, setScraps] = useState<{location: string, item: string, quantity: string, unit: string}[]>([]);
  const [description, setDescription] = useState('');
  
  // 送信完了ポップアップ用ステート
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => setSettings(data || {}))
      .catch(err => console.error(err));
  }, []);

  const toggleSelection = (list: string[], item: string, setter: Function) => {
    setter(list.includes(item) ? list.filter(i => i !== item) : [...list, item]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date, location, manager, workers: selectedWorkers, 
        machines: selectedMachines, ownMachines: selectedOwnMachines, vehicles: selectedVehicles, 
        fuel: fuel || '0', etcPrice: etcPrice || '0', parkingPrice: parkingPrice || '0',
        otherItem, otherPrice: otherPrice || '0',
        disposals, scraps, workDescription: description,
        createdAt: new Date().toISOString()
      })
    });
    
    // フォームリセット
    setSelectedWorkers([]); 
    setSelectedMachines([]); 
    setSelectedOwnMachines([]); 
    setSelectedVehicles([]);
    setFuel(''); setEtcPrice(''); setParkingPrice(''); setOtherItem(''); setOtherPrice('');
    setDisposals([]); setScraps([]); setDescription('');

    // 成功ポップアップを表示
    setShowSuccessModal(true);
  };

  const handleContinue = () => {
    setShowSuccessModal(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFinish = () => {
    setShowSuccessModal(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="p-4 max-w-xl mx-auto space-y-6 font-sans pb-28 bg-slate-100 min-h-screen text-slate-900 relative">
      
      {/* ヘッダー */}
      <div className="bg-[#0f172a] text-white p-5 rounded-3xl text-center shadow-lg">
        <h1 className="text-xl font-black">📱 現場日報入力</h1>
        <p className="text-sm text-slate-300 mt-1">株式会社大和</p>
      </div>
      
      {/* 送信完了ポップアップ（モーダル） */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-sm space-y-5 text-center border-2 border-slate-200">
            <div className="text-5xl">🎉</div>
            <h2 className="text-xl font-black text-slate-900">日報報告の送信が完了しました</h2>
            <p className="text-sm font-bold text-slate-600">続けて別の報告を入力しますか？</p>
            
            <div className="space-y-3 pt-2">
              <button 
                type="button" 
                onClick={handleContinue} 
                className="w-full bg-[#E56312] text-white py-4 rounded-2xl font-black text-base shadow-md hover:bg-orange-700 transition"
              >
                続けて報告する
              </button>
              <button 
                type="button" 
                onClick={handleFinish} 
                className="w-full bg-slate-200 text-slate-800 py-4 rounded-2xl font-black text-base hover:bg-slate-300 transition"
              >
                終了する
              </button>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* 1. 日付と現場の選択 */}
        <div className="bg-white p-6 rounded-3xl border-2 border-slate-300 shadow-sm space-y-4">
           <div className="font-black text-base text-orange-700 border-b-2 border-orange-200 pb-2">📍 1. 日付と現場の選択</div>
           
           <div>
             <label className="text-sm font-black text-slate-700 block mb-1">【日付】</label>
             <input type="text" value={date} onChange={e=>setDate(e.target.value)} className="w-full p-4 border-2 border-slate-300 rounded-2xl font-black bg-slate-50 text-center text-lg" />
           </div>

           <div>
             <label className="text-sm font-black text-slate-700 block mb-1">【現場名】</label>
             <select value={location} onChange={e=>setLocation(e.target.value)} className="w-full p-4 border-2 border-slate-300 rounded-2xl font-black text-base bg-white">
               <option value="">現場を選択してください</option>
               {(settings.locations || []).map((l:any)=>(
                 <option key={typeof l === 'string' ? l : l.name} value={typeof l === 'string' ? l : l.name}>
                   {typeof l === 'string' ? l : l.name}
                 </option>
               ))}
             </select>
           </div>

           <div>
             <label className="text-sm font-black text-slate-700 block mb-1">【現場責任者】</label>
             <select value={manager} onChange={e=>setManager(e.target.value)} className="w-full p-4 border-2 border-slate-300 rounded-2xl font-black text-base bg-white">
               <option value="">責任者を選択してください</option>
               {(settings.managers || []).map((m:any)=><option key={m.name} value={m.name}>{m.name}</option>)}
             </select>
           </div>
        </div>

        {/* 2. 作業員 */}
        <div className="bg-white p-6 rounded-3xl border-2 border-slate-300 shadow-sm space-y-4">
           <div className="border-b-2 border-orange-200 pb-2">
             <span className="font-black text-base text-orange-700">👥 2. 作業員（複数選択可）</span>
           </div>
           <div className="grid grid-cols-2 gap-3 pt-1">
             {(settings.workers || []).map((w:any) => (
               <button type="button" key={w.name} onClick={() => toggleSelection(selectedWorkers, w.name, setSelectedWorkers)}
               className={`p-4 rounded-2xl font-black border-2 text-base transition ${selectedWorkers.includes(w.name) ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-slate-50 text-slate-800 border-slate-300'}`}>{w.name}</button>
             ))}
           </div>
        </div>

        {/* 3. 重機・車両（複数選択） */}
        <div className="bg-white p-6 rounded-3xl border-2 border-slate-300 shadow-sm space-y-5">
           <div className="border-b-2 border-orange-200 pb-2">
             <span className="font-black text-base text-orange-700">🚜 3. 重機・車両（複数選択可）</span>
           </div>

           {/* リース重機 */}
           <div className="space-y-2">
             <label className="text-sm font-black text-slate-700 block">【リース重機】</label>
             <div className="grid grid-cols-2 gap-3">
               {(settings.leases || []).map((m:any) => (
                 <button type="button" key={m.name} onClick={() => toggleSelection(selectedMachines, m.name, setSelectedMachines)}
                 className={`p-3.5 rounded-2xl font-black border-2 text-sm transition ${selectedMachines.includes(m.name) ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-slate-50 text-slate-800 border-slate-300'}`}>{m.name}</button>
               ))}
             </div>
           </div>

           {/* 自社重機 */}
           <div className="space-y-2">
             <label className="text-sm font-black text-slate-700 block">【自社重機】</label>
             <div className="grid grid-cols-2 gap-3">
               {(settings.companyMachines || []).map((m:any) => (
                 <button type="button" key={m.name} onClick={() => toggleSelection(selectedOwnMachines, m.name, setSelectedOwnMachines)}
                 className={`p-3.5 rounded-2xl font-black border-2 text-sm transition ${selectedOwnMachines.includes(m.name) ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-slate-50 text-slate-800 border-slate-300'}`}>{m.name}</button>
               ))}
             </div>
           </div>

           {/* 自社車両 */}
           <div className="space-y-2">
             <label className="text-sm font-black text-slate-700 block">【自社車両】</label>
             <div className="grid grid-cols-2 gap-3">
               {(settings.vehicles || []).map((v:any) => (
                 <button type="button" key={v.name} onClick={() => toggleSelection(selectedVehicles, v.name, setSelectedVehicles)}
                 className={`p-3.5 rounded-2xl font-black border-2 text-sm transition ${selectedVehicles.includes(v.name) ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-slate-50 text-slate-800 border-slate-300'}`}>{v.name}</button>
               ))}
             </div>
           </div>
        </div>

        {/* 燃料・ETC・駐車場代 */}
        <div className="bg-white p-6 rounded-3xl border-2 border-slate-300 shadow-sm space-y-4">
           <div className="font-black text-base text-orange-700 border-b-2 border-orange-200 pb-2">⛽ 4. 燃料・経費</div>
           
           <div>
             <label className="text-sm font-black text-slate-700 block mb-1">【軽油 (L)】</label>
             <input type="number" placeholder="0" value={fuel} onChange={e=>setFuel(e.target.value)} className="w-full p-4 border-2 border-slate-300 rounded-2xl font-black text-xl bg-white" />
           </div>

           <div>
             <label className="text-sm font-black text-slate-700 block mb-1">【高速代・ETC (円)】</label>
             <input type="number" placeholder="0" value={etcPrice} onChange={e=>setEtcPrice(e.target.value)} className="w-full p-4 border-2 border-slate-300 rounded-2xl font-black text-xl bg-white" />
           </div>

           <div>
             <label className="text-sm font-black text-slate-700 block mb-1">【駐車場代 (円)】</label>
             <input type="number" placeholder="0" value={parkingPrice} onChange={e=>setParkingPrice(e.target.value)} className="w-full p-4 border-2 border-slate-300 rounded-2xl font-black text-xl bg-white" />
           </div>
        </div>

        {/* 5. 処分場への搬出（見やすさを大幅改善） */}
        <div className="bg-white p-6 rounded-3xl border-2 border-slate-300 shadow-sm space-y-4">
           <div className="flex justify-between items-center border-b-2 border-orange-200 pb-2">
             <span className="font-black text-base text-orange-700">🗑️ 5. 処分場への搬出</span>
             <button type="button" onClick={() => setDisposals([...disposals, {location: '', item: '', quantity: '', unit: 't'}])} className="bg-emerald-600 text-white text-sm px-4 py-2.5 rounded-xl font-black shadow hover:bg-emerald-700 transition">＋ 処分項目を追加</button>
           </div>
           
           {disposals.length === 0 && (
             <p className="text-sm font-bold text-slate-400 text-center py-3">追加ボタンを押して処分場を選択してください</p>
           )}

           {disposals.map((entry, index) => (
             <div key={index} className="p-5 border-2 border-slate-300 rounded-2xl bg-slate-50 space-y-3 shadow-inner">
               <div>
                 <label className="text-xs font-black text-slate-600 block mb-1">▼ 処分場・品目を選択</label>
                 <select className="w-full p-4 rounded-xl border-2 border-slate-300 font-black text-base bg-white" value={`${entry.location}|${entry.item}`} onChange={(e) => {
                   const [loc, item] = e.target.value.split('|');
                   const target = settings.disposalLocations?.find((d:any) => d.location === loc && d.item === item);
                   const updated = [...disposals];
                   updated[index] = { location: loc, item: item, quantity: entry.quantity, unit: target?.unit || 't' };
                   setDisposals(updated);
                 }}>
                   <option value="|">-- 処分場・品目を選んでください --</option>
                   {settings.disposalLocations?.map((d:any, idx:number)=><option key={idx} value={`${d.location}|${d.item}`}>{d.location} ({d.item})</option>)}
                 </select>
               </div>
               
               <div className="flex items-end gap-3">
                 <div className="flex-1">
                   <label className="text-xs font-black text-slate-600 block mb-1">▼ 数量 ({entry.unit || 't'})</label>
                   <input type="number" placeholder="0" className="w-full p-4 rounded-xl border-2 border-slate-300 font-black text-xl bg-white" value={entry.quantity} onChange={(e)=>{
                     const updated = [...disposals]; updated[index].quantity = e.target.value; setDisposals(updated);
                   }}/>
                 </div>
                 <div className="pb-1 font-black text-base shrink-0 text-slate-700">{entry.unit || 't'}</div>
                 <button type="button" onClick={() => setDisposals(disposals.filter((_,i)=>i!==index))} className="bg-red-100 text-red-600 px-4 py-4 rounded-xl font-black text-sm hover:bg-red-200 transition shrink-0">削除</button>
               </div>
             </div>
           ))}
        </div>

        {/* 6. スクラップの搬出（見やすさを大幅改善） */}
        <div className="bg-white p-6 rounded-3xl border-2 border-slate-300 shadow-sm space-y-4">
           <div className="flex justify-between items-center border-b-2 border-orange-200 pb-2">
             <span className="font-black text-base text-orange-700">♻️ 6. スクラップの搬出</span>
             <button type="button" onClick={() => setScraps([...scraps, {location: '', item: '', quantity: '', unit: 't'}])} className="bg-emerald-600 text-white text-sm px-4 py-2.5 rounded-xl font-black shadow hover:bg-emerald-700 transition">＋ スクラップを追加</button>
           </div>

           {scraps.length === 0 && (
             <p className="text-sm font-bold text-slate-400 text-center py-3">追加ボタンを押してスクラップ場を選択してください</p>
           )}

           {scraps.map((entry, index) => (
             <div key={index} className="p-5 border-2 border-slate-300 rounded-2xl bg-slate-50 space-y-3 shadow-inner">
               <div>
                 <label className="text-xs font-black text-slate-600 block mb-1">▼ スクラップ場・品目を選択</label>
                 <select className="w-full p-4 rounded-xl border-2 border-slate-300 font-black text-base bg-white" value={`${entry.location}|${entry.item}`} onChange={(e) => {
                   const [loc, item] = e.target.value.split('|');
                   const target = settings.scrapLocations?.find((s:any) => s.location === loc && s.item === item);
                   const updated = [...scraps];
                   updated[index] = { location: loc, item: item, quantity: entry.quantity, unit: target?.unit || 't' };
                   setScraps(updated);
                 }}>
                   <option value="|">-- スクラップ場・品目を選んでください --</option>
                   {settings.scrapLocations?.map((s:any, idx:number)=><option key={idx} value={`${s.location}|${s.item}`}>{s.location} ({s.item})</option>)}
                 </select>
               </div>

               <div className="flex items-end gap-3">
                 <div className="flex-1">
                   <label className="text-xs font-black text-slate-600 block mb-1">▼ 数量 ({entry.unit || 't'})</label>
                   <input type="number" placeholder="0" className="w-full p-4 rounded-xl border-2 border-slate-300 font-black text-xl bg-white" value={entry.quantity} onChange={(e)=>{
                     const updated = [...scraps]; updated[index].quantity = e.target.value; setScraps(updated);
                   }}/>
                 </div>
                 <div className="pb-1 font-black text-base shrink-0 text-slate-700">{entry.unit || 't'}</div>
                 <button type="button" onClick={() => setScraps(scraps.filter((_,i)=>i!==index))} className="bg-red-100 text-red-600 px-4 py-4 rounded-xl font-black text-sm hover:bg-red-200 transition shrink-0">削除</button>
               </div>
             </div>
           ))}
        </div>

        {/* その他 雑費・消耗品等 */}
        <div className="bg-white p-6 rounded-3xl border-2 border-slate-300 shadow-sm space-y-4">
           <div className="font-black text-base text-slate-800 border-b-2 border-slate-200 pb-2">📦 その他 雑費・消耗品等</div>
           <div>
             <label className="text-sm font-black text-slate-700 block mb-1">【品名・内容】</label>
             <input type="text" placeholder="例: 養生テープ" value={otherItem} onChange={e=>setOtherItem(e.target.value)} className="w-full p-4 border-2 border-slate-300 rounded-2xl font-black text-base bg-white" />
           </div>
           <div>
             <label className="text-sm font-black text-slate-700 block mb-1">【金額 (円)】</label>
             <input type="number" placeholder="0" value={otherPrice} onChange={e=>setOtherPrice(e.target.value)} className="w-full p-4 border-2 border-slate-300 rounded-2xl font-black text-xl bg-white" />
           </div>
        </div>

        {/* 7. 本日の作業内容 */}
        <div className="bg-white p-6 rounded-3xl border-2 border-slate-300 shadow-sm space-y-4">
           <div className="border-b-2 border-orange-200 pb-2">
             <span className="font-black text-base text-orange-700">📝 7. 本日の作業内容</span>
           </div>
           <textarea placeholder="作業内容を入力してください" value={description} onChange={e=>setDescription(e.target.value)} className="w-full p-4 rounded-2xl border-2 border-slate-300 h-36 font-bold text-base outline-none bg-white" />
        </div>

        {/* 送信ボタン（さらに大きく押しやすく） */}
        <button type="submit" className="w-full bg-[#E56312] text-white font-black text-2xl py-6 rounded-3xl shadow-xl hover:bg-orange-700 transition">
          📩 日報を送信する
        </button>

      </form>
    </div>
  );
}
