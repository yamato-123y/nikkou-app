'use client';

// 名簿の試験出力（読み取り専用）。DBへの書き込みや削除は行わない。
import * as XLSX from 'xlsx-js-style';

type Profile = { worker_name?: string; full_name?: string | null; birth_date?: string | null; hire_date?: string | null; blood_type?: string | null; address?: string | null; emergency_contact?: string | null; notes?: string | null; employment_type?: string | null };
type Qual = { worker_name?: string; qualification_name?: string | null; category?: string | null };
type Health = { worker_name?: string; exam_date?: string | null; notes?: string | null };
type Ledger = { profiles?: Profile[]; qualifications?: Qual[]; healthChecks?: Health[] };
const safe = (x: unknown) => String(x ?? '').trim();
const noteValue = (notes: unknown, label: string) => safe(notes).split(/\r?\n/).find(x => x.startsWith(`${label}：`))?.slice(label.length + 1).trim() || '';
const prettyDate = (s: unknown) => /^\d{4}-\d{2}-\d{2}/.test(safe(s)) ? safe(s).slice(0, 10).replace(/-/g, '/') : safe(s);
const ageAt = (birth: unknown, today: Date) => {
  const text = safe(birth);
  if (!/^\d{4}-\d{2}-\d{2}/.test(text)) return '';
  const [y,m,d] = text.slice(0,10).split('-').map(Number);
  if (!y || !m || !d) return '';
  return String(today.getFullYear() - y - (today.getMonth()+1 < m || (today.getMonth()+1 === m && today.getDate() < d) ? 1 : 0));
};

export function exportWorkerRoster(names: string[], ledger: Ledger) {
  if (!names.length) throw new Error('作業員を選択してください。');
  const now = new Date();
  const ordered = [...new Set(names)];
  const profiles = Array.isArray(ledger.profiles) ? ledger.profiles : [];
  const quals = Array.isArray(ledger.qualifications) ? ledger.qualifications : [];
  const health = Array.isArray(ledger.healthChecks) ? ledger.healthChecks : [];
  const headers = ['番号', '氏名', '生年月日', '年齢', '血液型', '現住所', '緊急連絡先', '雇入年月日', '職種', '経験年数', '最近の健康診断日', '保有資格・講習', '健康保険', '年金保険', '雇用保険'];
  const rows: (string | number)[][] = [
    ['作業員名簿（全建統一様式第2号：試験出力）'],
    [`作成日：${now.getFullYear()}年${now.getMonth()+1}月${now.getDate()}日`, `対象人数：${ordered.length}名`],
    [],
    headers,
  ];
  ordered.forEach((name, i) => {
    const p = profiles.find(x => x.worker_name === name);
    const latestHealth = health.filter(x => x.worker_name === name).sort((a,b) => safe(b.exam_date).localeCompare(safe(a.exam_date)))[0];
    const qualificationNames = [...new Set(quals.filter(x => x.worker_name === name).map(x => safe(x.qualification_name)).filter(Boolean))];
    rows.push([
      i+1, safe(p?.full_name) || name, prettyDate(p?.birth_date), ageAt(p?.birth_date, now), safe(p?.blood_type),
      safe(p?.address), safe(p?.emergency_contact), prettyDate(p?.hire_date), noteValue(p?.notes, '職種'),
      noteValue(p?.notes, '経験年数'), prettyDate(latestHealth?.exam_date), qualificationNames.join('、'),
      noteValue(p?.notes, '健康保険'), noteValue(p?.notes, '年金保険'), noteValue(p?.notes, '雇用保険'),
    ]);
  });
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!merges'] = [{s:{r:0,c:0},e:{r:0,c:14}}];
  ws['!cols'] = [7,22,16,8,10,34,24,16,14,12,17,46,16,16,16].map(wch => ({wch}));
  ws['!rows'] = rows.map((_,r) => ({hpt: r===0 ? 35 : r===3 ? 36 : r>=4 ? 62 : 24}));
  const border: any = {top:{style:'thin',color:{rgb:'64748B'}},bottom:{style:'thin',color:{rgb:'64748B'}},left:{style:'thin',color:{rgb:'64748B'}},right:{style:'thin',color:{rgb:'64748B'}}};
  for (let r = 0; r < rows.length; r++) for(let c = 0; c < 15; c++) {
    const ref = XLSX.utils.encode_cell({r,c});
    if (!ws[ref] && r>=3) ws[ref] = {t:'s',v:''};
    const cell: any = ws[ref]; if (!cell) continue;
    cell.s = {
      font: { name:'Yu Gothic', sz:r===0?17:r===3?9:10, bold:r===0||r===3, color:{rgb:r===3?'FFFFFF':'172033'} },
      fill: r===3? {patternType:'solid',fgColor:{rgb:'334155'}} : r>=4 && r%2===0 ? {patternType:'solid',fgColor:{rgb:'F1F5F9'}} : {patternType:'solid',fgColor:{rgb:'FFFFFF'}},
      alignment:{vertical:'center',horizontal:r===0?'center':c===0?'center':'left',wrapText:true},
      ...(r>=3?{border}:{})
    };
  }
  ws['!pageSetup'] = {paperSize:9,orientation:'landscape',fitToWidth:1,fitToHeight:0};
  ws['!margins'] = {left:0.2,right:0.2,top:0.35,bottom:0.35,header:0.1,footer:0.1};
  ws['!printOptions'] = {horizontalCentered:true};
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '作業員名簿');
  XLSX.writeFile(wb, `作業員名簿_${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}.xlsx`);
}
