'use client';

// 添付の全建統一様式第2号（A1:V58）をそのまま複製し、赤文字で示された
// 作業員情報欄だけを差し替えます。データの保存・変更・削除は一切しません。
import * as XLSX from 'xlsx-js-style';

type Profile = { worker_name?: string; full_name?: string | null; hire_date?: string | null; birth_date?: string | null; blood_type?: string | null; address?: string | null; emergency_contact?: string | null; notes?: string | null };
type Qual = { worker_name?: string; category?: string | null; qualification_name?: string | null };
type Health = { worker_name?: string; exam_date?: string | null; systolic?: number | string | null; diastolic?: number | string | null };
type Ledger = { profiles?: Profile[]; qualifications?: Qual[]; healthChecks?: Health[] };
const text = (value: unknown) => String(value ?? '').trim();
const matchKey = (value: unknown) => String(value ?? '').normalize('NFKC').replace(/[\s\u3000]+/g, '').toLowerCase();
const note = (value: unknown, label: string) => text(value).split(/\r?\n/).find(line => line.startsWith(`${label}：`))?.slice(label.length + 1).trim() || '';
const formatDate = (value: unknown) => { const m = text(value).match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/); return m ? `${Number(m[1])}年${Number(m[2])}月${Number(m[3])}日` : ''; };
const ageOf = (value: unknown, today: Date) => {
  const m = text(value).match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (!m) return '';
  const year = Number(m[1]), month = Number(m[2]), day = Number(m[3]);
  return `${today.getFullYear() - year - ((today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < day)) ? 1 : 0)}歳`;
};
const styleForEnteredValue = (old: XLSX.CellObject) => {
  const prev = (old as any)?.s;
  // テンプレートの罫線・結合セル・配置を維持し、赤い案内文字だけ黒字へ。
  if (prev && typeof prev === 'object') return { ...prev, font: { ...(prev.font || {}), color: { rgb: 'FF111827' } }, alignment: { ...(prev.alignment || {}), shrinkToFit: true, vertical: 'center' } };
  return { font: { name: 'ＭＳ Ｐゴシック', sz: 8, color: { rgb: 'FF111827' } }, alignment: { vertical: 'center', shrinkToFit: true } };
};
const put = (ws: XLSX.WorkSheet, addr: string, value: unknown) => {
  const v = text(value);
  if (!v) return;
  const old = (ws[addr] || {}) as XLSX.CellObject;
  ws[addr] = { ...old, t: 's', v, s: styleForEnteredValue(old) } as XLSX.CellObject;
};
// 11～13行にのみ残っている赤字の「ふりがな」等はサンプル／入力位置の目印。
// 初回作業員の出力前に赤字の案内内容を消す（罫線・書式は消さない）。
const exampleCells = ['C11','F11','H11','J11','K11','N11','P11','Q11','R11','S11','T11','U11','V11','C12','H13','J13','K13','N13','P13','R13','V13'];
const clearExampleValues = (ws: XLSX.WorkSheet) => {
  exampleCells.forEach(addr => {
    const cell = ws[addr] as XLSX.CellObject | undefined;
    if (cell) { delete cell.v; delete cell.w; delete cell.f; cell.t = 'z'; }
  });
};

export async function exportWorkerRoster(names: string[], ledger: Ledger): Promise<void> {
  const ordered = [...new Set(names.map(text).filter(Boolean))];
  if (!ordered.length) throw new Error('作業員を選択してください。');
  const response = await fetch('/templates/worker-roster.xlsx', { cache: 'no-store' });
  if (!response.ok) throw new Error('ひな形が見つかりません。public/templates/worker-roster.xlsx を配置してください。');
  const source = XLSX.read(await response.arrayBuffer(), { type: 'array', cellStyles: true, cellDates: false });
  const template = source.Sheets[source.SheetNames[0]];
  if (!template || !text(template.B1?.v).startsWith('全建統一様式第２号') || !String(template['!ref'] || '').includes('V58')) {
    throw new Error('現在の添付worker-roster.xlsxと様式が異なります。ひな形を確認してください。');
  }
  const wb = XLSX.utils.book_new();
  if (source.Props) wb.Props = { ...source.Props };
  const profiles = Array.isArray(ledger.profiles) ? ledger.profiles : [];
  const qualifications = Array.isArray(ledger.qualifications) ? ledger.qualifications : [];
  const health = Array.isArray(ledger.healthChecks) ? ledger.healthChecks : [];
  const now = new Date();
  const pages = Math.ceil(ordered.length / 10);

  for (let page = 0; page < pages; page++) {
    // シート全体を原本から複製：219箇所の結合、罫線、列幅、行高等を維持。
    const ws: XLSX.WorkSheet = JSON.parse(JSON.stringify(template));
    clearExampleValues(ws);
    // 事業名・会社名・入場日など赤字指定のない項目には何も書き込まない。
    ordered.slice(page * 10, page * 10 + 10).forEach((name, idx) => {
      const row = 11 + idx * 3;
      const key = matchKey(name);
      const profile = profiles.find(item => matchKey(item.worker_name) === key);
      const qs = qualifications.filter(item => matchKey(item.worker_name) === key);
      const h = health.filter(item => matchKey(item.worker_name) === key).sort((a,b) => text(b.exam_date).localeCompare(text(a.exam_date)))[0];
      const categories = (word: string) => [...new Set(qs.filter(x => text(x.category).includes(word)).map(x => text(x.qualification_name)).filter(Boolean))].join('、');
      const licenses = [...new Set(qs.filter(x => !text(x.category).includes('特別教育') && !text(x.category).includes('技能講習')).map(x => text(x.qualification_name)).filter(Boolean))].join('、');
      const jobRaw = note(profile?.notes, '職種');
      const exp = note(profile?.notes, '経験年数') || jobRaw.match(/経験年数\s*[：:]\s*([^／/\n]+)/)?.[1]?.trim() || '';
      const job = jobRaw.split(/\s*[／/]\s*(?=経験年数\s*[：:])/)[0];
      put(ws, `B${row}`, page * 10 + idx + 1);
      put(ws, `C${row}`, note(profile?.notes, 'ふりがな'));
      put(ws, `C${row+1}`, profile?.full_name || name);
      put(ws, `F${row}`, job);
      put(ws, `H${row}`, formatDate(profile?.hire_date));
      put(ws, `H${row+2}`, exp ? (/年/.test(exp) ? exp : `${exp}年`) : '');
      put(ws, `J${row}`, formatDate(profile?.birth_date));
      put(ws, `J${row+2}`, ageOf(profile?.birth_date, now));
      put(ws, `K${row}`, profile?.address);
      put(ws, `K${row+2}`, profile?.emergency_contact);
      put(ws, `P${row}`, formatDate(h?.exam_date));
      if (h && (text(h.systolic) || text(h.diastolic))) put(ws, `P${row+2}`, `${text(h.systolic)}/${text(h.diastolic)}`);
      put(ws, `Q${row}`, profile?.blood_type);
      put(ws, `S${row}`, categories('特別教育'));
      put(ws, `T${row}`, categories('技能講習'));
      put(ws, `U${row}`, licenses);
    });
    // 添付様式の印刷設定を維持（勝手な余白・サイズ変更をしない）。
    XLSX.utils.book_append_sheet(wb, ws, pages === 1 ? '作業員名簿' : `作業員名簿${page + 1}`);
  }
  const suffix = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;
  XLSX.writeFile(wb, `作業員名簿_全建統一様式第2号_${suffix}.xlsx`, { bookType: 'xlsx' });
}
