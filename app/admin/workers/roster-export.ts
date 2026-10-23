'use client';

// 添付された「全建統一様式第２号」（A1:V58）のExcel様式を利用する。
// 書き出し専用。Supabase上の情報は更新・削除しない。
import * as XLSX from 'xlsx-js-style';

type Profile = { worker_name?: string; full_name?: string | null; birth_date?: string | null; hire_date?: string | null; blood_type?: string | null; address?: string | null; emergency_contact?: string | null; notes?: string | null; employment_type?: string | null; employee_no?: string | null };
type Qual = { worker_name?: string; qualification_name?: string | null; category?: string | null };
type Health = { worker_name?: string; exam_date?: string | null; notes?: string | null; systolic?: string | number | null; diastolic?: string | number | null };
type Ledger = { profiles?: Profile[]; qualifications?: Qual[]; healthChecks?: Health[] };
const safe = (v: unknown): string => String(v ?? '').trim();
const normalizedName = (v: unknown): string => safe(v).normalize('NFKC').replace(/[\s\u3000]+/g, '');
const noteValue = (notes: unknown, label: string): string => safe(notes).split(/\r?\n/).find(x => x.startsWith(`${label}：`))?.slice(label.length + 1).trim() || '';
const dateParts = (value: unknown): string[] => {
  const m = safe(value).match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/);
  return m ? [m[1], String(Number(m[2])), String(Number(m[3]))] : [];
};
const japaneseDate = (value: unknown): string => {
  const p = dateParts(value);
  return p.length === 3 ? `${p[0]}年${p[1]}月${p[2]}日` : '';
};
const ageAt = (dob: unknown, now: Date): string => {
  const p = dateParts(dob).map(Number);
  if (p.length !== 3) return '';
  const [y, m, d] = p;
  return String(now.getFullYear() - y - ((now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)) ? 1 : 0));
};
const fallbackStyle = { alignment: { horizontal: 'center', vertical: 'center', wrapText: true }, font: { name: 'ＭＳ Ｐゴシック', sz: 9 } };
const put = (ws: XLSX.WorkSheet, ref: string, value: unknown) => {
  const v = safe(value);
  if (!v) return;
  const old = (ws[ref] || {}) as XLSX.CellObject;
  // 元様式の罫線・背景色・結合設定を保持する。
  const previousStyle = ((old as any).s || fallbackStyle) as any;
  // セルの罫線・結合・文字の強調は維持し、長い文字だけセル内に縮小して収める。
  ws[ref] = {
    ...old, t: 's', v,
    s: {
      ...previousStyle,
      alignment: {
        ...(previousStyle.alignment || {}),
        vertical: 'center',
        wrapText: false,
        shrinkToFit: true,
      },
    },
  } as XLSX.CellObject;
};
const uniqNames = (arr: Qual[]) => [...new Set(arr.map(q => safe(q.qualification_name)).filter(Boolean))].join('、');

export async function exportWorkerRoster(names: string[], ledger: Ledger): Promise<void> {
  const ordered = [...new Set(names.map(safe).filter(Boolean))];
  if (!ordered.length) throw new Error('名簿に載せる作業員を選択してください。');
  const response = await fetch('/templates/worker-roster.xlsx', { cache: 'no-store' });
  if (!response.ok) throw new Error('作業員名簿の様式が見つかりません。public/templates/worker-roster.xlsx を確認してください。');
  const source = XLSX.read(await response.arrayBuffer(), { type: 'array', cellStyles: true, cellDates: false });
  const template = source.Sheets[source.SheetNames[0]];
  if (!template || !safe(template.B1?.v).startsWith('全建統一様式第２号')) {
    throw new Error('テンプレートが今回指定された全建統一様式第２号ではありません。');
  }
  const workbook = XLSX.utils.book_new();
  if (source.Props) workbook.Props = { ...source.Props };
  const profiles = Array.isArray(ledger.profiles) ? ledger.profiles : [];
  const qualifications = Array.isArray(ledger.qualifications) ? ledger.qualifications : [];
  const healthChecks = Array.isArray(ledger.healthChecks) ? ledger.healthChecks : [];
  const now = new Date();
  const count = Math.ceil(ordered.length / 10);
  for (let page = 0; page < count; page++) {
    const ws: XLSX.WorkSheet = JSON.parse(JSON.stringify(template));
    // 原本は日付を一つの結合セルで表示する様式。
    put(ws, 'B3', `（ ${now.getFullYear()}年${now.getMonth()+1}月${now.getDate()}日 作成 ）`);
    ordered.slice(page * 10, (page+1) * 10).forEach((name, idx) => {
      const r = 11 + idx * 3; // 1名につき3行、全10名
      const key = normalizedName(name);
      const profile = profiles.find(p => normalizedName(p.worker_name) === key);
      const q = qualifications.filter(item => normalizedName(item.worker_name) === key);
      const health = healthChecks.filter(item => normalizedName(item.worker_name) === key)
        .sort((a, b) => safe(b.exam_date).localeCompare(safe(a.exam_date)))[0];
      const rawJob = noteValue(profile?.notes, '職種');
      const job = rawJob.split(/\s*[／/]\s*(?=経験年数\s*[：:])/)[0].trim();
      const experience = noteValue(profile?.notes, '経験年数') || rawJob.match(/経験年数\s*[：:]\s*([^／/\n]+)/)?.[1]?.trim() || '';
      put(ws, `B${r}`, idx+1 + page*10);
      put(ws, `C${r}`, noteValue(profile?.notes, 'ふりがな'));
      put(ws, `C${r+1}`, profile?.full_name || name);
      put(ws, `F${r}`, job);
      put(ws, `H${r}`, japaneseDate(profile?.hire_date));
      put(ws, `H${r+2}`, experience);
      put(ws, `J${r}`, japaneseDate(profile?.birth_date));
      put(ws, `J${r+2}`, ageAt(profile?.birth_date, now) ? `${ageAt(profile?.birth_date, now)}歳` : '');
      put(ws, `K${r}`, profile?.address);
      put(ws, `K${r+2}`, profile?.emergency_contact);
      put(ws, `P${r}`, japaneseDate(health?.exam_date));
      if (health?.systolic != null || health?.diastolic != null) {
        put(ws, `P${r+2}`, [health.systolic, health.diastolic].filter(v=>v !== null && v !== undefined && v !== '').join('／'));
      }
      put(ws, `Q${r}`, profile?.blood_type);
      put(ws, `R${r}`, noteValue(health?.notes, '特殊健康診断日'));
      put(ws, `S${r}`, uniqNames(q.filter(v => safe(v.category).includes('特別教育'))));
      put(ws, `T${r}`, uniqNames(q.filter(v => safe(v.category).includes('技能講習'))));
      put(ws, `U${r}`, uniqNames(q.filter(v => !safe(v.category).includes('特別教育') && !safe(v.category).includes('技能講習'))));
      // 入場日・受入教育日・現場名・会社名は現状台帳に対応する値が無いため、原本の欄を維持。
    });
    // A4横・余白狭め。1シート=1ページとして印刷する。
    // !margins は xlsx-js-style の出力対象、!pageSetup は対応する実装で利用される。
    (ws as any)['!margins'] = {
      left: 0.2, right: 0.2, top: 0.25, bottom: 0.25,
      header: 0.1, footer: 0.1,
    };
    (ws as any)['!pageSetup'] = {
      paperSize: 9, orientation: 'landscape', fitToWidth: 1, fitToHeight: 1,
      fitToPage: true, scale: 100,
    };
    (ws as any)['!printOptions'] = { horizontalCentered: true };
    XLSX.utils.book_append_sheet(workbook, ws, count === 1 ? '作業員名簿' : `作業員名簿${page+1}`);
  }
  const today = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;
  XLSX.writeFile(workbook, `作業員名簿_全建統一様式第2号_${today}.xlsx`, { bookType: 'xlsx', cellStyles: true });
}
