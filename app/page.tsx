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

  // 各セクションの開閉状態を管理するステート
  const [isOpenHeavy, setIsOpenHeavy] = useState(false);
  const [isOpenAttach, setIsOpenAttach] = useState(false);
  const [isOpenOther, setIsOpenOther] = useState(false);

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
    <div className="p-4 max-w-xl mx-auto space-y-6 font-sans pb-32 bg-slate-100 min-h-screen text-slate-900 relative text-base">
      
      {/* ヘッダー */}
      <div className="bg-[#1e293b] text-white p-6 rounded-2xl text-center shadow-md">
        <h1 className="text-2xl font-black">📱 現場日報入力</h1>
        <p className="text-sm text-slate-300 mt-1">株式会社大和</p>
      </div>
      
      {/* 送信完了ポップアップ */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-sm space-y-5 text-center border">
            <div className="text-5xl">🎉</div>
            <h2 className="text-xl font-black text-slate-900">送信が完了しました</h2>
            <p className="text-base text-slate-700">続けて別の報告を入力しますか？</p>
            
            <div className="flex gap-3 pt-2">
              <button 
                type="button" 
                onClick={handleContinue} 
                className="flex-1 bg-[#E56312] text-white py-4 rounded-2xl font-bold text-base shadow hover:bg-orange-700 transition"
              >
                続けて報告
              </button>
              <button 
                type="button" 
                onClick={handleFinish} 
                className="flex-1 bg-slate-200 text-slate-800 py-4 rounded-2xl font-bold text-base hover:bg-slate-300 transition"
              >
                終了する
              </button>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* 1. 日付と現場の選択 */}
        <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-5">
           <div className="font-black text-lg text-orange-600 border-b pb-3">📍 1. 日付と現場の選択</div>
           
           <div>
             <label className="text-base font-bold text-slate-900 block mb-2">【日付】</label>
             <input type="text" value={date} onChange={e=>setDate(e.target.value)} className="w-full p-4 border-2 rounded-2xl font-bold bg-slate-50 text-center text-xl text-slate-900" />
           </div>

           <div>
             <label className="text-base font-bold text-slate-900 block mb-2">【現場名】</label>
             <select value={location} onChange={e=>setLocation(e.target.value)} className="w-full p-4 border-2 rounded-2xl font-bold text-lg bg-white text-slate-900">
               <option value="">現場を選択してください</option>
               {(settings.locations || []).map((l:any)=>(
                 <option key={typeof l === 'string' ? l : l.name} value={typeof l === 'string' ? l : l.name}>
                   {typeof l === 'string' ? l : l.name}
                 </option>
               ))}
             </select>
           </div>

           <div>
             <label className="text-base font-bold text-slate-900 block mb-2">【現場責任者】</label>
             <select value={manager} onChange={e=>setManager(e.target.value)} className="w-full p-4 border-2 rounded-2xl font-bold text-lg bg-white text-slate-900">
               <option value="">責任者を選択してください</option>
               {(settings.managers || []).map((m:any)=><option key={m.name} value={m.name}>{m.name}</option>)}
             </select>
           </div>
        </div>

        {/* 2. 作業員 */}
        <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-5">
           <div className="border-b pb-3">
             <span className="font-black text-lg text-orange-600">👥 2. 作業員（複数選択可）</span>
           </div>
           <div className="grid grid-cols-2 gap-3 pt-1">
             {(settings.workers || []).map((w:any) => (
               <button type="button" key={w.name} onClick={() => toggleSelection(selectedWorkers, w.name, setSelectedWorkers)}
               className={`p-4 rounded-2xl font-bold border-2 text-lg transition ${selectedWorkers.includes(w.name) ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-slate-50 text-slate-800 border-slate-300'}`}>{w.name}</button>
             ))}
           </div>

           <div className="border-t pt-5 space-y-4">
             <div className="flex justify-between items-center">
               <span className="font-bold text-base text-slate-900">👤 外注・派遣作業員</span>
               <button type="button" onClick={() => setSubcontractors([...subcontractors, {company: '', task: '', count: ''}])} className="bg-emerald-600 text-white text-sm px-4 py-2.5 rounded-xl font-bold shadow hover:bg-emerald-700 transition">＋ 追加</button>
             </div>
             
             {subcontractors.map((sub, index) => {
               const availableTasks = (settings.subcontractors || []).filter((s:any) => s.company === sub.company).map((s:any) => s.task);

               return (
                 <div key={index} className="p-4 border-2 rounded-2xl bg-slate-50 space-y-3">
                   <div className="grid grid-cols-2 gap-3">
                     <div>
                       <label className="text-sm font-bold text-slate-900 block mb-1">外注会社名</label>
                       <select className="w-full p-3 rounded-xl border-2 font-bold text-base bg-white text-slate-900" value={sub.company} onChange={(e)=>{
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
                       <label className="text-sm font-bold text-slate-900 block mb-1">作業内容</label>
                       <select className="w-full p-3 rounded-xl border-2 font-bold text-base bg-white text-slate-900" value={sub.task} onChange={(e)=>{
                         const updated = [...subcontractors]; updated[index].task = e.target.value; setSubcontractors(updated);
                       }}>
                         <option value="">内容を選択...</option>
                         {availableTasks.map((t:any, idx:number)=><option key={idx} value={t}>{t}</option>)}
                       </select>
                     </div>
                   </div>
                   <div className="flex items-end gap-3">
                     <div className="flex-1">
                       <label className="text-sm font-bold text-slate-900 block mb-1">人数</label>
                       <input type="number" placeholder="0" className="w-full p-3 rounded-xl border-2 font-bold text-lg bg-white text-slate-900" value={sub.count} onChange={(e)=>{
                         const updated = [...subcontractors]; updated[index].count = e.target.value; setSubcontractors(updated);
                       }}/>
                     </div>
                     <button type="button" onClick={() => setSubcontractors(subcontractors.filter((_,i)=>i!==index))} className="bg-red-100 text-red-700 px-4 py-3 rounded-xl font-bold text-sm hover:bg-red-200 transition shrink-0">削除</button>
                   </div>
                 </div>
               );
             })}
           </div>
        </div>

        {/* 3. 重機・車両 */}
        <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-5">
           <div className="border-b pb-3">
             <span className="font-black text-lg text-orange-600">🚜 3. 重機・車両（複数選択可）</span>
           </div>

           {/* ■ 南大阪建機（MOK）リース */}
           <div className="space-y-4 bg-blue-50/70 p-5 rounded-3xl border-2 border-blue-200">
             <div className="text-sm font-black text-blue-900 bg-blue-200 px-4 py-2 rounded-xl inline-block">
               🏢 南大阪建機（MOK）からのリース
             </div>

             {/* 重機を選択ボタン */}
             <div className="space-y-1">
               <button 
                 type="button" 
                 onClick={() => setIsOpenHeavy(!isOpenHeavy)} 
                 className="w-full text-left p-4 bg-white border-2 border-blue-200 rounded-2xl font-bold text-base text-slate-900 flex justify-between items-center shadow-xs hover:bg-blue-50 transition"
               >
                 <span>【重機を選択する】 {leaseHeavy.length > 0 && <span className="ml-2 bg-blue-600 text-white text-xs px-2.5 py-1 rounded-full">{leaseHeavy.length}選定中</span>}</span>
                 <span className="text-lg font-bold text-slate-500">{isOpenHeavy ? '▲' : '▼'}</span>
               </button>
               {isOpenHeavy && (
                 <div className="grid grid-cols-2 gap-3 pt-2 animate-fadeIn">
                   {(settings.leaseHeavy || []).map((m:any) => (
                     <button type="button" key={m.name} onClick={() => toggleSelection(leaseHeavy, m.name, setLeaseHeavy)}
                     className={`p-4 rounded-2xl font-bold border-2 text-base transition ${leaseHeavy.includes(m.name) ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white text-slate-800 border-slate-300'}`}>{m.name}</button>
                   ))}
                 </div>
               )}
             </div>

             {/* アタッチメントを選択ボタン */}
             <div className="space-y-1 pt-2">
               <button 
                 type="button" 
                 onClick={() => setIsOpenAttach(!isOpenAttach)} 
                 className="w-full text-left p-4 bg-white border-2 border-blue-200 rounded-2xl font-bold text-base text-slate-900 flex justify-between items-center shadow-xs hover:bg-blue-50 transition"
               >
                 <span>【アタッチメントを選択する】 {leaseAttach.length > 0 && <span className="ml-2 bg-blue-600 text-white text-xs px-2.5 py-1 rounded-full">{leaseAttach.length}選定中</span>}</span>
                 <span className="text-lg font-bold text-slate-500">{isOpenAttach ? '▲' : '▼'}</span>
               </button>
               {isOpenAttach && (
                 <div className="grid grid-cols-2 gap-3 pt-2 animate-fadeIn">
                   {(settings.leaseAttach || []).map((m:any) => (
                     <button type="button" key={m.name} onClick={() => toggleSelection(leaseAttach, m.name, setLeaseAttach)}
                     className={`p-4 rounded-2xl font-bold border-2 text-base transition ${leaseAttach.includes(m.name) ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white text-slate-800 border-slate-300'}`}>{m.name}</button>
                   ))}
                 </div>
               )}
             </div>

             {/* その他の機械・機器を選択ボタン */}
             <div className="space-y-1 pt-2">
               <button 
                 type="button" 
                 onClick={() => setIsOpenOther(!isOpenOther)} 
                 className="w-full text-left p-4 bg-white border-2 border-blue-200 rounded-2xl font-bold text-base text-slate-900 flex justify-between items-center shadow-xs hover:bg-blue-50 transition"
               >
                 <span>【その他の機械・機器を選択する】 {leaseOther.length > 0 && <span className="ml-2 bg-blue-600 text-white text-xs px-2.5 py-1 rounded-full">{leaseOther.length}選定中</span>}</span>
                 <span className="text-lg font-bold text-slate-500">{isOpenOther ? '▲' : '▼'}</span>
               </button>
               {isOpenOther && (
                 <div className="grid grid-cols-2 gap-3 pt-2 animate-fadeIn">
                   {(settings.leaseOther || []).map((m:any) => (
                     <button type="button" key={m.name} onClick={() => toggleSelection(leaseOther, m.name, setLeaseOther)}
                     className={`p-4 rounded-2xl font-bold border-2 text-base transition ${leaseOther.includes(m.name) ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white text-slate-800 border-slate-300'}`}>{m.name}</button>
                   ))}
                 </div>
               )}
             </div>
           </div>

           {/* ■ その他リース（自由入力） */}
           <div className="space-y-3 bg-amber-50/70 p-5 rounded-3xl border-2 border-amber-200">
             <div className="flex justify-between items-start gap-3">
               <div className="text-sm font-black text-amber-900 bg-amber-200 px-4 py-2 rounded-xl leading-relaxed">
                 📦 その他<br />
                 <span className="text-xs font-bold">（MOK以外からのリース・機械など）</span>
               </div>
               <button type="button" onClick={() => setOtherLeases([...otherLeases, {name: '', count: ''}])} className="bg-emerald-600 text-white text-sm px-4 py-2.5 rounded-xl font-bold shadow hover:bg-emerald-700 transition shrink-0">＋ 追加</button>
             </div>
             {otherLeases.map((ol, index) => (
               <div key={index} className="flex gap-3 items-center bg-white p-3 rounded-2xl border-2 border-amber-300">
                 <input type="text" placeholder="リース名" value={ol.name} onChange={e=>{
                   const updated = [...otherLeases]; updated[index].name = e.target.value; setOtherLeases(updated);
                 }} className="flex-1 p-3 border-2 rounded-xl font-bold text-base bg-white text-slate-900" />
                 <input type="number" placeholder="個数" value={ol.count} onChange={e=>{
                   const updated = [...otherLeases]; updated[index].count = e.target.value; setOtherLeases(updated);
                 }} className="w-24 p-3 border-2 rounded-xl font-bold text-base bg-white text-slate-900" />
                 <button type="button" onClick={() => setOtherLeases(otherLeases.filter((_,i)=>i!==index))} className="bg-red-100 text-red-700 px-4 py-3 rounded-xl font-bold text-sm shrink-0">削除</button>
               </div>
             ))}
           </div>

           {/* ■ 自社保有（重機・車両） */}
           <div className="space-y-4 bg-emerald-50/70 p-5 rounded-3xl border-2 border-emerald-200">
             <div className="text-sm font-black text-emerald-900 bg-emerald-200 px-4 py-2 rounded-xl inline-block">
               🚛 自社保有（重機・車両）
             </div>

             <div className="space-y-2">
               <label className="text-sm font-bold text-slate-900 block">【自社重機】</label>
               <div className="grid grid-cols-2 gap-3">
                 {(settings.companyMachines || []).map((m:any) => (
                   <button type="button" key={m.name} onClick={() => toggleSelection(selectedOwnMachines, m.name, setSelectedOwnMachines)}
                   className={`p-4 rounded-2xl font-bold border-2 text-base transition ${selectedOwnMachines.includes(m.name) ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white text-slate-800 border-slate-300'}`}>{m.name}</button>
                 ))}
               </div>
             </div>

             <div className="space-y-2 pt-2">
               <label className="text-sm font-bold text-slate-900 block">【自社車両（乗用車・トラック）】</label>
               <div className="grid grid-cols-2 gap-3">
                 {(settings.vehicles || []).map((v:any) => (
                   <button type="button" key={v.name} onClick={() => toggleSelection(selectedVehicles, v.name, setSelectedVehicles)}
                   className={`p-4 rounded-2xl font-bold border-2 text-base transition ${selectedVehicles.includes(v.name) ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white text-slate-800 border-slate-300'}`}>{v.name}</button>
                 ))}
               </div>
             </div>
           </div>

        </div>

        {/* 4. 燃料・経費 */}
        <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-4">
           <div className="border-b pb-3">
             <span className="font-black text-lg text-orange-600">⛽ 4. 燃料・経費</span>
           </div>
           
           <div>
             <label className="text-base font-bold text-slate-900 block mb-2">【軽油 (L)】</label>
             <input type="number" placeholder="0" value={fuel} onChange={e=>setFuel(e.target.value)} className="w-full p-4 border-2 rounded-2xl font-bold text-xl bg-white text-slate-900" />
           </div>

           <div>
             <label className="text-base font-bold text-slate-900 block mb-2">【高速代・ETC (円)】</label>
             <input type="number" placeholder="0" value={etcPrice} onChange={e=>setEtcPrice(e.target.value)} className="w-full p-4 border-2 rounded-2xl font-bold text-xl bg-white text-slate-900" />
           </div>

           <div>
             <label className="text-base font-bold text-slate-900 block mb-2">【駐車場代 (円)】</label>
             <input type="number" placeholder="0" value={parkingPrice} onChange={e=>setParkingPrice(e.target.value)} className="w-full p-4 border-2 rounded-2xl font-bold text-xl bg-white text-slate-900" />
           </div>
        </div>

        {/* 5. 処分場への搬出 */}
        <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-4">
           <div className="flex justify-between items-center border-b pb-3">
             <span className="font-black text-lg text-orange-600">🗑️ 5. 処分場への搬出</span>
             <button type="button" onClick={() => setDisposals([...disposals, {location: '', item: '', quantity: '', unit: 't'}])} className="bg-emerald-600 text-white text-sm px-4 py-2.5 rounded-xl font-bold shadow hover:bg-emerald-700 transition">＋ 追加する</button>
           </div>
           
           {disposals.length === 0 && (
             <p className="text-sm font-bold text-slate-400 text-center py-3">「追加する」ボタンを押して選択してください</p>
           )}

           {disposals.map((entry, index) => (
             <div key={index} className="p-4 border-2 rounded-2xl bg-slate-50 space-y-3">
               <div>
                 <label className="text-sm font-bold text-slate-900 block mb-1">処分場・品目</label>
                 <select className="w-full p-3.5 rounded-xl border-2 font-bold text-base bg-white text-slate-900" value={`${entry.location}|${entry.item}`} onChange={(e) => {
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
               
               <div className="flex items-end gap-3">
                 <div className="flex-1">
                   <label className="text-sm font-bold text-slate-900 block mb-1">数量</label>
                   <input type="number" placeholder="0" className="w-full p-3.5 rounded-xl border-2 font-bold text-xl bg-white text-slate-900" value={entry.quantity} onChange={(e)=>{
                     const updated = [...disposals]; updated[index].quantity = e.target.value; setDisposals(updated);
                   }}/>
                 </div>
                 <div className="pb-3 font-black text-base text-slate-700 shrink-0">{entry.unit || 't'}</div>
                 <button type="button" onClick={() => setDisposals(disposals.filter((_,i)=>i!==index))} className="bg-red-100 text-red-700 px-4 py-3.5 rounded-xl font-bold text-sm hover:bg-red-200 transition shrink-0">削除</button>
               </div>
             </div>
           ))}
        </div>

        {/* 6. スクラップの搬出 */}
        <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-4">
           <div className="flex justify-between items-center border-b pb-3">
             <span className="font-black text-lg text-orange-600">♻️ 6. スクラップの搬出</span>
             <button type="button" onClick={() => setScraps([...scraps, {location: '', item: '', quantity: '', unit: 't'}])} className="bg-emerald-600 text-white text-sm px-4 py-2.5 rounded-xl font-bold shadow hover:bg-emerald-700 transition">＋ 追加する</button>
           </div>

           {scraps.length === 0 && (
             <p className="text-sm font-bold text-slate-400 text-center py-3">「追加する」ボタンを押して選択してください</p>
           )}

           {scraps.map((entry, index) => (
             <div key={index} className="p-4 border-2 rounded-2xl bg-slate-50 space-y-3">
               <div>
                 <label className="text-sm font-bold text-slate-900 block mb-1">スクラップ場・品目</label>
                 <select className="w-full p-3.5 rounded-xl border-2 font-bold text-base bg-white text-slate-900" value={`${entry.location}|${entry.item}`} onChange={(e) => {
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

               <div className="flex items-end gap-3">
                 <div className="flex-1">
                   <label className="text-sm font-bold text-slate-900 block mb-1">数量</label>
                   <input type="number" placeholder="0" className="w-full p-3.5 rounded-xl border-2 font-bold text-xl bg-white text-slate-900" value={entry.quantity} onChange={(e)=>{
                     const updated = [...scraps]; updated[index].quantity = e.target.value; setScraps(updated);
                   }}/>
                 </div>
                 <div className="pb-3 font-black text-base text-slate-700 shrink-0">{entry.unit || 't'}</div>
                 <button type="button" onClick={() => setScraps(scraps.filter((_,i)=>i!==index))} className="bg-red-100 text-red-700 px-4 py-3.5 rounded-xl font-bold text-sm hover:bg-red-200 transition shrink-0">削除</button>
               </div>
             </div>
           ))}
        </div>

        {/* その他 雑費・消耗品等 */}
        <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-4">
           <div className="font-black text-lg text-slate-900 border-b pb-3">📦 その他 雑費・消耗品等</div>
           <div>
             <label className="text-base font-bold text-slate-900 block mb-2">【品名・内容】</label>
             <input type="text" placeholder="例: 養生テープ" value={otherItem} onChange={e=>setOtherItem(e.target.value)} className="w-full p-4 border-2 rounded-2xl font-bold text-lg bg-white text-slate-900" />
           </div>
           <div>
             <label className="text-base font-bold text-slate-900 block mb-2">【金額 (円)】</label>
             <input type="number" placeholder="0" value={otherPrice} onChange={e=>setOtherPrice(e.target.value)} className="w-full p-4 border-2 rounded-2xl font-bold text-xl bg-white text-slate-900" />
           </div>
        </div>

        {/* 7. 本日の作業内容 */}
        <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-4">
           <div className="border-b pb-3">
             <span className="font-black text-lg text-orange-600">📝 7. 本日の作業内容</span>
           </div>
           <textarea placeholder="作業内容を入力してください" value={description} onChange={e=>setDescription(e.target.value)} className="w-full p-4 rounded-2xl border-2 h-40 font-bold text-lg outline-none bg-white text-slate-900" />
        </div>

        <button type="submit" className="w-full bg-[#E56312] text-white font-black text-2xl py-5 rounded-3xl shadow-xl hover:bg-orange-700 transition">
          📩 日報を送信する
        </button>

      </form>
    </div>
  );
}
