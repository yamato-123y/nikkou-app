'use client';
import { useState, useEffect } from 'react';

export default function Home() {
  const [settings, setSettings] = useState<any>({});
  
  const [date, setDate] = useState(() => new Date().toLocaleDateString('ja-JP').replace(/\//g, '/'));
  const [location, setLocation] = useState('');
  const [manager, setManager] = useState('');
  const [selectedWorkers, setSelectedWorkers] = useState<string[]>([]);
  
  const [subcontractors, setSubcontractors] = useState<{company: string, task: string, count: string}[]>([]);

  // 新・リース欄の3分類
  const [leaseHeavy, setLeaseHeavy] = useState<string[]>([]);
  const [leaseAttach, setLeaseAttach] = useState<string[]>([]);
  const [leaseOther, setLeaseOther] = useState<string[]>([]);

  const [otherLeases, setOtherLeases] = useState<{name: string, count: string}[]>([]);
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

  const handleCopyMachinesYesterday = async () => {
    try {
      const res = await fetch('/api/reports');
      if (res.ok) {
        const list = await res.json();
        if (list && list.length > 0) {
          const last = list[list.length - 1];
          if (last.leaseHeavy) setLeaseHeavy(last.leaseHeavy);
          if (last.leaseAttach) setLeaseAttach(last.leaseAttach);
          if (last.leaseOther) setLeaseOther(last.leaseOther);
          if (last.machines) setLeaseHeavy(last.machines); // 互換性のため
          if (last.otherLeases) setOtherLeases(last.otherLeases);
          if (last.ownMachines) setSelectedOwnMachines(last.ownMachines);
          if (last.vehicles) setSelectedVehicles(last.vehicles);
          alert('前回登録された重機・リースデータを反映しました！');
        } else {
          alert('過去のデータがありません。');
        }
      }
    } catch (e) { console.error(e); }
  };

  const handleCopyFuelYesterday = async () => {
    try {
      const res = await fetch('/api/reports');
      if (res.ok) {
        const list = await res.json();
        if (list && list.length > 0) {
          const last = list[list.length - 1];
          if (last.fuel) setFuel(last.fuel);
          if (last.etcPrice) setEtcPrice(last.etcPrice);
          if (last.parkingPrice) setParkingPrice(last.parkingPrice);
          alert('前回登録された燃料・経費データを反映しました！');
        } else {
          alert('過去のデータがありません。');
        }
      }
    } catch (e) { console.error(e); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date, location, manager, workers: selectedWorkers, 
        subcontractors,
        leaseHeavy, leaseAttach, leaseOther,
        machines: leaseHeavy, // 互換用
        otherLeases, ownMachines: selectedOwnMachines, vehicles: selectedVehicles, 
        fuel: fuel || '0', etcPrice: etcPrice || '0', parkingPrice: parkingPrice || '0',
        otherItem, otherPrice: otherPrice || '0',
        disposals, scraps, workDescription: description,
        createdAt: new Date().toISOString()
      })
    });
    
    setSelectedWorkers([]); 
    setSubcontractors([]);
    setLeaseHeavy([]);
    setLeaseAttach([]);
    setLeaseOther([]);
    setOtherLeases([]);
    setSelectedOwnMachines([]); 
    setSelectedVehicles([]);
    setFuel(''); setEtcPrice(''); setParkingPrice(''); setOtherItem(''); setOtherPrice('');
    setDisposals([]); setScraps([]); setDescription('');

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

  const uniqueCompanies = Array.from(new Set((settings.subcontractors || []).map((s:any) => s.company).filter(Boolean)));

  return (
    <div className="p-4 max-w-xl mx-auto space-y-6 font-sans pb-28 bg-slate-100 min-h-screen text-slate-800 relative">
      
      {/* ヘッダー */}
      <div className="bg-[#1e293b] text-white p-5 rounded-2xl text-center shadow-md">
        <h1 className="text-xl font-bold">📱 現場日報入力</h1>
        <p className="text-xs text-slate-300 mt-1">株式会社大和</p>
      </div>
      
      {/* 送信完了ポップアップ */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-sm space-y-4 text-center border">
            <div className="text-4xl">🎉</div>
            <h2 className="text-lg font-bold text-slate-800">日報報告の送信が完了しました</h2>
            <p className="text-xs text-slate-600">続けて別の報告を入力しますか？</p>
            
            <div className="flex gap-3 pt-2">
              <button 
                type="button" 
                onClick={handleContinue} 
                className="flex-1 bg-[#E56312] text-white py-3 rounded-xl font-bold text-sm shadow hover:bg-orange-700 transition"
              >
                続けて報告する
              </button>
              <button 
                type="button" 
                onClick={handleFinish} 
                className="flex-1 bg-slate-200 text-slate-700 py-3 rounded-xl font-bold text-sm hover:bg-slate-300 transition"
              >
                終了する
              </button>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* 1. 日付と現場の選択 */}
        <div className="bg-white p-5 rounded-2xl border shadow-sm space-y-4">
           <div className="font-bold text-base text-orange-600 border-b pb-2">📍 1. 日付と現場の選択</div>
           
           <div>
             <label className="text-sm font-medium text-slate-600 block mb-1">【日付】</label>
             <input type="text" value={date} onChange={e=>setDate(e.target.value)} className="w-full p-3 border rounded-xl font-medium bg-slate-50 text-center text-lg" />
           </div>

           <div>
             <label className="text-sm font-medium text-slate-600 block mb-1">【現場名】</label>
             <select value={location} onChange={e=>setLocation(e.target.value)} className="w-full p-3 border rounded-xl font-medium text-base bg-white">
               <option value="">現場を選択してください</option>
               {(settings.locations || []).map((l:any)=>(
                 <option key={typeof l === 'string' ? l : l.name} value={typeof l === 'string' ? l : l.name}>
                   {typeof l === 'string' ? l : l.name}
                 </option>
               ))}
             </select>
           </div>

           <div>
             <label className="text-sm font-medium text-slate-600 block mb-1">【現場責任者】</label>
             <select value={manager} onChange={e=>setManager(e.target.value)} className="w-full p-3 border rounded-xl font-medium text-base bg-white">
               <option value="">責任者を選択してください</option>
               {(settings.managers || []).map((m:any)=><option key={m.name} value={m.name}>{m.name}</option>)}
             </select>
           </div>
        </div>

        {/* 2. 作業員 */}
        <div className="bg-white p-5 rounded-2xl border shadow-sm space-y-4">
           <div className="border-b pb-2">
             <span className="font-bold text-base text-orange-600">👥 2. 作業員（複数選択可）</span>
           </div>
           <div className="grid grid-cols-2 gap-2 pt-1">
             {(settings.workers || []).map((w:any) => (
               <button type="button" key={w.name} onClick={() => toggleSelection(selectedWorkers, w.name, setSelectedWorkers)}
               className={`p-3 rounded-xl font-medium border text-base transition ${selectedWorkers.includes(w.name) ? 'bg-slate-800 text-white border-slate-800 shadow-sm' : 'bg-slate-50 text-slate-700 border-slate-200'}`}>{w.name}</button>
             ))}
           </div>

           <div className="border-t pt-4 space-y-3">
             <div className="flex justify-between items-center">
               <span className="font-bold text-sm text-slate-700">👤 外注・派遣作業員</span>
               <button type="button" onClick={() => setSubcontractors([...subcontractors, {company: '', task: '', count: ''}])} className="bg-emerald-600 text-white text-xs px-3 py-1.5 rounded-lg font-bold shadow hover:bg-emerald-700 transition">＋ 追加</button>
             </div>
             
             {subcontractors.map((sub, index) => {
               const availableTasks = (settings.subcontractors || []).filter((s:any) => s.company === sub.company).map((s:any) => s.task);

               return (
                 <div key={index} className="p-3 border rounded-xl bg-slate-50 space-y-2">
                   <div className="grid grid-cols-2 gap-2">
                     <div>
                       <label className="text-xs font-bold text-slate-500 block mb-1">外注会社名</label>
                       <select className="w-full p-2.5 rounded-lg border text-sm bg-white" value={sub.company} onChange={(e)=>{
                         const updated = [...subcontractors]; 
                         updated[index].company = e.target.value; 
                         updated[index].task = '';
                         setSubcontractors(updated);
                       }}>
                         <option value="">会社を選択...</option>
                         {uniqueCompanies.map((comp:any)=><option key={comp} value={comp}>{comp}</option>)}
                       </select>
                     </div>
                     <div>
                       <label className="text-xs font-bold text-slate-500 block mb-1">作業内容</label>
                       <select className="w-full p-2.5 rounded-lg border text-sm bg-white" value={sub.task} onChange={(e)=>{
                         const updated = [...subcontractors]; updated[index].task = e.target.value; setSubcontractors(updated);
                       }}>
                         <option value="">内容を選択...</option>
                         {availableTasks.map((t:any, idx:number)=><option key={idx} value={t}>{t}</option>)}
                       </select>
                     </div>
                   </div>
                   <div className="flex items-end gap-2">
                     <div className="flex-1">
                       <label className="text-xs font-bold text-slate-500 block mb-1">人数</label>
                       <input type="number" placeholder="0" className="w-full p-2.5 rounded-lg border text-sm bg-white" value={sub.count} onChange={(e)=>{
                         const updated = [...subcontractors]; updated[index].count = e.target.value; setSubcontractors(updated);
                       }}/>
                     </div>
                     <button type="button" onClick={() => setSubcontractors(subcontractors.filter((_,i)=>i!==index))} className="bg-red-50 text-red-600 px-3 py-2.5 rounded-lg font-bold text-xs hover:bg-red-100 transition shrink-0">削除</button>
                   </div>
                 </div>
               );
             })}
           </div>
        </div>

        {/* 3. 重機・車両 */}
        <div className="bg-white p-5 rounded-2xl border shadow-sm space-y-4">
           <div className="flex justify-between items-center border-b pb-2">
             <span className="font-bold text-base text-orange-600">🚜 3. 重機・車両（複数選択可）</span>
             <button type="button" onClick={handleCopyMachinesYesterday} className="bg-orange-600 hover:bg-orange-700 text-white text-xs px-3 py-1.5 rounded-lg font-bold shadow transition">🔄 昨日と同じ</button>
           </div>

           {/* 重機を選択 */}
           <div className="space-y-1.5">
             <label className="text-xs font-bold text-slate-500">【重機を選択】</label>
             <div className="grid grid-cols-2 gap-2">
               {(settings.leaseHeavy || []).map((m:any) => (
                 <button type="button" key={m.name} onClick={() => toggleSelection(leaseHeavy, m.name, setLeaseHeavy)}
                 className={`p-3 rounded-xl font-medium border text-sm transition ${leaseHeavy.includes(m.name) ? 'bg-slate-800 text-white border-slate-800 shadow-sm' : 'bg-slate-50 text-slate-700 border-slate-200'}`}>{m.name}</button>
               ))}
             </div>
           </div>

           {/* アタッチメントを選択 */}
           <div className="space-y-1.5 pt-2">
             <label className="text-xs font-bold text-slate-500">【アタッチメントを選択】</label>
             <div className="grid grid-cols-2 gap-2">
               {(settings.leaseAttach || []).map((m:any) => (
                 <button type="button" key={m.name} onClick={() => toggleSelection(leaseAttach, m.name, setLeaseAttach)}
                 className={`p-3 rounded-xl font-medium border text-sm transition ${leaseAttach.includes(m.name) ? 'bg-slate-800 text-white border-slate-800 shadow-sm' : 'bg-slate-50 text-slate-700 border-slate-200'}`}>{m.name}</button>
               ))}
             </div>
           </div>

           {/* その他 機械・機器を選択 */}
           <div className="space-y-1.5 pt-2">
             <label className="text-xs font-bold text-slate-500">【その他 機械・機器を選択】</label>
             <div className="grid grid-cols-2 gap-2">
               {(settings.leaseOther || []).map((m:any) => (
                 <button type="button" key={m.name} onClick={() => toggleSelection(leaseOther, m.name, setLeaseOther)}
                 className={`p-3 rounded-xl font-medium border text-sm transition ${leaseOther.includes(m.name) ? 'bg-slate-800 text-white border-slate-800 shadow-sm' : 'bg-slate-50 text-slate-700 border-slate-200'}`}>{m.name}</button>
               ))}
             </div>
           </div>

           {/* その他リース（自由記述テキスト ＋ 追加ボタン） */}
           <div className="space-y-2 pt-2">
             <div className="flex justify-between items-center">
               <label className="text-xs font-bold text-slate-500">【その他リース（自由入力）】</label>
               <button type="button" onClick={() => setOtherLeases([...otherLeases, {name: '', count: ''}])} className="bg-emerald-600 text-white text-xs px-3 py-1.5 rounded-lg font-bold shadow hover:bg-emerald-700 transition">＋ 追加</button>
             </div>
             {otherLeases.map((ol, index) => (
               <div key={index} className="flex gap-2 items-center bg-slate-50 p-2 rounded-xl border">
                 <input type="text" placeholder="リース名" value={ol.name} onChange={e=>{
                   const updated = [...otherLeases]; updated[index].name = e.target.value; setOtherLeases(updated);
                 }} className="flex-1 p-2 border rounded-lg text-sm bg-white" />
                 <input type="number" placeholder="個数" value={ol.count} onChange={e=>{
                   const updated = [...otherLeases]; updated[index].count = e.target.value; setOtherLeases(updated);
                 }} className="w-24 p-2 border rounded-lg text-sm bg-white" />
                 <button type="button" onClick={() => setOtherLeases(otherLeases.filter((_,i)=>i!==index))} className="bg-red-50 text-red-600 px-3 py-2 rounded-lg font-bold text-xs">削除</button>
               </div>
             ))}
           </div>

           <div className="space-y-1.5 pt-2">
             <label className="text-xs font-bold text-slate-500">【自社重機】</label>
             <div className="grid grid-cols-2 gap-2">
               {(settings.companyMachines || []).map((m:any) => (
                 <button type="button" key={m.name} onClick={() => toggleSelection(selectedOwnMachines, m.name, setSelectedOwnMachines)}
                 className={`p-3 rounded-xl font-medium border text-sm transition ${selectedOwnMachines.includes(m.name) ? 'bg-slate-800 text-white border-slate-800 shadow-sm' : 'bg-slate-50 text-slate-700 border-slate-200'}`}>{m.name}</button>
               ))}
             </div>
           </div>

           <div className="space-y-1.5 pt-2">
             <label className="text-xs font-bold text-slate-500">【自社車両】</label>
             <div className="grid grid-cols-2 gap-2">
               {(settings.vehicles || []).map((v:any) => (
                 <button type="button" key={v.name} onClick={() => toggleSelection(selectedVehicles, v.name, setSelectedVehicles)}
                 className={`p-3 rounded-xl font-medium border text-sm transition ${selectedVehicles.includes(v.name) ? 'bg-slate-800 text-white border-slate-800 shadow-sm' : 'bg-slate-50 text-slate-700 border-slate-200'}`}>{v.name}</button>
               ))}
             </div>
           </div>
        </div>

        {/* 4. 燃料・経費 */}
        <div className="bg-white p-5 rounded-2xl border shadow-sm space-y-4">
           <div className="flex justify-between items-center border-b pb-2">
             <span className="font-bold text-base text-orange-600">⛽ 4. 燃料・経費</span>
             <button type="button" onClick={handleCopyFuelYesterday} className="bg-orange-600 hover:bg-orange-700 text-white text-xs px-3 py-1.5 rounded-lg font-bold shadow transition">🔄 昨日と同じ</button>
           </div>
           
           <div>
             <label className="text-sm font-medium text-slate-600 block mb-1">【軽油 (L)】</label>
             <input type="number" placeholder="0" value={fuel} onChange={e=>setFuel(e.target.value)} className="w-full p-3 border rounded-xl font-medium text-lg bg-white" />
           </div>

           <div>
             <label className="text-sm font-medium text-slate-600 block mb-1">【高速代・ETC (円)】</label>
             <input type="number" placeholder="0" value={etcPrice} onChange={e=>setEtcPrice(e.target.value)} className="w-full p-3 border rounded-xl font-medium text-lg bg-white" />
           </div>

           <div>
             <label className="text-sm font-medium text-slate-600 block mb-1">【駐車場代 (円)】</label>
             <input type="number" placeholder="0" value={parkingPrice} onChange={e=>setParkingPrice(e.target.value)} className="w-full p-3 border rounded-xl font-medium text-lg bg-white" />
           </div>
        </div>

        {/* 5. 処分場への搬出 */}
        <div className="bg-white p-5 rounded-2xl border shadow-sm space-y-4">
           <div className="flex justify-between items-center border-b pb-2">
             <span className="font-bold text-base text-orange-600">🗑️ 5. 処分場への搬出</span>
             <button type="button" onClick={() => setDisposals([...disposals, {location: '', item: '', quantity: '', unit: 't'}])} className="bg-emerald-600 text-white text-xs px-3.5 py-2 rounded-lg font-bold shadow-sm hover:bg-emerald-700 transition">＋ 追加する</button>
           </div>
           
           {disposals.length === 0 && (
             <p className="text-xs font-medium text-slate-400 text-center py-2">「追加する」ボタンを押して選択してください</p>
           )}

           {disposals.map((entry, index) => (
             <div key={index} className="p-4 border rounded-xl bg-slate-50 space-y-3">
               <div>
                 <label className="text-xs font-bold text-slate-500 block mb-1">処分場・品目</label>
                 <select className="w-full p-3 rounded-xl border font-medium text-base bg-white" value={`${entry.location}|${entry.item}`} onChange={(e) => {
                   const [loc, item] = e.target.value.split('|');
                   const target = settings.disposalLocations?.find((d:any) => d.location === loc && d.item === item);
                   const updated = [...disposals];
                   updated[index] = { location: loc, item: item, quantity: entry.quantity, unit: target?.unit || 't' };
                   setDisposals(updated);
                 }}>
                   <option value="|">選択してください...</option>
                   {settings.disposalLocations?.map((d:any, idx:number)=><option key={idx} value={`${d.location}|${d.item}`}>{d.location} ({d.item})</option>)}
                 </select>
               </div>
               
               <div className="flex items-end gap-2">
                 <div className="flex-1">
                   <label className="text-xs font-bold text-slate-500 block mb-1">数量</label>
                   <input type="number" placeholder="0" className="w-full p-3 rounded-xl border font-medium text-lg bg-white" value={entry.quantity} onChange={(e)=>{
                     const updated = [...disposals]; updated[index].quantity = e.target.value; setDisposals(updated);
                   }}/>
                 </div>
                 <div className="pb-2 font-bold text-sm text-slate-600 shrink-0">{entry.unit || 't'}</div>
                 <button type="button" onClick={() => setDisposals(disposals.filter((_,i)=>i!==index))} className="bg-red-50 text-red-600 px-3 py-3 rounded-xl font-bold text-xs hover:bg-red-100 transition shrink-0">削除</button>
               </div>
             </div>
           ))}
        </div>

        {/* 6. スクラップの搬出 */}
        <div className="bg-white p-5 rounded-2xl border shadow-sm space-y-4">
           <div className="flex justify-between items-center border-b pb-2">
             <span className="font-bold text-base text-orange-600">♻️ 6. スクラップの搬出</span>
             <button type="button" onClick={() => setScraps([...scraps, {location: '', item: '', quantity: '', unit: 't'}])} className="bg-emerald-600 text-white text-xs px-3.5 py-2 rounded-lg font-bold shadow-sm hover:bg-emerald-700 transition">＋ 追加する</button>
           </div>

           {scraps.length === 0 && (
             <p className="text-xs font-medium text-slate-400 text-center py-2">「追加する」ボタンを押して選択してください</p>
           )}

           {scraps.map((entry, index) => (
             <div key={index} className="p-4 border rounded-xl bg-slate-50 space-y-3">
               <div>
                 <label className="text-xs font-bold text-slate-500 block mb-1">スクラップ場・品目</label>
                 <select className="w-full p-3 rounded-xl border font-medium text-base bg-white" value={`${entry.location}|${entry.item}`} onChange={(e) => {
                   const [loc, item] = e.target.value.split('|');
                   const target = settings.scrapLocations?.find((s:any) => s.location === loc && s.item === item);
                   const updated = [...scraps];
                   updated[index] = { location: loc, item: item, quantity: entry.quantity, unit: target?.unit || 't' };
                   setScraps(updated);
                 }}>
                   <option value="|">選択してください...</option>
                   {settings.scrapLocations?.map((s:any, idx:number)=><option key={idx} value={`${s.location}|${s.item}`}>{s.location} ({s.item})</option>)}
                 </select>
               </div>

               <div className="flex items-end gap-2">
                 <div className="flex-1">
                   <label className="text-xs font-bold text-slate-500 block mb-1">数量</label>
                   <input type="number" placeholder="0" className="w-full p-3 rounded-xl border font-medium text-lg bg-white" value={entry.quantity} onChange={(e)=>{
                     const updated = [...scraps]; updated[index].quantity = e.target.value; setScraps(updated);
                   }}/>
                 </div>
                 <div className="pb-2 font-bold text-sm text-slate-600 shrink-0">{entry.unit || 't'}</div>
                 <button type="button" onClick={() => setScraps(scraps.filter((_,i)=>i!==index))} className="bg-red-50 text-red-600 px-3 py-3 rounded-xl font-bold text-xs hover:bg-red-100 transition shrink-0">削除</button>
               </div>
             </div>
           ))}
        </div>

        {/* その他 雑費・消耗品等 */}
        <div className="bg-white p-5 rounded-2xl border shadow-sm space-y-4">
           <div className="font-bold text-base text-slate-800 border-b pb-2">📦 その他 雑費・消耗品等</div>
           <div>
             <label className="text-sm font-medium text-slate-600 block mb-1">【品名・内容】</label>
             <input type="text" placeholder="例: 養生テープ" value={otherItem} onChange={e=>setOtherItem(e.target.value)} className="w-full p-3 border rounded-xl font-medium text-base bg-white" />
           </div>
           <div>
             <label className="text-sm font-medium text-slate-600 block mb-1">【金額 (円)】</label>
             <input type="number" placeholder="0" value={otherPrice} onChange={e=>setOtherPrice(e.target.value)} className="w-full p-3 border rounded-xl font-medium text-lg bg-white" />
           </div>
        </div>

        {/* 7. 本日の作業内容 */}
        <div className="bg-white p-5 rounded-2xl border shadow-sm space-y-4">
           <div className="border-b pb-2">
             <span className="font-bold text-base text-orange-600">📝 7. 本日の作業内容</span>
           </div>
           <textarea placeholder="作業内容を入力してください" value={description} onChange={e=>setDescription(e.target.value)} className="w-full p-3 rounded-xl border h-32 font-medium text-base outline-none bg-white" />
        </div>

        <button type="submit" className="w-full bg-[#E56312] text-white font-bold text-xl py-4 rounded-2xl shadow-lg hover:bg-orange-700 transition">
          📩 日報を送信する
        </button>

      </form>
    </div>
  );
}
