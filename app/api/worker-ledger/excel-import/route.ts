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
