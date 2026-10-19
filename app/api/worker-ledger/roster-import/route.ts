import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx-js-style';
import { assertAdmin, supabaseRest } from '../_lib';

export const runtime = 'nodejs';

type QualificationInput = { category: string; qualification_name: string };
type RosterImportRow = {
  worker_name: string;
  source_full_name: string;
  furigana: string;
  roster_no: string;
  job_type: string;
  experience_years: string;
  hire_date: string;
  birth_date: string;
  blood_type: string;
  address: string;
  emergency_contact: string;
  health_exam_date: string;
  systolic: string;
  diastolic: string;
  qualifications: QualificationInput[];
  source_sheet: string;
  source_row: number;
  status: 'matched' | 'unmatched';
  reason?: string;
};

const jsonError = (error: any) => {
  const status = Number(error?.status) || 500;
  console.error(error);
  return NextResponse.json({ error: error?.message || '作業員名簿Excelの処理に失敗しました。' }, { status });
};

const normalize = (value: any) =>
  String(value ?? '')
    .normalize('NFKC')
    .replace(/[\s　]+/g, '')
    .replace(/[・･]/g, '')
    .toLowerCase();

const cleanText = (value: any) => String(value ?? '').replace(/\r/g, '').trim();

const toIsoDate = (value: any) => {
  if (value == null || value === '') return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  if (typeof value === 'number' && Number.isFinite(value)) {
    const utc = Date.UTC(1899, 11, 30) + Math.round(value * 86400000);
    const d = new Date(utc);
    return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
  }
  const raw = cleanText(value);
  const m = raw.match(/^(\d{4})[./\-年](\d{1,2})[./\-月](\d{1,2})日?$/);
  if (m) return `${m[1]}-${String(Number(m[2])).padStart(2, '0')}-${String(Number(m[3])).padStart(2, '0')}`;
  return '';
};

const splitQualifications = (value: any) => {
  const text = cleanText(value);
  if (!text) return [] as string[];
  return text
    .split(/\n|、|(?:[ \t　]{2,})/g)
    .map((x) => x.trim())
    .filter((x) => x && x !== '-' && x !== '－')
    .filter((x, i, arr) => arr.findIndex((y) => normalize(y) === normalize(x)) === i);
};

const firstNameToken = (value: string) =>
  String(value || '')
    .normalize('NFKC')
    .trim()
    .split(/[\s　]+/)[0] || '';

const findWorker = (fullName: string, furigana: string, masterWorkers: string[]) => {
  const full = normalize(fullName);
  const kana = normalize(furigana);

  // まず氏名全体の完全一致だけを優先する。
  // 「辻」と「辻阪」のような前方一致では別人なので、自動一致させない。
  const exact = masterWorkers.find((name) => {
    const n = normalize(name);
    return !!n && (n === full || n === kana);
  });
  if (exact) return exact;

  // Excel側に「姓 名」のように明確な区切りがある場合だけ、
  // 姓部分と作業員マスタの完全一致を許可する。
  // 例: 「辻 幸良」→「辻」は一致するが、「辻阪」には一致しない。
  const surnameCandidates = [firstNameToken(fullName), firstNameToken(furigana)]
    .map(normalize)
    .filter(Boolean);
  const surnameMatches = masterWorkers.filter((name) => surnameCandidates.includes(normalize(name)));
  return surnameMatches.length === 1 ? surnameMatches[0] : '';
};

const qualKey = (worker: string, category: string, name: string) =>
  [normalize(worker), normalize(category), normalize(name)].join('|');

const isBlank = (value: any) => value == null || String(value).trim() === '';

export async function POST(request: Request) {
  try {
    assertAdmin(request);
    const form = await request.formData();
    const file = form.get('file');
    const workersRaw = String(form.get('workers') || '[]');
    const masterWorkers = JSON.parse(workersRaw);

    if (!(file instanceof File)) return NextResponse.json({ error: '作業員名簿Excelを選択してください。' }, { status: 400 });
    if (!Array.isArray(masterWorkers) || masterWorkers.length === 0) return NextResponse.json({ error: '作業員マスタを取得できませんでした。' }, { status: 400 });
    if (file.size > 20 * 1024 * 1024) return NextResponse.json({ error: 'Excelファイルは20MB以下にしてください。' }, { status: 400 });
    if (!/\.(xlsx|xls)$/i.test(file.name)) return NextResponse.json({ error: 'Excel（.xlsx / .xls）を選択してください。' }, { status: 400 });

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: false });
    const activeSheetNames = workbook.SheetNames.filter((name) => name !== '退職者' && name !== '原本');
    const parsed: RosterImportRow[] = [];

    for (const sheetName of activeSheetNames) {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) continue;
      const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, raw: true, defval: '' });

      for (let r = 18; r < rows.length; r += 1) {
        const row = rows[r] || [];
        const rosterNoRaw = row[0];
        const rosterNo = typeof rosterNoRaw === 'number' ? String(Math.trunc(rosterNoRaw)) : cleanText(rosterNoRaw);
        if (!/^\d+$/.test(rosterNo)) continue;
        const detailRow = rows[r + 2] || [];
        const subRow = rows[r + 3] || [];
        const sourceFullName = cleanText(detailRow[4]).replace(/\n+/g, ' ');
        const furigana = cleanText(row[4]).replace(/\n+/g, ' ');
        if (!sourceFullName && !furigana) continue;

        const workerName = findWorker(sourceFullName, furigana, masterWorkers.map(String));
        const emergencyText = cleanText(subRow[67]);
        const emergencyTel = cleanText(subRow[114]);
        const emergencyContact = [emergencyText, emergencyTel ? `TEL ${emergencyTel}` : ''].filter(Boolean).join(' / ');
        const qualifications: QualificationInput[] = [
          ...splitQualifications(row[188]).map((name) => ({ category: '特別教育', qualification_name: name })),
          ...splitQualifications(row[200]).map((name) => ({ category: '技能講習', qualification_name: name })),
          ...splitQualifications(row[212]).map((name) => ({ category: '運転免許証', qualification_name: name }))
        ].filter((item, i, arr) => arr.findIndex((x) => qualKey('', x.category, x.qualification_name) === qualKey('', item.category, item.qualification_name)) === i);

        parsed.push({
          worker_name: workerName,
          source_full_name: sourceFullName,
          furigana,
          roster_no: rosterNo,
          job_type: cleanText(row[21]).replace(/[　 ]+/g, ' ').trim(),
          experience_years: cleanText(subRow[37]),
          hire_date: toIsoDate(row[37]),
          birth_date: toIsoDate(row[52]),
          blood_type: cleanText(row[145]),
          address: cleanText(row[67]),
          emergency_contact: emergencyContact,
          health_exam_date: toIsoDate(row[130]),
          systolic: cleanText(subRow[130]),
          diastolic: cleanText(subRow[139]),
          qualifications,
          source_sheet: sheetName,
          source_row: r + 1,
          status: workerName ? 'matched' : 'unmatched',
          reason: workerName ? '' : '作業員マスタの名前と一致しませんでした。'
        });
      }
    }

    const [profilesRes, healthRes, qualRes] = await Promise.all([
      supabaseRest('/rest/v1/worker_profiles?select=worker_name,full_name,employee_no,employment_type,hire_date,birth_date,blood_type,address,emergency_contact,notes'),
      supabaseRest('/rest/v1/worker_health_checks?select=worker_name,exam_date'),
      supabaseRest('/rest/v1/worker_qualifications?select=worker_name,category,qualification_name')
    ]);
    const profiles = await profilesRes.json().catch(() => []);
    const health = await healthRes.json().catch(() => []);
    const qualifications = await qualRes.json().catch(() => []);
    const profileMap = new Map((Array.isArray(profiles) ? profiles : []).map((x: any) => [String(x.worker_name), x]));
    const healthKeys = new Set((Array.isArray(health) ? health : []).map((x: any) => `${normalize(x.worker_name)}|${x.exam_date || ''}`));
    const qualKeys = new Set((Array.isArray(qualifications) ? qualifications : []).map((x: any) => qualKey(x.worker_name, x.category, x.qualification_name)));

    const rows = parsed.map((row) => {
      if (row.status === 'unmatched') return { ...row, profileAction: 'unmatched', newHealth: false, newQualifications: 0 };
      const existing: any = profileMap.get(row.worker_name);
      const importNotes = [row.job_type ? `職種：${row.job_type}` : '', row.experience_years ? `経験年数：${row.experience_years}年` : ''].filter(Boolean).join(' / ');
      const incoming: any = {
        full_name: row.source_full_name,
        hire_date: row.hire_date,
        birth_date: row.birth_date,
        blood_type: row.blood_type,
        address: row.address,
        emergency_contact: row.emergency_contact,
        notes: importNotes
      };
      const fillable = Object.entries(incoming).filter(([key, value]) => !isBlank(value) && (!existing || isBlank(existing[key]))).map(([key]) => key);
      const profileAction = !existing ? 'new' : (fillable.length > 0 ? 'fill' : 'unchanged');
      const newHealth = !!row.health_exam_date && !healthKeys.has(`${normalize(row.worker_name)}|${row.health_exam_date}`);
      const newQualifications = row.qualifications.filter((q) => !qualKeys.has(qualKey(row.worker_name, q.category, q.qualification_name))).length;
      return { ...row, profileAction, fillableFields: fillable, newHealth, newQualifications };
    });

    return NextResponse.json({
      ok: true,
      fileName: file.name,
      rows,
      summary: {
        sheets: activeSheetNames.length,
        workers: rows.length,
        matched: rows.filter((r: any) => r.status === 'matched').length,
        unmatched: rows.filter((r: any) => r.status === 'unmatched').length,
        newProfiles: rows.filter((r: any) => r.profileAction === 'new').length,
        fillProfiles: rows.filter((r: any) => r.profileAction === 'fill').length,
        newHealth: rows.filter((r: any) => r.newHealth).length,
        newQualifications: rows.reduce((sum: number, r: any) => sum + Number(r.newQualifications || 0), 0)
      }
    });
  } catch (error: any) {
    return jsonError(error);
  }
}

export async function PUT(request: Request) {
  try {
    assertAdmin(request);
    const body = await request.json();
    const rows: any[] = Array.isArray(body?.rows) ? body.rows.filter((r: any) => r?.status === 'matched' && r?.worker_name) : [];
    if (rows.length === 0) return NextResponse.json({ error: '登録できる作業員がありません。' }, { status: 400 });

    const [profilesRes, healthRes, qualRes] = await Promise.all([
      supabaseRest('/rest/v1/worker_profiles?select=*'),
      supabaseRest('/rest/v1/worker_health_checks?select=worker_name,exam_date'),
      supabaseRest('/rest/v1/worker_qualifications?select=worker_name,category,qualification_name')
    ]);
    const existingProfiles = await profilesRes.json().catch(() => []);
    const existingHealth = await healthRes.json().catch(() => []);
    const existingQuals = await qualRes.json().catch(() => []);
    const profileMap = new Map((Array.isArray(existingProfiles) ? existingProfiles : []).map((x: any) => [String(x.worker_name), x]));
    const healthKeys = new Set((Array.isArray(existingHealth) ? existingHealth : []).map((x: any) => `${normalize(x.worker_name)}|${x.exam_date || ''}`));
    const qualKeys = new Set((Array.isArray(existingQuals) ? existingQuals : []).map((x: any) => qualKey(x.worker_name, x.category, x.qualification_name)));

    const profilePayloads = rows.map((row: any) => {
      const existing: any = profileMap.get(row.worker_name) || {};
      const importedNotes = [row.job_type ? `職種：${row.job_type}` : '', row.experience_years ? `経験年数：${row.experience_years}年` : ''].filter(Boolean).join(' / ');
      const pick = (key: string, value: any) => !isBlank(existing[key]) ? existing[key] : (!isBlank(value) ? value : null);
      return {
        worker_name: row.worker_name,
        full_name: pick('full_name', row.source_full_name),
        employee_no: existing.employee_no || null,
        employment_type: existing.employment_type || null,
        hire_date: pick('hire_date', row.hire_date),
        birth_date: pick('birth_date', row.birth_date),
        blood_type: pick('blood_type', row.blood_type),
        address: pick('address', row.address),
        emergency_contact: pick('emergency_contact', row.emergency_contact),
        notes: pick('notes', importedNotes),
        updated_at: new Date().toISOString()
      };
    });

    const profileRes = await supabaseRest('/rest/v1/worker_profiles?on_conflict=worker_name', {
      method: 'POST', body: JSON.stringify(profilePayloads)
    }, { Prefer: 'resolution=merge-duplicates,return=representation' });
    const savedProfiles = await profileRes.json().catch(() => []);

    const healthPayloads = rows.filter((row: any) => row.health_exam_date && !healthKeys.has(`${normalize(row.worker_name)}|${row.health_exam_date}`)).map((row: any) => ({
      worker_name: row.worker_name,
      exam_date: row.health_exam_date,
      systolic: row.systolic === '' ? null : Number(row.systolic),
      diastolic: row.diastolic === '' ? null : Number(row.diastolic),
      judgement: null,
      next_due_date: null,
      notes: `作業員名簿Excel取込：${row.source_sheet} ${row.source_row}行目`,
      updated_at: new Date().toISOString()
    }));
    if (healthPayloads.length > 0) {
      await supabaseRest('/rest/v1/worker_health_checks', { method: 'POST', body: JSON.stringify(healthPayloads) }, { Prefer: 'return=minimal' });
    }

    const qualPayloads: any[] = [];
    const seen = new Set<string>();
    rows.forEach((row: any) => {
      (Array.isArray(row.qualifications) ? row.qualifications : []).forEach((q: any) => {
        const key = qualKey(row.worker_name, q.category, q.qualification_name);
        if (!q.qualification_name || qualKeys.has(key) || seen.has(key)) return;
        seen.add(key);
        qualPayloads.push({
          worker_name: row.worker_name,
          category: q.category || 'その他',
          qualification_name: q.qualification_name,
          certificate_no: null,
          acquired_date: null,
          expiry_date: null,
          issuing_body: null,
          notes: `作業員名簿Excel取込：${row.source_sheet} ${row.source_row}行目`,
          source_key: `roster:${normalize(row.worker_name)}:${normalize(q.category)}:${normalize(q.qualification_name)}`,
          updated_at: new Date().toISOString()
        });
      });
    });
    if (qualPayloads.length > 0) {
      await supabaseRest('/rest/v1/worker_qualifications?on_conflict=source_key', {
        method: 'POST', body: JSON.stringify(qualPayloads)
      }, { Prefer: 'resolution=ignore-duplicates,return=minimal' });
    }

    return NextResponse.json({
      ok: true,
      profiles: Array.isArray(savedProfiles) ? savedProfiles.length : profilePayloads.length,
      healthChecks: healthPayloads.length,
      qualifications: qualPayloads.length,
      protectedExistingValues: true
    });
  } catch (error: any) {
    return jsonError(error);
  }
}
