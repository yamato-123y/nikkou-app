// 大和のExcelひな形を直接編集する。既存の印影・罫線・数式・画像を残すため
// XLSX全体を作り直さず、ZIP内の必要なセルだけを更新する。
import { NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { deflateRawSync, inflateRawSync } from 'node:zlib';

export const runtime = 'nodejs';

type Entry = { name: string; content: Buffer; method: number };
const crcTable = new Uint32Array(256);
for(let n=0;n<256;n++){
  let c=n;
  for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;
  crcTable[n]=c>>>0;
}
const crc32=(buffer:Buffer)=>{
  let c=0xFFFFFFFF;
  for(const b of buffer)c=crcTable[(c^b)&255]^(c>>>8);
  return (c^0xFFFFFFFF)>>>0;
};
const parseZip=(buf:Buffer):Entry[]=>{
  let eocd=-1;
  for(let p=buf.length-22;p>=Math.max(0,buf.length-65557);p--){if(buf.readUInt32LE(p)===0x06054b50){eocd=p;break;}}
  if(eocd<0)throw new Error('Excelの形式を確認できませんでした。');
  const count=buf.readUInt16LE(eocd+10);
  let p=buf.readUInt32LE(eocd+16);
  const result:Entry[]=[];
  for(let i=0;i<count;i++){
    if(buf.readUInt32LE(p)!==0x02014b50)throw new Error('Excel内のファイルを読み取れませんでした。');
    const method=buf.readUInt16LE(p+10), compSize=buf.readUInt32LE(p+20);
    const nameSize=buf.readUInt16LE(p+28), extraSize=buf.readUInt16LE(p+30), commentSize=buf.readUInt16LE(p+32);
    const off=buf.readUInt32LE(p+42), name=buf.subarray(p+46,p+46+nameSize).toString('utf8');
    if(buf.readUInt32LE(off)!==0x04034b50)throw new Error('Excelの圧縮データが正しくありません。');
    const dataStart=off+30+buf.readUInt16LE(off+26)+buf.readUInt16LE(off+28);
    const compressed=buf.subarray(dataStart,dataStart+compSize);
    if(method!==0&&method!==8)throw new Error('未対応の圧縮形式です。');
    result.push({name,method,content:method===8?inflateRawSync(compressed):Buffer.from(compressed)});
    p+=46+nameSize+extraSize+commentSize;
  }
  return result;
};
const makeZip=(entries:Entry[]):Buffer=>{
  const local:Buffer[]=[];const central:Buffer[]=[];let offset=0;
  for(const ent of entries){
    const name=Buffer.from(ent.name,'utf8');
    const method=ent.method===0?0:8;
    const compressed=method===8?deflateRawSync(ent.content):ent.content;
    const checksum=crc32(ent.content);
    const header=Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50,0);header.writeUInt16LE(20,4);header.writeUInt16LE(0x800,6);
    header.writeUInt16LE(method,8);header.writeUInt32LE(checksum,14);header.writeUInt32LE(compressed.length,18);header.writeUInt32LE(ent.content.length,22);header.writeUInt16LE(name.length,26);
    local.push(header,name,compressed);
    const cd=Buffer.alloc(46);cd.writeUInt32LE(0x02014b50,0);cd.writeUInt16LE(20,4);cd.writeUInt16LE(20,6);cd.writeUInt16LE(0x800,8);cd.writeUInt16LE(method,10);cd.writeUInt32LE(checksum,16);cd.writeUInt32LE(compressed.length,20);cd.writeUInt32LE(ent.content.length,24);cd.writeUInt16LE(name.length,28);cd.writeUInt32LE(offset,42);
    central.push(cd,name);
    offset+=header.length+name.length+compressed.length;
  }
  const cdSize=central.reduce((sum,b)=>sum+b.length,0);
  const end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(entries.length,8);end.writeUInt16LE(entries.length,10);end.writeUInt32LE(cdSize,12);end.writeUInt32LE(offset,16);
  return Buffer.concat([...local,...central,end]);
};
const xmlEscape=(s:any)=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
const cell=(xml:string,addr:string,value:string|number|null)=>{
  // 空欄セルは <x:c ... /> の形になっている。隣のセルまで
  // 取り込まないよう、セルの開始タグと終了タグを厳密に区別する。
  const expr=new RegExp(`<(x:)?c\\b(?=[^>]*\\br="${addr}")[^>]*?(?:\\s*/>|>(?:[\\s\\S]*?)<\\/(?:x:)?c>)`);
  const m=xml.match(expr);
  if(!m)throw new Error(`ひな形の${addr}欄が見つかりません。`);
  // 対象セル自身の属性だけを引き継ぎ、書式番号を保持する。
  const start=m[0].slice(0,m[0].indexOf('>')+1);
  let attrs=start.replace(/^<(?:x:)?c\b/,'').replace(/\s*\/?>$/,'').replace(/\s+t="[^"]*"/g,'');
  const ns=m[1]||'';
  const inner=value===null?'':typeof value==='number'?`<${ns}v>${value}</${ns}v>`:`<${ns}is><${ns}t xml:space="preserve">${xmlEscape(value)}</${ns}t></${ns}is>`;
  if(typeof value==='string')attrs+=' t="inlineStr"';
  return xml.replace(expr,`<${ns}c${attrs}>${inner}</${ns}c>`);
};
const setCells=(source:string,items:[string,string|number|null][])=>items.reduce((s,[address,v])=>cell(s,address,v),source);
const asText=(x:any,max=250)=>String(x??'').slice(0,max);
const toNum=(x:any):number|null=>{
  if(x===''||x==null)return null;
  const n=Number(String(x).replace(/,/g,''));
  if(!Number.isFinite(n)||Math.abs(n)>10000000000)throw new Error('数量や金額に正しい数字を入力してください。');
  return n;
};
const excelDate=(value:string)=>{
  const date=new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime())?Math.round((date.getTime()-Date.UTC(1899,11,30))/86400000):null;
};
export async function POST(req:Request){
  try{
    const json=await req.json();
    const est=json?.estimate;
    if(!est||typeof est!=='object'||!String(est.title||'').trim())return NextResponse.json({error:'工事名を入力してください。'},{status:400});
    const rows=Array.isArray(est.rows)?est.rows:[];
    if(rows.length>12)return NextResponse.json({error:'試作版では内訳は12行までです。'},{status:400});
    const template=await readFile(join(process.cwd(),'public','templates','yamato-estimate-template.xlsx'));
    const entries=parseZip(template);
    const sheets=new Map(entries.map(x=>[x.name,x]));
    const s1=sheets.get('xl/worksheets/sheet1.xml');const s2=sheets.get('xl/worksheets/sheet2.xml');
    if(!s1||!s2)throw new Error('見積書のひな形が正しくありません。');
    const customer=asText(est.customer,120);
    // 表紙。結合セルの左上だけに記入する。
    let cover=setCells(s1.content.toString('utf8'),[
      ['B8',customer],['D28',asText(est.title,150)],['D30',asText(est.address,150)],['D32',asText(est.workPeriod,150)]
    ]);
    const quoteDate=excelDate(asText(est.quoteDate,10));
    if(quoteDate!==null)cover=cell(cover,'J7',quoteDate);
    s1.content=Buffer.from(cover,'utf8');
    let detail=setCells(s2.content.toString('utf8'),[
      ['A3',customer],['C6',asText(est.title,150)]
    ]);
    const changes:[string,string|number|null][]=[];
    for(let idx=0;idx<12;idx++){
      const r=rows[idx]||{};const line=13+idx;
      changes.push([`A${line}`,asText(r.name,100)],[`D${line}`,asText(r.description,100)],[`G${line}`,toNum(r.quantity)],[`H${line}`,asText(r.unit,15)],[`I${line}`,toNum(r.unitPrice)],[`L${line}`,asText(r.note,120)]);
    }
    for(const [line,key] of [[25,'overhead'],[26,'welfare'],[27,'adjustment']] as const){
      changes.push([`G${line}`,1],[`I${line}`,toNum(est.extra?.[key])]);
    }
    detail=setCells(detail,changes);
    s2.content=Buffer.from(detail,'utf8');
    // 雛型には「共有数式」の印が残っているが、各行に異なる完成済みの式が入っている。
    // Excelはこの組合せを壊れた共有数式と判定し、J13/J14等の数式を削除する。
    // 数式の中身を変えず、共有の印だけ外して独立した式として保存する。
    // 内訳シートだけでなく詳細明細シートにも同様の印があるため全シートに適用。
    for (const entry of entries) {
      if (!/^xl\/worksheets\/sheet\d+\.xml$/.test(entry.name)) continue;
      let xml = entry.content.toString('utf8');
      xml = xml.replace(/<(x:)?f\b([^>]*)>([\s\S]*?)<\/(?:x:)?f>/g, (whole, prefix, attributes, formula) => {
        if (!/\bt="shared"/.test(attributes)) return whole;
        if (!formula.trim()) return whole; // 空の共有式は独立式に変換しない
        const cleanAttrs = attributes
          .replace(/\s+t="shared"/g, '')
          .replace(/\s+si="[^"]*"/g, '')
          .replace(/\s+ref="[^"]*"/g, '');
        const tag = `${prefix || ''}f`;
        return `<${tag}${cleanAttrs}>${formula}</${tag}>`;
      });
      entry.content = Buffer.from(xml, 'utf8');
    }
    // 見積書の説明用の2行は印刷・画面ともに不要。数式は一切触らない。
    const breakdown=sheets.get('xl/worksheets/sheet3.xml');
    if(breakdown){
      let xml=breakdown.content.toString('utf8');
      xml=cell(xml,'O4',null);
      xml=cell(xml,'O5',null);
      breakdown.content=Buffer.from(xml,'utf8');
    }
    // 3枚目「①」のO4:S5だけ枠線を消す。ほかのセルと共通の書式は変更しない。
    // 元のセル書式を複製して罫線だけ無くし、対象の10セルにだけ設定する。
    const stylesEntry=sheets.get('xl/styles.xml');
    if(breakdown && stylesEntry){
      let stylesXml=stylesEntry.content.toString('utf8');
      let sheetXml=breakdown.content.toString('utf8');
      const xfMatch=stylesXml.match(/<x:cellXfs\b([^>]*)>([\s\S]*?)<\/x:cellXfs>/);
      if(!xfMatch)throw new Error('Excelの書式情報を取得できませんでした。');
      const xfs=xfMatch[2].match(/<x:xf\b[^>]*\/>|<x:xf\b[^>]*>[\s\S]*?<\/x:xf>/g)||[];
      const copies=new Map<number,number>();
      let extra='';
      for(const row of [4,5])for(const col of ['O','P','Q','R','S']){
        const address=`${col}${row}`;
        const expr=new RegExp(`(<x:c\\b[^>]*\\br="${address}"[^>]*\\bs=")(\\d+)(")`);
        const hit=sheetXml.match(expr);
        if(!hit)throw new Error(`ひな形の${address}欄が見つかりません。`);
        const original=Number(hit[2]);
        if(!copies.has(original)){
          const source=xfs[original];
          if(!source)throw new Error(`Excelの書式${original}がありません。`);
          let clone=source.replace(/\bborderId="[^"]*"/,'borderId="0"');
          if(!/\bborderId=/.test(clone))clone=clone.replace(/^<x:xf\b/,'<x:xf borderId="0"');
          copies.set(original,xfs.length+copies.size);
          extra+=clone;
        }
        sheetXml=sheetXml.replace(expr,(_whole,start,_id,end)=>`${start}${copies.get(original)}${end}`);
      }
      const count=xfs.length+copies.size;
      stylesXml=stylesXml.replace(xfMatch[0],`<x:cellXfs${xfMatch[1].replace(/\bcount="[^"]*"/,`count="${count}"`)}>${xfMatch[2]}${extra}</x:cellXfs>`);
      stylesEntry.content=Buffer.from(stylesXml,'utf8');
      breakdown.content=Buffer.from(sheetXml,'utf8');
    }
    // すべてのシートを「A4横、1ページに収める、水平・垂直中央」に設定。
    // 元の図面・社印・書式・数式は維持し、印刷用の設定タグだけを更新する。
    for (const entry of entries) {
      if(!/^xl\/worksheets\/sheet\d+\.xml$/.test(entry.name)) continue;
      let xml=entry.content.toString('utf8');
      // 用紙に合わせて縮小（Excel ページ設定の「次のページ数に合わせて印刷」）。
      if(/<x:sheetPr\b/.test(xml)){
        xml=xml.replace(/<x:sheetPr\b[^>]*\/>/, '<x:sheetPr><x:pageSetUpPr fitToPage="1"/></x:sheetPr>');
        if(!/<x:pageSetUpPr\b/.test(xml))
          xml=xml.replace(/<x:sheetPr\b([^>]*)>/, '<x:sheetPr$1><x:pageSetUpPr fitToPage="1"/>');
      }else{
        xml=xml.replace(/(<x:worksheet\b[^>]*>)/, '$1<x:sheetPr><x:pageSetUpPr fitToPage="1"/></x:sheetPr>');
      }
      // pageMargins と pageSetup の順序はExcelの決まりに従う。
      const pageMargins='<x:pageMargins left="0.25" right="0.25" top="0.35" bottom="0.35" header="0.15" footer="0.15" />';
      if(/<x:pageMargins\b[^>]*\/>/.test(xml))
        xml=xml.replace(/<x:pageMargins\b[^>]*\/>/,pageMargins);
      else
        xml=xml.replace(/<\/x:mergeCells>/, '</x:mergeCells>'+pageMargins);
      const pageSetup='<x:pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="1" />';
      if(/<x:pageSetup\b[^>]*\/>/.test(xml))
        xml=xml.replace(/<x:pageSetup\b[^>]*\/>/,pageSetup);
      else
        xml=xml.replace(/(<x:pageMargins\b[^>]*\/>)/,'$1'+pageSetup);
      // 縦横どちらもページの中央に配置。printOptions は pageMargins より前。
      const printOptions='<x:printOptions horizontalCentered="1" verticalCentered="1" />';
      if(/<x:printOptions\b[^>]*\/>/.test(xml))
        xml=xml.replace(/<x:printOptions\b[^>]*\/>/,printOptions);
      else
        xml=xml.replace(/(<x:pageMargins\b)/,printOptions+'$1');
      entry.content=Buffer.from(xml,'utf8');
    }
    // Excelを開いたとき数式を再計算。画像やレイアウトは元ファイルを保持。
    const wb=sheets.get('xl/workbook.xml');
    if(wb){
      let xml=wb.content.toString('utf8');
      if(/<(?:x:)?calcPr\b[^>]*\/?\s*>/.test(xml))xml=xml.replace(/<(x:)?calcPr\b[^>]*\/?\s*>/,(_whole,prefix)=>`<${prefix||''}calcPr calcMode="auto" fullCalcOnLoad="1" forceFullCalc="1"/>`);
      else xml=xml.replace(/<\/(x:)?workbook>/,(_whole,prefix)=>`<${prefix||''}calcPr calcMode="auto" fullCalcOnLoad="1" forceFullCalc="1"/></${prefix||''}workbook>`);
      wb.content=Buffer.from(xml,'utf8');
    }
    const output=makeZip(entries);
    return new Response(new Uint8Array(output),{status:200,headers:{'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','Content-Disposition':'attachment; filename="yamato-estimate.xlsx"','Cache-Control':'no-store'}});
  }catch(err:any){
    console.error('estimate export:',err);
    return NextResponse.json({error:String(err?.message||'Excel出力に失敗しました。')},{status:500});
  }
}
