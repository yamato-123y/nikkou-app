'use client';

import { useEffect, useMemo, useState } from 'react';

type EstimateRow = { id: string; name: string; description: string; quantity: string; unit: string; unitPrice: string; note: string };
type Extra = { overhead: string; welfare: string; adjustment: string };
type Estimate = { id: string; title: string; customer: string; address: string; workPeriod: string; quoteDate: string; rows: EstimateRow[]; extra: Extra; createdAt: string; updatedAt: string };
const today = () => new Date().toLocaleDateString('sv-SE');
const uid = () => `est_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
const row = (name = ''): EstimateRow => ({id:uid(),name,description:'',quantity:name?'1':'',unit:name?'式':'',unitPrice:'',note:''});
const defaultRows = ['① 直接仮設工事','② アスベスト除去工事','③ 解体工事','④ 外構・その他撤去工事','⑤ 産業廃棄物運搬処分工事'].map(x=>row(x));
const fresh = (): Estimate => ({id:uid(),title:'',customer:'',address:'',workPeriod:'',quoteDate:today(),rows:defaultRows.map(x=>({...x,id:uid()})),extra:{overhead:'',welfare:'',adjustment:'0'},createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});
const MAX_ROWS = 12;
const num = (x: string) => Number(String(x||'').replace(/,/g,'')) || 0;
const money = (x: number) => `¥${Math.round(x).toLocaleString('ja-JP')}`;
const inputClass = 'w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-black outline-none focus:border-blue-500';
const buttonClass = 'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-black hover:bg-slate-50 disabled:opacity-40';

export default function EstimateEditor({onClose}: {onClose:()=>void}) {
  const [records,setRecords] = useState<Record<string,Estimate>>({});
  const [estimate,setEstimate] = useState<Estimate|null>(null);
  const [busy,setBusy] = useState(true);
  const [saving,setSaving] = useState(false);
  const [exporting,setExporting] = useState(false);
  const [dirty,setDirty] = useState(false);
  const [message,setMessage] = useState('');
  const [help,setHelp] = useState(false);

  useEffect(()=>{
    let live=true;
    fetch('/api/settings',{cache:'no-store'}).then(async res=>{
      if(!res.ok) throw new Error('保存済み見積りの読み込みに失敗しました');
      return res.json();
    }).then(data=>{
      if(!live)return;
      const list=data?.yamatoEstimates;
      setRecords(list && typeof list==='object' && !Array.isArray(list) ? list : {});
    }).catch(e=>{if(live)setMessage(String(e?.message||e))}).finally(()=>{if(live)setBusy(false)});
    return ()=>{live=false};
  },[]);

  const list=useMemo(()=>Object.values(records).filter(x=>x&&x.id).sort((a,b)=>String(b.updatedAt||'').localeCompare(String(a.updatedAt||''))),[records]);
  const update = (patch:Partial<Estimate>)=>{setEstimate(old=>old?{...old,...patch}:old);setDirty(true);setMessage('')};
  const changeRow = (id:string,key:keyof EstimateRow,value:string)=>{
    if(!estimate)return;
    update({rows:estimate.rows.map(r=>r.id===id?{...r,[key]:value}:r)});
  };
  const changeExtra=(key:keyof Extra,value:string)=>{
    if(!estimate)return;
    update({extra:{...estimate.extra,[key]:value}});
  };
  const selectEstimate=(id:string)=>{
    if(dirty&&!window.confirm('保存していない変更があります。切り替えますか？'))return;
    setEstimate(id==='new'?fresh():JSON.parse(JSON.stringify(records[id])));
    setDirty(false);setMessage('');
  };
  const close=()=>{if(dirty&&!window.confirm('保存していない変更があります。閉じますか？'))return;onClose()};
  const sums=useMemo(()=>{
    const base=(estimate?.rows||[]).reduce((sum,r)=>sum+num(r.quantity)*num(r.unitPrice),0);
    const extra=(['overhead','welfare','adjustment'] as const).reduce((sum,k)=>sum+num(estimate?.extra[k]||''),0);
    const subtotal=Math.round(base+extra);
    const tax=Math.floor(subtotal*.1);
    return {subtotal,tax,total:subtotal+tax};
  },[estimate]);
  const save=async()=>{
    if(!estimate||saving)return;
    if(!estimate.title.trim()){setMessage('工事名を入力してください。');return}
    setSaving(true);setMessage('');
    try{
      const res=await fetch('/api/settings',{cache:'no-store'});
      if(!res.ok)throw new Error('最新データが読めないため、保存を中止しました。');
      const latest=await res.json();
      if(!latest||typeof latest!=='object'||Array.isArray(latest))throw new Error('設定データを確認できませんでした。');
      const latestEstimates=latest.yamatoEstimates && typeof latest.yamatoEstimates==='object' && !Array.isArray(latest.yamatoEstimates)?latest.yamatoEstimates:{};
      const item={...estimate,updatedAt:new Date().toISOString()};
      const merged={...latestEstimates,[item.id]:item};
      const saved=await fetch('/api/settings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...latest,yamatoEstimates:merged})});
      if(!saved.ok)throw new Error('保存できませんでした。');
      setRecords(merged);setEstimate(item);setDirty(false);setMessage('保存しました。');
    }catch(e:any){setMessage(`⚠ ${String(e?.message||e)}`)}finally{setSaving(false)}
  };
  const duplicate=()=>{
    if(!estimate)return;
    const copy={...estimate,id:uid(),title:`${estimate.title}（コピー）`,rows:estimate.rows.map(r=>({...r,id:uid()})),createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
    setEstimate(copy);setDirty(true);setMessage('複製しました。保存すると別の見積書になります。');
  };
  const exportExcel=async()=>{
    if(!estimate||exporting)return;
    if(!estimate.title.trim()){setMessage('工事名を入力してください。');return;}
    setExporting(true);setMessage('');
    try{
      const res=await fetch('/api/estimate-export',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({estimate})});
      if(!res.ok){const j=await res.json().catch(()=>({}));throw new Error(j.error||'Excelを作成できませんでした');}
      const blob=await res.blob();
      const url=URL.createObjectURL(blob);
      const a=document.createElement('a');a.href=url;a.download=`大和_見積書_${estimate.title.replace(/[\\/:*?"<>|]/g,'_').slice(0,48)}.xlsx`;
      document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
      setMessage('Excelを書き出しました。数字と印影を確認してください。');
    }catch(e:any){setMessage(`⚠ ${String(e?.message||e)}`)}finally{setExporting(false)}
  };
  return <div className="fixed inset-0 z-[120] overflow-y-auto bg-slate-900/70 p-2 md:p-6" role="dialog" aria-modal="true" aria-label="大和 見積書作成">
    <div className="mx-auto max-w-[1450px] rounded-2xl bg-slate-50 shadow-2xl text-black">
      <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-2 rounded-t-2xl border-b border-slate-200 bg-white px-4 py-3">
        <div><h2 className="text-xl font-normal text-black">🧾 見積書作成（試作版）</h2><p className="text-xs text-slate-500">大和の見積書ひな形に書き出し</p></div>
        <div className="flex flex-wrap items-center gap-2">
          <button className={buttonClass} onClick={()=>setHelp(!help)}>ⓘ 使い方</button>
          <span className={`text-sm ${dirty?'text-amber-700':'text-emerald-700'}`}>{saving?'保存中…':dirty?'● 未保存':'✓ 保存済み'}</span>
          <button className={buttonClass} onClick={close}>閉じる ✕</button>
        </div>
      </div>
      {help&&<div className="mx-4 mt-3 rounded-lg border border-slate-200 bg-white p-3 text-sm leading-7 text-slate-700">見積先・工事名・明細の数量と単価を入力してください。合計は自動計算します。保存すれば次回また編集できます。「Excel出力」は現在の大和のひな形を使います。<br/>最初の試作版は内訳の12行と諸経費・福利厚生費・調整費に対応しています。ひな形の「①」の詳しい明細ページは、次の段階で編集できるようにします。</div>}
      <div className="grid gap-4 p-4 lg:grid-cols-[245px_minmax(0,1fr)]">
        <aside className="min-w-0 rounded-xl border border-slate-200 bg-white p-3">
          <button className="w-full rounded-lg bg-slate-900 p-3 text-sm font-normal text-white hover:bg-slate-700" onClick={()=>selectEstimate('new')} disabled={busy}>＋ 新しい見積書</button>
          <h3 className="mt-5 mb-2 text-sm text-slate-600">保存済みの見積書</h3>
          {busy?<p className="text-sm text-slate-500">読み込み中…</p>:list.length===0?<p className="text-sm text-slate-500">まだありません</p>:<div className="space-y-1">{list.map(item=><button key={item.id} onClick={()=>selectEstimate(item.id)} className={`w-full rounded-lg border px-3 py-2 text-left text-sm font-normal ${estimate?.id===item.id?'border-blue-400 bg-blue-50':'border-slate-200 bg-white hover:bg-slate-50'}`}><span className="block break-words text-black">{item.title||'名称未設定'}</span><span className="block text-xs text-slate-500">{item.customer||'見積先未設定'}</span></button>)}</div>}
        </aside>
        <main className="min-w-0 space-y-4">
          {!estimate?<div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">「＋ 新しい見積書」または保存済みの見積書を選んでください。</div>:<>
            <section className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="mb-3 text-base font-normal text-black">基本情報</h3>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <label className="text-sm text-slate-700">工事名<input className={inputClass} value={estimate.title} onChange={e=>update({title:e.target.value})} placeholder="○○解体工事"/></label>
                <label className="text-sm text-slate-700">見積先<input className={inputClass} value={estimate.customer} onChange={e=>update({customer:e.target.value})} placeholder="○○建設株式会社"/></label>
                <label className="text-sm text-slate-700">見積日<input className={inputClass} type="date" value={estimate.quoteDate} onChange={e=>update({quoteDate:e.target.value})}/></label>
                <label className="text-sm text-slate-700">施工場所<input className={inputClass} value={estimate.address} onChange={e=>update({address:e.target.value})} placeholder="大阪府○○市"/></label>
                <label className="text-sm text-slate-700 md:col-span-2">工期<input className={inputClass} value={estimate.workPeriod} onChange={e=>update({workPeriod:e.target.value})} placeholder="2026年11月〜2027年3月"/></label>
              </div>
            </section>
            <section className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h3 className="text-base font-normal text-black">工事の内訳</h3><span className="text-xs text-slate-500">{estimate.rows.length} / {MAX_ROWS} 行</span></div>
              <div className="overflow-x-auto"><table className="w-full min-w-[900px] border-collapse text-sm font-normal"><thead><tr className="bg-slate-100 text-slate-700">{['順','名称','形状・寸法','数量','単位','単価','金額','備考','移動・削除'].map(s=><th key={s} className="border border-slate-200 p-2 font-normal">{s}</th>)}</tr></thead><tbody>{estimate.rows.map((r,i)=><tr key={r.id}>
                <td className="border border-slate-200 px-2 text-center text-slate-500">{i+1}</td>
                <td className="border border-slate-200 p-1"><input className={`${inputClass} min-w-[155px]`} value={r.name} onChange={e=>changeRow(r.id,'name',e.target.value)}/></td>
                <td className="border border-slate-200 p-1"><input className={inputClass} value={r.description} onChange={e=>changeRow(r.id,'description',e.target.value)}/></td>
                <td className="border border-slate-200 p-1"><input className={`${inputClass} w-20`} inputMode="decimal" value={r.quantity} onChange={e=>changeRow(r.id,'quantity',e.target.value)}/></td>
                <td className="border border-slate-200 p-1"><input className={`${inputClass} w-16`} value={r.unit} onChange={e=>changeRow(r.id,'unit',e.target.value)}/></td>
                <td className="border border-slate-200 p-1"><input className={`${inputClass} w-28`} inputMode="decimal" value={r.unitPrice} onChange={e=>changeRow(r.id,'unitPrice',e.target.value)}/></td>
                <td className="border border-slate-200 px-2 text-right whitespace-nowrap">{money(num(r.quantity)*num(r.unitPrice))}</td>
                <td className="border border-slate-200 p-1"><input className={inputClass} value={r.note} onChange={e=>changeRow(r.id,'note',e.target.value)}/></td>
                <td className="border border-slate-200 px-1"><div className="flex gap-1"><button className={buttonClass} aria-label="上へ" disabled={i===0} onClick={()=>{const a=[...estimate.rows];[a[i-1],a[i]]=[a[i],a[i-1]];update({rows:a})}}>↑</button><button className={buttonClass} aria-label="下へ" disabled={i===estimate.rows.length-1} onClick={()=>{const a=[...estimate.rows];[a[i+1],a[i]]=[a[i],a[i+1]];update({rows:a})}}>↓</button><button className={buttonClass} onClick={()=>update({rows:estimate.rows.filter(x=>x.id!==r.id)})}>削除</button></div></td>
              </tr>)}</tbody></table></div>
              <button className={`${buttonClass} mt-3`} disabled={estimate.rows.length>=MAX_ROWS} onClick={()=>update({rows:[...estimate.rows,row()]})}>＋ 内訳行を追加</button>
            </section>
            <section className="rounded-xl border border-slate-200 bg-white p-4"><h3 className="mb-3 text-base font-normal text-black">その他の金額</h3>
              <div className="grid gap-3 sm:grid-cols-3">{([['overhead','諸経費'],['welfare','福利厚生費'],['adjustment','調整費']] as [keyof Extra,string][]).map(([key,label])=><label key={key} className="text-sm text-slate-700">{label}（円）<input className={inputClass} inputMode="decimal" value={estimate.extra[key]} onChange={e=>changeExtra(key,e.target.value)}/></label>)}</div>
            </section>
            <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4"><div className="flex flex-wrap items-center gap-5 text-sm"><span>小計：{money(sums.subtotal)}</span><span>消費税（10%）：{money(sums.tax)}</span><span className="text-lg text-black">合計：{money(sums.total)}</span></div><div className="flex flex-wrap gap-2"><button className={buttonClass} onClick={duplicate}>複製</button><button className="rounded-lg bg-blue-700 px-5 py-2 text-sm font-normal text-white disabled:opacity-40" disabled={!dirty||saving||busy} onClick={save}>{saving?'保存中…':'💾 保存'}</button><button className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-normal text-white disabled:opacity-40" disabled={exporting} onClick={exportExcel}>{exporting?'出力中…':'📄 Excel出力'}</button></div></section>
          </>}
          {message&&<p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-slate-700">{message}</p>}
        </main>
      </div>
    </div>
  </div>;
}
