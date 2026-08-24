'use client';
import { useState, useEffect } from 'react';

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [viewerPassword, setViewerPassword] = useState('');
  const [isAuthed, setIsAuthed] = useState(false);
  const [authRole, setAuthRole] = useState<'admin' | 'viewer' | null>(null);

  const [reports, setReports] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [isLoading, setIsLoading] = useState(false);
  
  const [modalLocation, setModalLocation] = useState<string | null>(null);
  const [filterLocation, setFilterLocation] = useState('');
  const [form, setForm] = useState<any>({});

  // 編集用ステート
  const [editingReport, setEditingReport] = useState<any | null>(null);

  // 編集完了ポップアップ用ステート
  const [showSaveToast, setShowSaveToast] = useState(false);

  // 処分費詳細モーダル用ステート
  const [showDisposalModal, setShowDisposalModal] = useState(false);

  // 経費内訳明細の手動編集用オーバーライドステート
  const [costOverrides, setCostOverrides] = useState<any>({});

  // 各項目の編集モードを管理するステート
  const [editingCostFields, setEditingCostFields] = useState<any>({});

  // 管理エリアの開閉ステート（PCでのみ開く・スマホでは通常閉じ気味）
  const [showAdminSection, setShowAdminSection] = useState(false);

  // 出勤確認表の年月選択ステート
  const [calendarYearMonth, setCalendarYearMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [resR, resS] = await Promise.all([fetch('/api/reports'), fetch('/api/settings')]);
      if (resR.ok) {
        const rData = await resR.json();
        setReports(rData);
        if (rData && rData.length > 0) {
          const dates = rData.map((r: any) => r.date).filter(Boolean).sort();
          const latestDate = dates[dates.length - 1];
          if (latestDate) {
            const normalized = latestDate.replace(/\//g, '-');
            const parts = normalized.split('-');
            if (parts.length >= 2) {
              setCalendarYearMonth(`${parts[0]}-${parts[1].padStart(2, '0')}`);
            }
          }
        }
      }
      if (resS.ok) {
        const sData = await resS.json();
        if (sData && Object.keys(sData).length > 0) {
          setSettings(sData);
          if (sData.costOverrides) setCostOverrides(sData.costOverrides);
        }
      }
    } catch (e) { 
      console.error(e); 
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { if (isAuthed) fetchData(); }, [isAuthed]);

  const handleLogin = (role: 'admin' | 'viewer') => {
    const targetPassword = role === 'viewer' ? viewerPassword : password;
    if (targetPassword === '19770323') {
      setIsAuthed(true);
      setAuthRole(role);
      if (role === 'admin') setShowAdminSection(true);
    } else {
      alert('パスワードが間違っています。');
    }
  };

  const saveMaster = async (key: string, customList?: any[]) => {
    if (authRole === 'viewer') {
      alert('閲覧専用モードのため変更できません。');
      return;
    }
    if (isLoading) {
      alert('データを読み込み中です。しばらくお待ちください。');
      return;
    }
    try {
      const targetList = customList !== undefined ? customList : settings[key];
      const newData = { ...settings, [key]: targetList };
      
      const res = await fetch('/api/settings', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(newData) 
      });
      
      if (res.ok) {
        setSettings(newData);
        alert('保存しました！');
      } else {
        alert('保存に失敗しました。');
      }
    } catch (e) {
      console.error(e);
      alert('通信エラーが発生しました。');
    }
  };

  const addMaster = (key: string, newItem: any, formKeys: string[]) => {
    if (authRole === 'viewer') return;
    const updatedList = [...(settings[key] || []), newItem];
    setSettings({ ...settings, [key]: updatedList });
    const cleared = { ...form };
    formKeys.forEach(k => cleared[k] = '');
    setForm(cleared);
  };

  const deleteMaster = (key: string, idx: number) => {
    if (authRole === 'viewer') return;
    const updatedList = (settings[key] || []).filter((_:any, i:number) => i !== idx);
    setSettings({ ...settings, [key]: updatedList });
  };

  const moveMasterItem = (key: string, idx: number, direction: 'up' | 'down') => {
    if (authRole === 'viewer') return;
    const list = [...(settings[key] || [])];
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;
    const temp = list[idx];
    list[idx] = list[targetIdx];
    list[targetIdx] = temp;
    setSettings({ ...settings, [key]: list });
  };

  const updateItemPrice = (key: string, idx: number, field: string, value: any) => {
    if (authRole === 'viewer') return;
    const list = [...(settings[key] || [])];
    list[idx] = { ...list[idx], [field]: field === 'company' || field === 'task' || field === 'item' || field === 'unit' || field === 'location' ? value : (Number(value) || 0) };
    setSettings({ ...settings, [key]: list });
  };

  const handleCostOverrideChange = async (locName: string, field: string, val: string) => {
    if (authRole === 'viewer') return;
    const newOverrides = {
      ...costOverrides,
      [locName]: {
        ...(costOverrides[locName] || {}),
        [field]: val
      }
    };
    setCostOverrides(newOverrides);
    const newData = { ...settings, costOverrides: newOverrides };
    await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newData) });
  };

  const toggleCostFieldEdit = (locName: string, field: string) => {
    if (authRole === 'viewer') {
      alert('閲覧専用モードのため編集できません。');
      return;
    }
    const current = editingCostFields[locName] || {};
    setEditingCostFields({
      ...editingCostFields,
      [locName]: {
        ...current,
        [field]: !current[field]
      }
    });
  };

  const handleDeleteReport = async (report: any, index: number) => {
    if (authRole === 'viewer') return;
    if (!confirm('この日報データを削除してもよろしいですか？')) return;
    const targetId = report.id || report._id || report.reportId;
    await fetch('/api/reports', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: targetId, index })
    });
    fetchData();
  };

  const handleUpdateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authRole === 'viewer') return;
    const payload = {
      ...editingReport,
      id: editingReport.id || editingReport._id
    };
    const res = await fetch('/api/reports', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      setEditingReport(null);
      fetchData();
      // 編集完了ポップアップを表示して2秒後に消す
      setShowSaveToast(true);
      setTimeout(() => setShowSaveToast(false), 2500);
    } else {
      alert('更新に失敗しました。');
    }
  };

  // --- 計算ロジック ---
  const calculateReportDailyCost = (r: any) => {
    let lCost = 0;
    if (r.manager) lCost += ((settings.managers || []).find((x:any) => x.name === r.manager)?.price || 0);
    (r.workers || []).forEach((w: string) => lCost += ((settings.workers || []).find((x:any) => x.name === w)?.price || 0));

    let subCost = 0;
    (r.subcontractors || []).forEach((sub: any) => {
      const subMaster = (settings.subcontractors || []).find((x:any) => x.company === sub.company && x.task === sub.task);
      const unitP = subMaster?.price || 0;
      subCost += (Number(sub.count || 0) * unitP);
    });

    let leaseC = 0;
    (r.machines || []).forEach((m: string) => leaseC += ((settings.leases || []).find((x:any) => x.name === m)?.price || 0));
    (r.leaseHeavy || []).forEach((m: string) => leaseC += ((settings.leaseHeavy || []).find((x:any) => x.name === m)?.price || 0));
    (r.leaseAttach || []).forEach((m: string) => leaseC += ((settings.leaseAttach || []).find((x:any) => x.name === m)?.price || 0));
    (r.leaseOther || []).forEach((m: string) => leaseC += ((settings.leaseOther || []).find((x:any) => x.name === m)?.price || 0));

    let otherLeaseC = 0;
    (r.otherLeases || []).forEach((ol: any) => {
      otherLeaseC += Number(ol.price || 0);
    });

    let ownMachineC = 0;
    (r.ownMachines || []).forEach((m: string) => ownMachineC += ((settings.companyMachines || []).find((x:any) => x.name === m)?.price || 0));

    let vehicleC = 0;
    (r.vehicles || []).forEach((v: string) => vehicleC += ((settings.vehicles || []).find((x:any) => x.name === v)?.price || 0));

    let dispC = 0;
    const disposalBreakdown: {[locName: string]: number} = {};
    (r.disposals || []).forEach((d: any) => {
      const uPrice = (settings.disposalLocations || []).find((s: any) => s.location === d.location && s.item === d.item)?.price || 0;
      const subT = Number(d.quantity || 0) * uPrice;
      dispC += subT;
      const locKey = d.location || 'その他処分場';
      disposalBreakdown[locKey] = (disposalBreakdown[locKey] || 0) + subT;
    });

    let scrapC = 0;
    const scrapBreakdown: {[key: string]: number} = {};
    (r.scraps || []).forEach((sc: any) => {
      const uPrice = (settings.scrapLocations || []).find((s: any) => s.location === sc.location && s.item === sc.item)?.price || 0;
      const subT = Number(sc.quantity || 0) * uPrice;
      scrapC += subT;
      const scrapKey = `${sc.location || 'その他スクラップ場'} (${sc.item || '品目未指定'})`;
      scrapBreakdown[scrapKey] = (scrapBreakdown[scrapKey] || 0) + subT;
    });

    const fC = Number(r.fuel || 0);
    const eC = Number(r.etcPrice || 0);
    const pC = Number(r.parkingPrice || 0);
    const oC = Number(r.otherPrice || 0);
    const totalDailyCost = lCost + subCost + leaseC + otherLeaseC + ownMachineC + vehicleC + dispC + fC + eC + pC + oC;

    return { lCost, subCost, leaseC, otherLeaseC, ownMachineC, vehicleC, dispC, disposalBreakdown, fC, eC, pC, oC, scrapC, scrapBreakdown, totalDailyCost };
  };

  const calculateCosts = (locName: string) => {
    const locMapped = reports.filter(r => r.location === locName);
    let calcLabor = 0, calcSub = 0, calcLease = 0, calcOtherLease = 0, calcOwnMachine = 0, calcVehicle = 0, calcDisp = 0;
    let calcFuel = 0, calcEtc = 0, calcParking = 0, calcOther = 0, scrapTotal = 0;
    const aggregatedDisposalBreakdown: {[loc: string]: number} = {};
    const aggregatedScrapBreakdown: {[key: string]: number} = {};
    
    locMapped.forEach(r => {
      const dc = calculateReportDailyCost(r);
      calcLabor += dc.lCost; 
      calcSub += dc.subCost; 
      calcLease += dc.leaseC; 
      calcOtherLease += dc.otherLeaseC;
      calcOwnMachine += dc.ownMachineC;
      calcVehicle += dc.vehicleC;
      calcDisp += dc.dispC;

      Object.entries(dc.disposalBreakdown).forEach(([loc, val]) => {
        aggregatedDisposalBreakdown[loc] = (aggregatedDisposalBreakdown[loc] || 0) + val;
      });

      Object.entries(dc.scrapBreakdown).forEach(([key, val]) => {
        aggregatedScrapBreakdown[key] = (aggregatedScrapBreakdown[key] || 0) + val;
      });

      calcFuel += dc.fC; calcEtc += dc.eC; calcParking += dc.pC; calcOther += dc.oC; scrapTotal += dc.scrapC;
    });

    const ov = costOverrides[locName] || {};
    const laborCost = ov.labor !== '' && ov.labor !== undefined ? Number(ov.labor) : calcLabor;
    const subCostTotal = ov.sub !== '' && ov.sub !== undefined ? Number(ov.sub) : calcSub;
    const leaseCost = ov.lease !== '' && ov.lease !== undefined ? Number(ov.lease) : calcLease;
    const otherLeaseCost = ov.otherLease !== '' && ov.otherLease !== undefined ? Number(ov.otherLease) : calcOtherLease;
    const ownMachineCost = ov.ownMachine !== '' && ov.ownMachine !== undefined ? Number(ov.ownMachine) : calcOwnMachine;
    const vehicleCost = ov.vehicle !== '' && ov.vehicle !== undefined ? Number(ov.vehicle) : calcVehicle;
    const disposalCost = ov.disposal !== '' && ov.disposal !== undefined ? Number(ov.disposal) : calcDisp;
    const fuelCost = ov.fuel !== '' && ov.fuel !== undefined ? Number(ov.fuel) : calcFuel;
    const etcCost = ov.etc !== '' && ov.etc !== undefined ? Number(ov.etc) : calcEtc;
    const parkingCost = ov.parking !== '' && ov.parking !== undefined ? Number(ov.parking) : calcParking;
    const otherCost = ov.other !== '' && ov.other !== undefined ? Number(ov.other) : calcOther;

    const sumOverrideCost = laborCost + subCostTotal + leaseCost + otherLeaseCost + ownMachineCost + vehicleCost + disposalCost + fuelCost + etcCost + parkingCost + otherCost;
    const baseContractPrice = (settings.locations || []).find((l: any) => (typeof l === 'string' ? l : l.name) === locName)?.price || 0;
    const profit = (baseContractPrice - sumOverrideCost) + scrapTotal;

    return { 
      days: locMapped.length, 
      laborCost, 
      subCostTotal, 
      leaseCost, 
      otherLeaseCost,
      ownMachineCost,
      vehicleCost,
      disposalCost, 
      aggregatedDisposalBreakdown,
      fuelCost, 
      etcCost, 
      parkingCost, 
      otherCost, 
      scrapTotal,
      aggregatedScrapBreakdown,
      total: sumOverrideCost, 
      contractPrice: baseContractPrice, 
      profit, 
      reportsWithIndex: locMapped 
    };
  };

  const downloadLocationCSV = (locName: string) => {
    const locReports = reports.filter(r => r.location === locName);
    const headers = ["日付", "現場名", "責任者", "作業者", "外注", "リース(重機等)", "その他リース", "自社重機", "車両", "軽油L", "ETC", "駐車場代", "雑費名", "雑費金額", "作業内容"];
    const rows = locReports.map(r => [
      r.date, r.location, r.manager, (r.workers || []).join('/'), 
      (r.subcontractors || []).map((s:any)=>`${s.company}(${s.task}:${s.count}人)`).join('/'),
      [...(r.machines || []), ...(r.leaseHeavy || []), ...(r.leaseAttach || []), ...(r.leaseOther || [])].join('/'),
      (r.otherLeases || []).map((ol:any)=>`${ol.name}(¥${ol.price})`).join('/'),
      (r.ownMachines || []).join('/'),
      (r.vehicles || []).join('/'), 
      r.fuel || 0, r.etcPrice || 0, r.parkingPrice || 0,
      r.otherItem || '', r.otherPrice || 0, `"${(r.workDescription || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `${locName}_日報データ.csv`; link.click();
  };

  // --- カレンダー（出勤確認表）用ヘルパー関数 ---
  const getDaysInMonth = (yearMonthStr: string) => {
    const [y, m] = yearMonthStr.split('-').map(Number);
    if (!y || !m) return [];
    const date = new Date(y, m - 1, 1);
    const days = [];
    while (date.getMonth() === m - 1) {
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      days.push(`${yyyy}-${mm}-${dd}`);
      date.setDate(date.getDate() + 1);
    }
    return days;
  };

  const normalizeDateStr = (dateStr: string) => {
    if (!dateStr) return '';
    const cleaned = dateStr.replace(/\//g, '-');
    const parts = cleaned.split('-');
    if (parts.length === 3) {
      const y = parts[0];
      const m = parts[1].padStart(2, '0');
      const d = parts[2].padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    return cleaned;
  };

  if (!isAuthed) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4 font-sans">
      <div className="bg-white p-8 md:p-12 rounded-3xl shadow-xl space-y-8 w-full max-w-lg border border-slate-100 text-center">
        <div className="space-y-3">
          <div className="text-5xl">🔒</div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-800">音声日報システム</h1>
          <p className="text-sm md:text-base text-slate-400 font-medium">株式会社大和</p>
        </div>
        
        <div className="space-y-6 pt-2">
          {/* 社長モード（閲覧専用）用ログインエリア */}
          <div className="bg-orange-50/70 p-6 rounded-3xl border border-orange-100 space-y-4 text-left shadow-xs">
            <input 
              type="password" 
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="パスワードを入力" 
              className="w-full p-4 border border-orange-200 rounded-2xl text-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition text-center font-bold" 
              value={viewerPassword}
              onChange={e => setViewerPassword(e.target.value)} 
              onKeyDown={e => e.key === 'Enter' && handleLogin('viewer')}
            />
            <button 
              onClick={() => handleLogin('viewer')} 
              className="w-full bg-orange-600 hover:bg-orange-700 text-white py-4 rounded-2xl font-black text-base md:text-lg shadow-md shadow-orange-500/20 transition flex items-center justify-center gap-2"
            >
              👑 社長モードでログイン
            </button>
          </div>
          
          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink mx-4 text-slate-400 text-sm font-medium">または管理者</span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          {/* PC用の管理者ログインエリア */}
          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200/80 space-y-4 text-left">
            <input 
              type="password" 
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="管理者パスワード" 
              className="w-full p-4 border border-slate-200 rounded-2xl text-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 transition text-center font-bold" 
              value={password}
              onChange={e => setPassword(e.target.value)} 
              onKeyDown={e => e.key === 'Enter' && handleLogin('admin')}
            />
            <button 
              onClick={() => handleLogin('admin')} 
              className="w-full bg-slate-700 hover:bg-slate-800 text-white py-4 rounded-2xl font-black text-base md:text-lg transition shadow-md"
            >
              管理者としてログイン
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 font-sans text-xl font-bold text-slate-600">
        🔄 データを読み込んでいます...
      </div>
    );
  }

  const modalData = modalLocation ? calculateCosts(modalLocation) : null;
  const filteredReports = reports.filter(r => !filterLocation || r.location?.includes(filterLocation));
  const locList = (settings.locations || []).map((l:any) => typeof l === 'string' ? {name: l, price: 0} : l);

  // 全登録メンバーリスト（責任者＋作業員）
  const allStaffNames = Array.from(new Set([
    ...(settings.managers || []).map((m: any) => m.name),
    ...(settings.workers || []).map((w: any) => w.name)
  ])).filter(Boolean);

  const calendarDays = getDaysInMonth(calendarYearMonth);

  return (
    <div className="p-3 md:p-10 bg-slate-100 min-h-screen space-y-4 md:space-y-8 w-full max-w-[1800px] mx-auto font-sans text-slate-800 text-sm md:text-lg relative">
      
      {/* 💾 編集完了トースト通知（ポップアップ） */}
      {showSaveToast && (
        <div className="fixed top-6 right-6 z-50 bg-emerald-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-bounce font-bold text-base md:text-lg">
          <span className="text-2xl">✨</span>
          <span>日報の編集を保存しました！</span>
        </div>
      )}

      {/* 🚀 ヘッダー */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 md:p-8 rounded-2xl md:rounded-3xl shadow-sm border border-slate-100 gap-3">
        <div className="space-y-1 text-center md:text-left">
          <div className="flex items-center gap-2 justify-center md:justify-start flex-wrap">
            <h1 className="text-lg md:text-3xl font-black text-slate-900 tracking-tight">📊 現場日報・原価管理</h1>
            <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${authRole === 'admin' ? 'bg-orange-100 text-orange-700' : 'bg-orange-100 text-orange-700'}`}>
              {authRole === 'admin' ? '👑 管理者モード' : '👑 社長モード'}
            </span>
          </div>
          <p className="text-xs md:text-base text-slate-500 font-medium">株式会社大和 音声日報システム</p>
        </div>
        <div className="flex w-full md:w-auto gap-2">
          <button onClick={fetchData} className="flex-1 md:flex-none bg-blue-50 hover:bg-blue-100 text-blue-600 px-4 py-2.5 rounded-xl font-bold text-sm transition flex items-center justify-center gap-1.5">
            🔄 更新
          </button>
          <button onClick={() => { setIsAuthed(false); setAuthRole(null); }} className="flex-1 md:flex-none bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2.5 rounded-xl font-bold text-sm transition">
            終了
          </button>
        </div>
      </div>

      {authRole === 'viewer' && (
        <div className="bg-orange-50 border border-orange-200 text-orange-800 p-3.5 rounded-2xl font-medium text-center text-xs md:text-base shadow-xs">
          👑 社長モードで表示しています。（データの確認が可能です）
        </div>
      )}

      {/* 🏢 現場別 経費集計サマリー */}
      <div className="bg-white p-4 md:p-8 rounded-2xl md:rounded-3xl shadow-sm border border-slate-100 space-y-4">
        <h2 className="text-lg md:text-2xl font-black text-slate-900">🏢 現場別 経費集計サマリー</h2>
        
        {/* スマホ最適化カード表示 */}
        <div className="block md:hidden space-y-3">
          {locList.map((loc:any) => {
            const c = calculateCosts(loc.name);
            return (
              <div key={loc.name} className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-2.5 shadow-2xs">
                <div className="flex flex-col gap-1.5">
                  <span className="font-bold text-blue-600 text-base leading-snug">{loc.name}</span>
                  <div>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold inline-block ${c.profit >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                      粗利: ¥{c.profit.toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-3 text-xs gap-1 bg-white p-2.5 rounded-xl border border-slate-100 text-slate-500 font-medium text-center">
                  <div>請負<span className="text-slate-900 font-bold block text-sm mt-0.5">¥{c.contractPrice.toLocaleString()}</span></div>
                  <div>日数<span className="text-slate-900 font-bold block text-sm mt-0.5">{c.days}日</span></div>
                  <div>経費<span className="text-slate-900 font-bold block text-sm mt-0.5">¥{c.total.toLocaleString()}</span></div>
                </div>
                <div className="flex gap-2 pt-0.5">
                  <button onClick={() => setModalLocation(loc.name)} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-xs font-bold shadow-xs transition">詳細分析</button>
                  {authRole !== 'viewer' && (
                    <button onClick={() => downloadLocationCSV(loc.name)} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl text-xs font-bold shadow-xs transition">CSV出力</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* PC用テーブル表示 */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 text-base font-bold uppercase tracking-wider">
                <th className="py-4 px-5">現場名</th>
                <th className="py-4 px-5">請負金額</th>
                <th className="py-4 px-5">稼働日数</th>
                <th className="py-4 px-5">合計経費</th>
                <th className="py-4 px-5">粗利</th>
                <th className="py-4 px-5 text-center">アクション</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-lg font-medium">
              {locList.map((loc:any) => {
                const c = calculateCosts(loc.name);
                return (
                  <tr key={loc.name} className="hover:bg-slate-50/80 transition">
                    <td className="py-5 px-5 font-bold text-blue-600 text-xl">{loc.name}</td>
                    <td className="py-5 px-5 text-slate-700 font-bold">¥{c.contractPrice.toLocaleString()}</td>
                    <td className="py-5 px-5 text-slate-700">{c.days} 日</td>
                    <td className="py-5 px-5 text-slate-900 font-bold">¥{c.total.toLocaleString()}</td>
                    <td className={`py-5 px-5 font-black text-xl ${c.profit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                      ¥{c.profit.toLocaleString()}
                    </td>
                    <td className="py-5 px-5 text-center space-x-3">
                      <button onClick={() => setModalLocation(loc.name)} className="bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-600 px-5 py-3 rounded-xl font-bold transition shadow-sm text-base">
                        詳細分析 →
                      </button>
                      {authRole !== 'viewer' && (
                        <button onClick={() => downloadLocationCSV(loc.name)} className="bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-600 px-5 py-3 rounded-xl font-bold transition shadow-sm text-base">
                          CSV
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 📅 出勤確認表（カレンダー形式・管理画面限定） */}
      <div className="bg-white p-4 md:p-8 rounded-2xl md:rounded-3xl shadow-sm border border-slate-100 space-y-4">
        <div className="flex justify-between items-center flex-wrap gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg md:text-2xl font-black text-slate-900">📅 出勤確認表（スタッフ別カレンダー）</h2>
            <p className="text-xs md:text-sm text-slate-400 mt-0.5">どの日に・誰がどの現場に入っていたか（または未割り当てか）をチェックできます</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs md:text-sm font-bold text-slate-600">表示月:</span>
            <input 
              type="month" 
              value={calendarYearMonth} 
              onChange={e => setCalendarYearMonth(e.target.value)}
              className="p-2.5 border border-slate-300 rounded-xl text-sm font-bold bg-slate-50 focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        {allStaffNames.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">登録されているスタッフがいません（マスタ設定を確認してください）</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs md:text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold">
                  <th className="py-3 px-3 sticky left-0 bg-slate-50 z-10 min-w-[120px] shadow-xs">スタッフ名</th>
                  {calendarDays.map(dateStr => {
                    const dayNum = Number(dateStr.split('-')[2]);
                    const dObj = new Date(dateStr);
                    const weekDays = ['日', '月', '火', '水', '木', '金', '土'];
                    const wDay = weekDays[dObj.getDay()];
                    const isWeekend = dObj.getDay() === 0 || dObj.getDay() === 6;
                    return (
                      <th key={dateStr} className={`py-3 px-1 text-center min-w-[36px] ${isWeekend ? 'text-rose-500 bg-rose-50/40' : ''}`}>
                        <div className="text-[10px] text-slate-400">{wDay}</div>
                        <div className="text-xs md:text-sm">{dayNum}</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allStaffNames.map(staff => {
                  return (
                    <tr key={staff} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-3 font-bold text-slate-900 sticky left-0 bg-white z-10 shadow-xs whitespace-nowrap">
                        👤 {staff}
                      </td>
                      {calendarDays.map(dateStr => {
                        const matchedReports = reports.filter(r => {
                          const rDateNormalized = normalizeDateStr(r.date);
                          if (rDateNormalized !== dateStr) return false;
                          const isManager = r.manager === staff;
                          const isWorker = (r.workers || []).includes(staff);
                          return isManager || isWorker;
                        });

                        const hasEntry = matchedReports.length > 0;
                        const locNames = Array.from(new Set(matchedReports.map(r => r.location))).join(', ');

                        return (
                          <td key={dateStr} className="py-3 px-1 text-center align-middle">
                            {hasEntry ? (
                              <div 
                                title={`${dateStr}: ${locNames}`}
                                className="w-7 h-7 mx-auto bg-emerald-100 text-emerald-700 rounded-lg flex items-center justify-center font-bold text-xs shadow-2xs cursor-help"
                              >
                                ◯
                              </div>
                            ) : (
                              <div className="w-7 h-7 mx-auto bg-slate-100 text-slate-300 rounded-lg flex items-center justify-center text-[10px]">
                                -
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="flex items-center gap-4 mt-3 text-xs text-slate-500 font-medium">
              <div className="flex items-center gap-1.5"><span className="w-4 h-4 bg-emerald-100 text-emerald-700 rounded flex items-center justify-center font-bold text-xs">◯</span> <span>現場日報に記載あり（ホバーで現場名確認）</span></div>
              <div className="flex items-center gap-1.5"><span className="w-4 h-4 bg-slate-100 text-slate-300 rounded flex items-center justify-center text-[10px]">-</span> <span>日報記載なし（未割り当て等）</span></div>
            </div>
          </div>
        )}
      </div>

      {/* ⚙️ マスタ登録・単価設定エリア（管理者のみ） */}
      {authRole === 'admin' && (
        <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 space-y-6">
          <div className="flex justify-between items-center flex-wrap gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-xl md:text-2xl font-black text-slate-900">⚙️ マスタ登録・単価設定（PC管理者用）</h2>
              <p className="text-sm text-slate-400 mt-0.5">各種単価や現場名、外注先の登録を行います</p>
            </div>
            <button 
              onClick={() => setShowAdminSection(!showAdminSection)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-bold text-sm transition"
            >
              {showAdminSection ? '📂 設定エリアを隠す ▲' : '📁 設定エリアを開く ▼'}
            </button>
          </div>

          {showAdminSection && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 animate-fadeIn">
              {[
                { title: "🏢 現場名一覧", key: "locations", nameKey: "name", addForm: ['lName', 'lPrice'], placeholders: ["新しい現場名", "請負金額"], type: "locations" },
                { title: "👤 現場責任者＆日額単価", key: "managers", nameKey: "name", addForm: ['mName', 'mPrice'], placeholders: ["責任者名", "日額"], type: "managers" },
                { title: "👥 作業メンバー＆日額単価", key: "workers", nameKey: "name", addForm: ['wName', 'wPrice'], placeholders: ["メンバー名", "日額"], type: "workers" },
                { title: "🏢 外注会社・作業内容・単価", key: "subcontractors", isSub: true },
                { title: "🚚 自社車両＆日額単価", key: "vehicles", nameKey: "name", addForm: ['vName', 'vPrice'], placeholders: ["車両名", "日額"], type: "vehicles" },
                { title: "🚜 自社重機＆日額単価", key: "companyMachines", nameKey: "name", addForm: ['cmName', 'cmPrice'], placeholders: ["重機名", "日額"], type: "companyMachines" },
                { title: "🚜 リース：重機＆日額単価", key: "leaseHeavy", nameKey: "name", addForm: ['lhName', 'lhPrice'], placeholders: ["重機名", "日額"], type: "leaseHeavy" },
                { title: "⚙️ リース：アタッチメント＆日額単価", key: "leaseAttach", nameKey: "name", addForm: ['laName', 'laPrice'], placeholders: ["アタッチメント名", "日額"], type: "leaseAttach" },
                { title: "🛠️ リース：その他 機械・機器＆日額単価", key: "leaseOther", nameKey: "name", addForm: ['loName', 'loPrice'], placeholders: ["機械・機器名", "日額"], type: "leaseOther" },
                { title: "🗑️ 処分場マスタ＆単価", key: "disposalLocations", isDisp: true },
                { title: "♻️ スクラップマスタ＆単価", key: "scrapLocations", isScrap: true },
              ].map((sec, idx) => (
                <div key={idx} className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <h3 className="font-bold text-base text-orange-600 tracking-wider">{sec.title}</h3>
                      <button 
                        onClick={() => saveMaster(sec.key)} 
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3.5 py-1.5 rounded-xl font-bold shadow-sm transition"
                      >
                        💾 保存する
                      </button>
                    </div>
                    
                    {sec.isSub ? (
                      <div className="space-y-2.5">
                        <input type="text" placeholder="外注会社名" value={form.subComp || ''} className="w-full p-3 border border-slate-300 rounded-xl text-base bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20" onChange={e=>setForm({...form, subComp: e.target.value})} />
                        <div className="grid grid-cols-12 gap-2">
                          <input type="text" placeholder="作業内容" value={form.subTask || ''} className="col-span-7 p-3 border border-slate-300 rounded-xl text-base bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20" onChange={e=>setForm({...form, subTask: e.target.value})} />
                          <input type="number" placeholder="単価" value={form.subPrice || ''} className="col-span-5 p-3 border border-slate-300 rounded-xl text-base bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20" onChange={e=>setForm({...form, subPrice: e.target.value})} />
                        </div>
                        <button onClick={() => addMaster('subcontractors', {company: form.subComp, task: form.subTask, price: Number(form.subPrice)||0}, ['subComp', 'subTask', 'subPrice'])} className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3 rounded-xl font-bold text-sm shadow-sm transition">＋ 追加</button>
                      </div>
                    ) : sec.isDisp || sec.isScrap ? (
                      <div className="space-y-2.5">
                        <input type="text" placeholder={sec.isDisp ? "処分場名" : "スクラップ場名"} value={form[sec.isDisp ? 'dLoc' : 'sLoc'] || ''} className="w-full p-3 border border-slate-300 rounded-xl text-base bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20" onChange={e=>setForm({...form, [sec.isDisp ? 'dLoc' : 'sLoc']: e.target.value})} />
                        <div className="grid grid-cols-12 gap-2">
                          <input type="text" placeholder="品目" value={form[sec.isDisp ? 'dItem' : 'sItem'] || ''} className="col-span-4 p-3 border border-slate-300 rounded-xl text-base bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20" onChange={e=>setForm({...form, [sec.isDisp ? 'dItem' : 'sItem']: e.target.value})} />
                          <input type="text" placeholder="単位" value={form[sec.isDisp ? 'dUnit' : 'sUnit'] || ''} className="col-span-3 p-3 border border-slate-300 rounded-xl text-base bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20" onChange={e=>setForm({...form, [sec.isDisp ? 'dUnit' : 'sUnit']: e.target.value})} />
                          <input type="number" placeholder="単価" value={form[sec.isDisp ? 'dPrice' : 'sPrice'] || ''} className="col-span-5 p-3 border border-slate-300 rounded-xl text-base bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20" onChange={e=>setForm({...form, [sec.isDisp ? 'dPrice' : 'sPrice']: e.target.value})} />
                        </div>
                        <button onClick={() => addMaster(sec.key, {location: form[sec.isDisp ? 'dLoc' : 'sLoc'], item: form[sec.isDisp ? 'dItem' : 'sItem'], unit: form[sec.isDisp ? 'dUnit' : 'sUnit'] || 't', price: Number(form[sec.isDisp ? 'dPrice' : 'sPrice'])||0}, sec.isDisp ? ['dLoc', 'dItem', 'dUnit', 'dPrice'] : ['sLoc', 'sItem', 'sUnit', 'sPrice'])} className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3 rounded-xl font-bold text-sm shadow-sm transition">＋ 追加</button>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        <input type="text" placeholder={sec.placeholders[0]} value={form[sec.addForm[0]] || ''} className="w-full p-3 border border-slate-300 rounded-xl text-base bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20" onChange={e=>setForm({...form, [sec.addForm[0]]: e.target.value})} />
                        <input type="number" placeholder={sec.placeholders[1]} value={form[sec.addForm[1]] || ''} className="w-full p-3 border border-slate-300 rounded-xl text-base bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20" onChange={e=>setForm({...form, [sec.addForm[1]]: e.target.value})} />
                        <button onClick={() => addMaster(sec.key, {name: form[sec.addForm[0]], price: Number(form[sec.addForm[1]])||0}, sec.addForm)} className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3 rounded-xl font-bold text-sm shadow-sm transition">＋ 追加</button>
                      </div>
                    )}
                  </div>

                  <div className="max-h-52 overflow-y-auto divide-y divide-slate-100 bg-white border border-slate-200 rounded-2xl p-3 space-y-2 mt-2">
                    {(settings[sec.key] || []).length === 0 ? (
                      <p className="text-sm text-slate-400 text-center py-4">登録データがありません</p>
                    ) : (
                      (settings[sec.key] || []).map((item:any, idx:number)=>(
                        <div key={idx} className="py-2.5 flex justify-between items-center text-sm font-medium gap-2">
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button type="button" onClick={() => moveMasterItem(sec.key, idx, 'up')} disabled={idx === 0} className="w-7 h-7 bg-slate-100 hover:bg-slate-200 disabled:opacity-30 rounded-lg text-xs font-bold flex items-center justify-center transition" title="上へ">▲</button>
                            <button type="button" onClick={() => moveMasterItem(sec.key, idx, 'down')} disabled={idx === (settings[sec.key] || []).length - 1} className="w-7 h-7 bg-slate-100 hover:bg-slate-200 disabled:opacity-30 rounded-lg text-xs font-bold flex items-center justify-center transition" title="下へ">▼</button>
                          </div>
                          <span className="text-slate-900 font-bold flex-1 px-1 text-sm">
                            {sec.isSub ? `${item.company} / ${item.task}` : sec.isDisp || sec.isScrap ? `${item.location} (${item.item}/${item.unit})` : item.name}
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-slate-400 text-xs">¥</span>
                            <input type="number" value={item.price || 0} onChange={(e)=>updateItemPrice(sec.key, idx, 'price', e.target.value)} className="w-24 p-2 border border-slate-300 rounded-xl text-right text-sm font-bold bg-slate-50" />
                            <button type="button" onClick={()=>deleteMaster(sec.key, idx)} className="text-rose-500 hover:text-rose-700 font-bold text-xs ml-1 p-1">削除</button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 📥 送信された日報一覧 */}
      <div className="bg-white p-4 md:p-8 rounded-2xl md:rounded-3xl shadow-sm border border-slate-100 space-y-4">
        <div className="flex justify-between items-center flex-wrap gap-3">
          <h2 className="text-lg md:text-2xl font-black text-slate-900">📥 送信された日報一覧</h2>
          <input 
            type="text" 
            placeholder="🔍 現場名で絞り込み..." 
            value={filterLocation} 
            onChange={e => setFilterLocation(e.target.value)} 
            className="p-3 border border-slate-300 rounded-xl text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:outline-none w-full md:w-80 transition" 
          />
        </div>

        {/* スマホ用カード型リスト */}
        <div className="block md:hidden space-y-3">
          {filteredReports.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">日報データはありません</p>
          ) : (
            filteredReports.map((r, i) => (
              <div key={r.id || r._id || i} className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-3 shadow-2xs">
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <span className="font-bold text-blue-600 text-base">📅 {r.date}</span>
                  <span className="font-bold text-slate-900 text-sm bg-white px-2.5 py-1 rounded-lg border border-slate-200">{r.location}</span>
                </div>
                
                <div className="space-y-2 text-xs text-slate-700">
                  <div>
                    <span className="text-slate-400 block text-[11px] font-semibold mb-0.5">責任者 / 作業者</span>
                    <span className="font-bold text-slate-900 text-sm">
                      👤 {r.manager || '-'} / {(r.workers || []).join(', ') || '-'}
                    </span>
                  </div>

                  {(r.subcontractors || []).length > 0 && (
                    <div>
                      <span className="text-orange-600 block text-[11px] font-semibold mb-0.5">外注</span>
                      <span className="font-bold text-orange-700 text-sm">
                        {(r.subcontractors || []).map((s:any)=>`${s.company} (${s.task}: ${s.count}人)`).join(', ')}
                      </span>
                    </div>
                  )}

                  <div>
                    <span className="text-slate-400 block text-[11px] font-semibold mb-0.5">重機 / 車両</span>
                    <span className="font-medium text-slate-800">
                      🚜 {[...(r.machines || []), ...(r.leaseHeavy || []), ...(r.leaseAttach || []), ...(r.leaseOther || []), ...(r.ownMachines || []), ...(r.vehicles || [])].join(', ') || '-'}
                    </span>
                  </div>

                  {r.workDescription && (
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                      <span className="text-slate-400 block text-[11px] font-semibold mb-0.5">作業内容</span>
                      <span className="text-slate-800 text-xs leading-relaxed">{r.workDescription}</span>
                    </div>
                  )}
                </div>

                {authRole === 'admin' && (
                  <div className="flex gap-2 pt-2 border-t border-slate-200">
                    <button onClick={() => setEditingReport({ ...r })} className="flex-1 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-600 py-2 rounded-xl font-bold transition text-xs">編集</button>
                    <button onClick={() => handleDeleteReport(r, i)} className="flex-1 bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-600 py-2 rounded-xl font-bold transition text-xs">削除</button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* PC用テーブル表示 */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm md:text-base text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 text-xs md:text-sm font-bold uppercase tracking-wider">
                <th className="py-3 px-3">日付</th>
                <th className="py-3 px-3">現場名</th>
                <th className="py-3 px-3">責任者 / 作業者 / 外注</th>
                <th className="py-3 px-3">重機 / 車両</th>
                <th className="py-3 px-3">作業内容</th>
                {authRole === 'admin' && <th className="py-3 px-3 text-center">操作</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs md:text-sm font-medium">
              {filteredReports.map((r, i) => (
                <tr key={r.id || r._id || i} className="hover:bg-slate-50/80 transition">
                  <td className="py-3.5 px-3 font-bold text-slate-900 whitespace-nowrap">{r.date}</td>
                  <td className="py-3.5 px-3 font-bold text-blue-600 whitespace-nowrap">{r.location}</td>
                  <td className="py-3.5 px-3 text-slate-700 space-y-0.5">
                    <div className="font-bold">{r.manager} / {(r.workers || []).join(', ')}</div>
                    {(r.subcontractors || []).length > 0 && (
                      <div className="text-orange-600 font-bold">
                        外注: {(r.subcontractors || []).map((s:any)=>`${s.company}(${s.task}:${s.count}人)`).join(', ')}
                      </div>
                    )}
                  </td>
                  <td className="py-3.5 px-3 text-slate-700">{[...(r.machines || []), ...(r.leaseHeavy || []), ...(r.leaseAttach || []), ...(r.leaseOther || []), ...(r.ownMachines || []), ...(r.vehicles || [])].join(', ') || '-'}</td>
                  <td className="py-3.5 px-3 text-slate-700 max-w-xs truncate">{r.workDescription || '-'}</td>
                  {authRole === 'admin' && (
                    <td className="py-3.5 px-3 text-center space-x-2 whitespace-nowrap">
                      <button onClick={() => setEditingReport({ ...r })} className="bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-600 px-3 py-1.5 rounded-lg font-bold transition shadow-xs text-xs">編集</button>
                      <button onClick={() => handleDeleteReport(r, i)} className="bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-600 px-3 py-1.5 rounded-lg font-bold transition shadow-xs text-xs">削除</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ✏️ おしゃれ＆見やすくリニューアルした日報編集モーダル */}
      {editingReport && authRole === 'admin' && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-md flex items-center justify-center p-3 md:p-6 z-50 animate-fadeIn">
          <form onSubmit={handleUpdateReport} className="bg-white rounded-[32px] w-full max-w-4xl p-6 md:p-10 max-h-[92vh] overflow-y-auto space-y-8 shadow-2xl border border-slate-100">
            
            {/* モーダルヘッダー */}
            <div className="flex justify-between items-center border-b border-slate-100 pb-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center text-2xl shadow-inner">📝</div>
                <div>
                  <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">日報データの編集</h2>
                  <p className="text-xs md:text-sm text-slate-400 font-medium">選択した日報の情報を変更・調整します</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setEditingReport(null)}
                className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-lg transition"
              >
                ✕
              </button>
            </div>
            
            {/* フォームセクション群 */}
            <div className="space-y-6">

              {/* 基本情報カード */}
              <div className="bg-slate-50/80 p-5 md:p-6 rounded-3xl border border-slate-200/60 space-y-4">
                <h3 className="text-sm font-black text-slate-600 uppercase tracking-wider flex items-center gap-2">
                  <span>📌 基本情報</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1.5">日付</label>
                    <input type="text" value={editingReport.date || ''} onChange={e=>setEditingReport({...editingReport, date: e.target.value})} className="w-full p-3.5 border border-slate-300 rounded-2xl text-sm bg-white font-bold text-slate-800 shadow-2xs focus:ring-2 focus:ring-orange-500/20 focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1.5">現場名</label>
                    <select value={editingReport.location || ''} onChange={e=>setEditingReport({...editingReport, location: e.target.value})} className="w-full p-3.5 border border-slate-300 rounded-2xl text-sm bg-white font-bold text-blue-600 shadow-2xs focus:ring-2 focus:ring-orange-500/20 focus:outline-none">
                      {locList.map((l:any)=><option key={l.name} value={l.name}>{l.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1.5">現場責任者</label>
                    <select value={editingReport.manager || ''} onChange={e=>setEditingReport({...editingReport, manager: e.target.value})} className="w-full p-3.5 border border-slate-300 rounded-2xl text-sm bg-white font-bold text-slate-800 shadow-2xs focus:ring-2 focus:ring-orange-500/20 focus:outline-none">
                      <option value="">選択なし</option>
                      {(settings.managers || []).map((m:any)=><option key={m.name} value={m.name}>{m.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* 作業メンバーカード */}
              <div className="bg-slate-50/80 p-5 md:p-6 rounded-3xl border border-slate-200/60 space-y-4">
                <h3 className="text-sm font-black text-slate-600 uppercase tracking-wider flex items-center gap-2">
                  <span>👥 作業メンバー</span>
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                  {(settings.workers || []).map((w: any) => {
                    const checked = (editingReport.workers || []).includes(w.name);
                    return (
                      <label key={w.name} className={`flex items-center gap-2.5 p-3 rounded-2xl border cursor-pointer text-xs md:text-sm font-medium transition shadow-2xs ${checked ? 'bg-orange-50 border-orange-300 text-orange-900 font-bold shadow-xs' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                        <input 
                          type="checkbox" 
                          checked={checked} 
                          onChange={e => {
                            const current = editingReport.workers || [];
                            const updated = e.target.checked ? [...current, w.name] : current.filter((x: string) => x !== w.name);
                            setEditingReport({ ...editingReport, workers: updated });
                          }}
                          className="rounded text-orange-600 focus:ring-orange-500 w-4 h-4"
                        />
                        <span className="truncate">{w.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* 重機・車両・アタッチメントカード */}
              <div className="bg-slate-50/80 p-5 md:p-6 rounded-3xl border border-slate-200/60 space-y-4">
                <h3 className="text-sm font-black text-slate-600 uppercase tracking-wider flex items-center gap-2">
                  <span>🚜 重機・アタッチメント・車両</span>
                </h3>
                
                {/* リース重機 */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-500 block">■ リース重機</span>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {(settings.leaseHeavy || []).map((lh: any) => {
                      const checked = (editingReport.leaseHeavy || []).includes(lh.name);
                      return (
                        <label key={lh.name} className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer text-xs font-medium transition ${checked ? 'bg-blue-50 border-blue-300 text-blue-900 font-bold' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                          <input 
                            type="checkbox" 
                            checked={checked} 
                            onChange={e => {
                              const current = editingReport.leaseHeavy || [];
                              const updated = e.target.checked ? [...current, lh.name] : current.filter((x: string) => x !== lh.name);
                              setEditingReport({ ...editingReport, leaseHeavy: updated });
                            }}
                            className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                          />
                          <span className="truncate">{lh.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* アタッチメント */}
                <div className="space-y-2 pt-2">
                  <span className="text-xs font-bold text-slate-500 block">■ アタッチメント</span>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {(settings.leaseAttach || []).map((la: any) => {
                      const checked = (editingReport.leaseAttach || []).includes(la.name);
                      return (
                        <label key={la.name} className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer text-xs font-medium transition ${checked ? 'bg-blue-50 border-blue-300 text-blue-900 font-bold' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                          <input 
                            type="checkbox" 
                            checked={checked} 
                            onChange={e => {
                              const current = editingReport.leaseAttach || [];
                              const updated = e.target.checked ? [...current, la.name] : current.filter((x: string) => x !== la.name);
                              setEditingReport({ ...editingReport, leaseAttach: updated });
                            }}
                            className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                          />
                          <span className="truncate">{la.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* 自社重機 */}
                <div className="space-y-2 pt-2">
                  <span className="text-xs font-bold text-slate-500 block">■ 自社重機</span>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {(settings.companyMachines || []).map((cm: any) => {
                      const checked = (editingReport.ownMachines || []).includes(cm.name);
                      return (
                        <label key={cm.name} className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer text-xs font-medium transition ${checked ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                          <input 
                            type="checkbox" 
                            checked={checked} 
                            onChange={e => {
                              const current = editingReport.ownMachines || [];
                              const updated = e.target.checked ? [...current, cm.name] : current.filter((x: string) => x !== cm.name);
                              setEditingReport({ ...editingReport, ownMachines: updated });
                            }}
                            className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                          />
                          <span className="truncate">{cm.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* 自社車両 */}
                <div className="space-y-2 pt-2">
                  <span className="text-xs font-bold text-slate-500 block">■ 自社車両</span>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {(settings.vehicles || []).map((v: any) => {
                      const checked = (editingReport.vehicles || []).includes(v.name);
                      return (
                        <label key={v.name} className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer text-xs font-medium transition ${checked ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                          <input 
                            type="checkbox" 
                            checked={checked} 
                            onChange={e => {
                              const current = editingReport.vehicles || [];
                              const updated = e.target.checked ? [...current, v.name] : current.filter((x: string) => x !== v.name);
                              setEditingReport({ ...editingReport, vehicles: updated });
                            }}
                            className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                          />
                          <span className="truncate">{v.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 燃料・経費カード */}
              <div className="bg-slate-50/80 p-5 md:p-6 rounded-3xl border border-slate-200/60 space-y-4">
                <h3 className="text-sm font-black text-slate-600 uppercase tracking-wider flex items-center gap-2">
                  <span>💰 燃料・経費</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1.5">軽油 (L)</label>
                    <input type="number" value={editingReport.fuel || 0} onChange={e=>setEditingReport({...editingReport, fuel: e.target.value})} className="w-full p-3.5 border border-slate-300 rounded-2xl text-sm bg-white font-bold shadow-2xs focus:ring-2 focus:ring-orange-500/20 focus:outline-none text-right" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1.5">高速代・ETC (円)</label>
                    <input type="number" value={editingReport.etcPrice || 0} onChange={e=>setEditingReport({...editingReport, etcPrice: e.target.value})} className="w-full p-3.5 border border-slate-300 rounded-2xl text-sm bg-white font-bold shadow-2xs focus:ring-2 focus:ring-orange-500/20 focus:outline-none text-right" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1.5">駐車場代 (円)</label>
                    <input type="number" value={editingReport.parkingPrice || 0} onChange={e=>setEditingReport({...editingReport, parkingPrice: e.target.value})} className="w-full p-3.5 border border-slate-300 rounded-2xl text-sm bg-white font-bold shadow-2xs focus:ring-2 focus:ring-orange-500/20 focus:outline-none text-right" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1.5">その他雑費 (円)</label>
                    <input type="number" value={editingReport.otherPrice || 0} onChange={e=>setEditingReport({...editingReport, otherPrice: e.target.value})} className="w-full p-3.5 border border-slate-300 rounded-2xl text-sm bg-white font-bold shadow-2xs focus:ring-2 focus:ring-orange-500/20 focus:outline-none text-right" />
                  </div>
                </div>
              </div>

              {/* 作業内容メモカード */}
              <div className="bg-slate-50/80 p-5 md:p-6 rounded-3xl border border-slate-200/60 space-y-4">
                <h3 className="text-sm font-black text-slate-600 uppercase tracking-wider flex items-center gap-2">
                  <span>📝 作業内容メモ</span>
                </h3>
                <textarea rows={3} value={editingReport.workDescription || ''} onChange={e=>setEditingReport({...editingReport, workDescription: e.target.value})} className="w-full p-4 border border-slate-300 rounded-2xl text-sm bg-white font-medium shadow-2xs focus:ring-2 focus:ring-orange-500/20 focus:outline-none leading-relaxed" placeholder="本日の作業内容や特記事項を入力..." />
              </div>

            </div>

            {/* モーダル下部ボタン */}
            <div className="flex gap-4 pt-4 border-t border-slate-100">
              <button type="submit" className="flex-1 bg-orange-600 hover:bg-orange-700 text-white py-4 rounded-2xl font-black text-base md:text-lg shadow-lg shadow-orange-500/20 transition transform active:scale-98">
                💾 更新を保存する
              </button>
              <button type="button" onClick={() => setEditingReport(null)} className="px-8 bg-slate-200 hover:bg-slate-300 text-slate-700 py-4 rounded-2xl font-bold text-base transition">
                キャンセル
              </button>
            </div>

          </form>
        </div>
      )}

      {/* 🔍 現場詳細モーダル */}
      {modalLocation && modalData && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-2 md:p-8 z-40 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-6xl p-4 md:p-10 max-h-[92vh] overflow-y-auto space-y-6 md:space-y-8 shadow-2xl border border-slate-100">
            <div className="flex justify-between items-center border-b border-slate-200 pb-4 md:pb-6 gap-2">
              <div>
                <h2 className="text-xl md:text-4xl font-black text-slate-900">{modalLocation} <span className="text-sm md:text-xl font-normal text-slate-500 block md:inline">（詳細分析）</span></h2>
                <p className="text-xs md:text-base text-slate-500 mt-0.5">原価・収支および内訳明細</p>
              </div>
              <div className="flex gap-2 shrink-0">
                {authRole !== 'viewer' && (
                  <button onClick={() => downloadLocationCSV(modalLocation)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 md:px-6 py-2.5 md:py-3 rounded-xl text-xs md:text-base font-bold shadow-xs transition">CSV出力</button>
                )}
                <button onClick={() => setModalLocation(null)} className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-3.5 md:px-6 py-2.5 md:py-3 rounded-xl text-xs md:text-base font-bold transition">閉じる</button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5 text-center">
              <div className="bg-slate-50 p-4 md:p-6 rounded-2xl border border-slate-200"><div className="text-xs md:text-base text-slate-600 font-medium">請負金額</div><div className="text-lg md:text-3xl font-black text-slate-900 mt-1 md:mt-2">¥{modalData.contractPrice.toLocaleString()}</div></div>
              <div className="bg-emerald-50/60 p-4 md:p-6 rounded-2xl border border-emerald-200"><div className="text-xs md:text-base text-emerald-700 font-medium">合計経費</div><div className="text-lg md:text-3xl font-black text-emerald-800 mt-1 md:mt-2">¥{modalData.total.toLocaleString()}</div></div>
              <div className="bg-blue-50/60 p-4 md:p-6 rounded-2xl border border-blue-200"><div className="text-xs md:text-base text-blue-700 font-medium">利益（売却益込）</div><div className="text-lg md:text-3xl font-black text-blue-800 mt-1 md:mt-2">¥{modalData.profit.toLocaleString()}</div></div>
              <div className="bg-amber-50/60 p-4 md:p-6 rounded-2xl border border-amber-200"><div className="text-xs md:text-base text-amber-700 font-medium">稼働日数</div><div className="text-lg md:text-3xl font-black text-amber-800 mt-1 md:mt-2">{modalData.days}日</div></div>
            </div>

            <div className="bg-slate-50 p-4 md:p-8 rounded-2xl md:rounded-3xl border border-slate-200 space-y-4 md:space-y-6">
              <div className="flex justify-between items-center flex-wrap gap-3">
                <h3 className="font-bold text-base md:text-xl text-slate-900">📋 経費・収支の内訳明細</h3>
                <button onClick={() => setShowDisposalModal(true)} className="bg-orange-600 hover:bg-orange-700 text-white text-xs md:text-base px-4 py-2.5 rounded-xl font-bold shadow-xs transition">🔍 処分費の内訳を確認</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-5">
                
                {[
                  { key: 'labor', label: '社員人件費', val: costOverrides[modalLocation]?.labor ?? modalData.laborCost },
                  { key: 'sub', label: '外注人件費', val: costOverrides[modalLocation]?.sub ?? modalData.subCostTotal },
                  { key: 'lease', label: 'リース合計', val: costOverrides[modalLocation]?.lease ?? modalData.leaseCost },
                  { key: 'otherLease', label: 'その他リース', val: costOverrides[modalLocation]?.otherLease ?? modalData.otherLeaseCost },
                  { key: 'ownMachine', label: '自社重機', val: costOverrides[modalLocation]?.ownMachine ?? modalData.ownMachineCost },
                  { key: 'vehicle', label: '自社車両', val: costOverrides[modalLocation]?.vehicle ?? modalData.vehicleCost },
                  { key: 'disposal', label: '🗑️ 処分費 (合計)', val: costOverrides[modalLocation]?.disposal ?? modalData.disposalCost, isDisposal: true },
                  { key: 'fuel', label: '燃料代 (軽油)', val: costOverrides[modalLocation]?.fuel ?? modalData.fuelCost },
                  { key: 'etc', label: '高速代・ETC', val: costOverrides[modalLocation]?.etc ?? modalData.etcCost },
                  { key: 'parking', label: '駐車場代', val: costOverrides[modalLocation]?.parking ?? modalData.parkingCost },
                  { key: 'other', label: 'その他雑費', val: costOverrides[modalLocation]?.other ?? modalData.otherCost },
                ].map((item) => {
                  const isEditing = editingCostFields[modalLocation]?.[item.key];
                  return (
                    <div key={item.key} className={`bg-white p-4 md:p-6 rounded-2xl border border-slate-300 shadow-2xs flex flex-col justify-between gap-3 ${item.isDisposal ? 'col-span-full md:col-span-1' : ''}`}>
                      <div className="flex justify-between items-center">
                        <span className={`text-sm md:text-base font-bold ${item.isDisposal ? 'text-orange-600' : 'text-slate-600'}`}>{item.label}</span>
                        {authRole === 'admin' && (
                          <button
                            type="button"
                            onClick={() => toggleCostFieldEdit(modalLocation, item.key)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1"
                          >
                            {isEditing ? '🔒 完了' : '✏️ 編集'}
                          </button>
                        )}
                      </div>

                      {isEditing && authRole === 'admin' ? (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-slate-500 font-bold text-lg">¥</span>
                          <input
                            type="number"
                            value={costOverrides[modalLocation]?.[item.key] ?? (item.isDisposal ? modalData.disposalCost : (item.key === 'labor' ? modalData.laborCost : item.key === 'sub' ? modalData.subCostTotal : item.key === 'lease' ? modalData.leaseCost : item.key === 'otherLease' ? modalData.otherLeaseCost : item.key === 'ownMachine' ? modalData.ownMachineCost : item.key === 'vehicle' ? modalData.vehicleCost : item.key === 'fuel' ? modalData.fuelCost : item.key === 'etc' ? modalData.etcCost : item.key === 'parking' ? modalData.parkingCost : modalData.otherCost))}
                            onChange={e => handleCostOverrideChange(modalLocation, item.key, e.target.value)}
                            className="w-full p-2.5 border border-slate-300 rounded-xl font-bold text-right text-base bg-slate-50"
                            autoFocus
                          />
                        </div>
                      ) : (
                        <div className="font-black text-slate-900 text-2xl md:text-3xl">
                          ¥{Number(item.val || 0).toLocaleString()}
                        </div>
                      )}

                      {item.isDisposal && (
                        <div className="text-xs md:text-sm text-slate-600 mt-1.5 space-y-1 border-t border-slate-200 pt-2.5">
                          {Object.entries(modalData.aggregatedDisposalBreakdown).length === 0 ? (
                            <div>内訳なし</div>
                          ) : (
                            Object.entries(modalData.aggregatedDisposalBreakdown).map(([locName, val]: [string, any]) => (
                              <div key={locName} className="flex justify-between">
                                <span>・{locName}:</span>
                                <span className="font-bold">¥{val.toLocaleString()}</span>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                <div className="bg-emerald-50 p-4 md:p-6 rounded-2xl border border-emerald-200 flex flex-col gap-2.5 col-span-full shadow-2xs">
                  <div className="flex justify-between items-center">
                    <span className="text-emerald-900 font-bold text-base md:text-lg">♻️ スクラップ売却計</span>
                    <span className="font-black text-emerald-800 text-xl md:text-2xl">+ ¥{modalData.scrapTotal.toLocaleString()}</span>
                  </div>
                  <div className="text-xs md:text-sm text-slate-600 space-y-1 border-t border-emerald-200 pt-2.5">
                    {Object.entries(modalData.aggregatedScrapBreakdown).length === 0 ? (
                      <div>内訳なし</div>
                    ) : (
                      Object.entries(modalData.aggregatedScrapBreakdown).map(([scrapKey, val]: [string, any]) => (
                        <div key={scrapKey} className="flex justify-between">
                          <span>・{scrapKey}:</span>
                          <span className="font-black text-emerald-800">+ ¥{val.toLocaleString()}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            </div>

            <div className="bg-slate-50 p-4 md:p-8 rounded-2xl md:rounded-3xl border border-slate-200 space-y-4">
              <h3 className="font-bold text-base md:text-xl text-slate-900">📅 1日ごとの日報データ・経費明細</h3>
              {modalData.reportsWithIndex.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-6">この現場の日報はまだありません</p>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                  {modalData.reportsWithIndex.map((r, idx) => {
                    const daily = calculateReportDailyCost(r);
                    return (
                      <div key={r.id || r._id || idx} className="bg-white p-4 rounded-2xl border border-slate-300 shadow-2xs space-y-3">
                        <div className="flex justify-between items-center border-b border-slate-200 pb-2.5 text-sm font-bold text-slate-800">
                          <span className="text-blue-600 text-base">📅 {r.date}</span>
                          <span className="text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl font-bold text-xs md:text-sm">日報経費: ¥{daily.totalDailyCost.toLocaleString()}</span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs md:text-sm text-slate-800">
                          <div><span className="text-slate-500 block text-xs">責任者</span> <span className="font-bold">{r.manager || '-'}</span></div>
                          <div><span className="text-slate-500 block text-xs">作業員</span> <span className="font-bold">{(r.workers || []).join(', ') || '-'}</span></div>
                          <div><span className="text-slate-500 block text-xs">外注</span> <span className="font-bold">{(r.subcontractors || []).map((s:any)=>`${s.company}(${s.task}:${s.count}人)`).join(', ') || '-'}</span></div>
                          <div><span className="text-slate-500 block text-xs">重機リース</span> <span className="font-bold">{(r.leaseHeavy || []).join(', ') || '-'}</span></div>
                          <div><span className="text-slate-500 block text-xs">アタッチメント</span> <span className="font-bold">{(r.leaseAttach || []).join(', ') || '-'}</span></div>
                          <div><span className="text-slate-500 block text-xs">その他機械</span> <span className="font-bold">{(r.leaseOther || []).join(', ') || '-'}</span></div>
                          <div><span className="text-slate-500 block text-xs">自社重機</span> <span className="font-bold">{(r.ownMachines || []).join(', ') || '-'}</span></div>
                          <div><span className="text-slate-500 block text-xs">自社車両</span> <span className="font-bold">{(r.vehicles || []).join(', ') || '-'}</span></div>
                        </div>
                        {r.workDescription && (
                          <div className="text-xs md:text-sm text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200">
                            <span className="font-bold text-slate-900 block mb-0.5">作業内容:</span> {r.workDescription}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* 🗑️ 処分費詳細モーダル */}
      {showDisposalModal && modalLocation && modalData && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-3 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-2xl p-5 md:p-8 max-h-[85vh] overflow-y-auto space-y-5 shadow-2xl border border-slate-100">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="text-lg md:text-2xl font-black text-slate-900">🗑️ {modalLocation} - 処分内容一覧</h3>
              <button onClick={() => setShowDisposalModal(false)} className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-xl text-xs md:text-base font-bold transition">閉じる</button>
            </div>

            <div className="space-y-3">
              {modalData.reportsWithIndex.flatMap(r => (r.disposals || []).map((d:any, idx:number) => ({ ...d, date: r.date }))).length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-6">搬出された処分データはありません</p>
              ) : (
                <div className="divide-y divide-slate-200 border border-slate-200 rounded-2xl overflow-hidden shadow-2xs text-xs md:text-base">
                  <div className="grid grid-cols-4 bg-slate-100 p-3 font-bold text-slate-600 uppercase tracking-wider">
                    <div>日付</div>
                    <div>処分場名</div>
                    <div>品目</div>
                    <div className="text-right">数量・金額</div>
                  </div>
                  {modalData.reportsWithIndex.flatMap(r => (r.disposals || []).map((d:any, idx:number) => {
                    const uPrice = (settings.disposalLocations || []).find((s: any) => s.location === d.location && s.item === d.item)?.price || 0;
                    const subTotal = Number(d.quantity || 0) * uPrice;
                    return (
                      <div key={idx} className="grid grid-cols-4 p-3 items-center bg-white hover:bg-slate-50 transition">
                        <div className="font-bold text-slate-900">{r.date}</div>
                        <div className="text-slate-800">{d.location || '-'}</div>
                        <div className="text-slate-800">{d.item || '-'}</div>
                        <div className="text-right font-bold text-slate-900">{Number(d.quantity || 0)} {d.unit || 't'} <span className="text-slate-500 font-normal block text-xs">(¥{subTotal.toLocaleString()})</span></div>
                      </div>
                    );
                  }))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
