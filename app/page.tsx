'use client';
import { useState, useEffect } from 'react';

export default function Home() {
  const [settings, setSettings] = useState<any>({});

  const [date, setDate] = useState(() => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });

  const [location, setLocation] = useState('');
  const [manager, setManager] = useState('');
  const [selectedWorkers, setSelectedWorkers] = useState<string[]>([]);
  const [jobTypesCount, setJobTypesCount] = useState<{[key: string]: string}>({});

  const [subcontractors, setSubcontractors] = useState<{company: string, task: string, count: string}[]>([]);

  // 通常（南大阪建機等）のリース
  const [leaseHeavy, setLeaseHeavy] = useState<string[]>([]);
  const [leaseAttach, setLeaseAttach] = useState<string[]>([]);
  const [leaseOther, setLeaseOther] = useState<string[]>([]);

  const [isOpenHeavy, setIsOpenHeavy] = useState(false);
  const [isOpenAttach, setIsOpenAttach] = useState(false);
  const [isOpenOther, setIsOpenOther] = useState(false);

  // 石川県出張用のリース選択ステート（正しいマスタキー: ishikawaHeavy, ishikawaAttach, ishikawaOther に連動）
  const [isOpenIshikawa, setIsOpenIshikawa] = useState(false);
  const [ishikawaLeaseHeavy, setIshikawaLeaseHeavy] = useState<string[]>([]);
  const [ishikawaLeaseAttach, setIshikawaLeaseAttach] = useState<string[]>([]);
  const [ishikawaLeaseOther, setIshikawaLeaseOther] = useState<string[]>([]);
  const [isOpenIshikawaHeavy, setIsOpenIshikawaHeavy] = useState(false);
  const [isOpenIshikawaAttach, setIsOpenIshikawaAttach] = useState(false);
  const [isOpenIshikawaOther, setIsOpenIshikawaOther] = useState(false);

  const [mokCustomMachines, setMokCustomMachines] = useState<{name: string, count: string}[]>([]);
  const [otherLeases, setOtherLeases] = useState<{company: string, name: string, count: string}[]>([]);

  const [selectedOwnMachines, setSelectedOwnMachines] = useState<string[]>([]);
  const [selectedVehicles, setSelectedVehicles] = useState<string[]>([]);

  const [fuel, setFuel] = useState('');
  const [regularPrice, setRegularPrice] = useState('');
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
        jobTypes: jobTypesCount,
        subcontractors,
        leaseHeavy, leaseAttach, leaseOther,
        // 石川県用リースの送信データ（管理・編集側のマスタ構造に合わせて修正）
        ishikawaHeavy,
        ishikawaAttach: ishikawaLeaseAttach,
        ishikawaOther: ishikawaLeaseOther,
        ishikawaLeaseHeavy, ishikawaLeaseAttach, ishikawaLeaseOther,
        machines: leaseHeavy,
        mokCustomMachines,
        otherLeases,         
        ownMachines: selectedOwnMachines, vehicles: selectedVehicles, 
        fuel: fuel || '0', 
        regularPrice: regularPrice || '0',
        etcPrice: etcPrice || '0', 
        parkingPrice: parkingPrice || '0',
        otherItem, otherPrice: otherPrice || '0',
        disposals, scraps, workDescription: description,
        createdAt: new Date().toISOString()
      })
    });

    setSelectedWorkers([]); 
    setJobTypesCount({});
    setSubcontractors([]);
    setLeaseHeavy([]);
    setLeaseAttach([]);
    setLeaseOther([]);
    setIshikawaLeaseHeavy([]);
    setIshikawaLeaseAttach([]);
    setIshikawaLeaseOther([]);
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
  const uniqueDisposalLocations = Array.from(new Set((settings.disposalLocations || []).map((d:any) => d.location).filter(Boolean)));
  const uniqueScrapLocations = Array.from(new Set((settings.scrapLocations || []).map((s:any) => s.location).filter(Boolean)));

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
             <div className="w-full border-2 rounded-2xl bg-white overflow-hidden box-border">
               <input 
                 type="date" 
                 value={date} 
                 onChange={e=>setDate(e.target.value)} 
                 className="w-full p-4 font-bold text-lg bg-transparent text-slate-950 outline-none box-border block" 
               />
             </div>
           </div>

           <div>
             <label className="text-base font-bold text-slate-950 block mb-2">【現場名】</label>
             <select value={location} onChange={e=>setLocation(e.target.value)} className="w-full p-4 border-2 rounded-2xl font-bold text-lg bg-white text-slate-950 box-border block">
               <option value="">現場を選択してください</option>
               {(settings.locations || [])
                 .filter((l: any) => {
                   if (typeof l === 'object' && l !== null) {
                     return !l.isFinished;
                   }
                   return true;
                 })
                 .map((l: any) => {
                   const locName = typeof l === 'string' ? l : l.name;
                   return (
                     <option key={locName} value={locName}>
                       {locName}
                     </option>
                   );
                 })}
             </select>
           </div>

           <div>
             <label className="text-base font-bold text-slate-950 block mb-2">【職長】</label>
             <select value={manager} onChange={e=>setManager(e.target.value)} className="w-full p-4 border-2 rounded-2xl font-bold text-lg bg-white text-slate-950 box-border block">
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

           {(settings.jobTypes || []).length > 0 && (
             <div className="border-t pt-5 space-y-3">
               <span className="font-bold text-base text-slate-950 block">🏷️ 職種ごとの稼働人数入力</span>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                 {(settings.jobTypes || []).map((j: any) => (
                   <div key={j.name} className="p-3 bg-slate-50 border-2 rounded-2xl flex items-center justify-between gap-3">
                     <span className="font-bold text-sm text-slate-800">{j.name}</span>
                     <div className="flex items-center gap-1.5">
                       <input 
                         type="number" 
                         min="0"
                         placeholder="0"
                         className="w-24 p-2.5 border-2 rounded-xl text-center font-bold text-base bg-white"
                         value={jobTypesCount[j.name] || ''}
                         onChange={e => setJobTypesCount({ ...jobTypesCount, [j.name]: e.target.value })}
                       />
                       <span className="text-sm font-bold text-slate-600">人</span>
                     </div>
                   </div>
                 ))}
               </div>
             </div>
           )}

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
                       <select className="w-full max-w-full min-w-0 p-3 rounded-xl border-2 font-bold text-base bg-white text-slate-950 box-border block" value={sub.company} onChange={(e)=>{
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
                       <select className="w-full max-w-full min-w-0 p-3 rounded-xl border-2 font-bold text-base bg-white text-slate-950 box-border block" value={sub.task} onChange={(e)=>{
                         const updated = [...subcontractors]; updated[index].task = e.target.value; setSubcontractors(updated);
                       }}>
                         <option value="">内容を選択...</option>
                         {availableTasks.map((t:any, idx:number)=><option key={idx} value={t}>{t}</option>)}
                       </select>
                     </div>
                   </div>
                   <div className="flex items-end gap-3">
                     <div className="flex-1 min-w-0">
                       <label className="text-sm font-bold text-slate-950 block mb-1">人数</label>
                       <input type="number" placeholder="0" className="w-full max-w-full min-w-0 p-3 rounded-xl border-2 font-bold text-lg bg-white text-slate-950 box-border block" value={sub.count} onChange={(e)=>{
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

           {/* 自社保有 */}
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

           {/* 南大阪建機リース */}
           <div className="space-y-4 bg-blue-50/70 p-5 rounded-3xl border-2 border-blue-200">
             <div className="text-sm font-black text-blue-950 bg-blue-200 px-4 py-2 rounded-xl inline-block">
               🏢 南大阪建機（MOK）からのリース
             </div>

             <div className="space-y-1">
               <button 
                 type="button" 
                 onClick={() => setIsOpenHeavy(!isOpenHeavy)} 
                 className="w-full max-w-full text-left p-4 bg-white border-2 border-blue-200 rounded-2xl font-bold text-base text-slate-950 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 shadow-xs hover:bg-blue-50 transition box-border"
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

             <div className="space-y-1 pt-2">
               <button 
                 type="button" 
                 onClick={() => setIsOpenAttach(!isOpenAttach)} 
                 className="w-full max-w-full text-left p-4 bg-white border-2 border-blue-200 rounded-2xl font-bold text-base text-slate-950 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 shadow-xs hover:bg-blue-50 transition box-border"
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

             <div className="space-y-1 pt-2">
               <button 
                 type="button" 
                 onClick={() => setIsOpenOther(!isOpenOther)} 
                 className="w-full max-w-full text-left p-4 bg-white border-2 border-blue-200 rounded-2xl font-bold text-base text-slate-950 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 shadow-xs hover:bg-blue-50 transition box-border"
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
           </div>

           {/* 石川県出張用リース選択セクション（管理・編集側のマスタ情報: ishikawaHeavy, ishikawaAttach, ishikawaOther に完全連動） */}
           <div className="space-y-4 bg-indigo-50/70 p-5 rounded-3xl border-2 border-indigo-200">
             <button
               type="button"
               onClick={() => setIsOpenIshikawa(!isOpenIshikawa)}
               className="w-full text-left p-4 bg-indigo-600 text-white rounded-2xl font-black text-lg flex justify-between items-center shadow-md hover:bg-indigo-700 transition"
             >
               <span>🗾 石川県出張用リース機器</span>
               <span className="text-sm">{isOpenIshikawa ? '▲ 閉じる' : '▼ 開く'}</span>
             </button>

             {isOpenIshikawa && (
               <div className="space-y-3 pt-2 animate-fadeIn">
                 {/* 石川・重機 */}
                 <div>
                   <button type="button" onClick={() => setIsOpenIshikawaHeavy(!isOpenIshikawaHeavy)} className="w-full text-left p-3 bg-white border-2 border-indigo-200 rounded-xl font-bold text-sm flex justify-between items-center">
                     <span>【（石川県）重機を選択】</span>
                     {ishikawaLeaseHeavy.length > 0 && <span className="bg-indigo-600 text-white text-xs px-2 py-0.5 rounded-full">{ishikawaLeaseHeavy.length}選定中</span>}
                     <span>{isOpenIshikawaHeavy ? '▲' : '▼'}</span>
                   </button>
                   {isOpenIshikawaHeavy && (
                     <div className="grid grid-cols-2 gap-2 pt-2">
                       {(settings.ishikawaHeavy || []).map((m:any) => (
                         <button type="button" key={m.name} onClick={() => toggleSelection(ishikawaLeaseHeavy, m.name, setIshikawaLeaseHeavy)}
                         className={`p-3 rounded-xl font-bold border-2 text-sm transition ${ishikawaLeaseHeavy.includes(m.name) ? 'bg-indigo-900 text-white border-indigo-900' : 'bg-white text-slate-900 border-slate-300'}`}>{m.name}</button>
                       ))}
                     </div>
                   )}
                 </div>

                 {/* 石川・アタッチメント */}
                 <div>
                   <button type="button" onClick={() => setIsOpenIshikawaAttach(!isOpenIshikawaAttach)} className="w-full text-left p-3 bg-white border-2 border-indigo-200 rounded-xl font-bold text-sm flex justify-between items-center">
                     <span>【（石川県）アタッチメントを選択】</span>
                     {ishikawaLeaseAttach.length > 0 && <span className="bg-indigo-600 text-white text-xs px-2 py-0.5 rounded-full">{ishikawaLeaseAttach.length}選定中</span>}
                     <span>{isOpenIshikawaAttach ? '▲' : '▼'}</span>
                   </button>
                   {isOpenIshikawaAttach && (
                     <div className="grid grid-cols-2 gap-2 pt-2">
                       {(settings.ishikawaAttach || []).map((m:any) => (
                         <button type="button" key={m.name} onClick={() => toggleSelection(ishikawaLeaseAttach, m.name, setIshikawaLeaseAttach)}
                         className={`p-3 rounded-xl font-bold border-2 text-sm transition ${ishikawaLeaseAttach.includes(m.name) ? 'bg-indigo-900 text-white border-indigo-900' : 'bg-white text-slate-900 border-slate-300'}`}>{m.name}</button>
                       ))}
                     </div>
                   )}
                 </div>

                 {/* 石川・その他機械 */}
                 <div>
                   <button type="button" onClick={() => setIsOpenIshikawaOther(!isOpenIshikawaOther)} className="w-full text-left p-3 bg-white border-2 border-indigo-200 rounded-xl font-bold text-sm flex justify-between items-center">
                     <span>【（石川県）その他機械・機器を選択】</span>
                     {ishikawaLeaseOther.length > 0 && <span className="bg-indigo-600 text-white text-xs px-2 py-0.5 rounded-full">{ishikawaLeaseOther.length}選定中</span>}
                     <span>{isOpenIshikawaOther ? '▲' : '▼'}</span>
                   </button>
                   {isOpenIshikawaOther && (
                     <div className="grid grid-cols-2 gap-2 pt-2">
                       {(settings.ishikawaOther || []).map((m:any) => (
                         <button type="button" key={m.name} onClick={() => toggleSelection(ishikawaLeaseOther, m.name, setIshikawaLeaseOther)}
                         className={`p-3 rounded-xl font-bold border-2 text-sm transition ${ishikawaLeaseOther.includes(m.name) ? 'bg-indigo-900 text-white border-indigo-900' : 'bg-white text-slate-900 border-slate-300'}`}>{m.name}</button>
                       ))}
                     </div>
                   )}
                 </div>
               </div>
             )}
           </div>

        </div>

        {/* 4. 燃料・経費 */}
        <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-4">
           <div className="border-b pb-3">
             <span className="font-black text-lg text-orange-600">⛽ 4. 燃料・経費</span>
           </div>

           <div>
             <label className="text-base font-bold text-slate-950 block mb-2">【軽油 (L)】</label>
             <input type="number" placeholder="0" value={fuel} onChange={e=>setFuel(e.target.value)} className="w-full max-w-full min-w-0 p-4 border-2 rounded-2xl font-bold text-xl bg-white text-slate-950 box-border block" />
           </div>

           <div>
             <label className="text-base font-bold text-slate-950 block mb-2">【レギュラー 購入分 (円)】</label>
             <input type="number" placeholder="0" value={regularPrice} onChange={e=>setRegularPrice(e.target.value)} className="w-full max-w-full min-w-0 p-4 border-2 rounded-2xl font-bold text-xl bg-white text-slate-950 box-border block" />
           </div>

           <div>
             <label className="text-base font-bold text-slate-950 block mb-2">【高速代・ETC (円)】</label>
             <input type="number" placeholder="0" value={etcPrice} onChange={e=>setEtcPrice(e.target.value)} className="w-full max-w-full min-w-0 p-4 border-2 rounded-2xl font-bold text-xl bg-white text-slate-950 box-border block" />
           </div>

           <div>
             <label className="text-base font-bold text-slate-950 block mb-2">【駐車場代 (円)】</label>
             <input type="number" placeholder="0" value={parkingPrice} onChange={e=>setParkingPrice(e.target.value)} className="w-full max-w-full min-w-0 p-4 border-2 rounded-2xl font-bold text-xl bg-white text-slate-950 box-border block" />
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

           {disposals.map((entry, index) => {
             const availableItems = (settings.disposalLocations || []).filter((d:any) => d.location === entry.location);

             return (
               <div key={index} className="p-4 border-2 rounded-2xl bg-slate-50 space-y-3">
                 <div>
                   <label className="text-sm font-bold text-slate-950 block mb-1">① 処分場を選択</label>
                   <select className="w-full max-w-full min-w-0 p-3.5 rounded-xl border-2 font-bold text-base bg-white text-slate-950 box-border block" value={entry.location} onChange={(e) => {
                     const updated = [...disposals];
                     updated[index] = { location: e.target.value, item: '', quantity: entry.quantity, unit: 't' };
                     setDisposals(updated);
                   }}>
                     <option value="">処分場を選択...</option>
                     {uniqueDisposalLocations.map((loc:any, idx:number)=><option key={idx} value={loc}>{loc}</option>)}
                   </select>
                 </div>

                 {entry.location && (
                   <div>
                     <label className="text-sm font-bold text-slate-950 block mb-1">② 品目を選択</label>
                     <div className="grid grid-cols-2 gap-2 pt-1">
                       {availableItems.map((d:any, idx:number) => {
                         const isSelected = entry.item === d.item;
                         return (
                           <button
                             type="button"
                             key={idx}
                             onClick={() => {
                               const updated = [...disposals];
                               updated[index] = { ...updated[index], item: d.item, unit: d.unit || 't' };
                               setDisposals(updated);
                             }}
                             className={`p-3 rounded-xl font-bold border-2 text-sm text-center transition ${isSelected ? 'bg-orange-600 text-white border-orange-600 shadow-sm' : 'bg-white text-slate-900 border-slate-300'}`}
                           >
                             {d.item}
                           </button>
                         );
                       })}
                     </div>
                   </div>
                 )}

                 <div className="flex items-end gap-3 pt-2">
                   <div className="flex-1 min-w-0">
                     <label className="text-sm font-bold text-slate-950 block mb-1">数量</label>
                     <input type="number" placeholder="0" className="w-full max-w-full min-w-0 p-3.5 rounded-xl border-2 font-bold text-xl bg-white text-slate-950 box-border block" value={entry.quantity} onChange={(e)=>{
                       const updated = [...disposals]; updated[index].quantity = e.target.value; setDisposals(updated);
                     }}/>
                   </div>
                   <div className="pb-3 font-black text-base text-slate-800 shrink-0">{entry.unit || 't'}</div>
                   <button type="button" onClick={() => setDisposals(disposals.filter((_,i)=>i!==index))} className="bg-red-100 text-red-700 px-4 py-3.5 rounded-xl font-bold text-sm hover:bg-red-200 transition shrink-0">削除</button>
                 </div>
               </div>
             );
           })}
        </div>

        {/* 6. スクラップの搬出 */}
        <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-4">
           <div className="flex justify-between items-center border-b pb-3">
             <span className="font-black text-lg text-orange-600">♻️ 6. スクラップの搬出</span>
             <button type="button" onClick={() => setScraps([...scraps, {location: '', item: '', quantity: '', unit: 'kg'}])} className="bg-emerald-600 text-white text-sm px-4 py-2.5 rounded-xl font-bold shadow hover:bg-emerald-700 transition">＋ 追加する</button>
           </div>

           {scraps.length === 0 && (
             <p className="text-sm font-bold text-slate-400 text-center py-3">「追加する」ボタンを押して選択してください</p>
           )}

           {scraps.map((entry, index) => {
             const availableItems = (settings.scrapLocations || []).filter((s:any) => s.location === entry.location);

             return (
               <div key={index} className="p-4 border-2 rounded-2xl bg-slate-50 space-y-3">
                 <div>
                   <label className="text-sm font-bold text-slate-950 block mb-1">① スクラップ場を選択</label>
                   <select className="w-full max-w-full min-w-0 p-3.5 rounded-xl border-2 font-bold text-base bg-white text-slate-950 box-border block" value={entry.location} onChange={(e) => {
                     const updated = [...scraps];
                     updated[index] = { location: e.target.value, item: '', quantity: entry.quantity, unit: 'kg' };
                     setScraps(updated);
                   }}>
                     <option value="">スクラップ場を選択...</option>
                     {uniqueScrapLocations.map((loc:any, idx:number)=><option key={idx} value={loc}>{loc}</option>)}
                   </select>
                 </div>

                 {entry.location && (
                   <div>
                     <label className="text-sm font-bold text-slate-950 block mb-1">② 品目を選択</label>
                     <div className="grid grid-cols-2 gap-2 pt-1">
                       {availableItems.map((s:any, idx:number) => {
                         const isSelected = entry.item === s.item;
                         return (
                           <button
                             type="button"
                             key={idx}
                             onClick={() => {
                               const updated = [...scraps];
                               updated[index] = { ...updated[index], item: s.item, unit: s.unit || 'kg' };
                               setScraps(updated);
                             }}
                             className={`p-3 rounded-xl font-bold border-2 text-sm text-center transition ${isSelected ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'bg-white text-slate-900 border-slate-300'}`}
                           >
                             {s.item}
                           </button>
                         );
                       })}
                     </div>
                   </div>
                 )}

                 <div className="flex items-end gap-3 pt-2">
                   <div className="flex-1 min-w-0">
                     <label className="text-sm font-bold text-slate-950 block mb-1">数量</label>
                     <input type="number" placeholder="0" className="w-full max-w-full min-w-0 p-3.5 rounded-xl border-2 font-bold text-xl bg-white text-slate-950 box-border block" value={entry.quantity} onChange={(e)=>{
                       const updated = [...scraps]; updated[index].quantity = e.target.value; setScraps(updated);
                     }}/>
                   </div>
                   <div className="pb-3 font-black text-base text-slate-800 shrink-0">{entry.unit || 'kg'}</div>
                   <button type="button" onClick={() => setScraps(scraps.filter((_,i)=>i!==index))} className="bg-red-100 text-red-700 px-4 py-3.5 rounded-xl font-bold text-sm hover:bg-red-200 transition shrink-0">削除</button>
                 </div>
               </div>
             );
           })}
        </div>

        {/* その他 雑費・消耗品等 */}
        <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-4">
           <div className="font-black text-lg text-slate-950 border-b pb-3">📦 その他 雑費・消耗品等</div>
           <div>
             <label className="text-base font-bold text-slate-950 block mb-2">【品名・内容】</label>
             <input type="text" placeholder="例: コーナン" value={otherItem} onChange={e=>setOtherItem(e.target.value)} className="w-full max-w-full min-w-0 p-4 border-2 rounded-2xl font-bold text-lg bg-white text-slate-950 box-border block" />
           </div>
           <div>
             <label className="text-base font-bold text-slate-950 block mb-2">【金額 (円)】</label>
             <input type="number" placeholder="0" value={otherPrice} onChange={e=>setOtherPrice(e.target.value)} className="w-full max-w-full min-w-0 p-4 border-2 rounded-2xl font-bold text-xl bg-white text-slate-950 box-border block" />
           </div>
        </div>

        {/* 7. 本日の作業内容 */}
        <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-4">
           <div className="border-b pb-3">
             <span className="font-black text-lg text-orange-600">📝 7. 本日の作業内容</span>
           </div>
           <textarea placeholder="作業内容を入力してください" value={description} onChange={e=>setDescription(e.target.value)} className="w-full max-w-full min-w-0 p-4 rounded-2xl border-2 h-40 font-bold text-lg outline-none bg-white text-slate-950 box-border block" />
        </div>

        <button type="submit" className="w-full bg-[#E56312] text-white font-black text-2xl py-5 rounded-3xl shadow-xl hover:bg-orange-700 transition">
          📩 日報を送信する
        </button>

      </form>
    </div>
  );
}
