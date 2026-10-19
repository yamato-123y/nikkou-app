'use client';

import { useEffect, useMemo, useState } from 'react';

type WorkerProfile = {
  id?: string;
  worker_name: string;
  full_name?: string | null;
  employee_no?: string | null;
  employment_type?: string | null;
  hire_date?: string | null;
  birth_date?: string | null;
  blood_type?: string | null;
  address?: string | null;
  emergency_contact?: string | null;
  notes?: string | null;
};

type Qualification = {
  id?: string;
  worker_name: string;
  category?: string | null;
  qualification_name: string;
  certificate_no?: string | null;
  acquired_date?: string | null;
  expiry_date?: string | null;
  issuing_body?: string | null;
  notes?: string | null;
};

type HealthCheck = {
  id?: string;
  worker_name: string;
  exam_date: string;
  systolic?: number | string | null;
  diastolic?: number | string | null;
  judgement?: string | null;
  next_due_date?: string | null;
  notes?: string | null;
};

type WorkerDocument = {
  id: string;
  worker_name: string;
  document_type: string;
  title?: string | null;
  file_path: string;
  mime_type?: string | null;
  file_size?: number | null;
  uploaded_at?: string | null;
};

type ExcelImportRow = {
  worker_name: string;
  source_worker_name: string;
  category: string;
  qualification_name: string;
  certificate_no: string;
  acquired_date: string;
  source_sheet: string;
  source_row: number;
  status: 'new' | 'duplicate' | 'unmatched';
  reason?: string;
};

type ExcelImportPreview = {
  fileName: string;
  rows: ExcelImportRow[];
  summary: { sheets: number; total: number; newCount: number; duplicateCount: number; unmatchedCount: number };
};


type RosterImportQualification = { category: string; qualification_name: string };
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
  qualifications: RosterImportQualification[];
  source_sheet: string;
  source_row: number;
  status: 'matched' | 'unmatched';
  reason?: string;
  profileAction?: 'new' | 'fill' | 'unchanged' | 'unmatched';
  fillableFields?: string[];
  newHealth?: boolean;
  newQualifications?: number;
};

type RosterImportPreview = {
  fileName: string;
  rows: RosterImportRow[];
  summary: {
    sheets: number;
    workers: number;
    matched: number;
    unmatched: number;
    newProfiles: number;
    fillProfiles: number;
    newHealth: number;
    newQualifications: number;
  };
};


type QualificationPackEntry = {
  sourceWorker: string;
  sourceSheet: string;
  imageIndex: number;
  file: string;
  title: string;
  mimeType: string;
  size: number;
  originalFormat?: string;
  sha256?: string;
};

type QualificationPackManifest = {
  format: 'yamato-worker-qualification-pack';
  version: number;
  sourceFile?: string;
  imagePolicy?: any;
  workers?: string[];
  entries: QualificationPackEntry[];
};

type QualificationPackPreviewRow = QualificationPackEntry & {
  worker_name: string;
  status: 'new' | 'duplicate' | 'unmatched';
  reason?: string;
};

type QualificationPackPreview = {
  fileName: string;
  sourceFile: string;
  rows: QualificationPackPreviewRow[];
  summary: { total: number; matchedWorkers: number; newCount: number; duplicateCount: number; unmatchedCount: number };
};


const normalizeWorkerName = (value: any) =>
  String(value ?? '')
    .normalize('NFKC')
    .replace(/[\s　]+/g, '')
    .replace(/[・･]/g, '')
    .toLowerCase();

const escapeHtml = (value: any) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

// 資格証取込パックは「無圧縮ZIP」で作成する。
// JPEG自体が圧縮済みなので容量差は小さく、ブラウザだけで安全に展開できる。
type StoredZipEntry = { name: string; method: number; compressedSize: number; uncompressedSize: number; localOffset: number };

const parseStoredZip = async (file: File) => {
  const buffer = await file.arrayBuffer();
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  const u16 = (o: number) => view.getUint16(o, true);
  const u32 = (o: number) => view.getUint32(o, true);
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65558); i -= 1) {
    if (u32(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('資格証取込パックを開けませんでした。');
  const entryCount = u16(eocd + 10);
  let cursor = u32(eocd + 16);
  const decoder = new TextDecoder('utf-8');
  const entries: StoredZipEntry[] = [];
  for (let i = 0; i < entryCount; i += 1) {
    if (u32(cursor) !== 0x02014b50) throw new Error('資格証取込パックの形式が正しくありません。');
    const method = u16(cursor + 10);
    const compressedSize = u32(cursor + 20);
    const uncompressedSize = u32(cursor + 24);
    const nameLen = u16(cursor + 28);
    const extraLen = u16(cursor + 30);
    const commentLen = u16(cursor + 32);
    const localOffset = u32(cursor + 42);
    const name = decoder.decode(bytes.slice(cursor + 46, cursor + 46 + nameLen));
    entries.push({ name, method, compressedSize, uncompressedSize, localOffset });
    cursor += 46 + nameLen + extraLen + commentLen;
  }
  const readEntry = (name: string) => {
    const e = entries.find((x) => x.name === name);
    if (!e) throw new Error(`取込パック内のファイルが見つかりません：${name}`);
    if (e.method !== 0) throw new Error('この取込パックは対応していない圧縮形式です。');
    if (u32(e.localOffset) !== 0x04034b50) throw new Error('取込パックの画像位置を確認できませんでした。');
    const nameLen = u16(e.localOffset + 26);
    const extraLen = u16(e.localOffset + 28);
    const start = e.localOffset + 30 + nameLen + extraLen;
    return bytes.slice(start, start + e.compressedSize);
  };
  const manifestBytes = readEntry('manifest.json');
  const manifest = JSON.parse(decoder.decode(manifestBytes)) as QualificationPackManifest;
  if (manifest?.format !== 'yamato-worker-qualification-pack' || !Array.isArray(manifest?.entries)) {
    throw new Error('大和の資格証取込パックではありません。');
  }
  return { manifest, readEntry };
};

const ADMIN_PASSWORD = '19770323';

const emptyProfile = (name: string): WorkerProfile => ({
  worker_name: name,
  full_name: '', employee_no: '', employment_type: '', hire_date: '', birth_date: '',
  blood_type: '', address: '', emergency_contact: '', notes: ''
});

const emptyQualification = (name: string): Qualification => ({
  worker_name: name, category: '技能講習', qualification_name: '', certificate_no: '', acquired_date: '', expiry_date: '', issuing_body: '', notes: ''
});

const emptyHealth = (name: string): HealthCheck => ({
  worker_name: name, exam_date: '', systolic: '', diastolic: '', judgement: '', next_due_date: '', notes: ''
});

const fmtDate = (value?: string | null) => {
  if (!value) return '-';
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('ja-JP');
};

const isWithinDays = (date?: string | null, days = 60) => {
  if (!date) return false;
  const target = new Date(`${date}T00:00:00`).getTime();
  if (Number.isNaN(target)) return false;
  const diff = target - Date.now();
  return diff >= 0 && diff <= days * 86400000;
};

const isExpired = (date?: string | null) => {
  if (!date) return false;
  const target = new Date(`${date}T23:59:59`).getTime();
  return !Number.isNaN(target) && target < Date.now();
};

const compressImage = async (file: File): Promise<File> => {
  if (!file.type.startsWith('image/')) return file;
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = objectUrl;
    });
    const maxSide = 2200;
    const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(image, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.88));
    if (!blob) return file;
    const base = file.name.replace(/\.[^.]+$/, '') || 'document';
    return new File([blob], `${base}.jpg`, { type: 'image/jpeg' });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

export default function WorkerLedgerPage() {
  const [isAuthed, setIsAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [workers, setWorkers] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<WorkerProfile[]>([]);
  const [qualifications, setQualifications] = useState<Qualification[]>([]);
  const [healthChecks, setHealthChecks] = useState<HealthCheck[]>([]);
  const [documents, setDocuments] = useState<WorkerDocument[]>([]);
  const [selectedWorker, setSelectedWorker] = useState('');
  const [tab, setTab] = useState<'profile' | 'qualification' | 'health' | 'documents'>('profile');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [profileDraft, setProfileDraft] = useState<WorkerProfile>(emptyProfile(''));
  const [qualificationDraft, setQualificationDraft] = useState<Qualification>(emptyQualification(''));
  const [healthDraft, setHealthDraft] = useState<HealthCheck>(emptyHealth(''));
  const [docType, setDocType] = useState('qualification');
  const [docTitle, setDocTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const [excelImportLoading, setExcelImportLoading] = useState(false);
  const [excelImportPreview, setExcelImportPreview] = useState<ExcelImportPreview | null>(null);
  const [rosterImportLoading, setRosterImportLoading] = useState(false);
  const [rosterImportPreview, setRosterImportPreview] = useState<RosterImportPreview | null>(null);
  const [qualificationPackLoading, setQualificationPackLoading] = useState(false);
  const [qualificationPackFile, setQualificationPackFile] = useState<File | null>(null);
  const [qualificationPackPreview, setQualificationPackPreview] = useState<QualificationPackPreview | null>(null);
  const [qualificationPackProgress, setQualificationPackProgress] = useState('');
  const [printSelectedWorkers, setPrintSelectedWorkers] = useState<string[]>([]);

  const token = () => sessionStorage.getItem('yamato-admin-token') || '';

  const api = async (url: string, init: RequestInit = {}) => {
    const response = await fetch(url, {
      ...init,
      cache: 'no-store',
      headers: {
        'x-admin-password': token(),
        ...(init.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...(init.headers || {})
      }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error || '処理に失敗しました。');
    return data;
  };

  const loadAll = async () => {
    try {
      setLoading(true);
      setError('');
      const [settingsRes, ledger] = await Promise.all([
        fetch('/api/settings', { cache: 'no-store' }),
        api('/api/worker-ledger')
      ]);
      if (!settingsRes.ok) throw new Error('作業員マスタの取得に失敗しました。');
      const settings = await settingsRes.json();
      const masterWorkers = Array.isArray(settings?.workers) ? settings.workers : [];
      setWorkers(masterWorkers);
      setProfiles(Array.isArray(ledger?.profiles) ? ledger.profiles : []);
      setQualifications(Array.isArray(ledger?.qualifications) ? ledger.qualifications : []);
      setHealthChecks(Array.isArray(ledger?.healthChecks) ? ledger.healthChecks : []);
      setDocuments(Array.isArray(ledger?.documents) ? ledger.documents : []);
      const first = selectedWorker || (masterWorkers[0]?.name ?? masterWorkers[0] ?? '');
      if (first) setSelectedWorker(String(first));
    } catch (e: any) {
      console.error(e);
      setError(e?.message || '読み込みに失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const ok = sessionStorage.getItem('yamato-admin-auth') === 'admin' && !!sessionStorage.getItem('yamato-admin-token');
    setIsAuthed(ok);
  }, []);

  useEffect(() => {
    if (isAuthed) loadAll();
  }, [isAuthed]);

  useEffect(() => {
    if (!selectedWorker) return;
    const found = profiles.find((x) => x.worker_name === selectedWorker);
    setProfileDraft(found ? { ...found } : emptyProfile(selectedWorker));
    setQualificationDraft(emptyQualification(selectedWorker));
    setHealthDraft(emptyHealth(selectedWorker));
    setDocTitle('');
  }, [selectedWorker, profiles]);

  const workerNames = useMemo(() => workers.map((w: any) => String(typeof w === 'string' ? w : w?.name || '')).filter(Boolean), [workers]);
  const visibleWorkers = workerNames.filter((name) => name.includes(query.trim()));
  const selectedQualifications = qualifications.filter((x) => x.worker_name === selectedWorker);
  const selectedHealth = healthChecks.filter((x) => x.worker_name === selectedWorker);
  const selectedDocuments = documents.filter((x) => x.worker_name === selectedWorker);
  const selectedSavedProfile = profiles.find((x) => x.worker_name === selectedWorker) || null;

  const hasRegisteredProfile = (name: string) => profiles.some((x) => x.worker_name === name);

  const summaryFor = (name: string) => {
    const q = qualifications.filter((x) => x.worker_name === name);
    const h = healthChecks.filter((x) => x.worker_name === name).sort((a, b) => String(b.exam_date || '').localeCompare(String(a.exam_date || '')))[0];
    const warning = q.some((x) => isExpired(x.expiry_date) || isWithinDays(x.expiry_date, 60));
    return { qCount: q.length, healthDate: h?.exam_date || '', warning };
  };

  const login = () => {
    if (password !== ADMIN_PASSWORD) {
      alert('パスワードが違います。');
      return;
    }
    sessionStorage.setItem('yamato-admin-auth', 'admin');
    sessionStorage.setItem('yamato-admin-token', password);
    setIsAuthed(true);
  };

  const saveProfile = async () => {
    try {
      setSaving(true);
      const result = await api('/api/worker-ledger', { method: 'POST', body: JSON.stringify({ action: 'saveProfile', data: profileDraft }) });
      const savedRow = Array.isArray(result?.rows) ? result.rows[0] : null;

      // 保存直後にも「登録済み」と分かるよう、Supabaseが返した保存済み行を即時反映する。
      // その後あらためて全データを再取得し、サーバー上の状態と同期する。
      if (savedRow?.worker_name) {
        setProfiles((prev) => [
          ...prev.filter((x) => x.worker_name !== savedRow.worker_name),
          savedRow
        ]);
        setProfileDraft({ ...savedRow });
      }

      await loadAll();
      alert('作業員台帳を保存しました。画面上部の「登録済み台帳」に保存内容を表示しています。');
    } catch (e: any) { alert(e?.message || '保存に失敗しました。'); }
    finally { setSaving(false); }
  };

  const saveQualification = async () => {
    if (!qualificationDraft.qualification_name.trim()) return alert('資格名を入力してください。');
    try {
      setSaving(true);
      await api('/api/worker-ledger', { method: 'POST', body: JSON.stringify({ action: 'saveQualification', data: qualificationDraft }) });
      setQualificationDraft(emptyQualification(selectedWorker));
      await loadAll();
    } catch (e: any) { alert(e?.message || '保存に失敗しました。'); }
    finally { setSaving(false); }
  };

  const saveHealth = async () => {
    if (!healthDraft.exam_date) return alert('受診日を入力してください。');
    try {
      setSaving(true);
      await api('/api/worker-ledger', { method: 'POST', body: JSON.stringify({ action: 'saveHealth', data: healthDraft }) });
      setHealthDraft(emptyHealth(selectedWorker));
      await loadAll();
    } catch (e: any) { alert(e?.message || '保存に失敗しました。'); }
    finally { setSaving(false); }
  };

  const deleteQualification = async (id?: string) => {
    if (!id || !confirm('この資格を削除しますか？')) return;
    await api('/api/worker-ledger', { method: 'POST', body: JSON.stringify({ action: 'deleteQualification', id }) });
    await loadAll();
  };

  const deleteHealth = async (id?: string) => {
    if (!id || !confirm('この健康診断履歴を削除しますか？')) return;
    await api('/api/worker-ledger', { method: 'POST', body: JSON.stringify({ action: 'deleteHealth', id }) });
    await loadAll();
  };

  const openDocument = async (doc: WorkerDocument) => {
    try {
      const data = await api(`/api/worker-ledger/file?path=${encodeURIComponent(doc.file_path)}`);
      if (data?.signedUrl) window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
    } catch (e: any) { alert(e?.message || 'ファイルを開けませんでした。'); }
  };

  const deleteDocument = async (doc: WorkerDocument) => {
    if (!confirm('この書類を削除しますか？')) return;
    try {
      await api('/api/worker-ledger', { method: 'POST', body: JSON.stringify({ action: 'deleteDocument', id: doc.id, file_path: doc.file_path }) });
      await loadAll();
    } catch (e: any) { alert(e?.message || '削除に失敗しました。'); }
  };

  const previewQualificationExcel = async (file: File) => {
    try {
      setExcelImportLoading(true);
      setExcelImportPreview(null);
      const form = new FormData();
      form.append('file', file);
      form.append('workers', JSON.stringify(workerNames));
      const data = await api('/api/worker-ledger/excel-import', { method: 'POST', body: form });
      setExcelImportPreview(data as ExcelImportPreview);
    } catch (e: any) {
      alert(e?.message || 'Excelの読み取りに失敗しました。');
    } finally {
      setExcelImportLoading(false);
    }
  };

  const commitQualificationExcel = async () => {
    if (!excelImportPreview || excelImportPreview.summary.newCount === 0) return;
    if (!confirm(`新規 ${excelImportPreview.summary.newCount}件の資格情報を登録しますか？\n既存の資格情報は変更・削除しません。`)) return;
    try {
      setExcelImportLoading(true);
      const data = await api('/api/worker-ledger/excel-import', {
        method: 'PUT',
        body: JSON.stringify({ rows: excelImportPreview.rows })
      });
      await loadAll();
      setExcelImportPreview(null);
      alert(`Excel取込が完了しました。\n新規登録：${Number(data?.inserted || 0)}件\n重複等でスキップ：${Number(data?.skipped || 0)}件`);
    } catch (e: any) {
      alert(e?.message || 'Excelの登録に失敗しました。');
    } finally {
      setExcelImportLoading(false);
    }
  };

  const previewRosterExcel = async (file: File) => {
    try {
      setRosterImportLoading(true);
      setRosterImportPreview(null);
      const form = new FormData();
      form.append('file', file);
      form.append('workers', JSON.stringify(workerNames));
      const data = await api('/api/worker-ledger/roster-import', { method: 'POST', body: form });
      setRosterImportPreview(data as RosterImportPreview);
    } catch (e: any) {
      alert(e?.message || '作業員名簿Excelの読み取りに失敗しました。');
    } finally {
      setRosterImportLoading(false);
    }
  };

  const commitRosterExcel = async () => {
    if (!rosterImportPreview || rosterImportPreview.summary.matched === 0) return;
    const s = rosterImportPreview.summary;
    if (!confirm(`作業員名簿を取り込みますか？

対象：${s.matched}名
台帳新規：${s.newProfiles}名
空欄への追記：${s.fillProfiles}名
健康診断：${s.newHealth}件
資格・講習：${s.newQualifications}件

※すでに入力済みの台帳内容は上書きしません。`)) return;
    try {
      setRosterImportLoading(true);
      const result = await api('/api/worker-ledger/roster-import', {
        method: 'PUT',
        body: JSON.stringify({ rows: rosterImportPreview.rows })
      });
      await loadAll();
      setRosterImportPreview(null);
      alert(`作業員名簿の取込が完了しました。
台帳：${Number(result?.profiles || 0)}名
健康診断：${Number(result?.healthChecks || 0)}件
資格・講習：${Number(result?.qualifications || 0)}件`);
    } catch (e: any) {
      alert(e?.message || '作業員名簿の登録に失敗しました。');
    } finally {
      setRosterImportLoading(false);
    }
  };


  const matchQualificationPackWorker = (sourceWorker: string) => {
    const src = normalizeWorkerName(sourceWorker);
    if (!src) return '';
    const exact = workerNames.filter((name) => normalizeWorkerName(name) === src);
    if (exact.length === 1) return exact[0];

    // 作業員台帳へ正式氏名を登録済みの場合だけ、略称マスタとの安全な紐付けを許可する。
    // 例: マスタ「サントソ」／正式氏名「ハディ サントソ」／資格証Excel「ハディ サントソ」。
    const profileMatches = profiles.filter((profile) => {
      const masterName = String(profile?.worker_name || '');
      if (!workerNames.includes(masterName)) return false;
      const full = normalizeWorkerName(profile?.full_name || '');
      return !!full && full === src;
    });
    return profileMatches.length === 1 ? String(profileMatches[0].worker_name) : '';
  };

  const previewQualificationPackFile = async (file: File) => {
    try {
      setQualificationPackLoading(true);
      setQualificationPackProgress('取込パックを確認しています…');
      const { manifest } = await parseStoredZip(file);
      const existingKeys = new Set(
        documents
          .filter((doc) => doc.document_type === 'qualification')
          .map((doc) => `${normalizeWorkerName(doc.worker_name)}|${String(doc.title || '')}`)
      );
      const rows: QualificationPackPreviewRow[] = manifest.entries.map((entry) => {
        const workerName = matchQualificationPackWorker(entry.sourceWorker);
        if (!workerName) return { ...entry, worker_name: '', status: 'unmatched' as const, reason: '現在の作業員マスタと一致しません。' };
        const title = `資格証Excel：${entry.sourceSheet} #${entry.imageIndex}`;
        const duplicate = existingKeys.has(`${normalizeWorkerName(workerName)}|${title}`);
        return { ...entry, title, worker_name: workerName, status: duplicate ? 'duplicate' as const : 'new' as const, reason: duplicate ? '同じ取込元の資格証が登録済みです。' : '' };
      });
      const matchedWorkers = new Set(rows.filter((row) => row.worker_name).map((row) => row.worker_name)).size;
      setQualificationPackFile(file);
      setQualificationPackPreview({
        fileName: file.name,
        sourceFile: manifest.sourceFile || '',
        rows,
        summary: {
          total: rows.length,
          matchedWorkers,
          newCount: rows.filter((r) => r.status === 'new').length,
          duplicateCount: rows.filter((r) => r.status === 'duplicate').length,
          unmatchedCount: rows.filter((r) => r.status === 'unmatched').length
        }
      });
      setQualificationPackProgress('');
    } catch (e: any) {
      setQualificationPackFile(null);
      setQualificationPackPreview(null);
      setQualificationPackProgress('');
      alert(e?.message || '資格証取込パックを読み取れませんでした。');
    } finally {
      setQualificationPackLoading(false);
    }
  };

  const commitQualificationPack = async () => {
    if (!qualificationPackFile || !qualificationPackPreview) return;
    const targets = qualificationPackPreview.rows.filter((row) => row.status === 'new' && row.worker_name);
    if (targets.length === 0) return alert('新しく登録する資格証画像がありません。');
    if (!confirm(`資格証画像 ${targets.length}枚を登録しますか？\n現在の作業員マスタに一致した人だけ登録します。`)) return;
    try {
      setQualificationPackLoading(true);
      const { readEntry } = await parseStoredZip(qualificationPackFile);
      let done = 0;
      const queue = [...targets];
      const uploadOne = async () => {
        while (queue.length > 0) {
          const row = queue.shift();
          if (!row) return;
          const bytes = readEntry(row.file);
          const form = new FormData();
          const fileName = `${row.worker_name}_${String(row.sourceSheet || '資格証').replace(/[\/:*?"<>|]/g, '_')}_${row.imageIndex}.jpg`;
          form.append('file', new File([bytes], fileName, { type: 'image/jpeg' }));
          form.append('workerName', row.worker_name);
          form.append('documentType', 'qualification');
          form.append('title', row.title);
          await api('/api/worker-ledger/upload', { method: 'POST', body: form });
          done += 1;
          setQualificationPackProgress(`登録中 ${done} / ${targets.length}枚`);
        }
      };
      await Promise.all(Array.from({ length: Math.min(3, targets.length) }, () => uploadOne()));
      await loadAll();
      setQualificationPackFile(null);
      setQualificationPackPreview(null);
      setQualificationPackProgress('');
      alert(`資格証画像 ${done}枚を登録しました。`);
    } catch (e: any) {
      alert(e?.message || '資格証画像の登録に失敗しました。途中まで登録されている場合があります。もう一度取込パックを確認すると登録済みは除外されます。');
    } finally {
      setQualificationPackLoading(false);
      setQualificationPackProgress('');
    }
  };

  const togglePrintWorker = (name: string) => {
    setPrintSelectedWorkers((prev) => prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name]);
  };

  const printSelectedQualificationDocuments = async () => {
    if (printSelectedWorkers.length === 0) return alert('印刷する作業員を1人以上チェックしてください。');
    const docs = documents.filter((doc) => doc.document_type === 'qualification' && printSelectedWorkers.includes(doc.worker_name));
    if (docs.length === 0) return alert('選択した作業員に資格証画像が登録されていません。');

    const printWindow = window.open('', '_blank');
    if (!printWindow) return alert('印刷画面を開けませんでした。ブラウザのポップアップを許可してください。');
    printWindow.document.write('<html><body style="font-family:sans-serif;padding:24px">資格証を準備しています…</body></html>');
    try {
      const withUrls = await Promise.all(docs.map(async (doc) => {
        const data = await api(`/api/worker-ledger/file?path=${encodeURIComponent(doc.file_path)}`);
        return { ...doc, signedUrl: data?.signedUrl || '' };
      }));
      const sections = printSelectedWorkers.map((worker) => {
        const workerDocs = withUrls.filter((doc) => doc.worker_name === worker && doc.signedUrl);
        if (workerDocs.length === 0) return '';
        return `<section class="worker"><h1>${escapeHtml(worker)}　資格証</h1><div class="cards">${workerDocs.map((doc) => `<figure><img src="${escapeHtml(doc.signedUrl)}" alt="${escapeHtml(doc.title || '資格証')}"/><figcaption>${escapeHtml(doc.title || '資格証')}</figcaption></figure>`).join('')}</div></section>`;
      }).join('');
      printWindow.document.open();
      printWindow.document.write(`<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>資格証 印刷</title><style>
        @page{size:A4 portrait;margin:10mm}*{box-sizing:border-box}body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans JP",sans-serif;color:#111}.worker{break-after:page}.worker:last-child{break-after:auto}h1{font-size:16pt;margin:0 0 6mm;border-bottom:1px solid #999;padding-bottom:2mm}.cards{display:grid;grid-template-columns:1fr 1fr;gap:7mm 5mm;align-items:start}figure{margin:0;break-inside:avoid;text-align:center}img{display:block;max-width:92mm;max-height:118mm;width:auto;height:auto;object-fit:contain;margin:0 auto;border:1px solid #ddd}figcaption{font-size:8pt;color:#555;margin-top:2mm}@media print{button{display:none}}
      </style></head><body>${sections}<script>window.addEventListener('load',()=>{const imgs=[...document.images];Promise.all(imgs.map(i=>i.complete?Promise.resolve():new Promise(r=>{i.onload=r;i.onerror=r}))).then(()=>setTimeout(()=>window.print(),300));});<\/script></body></html>`);
      printWindow.document.close();
    } catch (e: any) {
      printWindow.close();
      alert(e?.message || '資格証の印刷準備に失敗しました。');
    }
  };

  const uploadDocument = async (file: File) => {
    try {
      setUploading(true);
      const prepared = await compressImage(file);
      if (prepared.size > 10 * 1024 * 1024) throw new Error('圧縮後も10MBを超えています。PDFは10MB以下にしてください。');
      const form = new FormData();
      form.append('file', prepared);
      form.append('workerName', selectedWorker);
      form.append('documentType', docType);
      form.append('title', docTitle || file.name);
      await api('/api/worker-ledger/upload', { method: 'POST', body: form });
      setDocTitle('');
      await loadAll();
    } catch (e: any) { alert(e?.message || 'アップロードに失敗しました。'); }
    finally { setUploading(false); }
  };

  if (!isAuthed) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans">
        <div className="w-full max-w-md rounded-3xl bg-white border border-slate-200 shadow-xl p-8 space-y-5">
          <div className="text-center"><div className="text-5xl">👷</div><h1 className="mt-3 text-2xl font-black text-slate-900">作業員台帳・資格管理</h1><p className="mt-1 text-sm text-slate-500">管理者専用</p></div>
          <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} onKeyDown={(e)=>e.key==='Enter'&&login()} placeholder="管理者パスワード" className="w-full rounded-2xl border-2 border-slate-200 p-4 text-center font-bold text-lg" />
          <button onClick={login} className="w-full rounded-2xl bg-slate-900 text-white py-4 font-black">ログイン</button>
          <a href="/admin" className="block text-center text-sm font-bold text-blue-600 hover:underline">← 管理画面へ戻る</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 p-3 md:p-6 font-sans text-slate-800">
      <div className="max-w-[1600px] mx-auto space-y-4">
        <header className="rounded-3xl bg-white border border-slate-200 shadow-sm px-5 md:px-7 py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div><div className="text-xs font-black text-blue-600">株式会社大和</div><h1 className="text-2xl md:text-3xl font-black text-slate-950 mt-1">👷 作業員台帳・資格管理</h1><p className="text-sm text-slate-500 mt-1">既存の作業員マスタと連動し、資格・健康診断・書類を個人別に管理します。</p></div>
          <div className="flex gap-2"><button onClick={loadAll} className="rounded-xl bg-blue-50 text-blue-700 px-4 py-2.5 font-black">🔄 更新</button><a href="/admin" className="rounded-xl bg-slate-900 text-white px-4 py-2.5 font-black">← 管理画面</a></div>
        </header>

        {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 text-rose-800 p-4 font-bold">⚠️ {error}<div className="text-xs mt-1 font-medium">初回はSupabase用の追加SQLを実行してから使用してください。</div></div>}

        <div className="grid grid-cols-1 lg:grid-cols-[330px_minmax(0,1fr)] gap-4">
          <aside className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden lg:sticky lg:top-4 lg:self-start">
            <div className="p-4 border-b border-slate-200"><div className="font-black text-slate-900">作業員</div><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="名前で検索" className="mt-3 w-full rounded-xl border border-slate-300 px-3 py-2.5 font-bold" /></div>
            <div className="max-h-[72vh] overflow-y-auto divide-y divide-slate-100">
              {visibleWorkers.map((name) => {
                const s = summaryFor(name);
                const profileRegistered = hasRegisteredProfile(name);
                return <button key={name} onClick={()=>setSelectedWorker(name)} className={`w-full text-left p-4 transition ${selectedWorker===name?'bg-blue-50 border-l-4 border-blue-600':'hover:bg-slate-50 border-l-4 border-transparent'}`}><div className="flex items-start justify-between gap-2"><div className="min-w-0"><span className="font-black text-slate-900">{name}</span><div className="mt-1 text-xs text-slate-500">資格 {s.qCount}件{ s.healthDate ? `・健診 ${fmtDate(s.healthDate)}` : '・健診 未登録'}</div></div><div className="flex items-center gap-1.5 flex-wrap justify-end">{profileRegistered?<span className="text-[10px] rounded-full bg-emerald-100 text-emerald-800 px-2 py-1 font-black">台帳登録済み</span>:<span className="text-[10px] rounded-full bg-slate-100 text-slate-500 px-2 py-1 font-black">台帳未登録</span>}{s.warning&&<span className="text-xs rounded-full bg-amber-100 text-amber-800 px-2 py-1 font-black">期限確認</span>}<label onClick={(e)=>e.stopPropagation()} className={`text-[10px] rounded-full px-2 py-1 font-black cursor-pointer ${printSelectedWorkers.includes(name)?'bg-violet-600 text-white':'bg-violet-50 text-violet-700 border border-violet-200'}`}><input type="checkbox" checked={printSelectedWorkers.includes(name)} onChange={()=>togglePrintWorker(name)} className="mr-1 align-middle"/>印刷</label></div></div></button>;
              })}
            </div>
          </aside>

          <main className="min-w-0">
            {!selectedWorker ? <div className="rounded-3xl bg-white border p-10 text-center text-slate-400 font-bold">作業員を選択してください。</div> : (
              <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 md:px-7 py-5 bg-slate-900 text-white"><div className="text-sm text-slate-300">作業員台帳</div><div className="text-2xl font-black mt-1">{profileDraft.full_name || selectedWorker}</div></div>
                <div className="flex overflow-x-auto border-b border-slate-200 bg-white">
                  {[['profile','基本情報'],['qualification',`資格・講習 (${selectedQualifications.length})`],['health',`健康診断 (${selectedHealth.length})`],['documents',`書類 (${selectedDocuments.length})`]].map(([key,label])=><button key={key} onClick={()=>setTab(key as any)} className={`px-5 py-4 whitespace-nowrap font-black border-b-4 ${tab===key?'border-blue-600 text-blue-700':'border-transparent text-slate-500 hover:text-slate-800'}`}>{label}</button>)}
                </div>

                <div className="p-5 md:p-7">
                  {loading ? <div className="py-16 text-center font-black text-slate-400">🔄 読み込み中...</div> : null}

                  {!loading && tab==='profile' && <div className="space-y-5">
                    <div className="rounded-2xl border-2 border-indigo-200 bg-indigo-50 p-4 md:p-5">
                      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
                        <div>
                          <div className="font-black text-indigo-950 text-lg">📥 作業員名簿Excelから自動入力</div>
                          <p className="mt-1 text-sm text-indigo-800 font-bold">現在の「作業員名簿」Excel（.xls / .xlsx）から、氏名・入社日・生年月日・血液型・住所・緊急連絡先・健康診断・資格/講習を読み取ります。</p>
                          <p className="mt-1 text-xs text-indigo-700">※「退職者」「原本」シートは除外します。既に入力済みの台帳内容は上書きせず、空欄だけ補完します。まず確認画面を出し、登録ボタンを押すまでSupabaseへ保存しません。</p>
                        </div>
                        <label className={`shrink-0 rounded-xl px-5 py-3 font-black text-center cursor-pointer ${rosterImportLoading?'bg-slate-300 text-slate-500':'bg-indigo-600 hover:bg-indigo-700 text-white'}`}>
                          {rosterImportLoading ? '名簿確認中…' : '📄 作業員名簿を選択'}
                          <input type="file" accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" disabled={rosterImportLoading} className="hidden" onChange={(e)=>{const f=e.target.files?.[0]; if(f) previewRosterExcel(f); e.currentTarget.value='';}} />
                        </label>
                      </div>

                      {rosterImportPreview && (
                        <div className="mt-4 space-y-3">
                          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-2 text-xs font-black">
                            <div className="rounded-xl bg-white border border-indigo-100 p-3">対象<br/><span className="text-lg text-indigo-800">{rosterImportPreview.summary.workers}</span>名</div>
                            <div className="rounded-xl bg-white border border-emerald-100 p-3">一致<br/><span className="text-lg text-emerald-700">{rosterImportPreview.summary.matched}</span>名</div>
                            <div className="rounded-xl bg-white border border-blue-100 p-3">台帳新規<br/><span className="text-lg text-blue-700">{rosterImportPreview.summary.newProfiles}</span>名</div>
                            <div className="rounded-xl bg-white border border-cyan-100 p-3">空欄補完<br/><span className="text-lg text-cyan-700">{rosterImportPreview.summary.fillProfiles}</span>名</div>
                            <div className="rounded-xl bg-white border border-violet-100 p-3">健診追加<br/><span className="text-lg text-violet-700">{rosterImportPreview.summary.newHealth}</span>件</div>
                            <div className="rounded-xl bg-white border border-amber-100 p-3">資格追加<br/><span className="text-lg text-amber-700">{rosterImportPreview.summary.newQualifications}</span>件</div>
                            <div className="rounded-xl bg-white border border-rose-100 p-3">未一致<br/><span className="text-lg text-rose-700">{rosterImportPreview.summary.unmatched}</span>名</div>
                          </div>
                          <div className="max-h-80 overflow-auto rounded-xl border border-indigo-200 bg-white">
                            <table className="w-full min-w-[1000px] text-xs">
                              <thead className="sticky top-0 bg-slate-100 z-10"><tr><th className="p-2 text-left">状態</th><th className="p-2 text-left">作業員</th><th className="p-2 text-left">氏名</th><th className="p-2 text-left">入社日</th><th className="p-2 text-left">生年月日</th><th className="p-2 text-left">血液型</th><th className="p-2 text-left">健診</th><th className="p-2 text-left">資格</th><th className="p-2 text-left">職種/経験</th></tr></thead>
                              <tbody className="divide-y divide-slate-100">
                                {rosterImportPreview.rows.map((row, idx) => (
                                  <tr key={`${row.source_sheet}-${row.source_row}-${idx}`} className={row.status==='unmatched'?'bg-rose-50':''}>
                                    <td className="p-2 font-black">{row.status==='unmatched'?<span className="text-rose-700">未一致</span>:row.profileAction==='new'?<span className="text-blue-700">新規</span>:row.profileAction==='fill'?<span className="text-cyan-700">空欄補完</span>:<span className="text-slate-500">登録済み</span>}</td>
                                    <td className="p-2 font-black">{row.worker_name || '－'}</td>
                                    <td className="p-2">{row.source_full_name || '－'}</td>
                                    <td className="p-2">{row.hire_date || '－'}</td>
                                    <td className="p-2">{row.birth_date || '－'}</td>
                                    <td className="p-2">{row.blood_type || '－'}</td>
                                    <td className="p-2">{row.newHealth ? `追加 ${row.health_exam_date}` : (row.health_exam_date || '－')}</td>
                                    <td className="p-2">{row.newQualifications ? `新規 ${row.newQualifications}件` : `${row.qualifications.length}件`}</td>
                                    <td className="p-2">{[row.job_type, row.experience_years ? `${row.experience_years}年` : ''].filter(Boolean).join(' / ') || '－'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          {rosterImportPreview.summary.unmatched > 0 && <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-bold text-rose-800">⚠️ 「未一致」は作業員マスタの名前と自動一致できなかったため登録しません。作業員マスタ名を確認してください。</div>}
                          <div className="flex flex-wrap justify-end gap-2">
                            <button type="button" onClick={()=>setRosterImportPreview(null)} disabled={rosterImportLoading} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 font-black text-slate-700 disabled:opacity-50">キャンセル</button>
                            <button type="button" onClick={commitRosterExcel} disabled={rosterImportLoading || rosterImportPreview.summary.matched===0} className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 font-black disabled:opacity-50">{rosterImportLoading?'登録中…':'✓ 確認した内容を登録'}</button>
                          </div>
                        </div>
                      )}
                    </div>
                    {selectedSavedProfile ? (
                      <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/70 p-4 md:p-5">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 border-b border-emerald-200 pb-3">
                          <div>
                            <div className="text-xs font-black text-emerald-700">✓ 保存済み</div>
                            <div className="text-lg font-black text-emerald-950">登録済み台帳</div>
                          </div>
                          <div className="text-xs font-bold text-emerald-800">最終更新：{selectedSavedProfile.updated_at ? new Date(selectedSavedProfile.updated_at).toLocaleString('ja-JP') : '-'}</div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-5 gap-y-3 mt-4 text-sm">
                          {[
                            ['氏名（フルネーム）', selectedSavedProfile.full_name],
                            ['社員番号', selectedSavedProfile.employee_no],
                            ['雇用区分', selectedSavedProfile.employment_type],
                            ['入社日', fmtDate(selectedSavedProfile.hire_date)],
                            ['生年月日', fmtDate(selectedSavedProfile.birth_date)],
                            ['血液型', selectedSavedProfile.blood_type],
                            ['住所', selectedSavedProfile.address],
                            ['緊急連絡先', selectedSavedProfile.emergency_contact]
                          ].map(([label, value]) => (
                            <div key={String(label)} className="rounded-xl bg-white border border-emerald-100 px-3 py-2.5">
                              <div className="text-[11px] font-black text-slate-400">{label}</div>
                              <div className="mt-0.5 font-black text-slate-900 break-words">{value || '－'}</div>
                            </div>
                          ))}
                        </div>
                        {selectedSavedProfile.notes && (
                          <div className="mt-3 rounded-xl bg-white border border-emerald-100 px-3 py-2.5">
                            <div className="text-[11px] font-black text-slate-400">管理メモ</div>
                            <div className="mt-1 whitespace-pre-wrap text-sm font-bold text-slate-800">{selectedSavedProfile.notes}</div>
                          </div>
                        )}
                        <div className="mt-3 text-xs font-bold text-emerald-800">下の入力欄は編集用です。変更後は「💾 台帳を保存」を押してください。</div>
                      </div>
                    ) : (
                      <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-4 text-sm font-bold text-slate-500">この作業員の台帳はまだ登録されていません。下の入力欄へ入力して保存してください。</div>
                    )}
                    <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 font-bold">既存の日報用作業員名「{selectedWorker}」に紐づく追加台帳です。日報・勤怠の作業員マスタ自体は変更しません。</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {[['full_name','氏名（フルネーム）','text'],['employee_no','社員番号','text'],['employment_type','雇用区分','text'],['hire_date','入社日','date'],['birth_date','生年月日','date'],['blood_type','血液型','text']].map(([key,label,type])=><label key={key} className="text-sm font-black text-slate-700">{label}<input type={type} value={(profileDraft as any)[key]||''} onChange={(e)=>setProfileDraft(p=>({...p,[key]:e.target.value}))} className="mt-1.5 w-full rounded-xl border border-slate-300 p-3 font-bold bg-white" /></label>)}
                    </div>
                    <label className="block text-sm font-black text-slate-700">住所<input value={profileDraft.address||''} onChange={(e)=>setProfileDraft(p=>({...p,address:e.target.value}))} className="mt-1.5 w-full rounded-xl border border-slate-300 p-3 font-bold" /></label>
                    <label className="block text-sm font-black text-slate-700">緊急連絡先<input value={profileDraft.emergency_contact||''} onChange={(e)=>setProfileDraft(p=>({...p,emergency_contact:e.target.value}))} className="mt-1.5 w-full rounded-xl border border-slate-300 p-3 font-bold" /></label>
                    <label className="block text-sm font-black text-slate-700">管理メモ<textarea value={profileDraft.notes||''} onChange={(e)=>setProfileDraft(p=>({...p,notes:e.target.value}))} className="mt-1.5 w-full min-h-24 rounded-xl border border-slate-300 p-3 font-bold" /></label>
                    <div className="flex justify-end"><button onClick={saveProfile} disabled={saving} className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 font-black disabled:opacity-50">💾 台帳を保存</button></div>
                  </div>}

                  {!loading && tab==='qualification' && <div className="space-y-5">
                    <div className="rounded-2xl border-2 border-blue-200 bg-blue-50 p-4 md:p-5">
                      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
                        <div>
                          <div className="font-black text-blue-950 text-lg">📥 Excelから資格を一括登録</div>
                          <p className="mt-1 text-sm text-blue-800 font-bold">現在使用している資格管理Excel（作業員ごとのシート）を選ぶと、作業員名・区分・資格名・修了証番号・取得日を自動で読み取ります。</p>
                          <p className="mt-1 text-xs text-blue-700">※ すぐには登録せず、まず読み取り結果を確認します。既存データは上書き・削除しません。</p>
                        </div>
                        <label className={`shrink-0 rounded-xl px-5 py-3 font-black text-center cursor-pointer ${excelImportLoading?'bg-slate-300 text-slate-500':'bg-blue-600 hover:bg-blue-700 text-white'}`}>
                          {excelImportLoading ? 'Excel確認中…' : '📄 Excelを選択'}
                          <input type="file" accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" disabled={excelImportLoading} className="hidden" onChange={(e)=>{const f=e.target.files?.[0]; if(f) previewQualificationExcel(f); e.currentTarget.value='';}} />
                        </label>
                      </div>
                    </div>

                    {excelImportPreview && <div className="rounded-2xl border border-slate-300 bg-white overflow-hidden shadow-sm">
                      <div className="p-4 md:p-5 border-b border-slate-200">
                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                          <div>
                            <div className="font-black text-slate-900">読み取り結果：{excelImportPreview.fileName}</div>
                            <div className="mt-2 flex flex-wrap gap-2 text-xs font-black">
                              <span className="rounded-full bg-emerald-100 text-emerald-800 px-3 py-1.5">新規 {excelImportPreview.summary.newCount}件</span>
                              <span className="rounded-full bg-slate-100 text-slate-700 px-3 py-1.5">登録済み {excelImportPreview.summary.duplicateCount}件</span>
                              <span className="rounded-full bg-rose-100 text-rose-800 px-3 py-1.5">作業員未一致 {excelImportPreview.summary.unmatchedCount}件</span>
                              <span className="rounded-full bg-blue-100 text-blue-800 px-3 py-1.5">全 {excelImportPreview.summary.total}件 / {excelImportPreview.summary.sheets}シート</span>
                            </div>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <button type="button" onClick={()=>setExcelImportPreview(null)} disabled={excelImportLoading} className="rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 font-black">取消</button>
                            <button type="button" onClick={commitQualificationExcel} disabled={excelImportLoading || excelImportPreview.summary.newCount===0} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 font-black disabled:opacity-40">✓ 新規 {excelImportPreview.summary.newCount}件を登録</button>
                          </div>
                        </div>
                        {excelImportPreview.summary.unmatchedCount>0 && <div className="mt-3 rounded-xl bg-rose-50 border border-rose-200 p-3 text-sm text-rose-800 font-bold">⚠️ 「作業員未一致」は登録されません。Excelのシート名・氏名が現在の作業員マスタと一致しているか確認してください。</div>}
                      </div>
                      <div className="max-h-[420px] overflow-auto">
                        <table className="w-full min-w-[1050px] text-sm">
                          <thead className="sticky top-0 bg-slate-100 z-10"><tr><th className="p-3 text-left">状態</th><th className="p-3 text-left">作業員</th><th className="p-3 text-left">区分</th><th className="p-3 text-left">資格・講習</th><th className="p-3 text-left">修了証番号</th><th className="p-3 text-left">取得日</th><th className="p-3 text-left">元シート</th></tr></thead>
                          <tbody className="divide-y divide-slate-100">{excelImportPreview.rows.map((row,idx)=><tr key={`${row.source_sheet}-${row.source_row}-${idx}`} className={row.status==='unmatched'?'bg-rose-50':row.status==='duplicate'?'bg-slate-50':''}><td className="p-3"><span className={`rounded-full px-2.5 py-1 text-xs font-black ${row.status==='new'?'bg-emerald-100 text-emerald-800':row.status==='duplicate'?'bg-slate-200 text-slate-700':'bg-rose-100 text-rose-800'}`}>{row.status==='new'?'新規':row.status==='duplicate'?'登録済み':'未一致'}</span></td><td className="p-3 font-black">{row.worker_name||row.source_worker_name||'-'}</td><td className="p-3 font-bold">{row.category||'-'}</td><td className="p-3 font-black">{row.qualification_name}</td><td className="p-3">{row.certificate_no||'-'}</td><td className="p-3">{fmtDate(row.acquired_date)}</td><td className="p-3 text-xs text-slate-500">{row.source_sheet} / {row.source_row}行目</td></tr>)}</tbody>
                        </table>
                      </div>
                    </div>}

                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><div className="font-black text-emerald-950">資格・講習を追加</div><div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 mt-3">
                      <select value={qualificationDraft.category||''} onChange={(e)=>setQualificationDraft(q=>({...q,category:e.target.value}))} className="rounded-xl border p-3 font-bold"><option>技能講習</option><option>特別教育</option><option>資格</option><option>運転免許証</option><option>その他</option></select>
                      <input value={qualificationDraft.qualification_name||''} onChange={(e)=>setQualificationDraft(q=>({...q,qualification_name:e.target.value}))} placeholder="資格・講習名" className="rounded-xl border p-3 font-bold" />
                      <input value={qualificationDraft.certificate_no||''} onChange={(e)=>setQualificationDraft(q=>({...q,certificate_no:e.target.value}))} placeholder="修了証番号" className="rounded-xl border p-3 font-bold" />
                      <input type="date" value={qualificationDraft.acquired_date||''} onChange={(e)=>setQualificationDraft(q=>({...q,acquired_date:e.target.value}))} className="rounded-xl border p-3 font-bold" />
                      <label className="text-xs font-black text-slate-600">有効期限<input type="date" value={qualificationDraft.expiry_date||''} onChange={(e)=>setQualificationDraft(q=>({...q,expiry_date:e.target.value}))} className="mt-1 w-full rounded-xl border p-3 font-bold bg-white" /></label>
                      <input value={qualificationDraft.issuing_body||''} onChange={(e)=>setQualificationDraft(q=>({...q,issuing_body:e.target.value}))} placeholder="発行元（任意）" className="rounded-xl border p-3 font-bold" />
                      <input value={qualificationDraft.notes||''} onChange={(e)=>setQualificationDraft(q=>({...q,notes:e.target.value}))} placeholder="メモ" className="rounded-xl border p-3 font-bold" />
                      <button onClick={saveQualification} disabled={saving} className="rounded-xl bg-emerald-600 text-white p-3 font-black">＋ 追加</button>
                    </div></div>
                    <div className="overflow-x-auto rounded-2xl border border-slate-200"><table className="w-full min-w-[900px] text-sm"><thead className="bg-slate-100"><tr><th className="p-3 text-left">区分</th><th className="p-3 text-left">資格・講習</th><th className="p-3 text-left">修了証番号</th><th className="p-3 text-left">取得日</th><th className="p-3 text-left">有効期限</th><th className="p-3"></th></tr></thead><tbody className="divide-y">{selectedQualifications.map((q)=><tr key={q.id||`${q.qualification_name}-${q.acquired_date}`} className={isExpired(q.expiry_date)?'bg-rose-50':isWithinDays(q.expiry_date,60)?'bg-amber-50':''}><td className="p-3 font-bold">{q.category||'-'}</td><td className="p-3 font-black">{q.qualification_name}</td><td className="p-3">{q.certificate_no||'-'}</td><td className="p-3">{fmtDate(q.acquired_date)}</td><td className="p-3">{q.expiry_date?(isExpired(q.expiry_date)?`⚠️ 期限切れ ${fmtDate(q.expiry_date)}`:isWithinDays(q.expiry_date,60)?`⚠️ 60日以内 ${fmtDate(q.expiry_date)}`:fmtDate(q.expiry_date)):'-'}</td><td className="p-3 text-right"><button onClick={()=>setQualificationDraft({...q})} className="text-blue-600 font-black mr-3">編集</button><button onClick={()=>deleteQualification(q.id)} className="text-rose-600 font-black">削除</button></td></tr>)}</tbody></table>{selectedQualifications.length===0&&<div className="p-8 text-center text-slate-400 font-bold">資格情報はまだありません。</div>}</div>
                  </div>}

                  {!loading && tab==='health' && <div className="space-y-5">
                    <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4"><div className="font-black text-orange-950">健康診断結果を登録</div><div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 mt-3">
                      <label className="text-xs font-black">受診日<input type="date" value={healthDraft.exam_date||''} onChange={(e)=>setHealthDraft(h=>({...h,exam_date:e.target.value}))} className="mt-1 w-full rounded-xl border p-3 font-bold bg-white" /></label>
                      <input type="number" value={healthDraft.systolic??''} onChange={(e)=>setHealthDraft(h=>({...h,systolic:e.target.value}))} placeholder="最高血圧" className="rounded-xl border p-3 font-bold" />
                      <input type="number" value={healthDraft.diastolic??''} onChange={(e)=>setHealthDraft(h=>({...h,diastolic:e.target.value}))} placeholder="最低血圧" className="rounded-xl border p-3 font-bold" />
                      <input value={healthDraft.judgement||''} onChange={(e)=>setHealthDraft(h=>({...h,judgement:e.target.value}))} placeholder="判定" className="rounded-xl border p-3 font-bold" />
                      <label className="text-xs font-black">次回期限<input type="date" value={healthDraft.next_due_date||''} onChange={(e)=>setHealthDraft(h=>({...h,next_due_date:e.target.value}))} className="mt-1 w-full rounded-xl border p-3 font-bold bg-white" /></label>
                      <input value={healthDraft.notes||''} onChange={(e)=>setHealthDraft(h=>({...h,notes:e.target.value}))} placeholder="メモ" className="rounded-xl border p-3 font-bold xl:col-span-2" />
                      <button onClick={saveHealth} disabled={saving} className="rounded-xl bg-orange-600 text-white p-3 font-black">＋ 登録</button>
                    </div></div>
                    <div className="overflow-x-auto rounded-2xl border border-slate-200"><table className="w-full min-w-[850px] text-sm"><thead className="bg-slate-100"><tr><th className="p-3 text-left">受診日</th><th className="p-3 text-left">血圧</th><th className="p-3 text-left">判定</th><th className="p-3 text-left">次回期限</th><th className="p-3 text-left">メモ</th><th className="p-3"></th></tr></thead><tbody className="divide-y">{selectedHealth.map((h)=><tr key={h.id||h.exam_date}><td className="p-3 font-black">{fmtDate(h.exam_date)}</td><td className="p-3">{h.systolic||'-'} / {h.diastolic||'-'}</td><td className="p-3">{h.judgement||'-'}</td><td className="p-3">{h.next_due_date?(isExpired(h.next_due_date)?`⚠️ 期限切れ ${fmtDate(h.next_due_date)}`:isWithinDays(h.next_due_date,60)?`⚠️ 60日以内 ${fmtDate(h.next_due_date)}`:fmtDate(h.next_due_date)):'-'}</td><td className="p-3">{h.notes||'-'}</td><td className="p-3 text-right"><button onClick={()=>setHealthDraft({...h})} className="text-blue-600 font-black mr-3">編集</button><button onClick={()=>deleteHealth(h.id)} className="text-rose-600 font-black">削除</button></td></tr>)}</tbody></table>{selectedHealth.length===0&&<div className="p-8 text-center text-slate-400 font-bold">健康診断履歴はまだありません。</div>}</div>
                  </div>}

                  {!loading && tab==='documents' && <div className="space-y-5">
                    <div className="rounded-2xl border-2 border-violet-200 bg-violet-50 p-4 md:p-5">
                      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
                        <div>
                          <div className="font-black text-violet-950 text-lg">📥 資格証画像をExcel取込パックから一括登録</div>
                          <p className="mt-1 text-sm text-violet-800 font-bold">添付の資格証Excelから変換した取込パックを選ぶと、現在の作業員マスタに一致する人の資格証画像だけを登録します。</p>
                          <p className="mt-1 text-xs text-violet-700">画像はA4印刷を想定してJPEG品質86%・長辺最大2200pxで保存。元Excel内のEMF画像も印刷用JPEGへ変換済みです。</p>
                        </div>
                        <label className={`shrink-0 rounded-xl px-5 py-3 font-black text-center cursor-pointer ${qualificationPackLoading?'bg-slate-300 text-slate-500':'bg-violet-600 hover:bg-violet-700 text-white'}`}>
                          {qualificationPackLoading ? (qualificationPackProgress || '確認中…') : '📦 資格証取込パックを選択'}
                          <input type="file" accept=".qpack,.zip,application/zip" disabled={qualificationPackLoading} className="hidden" onChange={(e)=>{const f=e.target.files?.[0]; if(f) previewQualificationPackFile(f); e.currentTarget.value='';}} />
                        </label>
                      </div>

                      {qualificationPackPreview && <div className="mt-4 rounded-2xl bg-white border border-violet-200 overflow-hidden">
                        <div className="p-4 border-b border-violet-100">
                          <div className="font-black text-slate-900">取込確認：{qualificationPackPreview.sourceFile || qualificationPackPreview.fileName}</div>
                          <div className="mt-2 flex flex-wrap gap-2 text-xs font-black">
                            <span className="rounded-full bg-emerald-100 text-emerald-800 px-3 py-1.5">新規画像 {qualificationPackPreview.summary.newCount}枚</span>
                            <span className="rounded-full bg-blue-100 text-blue-800 px-3 py-1.5">対象作業員 {qualificationPackPreview.summary.matchedWorkers}名</span>
                            <span className="rounded-full bg-slate-100 text-slate-700 px-3 py-1.5">登録済み {qualificationPackPreview.summary.duplicateCount}枚</span>
                            <span className="rounded-full bg-rose-100 text-rose-800 px-3 py-1.5">未一致 {qualificationPackPreview.summary.unmatchedCount}枚</span>
                          </div>
                          <div className="mt-3 flex gap-2 justify-end">
                            <button type="button" onClick={()=>{setQualificationPackPreview(null);setQualificationPackFile(null);}} disabled={qualificationPackLoading} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 font-black text-slate-700">取消</button>
                            <button type="button" onClick={commitQualificationPack} disabled={qualificationPackLoading || qualificationPackPreview.summary.newCount===0} className="rounded-xl bg-violet-600 hover:bg-violet-700 text-white px-5 py-2.5 font-black disabled:opacity-50">✓ 新規 {qualificationPackPreview.summary.newCount}枚を登録</button>
                          </div>
                        </div>
                        <div className="max-h-[320px] overflow-auto">
                          <table className="w-full min-w-[720px] text-sm"><thead className="sticky top-0 bg-slate-100"><tr><th className="p-3 text-left">状態</th><th className="p-3 text-left">作業員</th><th className="p-3 text-left">元シート</th><th className="p-3 text-left">画像</th></tr></thead><tbody className="divide-y divide-slate-100">
                            {qualificationPackPreview.rows.map((row,idx)=><tr key={`${row.file}-${idx}`} className={row.status==='unmatched'?'bg-rose-50':row.status==='duplicate'?'bg-slate-50':''}><td className="p-3"><span className={`rounded-full px-2.5 py-1 text-xs font-black ${row.status==='new'?'bg-emerald-100 text-emerald-800':row.status==='duplicate'?'bg-slate-200 text-slate-700':'bg-rose-100 text-rose-800'}`}>{row.status==='new'?'新規':row.status==='duplicate'?'登録済み':'未一致'}</span></td><td className="p-3 font-black">{row.worker_name||row.sourceWorker}</td><td className="p-3">{row.sourceSheet}</td><td className="p-3">{row.imageIndex}枚目</td></tr>)}
                          </tbody></table>
                        </div>
                        {qualificationPackPreview.summary.unmatchedCount>0 && <div className="p-3 bg-rose-50 border-t border-rose-100 text-xs font-bold text-rose-800">⚠️ 未一致の画像は登録しません。現在の作業員マスタにいる人だけが対象です。</div>}
                      </div>}
                    </div>

                    <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 md:p-5">
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div><div className="font-black text-indigo-950">🖨️ 複数人の資格証をA4印刷</div><p className="mt-1 text-xs font-bold text-indigo-700">左の作業員一覧で「印刷」にチェックした人の資格証だけをまとめてA4印刷できます。PDF保存もブラウザの印刷画面から選べます。</p></div>
                        <div className="flex items-center gap-2 flex-wrap"><span className="rounded-full bg-white border border-indigo-200 px-3 py-2 text-sm font-black text-indigo-800">選択 {printSelectedWorkers.length}名</span><button type="button" onClick={()=>setPrintSelectedWorkers(workerNames)} className="rounded-xl bg-white border border-indigo-200 px-3 py-2 text-xs font-black text-indigo-700">全員選択</button><button type="button" onClick={()=>setPrintSelectedWorkers([])} className="rounded-xl bg-white border border-slate-200 px-3 py-2 text-xs font-black text-slate-600">解除</button><button type="button" onClick={printSelectedQualificationDocuments} disabled={printSelectedWorkers.length===0} className="rounded-xl bg-indigo-600 text-white px-5 py-2.5 font-black disabled:opacity-40">🖨️ A4印刷</button></div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4"><div className="font-black text-violet-950">資格証・健康診断書を個別保存</div><p className="mt-1 text-xs text-violet-700">画像はアップロード前に長辺2200px・JPEG品質88%へ自動圧縮します。PDFは原本のまま10MBまで保存します。</p><div className="grid grid-cols-1 md:grid-cols-[180px_1fr_auto] gap-3 mt-3"><select value={docType} onChange={(e)=>setDocType(e.target.value)} className="rounded-xl border p-3 font-bold bg-white"><option value="qualification">資格証</option><option value="health">健康診断書</option><option value="safety">安全書類</option><option value="other">その他</option></select><input value={docTitle} onChange={(e)=>setDocTitle(e.target.value)} placeholder="書類名（例：車両系資格証）" className="rounded-xl border p-3 font-bold bg-white" /><label className={`rounded-xl px-5 py-3 font-black text-center cursor-pointer ${uploading?'bg-slate-300 text-slate-500':'bg-violet-600 text-white hover:bg-violet-700'}`}>{uploading?'アップロード中…':'📎 ファイル追加'}<input type="file" accept="image/*,.pdf,application/pdf" disabled={uploading} className="hidden" onChange={(e)=>{const f=e.target.files?.[0]; if(f) uploadDocument(f); e.currentTarget.value='';}} /></label></div></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{selectedDocuments.map((doc)=><div key={doc.id} className="rounded-2xl border border-slate-200 bg-white p-4 flex items-start justify-between gap-3"><div className="min-w-0"><div className="text-xs font-black text-slate-400">{doc.document_type==='qualification'?'資格証':doc.document_type==='health'?'健康診断書':doc.document_type==='safety'?'安全書類':'その他'}</div><div className="mt-1 font-black text-slate-900 break-words">{doc.title||'書類'}</div><div className="mt-1 text-xs text-slate-500">{doc.file_size?`${(doc.file_size/1024/1024).toFixed(2)} MB`:'-'} ・ {doc.uploaded_at?new Date(doc.uploaded_at).toLocaleString('ja-JP'):'-'}</div></div><div className="shrink-0 flex gap-2"><button onClick={()=>openDocument(doc)} className="rounded-lg bg-blue-50 text-blue-700 px-3 py-2 text-xs font-black">開く</button><button onClick={()=>deleteDocument(doc)} className="rounded-lg bg-rose-50 text-rose-700 px-3 py-2 text-xs font-black">削除</button></div></div>)}{selectedDocuments.length===0&&<div className="md:col-span-2 p-8 text-center text-slate-400 font-bold rounded-2xl border border-dashed border-slate-300">保存済み書類はありません。</div>}</div>
                  </div>}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
