'use client';
import { useState, useEffect } from 'react';

export default function Home() {
  const [settings, setSettings] = useState<any>({});
  
  const [date, setDate] = useState(() => new Date().toLocaleDateString('ja-JP').replace(/\//g, '/'));
  const [location, setLocation] = useState('');
  const [manager, setManager] = useState('');
  const [selectedWorkers, setSelectedWorkers] = useState<string[]>([]);
  
  const [subcontractors, setSubcontractors] = useState<{company: string, task: string, count: string}[]>([]);

  // リース欄の分類
  const [leaseHeavy, setLeaseHeavy] = useState<string[]>([]);
  const [leaseAttach, setLeaseAttach] = useState<string[]>([]);
  const [leaseOther, setLeaseOther] = useState<string[]>([]);

  // 各セクションの開閉状態を管理するステート
  const [isOpenHeavy, setIsOpenHeavy] = useState(false);
  const [isOpenAttach, setIsOpenAttach] = useState(false);
  const [isOpenOther, setIsOpenOther] = useState(false);

  // 🏢 南大阪建機（MOK）からのリース：リストにない機械の自由追加用ステート
  const [mokCustomMachines, setMokCustomMachines] = useState<{name: string, count: string}[]>([]);

  // 📦 その他（MOK以外からのリース）：「リース会社名を入力」「重機・機械名」「個数」
  const [otherLeases, setOtherLeases] = useState<{company: string, name: string, count: string}[]>([]);

  // 自社保有（大和の重機・車両）
  const [selectedOwnMachines, setSelectedOwnMachines] = useState<string[]>([]);
  const [selectedVehicles, setSelectedVehicles] = useState<string[]>([]);
  
  const [fuel, setFuel] = useState('');
  const [regularPrice, setRegularPrice] = useState(''); // ①レギュラー購入分(円)
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
        mokCustomMachines, // MOK自由追加機械
        otherLeases,       // 変更後のその他リース
        ownMachines: selectedOwnMachines, vehicles: selectedVehicles, 
        fuel: fuel || '0', 
        regularPrice: regularPrice || '0', // ①レギュラー購入分
        etcPrice: etcPrice || '0', 
        parkingPrice: parkingPrice || '0',
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
    setMokCustomMachines([]);
    setOtherLeases([]);
    setSelectedOwnMachines([]); 
    setSelectedVehicles([]);
    setFuel(''); setRegularPrice(''); setEtcPrice(''); setParkingPrice(''); setOtherItem(''); setOtherPrice('');
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
    <div className="p-4 max-w-xl mx-auto space-y-6 font-sans pb-32 bg-slate-100 min-h-screen text-slate-950 relative text-base">
      
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
            <h2 className="text-xl font-black text-slate-950">送信が完了しました</h2>
            <p className="text-base text-slate-800">続けて別の報告を入力しますか？</p>
            
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
                className="flex-1 bg-slate-200 text-slate-900 py-4 rounded-2xl font-bold text-base hover:bg-slate-300 transition"
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
             <label className="text-base font-bold text-slate-950 block mb-2">【日付】</label>
             <input type="text" value={date} onChange={e=>setDate(e.target.value)} className="w-full p-4 border-2 rounded-2xl font-bold bg-slate-50 text-center text-xl text-slate-950" />
           </div>

           <div>
             <label className="text-base font-bold text-slate-950 block mb-2">【現場名】</label>
             <select value={location} onChange={e=>setLocation(e.target.value)} className="w-full p-4 border-2 rounded-2xl font-bold text-lg bg-white text-slate-950">
               <option value="">現場を選択してください</option>
               {(settings.locations || []).map((l:any)=>(
                 <option key={typeof l === 'string' ? l : l.name} value={typeof l === 'string' ? l : l.name}>
                   {typeof l === 'string' ? l : l.name}
                 </option>
               ))}
             </select>
           </div>

           <div>
             <label className="text-base font-bold text-slate-950 block mb-2">【職長】</label>
             <select value={manager} onChange={e=>setManager(e.target.value)} className="w-full p-4 border-2 rounded-2xl font-bold text-lg bg-white text-slate-950">
               <option value="">職長を選択してください</option>
               {(settings.managers || []).map((m:any)=><option key={m.name} value={m.name}>{m.name}</option>)}
             </select>
           </div>
        </div>

        {/* 2. 作業員 */}
        <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-5">
           <div className="border-b pb-3 space-y-1">
             <span className="font-black text-lg text-orange-600 block">👥 2. 作業員（複数選択可）</span>
             <p className="text-xs md:text-sm font-bold text-slate-500">※職長も現場で作業した場合は、ここでも選択してください。</p>
           </div>
           <div className="grid grid-cols-2 gap-3 pt-1">
             {(settings.workers || []).map((w:any) => (
               <button type="button" key={w.name} onClick={() => toggleSelection(selectedWorkers, w.name, setSelectedWorkers)}
               className={`p-4 rounded-2xl font-bold border-2 text-lg transition ${selectedWorkers.includes(w.name) ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-slate-50 text-slate-900 border-slate-300'}`}>{w.name}</button>
             ))}
           </div>

           <div className="border-t pt-5 space-y-4">
             <div className="flex justify-between items-center">
               <span className="font-bold text-base text-slate-950">👤 外注・派遣作業員</span>
               <button type="button" onClick={() => setSubcontractors([...subcontractors, {company: '', task: '', count: ''}])} className="bg-emerald-600 text-white text-sm px-4 py-2.5 rounded-xl font-bold shadow hover:bg-emerald-700 transition">＋ 追加</button>
             </div>
             
             {subcontractors.map((sub, index) => {
               const availableTasks = (settings.subcontractors || []).filter((s:any) => s.company === sub.company).map((s:any) => s.task);

               return (
                 <div key={index} className="p-4 border-2 rounded-2xl bg-slate-50 space-y-3">
                   <div className="grid grid-cols-2 gap-3">
                     <div>
                       <label className="text-sm font-bold text-slate-950 block mb-1">外注会社名</label>
                       <select className="w-full p-3 rounded-xl border-2 font-bold text-base bg-white text-slate-950" value={sub.company} onChange={(e)=>{
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
                       <label className="text-sm font-bold text-slate-950 block mb-1">作業内容</label>
                       <select className="w-full p-3 rounded-xl border-2 font-bold text-base bg-white text-slate-950" value={sub.task} onChange={(e)=>{
                         const updated = [...subcontractors]; updated[index].task = e.target.value; setSubcontractors(updated);
                       }}>
                         <option value="">内容を選択...</option>
                         {availableTasks.map((t:any, idx:number)=><option key={idx} value={t}>{t}</option>)}
                       </select>
                     </div>
                   </div>
                   <div className="flex items-end gap-3">
                     <div className="flex-1">
                       <label className="text-sm font-bold text-slate-950 block mb-1">人数</label>
                       <input type="number" placeholder="0" className="w-full p-3 rounded-xl border-2 font-bold text-lg bg-white text-slate-950" value={sub.count} onChange={(e)=>{
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

           {/* 🚛 自社保有（重機・車両） */}
           <div className="space-y-4 bg-emerald-50/70 p-5 rounded-3xl border-2 border-emerald-200">
             <div className="text-sm font-black text-emerald-950 bg-emerald-200 px-4 py-2 rounded-xl inline-block">
               🚛 自社保有（重機・車両）
             </div>

             <div className="space-y-2">
               <label className="text-sm font-bold text-slate-950 block">【自社重機】</label>
               <div className="grid grid-cols-2 gap-3">
                 {(settings.companyMachines || []).map((m:any) => (
                   <button type="button" key={m.name} onClick={() => toggleSelection(selectedOwnMachines, m.name, setSelectedOwnMachines)}
                   className={`p-4 rounded-2xl font-bold border-2 text-base sm:text-sm text-center break-words transition ${selectedOwnMachines.includes(m.name) ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white text-slate-900 border-slate-300'}`}>{m.name}</button>
                 ))}
               </div>
             </div>

             <div className="space-y-2 pt-2">
               <label className="text-sm font-bold text-slate-950 block">【自社車両（乗用車・トラック）】</label>
               <div className="grid grid-cols-2 gap-3">
                 {(settings.vehicles || []).map((v:any) => (
                   <button type="button" key={v.name} onClick={() => toggleSelection(selectedVehicles, v.name, setSelectedVehicles)}
                   className={`p-4 rounded-2xl font-bold border-2 text-base sm:text-sm text-center break-words transition ${selectedVehicles.includes(v.name) ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white text-slate-900 border-slate-300'}`}>{v.name}</button>
                 ))}
               </div>
             </div>
           </div>

           {/* ■ 南大阪建機（MOK）リース */}
           <div className="space-y-4 bg-blue-50/70 p-5 rounded-3xl border-2 border-blue-200">
             <div className="text-sm font-black text-blue-950 bg-blue-200 px-4 py-2 rounded-xl inline-block">
               🏢 南大阪建機（MOK）からのリース
             </div>

             {/* 重機を選択ボタン */}
             <div className="space-y-1">
               <button 
                 type="button" 
                 onClick={() => setIsOpenHeavy(!isOpenHeavy)} 
                 className="w-full text-left p-4 bg-white border-2 border-blue-200 rounded-2xl font-bold text-base text-slate-950 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 shadow-xs hover:bg-blue-50 transition"
               >
                 <span>【重機を選択する】</span>
                 {leaseHeavy.length > 0 && <span className="bg-blue-600 text-white text-xs px-3 py-1 rounded-full w-fit font-bold">{leaseHeavy.length}選定中</span>}
                 <span className="text-sm font-bold text-slate-500 sm:ml-auto">{isOpenHeavy ? '▲ 閉じる' : '▼ 開く'}</span>
               </button>
               {isOpenHeavy && (
                 <div className="grid grid-cols-2 gap-3 pt-2 animate-fadeIn">
                   {(settings.leaseHeavy || []).map((m:any) => (
                     <button type="button" key={m.name} onClick={() => toggleSelection(leaseHeavy, m.name, setLeaseHeavy)}
                     className={`p-4 rounded-2xl font-bold border-2 text-base sm:text-sm text-center break-words transition ${leaseHeavy.includes(m.name) ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white text-slate-900 border-slate-300'}`}>{m.name}</button>
                   ))}
                 </div>
               )}
             </div>

             {/* アタッチメントを選択ボタン */}
             <div className="space-y-1 pt-2">
               <button 
                 type="button" 
                 onClick={() => setIsOpenAttach(!isOpenAttach)} 
                 className="w-full text-left p-4 bg-white border-2 border-blue-200 rounded-2xl font-bold text-base text-slate-950 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 shadow-xs hover:bg-blue-50 transition"
               >
                 <span>【アタッチメントを選択する】</span>
                 {leaseAttach.length > 0 && <span className="bg-blue-600 text-white text-xs px-3 py-1 rounded-full w-fit font-bold">{leaseAttach.length}選定中</span>}
                 <span className="text-sm font-bold text-slate-500 sm:ml-auto">{isOpenAttach ? '▲ 閉じる' : '▼ 開く'}</span>
               </button>
               {isOpenAttach && (
                 <div className="grid grid-cols-2 gap-3 pt-2 animate-fadeIn">
                   {(settings.leaseAttach || []).map((m:any) => (
                     <button type="button" key={m.name} onClick={() => toggleSelection(leaseAttach, m.name, setLeaseAttach)}
                     className={`p-4 rounded-2xl font-bold border-2 text-base sm:text-sm text-center break-words transition ${leaseAttach.includes(m.name) ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white text-slate-900 border-slate-300'}`}>{m.name}</button>
                   ))}
                 </div>
               )}
             </div>

             {/* その他の機械・機器を選択ボタン */}
             <div className="space-y-1 pt-2">
               <button 
                 type="button" 
                 onClick={() => setIsOpenOther(!isOpenOther)} 
                 className="w-full text-left p-4 bg-white border-2 border-blue-200 rounded-2xl font-bold text-base text-slate-950 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 shadow-xs hover:bg-blue-50 transition"
               >
                 <span>【その他の機械・機器を選択する】</span>
                 {leaseOther.length > 0 && <span className="bg-blue-600 text-white text-xs px-3 py-1 rounded-full w-fit font-bold">{leaseOther.length}選定中</span>}
                 <span className="text-sm font-bold text-slate-500 sm:ml-auto">{isOpenOther ? '▲ 閉じる' : '▼ 開く'}</span>
               </button>
               {isOpenOther && (
                 <div className="grid grid-cols-2 gap-3 pt-2 animate-fadeIn">
                   {(settings.leaseOther || []).map((m:any) => (
                     <button type="button" key={m.name} onClick={() => toggleSelection(leaseOther, m.name, setLeaseOther)}
                     className={`p-4 rounded-2xl font-bold border-2 text-base sm:text-sm text-center break-words transition ${leaseOther.includes(m.name) ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white text-slate-900 border-slate-300'}`}>{m.name}</button>
                   ))}
                 </div>
               )}
             </div>

             {/* 🏢 リストにない機械を自由に追加できる機能 */}
             <div className="pt-3 border-t border-blue-200 space-y-3">
               <div className="flex justify-between items-center gap-3">
                 <span className="text-sm md:text-base font-black text-blue-950">リストにない機械の追加</span>
                 <button type="button" onClick={() => setMokCustomMachines([...mokCustomMachines, {name: '', count: ''}])} className="bg-blue-600 text-white text-xs md:text-sm px-4 py-2.5 rounded-xl font-bold shadow hover:bg-blue-700 transition shrink-0">＋ 追加</button>
               </div>
               {mokCustomMachines.map((cm, index) => (
                 <div key={index} className="flex flex-col gap-2 bg-white p-3.5 rounded-2xl border-2 border-blue-300 shadow-xs">
                   <input type="text" placeholder="機械名を入力" value={cm.name} onChange={e=>{
                     const updated = [...mokCustomMachines]; updated[index].name = e.target.value; setMokCustomMachines(updated);
                   }} className="w-full p-3 border-2 rounded-xl font-bold text-base bg-white text-slate-950" />
                   
                   <div className="grid grid-cols-2 gap-2 items-center">
                     <input type="number" placeholder="個数" value={cm.count} onChange={e=>{
                       const updated = [...mokCustomMachines]; updated[index].count = e.target.value; setMokCustomMachines(updated);
                     }} className="w-full p-3 border-2 rounded-xl font-bold text-base bg-white text-slate-950" />
                     <button type="button" onClick={() => setMokCustomMachines(mokCustomMachines.filter((_,i)=>i!==index))} className="w-full bg-red-100 text-red-700 py-3 rounded-xl font-bold text-sm hover:bg-red-200 transition text-center">削除</button>
                   </div>
                 </div>
               ))}
             </div>
           </div>

           {/* ■ その他（MOK以外からのリース） */}
           <div className="space-y-3 bg-amber-50/70 p-5 rounded-3xl border-2 border-amber-200">
             <div className="flex justify-between items-start gap-3">
               <div className="text-base md:text-lg font-black text-amber-950 bg-amber-200 px-4 py-2.5 rounded-xl leading-relaxed">
                 📦 その他<br />
                 <span className="text-xs md:text-sm font-bold">（MOK以外からのリース）</span>
               </div>
               <button type="button" onClick={() => setOtherLeases([...otherLeases, {company: '', name: '', count: ''}])} className="bg-emerald-600 text-white text-sm md:text-base px-4 py-2.5 rounded-xl font-bold shadow hover:bg-emerald-700 transition shrink-0">＋ 追加</button>
             </div>
             {otherLeases.map((ol, index) => (
               <div key={index} className="flex flex-col gap-2 bg-white p-3.5 rounded-2xl border-2 border-amber-300 shadow-xs">
                 <input type="text" placeholder="リース会社名を入力" value={ol.company} onChange={e=>{
                   const updated = [...otherLeases]; updated[index].company = e.target.value; setOtherLeases(updated);
                 }} className="w-full p-3 border-2 rounded-xl font-bold text-base bg-white text-slate-950" />
                 
                 <input type="text" placeholder="重機・機械名" value={ol.name} onChange={e=>{
                   const updated = [...otherLeases]; updated[index].name = e.target.value; setOtherLeases(updated);
                 }} className="w-full p-3 border-2 rounded-xl font-bold text-base bg-white text-slate-950" />
                 
                 <div className="grid grid-cols-2 gap-2 items-center">
                   <input type="number" placeholder="個数" value={ol.count} onChange={e=>{
                     const updated = [...otherLeases]; updated[index].count = e.target.value; setOtherLeases(updated);
                   }} className="w-full p-3 border-2 rounded-xl font-bold text-base bg-white text-slate-950" />
                   <button type="button" onClick={() => setOtherLeases(otherLeases.filter((_,i)=>i!==index))} className="w-full bg-red-100 text-red-700 py-3 rounded-xl font-bold text-sm hover:bg-red-200 transition text-center">削除</button>
                 </div>
               </div>
             ))}
           </div>

        </div>

        {/* 4. 燃料・経費 */}
        <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-4">
           <div className="border-b pb-3">
             <span className="font-black text-lg text-orange-600">⛽ 4. 燃料・経費</span>
           </div>
           
           <div>
             <label className="text-base font-bold text-slate-950 block mb-2">【軽油 (L)】</label>
             <input type="number" placeholder="0" value={fuel} onChange={e=>setFuel(e.target.value)} className="w-full p-4 border-2 rounded-2xl font-bold text-xl bg-white text-slate-950" />
           </div>

           {/* ① レギュラー 購入分(円) の追加枠 */}
           <div>
             <label className="text-base font-bold text-slate-950 block mb-2">【レギュラー 購入分 (円)】</label>
             <input type="number" placeholder="0" value={regularPrice} onChange={e=>setRegularPrice(e.target.value)} className="w-full p-4 border-2 rounded-2xl font-bold text-xl bg-white text-slate-950" />
           </div>

           <div>
             <label className="text-base font-bold text-slate-950 block mb-2">【高速代・ETC (円)】</label>
             <input type="number" placeholder="0" value={etcPrice} onChange={e=>setEtcPrice(e.target.value)} className="w-full p-4 border-2 rounded-2xl font-bold text-xl bg-white text-slate-950" />
           </div>

           <div>
             <label className="text-base font-bold text-slate-950 block mb-2">【駐車場代 (円)】</label>
             <input type="number" placeholder="0" value={parkingPrice} onChange={e=>setParkingPrice(e.target.value)} className="w-full p-4 border-2 rounded-2xl font-bold text-xl bg-white text-slate-950" />
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
                 <label className="text-sm font-bold text-slate-950 block mb-1">処分場・品目</label>
                 <select className="w-full p-3.5 rounded-xl border-2 font-bold text-base bg-white text-slate-950" value={`${entry.location}|${entry.item}`} onChange={(e) => {
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
                   <label className="text-sm font-bold text-slate-950 block mb-1">数量</label>
                   <input type="number" placeholder="0" className="w-full p-3.5 rounded-xl border-2 font-bold text-xl bg-white text-slate-950" value={entry.quantity} onChange={(e)=>{
                     const updated = [...disposals]; updated[index].quantity = e.target.value; setDisposals(updated);
                   }}/>
                 </div>
                 <div className="pb-3 font-black text-base text-slate-800 shrink-0">{entry.unit || 't'}</div>
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
                 <label className="text-sm font-bold text-slate-950 block mb-1">スクラップ場・品目</label>
                 <select className="w-full p-3.5 rounded-xl border-2 font-bold text-base bg-white text-slate-950" value={`${entry.location}|${entry.item}`} onChange={(e) => {
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
                   <label className="text-sm font-bold text-slate-950 block mb-1">数量</label>
                   <input type="number" placeholder="0" className="w-full p-3.5 rounded-xl border-2 font-bold text-xl bg-white text-slate-950" value={entry.quantity} onChange={(e)=>{
                     const updated = [...scraps]; updated[index].quantity = e.target.value; setScraps(updated);
                   }}/>
                 </div>
                 <div className="pb-3 font-black text-base text-slate-800 shrink-0">{entry.unit || 't'}</div>
                 <button type="button" onClick={() => setScraps(scraps.filter((_,i)=>i!==index))} className="bg-red-100 text-red-700 px-4 py-3.5 rounded-xl font-bold text-sm hover:bg-red-200 transition shrink-0">削除</button>
               </div>
             </div>
           ))}
        </div>

        {/* その他 雑費・消耗品等 */}
        <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-4">
           <div className="font-black text-lg text-slate-950 border-b pb-3">📦 その他 雑費・消耗品等</div>
           <div>
             <label className="text-base font-bold text-slate-950 block mb-2">【品名・内容】</label>
             <input type="text" placeholder="例: コーナン" value={otherItem} onChange={e=>setOtherItem(e.target.value)} className="w-full p-4 border-2 rounded-2xl font-bold text-lg bg-white text-slate-950" />
           </div>
           <div>
             <label className="text-base font-bold text-slate-950 block mb-2">【金額 (円)】</label>
             <input type="number" placeholder="0" value={otherPrice} onChange={e=>setOtherPrice(e.target.value)} className="w-full p-4 border-2 rounded-2xl font-bold text-xl bg-white text-slate-950" />
           </div>
        </div>

        {/* 7. 本日の作業内容 */}
        <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-4">
           <div className="border-b pb-3">
             <span className="font-black text-lg text-orange-600">📝 7. 本日の作業内容</span>
           </div>
           <textarea placeholder="作業内容を入力してください" value={description} onChange={e=>setDescription(e.target.value)} className="w-full p-4 rounded-2xl border-2 h-40 font-bold text-lg outline-none bg-white text-slate-950" />
        </div>

        <button type="submit" className="w-full bg-[#E56312] text-white font-black text-2xl py-5 rounded-3xl shadow-xl hover:bg-orange-700 transition">
          📩 日報を送信する
        </button>

      </form>
    </div>
  );
}
