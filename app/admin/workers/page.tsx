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
      await api('/api/worker-ledger', { method: 'POST', body: JSON.stringify({ action: 'saveProfile', data: profileDraft }) });
      await loadAll();
      alert('作業員台帳を保存しました。');
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
                return <button key={name} onClick={()=>setSelectedWorker(name)} className={`w-full text-left p-4 transition ${selectedWorker===name?'bg-blue-50 border-l-4 border-blue-600':'hover:bg-slate-50 border-l-4 border-transparent'}`}><div className="flex items-center justify-between gap-2"><span className="font-black text-slate-900">{name}</span>{s.warning&&<span className="text-xs rounded-full bg-amber-100 text-amber-800 px-2 py-1 font-black">期限確認</span>}</div><div className="mt-1 text-xs text-slate-500">資格 {s.qCount}件{ s.healthDate ? `・健診 ${fmtDate(s.healthDate)}` : '・健診 未登録'}</div></button>;
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
                    <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4"><div className="font-black text-violet-950">資格証・健康診断書を保存</div><p className="mt-1 text-xs text-violet-700">画像はアップロード前に長辺2200px・JPEG品質88%へ自動圧縮します。PDFは原本のまま10MBまで保存します。</p><div className="grid grid-cols-1 md:grid-cols-[180px_1fr_auto] gap-3 mt-3"><select value={docType} onChange={(e)=>setDocType(e.target.value)} className="rounded-xl border p-3 font-bold bg-white"><option value="qualification">資格証</option><option value="health">健康診断書</option><option value="safety">安全書類</option><option value="other">その他</option></select><input value={docTitle} onChange={(e)=>setDocTitle(e.target.value)} placeholder="書類名（例：車両系資格証）" className="rounded-xl border p-3 font-bold bg-white" /><label className={`rounded-xl px-5 py-3 font-black text-center cursor-pointer ${uploading?'bg-slate-300 text-slate-500':'bg-violet-600 text-white hover:bg-violet-700'}`}>{uploading?'アップロード中…':'📎 ファイル追加'}<input type="file" accept="image/*,.pdf,application/pdf" disabled={uploading} className="hidden" onChange={(e)=>{const f=e.target.files?.[0]; if(f) uploadDocument(f); e.currentTarget.value='';}} /></label></div></div>
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 font-bold">🤖 健康診断書・資格証の自動読み取りは第2段階で追加します。今回はまず「安全に保存・一覧・閲覧できる」基盤を作っています。</div>
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
