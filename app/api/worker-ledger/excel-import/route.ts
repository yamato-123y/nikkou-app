import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx-js-style';
import { assertAdmin, supabaseRest } from '../_lib';

export const runtime = 'nodejs';

type ImportRow = {
  worker_name: string;
  source_worker_name: string;
  category: string;
  qualification_name: string;
  certificate_no: string;
  acquired_date: string;
  source_sheet: string;
  source_row: number;
  status?: 'new' | 'duplicate' | 'unmatched';
  reason?: string;
};

const jsonError = (error: any) => {
  const status = Number(error?.status) || 500;
  console.error(error);
  return NextResponse.json({ error: error?.message || 'Excelの処理に失敗しました。' }, { status });
};

const normalize = (value: any) =>
  String(value ?? '')
    .normalize('NFKC')
    .replace(/[\s　]+/g, '')
    .replace(/[・･]/g, '')
    .toLowerCase();

const cleanText = (value: any) => {
  if (value == null) return '';
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return String(value).trim();
};

const normalizeSheetBase = (sheetName: string) =>
  String(sheetName || '')
    .replace(/\s*[（(]\s*\d+\s*[）)]\s*$/, '')
    .replace(/\s*\d+\s*$/, '')
    .trim();

const toIsoDate = (value: any) => {
  if (value == null || value === '') return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    const utc = Date.UTC(1899, 11, 30) + Math.round(value * 86400000);
    const d = new Date(utc);
    return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
  }
  const raw = String(value).trim();
  if (!raw) return '';
  const m = raw.match(/^(\d{4})[./\-年](\d{1,2})[./\-月](\d{1,2})日?$/);
  if (m) {
    const y = Number(m[1]);
    const mo = String(Number(m[2])).padStart(2, '0');
    const d = String(Number(m[3])).padStart(2, '0');
    return `${y}-${mo}-${d}`;
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10);
};

const findWorker = (sheetName: string, fullName: string, masterWorkers: string[]) => {
  const base = normalize(normalizeSheetBase(sheetName));
  const full = normalize(fullName);
  const candidates = masterWorkers.filter((name) => {
    const n = normalize(name);
    if (!n) return false;
    return n === base || n === full || base.startsWith(n) || n.startsWith(base) || full.startsWith(n) || n.startsWith(full);
  });
  const exactBase = candidates.find((name) => normalize(name) === base);
  if (exactBase) return exactBase;
  const exactFull = candidates.find((name) => normalize(name) === full);
  if (exactFull) return exactFull;
  return candidates.length === 1 ? candidates[0] : '';
};

const duplicateKey = (row: Pick<ImportRow, 'worker_name' | 'qualification_name' | 'certificate_no' | 'acquired_date'>) =>
  [normalize(row.worker_name), normalize(row.qualification_name), normalize(row.certificate_no), row.acquired_date || ''].join('|');

const sourceKey = (row: ImportRow) =>
  `excel:${normalize(row.worker_name)}:${normalize(row.qualification_name)}:${normalize(row.certificate_no)}:${row.acquired_date || ''}`;

export async function POST(request: Request) {
  try {
    assertAdmin(request);
    const form = await request.formData();
    const file = form.get('file');
    const workersRaw = String(form.get('workers') || '[]');
    const masterWorkers = JSON.parse(workersRaw);

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Excelファイルを選択してください。' }, { status: 400 });
    }
    if (!Array.isArray(masterWorkers) || masterWorkers.length === 0) {
      return NextResponse.json({ error: '作業員マスタを取得できませんでした。' }, { status: 400 });
    }
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: 'Excelファイルは20MB以下にしてください。' }, { status: 400 });
    }
    if (!/\.(xlsx|xls)$/i.test(file.name)) {
      return NextResponse.json({ error: 'Excel（.xlsx / .xls）を選択してください。' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: false });
    const parsedRows: ImportRow[] = [];

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) continue;
      const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, raw: true, defval: null });
      const fullName = cleanText(rows?.[0]?.[7]);
      const matchedWorker = findWorker(sheetName, fullName, masterWorkers.map(String));
      let currentCategory = '';

      for (let index = 0; index < rows.length; index += 1) {
        const row = rows[index] || [];
        const categoryCandidate = cleanText(row[0]);
        const qualificationName = cleanText(row[2]);
        if (categoryCandidate && !normalize(categoryCandidate).includes('株式会社大和')) {
          currentCategory = categoryCandidate;
        }
        if (!qualificationName) continue;
        if (normalize(qualificationName) === normalize('資格・講習名')) continue;

        const certificateNo = cleanText(row[5]);
        const acquiredDate = toIsoDate(row[8]);
        parsedRows.push({
          worker_name: matchedWorker,
          source_worker_name: fullName || normalizeSheetBase(sheetName),
          category: currentCategory || 'その他',
          qualification_name: qualificationName,
          certificate_no: certificateNo,
          acquired_date: acquiredDate,
          source_sheet: sheetName,
          source_row: index + 1,
          status: matchedWorker ? 'new' : 'unmatched',
          reason: matchedWorker ? '' : '作業員マスタの名前と一致しませんでした。'
        });
      }
    }

    const existingRes = await supabaseRest('/rest/v1/worker_qualifications?select=worker_name,qualification_name,certificate_no,acquired_date');
    const existing = await existingRes.json().catch(() => []);
    const existingKeys = new Set((Array.isArray(existing) ? existing : []).map((row: any) => duplicateKey({
      worker_name: String(row?.worker_name || ''),
      qualification_name: String(row?.qualification_name || ''),
      certificate_no: String(row?.certificate_no || ''),
      acquired_date: String(row?.acquired_date || '')
    })));

    const seen = new Set<string>();
    for (const row of parsedRows) {
      if (row.status === 'unmatched') continue;
      const key = duplicateKey(row);
      if (existingKeys.has(key) || seen.has(key)) {
        row.status = 'duplicate';
        row.reason = 'すでに同じ資格情報が登録されています。';
      } else {
        seen.add(key);
      }
    }

    const summary = {
      sheets: workbook.SheetNames.length,
      total: parsedRows.length,
      newCount: parsedRows.filter((row) => row.status === 'new').length,
      duplicateCount: parsedRows.filter((row) => row.status === 'duplicate').length,
      unmatchedCount: parsedRows.filter((row) => row.status === 'unmatched').length
    };

    return NextResponse.json({ ok: true, fileName: file.name, rows: parsedRows, summary });
  } catch (error: any) {
    return jsonError(error);
  }
}

export async function PUT(request: Request) {
  try {
    assertAdmin(request);
    const body = await request.json();
    const rows: ImportRow[] = Array.isArray(body?.rows) ? body.rows : [];
    const candidates = rows.filter((row) => row && row.status === 'new' && row.worker_name && row.qualification_name);
    if (candidates.length === 0) {
      return NextResponse.json({ error: '新しく登録できる資格情報がありません。' }, { status: 400 });
    }
    if (candidates.length > 1000) {
      return NextResponse.json({ error: '一度に登録できるのは1000件までです。' }, { status: 400 });
    }

    const existingRes = await supabaseRest('/rest/v1/worker_qualifications?select=worker_name,qualification_name,certificate_no,acquired_date');
    const existing = await existingRes.json().catch(() => []);
    const existingKeys = new Set((Array.isArray(existing) ? existing : []).map((row: any) => duplicateKey({
      worker_name: String(row?.worker_name || ''),
      qualification_name: String(row?.qualification_name || ''),
      certificate_no: String(row?.certificate_no || ''),
      acquired_date: String(row?.acquired_date || '')
    })));

    const seen = new Set<string>();
    const toInsert = candidates.filter((row) => {
      const key = duplicateKey(row);
      if (existingKeys.has(key) || seen.has(key)) return false;
      seen.add(key);
      return true;
    }).map((row) => ({
      worker_name: String(row.worker_name).trim(),
      category: String(row.category || 'その他').trim() || 'その他',
      qualification_name: String(row.qualification_name).trim(),
      certificate_no: String(row.certificate_no || '').trim() || null,
      acquired_date: row.acquired_date || null,
      expiry_date: null,
      issuing_body: null,
      notes: `Excel取込：${row.source_sheet} ${row.source_row}行目`,
      source_key: sourceKey(row),
      updated_at: new Date().toISOString()
    }));

    if (toInsert.length === 0) {
      return NextResponse.json({ ok: true, inserted: 0, skipped: candidates.length });
    }

    const res = await supabaseRest('/rest/v1/worker_qualifications?on_conflict=source_key', {
      method: 'POST',
      body: JSON.stringify(toInsert)
    }, { Prefer: 'resolution=ignore-duplicates,return=representation' });
    const insertedRows = await res.json().catch(() => []);

    return NextResponse.json({
      ok: true,
      inserted: Array.isArray(insertedRows) ? insertedRows.length : toInsert.length,
      skipped: candidates.length - toInsert.length
    });
  } catch (error: any) {
    return jsonError(error);
  }
}
