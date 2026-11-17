'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx-js-style';

type BarColor = 'gray' | 'blue' | 'green' | 'yellow' | 'red';
type BarStyle = 'solid' | 'dotted' | 'dashed' | 'arrow';
type Task = { id: string; name: string; start: string; end: string; vendor: string; barColor?: BarColor; barStyle?: BarStyle };
type Plan = { location: string; manager: string; start: string; end: string; tasks: Task[]; updatedAt?: string };
type Drag = { id: string; type: 'new' | 'move' | 'left' | 'right'; startX: number; startIndex: number; initialStart: string; initialEnd: string };
type Scale = 'month' | 'week' | 'day';
type TimeCell = { start: string; end: string; label: string; major: boolean };

const BAR_COLORS: { value: BarColor; label: string; hex: string }[] = [
  {value:'gray',label:'黒・グレー',hex:'#586474'},
  {value:'blue',label:'青',hex:'#60a5fa'},
  {value:'green',label:'緑',hex:'#4ade80'},
  {value:'yellow',label:'黄',hex:'#facc15'},
  {value:'red',label:'赤',hex:'#f87171'}
];
const BAR_STYLES: { value: BarStyle; label: string }[] = [
  {value:'solid',label:'通常'},
  {value:'dotted',label:'点線'},
  {value:'dashed',label:'破線'},
  {value:'arrow',label:'矢印'}
];
const getBarColor = (color?: BarColor) => BAR_COLORS.find(c=>c.value===color)?.hex || BAR_COLORS[0].hex;
const getBarStyle = (style?: BarStyle): BarStyle => BAR_STYLES.some(x=>x.value===style) ? style! : 'solid';
const rgb = (hex:string) => hex.replace('#','').toUpperCase();
const DAY = 86400000;
const CELL_WIDTH: Record<Scale,number> = { month: 96, week: 48, day: 32 };
const fmt = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
const parse = (s: string) => new Date(`${s}T00:00:00Z`);
const weekday = (date: string) => ['日','月','火','水','木','金','土'][parse(date).getUTCDay()];
const dateWithWeekday = (date: string) => `${date}（${weekday(date)}）`;
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
const safeTasks = (v: any): Task[] => Array.isArray(v) ? v.filter((x: any) => x && typeof x === 'object').map((x: any) => ({id: String(x.id || uid()),name: String(x.name || ''),start:String(x.start || ''),end:String(x.end || ''),vendor:String(x.vendor || ''),barColor:BAR_COLORS.some(c=>c.value===x.barColor)?x.barColor:'gray',barStyle:BAR_STYLES.some(t=>t.value===x.barStyle)?x.barStyle:'solid'})).filter((x: Task) => /^\d{4}-\d{2}-\d{2}$/.test(x.start)&&/^\d{4}-\d{2}-\d{2}$/.test(x.end)) : [];
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
  const [menuTaskId, setMenuTaskId] = useState<string | null>(null);
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
    setSelected(null);setMenuTaskId(null);
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
    patch({tasks:[...plan.tasks,{id,name:'新しい工程',vendor:'',start:s,end:end||plus(s,6),barColor:'gray',barStyle:'solid'}]});setSelected(id);
  };
  const reorder = (fromId: string, toId: string) => {
    if(fromId===toId||!plan)return;
    const next=[...plan.tasks];const from=next.findIndex(t=>t.id===fromId);const to=next.findIndex(t=>t.id===toId);
    if(from<0||to<0)return;
    const [item]=next.splice(from,1);next.splice(to,0,item);
    patch({tasks:next});
  };

  const copyTask = (id: string) => {
    if(!plan)return;
    const index=plan.tasks.findIndex(t=>t.id===id);
    if(index<0)return;
    const copy={...plan.tasks[index],id:uid(),name:`${plan.tasks[index].name}（コピー）`};
    const next=[...plan.tasks];next.splice(index+1,0,copy);
    patch({tasks:next});setSelected(copy.id);setMenuTaskId(copy.id);
  };
  const removeTask = (id: string) => {
    if(!plan||!window.confirm('この工程を削除しますか？'))return;
    patch({tasks:plan.tasks.filter(t=>t.id!==id)});
    if(selected===id)setSelected(null);
    setMenuTaskId(null);
  };
  const barAppearance = (task: Task): React.CSSProperties => {
    const color=getBarColor(task.barColor);
    const style=getBarStyle(task.barStyle);
    if(style==='dotted')return {backgroundColor:'#fff',border:`3px dotted ${color}`,borderRadius:5};
    if(style==='dashed')return {backgroundColor:'#fff',border:`3px dashed ${color}`,borderRadius:5};
    if(style==='arrow')return {backgroundColor:color,clipPath:'polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%)',paddingRight:12};
    return {backgroundColor:color,borderRadius:5};
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
    patch({tasks:[...plan.tasks,{id,name:'新しい工程',vendor:'',start:date,end:cells[index].end,barColor:'gray',barStyle:'solid'}]});setSelected(id);
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
    if (!plan) return;
    // 大和・現場工程表の標準書式（ユーザー指定 2026-11-17）。
    // 全行18pt、A/D以降3.29、B28.00、C19.14。工事名・工期はC:J結合。
    // 月・週・日の違いは、D列以降の細いセルを必要数だけ横に結合して表現する。
    const from=plan.start;
    const to=plan.end>=from?plan.end:lastMonthDay(from,6);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(from)||!/^\d{4}-\d{2}-\d{2}$/.test(to)){
      window.alert('工事開始日・終了日を確認してください。');return;
    }
    if(to>plus(from,1825)){window.alert('Excel出力は工期5年以内にしてください。');return;}

    const allPeriods: TimeCell[]=[];
    let cursor=from;
    while(cursor<=to){
      let end=cursor;
      if(scale==='month')end=lastMonthDay(cursor,1);
      else if(scale==='week')end=plus(cursor,6);
      if(end>to)end=to;
      allPeriods.push({start:cursor,end,label:'',major:true});
      cursor=plus(end,1);
    }

    const book=XLSX.utils.book_new();
    const unitLabel=scale==='month'?'月ごと':scale==='week'?'週ごと':'日ごと';
    // 狭い列幅を統一しながら、週・月のラベルは複数セルにまたがって読みやすくする。
    const unitSpan=scale==='day'?1:scale==='week'?3:4;
    const periodsPerSheet=scale==='day'?31:scale==='week'?10:8;
    const sheetCount=Math.ceil(allPeriods.length/periodsPerSheet);
    // Excelの罫線は全て黒色の細線で統一する。
    const thin={style:'thin',color:{rgb:'000000'}};
    const colForPeriod=(index:number)=>3+index*unitSpan; // D列=3（0始まり）
    const shortDate=(date:string)=>{
      const d=parse(date);
      return `${d.getUTCMonth()+1}/${d.getUTCDate()}`;
    };
    for(let page=0;page<sheetCount;page++){
      const periods=allPeriods.slice(page*periodsPerSheet,(page+1)*periodsPerSheet);
      const numCols=Math.max(14,3+periods.length*unitSpan); // M:Nまで必ず用意
      const taskRows=Math.max(5,plan.tasks.length);
      const data:any[][]=Array.from({length:5+taskRows},()=>Array.from({length:numCols},()=>''));
      data[0][1]='工事名';
      data[0][2]=plan.location;
      data[1][1]='工期';
      data[1][2]=`${dateWithWeekday(from)} ～ ${dateWithWeekday(to)}`;
      data[1][10]='現場責任者'; // K2:L2
      data[1][12]=plan.manager||''; // M2:N2
      data[2][0]='No.';
      data[2][1]='工程名';
      data[2][2]='業者';

      const merges:any[]=[
        {s:{r:0,c:2},e:{r:0,c:9}}, // C1:J1
        {s:{r:1,c:2},e:{r:1,c:9}}, // C2:J2
        {s:{r:1,c:10},e:{r:1,c:11}}, // K2:L2
        {s:{r:1,c:12},e:{r:1,c:13}}, // M2:N2
        {s:{r:2,c:0},e:{r:4,c:0}}, // A3:A5
        {s:{r:2,c:1},e:{r:4,c:1}}, // B3:B5
        {s:{r:2,c:2},e:{r:4,c:2}}  // C3:C5
      ];
      let groupLabel='';
      let groupStart=0;
      const finishGroup=(lastIndex:number)=>{
        if(lastIndex<groupStart) return;
        const startCol=colForPeriod(groupStart);
        const endCol=colForPeriod(lastIndex)+unitSpan-1;
        merges.push({s:{r:2,c:startCol},e:{r:2,c:endCol}});
        data[2][startCol]=groupLabel;
      };
      periods.forEach((period,index)=>{
        const d=parse(period.start);
        const label=`${d.getUTCFullYear()}年${d.getUTCMonth()+1}月`;
        if(index===0){groupLabel=label;groupStart=index;}
        else if(label!==groupLabel){finishGroup(index-1);groupLabel=label;groupStart=index;}
        const startCol=colForPeriod(index);
        const endCol=startCol+unitSpan-1;
        if(unitSpan>1){
          merges.push({s:{r:3,c:startCol},e:{r:3,c:endCol}});
          merges.push({s:{r:4,c:startCol},e:{r:4,c:endCol}});
        }
        if(scale==='day'){
          data[3][startCol]=String(d.getUTCDate());
          data[4][startCol]=weekday(period.start);
        }else if(scale==='week'){
          data[3][startCol]=`${shortDate(period.start)}〜${shortDate(period.end)}`;
          data[4][startCol]=`${weekday(period.start)}〜${weekday(period.end)}`;
        }else{
          data[3][startCol]=`${d.getUTCMonth()+1}月`;
        }
      });
      finishGroup(periods.length-1);
      plan.tasks.forEach((task,index)=>{
        data[index+5][0]=index+1;
        data[index+5][1]=task.name;
        data[index+5][2]=task.vendor;
      });

      const sheet=XLSX.utils.aoa_to_sheet(data);
      sheet['!merges']=merges;
      sheet['!cols']=Array.from({length:numCols},(_,c)=>({width:c===1?28:c===2?19.14:3.29}));
      sheet['!rows']=Array.from({length:data.length},()=>({hpt:18}));
      const dayOfWeek=(date:string)=>parse(date).getUTCDay();
      for(let r=0;r<data.length;r++){
        for(let c=0;c<numCols;c++){
          const addr=XLSX.utils.encode_cell({r,c});
          const cell=(sheet as any)[addr]||((sheet as any)[addr]={t:'s',v:''});
          const inTimeline=c>=3&&c<3+periods.length*unitSpan;
          const periodIndex=inTimeline?Math.floor((c-3)/unitSpan):-1;
          const period=periodIndex>=0?periods[periodIndex]:null;
          const task=r>=5&&r-5<plan.tasks.length?plan.tasks[r-5]:null;
          const covered=Boolean(task&&period&&task.start<=period.end&&task.end>=period.start);
          const sunday=Boolean(period&&scale==='day'&&dayOfWeek(period.start)===0);
          const saturday=Boolean(period&&scale==='day'&&dayOfWeek(period.start)===6);
          const boundary=Boolean(inTimeline&&(c-3)%unitSpan===0);
          const taskStyle=getBarStyle(task?.barStyle);
          const taskColor=rgb(getBarColor(task?.barColor));
          const lastBarCell=Boolean(task&&period&&task.end>=period.start&&task.end<=period.end&&c===colForPeriod(periodIndex)+unitSpan-1);
          const bg=covered&&(taskStyle==='solid'||taskStyle==='arrow')?taskColor
            :r===2?'E3E8EF'
            :r===3||r===4?(sunday?'F8EAEA':saturday?'E9F1FA':'F4F6F8')
            :r>=5&&inTimeline?(sunday?'FAF1F1':saturday?'F2F7FC':undefined)
            :undefined;
          cell.s={
            font:{name:'Yu Gothic',sz:7,bold:false,color:{rgb:'000000'}},
            alignment:{vertical:'center',horizontal:r>=5&&c===0?'center':c===1||c===2&&r>=5||r<2?'left':'center',wrapText:false},
            border:r>=2?{top:thin,bottom:thin,left:thin,right:thin}:undefined,
            ...(bg?{fill:{patternType:'solid',fgColor:{rgb:bg}}}:{})
          };
          if(covered){
            cell.t='s';
            // 黒い細罫線は維持したまま、工程バーの線種と色だけをExcelに反映。
            if(taskStyle==='dotted')cell.v=c===colForPeriod(periodIndex)?'・':'';
            else if(taskStyle==='dashed')cell.v=c===colForPeriod(periodIndex)?'━':'';
            else if(taskStyle==='arrow'&&lastBarCell)cell.v='▶';
            else cell.v='';
            if(taskStyle==='dotted'||taskStyle==='dashed'||taskStyle==='arrow'&&lastBarCell){
              cell.s.font={name:'Yu Gothic',sz:7,bold:false,color:{rgb:taskColor}};
            }
          }
        }
      }
      const lastCol=XLSX.utils.encode_col(numCols-1);
      (sheet as any)['!pageSetup']={paperSize:8,orientation:'landscape',fitToWidth:1,fitToHeight:1};
      (sheet as any)['!sheetPr']={pageSetUpPr:{fitToPage:true}};
      (sheet as any)['!printOptions']={horizontalCentered:true};
      (sheet as any)['!margins']={left:0.2,right:0.2,top:0.35,bottom:0.35,header:0.1,footer:0.1};
      (sheet as any)['!printArea']=`A1:${lastCol}${data.length}`;
      XLSX.utils.book_append_sheet(book,sheet,sheetCount===1?'現場工程表':`工程表${page+1}`);
    }
    XLSX.writeFile(book,`現場工程表_${unitLabel}_${plan.location.replace(/[\\/:*?"<>|]/g,'_').slice(0,45)}.xlsx`);
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
                      <button type="button" title="工程バーの設定" aria-label={`${task.name} の設定`} onClick={()=>{setSelected(task.id);setMenuTaskId(menuTaskId===task.id?null:task.id)}} className="rounded px-1.5 py-1 text-black hover:bg-slate-100">･･･</button>
                    </div>
                    <div className="relative" style={{width,height:48,backgroundSize:`${cellWidth}px 100%`,backgroundImage:'linear-gradient(to right, #e2e8f0 1px, transparent 1px)'}}>
                      {visible&&<div className="absolute top-[12px] flex h-[24px] touch-none text-black shadow-sm" style={{left,width:Math.max(2,right-left),...barAppearance(task)}}>
                        <div title="左端を伸縮" className="w-[8px] shrink-0 cursor-ew-resize" onPointerDown={e=>openDrag(e,task.id,'left')}/>
                        <div title="左右へ移動" className="min-w-0 flex-1 cursor-grab select-none" onPointerDown={e=>openDrag(e,task.id,'move')}/>
                        {right-left>=65&&<button type="button" title="工程バーの設定" aria-label={`${task.name} の色と線を変更`} className="relative z-10 mr-1 flex h-[20px] w-[25px] shrink-0 items-center justify-center rounded bg-white/90 text-xs text-black hover:bg-white" onPointerDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();setSelected(task.id);setMenuTaskId(menuTaskId===task.id?null:task.id)}}>･･･</button>}
                        <div title="右端を伸縮" className="w-[8px] shrink-0 cursor-ew-resize" onPointerDown={e=>openDrag(e,task.id,'right')}/>
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
            {menuTaskId&&plan.tasks.some(x=>x.id===menuTaskId)&&<div className="mt-3 rounded-xl border border-slate-300 bg-white p-3 text-black">
              <div className="mb-3 flex items-center justify-between gap-3"><span>工程バーの設定：{plan.tasks.find(t=>t.id===menuTaskId)?.name}</span><button type="button" className={btn} onClick={()=>setMenuTaskId(null)}>閉じる ✕</button></div>
              <div className="flex flex-wrap items-center gap-2"><span className="w-16 shrink-0">色</span>{BAR_COLORS.map(color=><button key={color.value} type="button" title={color.label} aria-label={`${color.label}に変更`} aria-pressed={(plan.tasks.find(t=>t.id===menuTaskId)?.barColor||'gray')===color.value} onClick={()=>modifyTask(menuTaskId,{barColor:color.value})} className={`h-9 min-w-[49px] rounded-lg border-2 px-2 text-xs text-black ${(plan.tasks.find(t=>t.id===menuTaskId)?.barColor||'gray')===color.value?'border-black':'border-slate-200'}`} style={{backgroundColor:color.hex}}>{(plan.tasks.find(t=>t.id===menuTaskId)?.barColor||'gray')===color.value?'✓':''}</button>)}</div>
              <div className="mt-3 flex flex-wrap items-center gap-2"><span className="w-16 shrink-0">線の種類</span>{BAR_STYLES.map(item=><button key={item.value} type="button" onClick={()=>modifyTask(menuTaskId,{barStyle:item.value})} className={`${btn} ${getBarStyle(plan.tasks.find(t=>t.id===menuTaskId)?.barStyle)===item.value?'border-black bg-slate-100':''}`}>{item.label}</button>)}</div>
              <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3"><button type="button" className={btn} onClick={()=>copyTask(menuTaskId)}>工程をコピー</button><button type="button" className={`${btn} text-red-700`} onClick={()=>removeTask(menuTaskId)}>工程を削除</button></div>
            </div>}
            {selected&&plan.tasks.some(x=>x.id===selected)&&<div className="mt-3 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 p-3">
              <span className="text-black">選択中の工程</span>
              <label>開始日<input type="date" value={plan.tasks.find(x=>x.id===selected)?.start||''} onChange={e=>modifyTask(selected,{start:e.target.value})} className="ml-2 rounded-lg border border-slate-300 p-2"/></label>
              <label>終了日<input type="date" value={plan.tasks.find(x=>x.id===selected)?.end||''} onChange={e=>modifyTask(selected,{end:e.target.value})} className="ml-2 rounded-lg border border-slate-300 p-2"/></label>
            </div>}
            <p className="mt-3 text-xs text-black">※ 工程表は日報・勤怠・原価計算と別に保存します。Excelは画面で選んだ「月ごと・週ごと・日ごと」で出力します。長い工期はA3横の複数シートに分けます。</p>
          </>}
          {!loading&&!plan&&<p className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-black">最初に現場を選んでください。工程表が保存されていれば読み込まれます。</p>}
        </div>
      </div>
    </div>
  );
}
