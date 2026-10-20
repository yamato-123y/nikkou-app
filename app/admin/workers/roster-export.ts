'use client';

// 全建統一様式第2号の原本Excelに、選択された作業員の登録情報のみ書き込みます。
// データベース・Storageへの保存、更新、削除処理はありません。
import * as XLSX from 'xlsx-js-style';

type Profile = { worker_name?: string; full_name?: string | null; birth_date?: string | null; hire_date?: string | null; blood_type?: string | null; address?: string | null; emergency_contact?: string | null; notes?: string | null; employment_type?: string | null };
type Qual = { worker_name?: string; qualification_name?: string | null; category?: string | null };
type Health = { worker_name?: string; exam_date?: string | null; notes?: string | null; systolic?: string | number | null; diastolic?: string | number | null };
type Ledger = { profiles?: Profile[]; qualifications?: Qual[]; healthChecks?: Health[] };
const safe = (x: unknown) => String(x ?? '').trim();
const noteValue = (notes: unknown, label: string) => safe(notes).split(/\r?\n/).find(x => x.startsWith(`${label}：`))?.slice(label.length + 1).trim() || '';
const parts = (input: unknown): string[] => {
  const match = safe(input).match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/);
  return match ? [match[1], String(Number(match[2])), String(Number(match[3]))] : ['', '', ''];
};
const age = (dob: unknown, at: Date) => {
  const [y, m, d] = parts(dob).map(Number);
  if (!y || !m || !d) return '';
  return String(at.getFullYear() - y - (at.getMonth()+1 < m || (at.getMonth()+1===m && at.getDate()<d) ? 1 : 0));
};
const valueStyle = { alignment: { horizontal: 'center', vertical: 'center', wrapText: true }, font: { name: 'ＭＳ Ｐゴシック', sz: 9 } };

/** 結合セルの先頭に値を入れ、元の罫線・セル書式は上書きしない。 */
const put = (ws: XLSX.WorkSheet, cell: string, value: unknown) => {
  const v = safe(value);
  if (!v) return;
  const old = (ws[cell] || {}) as XLSX.CellObject;
  ws[cell] = { ...old, t: 's', v, s: (old as any).s || valueStyle } as XLSX.CellObject;
};
const dateInto = (ws: XLSX.WorkSheet, positions: [string,string,string], value: unknown) => {
  const p = parts(value);
  positions.forEach((ref, i) => put(ws, ref, p[i]));
};

export async function exportWorkerRoster(names: string[], ledger: Ledger): Promise<void> {
  const ordered = [...new Set(names.map(safe).filter(Boolean))];
  if (!ordered.length) throw new Error('作業員を選択してください。');

  // 元Excelはアプリ同梱のテンプレートを読み込むだけで、サーバー上のファイルは変更しません。
  const response = await fetch('/templates/worker-roster.xlsx', { cache: 'no-store' });
  if (!response.ok) throw new Error('全建統一様式第2号のひな形が見つかりません。public/templates/worker-roster.xlsx を配置してください。');
  const buffer = await response.arrayBuffer();
  const source = XLSX.read(buffer, { type: 'array', cellStyles: true, cellDates: false });
  const template = source.Sheets[source.SheetNames[0]];
  if (!template || safe(template.A1?.v) !== '全建統一様式第2号') throw new Error('作業員名簿のひな形が正しくありません。');
  const wb = XLSX.utils.book_new();
  const profiles = Array.isArray(ledger.profiles) ? ledger.profiles : [];
  const qualifications = Array.isArray(ledger.qualifications) ? ledger.qualifications : [];
  const health = Array.isArray(ledger.healthChecks) ? ledger.healthChecks : [];
  const now = new Date();
  const count = Math.ceil(ordered.length / 10);

  for (let page = 0; page < count; page++) {
    // 原本の730箇所以上ある結合セル、行列幅、書式、印刷設定を複製。
    const ws: XLSX.WorkSheet = JSON.parse(JSON.stringify(template));
    dateInto(ws, ['BO6', 'BV6', 'CD6'], `${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()}`);
    // 注：元の様式にある会社名などの既定値は変更しません。
    ordered.slice(page * 10, page * 10 + 10).forEach((name, index) => {
      const r = 20 + 6 * index;
      const p = profiles.find(x => x.worker_name === name);
      const q = qualifications.filter(x => x.worker_name === name);
      const h = health.filter(x => x.worker_name === name).sort((a,b) => safe(b.exam_date).localeCompare(safe(a.exam_date)))[0];
      put(ws, `E${r + 2}`, p?.full_name || name);
      put(ws, `E${r}`, noteValue(p?.notes, 'ふりがな'));
      put(ws, `V${r}`, noteValue(p?.notes, '職種'));
      put(ws, `AL${r + 3}`, noteValue(p?.notes, '経験年数'));
      dateInto(ws, [`AL${r}`, `AQ${r}`, `AV${r}`,], p?.hire_date);
      dateInto(ws, [`BA${r}`, `BF${r}`, `BK${r}`], p?.birth_date);
      put(ws, `BA${r + 3}`, age(p?.birth_date, now));
      put(ws, `EP${r}`, p?.blood_type);
      put(ws, `BP${r}`, p?.address);
      put(ws, `BP${r + 3}`, p?.emergency_contact);
      dateInto(ws, [`EA${r}`, `EF${r}`, `EK${r}`], h?.exam_date);
      if (h?.systolic != null || h?.diastolic != null) put(ws, `EA${r+3}`, [h?.systolic, h?.diastolic].filter(x=>x != null && x !== '').join('/'));
      const categories = (word: string) => [...new Set(q.filter(x => safe(x.category).includes(word)).map(x => safe(x.qualification_name)).filter(Boolean))].join('、');
      const training = categories('特別教育');
      const skills = categories('技能講習');
      const licenses = [...new Set(q.filter(x => !safe(x.category).includes('特別教育') && !safe(x.category).includes('技能講習')).map(x => safe(x.qualification_name)).filter(Boolean))].join('、');
      put(ws, `GG${r}`, training);
      put(ws, `GS${r}`, skills);
      put(ws, `HE${r}`, licenses);
      put(ws, `FI${r}`, noteValue(p?.notes, '健康保険'));
      put(ws, `FI${r+2}`, noteValue(p?.notes, '年金保険'));
      put(ws, `FI${r+4}`, noteValue(p?.notes, '雇用保険'));
    });
    XLSX.utils.book_append_sheet(wb, ws, count===1 ? '作業員名簿' : `作業員名簿${page + 1}`);
  }
  const yyyyMMdd = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;
  XLSX.writeFile(wb, `作業員名簿_全建統一様式第2号_${yyyyMMdd}.xlsx`, { bookType: 'xlsx' });
}
