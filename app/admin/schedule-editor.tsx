'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx-js-style';

type Task = { id: string; name: string; start: string; end: string; vendor: string };
type Plan = { location: string; manager: string; start: string; end: string; tasks: Task[]; updatedAt?: string };
type Drag = { id: string; type: 'new' | 'move' | 'left' | 'right'; startX: number; startIndex: number; initialStart: string; initialEnd: string };
type Scale = 'month' | 'week' | 'day';
type TimeCell = { start: string; end: string; label: string; major: boolean };

const DAY = 86400000;
const CELL_WIDTH: Record<Scale,number> = { month: 96, week: 48, day: 32 };
const fmt = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
const parse = (s: string) => new Date(`${s}T00:00:00Z`);
const plus = (s: string, n: number) => fmt(new Date(parse(s).getTime() + n*DAY));
// 月単位で動かす時は、31日など存在しない日付を月末に収める。
const plusMonths = (s: string, n: number) => {
  const d = parse(s);
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth()+n, 1));
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth()+1, 0)).getUTCDate();
  return fmt(new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), Math.min(last,d.getUTCDate()))));
};
const shiftByScale = (date: string, amount: number, scale: Scale) => scale === 'month' ? plusMonths(date,amount) : plus(date,amount*(scale==='week'?7:1));
const diff = (a: string, b: string) => Math.round((parse(b).getTime() - parse(a).getTime())/DAY);
const firstOfMonth = (d = new Date()) => fmt(new Date(Date.UTC(d.getFullYear(),d.getMonth(),1)));
const lastMonthDay = (start: string, count: number) => fmt(new Date(Date.UTC(parse(start).getUTCFullYear(),parse(start).getUTCMonth()+count,0)));
const uid = () => `sch_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
const safeTasks = (v: any): Task[] => Array.isArray(v) ? v.filter((x: any) => x && typeof x === 'object').map((x: any) => ({id: String(x.id || uid()),name: String(x.name || ''),start:String(x.start || ''),end:String(x.end || ''),vendor:String(x.vendor || '')})).filter((x: Task) => /^\d{4}-\d{2}-\d{2}$/.test(x.start)&&/^\d{4}-\d{2}-\d{2}$/.test(x.end)) : [];
const btn = 'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-black hover:bg-slate-50 disabled:opacity-40';

export default function ScheduleEditor({ locations, workers, onClose }: { locations: any[]; workers: any[]; onClose: () => void }) {
  const names = useMemo(() => Array.from(new Set((locations || []).map((x: any) => String(typeof x === 'string' ? x : x?.name || '')).filter(Boolean))), [locations]);
  const [location, setLocation] = useState('');
  const [plan, setPlan] = useState<Plan | null>(null);
  const [savedPlans, setSavedPlans] = useState<Record<string,Plan>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState('');
  const [viewStart, setViewStart] = useState(firstOfMonth());
  const [months, setMonths] = useState(6);
  const [scale, setScale] = useState<Scale>('week');
  const [selected, setSelected] = useState<string | null>(null);
  const [dragging, setDragging] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const rowRef = useRef<HTMLDivElement | null>(null);
  const planRef = useRef<Plan | null>(null);
  useEffect(()=>{planRef.current=plan},[plan]);

  useEffect(() => {
    let alive=true;
    fetch('/api/settings', {cache:'no-store'}).then(async r=>{if(!r.ok) throw new Error('読み込みに失敗しました');return r.json()}).then(data=>{
      if(!alive)return;
      const records = data?.constructionSchedules && typeof data.constructionSchedules === 'object' && !Array.isArray(data.constructionSchedules) ? data.constructionSchedules : {};
      setSavedPlans(records);
    }).catch(()=>{if(alive)setMessage('工程表を読み込めませんでした。保存する前に再度開いてください。')}).finally(()=>{if(alive)setLoading(false)});
    return ()=>{alive=false};
  },[]);

  const begin = (loc: string, records = savedPlans) => {
    if (dirty && !window.confirm('保存していない変更があります。現場を切り替えますか？')) return;
    const record=records[loc];
    const start=record?.start || firstOfMonth();
    const end=record?.end || lastMonthDay(start,6);
    setLocation(loc);
    setPlan({location:loc,manager:String(record?.manager||''),start,end,tasks:safeTasks(record?.tasks)});
    setViewStart(start.slice(0,7)+'-01');
    setSelected(null);
    setDirty(false);setMessage('');
  };
  const patch = (change: Partial<Plan>) => {setPlan(old=>old?{...old,...change}:old);setDirty(true);setMessage('')};
  const patchTask = (id: string, change: Partial<Task>) => setPlan(old=>{
    if(!old)return old;
    return {...old,tasks:old.tasks.map(t=>t.id===id?{...t,...change}:t)};
  });
  const modifyTask = (id: string, change: Partial<Task>) => {patchTask(id,change);setDirty(true);setMessage('')};
  const addTask = (start?: string, end?: string) => {
    if(!plan)return;
    const id=uid(); const s=start||viewStart;
    patch({tasks:[...plan.tasks,{id,name:'新しい工程',vendor:'',start:s,end:end||plus(s,6)}]});setSelected(id);
  };
  const reorder = (fromId: string, toId: string) => {
    if(fromId===toId||!plan)return;
    const next=[...plan.tasks];const from=next.findIndex(t=>t.id===fromId);const to=next.findIndex(t=>t.id===toId);
    if(from<0||to<0)return;
    const [item]=next.splice(from,1);next.splice(to,0,item);
    patch({tasks:next});
  };

  // 表示単位を切り替えても、工程の日付・保存データは変更しない。
  const cells = useMemo<TimeCell[]>(() => {
    const last = lastMonthDay(viewStart,months);
    const result: TimeCell[] = [];
    let current = viewStart;
    while (current <= last && result.length < 370) {
      if (scale === 'month') {
        const end = lastMonthDay(current,1);
        result.push({start:current,end: end>last?last:end,label:`${Number(current.slice(5,7))}月`,major:true});
        current=plus(end,1);
      } else if (scale === 'week') {
        const end = plus(current,6);
        const d = parse(current);
        result.push({start:current,end:end>last?last:end,label:`${d.getUTCMonth()+1}/${d.getUTCDate()}`,major:d.getUTCDate()<=7});
        current=plus(current,7);
      } else {
        const d=parse(current);
        result.push({start:current,end:current,label:`${d.getUTCDate()}`,major:d.getUTCDate()===1});
        current=plus(current,1);
      }
    }
    return result;
  },[viewStart,months,scale]);
  const cellWidth=CELL_WIDTH[scale];
  const width=cells.length*cellWidth;
  const cellIndex=(x:number)=>Math.max(0,Math.min(cells.length-1,Math.floor(x/cellWidth)));
  const taskPosition = (date:string, endOfDay=false) => {
    if (date<viewStart) return 0;
    const last=cells[cells.length-1];
    if (last && date>last.end) return width;
    if(scale==='day') return Math.max(0,Math.min(width,(diff(viewStart,date)+(endOfDay?1:0))*cellWidth));
    const i=cells.findIndex(c=>date>=c.start && date<=c.end);
    if(i<0)return 0;
    if(scale==='month') {
      const length=diff(cells[i].start,cells[i].end)+1;
      return (i+((diff(cells[i].start,date)+(endOfDay?1:0))/length))*cellWidth;
    }
    return (i+(diff(cells[i].start,date)+(endOfDay?1:0))/7)*cellWidth;
  };
  const openDrag = (e: React.PointerEvent, id: string, type: Drag['type'], index=0) => {
    if(e.button!==0 || !plan)return;
    e.preventDefault();e.stopPropagation();
    const task=plan.tasks.find(t=>t.id===id);
    const d:Drag={id,type,startX:e.clientX,startIndex:index,initialStart:task?.start||cells[index].start,initialEnd:task?.end||cells[index].end};
    dragRef.current=d;setDragging(d);setSelected(id);
  };
  useEffect(()=>{
    if(!dragging)return;
    const move=(e:PointerEvent)=>{
      const d=dragRef.current;
      if(!d)return;
      const shift=Math.round((e.clientX-d.startX)/cellWidth);
      const first=d.initialStart; const last=d.initialEnd;
      if(d.type==='new') {
        const x=Math.max(0,Math.min(cells.length-1,d.startIndex+shift));
        const left=cells[Math.min(d.startIndex,x)].start,right=cells[Math.max(d.startIndex,x)].end;
        patchTask(d.id,{start:left,end:right});
      } else if(d.type==='move') patchTask(d.id,{start:shiftByScale(first,shift,scale),end:shiftByScale(last,shift,scale)});
      else if(d.type==='left') {
        const candidate=shiftByScale(first,shift,scale);
        patchTask(d.id,{start:candidate>last?last:candidate,end:last});
      }
      else {
        const candidate=shiftByScale(last,shift,scale);
        patchTask(d.id,{start:first,end:candidate<first?first:candidate});
      }
      setDirty(true);
    };
    const end=()=>{dragRef.current=null;setDragging(null)};
    window.addEventListener('pointermove',move);window.addEventListener('pointerup',end);window.addEventListener('pointercancel',end);
    return()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',end);window.removeEventListener('pointercancel',end)};
  },[dragging,cells,scale,cellWidth]);
  const createByDraw = (e:React.PointerEvent<HTMLDivElement>) => {
    if(e.button!==0||!plan)return;
    const rect=e.currentTarget.getBoundingClientRect();const index=cellIndex(e.clientX-rect.left);
    const id=uid();const date=cells[index].start;
    patch({tasks:[...plan.tasks,{id,name:'新しい工程',vendor:'',start:date,end:cells[index].end}]});setSelected(id);
    e.preventDefault();
    const d:Drag={id,type:'new',startX:e.clientX,startIndex:index,initialStart:date,initialEnd:date};
    dragRef.current=d;setDragging(d);
  };

  const save = async () => {
    if(!plan||saving||loading)return;
    if(plan.tasks.some(t=>!t.name.trim()||t.end<t.start)){alert('工程名と日付を確認してください。');return}
    setSaving(true);setMessage('');
    try {
      const r=await fetch('/api/settings',{cache:'no-store'});
      if(!r.ok)throw new Error('最新データを取得できませんでした');
      const latest=await r.json();
      if(!latest||typeof latest!=='object'||Array.isArray(latest))throw new Error('保存できませんでした');
      const schedules={...(latest.constructionSchedules || {}),[location]:{...plan,updatedAt:new Date().toISOString()}};
      const saved=await fetch('/api/settings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...latest,constructionSchedules:schedules})});
      if(!saved.ok)throw new Error('保存に失敗しました');
      setSavedPlans(schedules);setDirty(false);setMessage('保存しました');
    } catch(e:any){setMessage(`${e?.message||'保存に失敗しました'}。変更は画面に残っています。`)}
    finally{setSaving(false)}
  };
  const close = () => {if(dirty&&!window.confirm('工程表が未保存です。閉じますか？'))return;onClose()};
  useEffect(()=>{
    const onKey=(e:KeyboardEvent)=>{if(e.key==='Escape'&&!dragRef.current)close()};
    window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey);
  },[dirty]);

  const exportExcel=()=>{
    if(!plan)return;
    // 1列=1週間。画面では日単位で編集し、印刷ではA3横に収めやすい週単位へ変換する。
    const from=plan.start;const to=plan.end>=from?plan.end:lastMonthDay(from,6);
    const span=Math.min(730,Math.max(1,diff(from,to)+1));
    const weeks=Math.ceil(span/7);
    const lines:any[][]=[['工事管理工程表'],['工事名',plan.location,'現場責任者',plan.manager],['工期',`${from} ～ ${to}`],[],['工程名','業者',...Array.from({length:weeks},(_,i)=>{
      const d=plus(from,i*7);return d.slice(0,7)} )]];
    for(const task of plan.tasks){
      lines.push([task.name,task.vendor,...Array.from({length:weeks},(_,i)=>{
        const a=plus(from,i*7),b=plus(a,6);
        return task.start<=b&&task.end>=a?'━':'';
      })]);
    }
    if(plan.tasks.length===0)lines.push(['工程なし','']);
    const wb=XLSX.utils.book_new();const ws=XLSX.utils.aoa_to_sheet(lines);
    const endCol=XLSX.utils.encode_col(weeks+1);
    ws['!merges']=[{s:{r:0,c:0},e:{r:0,c:weeks+1}}];
    ws['!cols']=[{wch:24},{wch:19},...Array.from({length:weeks},()=>({wch:4.2}))];
    ws['!rows']=[{hpt:30},{hpt:22},{hpt:20},{hpt:7},...Array.from({length:lines.length-4},()=>({hpt:20}))];
    const thin={style:'thin',color:{rgb:'CBD5E1'}};
    for(let row=0;row<lines.length;row++){
      for(let c=0;c<weeks+2;c++){
        const addr=XLSX.utils.encode_cell({r:row,c});
        const cell=(ws as any)[addr]||((ws as any)[addr]={t:'s',v:''});
        const marked=row>=5 && c>=2 && cell.v==='━';
        cell.s={font:{name:'Yu Gothic',sz:7,bold:row===0,color:{rgb:'000000'}},
          alignment:{vertical:'center',horizontal:c>=2?'center':'left',wrapText:true},
          border:row>=4?{top:thin,bottom:thin,left:thin,right:thin}:undefined,
          fill:row===4?{fgColor:{rgb:'E2E8F0'}}:marked?{fgColor:{rgb:'475569'}}:undefined};
        if(marked)cell.v='';
      }
    }
    (ws as any)['!pageSetup']={paperSize:8,orientation:'landscape',fitToWidth:1,fitToHeight:1};
    (ws as any)['!printOptions']={horizontalCentered:true};
    (ws as any)['!margins']={left:0.2,right:0.2,top:0.35,bottom:0.35,header:0.1,footer:0.1};
    (ws as any)['!printArea']=`A1:${endCol}${lines.length}`;
    XLSX.utils.book_append_sheet(wb,ws,'現場工程表');
    XLSX.writeFile(wb,`現場工程表_${plan.location.replace(/[\\/:*?"<>|]/g,'_').slice(0,50)}.xlsx`);
  };

  return (
    <div className="fixed inset-0 z-[120] bg-slate-900/60 p-2 lg:p-5" onClick={close}>
      <div className="mx-auto flex h-full max-w-[1850px] flex-col overflow-hidden rounded-2xl bg-white shadow-xl" onClick={e=>e.stopPropagation()}>
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-3 lg:px-5">
          <span className="mr-auto text-lg font-normal text-black">📅 現場工程表（PC用・試作版）</span>
          {plan&&<span className={`text-sm ${dirty?'text-amber-700':'text-emerald-700'}`}>{saving?'保存中…':dirty?'● 未保存':'✓ 保存済み'}</span>}
          <button className={btn} onClick={save} disabled={!plan||!dirty||saving||loading}>保存</button>
          <button className={btn} onClick={exportExcel} disabled={!plan||!plan.tasks.length}>Excel出力</button>
          <button className={btn} onClick={close}>閉じる ✕</button>
        </div>
        <div className="flex-1 overflow-auto p-3 lg:p-5 text-sm font-normal text-black">
          {loading&&<p className="py-4 text-black">読み込み中…</p>}
          {message&&<p role="status" className="mb-3 rounded-lg bg-slate-50 p-2 text-black">{message}</p>}
          <div className="mb-4 grid gap-3 lg:grid-cols-[minmax(180px,2fr)_minmax(140px,1fr)_160px_160px]">
            <label className="block">現場
              <select value={location} onChange={e=>begin(e.target.value)} disabled={loading} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2"><option value="">現場を選択</option>{names.map(n=><option key={n} value={n}>{n}</option>)}</select>
            </label>
            <label className="block">現場責任者
              <select disabled={!plan} value={plan?.manager||''} onChange={e=>patch({manager:e.target.value})} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2"><option value="">指定なし</option>{Array.from(new Set((workers||[]).map((w:any)=>String(w?.name||'')).filter(Boolean))).map(n=><option key={n} value={n}>{n}</option>)}</select>
            </label>
            <label>工事開始日<input type="date" disabled={!plan} value={plan?.start||''} onChange={e=>patch({start:e.target.value})} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2"/></label>
            <label>工事終了日<input type="date" disabled={!plan} value={plan?.end||''} onChange={e=>patch({end:e.target.value})} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2"/></label>
          </div>
          {plan&&<>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <button onClick={()=>addTask()} className={btn}>＋ 工程を追加</button>
              <button onClick={()=>setViewStart(plus(viewStart,-31).slice(0,7)+'-01')} className={btn}>← 前の月</button>
              <button onClick={()=>setViewStart(plus(lastMonthDay(viewStart,2),1))} className={btn}>次の月 →</button>
              <label className="flex items-center gap-2 text-black">目盛り <select value={scale} onChange={e=>setScale(e.target.value as Scale)} className="rounded-lg border border-slate-300 bg-white p-2 text-black"><option value="month">月ごと</option><option value="week">週ごと</option><option value="day">日ごと</option></select></label>
              <select value={months} onChange={e=>setMonths(Number(e.target.value))} className="rounded-lg border border-slate-300 bg-white p-2"><option value={3}>3か月表示</option><option value={6}>6か月表示</option><option value={12}>12か月表示</option></select>
              <span className="text-xs text-black">空白の行を横に引くと工程を作れます。線の中央で移動、両端で伸縮できます。</span>
            </div>
            <div className="max-w-full overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <div style={{width:340+width,minWidth:'100%'}}>
                <div className="flex border-b border-slate-200 bg-slate-100" style={{height:38}}>
                  <div className="flex shrink-0 items-center border-r border-slate-200 px-3" style={{width:340}}>作業名・業者（上下ドラッグで並び替え）</div>
                  <div className="relative" style={{width,height:38}}>
                    {cells.map((cell,i)=><span key={cell.start} className={`absolute top-2 overflow-hidden whitespace-nowrap text-xs text-black ${cell.major?'':'opacity-80'}`} style={{left:i*cellWidth+3,width:cellWidth-5}}>{cell.label}</span>)}
                    {cells.map((cell,i)=><span key={`grid-${cell.start}`} className={`absolute bottom-0 border-l ${cell.major?'border-slate-500':'border-slate-200'}`} style={{left:i*cellWidth,height:8}}/>)}
                  </div>
                </div>
                {plan.tasks.map(task=>{
                  const left=taskPosition(task.start);
                  const right=taskPosition(task.end,true);
                  const visible=right>left;
                  return <div key={task.id} className={`flex border-b border-slate-100 ${selected===task.id?'bg-blue-50/40':'bg-white'}`} style={{height:48}}>
                    <div className="flex shrink-0 items-center gap-1 border-r border-slate-200 px-2" style={{width:340}} draggable onDragStart={e=>e.dataTransfer.setData('text/plain',task.id)} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();reorder(e.dataTransfer.getData('text/plain'),task.id)}}>
                      <span className="cursor-grab select-none text-black" title="上下に移動">⠿</span>
                      <input title="作業名" value={task.name} onFocus={()=>setSelected(task.id)} onChange={e=>modifyTask(task.id,{name:e.target.value})} className="min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 py-1 outline-none focus:border-slate-300"/>
                      <input title="業者名" placeholder="業者" value={task.vendor} onFocus={()=>setSelected(task.id)} onChange={e=>modifyTask(task.id,{vendor:e.target.value})} className="w-[76px] rounded border border-transparent bg-transparent px-1 py-1 outline-none focus:border-slate-300"/>
                      <button type="button" title="削除" onClick={()=>{if(window.confirm('この工程を削除しますか？'))patch({tasks:plan.tasks.filter(x=>x.id!==task.id)})}} className="px-1 text-black hover:text-red-600">×</button>
                    </div>
                    <div className="relative" style={{width,height:48,backgroundSize:`${cellWidth}px 100%`,backgroundImage:'linear-gradient(to right, #e2e8f0 1px, transparent 1px)'}}>
                      {visible&&<div className="absolute top-[14px] flex h-[20px] touch-none rounded bg-slate-300 text-black shadow-sm" style={{left,width:Math.max(2,right-left)}}>
                        <div title="左端を伸縮" className="w-[9px] shrink-0 cursor-ew-resize rounded-l bg-slate-400 hover:bg-slate-500" onPointerDown={e=>openDrag(e,task.id,'left')}/>
                        <div title="左右へ移動" className="min-w-0 flex-1 cursor-grab select-none" onPointerDown={e=>openDrag(e,task.id,'move')}/>
                        <div title="右端を伸縮" className="w-[9px] shrink-0 cursor-ew-resize rounded-r bg-slate-400 hover:bg-slate-500" onPointerDown={e=>openDrag(e,task.id,'right')}/>
                      </div>}
                    </div>
                  </div>;
                })}
                <div className="flex" style={{height:48}}>
                  <div className="flex shrink-0 items-center px-3 text-black" style={{width:340}}>＋ 空白を横にドラッグして工程追加</div>
                  <div ref={rowRef} onPointerDown={createByDraw} className="cursor-crosshair bg-slate-50" style={{width,height:48,backgroundSize:`${cellWidth}px 100%`,backgroundImage:'linear-gradient(to right, #e2e8f0 1px, transparent 1px)'}}/>
                </div>
              </div>
            </div>
            {selected&&plan.tasks.some(x=>x.id===selected)&&<div className="mt-3 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 p-3">
              <span className="text-black">選択中の工程</span>
              <label>開始日<input type="date" value={plan.tasks.find(x=>x.id===selected)?.start||''} onChange={e=>modifyTask(selected,{start:e.target.value})} className="ml-2 rounded-lg border border-slate-300 p-2"/></label>
              <label>終了日<input type="date" value={plan.tasks.find(x=>x.id===selected)?.end||''} onChange={e=>modifyTask(selected,{end:e.target.value})} className="ml-2 rounded-lg border border-slate-300 p-2"/></label>
            </div>}
            <p className="mt-3 text-xs text-black">※ 工程表は日報・勤怠・原価計算と別に保存します。Excelは週ごとの目盛りでA3横印刷を想定した初期版です。印刷時はExcelの印刷設定もご確認ください。</p>
          </>}
          {!loading&&!plan&&<p className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-black">最初に現場を選んでください。工程表が保存されていれば読み込まれます。</p>}
        </div>
      </div>
    </div>
  );
}
