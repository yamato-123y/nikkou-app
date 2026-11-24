'use client';
// 指定の作業員名簿_空白.xlsx のOOXMLを直接編集します。
// SheetJSなどでブックを再生成しないため、フォント・折返し・列幅・図形・原本の印刷設定を維持します。
// @ts-ignore ローカル同梱のJSZip（追加npmパッケージ不要）
import JSZip from './roster-zip';

type Profile = { worker_name?: string; full_name?: string | null; hire_date?: string | null; birth_date?: string | null; blood_type?: string | null; address?: string | null; emergency_contact?: string | null; notes?: string | null };
type Qual = { worker_name?: string; category?: string | null; qualification_name?: string | null };
type Health = { worker_name?: string; exam_date?: string | null; notes?: string | null; systolic?: number | string | null; diastolic?: number | string | null };
type Ledger = { profiles?: Profile[]; qualifications?: Qual[]; healthChecks?: Health[] };
const val = (x: unknown) => String(x ?? '').trim();
const key = (x: unknown) => val(x).normalize('NFKC').replace(/[\s\u3000]+/g, '').replace(/[・･]/g,'').toLowerCase();
const note = (s: unknown, label: string) => val(s).split(/\r?\n/).find(x => x.startsWith(`${label}：`) || x.startsWith(`${label}:`))?.slice(label.length + 1).trim() || '';
const parsed = (x: unknown) => { const m = val(x).match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/); return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null; };
const serial = (x: unknown) => { const d = parsed(x); return d ? (Date.UTC(d[0],d[1]-1,d[2])-Date.UTC(1899,11,30))/86400000 : null; };
const age = (x: unknown, today: Date) => { const d = parsed(x); return d ? today.getFullYear()-d[0]-(today.getMonth()+1 < d[1] || (today.getMonth()+1 === d[1] && today.getDate()<d[2]) ? 1 : 0) : null; };
const NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const RNS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const PNS = 'http://schemas.openxmlformats.org/package/2006/relationships';
const CTNS = 'http://schemas.openxmlformats.org/package/2006/content-types';
const parser = (text: string) => { const doc = new DOMParser().parseFromString(text,'application/xml'); if(doc.getElementsByTagName('parsererror').length) throw new Error('作業員名簿のExcel構造を読み取れません。'); return doc; };
const xml = (doc: Document) => new XMLSerializer().serializeToString(doc);
const nodes = (parent: Element, localName: string) => Array.from(parent.childNodes).filter((x): x is Element => x.nodeType === 1 && (x as Element).localName === localName);
const only = (parent: Element, localName: string) => nodes(parent,localName)[0];
const rowCells = (doc: Document) => {
  const entries = new Map<string, Element>();
  for(const c of Array.from(doc.getElementsByTagNameNS(NS,'c'))) { const r=c.getAttribute('r'); if(r) entries.set(r,c); }
  return entries;
};
const edit = (doc: Document, items: Map<string, string | number>) => {
  const cells=rowCells(doc);
  for(const [address,value] of items) {
    const cell=cells.get(address); if(val(value)==='') continue; if(!cell) throw new Error(`原本の入力セルが見つかりません: ${address}`);
    if(only(cell,'v') || only(cell,'is') || only(cell,'f')) throw new Error(`原本の固定セルへの書き込みを停止しました: ${address}`);
    if(typeof value==='number') {
      cell.removeAttribute('t'); const v=doc.createElementNS(NS,'v'); v.textContent=String(value); cell.appendChild(v);
    } else {
      cell.setAttribute('t','inlineStr'); const is=doc.createElementNS(NS,'is'); const t=doc.createElementNS(NS,'t'); t.setAttribute('xml:space','preserve');t.textContent=String(value);is.appendChild(t);cell.appendChild(is);
    }
  }
};
const makeFields = (names: string[], ledger: Ledger, today: Date) => {
  const fields=new Map<string,string|number>();
  const profiles=ledger.profiles||[], quals=ledger.qualifications||[], health=ledger.healthChecks||[];
  const put=(a:string,v:unknown) => { if(v!==null && v!==undefined && val(v)!=='')fields.set(a,v as string|number); };
  names.forEach((name,i)=>{
    const r=20+i*6, k=key(name);
    const p=profiles.find(x=>key(x.worker_name)===k);
    const q=quals.filter(x=>key(x.worker_name)===k);
    const hs=health.filter(x=>key(x.worker_name)===k).sort((a,b)=>val(b.exam_date).localeCompare(val(a.exam_date)));
    const special=(x:Health)=>/石綿|じん肺|特殊|有機溶剤|鉛|特定化学|電離放射線|騒音/.test(note(x.notes,'健診種類'));
    const h=hs.find(x=>!special(x)); const sh=hs.find(special);
    const cat=(test:(x:Qual)=>boolean)=>[...new Set(q.filter(test).map(x=>val(x.qualification_name)).filter(Boolean))].join('\n');
    const education=(x:Qual)=>/特別教育|雇入|職長教育/.test(val(x.category)) || /職長.*教育/.test(val(x.qualification_name));
    const skill=(x:Qual)=>!education(x)&&val(x.category).includes('技能講習');
    const date=(v:unknown,cols:string[])=>{const d=parsed(v); if(d) cols.forEach((c,j)=>put(`${c}${r}`,d[j]));};
    const meta=(...labels:string[])=>labels.map(l=>note(p?.notes,l)).find(Boolean)||'';
    put(`E${r}`,meta('ふりがな','フリガナ'));
    put(`E${r+2}`,p?.full_name||name);
    // 旧取込データでは職種欄の末尾に経験年数が連結されている場合がある。
    const job = meta('職種');
    const embedded = job.normalize('NFKC').match(/経験年数\s*[:：]?\s*(\d+(?:\.\d+)?)\s*年?/);
    const occupation = job.replace(/[\s　/／、,，・]*(?:[（(]\s*)?経験年数\s*[:：]?\s*[0-9０-９]+(?:[.．][0-9０-９]+)?\s*年?\s*[）)]?/g, '').trim();
    put(`V${r}`,occupation);
    date(p?.hire_date,['AL','AQ','AV']); date(p?.birth_date,['BA','BF','BK']);
    const explicitYears = meta('経験年数').normalize('NFKC').match(/^\s*(\d+(?:\.\d+)?)\s*年?\s*$/);
    const years = explicitYears?.[1] ?? embedded?.[1];
    if (years !== undefined) put(`AL${r+3}`,Number(years));
    put(`BA${r+3}`,age(p?.birth_date,today));
    put(`BP${r}`,p?.address); put(`DK${r}`,meta('電話番号','本人電話番号','TEL'));
    put(`BP${r+3}`,p?.emergency_contact); put(`DK${r+3}`,meta('緊急連絡先電話番号','家族電話番号'));
    date(h?.exam_date,['EA','EF','EK']); date(sh?.exam_date,['ET','EY','FD']);
    put(`ET${r+3}`,note(sh?.notes,'健診種類'));
    put(`EA${r+3}`,h?.systolic); put(`EJ${r+3}`,h?.diastolic);
    put(`EP${r}`,p?.blood_type);
    put(`GG${r}`,cat(education)); put(`GS${r}`,cat(skill)); put(`HE${r}`,cat(x=>!education(x)&&!skill(x)));
    put(`FI${r}`,meta('健康保険')); put(`FI${r+2}`,meta('年金保険')); put(`FI${r+4}`,meta('雇用保険'));

  });
  return fields;
};
const download = (blob:Blob, filename:string)=>{ const u=URL.createObjectURL(blob); const a=document.createElement('a');a.href=u;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),10000); };

export async function exportWorkerRoster(names: string[], ledger: Ledger): Promise<void> {
  const selected=[...new Set(names.map(val).filter(Boolean))];
  if(!selected.length)throw new Error('作業員を選択してください。');
  const response=await fetch('/templates/worker-roster.xlsx',{cache:'no-store'});
  if(!response.ok)throw new Error('worker-roster.xlsx が見つかりません。');
  const bytes=await response.arrayBuffer();
  const zip=await JSZip.loadAsync(bytes);
  const source=zip.file('xl/worksheets/sheet1.xml');
  if(!source)throw new Error('指定の作業員名簿_空白.xlsx と構造が異なります。');
  const original=await source.async('string');
  const originalDoc=parser(original);
  const dimension=originalDoc.getElementsByTagNameNS(NS,'dimension')[0]?.getAttribute('ref');
  if(dimension!=='A1:IE95')throw new Error('指定された大和の作業員名簿とは様式が異なります。');
  const pages=Math.ceil(selected.length/10);
  const today=new Date();
  const workbookFile=zip.file('xl/workbook.xml'); const relsFile=zip.file('xl/_rels/workbook.xml.rels');const typesFile=zip.file('[Content_Types].xml');
  if(!workbookFile || !relsFile || !typesFile)throw new Error('作業員名簿の構成ファイルが不足しています。');
  const wb=parser(await workbookFile.async('string'));
  const rels=parser(await relsFile.async('string'));
  const types=parser(await typesFile.async('string'));
  const sheets=wb.getElementsByTagNameNS(NS,'sheets')[0];
  if(!sheets)throw new Error('作業員名簿のシートが見つかりません。');
  // 1名～10名は元のExcel内のsheet1.xmlだけを書き換える。
  // 11名以上は元のブックを複製してシートを追加。元の図形・印刷設定との関連付けも複製する。
  const sheetRels=zip.file('xl/worksheets/_rels/sheet1.xml.rels');
  const relsOriginal=sheetRels ? await sheetRels.async('string') : null;
  const originalSheet=sheets.getElementsByTagNameNS(NS,'sheet')[0];
  const maxRelation=Array.from(rels.getElementsByTagNameNS(PNS,'Relationship')).reduce((m,x)=>Math.max(m,Number((x.getAttribute('Id')||'').replace(/^rId/,''))||0),0);
  for(let page=0;page<pages;page++) {
    const doc=parser(original);
    edit(doc,makeFields(selected.slice(page*10,page*10+10),ledger,today));
    zip.file(`xl/worksheets/sheet${page+1}.xml`,xml(doc));
    if(page>0) {
      if(relsOriginal)zip.file(`xl/worksheets/_rels/sheet${page+1}.xml.rels`,relsOriginal);
      const relid=`rId${maxRelation+page}`;
      const sheet=wb.createElementNS(NS,'sheet');sheet.setAttribute('name',`作業員名簿${page+1}`);
      sheet.setAttribute('sheetId',String(Number(originalSheet.getAttribute('sheetId'))+page));sheet.setAttributeNS(RNS,'r:id',relid);sheets.appendChild(sheet);
      const rel=rels.createElementNS(PNS,'Relationship');rel.setAttribute('Id',relid);
      rel.setAttribute('Type',`${RNS}/worksheet`);rel.setAttribute('Target',`worksheets/sheet${page+1}.xml`);
      rels.documentElement.appendChild(rel);
      const override=types.createElementNS(CTNS,'Override'); override.setAttribute('PartName',`/xl/worksheets/sheet${page+1}.xml`);
      override.setAttribute('ContentType','application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml');types.documentElement.appendChild(override);
    }
  }
  if(pages>1){zip.file('xl/workbook.xml',xml(wb));zip.file('xl/_rels/workbook.xml.rels',xml(rels));zip.file('[Content_Types].xml',xml(types));}
  const out=await zip.generateAsync({type:'blob',compression:'DEFLATE'});
  const stamp=`${today.getFullYear()}${String(today.getMonth()+1).padStart(2,'0')}${String(today.getDate()).padStart(2,'0')}`;
  download(out,`作業員名簿_全建統一様式第2号_${stamp}.xlsx`);
}
