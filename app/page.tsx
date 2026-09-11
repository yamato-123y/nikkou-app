'use client';
import { useState, useEffect } from 'react';

export default function Home() {
  const [settings, setSettings] = useState<any>({});

  const [date, setDate] = useState(() => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });

  const [location, setLocation] = useState('');
  const [manager, setManager] = useState('');
  const [selectedWorkers, setSelectedWorkers] = useState<string[]>([]);
  const [jobTypesCount, setJobTypesCount] = useState<{[key: string]: string}>({});

  const [subcontractors, setSubcontractors] = useState<{company: string, task: string, count: string}[]>([]);

  // 通常（南大阪建機等）のリース
  const [leaseHeavy, setLeaseHeavy] = useState<string[]>([]);
  const [leaseAttach, setLeaseAttach] = useState<string[]>([]);
  const [leaseOther, setLeaseOther] = useState<string[]>([]);

  const [isOpenHeavy, setIsOpenHeavy] = useState(false);
  const [isOpenAttach, setIsOpenAttach] = useState(false);
  const [isOpenOther, setIsOpenOther] = useState(false);

  // 石川県出張用のリース選択ステート
  const [isOpenIshikawa, setIsOpenIshikawa] = useState(false);
  const [ishikawaLeaseHeavy, setIshikawaLeaseHeavy] = useState<string[]>([]);
  const [ishikawaLeaseAttach, setIshikawaLeaseAttach] = useState<string[]>([]);
  const [ishikawaLeaseOther, setIshikawaLeaseOther] = useState<string[]>([]);
  const [isOpenIshikawaHeavy, setIsOpenIshikawaHeavy] = useState(false);
  const [isOpenIshikawaAttach, setIsOpenIshikawaAttach] = useState(false);
  const [isOpenIshikawaOther, setIsOpenIshikawaOther] = useState(false);

  // ★ 石川県用のその他の自由入力リース
  const [ishikawaCustomMachines, setIshikawaCustomMachines] = useState<{name: string, count: string}[]>([]);

  const [mokCustomMachines, setMokCustomMachines] = useState<{name: string, count: string}[]>([]);
  
  // ★ 南大阪建機等のその他の自由入力リース
  const [otherLeases, setOtherLeases] = useState<{company: string, name: string, count: string}[]>([]);

  const [selectedOwnMachines, setSelectedOwnMachines] = useState<string[]>([]);
  const [selectedVehicles, setSelectedVehicles] = useState<string[]>([]);

  const [fuel, setFuel] = useState('');
  const [regularPrice, setRegularPrice] = useState('');
  const [etcPrice, setEtcPrice] = useState('');
  const [parkingPrice, setParkingPrice] = useState('');

  // ★ 宇野気石油用の燃料ステート（職長が徳本の場合用）
  const [unokeFuel, setUnokeFuel] = useState('');
  const [unokeRegular, setUnokeRegular] = useState('');

  const [otherItem, setOtherItem] = useState('');
  const [otherPrice, setOtherPrice] = useState('');

  const [disposals, setDisposals] = useState<{location: string, item: string, quantity: string, unit: string}[]>([]);
  const [scraps, setScraps] = useState<{location: string, item: string, quantity: string, unit: string}[]>([]);
  const [description, setDescription] = useState('');


  // 現場写真（着工前・完了後）
  const [sitePhotos, setSitePhotos] = useState<{ before: any[]; after: any[] }>({ before: [], after: [] });
  const [sitePhotoLoading, setSitePhotoLoading] = useState(false);
  const [sitePhotoUploading, setSitePhotoUploading] = useState<'before' | 'after' | null>(null);

  const loadSitePhotos = async (locationName: string) => {
    if (!locationName) {
      setSitePhotos({ before: [], after: [] });
      return;
    }

    try {
      setSitePhotoLoading(true);
      const res = await fetch(`/api/site-photos?location=${encodeURIComponent(locationName)}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('写真の取得に失敗しました');
      const data = await res.json();
      setSitePhotos({
        before: Array.isArray(data?.before) ? data.before : [],
        after: Array.isArray(data?.after) ? data.after : []
      });
    } catch (e) {
      console.error(e);
      setSitePhotos({ before: [], after: [] });
    } finally {
      setSitePhotoLoading(false);
    }
  };

  const compressSitePhoto = async (file: File): Promise<File> => {
    const maxWidth = 1600;
    const quality = 0.78;

    const objectUrl = URL.createObjectURL(file);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = objectUrl;
      });

      const scale = Math.min(1, maxWidth / img.width);
      const width = Math.max(1, Math.round(img.width * scale));
      const height = Math.max(1, Math.round(img.height * scale));

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return file;

      ctx.drawImage(img, 0, 0, width, height);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', quality)
      );
      if (!blob) return file;

      return new File([blob], `${Date.now()}.jpg`, { type: 'image/jpeg' });
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  };

  const uploadSitePhoto = async (type: 'before' | 'after', file: File, locationName: string) => {
    if (!locationName) {
      alert('先に現場を選択してください。');
      return;
    }

    const currentCount = type === 'before' ? sitePhotos.before.length : sitePhotos.after.length;
    if (currentCount >= 3) {
      alert(type === 'before' ? '着工前写真は3枚までです。' : '完了写真は3枚までです。');
      return;
    }

    try {
      setSitePhotoUploading(type);
      const compressed = await compressSitePhoto(file);
      const formData = new FormData();
      formData.append('location', locationName);
      formData.append('type', type);
      formData.append('file', compressed);

      const res = await fetch('/api/site-photos', {
        method: 'POST',
        body: formData
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data?.error || '写真のアップロードに失敗しました。');
        return;
      }

      await loadSitePhotos(locationName);
    } catch (e) {
      console.error(e);
      alert('写真のアップロードに失敗しました。');
    } finally {
      setSitePhotoUploading(null);
    }
  };

  // モーダル管理用ステート
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => setSettings(data || {}))
      .catch(err => console.error(err));
  }, []);

  useEffect(() => {
    loadSitePhotos(location);
  }, [location]);

  const toggleSelection = (list: string[], item: string, setter: Function) => {
    setter(list.includes(item) ? list.filter(i => i !== item) : [...list, item]);
  };

  // 同じリース品を2台・3台借りる場合に対応。
  // 同じ名称を数量分だけ配列に保持することで既存API・原価計算との互換性を保ちます。
  const getLeaseQuantity = (list: string[], item: string) =>
    list.filter((x: string) => x === item).length;

  const changeLeaseQuantity = (list: string[], item: string, delta: number, setter: Function) => {
    const current = getLeaseQuantity(list, item);
    const next = Math.max(0, current + delta);
    const withoutItem = list.filter((x: string) => x !== item);
    setter([...withoutItem, ...Array(next).fill(item)]);
  };

  const summarizeLeaseSelections = (list: string[]) => {
    const counts: {[name: string]: number} = {};
    list.forEach((name: string) => counts[name] = (counts[name] || 0) + 1);
    return Object.entries(counts).map(([name, count]) => count > 1 ? `${name}×${count}` : name);
  };

  // 「日報を送信する」ボタンを押したときは、直接送信せず確認モーダルを開く
  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!location) {
      alert('現場名を選択してください。');
      return;
    }
    if (!manager) {
      alert('職長を選択してください。');
      return;
    }
    setShowConfirmModal(true);
  };

  // 確認モーダル内での「この内容で送信する」ボタン
  const handleConfirmedSubmit = async () => {
    setShowConfirmModal(false);

    // 職長が徳本以外の場合、石川県や宇野気石油の選択状態をクリア・調整する
    const isIshikawaActive = manager === '徳本';

    await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date, location, manager, workers: selectedWorkers, 
        jobTypes: jobTypesCount,
        subcontractors,
        leaseHeavy, leaseAttach, leaseOther,
        ishikawaHeavy: isIshikawaActive ? ishikawaLeaseHeavy : [],
        ishikawaAttach: isIshikawaActive ? ishikawaLeaseAttach : [],
        ishikawaOther: isIshikawaActive ? ishikawaLeaseOther : [],
        ishikawaLeaseHeavy: isIshikawaActive ? ishikawaLeaseHeavy : [],
        ishikawaLeaseAttach: isIshikawaActive ? ishikawaLeaseAttach : [],
        ishikawaLeaseOther: isIshikawaActive ? ishikawaLeaseOther : [],
        ishikawaCustomMachines: isIshikawaActive ? ishikawaCustomMachines : [],
        machines: leaseHeavy,
        mokCustomMachines,
        otherLeases,         
        ownMachines: selectedOwnMachines, vehicles: selectedVehicles, 
        fuel: fuel || '0', 
        regularPrice: regularPrice || '0',
        etcPrice: etcPrice || '0', 
        parkingPrice: parkingPrice || '0',
        unokeFuel: isIshikawaActive ? (unokeFuel || '0') : '0',
        unokeRegular: isIshikawaActive ? (unokeRegular || '0') : '0',
        otherItem, otherPrice: otherPrice || '0',
        disposals, scraps, workDescription: description,
        createdAt: new Date().toISOString()
      })
    });

    setSelectedWorkers([]); 
    setJobTypesCount({});
    setSubcontractors([]);
    setLeaseHeavy([]);
    setLeaseAttach([]);
    setLeaseOther([]);
    setIshikawaLeaseHeavy([]);
    setIshikawaLeaseAttach([]);
    setIshikawaLeaseOther([]);
    setIshikawaCustomMachines([]);
    setMokCustomMachines([]);
    setOtherLeases([]);
    setSelectedOwnMachines([]); 
    setSelectedVehicles([]);
    setFuel(''); setRegularPrice(''); setEtcPrice(''); setParkingPrice(''); 
    setUnokeFuel(''); setUnokeRegular('');
    setOtherItem(''); setOtherPrice('');
    setDisposals([]); setScraps([]); setDescription('');

    setShowSuccessModal(true);
  };

  const handleContinue = () => {
    setShowSuccessModal(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFinish = () => {
    setShowSuccessModal(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const uniqueCompanies = Array.from(new Set((settings.subcontractors || []).map((s:any) => s.company).filter(Boolean)));
  const uniqueDisposalLocations = Array.from(new Set((settings.disposalLocations || []).map((d:any) => d.location).filter(Boolean)));
  const uniqueScrapLocations = Array.from(new Set((settings.scrapLocations || []).map((s:any) => s.location).filter(Boolean)));

  return (
    <div className="p-4 max-w-xl mx-auto space-y-6 font-sans pb-32 bg-slate-100 min-h-screen text-slate-950 relative text-base">

      {/* ヘッダー */}
      <div className="bg-[#1e293b] text-white p-6 rounded-2xl text-center shadow-md">
        <h1 className="text-2xl font-black">📱 現場日報入力</h1>
        <p className="text-sm text-slate-300 mt-1">株式会社大和</p>
      </div>

      {/* 送信内容確認ポップアップ */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white p-6 md:p-8 rounded-3xl shadow-2xl w-full max-w-md space-y-4 border my-auto max-h-[90vh] flex flex-col">
            <div className="text-center">
              <div className="text-4xl mb-2">📋</div>
              <h2 className="text-xl font-black text-slate-950">日報内容の確認</h2>
              <p className="text-xs text-slate-500 mt-1">以下の内容で送信します。よろしいですか？</p>
            </div>

            {/* 確認項目リスト */}
            <div className="bg-slate-50 p-4 rounded-2xl border space-y-3 text-sm overflow-y-auto flex-1">
              <div>
                <span className="font-bold text-slate-500 block text-xs">日付 / 現場 / 職長</span>
                <span className="font-black text-slate-950">{date} / {location} ({manager})</span>
              </div>

              <div>
                <span className="font-bold text-slate-500 block text-xs">作業員 ({selectedWorkers.length}名)</span>
                <span className="font-bold text-slate-800">{selectedWorkers.length > 0 ? selectedWorkers.join(', ') : 'なし'}</span>
              </div>

              {(leaseHeavy.length > 0 || leaseAttach.length > 0 || leaseOther.length > 0 || (manager === '徳本' && (ishikawaLeaseHeavy.length > 0 || ishikawaLeaseAttach.length > 0 || ishikawaLeaseOther.length > 0 || ishikawaCustomMachines.length > 0)) || selectedOwnMachines.length > 0 || selectedVehicles.length > 0 || otherLeases.length > 0) && (
                <div>
                  <span className="font-bold text-slate-500 block text-xs">重機・車両・リース</span>
                  <span className="font-bold text-slate-800">
                    {[
                      ...selectedOwnMachines,
                      ...summarizeLeaseSelections(leaseHeavy),
                      ...summarizeLeaseSelections(leaseAttach),
                      ...summarizeLeaseSelections(leaseOther),
                      ...(manager === '徳本' ? [
                        ...summarizeLeaseSelections(ishikawaLeaseHeavy),
                        ...summarizeLeaseSelections(ishikawaLeaseAttach),
                        ...summarizeLeaseSelections(ishikawaLeaseOther),
                        ...ishikawaCustomMachines.map(o => `${o.name}(${o.count})`)
                      ] : []),
                      ...otherLeases.map(o => `${o.name}(${o.count})`)
                    ].join(', ')}
                  </span>
                </div>
              )}

              {(fuel || regularPrice || etcPrice || parkingPrice || (manager === '徳本' && (unokeFuel || unokeRegular))) && (
                <div>
                  <span className="font-bold text-slate-500 block text-xs">燃料・経費</span>
                  <span className="font-bold text-slate-800">
                    {fuel ? `軽油:${fuel}L ` : ''}
                    {regularPrice ? `レギュラー:${regularPrice}円 ` : ''}
                    {manager === '徳本' && unokeFuel ? `宇野気石油 軽油:${unokeFuel}L ` : ''}
                    {manager === '徳本' && unokeRegular ? `宇野気石油 レギュラー:${unokeRegular}L ` : ''}
                    {etcPrice ? `ETC:${etcPrice}円 ` : ''}
                    {parkingPrice ? `駐車場:${parkingPrice}円` : ''}
                  </span>
                </div>
              )}

              {description && (
                <div>
                  <span className="font-bold text-slate-500 block text-xs">作業内容</span>
                  <p className="font-bold text-slate-800 whitespace-pre-wrap line-clamp-3">{description}</p>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button 
                type="button" 
                onClick={() => setShowConfirmModal(false)} 
                className="flex-1 bg-slate-200 text-slate-900 py-3.5 rounded-2xl font-bold text-base hover:bg-slate-300 transition"
              >
                修正する
              </button>
              <button 
                type="button" 
                onClick={handleConfirmedSubmit} 
                className="flex-1 bg-[#E56312] text-white py-3.5 rounded-2xl font-bold text-base shadow hover:bg-orange-700 transition"
              >
                この内容で送信
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 送信完了ポップアップ */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-sm space-y-5 text-center border">
            <div className="text-5xl">🎉</div>
            <h2 className="text-xl font-black text-slate-950">送信が完了しました</h2>
            <p className="text-base text-slate-800">続けて別の報告を入力しますか？</p>

            <div className="flex gap-3 pt-2">
              <button 
                type="button" 
                onClick={handleContinue} 
                className="flex-1 bg-[#E56312] text-white py-4 rounded-2xl font-bold text-base shadow hover:bg-orange-700 transition"
              >
                続けて報告
              </button>
              <button 
                type="button" 
                onClick={handleFinish} 
                className="flex-1 bg-slate-200 text-slate-900 py-4 rounded-2xl font-bold text-base hover:bg-slate-300 transition"
              >
                終了する
              </button>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handlePreSubmit} className="space-y-6">

        {/* 1. 日付と現場の選択 */}
        <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-5">
           <div className="font-black text-lg text-orange-600 border-b pb-3">📍 1. 日付と現場の選択</div>

           <div>
             <label className="text-base font-bold text-slate-950 block mb-2">【日付】</label>
             <div className="w-full border-2 rounded-2xl bg-white overflow-hidden box-border">
               <input 
                 type="date" 
                 value={date} 
                 onChange={e=>setDate(e.target.value)} 
                 className="w-full p-4 font-bold text-lg bg-transparent text-slate-950 outline-none box-border block" 
               />
             </div>
           </div>

           <div>
             <label className="text-base font-bold text-slate-950 block mb-2">【現場名】</label>
             <select value={location} onChange={e=>setLocation(e.target.value)} className="w-full p-4 border-2 rounded-2xl font-bold text-lg bg-white text-slate-950 box-border block">
               <option value="">現場を選択してください</option>
               {(settings.locations || [])
                 .filter((l: any) => {
                   if (typeof l === 'object' && l !== null) {
                     return !l.isFinished;
                   }
                   return true;
                 })
                 .map((l: any) => {
                   const locName = typeof l === 'string' ? l : l.name;
                   return (
                     <option key={locName} value={locName}>
                       {locName}
                     </option>
                   );
                 })}
             </select>
           </div>

           <div>
             <label className="text-base font-bold text-slate-950 block mb-2">【職長】</label>
             <select 
               value={manager} 
               onChange={e => {
                 const newManager = e.target.value;
                 setManager(newManager);
                 // 職長が「徳本」以外に変更された場合、石川県や宇野気石油の選択状態をリセットする
                 if (newManager !== '徳本') {
                   setIshikawaLeaseHeavy([]);
                   setIshikawaLeaseAttach([]);
                   setIshikawaLeaseOther([]);
                   setIshikawaCustomMachines([]);
                   setIsOpenIshikawa(false);
                   setUnokeFuel('');
                   setUnokeRegular('');
                 }
               }} 
               className="w-full p-4 border-2 rounded-2xl font-bold text-lg bg-white text-slate-950 box-border block"
             >
               <option value="">職長を選択してください</option>
               {(settings.managers || []).map((m:any)=><option key={m.name} value={m.name}>{m.name}</option>)}
             </select>
           </div>
        </div>


        {/* 現場写真：着工前・完了後 */}
        <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-4">
          <div className="border-b pb-3">
            <span className="font-black text-lg text-orange-600">📷 現場写真（着工前・完了後）</span>
            <p className="text-xs md:text-sm font-bold text-slate-500 mt-1">
              毎日の写真ではなく、この現場の「着工前」「完了後」だけ登録します。各3枚までです。
            </p>
          </div>

          {!location ? (
            <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 text-sm font-bold text-slate-500">
              先に現場名を選択してください。
            </div>
          ) : sitePhotoLoading ? (
            <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 text-sm font-bold text-slate-500">
              写真を読み込み中…
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {([
                { key: 'before', label: '🏗️ 着工前写真', photos: sitePhotos.before },
                { key: 'after', label: '✅ 完了写真', photos: sitePhotos.after }
              ] as const).map((group) => (
                <div key={group.key} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-black text-slate-900">{group.label}</div>
                      <div className="text-xs font-bold text-slate-500 mt-0.5">{group.photos.length}/3枚</div>
                    </div>

                    <label className={`px-4 py-2 rounded-xl font-black text-sm text-white transition ${
                      group.photos.length >= 3 || sitePhotoUploading !== null
                        ? 'bg-slate-300 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
                    }`}>
                      {sitePhotoUploading === group.key ? '送信中…' : '＋ 写真追加'}
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        disabled={group.photos.length >= 3 || sitePhotoUploading !== null}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          e.currentTarget.value = '';
                          if (file) await uploadSitePhoto(group.key, file, location);
                        }}
                      />
                    </label>
                  </div>

                  {group.photos.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-center text-sm text-slate-400 font-bold">
                      まだ写真はありません
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {group.photos.map((photo: any) => (
                        <a
                          key={photo.path}
                          href={photo.url}
                          target="_blank"
                          rel="noreferrer"
                          className="block rounded-xl overflow-hidden border border-slate-200 bg-white aspect-square"
                        >
                          <img
                            src={photo.url}
                            alt={group.label}
                            className="w-full h-full object-cover"
                          />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 2. 作業員 */}
        <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-5">
           <div className="border-b pb-3 space-y-1">
             <span className="font-black text-lg text-orange-600 block">👥 2. 作業員（複数選択可）</span>
             <p className="text-xs md:text-sm font-bold text-slate-500">※職長も現場で作業した場合は、ここでも選択してください。</p>
           </div>
           <div className="grid grid-cols-2 gap-3 pt-1">
             {(settings.workers || []).map((w:any) => (
               <button type="button" key={w.name} onClick={() => toggleSelection(selectedWorkers, w.name, setSelectedWorkers)}
               className={`p-4 rounded-2xl font-bold border-2 text-lg transition ${selectedWorkers.includes(w.name) ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-slate-50 text-slate-900 border-slate-300'}`}>{w.name}</button>
             ))}
           </div>

           {(settings.jobTypes || []).length > 0 && (
             <div className="border-t pt-5 space-y-3">
               <span className="font-bold text-base text-slate-950 block">🏷️ 職種ごとの稼働人数入力</span>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                 {(settings.jobTypes || []).map((j: any) => (
                   <div key={j.name} className="p-3 bg-slate-50 border-2 rounded-2xl flex items-center justify-between gap-3">
                     <span className="font-bold text-sm text-slate-800">{j.name}</span>
                     <div className="flex items-center gap-1.5">
                       <input 
                         type="number" 
                         min="0"
                         placeholder="0"
                         className="w-24 p-2.5 border-2 rounded-xl text-center font-bold text-base bg-white"
                         value={jobTypesCount[j.name] || ''}
                         onChange={e => setJobTypesCount({ ...jobTypesCount, [j.name]: e.target.value })}
                       />
                       <span className="text-sm font-bold text-slate-600">人</span>
                     </div>
                   </div>
                 ))}
               </div>
             </div>
           )}

           <div className="border-t pt-5 space-y-4">
             <div className="flex justify-between items-center">
               <span className="font-bold text-base text-slate-950">👤 外注・派遣作業員</span>
               <button type="button" onClick={() => setSubcontractors([...subcontractors, {company: '', task: '', count: ''}])} className="bg-emerald-600 text-white text-sm px-4 py-2.5 rounded-xl font-bold shadow hover:bg-emerald-700 transition">＋ 追加</button>
             </div>

             {subcontractors.map((sub, index) => {
               const availableTasks = (settings.subcontractors || []).filter((s:any) => s.company === sub.company).map((s:any) => s.task);

               return (
                 <div key={index} className="p-4 border-2 rounded-2xl bg-slate-50 space-y-3">
                   <div className="grid grid-cols-2 gap-3">
                     <div>
                       <label className="text-sm font-bold text-slate-950 block mb-1">外注会社名</label>
                       <select className="w-full max-w-full min-w-0 p-3 rounded-xl border-2 font-bold text-base bg-white text-slate-950 box-border block" value={sub.company} onChange={(e)=>{
                         const updated = [...subcontractors]; 
                         updated[index].company = e.target.value; 
                         updated[index].task = '';
                         setSubcontractors(updated);
                       }}>
                         <option value="">会社を選択...</option>
                         {uniqueCompanies.map((comp:any)=><option key={comp} value={comp}>{comp}</option>)}
                       </select>
                     </div>
                     <div>
                       <label className="text-sm font-bold text-slate-950 block mb-1">作業内容</label>
                       <select className="w-full max-w-full min-w-0 p-3 rounded-xl border-2 font-bold text-base bg-white text-slate-950 box-border block" value={sub.task} onChange={(e)=>{
                         const updated = [...subcontractors]; updated[index].task = e.target.value; setSubcontractors(updated);
                       }}>
                         <option value="">内容を選択...</option>
                         {availableTasks.map((t:any, idx:number)=><option key={idx} value={t}>{t}</option>)}
                       </select>
                     </div>
                   </div>
                   <div className="flex items-end gap-3">
                     <div className="flex-1 min-w-0">
                       <label className="text-sm font-bold text-slate-950 block mb-1">人数</label>
                       <input type="number" placeholder="0" className="w-full max-w-full min-w-0 p-3 rounded-xl border-2 font-bold text-lg bg-white text-slate-950 box-border block" value={sub.count} onChange={(e)=>{
                         const updated = [...subcontractors]; updated[index].count = e.target.value; setSubcontractors(updated);
                       }}/>
                     </div>
                     <button type="button" onClick={() => setSubcontractors(subcontractors.filter((_,i)=>i!==index))} className="bg-red-100 text-red-700 px-4 py-3 rounded-xl font-bold text-sm hover:bg-red-200 transition shrink-0">削除</button>
                   </div>
                 </div>
               );
             })}
           </div>
        </div>

        {/* 3. 重機・車両 */}
        <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-5">
           <div className="border-b pb-3">
             <span className="font-black text-lg text-orange-600">🚜 3. 重機・車両（複数選択可）</span>
           </div>

           {/* 自社保有 */}
           <div className="space-y-4 bg-emerald-50/70 p-5 rounded-3xl border-2 border-emerald-200">
             <div className="text-sm font-black text-emerald-950 bg-emerald-200 px-4 py-2 rounded-xl inline-block">
               🚛 自社保有（重機・車両）
             </div>

             <div className="space-y-2">
               <label className="text-sm font-bold text-slate-950 block">【自社重機】</label>
               <div className="grid grid-cols-2 gap-3">
                 {(settings.companyMachines || []).map((m:any) => {
                   const qty = getLeaseQuantity(selectedOwnMachines, m.name);
                   return (
                     <div key={m.name} className={`p-3 rounded-2xl border-2 transition ${qty > 0 ? 'bg-emerald-100 border-emerald-500 text-emerald-950' : 'bg-white text-slate-900 border-slate-300'}`}>
                       <div className="font-bold text-sm text-center break-words min-h-[2.5rem] flex items-center justify-center">{m.name}</div>
                       <div className="flex items-center justify-center gap-2 mt-2">
                         <button
                           type="button"
                           onClick={() => changeLeaseQuantity(selectedOwnMachines, m.name, -1, setSelectedOwnMachines)}
                           disabled={qty === 0}
                           className={`w-9 h-9 min-w-9 min-h-9 max-w-9 max-h-9 aspect-square p-0 flex-none inline-flex items-center justify-center rounded-xl leading-none font-black text-lg border ${qty === 0 ? 'bg-slate-100 text-slate-300 border-slate-200' : 'bg-white text-slate-700 border-slate-300'}`}
                         >−</button>
                         <div className={`w-9 h-9 min-w-9 px-1 rounded-xl flex items-center justify-center font-black text-sm ${qty > 0 ? 'bg-white text-slate-950' : 'bg-slate-100 text-slate-400'}`}>{qty}</div>
                         <button
                           type="button"
                           onClick={() => changeLeaseQuantity(selectedOwnMachines, m.name, 1, setSelectedOwnMachines)}
                           className="w-9 h-9 min-w-9 min-h-9 max-w-9 max-h-9 aspect-square p-0 flex-none inline-flex items-center justify-center rounded-xl leading-none font-black text-lg bg-emerald-600 text-white"
                         >＋</button>
                       </div>
                     </div>
                   );
                 })}
               </div>
             </div>

             <div className="space-y-2 pt-2">
               <label className="text-sm font-bold text-slate-950 block">【自社車両（乗用車・トラック）】</label>
               <div className="grid grid-cols-2 gap-3">
                 {(settings.vehicles || []).map((v:any) => {
                   const qty = getLeaseQuantity(selectedVehicles, v.name);
                   return (
                     <div key={v.name} className={`p-3 rounded-2xl border-2 transition ${qty > 0 ? 'bg-emerald-100 border-emerald-500 text-emerald-950' : 'bg-white text-slate-900 border-slate-300'}`}>
                       <div className="font-bold text-sm text-center break-words min-h-[2.5rem] flex items-center justify-center">{v.name}</div>
                       <div className="flex items-center justify-center gap-2 mt-2">
                         <button
                           type="button"
                           onClick={() => changeLeaseQuantity(selectedVehicles, v.name, -1, setSelectedVehicles)}
                           disabled={qty === 0}
                           className={`w-9 h-9 min-w-9 min-h-9 max-w-9 max-h-9 aspect-square p-0 flex-none inline-flex items-center justify-center rounded-xl leading-none font-black text-lg border ${qty === 0 ? 'bg-slate-100 text-slate-300 border-slate-200' : 'bg-white text-slate-700 border-slate-300'}`}
                         >−</button>
                         <div className={`w-9 h-9 min-w-9 px-1 rounded-xl flex items-center justify-center font-black text-sm ${qty > 0 ? 'bg-white text-slate-950' : 'bg-slate-100 text-slate-400'}`}>{qty}</div>
                         <button
                           type="button"
                           onClick={() => changeLeaseQuantity(selectedVehicles, v.name, 1, setSelectedVehicles)}
                           className="w-9 h-9 min-w-9 min-h-9 max-w-9 max-h-9 aspect-square p-0 flex-none inline-flex items-center justify-center rounded-xl leading-none font-black text-lg bg-emerald-600 text-white"
                         >＋</button>
                       </div>
                     </div>
                   );
                 })}
               </div>
             </div>

           </div>

           {/* 南大阪建機リース */}
           <div className="space-y-4 bg-blue-50/70 p-5 rounded-3xl border-2 border-blue-200">
             <div className="text-sm font-black text-blue-950 bg-blue-200 px-4 py-2 rounded-xl inline-block">
               🏢 南大阪建機（MOK）からのリース
             </div>

             <div className="space-y-1">
               <button 
                 type="button" 
                 onClick={() => setIsOpenHeavy(!isOpenHeavy)} 
                 className="w-full max-w-full text-left p-4 bg-white border-2 border-blue-200 rounded-2xl font-bold text-base text-slate-950 flex items-center justify-between gap-2 shadow-xs hover:bg-blue-50 transition box-border"
               >
                 <span className="min-w-0 flex-1 leading-snug">【重機を選択する】</span>
                 <span className="shrink-0 flex items-center gap-2">
                   {leaseHeavy.length > 0 && <span className="bg-blue-600 text-white text-xs px-2.5 py-1 rounded-full font-bold whitespace-nowrap">数量 {leaseHeavy.length}</span>}
                   <span className="text-sm font-bold text-slate-500 whitespace-nowrap">{isOpenHeavy ? '▲ 閉じる' : '▼ 開く'}</span>
                 </span>
               </button>
               {isOpenHeavy && (
                 <div className="grid grid-cols-2 gap-3 pt-2 animate-fadeIn">
                   {(settings.leaseHeavy || []).map((m:any) => {
                      const qty = getLeaseQuantity(leaseHeavy, m.name);
                      return (
                        <div key={m.name} className={`p-3 rounded-2xl border-2 transition ${qty > 0 ? 'bg-blue-100 border-blue-500 text-blue-950' : 'bg-white text-slate-900 border-slate-300'}`}>
                          <div className="font-bold text-sm text-center break-words min-h-[2.5rem] flex items-center justify-center">{m.name}</div>
                          <div className="flex items-center justify-center gap-2 mt-2">
                            <button type="button" onClick={() => changeLeaseQuantity(leaseHeavy, m.name, -1, setLeaseHeavy)} disabled={qty === 0}
                              className={`w-9 h-9 min-w-9 min-h-9 max-w-9 max-h-9 aspect-square p-0 flex-none inline-flex items-center justify-center rounded-xl leading-none font-black text-lg border ${qty === 0 ? 'bg-slate-100 text-slate-300 border-slate-200' : 'bg-white text-slate-700 border-slate-300'}`}>−</button>
                            <div className={`w-9 h-9 min-w-9 px-1 rounded-xl flex items-center justify-center font-black text-sm ${qty > 0 ? 'bg-white text-slate-950' : 'bg-slate-100 text-slate-400'}`}>{qty}</div>
                            <button type="button" onClick={() => changeLeaseQuantity(leaseHeavy, m.name, 1, setLeaseHeavy)}
                              className="w-9 h-9 min-w-9 min-h-9 max-w-9 max-h-9 aspect-square p-0 flex-none inline-flex items-center justify-center rounded-xl leading-none font-black text-lg bg-blue-600 text-white">＋</button>
                          </div>
                        </div>
                      );
                    })}
                 </div>
               )}
             </div>

             <div className="space-y-1 pt-2">
               <button 
                 type="button" 
                 onClick={() => setIsOpenAttach(!isOpenAttach)} 
                 className="w-full max-w-full text-left p-4 bg-white border-2 border-blue-200 rounded-2xl font-bold text-base text-slate-950 flex items-center justify-between gap-2 shadow-xs hover:bg-blue-50 transition box-border"
               >
                 <span className="min-w-0 flex-1 leading-snug">【アタッチメントを選択する】</span>
                 <span className="shrink-0 flex items-center gap-2">
                   {leaseAttach.length > 0 && <span className="bg-blue-600 text-white text-xs px-2.5 py-1 rounded-full font-bold whitespace-nowrap">数量 {leaseAttach.length}</span>}
                   <span className="text-sm font-bold text-slate-500 whitespace-nowrap">{isOpenAttach ? '▲ 閉じる' : '▼ 開く'}</span>
                 </span>
               </button>
               {isOpenAttach && (
                 <div className="grid grid-cols-2 gap-3 pt-2 animate-fadeIn">
                   {(settings.leaseAttach || []).map((m:any) => {
                      const qty = getLeaseQuantity(leaseAttach, m.name);
                      return (
                        <div key={m.name} className={`p-3 rounded-2xl border-2 transition ${qty > 0 ? 'bg-blue-100 border-blue-500 text-blue-950' : 'bg-white text-slate-900 border-slate-300'}`}>
                          <div className="font-bold text-sm text-center break-words min-h-[2.5rem] flex items-center justify-center">{m.name}</div>
                          <div className="flex items-center justify-center gap-2 mt-2">
                            <button type="button" onClick={() => changeLeaseQuantity(leaseAttach, m.name, -1, setLeaseAttach)} disabled={qty === 0}
                              className={`w-9 h-9 min-w-9 min-h-9 max-w-9 max-h-9 aspect-square p-0 flex-none inline-flex items-center justify-center rounded-xl leading-none font-black text-lg border ${qty === 0 ? 'bg-slate-100 text-slate-300 border-slate-200' : 'bg-white text-slate-700 border-slate-300'}`}>−</button>
                            <div className={`w-9 h-9 min-w-9 px-1 rounded-xl flex items-center justify-center font-black text-sm ${qty > 0 ? 'bg-white text-slate-950' : 'bg-slate-100 text-slate-400'}`}>{qty}</div>
                            <button type="button" onClick={() => changeLeaseQuantity(leaseAttach, m.name, 1, setLeaseAttach)}
                              className="w-9 h-9 min-w-9 min-h-9 max-w-9 max-h-9 aspect-square p-0 flex-none inline-flex items-center justify-center rounded-xl leading-none font-black text-lg bg-blue-600 text-white">＋</button>
                          </div>
                        </div>
                      );
                    })}
                 </div>
               )}
             </div>

             <div className="space-y-1 pt-2">
               <button 
                 type="button" 
                 onClick={() => setIsOpenOther(!isOpenOther)} 
                 className="w-full max-w-full text-left p-4 bg-white border-2 border-blue-200 rounded-2xl font-bold text-base text-slate-950 flex items-center justify-between gap-2 shadow-xs hover:bg-blue-50 transition box-border"
               >
                 <span className="min-w-0 flex-1 leading-snug">【その他の機械・機器を選択する】</span>
                 <span className="shrink-0 flex items-center gap-2">
                   {leaseOther.length > 0 && <span className="bg-blue-600 text-white text-xs px-2.5 py-1 rounded-full font-bold whitespace-nowrap">数量 {leaseOther.length}</span>}
                   <span className="text-sm font-bold text-slate-500 whitespace-nowrap">{isOpenOther ? '▲ 閉じる' : '▼ 開く'}</span>
                 </span>
               </button>
               {isOpenOther && (
                 <div className="grid grid-cols-2 gap-3 pt-2 animate-fadeIn">
                   {(settings.leaseOther || []).map((m:any) => {
                      const qty = getLeaseQuantity(leaseOther, m.name);
                      return (
                        <div key={m.name} className={`p-3 rounded-2xl border-2 transition ${qty > 0 ? 'bg-blue-100 border-blue-500 text-blue-950' : 'bg-white text-slate-900 border-slate-300'}`}>
                          <div className="font-bold text-sm text-center break-words min-h-[2.5rem] flex items-center justify-center">{m.name}</div>
                          <div className="flex items-center justify-center gap-2 mt-2">
                            <button type="button" onClick={() => changeLeaseQuantity(leaseOther, m.name, -1, setLeaseOther)} disabled={qty === 0}
                              className={`w-9 h-9 min-w-9 min-h-9 max-w-9 max-h-9 aspect-square p-0 flex-none inline-flex items-center justify-center rounded-xl leading-none font-black text-lg border ${qty === 0 ? 'bg-slate-100 text-slate-300 border-slate-200' : 'bg-white text-slate-700 border-slate-300'}`}>−</button>
                            <div className={`w-9 h-9 min-w-9 px-1 rounded-xl flex items-center justify-center font-black text-sm ${qty > 0 ? 'bg-white text-slate-950' : 'bg-slate-100 text-slate-400'}`}>{qty}</div>
                            <button type="button" onClick={() => changeLeaseQuantity(leaseOther, m.name, 1, setLeaseOther)}
                              className="w-9 h-9 min-w-9 min-h-9 max-w-9 max-h-9 aspect-square p-0 flex-none inline-flex items-center justify-center rounded-xl leading-none font-black text-lg bg-blue-600 text-white">＋</button>
                          </div>
                        </div>
                      );
                    })}
                 </div>
               )}
             </div>

             {/* ★ 南大阪建機その他の機械（自由入力） */}
             <div className="border-t border-blue-200 pt-4 space-y-3">
               <div className="flex justify-between items-center">
                 <span className="font-bold text-sm text-blue-950">📦 リスト以外の機械（自由入力）</span>
                 <button 
                   type="button" 
                   onClick={() => setOtherLeases([...otherLeases, {company: '南大阪建機', name: '', count: ''}])} 
                   className="bg-blue-600 text-white text-xs px-3 py-2 rounded-xl font-bold shadow hover:bg-blue-700 transition"
                 >
                   ＋ 追加する
                 </button>
               </div>

               {otherLeases.map((ol, index) => (
                 <div key={index} className="p-3 border-2 border-blue-200 rounded-2xl bg-white space-y-2">
                   <div className="grid grid-cols-3 gap-2">
                     <div className="col-span-2">
                       <label className="text-xs font-bold text-slate-700 block mb-1">リース内容（品名）</label>
                       <input 
                         type="text" 
                         placeholder="例: 発電機" 
                         className="w-full p-2.5 rounded-xl border-2 font-bold text-sm bg-white text-slate-950" 
                         value={ol.name} 
                         onChange={(e) => {
                           const updated = [...otherLeases];
                           updated[index].name = e.target.value;
                           setOtherLeases(updated);
                         }}
                       />
                     </div>
                     <div>
                       <label className="text-xs font-bold text-slate-700 block mb-1">個数</label>
                       <input 
                         type="number" 
                         placeholder="0" 
                         className="w-full p-2.5 rounded-xl border-2 font-bold text-sm bg-white text-slate-950" 
                         value={ol.count} 
                         onChange={(e) => {
                           const updated = [...otherLeases];
                           updated[index].count = e.target.value;
                           setOtherLeases(updated);
                         }}
                       />
                     </div>
                   </div>
                   <div className="text-right">
                     <button 
                       type="button" 
                       onClick={() => setOtherLeases(otherLeases.filter((_, i) => i !== index))} 
                       className="bg-red-100 text-red-700 px-3 py-1.5 rounded-xl font-bold text-xs hover:bg-red-200 transition"
                     >
                       削除
                     </button>
                   </div>
                 </div>
               ))}
             </div>

           </div>

           {/* 石川県出張用リース選択セクション（職長が「徳本」の場合のみ表示） */}
           {manager === '徳本' && (
             <div className="space-y-4 bg-indigo-50/70 p-5 rounded-3xl border-2 border-indigo-200 animate-fadeIn">
               <button
                 type="button"
                 onClick={() => setIsOpenIshikawa(!isOpenIshikawa)}
                 className="w-full text-left p-4 bg-indigo-600 text-white rounded-2xl font-black text-lg flex justify-between items-center shadow-md hover:bg-indigo-700 transition"
               >
                 <span>🗾 石川県出張用リース機器</span>
                 <span className="text-sm">{isOpenIshikawa ? '▲ 閉じる' : '▼ 開く'}</span>
               </button>

               {isOpenIshikawa && (
                 <div className="space-y-3 pt-2 animate-fadeIn">
                   <div>
                     <button
                       type="button"
                       onClick={() => setIsOpenIshikawaHeavy(!isOpenIshikawaHeavy)}
                       className="w-full text-left p-3 bg-white border-2 border-indigo-200 rounded-xl font-bold text-sm flex items-center justify-between gap-2"
                     >
                       <span className="min-w-0 flex-1 leading-snug">【（石川県）重機を選択】</span>
                       <span className="shrink-0 flex items-center gap-2">
                         {ishikawaLeaseHeavy.length > 0 && <span className="bg-indigo-600 text-white text-xs px-2 py-0.5 rounded-full whitespace-nowrap">数量 {ishikawaLeaseHeavy.length}</span>}
                         <span className="whitespace-nowrap">{isOpenIshikawaHeavy ? '▲ 閉じる' : '▼ 開く'}</span>
                       </span>
                     </button>
                     {isOpenIshikawaHeavy && (
                       <div className="grid grid-cols-2 gap-2 pt-2">
                         {(settings.ishikawaHeavy || []).map((m:any) => {
                      const qty = getLeaseQuantity(ishikawaLeaseHeavy, m.name);
                      return (
                        <div key={m.name} className={`p-3 rounded-2xl border-2 transition ${qty > 0 ? 'bg-indigo-100 border-indigo-500 text-indigo-950' : 'bg-white text-slate-900 border-slate-300'}`}>
                          <div className="font-bold text-sm text-center break-words min-h-[2.5rem] flex items-center justify-center">{m.name}</div>
                          <div className="flex items-center justify-center gap-2 mt-2">
                            <button type="button" onClick={() => changeLeaseQuantity(ishikawaLeaseHeavy, m.name, -1, setIshikawaLeaseHeavy)} disabled={qty === 0}
                              className={`w-9 h-9 min-w-9 min-h-9 max-w-9 max-h-9 aspect-square p-0 flex-none inline-flex items-center justify-center rounded-xl leading-none font-black text-lg border ${qty === 0 ? 'bg-slate-100 text-slate-300 border-slate-200' : 'bg-white text-slate-700 border-slate-300'}`}>−</button>
                            <div className={`w-9 h-9 min-w-9 px-1 rounded-xl flex items-center justify-center font-black text-sm ${qty > 0 ? 'bg-white text-slate-950' : 'bg-slate-100 text-slate-400'}`}>{qty}</div>
                            <button type="button" onClick={() => changeLeaseQuantity(ishikawaLeaseHeavy, m.name, 1, setIshikawaLeaseHeavy)}
                              className="w-9 h-9 min-w-9 min-h-9 max-w-9 max-h-9 aspect-square p-0 flex-none inline-flex items-center justify-center rounded-xl leading-none font-black text-lg bg-indigo-600 text-white">＋</button>
                          </div>
                        </div>
                      );
                    })}
                       </div>
                     )}
                   </div>

                   <div>
                     <button
                       type="button"
                       onClick={() => setIsOpenIshikawaAttach(!isOpenIshikawaAttach)}
                       className="w-full text-left p-3 bg-white border-2 border-indigo-200 rounded-xl font-bold text-sm flex items-center justify-between gap-2"
                     >
                       <span className="min-w-0 flex-1 leading-snug">【（石川県）アタッチメントを選択】</span>
                       <span className="shrink-0 flex items-center gap-2">
                         {ishikawaLeaseAttach.length > 0 && <span className="bg-indigo-600 text-white text-xs px-2 py-0.5 rounded-full whitespace-nowrap">数量 {ishikawaLeaseAttach.length}</span>}
                         <span className="whitespace-nowrap">{isOpenIshikawaAttach ? '▲ 閉じる' : '▼ 開く'}</span>
                       </span>
                     </button>
                     {isOpenIshikawaAttach && (
                       <div className="grid grid-cols-2 gap-2 pt-2">
                         {(settings.ishikawaAttach || []).map((m:any) => {
                      const qty = getLeaseQuantity(ishikawaLeaseAttach, m.name);
                      return (
                        <div key={m.name} className={`p-3 rounded-2xl border-2 transition ${qty > 0 ? 'bg-indigo-100 border-indigo-500 text-indigo-950' : 'bg-white text-slate-900 border-slate-300'}`}>
                          <div className="font-bold text-sm text-center break-words min-h-[2.5rem] flex items-center justify-center">{m.name}</div>
                          <div className="flex items-center justify-center gap-2 mt-2">
                            <button type="button" onClick={() => changeLeaseQuantity(ishikawaLeaseAttach, m.name, -1, setIshikawaLeaseAttach)} disabled={qty === 0}
                              className={`w-9 h-9 min-w-9 min-h-9 max-w-9 max-h-9 aspect-square p-0 flex-none inline-flex items-center justify-center rounded-xl leading-none font-black text-lg border ${qty === 0 ? 'bg-slate-100 text-slate-300 border-slate-200' : 'bg-white text-slate-700 border-slate-300'}`}>−</button>
                            <div className={`w-9 h-9 min-w-9 px-1 rounded-xl flex items-center justify-center font-black text-sm ${qty > 0 ? 'bg-white text-slate-950' : 'bg-slate-100 text-slate-400'}`}>{qty}</div>
                            <button type="button" onClick={() => changeLeaseQuantity(ishikawaLeaseAttach, m.name, 1, setIshikawaLeaseAttach)}
                              className="w-9 h-9 min-w-9 min-h-9 max-w-9 max-h-9 aspect-square p-0 flex-none inline-flex items-center justify-center rounded-xl leading-none font-black text-lg bg-indigo-600 text-white">＋</button>
                          </div>
                        </div>
                      );
                    })}
                       </div>
                     )}
                   </div>

                   <div>
                     <button
                       type="button"
                       onClick={() => setIsOpenIshikawaOther(!isOpenIshikawaOther)}
                       className="w-full text-left p-3 bg-white border-2 border-indigo-200 rounded-xl font-bold text-sm flex items-center justify-between gap-2"
                     >
                       <span className="min-w-0 flex-1 leading-snug">【（石川県）その他機械・機器を選択】</span>
                       <span className="shrink-0 flex items-center gap-2">
                         {ishikawaLeaseOther.length > 0 && <span className="bg-indigo-600 text-white text-xs px-2 py-0.5 rounded-full whitespace-nowrap">数量 {ishikawaLeaseOther.length}</span>}
                         <span className="whitespace-nowrap">{isOpenIshikawaOther ? '▲ 閉じる' : '▼ 開く'}</span>
                       </span>
                     </button>
                     {isOpenIshikawaOther && (
                       <div className="grid grid-cols-2 gap-2 pt-2">
                         {(settings.ishikawaOther || []).map((m:any) => {
                      const qty = getLeaseQuantity(ishikawaLeaseOther, m.name);
                      return (
                        <div key={m.name} className={`p-3 rounded-2xl border-2 transition ${qty > 0 ? 'bg-indigo-100 border-indigo-500 text-indigo-950' : 'bg-white text-slate-900 border-slate-300'}`}>
                          <div className="font-bold text-sm text-center break-words min-h-[2.5rem] flex items-center justify-center">{m.name}</div>
                          <div className="flex items-center justify-center gap-2 mt-2">
                            <button type="button" onClick={() => changeLeaseQuantity(ishikawaLeaseOther, m.name, -1, setIshikawaLeaseOther)} disabled={qty === 0}
                              className={`w-9 h-9 min-w-9 min-h-9 max-w-9 max-h-9 aspect-square p-0 flex-none inline-flex items-center justify-center rounded-xl leading-none font-black text-lg border ${qty === 0 ? 'bg-slate-100 text-slate-300 border-slate-200' : 'bg-white text-slate-700 border-slate-300'}`}>−</button>
                            <div className={`w-9 h-9 min-w-9 px-1 rounded-xl flex items-center justify-center font-black text-sm ${qty > 0 ? 'bg-white text-slate-950' : 'bg-slate-100 text-slate-400'}`}>{qty}</div>
                            <button type="button" onClick={() => changeLeaseQuantity(ishikawaLeaseOther, m.name, 1, setIshikawaLeaseOther)}
                              className="w-9 h-9 min-w-9 min-h-9 max-w-9 max-h-9 aspect-square p-0 flex-none inline-flex items-center justify-center rounded-xl leading-none font-black text-lg bg-indigo-600 text-white">＋</button>
                          </div>
                        </div>
                      );
                    })}
                       </div>
                     )}
                   </div>

                   {/* ★ 石川県用その他の機械（自由入力） */}
                   <div className="border-t border-indigo-200 pt-4 space-y-3">
                     <div className="flex justify-between items-center">
                       <span className="font-bold text-sm text-indigo-950">📦 リスト以外の機械（自由入力）</span>
                       <button 
                         type="button" 
                         onClick={() => setIshikawaCustomMachines([...ishikawaCustomMachines, {name: '', count: ''}])} 
                         className="bg-indigo-600 text-white text-xs px-3 py-2 rounded-xl font-bold shadow hover:bg-indigo-700 transition"
                       >
                         ＋ 追加する
                       </button>
                     </div>

                     {ishikawaCustomMachines.map((ic, index) => (
                       <div key={index} className="p-3 border-2 border-indigo-200 rounded-2xl bg-white space-y-2">
                         <div className="grid grid-cols-3 gap-2">
                           <div className="col-span-2">
                             <label className="text-xs font-bold text-slate-700 block mb-1">リース内容（品名）</label>
                             <input 
                               type="text" 
                               placeholder="例: 発電機" 
                               className="w-full p-2.5 rounded-xl border-2 font-bold text-sm bg-white text-slate-950" 
                               value={ic.name} 
                               onChange={(e) => {
                                 const updated = [...ishikawaCustomMachines];
                                 updated[index].name = e.target.value;
                                 setIshikawaCustomMachines(updated);
                               }}
                             />
                           </div>
                           <div>
                             <label className="text-xs font-bold text-slate-700 block mb-1">個数</label>
                             <input 
                               type="number" 
                               placeholder="0" 
                               className="w-full p-2.5 rounded-xl border-2 font-bold text-sm bg-white text-slate-950" 
                               value={ic.count} 
                               onChange={(e) => {
                                 const updated = [...ishikawaCustomMachines];
                                 updated[index].count = e.target.value;
                                 setIshikawaCustomMachines(updated);
                               }}
                             />
                           </div>
                         </div>
                         <div className="text-right">
                           <button 
                             type="button" 
                             onClick={() => setIshikawaCustomMachines(ishikawaCustomMachines.filter((_, i) => i !== index))} 
                             className="bg-red-100 text-red-700 px-3 py-1.5 rounded-xl font-bold text-xs hover:bg-red-200 transition"
                           >
                             削除
                           </button>
                         </div>
                       </div>
                     ))}
                   </div>

                 </div>
               )}
             </div>
           )}

        </div>

        {/* 4. 燃料・経費 */}
        <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-4">
           <div className="border-b pb-3">
             <span className="font-black text-lg text-orange-600">⛽ 4. 燃料・経費</span>
           </div>

           <div>
             <label className="text-base font-bold text-slate-950 block mb-2">【軽油 (L)】</label>
             <input type="number" placeholder="0" value={fuel} onChange={e=>setFuel(e.target.value)} className="w-full max-w-full min-w-0 p-4 border-2 rounded-2xl font-bold text-xl bg-white text-slate-950 box-border block" />
           </div>

           <div>
             <label className="text-base font-bold text-slate-950 block mb-2">【レギュラー 購入分 (円)】</label>
             <input type="number" placeholder="0" value={regularPrice} onChange={e=>setRegularPrice(e.target.value)} className="w-full max-w-full min-w-0 p-4 border-2 rounded-2xl font-bold text-xl bg-white text-slate-950 box-border block" />
           </div>

           {/* ★ 職長が「徳本」の場合のみ表示する「宇野気石油」の燃料入力枠 */}
           {manager === '徳本' && (
             <div className="bg-indigo-50/70 p-4 rounded-2xl border-2 border-indigo-200 space-y-4 animate-fadeIn">
               <div className="text-sm font-black text-indigo-950 bg-indigo-200 px-3 py-1.5 rounded-lg inline-block">
                 ⛽ 宇野気石油 分
               </div>
               <div>
                 <label className="text-sm font-bold text-slate-950 block mb-1">【宇野気石油 軽油 (L)】</label>
                 <input type="number" placeholder="0" value={unokeFuel} onChange={e=>setUnokeFuel(e.target.value)} className="w-full max-w-full min-w-0 p-3.5 border-2 rounded-xl font-bold text-lg bg-white text-slate-950 box-border block" />
               </div>
               <div>
                 <label className="text-sm font-bold text-slate-950 block mb-1">【宇野気石油 レギュラー (L)】</label>
                 <input type="number" placeholder="0" value={unokeRegular} onChange={e=>setUnokeRegular(e.target.value)} className="w-full max-w-full min-w-0 p-3.5 border-2 rounded-xl font-bold text-lg bg-white text-slate-950 box-border block" />
               </div>
             </div>
           )}

           <div>
             <label className="text-base font-bold text-slate-950 block mb-2">【高速代・ETC (円)】</label>
             <input type="number" placeholder="0" value={etcPrice} onChange={e=>setEtcPrice(e.target.value)} className="w-full max-w-full min-w-0 p-4 border-2 rounded-2xl font-bold text-xl bg-white text-slate-950 box-border block" />
           </div>

           <div>
             <label className="text-base font-bold text-slate-950 block mb-2">【駐車場代 (円)】</label>
             <input type="number" placeholder="0" value={parkingPrice} onChange={e=>setParkingPrice(e.target.value)} className="w-full max-w-full min-w-0 p-4 border-2 rounded-2xl font-bold text-xl bg-white text-slate-950 box-border block" />
           </div>
        </div>

        {/* 5. 処分場への搬出 */}
        <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-4">
           <div className="flex justify-between items-center border-b pb-3">
             <span className="font-black text-lg text-orange-600">🗑️ 5. 処分場への搬出</span>
             <button type="button" onClick={() => setDisposals([...disposals, {location: '', item: '', quantity: '', unit: 't'}])} className="bg-emerald-600 text-white text-sm px-4 py-2.5 rounded-xl font-bold shadow hover:bg-emerald-700 transition">＋ 追加する</button>
           </div>

           {disposals.length === 0 && (
             <p className="text-sm font-bold text-slate-400 text-center py-3">「追加する」ボタンを押して選択してください</p>
           )}

           {disposals.map((entry, index) => {
             const availableItems = (settings.disposalLocations || []).filter((d:any) => d.location === entry.location);

             return (
               <div key={index} className="p-4 border-2 rounded-2xl bg-slate-50 space-y-3">
                 <div>
                   <label className="text-sm font-bold text-slate-950 block mb-1">① 処分場を選択</label>
                   <select className="w-full max-w-full min-w-0 p-3.5 rounded-xl border-2 font-bold text-base bg-white text-slate-950 box-border block" value={entry.location} onChange={(e) => {
                     const updated = [...disposals];
                     updated[index] = { location: e.target.value, item: '', quantity: entry.quantity, unit: 't' };
                     setDisposals(updated);
                   }}>
                     <option value="">処分場を選択...</option>
                     {uniqueDisposalLocations.map((loc:any, idx:number)=><option key={idx} value={loc}>{loc}</option>)}
                   </select>
                 </div>

                 {entry.location && (
                   <div>
                     <label className="text-sm font-bold text-slate-950 block mb-1">② 品目を選択</label>
                     <div className="grid grid-cols-2 gap-2 pt-1">
                       {availableItems.map((d:any, idx:number) => {
                         const isSelected = entry.item === d.item;
                         return (
                           <button
                             type="button"
                             key={idx}
                             onClick={() => {
                               const updated = [...disposals];
                               updated[index] = { ...updated[index], item: d.item, unit: d.unit || 't' };
                               setDisposals(updated);
                             }}
                             className={`p-3 rounded-xl font-bold border-2 text-sm text-center transition ${isSelected ? 'bg-orange-600 text-white border-orange-600 shadow-sm' : 'bg-white text-slate-900 border-slate-300'}`}
                           >
                             {d.item}
                           </button>
                         );
                       })}
                     </div>
                   </div>
                 )}

                 <div className="flex items-end gap-3 pt-2">
                   <div className="flex-1 min-w-0">
                     <label className="text-sm font-bold text-slate-950 block mb-1">数量</label>
                     <input type="number" placeholder="0" className="w-full max-w-full min-w-0 p-3.5 rounded-xl border-2 font-bold text-xl bg-white text-slate-950 box-border block" value={entry.quantity} onChange={(e)=>{
                       const updated = [...disposals]; updated[index].quantity = e.target.value; setDisposals(updated);
                     }}/>
                   </div>
                   <div className="pb-3 font-black text-base text-slate-800 shrink-0">{entry.unit || 't'}</div>
                   <button type="button" onClick={() => setDisposals(disposals.filter((_,i)=>i!==index))} className="bg-red-100 text-red-700 px-4 py-3.5 rounded-xl font-bold text-sm hover:bg-red-200 transition shrink-0">削除</button>
                 </div>
               </div>
             );
           })}
        </div>

        {/* 6. スクラップの搬出 */}
        <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-4">
           <div className="flex justify-between items-center border-b pb-3">
             <span className="font-black text-lg text-orange-600">♻️ 6. スクラップの搬出</span>
             <button type="button" onClick={() => setScraps([...scraps, {location: '', item: '', quantity: '', unit: 'kg'}])} className="bg-emerald-600 text-white text-sm px-4 py-2.5 rounded-xl font-bold shadow hover:bg-emerald-700 transition">＋ 追加する</button>
           </div>

           {scraps.length === 0 && (
             <p className="text-sm font-bold text-slate-400 text-center py-3">「追加する」ボタンを押して選択してください</p>
           )}

           {scraps.map((entry, index) => {
             const availableItems = (settings.scrapLocations || []).filter((s:any) => s.location === entry.location);

             return (
               <div key={index} className="p-4 border-2 rounded-2xl bg-slate-50 space-y-3">
                 <div>
                   <label className="text-sm font-bold text-slate-950 block mb-1">① スクラップ場を選択</label>
                   <select className="w-full max-w-full min-w-0 p-3.5 rounded-xl border-2 font-bold text-base bg-white text-slate-950 box-border block" value={entry.location} onChange={(e) => {
                     const updated = [...scraps];
                     updated[index] = { location: e.target.value, item: '', quantity: entry.quantity, unit: 'kg' };
                     setScraps(updated);
                   }}>
                     <option value="">スクラップ場を選択...</option>
                     {uniqueScrapLocations.map((loc:any, idx:number)=><option key={idx} value={loc}>{loc}</option>)}
                   </select>
                 </div>

                 {entry.location && (
                   <div>
                     <label className="text-sm font-bold text-slate-950 block mb-1">② 品目を選択</label>
                     <div className="grid grid-cols-2 gap-2 pt-1">
                       {availableItems.map((s:any, idx:number) => {
                         const isSelected = entry.item === s.item;
                         return (
                           <button
                             type="button"
                             key={idx}
                             onClick={() => {
                               const updated = [...scraps];
                               updated[index] = { ...updated[index], item: s.item, unit: s.unit || 'kg' };
                               setScraps(updated);
                             }}
                             className={`p-3 rounded-xl font-bold border-2 text-sm text-center transition ${isSelected ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'bg-white text-slate-900 border-slate-300'}`}
                           >
                             {s.item}
                           </button>
                         );
                       })}
                     </div>
                   </div>
                 )}

                 <div className="flex items-end gap-3 pt-2">
                   <div className="flex-1 min-w-0">
                     <label className="text-sm font-bold text-slate-950 block mb-1">数量</label>
                     <input type="number" placeholder="0" className="w-full max-w-full min-w-0 p-3.5 rounded-xl border-2 font-bold text-xl bg-white text-slate-950 box-border block" value={entry.quantity} onChange={(e)=>{
                       const updated = [...scraps]; updated[index].quantity = e.target.value; setScraps(updated);
                     }}/>
                   </div>
                   <div className="pb-3 font-black text-base text-slate-800 shrink-0">{entry.unit || 'kg'}</div>
                   <button type="button" onClick={() => setScraps(scraps.filter((_,i)=>i!==index))} className="bg-red-100 text-red-700 px-4 py-3.5 rounded-xl font-bold text-sm hover:bg-red-200 transition shrink-0">削除</button>
                 </div>
               </div>
             );
           })}
        </div>

        {/* その他 雑費・消耗品等 */}
        <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-4">
           <div className="font-black text-lg text-slate-950 border-b pb-3">📦 その他 雑費・消耗品等</div>
           <div>
             <label className="text-base font-bold text-slate-950 block mb-2">【品名・内容】</label>
             <input type="text" placeholder="例: コーナン" value={otherItem} onChange={e=>setOtherItem(e.target.value)} className="w-full max-w-full min-w-0 p-4 border-2 rounded-2xl font-bold text-lg bg-white text-slate-950 box-border block" />
           </div>
           <div>
             <label className="text-base font-bold text-slate-950 block mb-2">【金額 (円)】</label>
             <input type="number" placeholder="0" value={otherPrice} onChange={e=>setOtherPrice(e.target.value)} className="w-full max-w-full min-w-0 p-4 border-2 rounded-2xl font-bold text-xl bg-white text-slate-950 box-border block" />
           </div>
        </div>

        {/* 7. 本日の作業内容 */}
        <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-4">
           <div className="border-b pb-3">
             <span className="font-black text-lg text-orange-600">📝 7. 本日の作業内容</span>
           </div>
           <textarea placeholder="作業内容を入力してください" value={description} onChange={e=>setDescription(e.target.value)} className="w-full max-w-full min-w-0 p-4 rounded-2xl border-2 h-40 font-bold text-lg outline-none bg-white text-slate-950 box-border block" />
        </div>

        <button type="submit" className="w-full bg-[#E56312] text-white font-black text-2xl py-5 rounded-3xl shadow-xl hover:bg-orange-700 transition">
          📩 日報を送信する
        </button>

      </form>
    </div>
  );
}
