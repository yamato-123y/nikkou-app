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

  // モーダル用ステート
  const [showDisposalModal, setShowDisposalModal] = useState(false);
  const [showScrapModal, setShowScrapModal] = useState(false);

  // 経費内訳明細の手動編集用オーバーライドステート
  const [costOverrides, setCostOverrides] = useState<any>({});

  // 月別軽油単価のオーバーライドステート（例: { "現場名": { "2026-08": 150 } }）
  const [fuelUnitPrices, setFuelUnitPrices] = useState<any>({});

  // 各項目の編集モードを管理するステート
  const [editingCostFields, setEditingCostFields] = useState<any>({});

  // 管理エリアの開閉ステート
  const [showAdminSection, setShowAdminSection] = useState(false);

  // 📅 出勤確認表の開閉ステート（初期値: false = 閉じ気味）
  const [showCalendarSection, setShowCalendarSection] = useState(false);

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
          if (sData.fuelUnitPrices) setFuelUnitPrices(sData.fuelUnitPrices);
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

  const updateItemField = (key: string, idx: number, field: string, value: any) => {
    if (authRole === 'viewer') return;
    const list = [...(settings[key] || [])];
    list[idx] = { 
      ...list[idx], 
      [field]: field === 'price' ? (Number(value) || 0) : value 
    };
    setSettings({ ...settings, [key]: list });
  };

  const toggleLocationFinished = async (locName: string) => {
    if (authRole === 'viewer') {
      alert('閲覧専用モードのため変更できません。');
      return;
    }
    const currentLocs = (settings.locations || []).map((l: any) => {
      const name = typeof l === 'string' ? l : l.name;
      if (name === locName) {
        const isFinished = typeof l === 'object' ? l.isFinished : false;
        return typeof l === 'string' ? { name: l, price: 0, isFinished: !isFinished } : { ...l, isFinished: !isFinished };
      }
      return typeof l === 'string' ? { name: l, price: 0, isFinished: false } : l;
    });

    const newData = { ...settings, locations: currentLocs };
    setSettings(newData);

    try {
      await fetch('/api/settings', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(newData) 
      });
    } catch (e) {
      console.error(e);
    }
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

  const handleFuelUnitPriceChange = async (locName: string, yearMonth: string, val: string) => {
    if (authRole === 'viewer') return;
    const newFuelPrices = {
      ...fuelUnitPrices,
      [locName]: {
        ...(fuelUnitPrices[locName] || {}),
        [yearMonth]: val
      }
    };
    setFuelUnitPrices(newFuelPrices);
    const newData = { ...settings, fuelUnitPrices: newFuelPrices };
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
      setShowSaveToast(true);
      setTimeout(() => setShowSaveToast(false), 2500);
    } else {
      alert('更新に失敗しました。');
    }
  };

  // --- 計算ロジック（日報保存時の単価を優先するように修正） ---
  const calculateReportDailyCost = (r: any) => {
    let lCost = 0;
    (r.workers || []).forEach((w: string) => lCost += ((settings.workers || []).find((x:any) => x.name === w)?.price || 0));

    let subCost = 0;
    (r.subcontractors || []).forEach((sub: any) => {
      const subMaster = (settings.subcontractors || []).find((x:any) => x.company === sub.company && x.task === sub.task);
      const unitP = sub.price !== undefined && sub.price !== null && sub.price !== '' 
        ? Number(sub.price) 
        : (subMaster?.price || 0);
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
    (r.mokCustomMachines || []).forEach((m: any) => {
      const matched = (settings.leaseHeavy || []).find((x:any) => x.name === m.name) || (settings.leaseOther || []).find((x:any) => x.name === m.name);
      const unitP = matched?.price || 0;
      otherLeaseC += (Number(m.count || 0) * unitP);
    });

    let ownMachineC = 0;
    (r.ownMachines || []).forEach((m: string) => ownMachineC += ((settings.companyMachines || []).find((x:any) => x.name === m)?.price || 0));

    let vehicleC = 0;
    (r.vehicles || []).forEach((v: string) => vehicleC += ((settings.vehicles || []).find((x:any) => x.name === v)?.price || 0));

    let dispC = 0;
    const disposalBreakdown: {[key: string]: {quantity: number, price: number, total: number}} = {};
    (r.disposals || []).forEach((d: any) => {
      const masterPrice = (settings.disposalLocations || []).find((s: any) => s.location === d.location && s.item === d.item)?.price || 0;
      const uPrice = d.price !== undefined && d.price !== null && d.price !== '' 
        ? Number(d.price) 
        : masterPrice;
      const subT = Number(d.quantity || 0) * uPrice;
      dispC += subT;
      const key = `${d.location || 'その他処分場'} (${d.item || '品目未指定'})`;
      if (!disposalBreakdown[key]) {
        disposalBreakdown[key] = { quantity: 0, price: uPrice, total: 0 };
      }
      disposalBreakdown[key].quantity += Number(d.quantity || 0);
      disposalBreakdown[key].total += subT;
    });

    let scrapC = 0;
    const scrapBreakdown: {[key: string]: {quantity: number, price: number, total: number}} = {};
    (r.scraps || []).forEach((sc: any) => {
      const masterPrice = (settings.scrapLocations || []).find((s: any) => s.location === sc.location && s.item === sc.item)?.price || 0;
      // 日報データ側に保存されている単価があれば優先し、なければマスタを見る
      const uPrice = sc.price !== undefined && sc.price !== null && sc.price !== '' 
        ? Number(sc.price) 
        : masterPrice;
      const subT = Number(sc.quantity || 0) * uPrice;
      scrapC += subT;
      const scrapKey = `${sc.location || 'その他スクラップ場'} (${sc.item || '品目未指定'})`;
      if (!scrapBreakdown[scrapKey]) {
        scrapBreakdown[scrapKey] = { quantity: 0, price: uPrice, total: 0 };
      }
      scrapBreakdown[scrapKey].quantity += Number(sc.quantity || 0);
      scrapBreakdown[scrapKey].total += subT;
    });

    const rDateNorm = (r.date || '').replace(/\//g, '-');
    const parts = rDateNorm.split('-');
    let fuelCost = Number(r.fuel || 0);
    if (parts.length >= 2) {
      const ym = `${parts[0]}-${parts[1].padStart(2, '0')}`;
      const locFuelPrices = fuelUnitPrices[r.location] || {};
      const unitPrice = locFuelPrices[ym];
      if (unitPrice !== '' && unitPrice !== undefined) {
        fuelCost = Number(r.fuel || 0) * Number(unitPrice);
      }
    }

    const eC = Number(r.etcPrice || 0);
    const pC = Number(r.parkingPrice || 0);
    const oC = Number(r.otherPrice || 0);

    return { lCost, subCost, leaseC, otherLeaseC, ownMachineC, vehicleC, dispC, disposalBreakdown, fC: fuelCost, rawFuel: Number(r.fuel || 0), eC, pC, oC, scrapC, scrapBreakdown };
  };

  const calculateCosts = (locName: string) => {
    const locMapped = reports.filter(r => r.location === locName);
    let calcLabor = 0, calcSub = 0, calcLease = 0, calcOtherLease = 0, calcOwnMachine = 0, calcVehicle = 0, calcDisp = 0;
    let calcFuel = 0, calcEtc = 0, calcParking = 0, calcOther = 0, scrapTotal = 0;
    const aggregatedDisposalBreakdown: {[key: string]: {quantity: number, price: number, total: number}} = {};
    const aggregatedScrapBreakdown: {[key: string]: {quantity: number, price: number, total: number}} = {};
    
    locMapped.forEach(r => {
      const dc = calculateReportDailyCost(r);
      calcLabor += dc.lCost; 
      calcSub += dc.subCost; 
      calcLease += dc.leaseC; 
      calcOtherLease += dc.otherLeaseC;
      calcOwnMachine += dc.ownMachineC;
      calcVehicle += dc.vehicleC;
      calcDisp += dc.dispC;

      Object.entries(dc.disposalBreakdown).forEach(([key, data]) => {
        if (!aggregatedDisposalBreakdown[key]) {
          aggregatedDisposalBreakdown[key] = { quantity: 0, price: data.price, total: 0 };
        }
        aggregatedDisposalBreakdown[key].quantity += data.quantity;
        aggregatedDisposalBreakdown[key].total += data.total;
      });

      Object.entries(dc.scrapBreakdown).forEach(([key, data]) => {
        if (!aggregatedScrapBreakdown[key]) {
          aggregatedScrapBreakdown[key] = { quantity: 0, price: data.price, total: 0 };
        }
        aggregatedScrapBreakdown[key].quantity += data.quantity;
        aggregatedScrapBreakdown[key].total += data.total;
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
    const matchedLocObj = (settings.locations || []).find((l: any) => (typeof l === 'string' ? l : l.name) === locName);
    const baseContractPrice = matchedLocObj?.price || 0;
    const isFinished = typeof matchedLocObj === 'object' ? matchedLocObj?.isFinished || false : false;
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
      isFinished,
      profit, 
      reportsWithIndex: locMapped 
    };
  };

  const downloadLocationCSV = (locName: string) => {
    const locReports = reports.filter(r => r.location === locName);
    const headers = ["日付", "現場名", "職長", "作業者", "外注", "リース(重機等)", "その他リース", "自社重機", "車両", "軽油L", "ETC", "駐車場代", "雑費名", "雑費金額", "作業内容"];
    const rows = locReports.map(r => [
      r.date, r.location, r.manager, (r.workers || []).join('/'), 
      (r.subcontractors || []).map((s:any)=>`${s.company}(${s.task}:${s.count}人)`).join('/'),
      [...(r.machines || []), ...(r.leaseHeavy || []), ...(r.leaseAttach || []), ...(r.leaseOther || []), ...(r.mokCustomMachines || []).map((m:any)=>`${m.name}(${m.count}個)`)].join('/'),
      (r.otherLeases || []).map((ol:any)=>`${ol.company}(${ol.name}:${ol.count}個)`).join('/'),
      (r.ownMachines || []).join('/'),
      (r.vehicles || []).join('/'), 
      r.fuel || 0, r.etcPrice || 0, r.parkingPrice || 0,
      r.otherItem || '', r.otherPrice || 0, `"${(r.workDescription || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `${locName}_日報データ.csv`; link.click();
  };

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
          <h1 className="text-2xl md:text-3xl font-black text-slate-800">日報システム</h1>
          <p className="text-sm md:text-base text-slate-400 font-medium">株式会社大和</p>
        </div>
        
        <div className="space-y-6 pt-2">
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
  const locList = (settings.locations || []).map((l:any) => typeof l === 'string' ? {name: l, price: 0, isFinished: false} : l);

  const allStaffNames = Array.from(new Set([
    ...(settings.managers || []).map((m: any) => m.name),
    ...(settings.workers || []).map((w: any) => w.name)
  ])).filter(Boolean);

  const calendarDays = getDaysInMonth(calendarYearMonth);

  const modalReportYearMonths = modalLocation ? Array.from(new Set(
    reports
      .filter(r => r.location === modalLocation)
      .map(r => {
        const norm = (r.date || '').replace(/\//g, '-');
        const parts = norm.split('-');
        if (parts.length >= 2) return `${parts[0]}-${parts[1].padStart(2, '0')}`;
        return null;
      })
      .filter(Boolean)
  )).sort() : [];

  return (
    <div className="p-3 md:p-10 bg-slate-100 min-h-screen space-y-4 md:space-y-8 w-full max-w-[1800px] mx-auto font-sans text-slate-800 text-sm md:text-lg relative">
      
      {showSaveToast && (
        <div className="fixed top-6 right-6 z-50 bg-emerald-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-bounce font-bold text-base md:text-lg">
          <span className="text-2xl">✨</span>
          <span>日報の編集を保存しました！</span>
        </div>
      )}

      {/* ヘッダー */}
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
            🔄 最新の状態にする
          </button>
          <button onClick={() => { setIsAuthed(false); setAuthRole(null); }} className="flex-1 md:flex-none bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2.5 rounded-xl font-bold text-sm transition">
            ログアウト
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
        
        <div className="block md:hidden space-y-3">
          {locList.map((loc:any) => {
            const c = calculateCosts(loc.name);
            return (
              <div key={loc.name} className={`p-3.5 rounded-2xl border space-y-2.5 shadow-2xs ${c.isFinished ? 'bg-slate-100 border-slate-300' : 'bg-slate-50/80 border-slate-200'}`}>
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-bold text-base leading-snug ${c.isFinished ? 'text-slate-600' : 'text-blue-600'}`}>{loc.name}</span>
                      {c.isFinished && (
                        <span className="bg-slate-500 text-white text-[10px] px-2 py-0.5 rounded-md font-bold shadow-2xs">📁 完了済</span>
                      )}
                    </div>
                    {c.isFinished ? (
                      <button 
                        onClick={() => toggleLocationFinished(loc.name)} 
                        className="text-xs text-slate-500 hover:text-slate-800 underline font-medium"
                      >
                        未完了に戻す
                      </button>
                    ) : (
                      <button 
                        onClick={() => toggleLocationFinished(loc.name)} 
                        className="bg-white hover:bg-slate-100 text-slate-600 text-[11px] px-2 py-1 rounded-lg font-bold border border-slate-300 transition"
                      >
                        完了にする
                      </button>
                    )}
                  </div>
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

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse table-fixed">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 text-base font-bold uppercase tracking-wider">
                <th className="py-4 px-4 w-[30%]">現場名</th>
                <th className="py-4 px-4 w-[11%]">請負金額</th>
                <th className="py-4 px-4 w-[9%]">稼働日数</th>
                <th className="py-4 px-4 w-[11%]">合計経費</th>
                <th className="py-4 px-4 w-[11%]">粗利</th>
                <th className="py-4 px-4 w-[12%] text-center">ステータス / 完了</th>
                <th className="py-4 px-4 w-[16%] text-center">アクション</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-lg font-medium">
              {locList.map((loc:any) => {
                const c = calculateCosts(loc.name);
                return (
                  <tr key={loc.name} className={`transition ${c.isFinished ? 'bg-slate-50/80' : 'hover:bg-slate-50/80'}`}>
                    <td className="py-5 px-4 align-middle">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-bold text-lg break-all leading-snug ${c.isFinished ? 'text-slate-600' : 'text-blue-600'}`}>{loc.name}</span>
                        {c.isFinished && (
                          <span className="bg-slate-600 text-white px-2.5 py-1 rounded-md text-xs font-bold shadow-2xs shrink-0">📁 完了済</span>
                        )}
                      </div>
                    </td>
                    <td className="py-5 px-4 text-slate-700 font-bold align-middle">¥{c.contractPrice.toLocaleString()}</td>
                    <td className="py-5 px-4 text-slate-700 align-middle">{c.days} 日</td>
                    <td className="py-5 px-4 text-slate-900 font-bold align-middle">¥{c.total.toLocaleString()}</td>
                    <td className={`py-5 px-4 font-black text-xl align-middle ${c.profit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                      ¥{c.profit.toLocaleString()}
                    </td>
                    <td className="py-5 px-4 text-center align-middle">
                      {c.isFinished ? (
                        <div className="flex items-center justify-center">
                          {authRole !== 'viewer' && (
                            <button onClick={() => toggleLocationFinished(loc.name)} className="text-xs text-slate-500 hover:text-slate-800 underline font-medium">未完了に戻す</button>
                          )}
                        </div>
                      ) : (
                        authRole !== 'viewer' ? (
                          <button onClick={() => toggleLocationFinished(loc.name)} className="bg-white hover:bg-slate-100 text-slate-600 px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-300 shadow-2xs transition">
                            完了にする
                          </button>
                        ) : (
                          <span className="text-slate-400 text-sm font-medium">進行中</span>
                        )
                      )}
                    </td>
                    <td className="py-5 px-4 text-center align-middle">
                      <div className="flex items-center justify-center gap-2 flex-nowrap">
                        <button onClick={() => setModalLocation(loc.name)} className="bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-600 px-3 py-2.5 rounded-xl font-bold transition shadow-sm text-sm whitespace-nowrap">
                          詳細分析 →
                        </button>
                        {authRole !== 'viewer' && (
                          <button onClick={() => downloadLocationCSV(loc.name)} className="bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-600 px-3 py-2.5 rounded-xl font-bold transition shadow-sm text-sm whitespace-nowrap">
                            CSV
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 📅 出勤確認表 */}
      <div className="bg-white p-4 md:p-8 rounded-2xl md:rounded-3xl shadow-sm border border-slate-100 space-y-4">
        <div className="flex justify-between items-center flex-wrap gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg md:text-2xl font-black text-slate-900">📅 出勤確認表（スタッフ別カレンダー）</h2>
            <p className="text-xs md:text-sm text-slate-400 mt-0.5">どの日に・誰がどの現場に入っていたかチェックできます</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {showCalendarSection && (
              <div className="flex items-center gap-2">
                <span className="text-xs md:text-sm font-bold text-slate-600">表示月:</span>
                <input 
                  type="month" 
                  value={calendarYearMonth} 
                  onChange={e => setCalendarYearMonth(e.target.value)}
                  className="p-2.5 border border-slate-300 rounded-xl text-sm font-bold bg-slate-50 focus:bg-white focus:outline-none"
                />
              </div>
            )}
            <button 
              onClick={() => setShowCalendarSection(!showCalendarSection)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-bold text-sm transition"
            >
              {showCalendarSection ? '📅 出勤確認表を隠す ▲' : '📅 出勤確認表を開く ▼'}
            </button>
          </div>
        </div>

        {showCalendarSection && (
          <div className="pt-2 animate-fadeIn">
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pt-2 animate-fadeIn">
              {[
                { title: "🏢 現場名一覧", key: "locations", nameKey: "name", priceKey: "price", addForm: ['lName', 'lPrice'], placeholders: ["新しい現場名", "請負金額"], type: "locations" },
                { title: "👤 職長一覧", key: "managers", nameKey: "name", priceKey: "price", addForm: ['mName', 'mPrice'], placeholders: ["職長名", "単価不要"], type: "managers", isNoPrice: true },
                { title: "👥 作業メンバー＆日額単価", key: "workers", nameKey: "name", priceKey: "price", addForm: ['wName', 'wPrice'], placeholders: ["メンバー名", "日額"], type: "workers" },
                { title: "🏢 外注会社・作業内容・単価", key: "subcontractors", isSub: true },
                { title: "🚚 自社車両＆日額単価", key: "vehicles", nameKey: "name", priceKey: "price", addForm: ['vName', 'vPrice'], placeholders: ["車両名", "日額"], type: "vehicles" },
                { title: "🚜 自社重機＆日額単価", key: "companyMachines", nameKey: "name", priceKey: "price", addForm: ['cmName', 'cmPrice'], placeholders: ["重機名", "日額"], type: "companyMachines" },
                { title: "🚜 リース：重機＆日額単価", key: "leaseHeavy", nameKey: "name", priceKey: "price", addForm: ['lhName', 'lhPrice'], placeholders: ["重機名", "日額"], type: "leaseHeavy" },
                { title: "⚙️ リース：アタッチメント＆日額単価", key: "leaseAttach", nameKey: "name", priceKey: "price", addForm: ['laName', 'laPrice'], placeholders: ["アタッチメント名", "日額"], type: "leaseAttach" },
                { title: "🛠️ リース：その他 機械・機器＆日額単価", key: "leaseOther", nameKey: "name", priceKey: "price", addForm: ['loName', 'loPrice'], placeholders: ["機械・機器名", "日額"], type: "leaseOther" },
                { title: "🗑️ 処分場マスタ＆単価", key: "disposalLocations", isDisp: true },
                { title: "♻️ スクラップマスタ＆単価", key: "scrapLocations", isScrap: true },
              ].map((sec, idx) => (
                <div key={idx} className="bg-slate-50 p-4 md:p-6 rounded-2xl border border-slate-200/90 space-y-4 flex flex-col justify-between shadow-xs">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center gap-2">
                      <h3 className="font-bold text-base md:text-lg text-orange-600 tracking-wider truncate">{sec.title}</h3>
                      <button 
                        onClick={() => saveMaster(sec.key)} 
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs md:text-sm px-3.5 py-2 rounded-xl font-bold shadow-sm transition shrink-0"
                      >
                        💾 保存
                      </button>
                    </div>
                    
                    {sec.isSub ? (
                      <div className="space-y-3 bg-white p-3.5 rounded-2xl border border-slate-200">
                        <input type="text" placeholder="外注会社名" value={form.subComp || ''} className="w-full p-3 border border-slate-300 rounded-xl text-sm md:text-base bg-slate-50 focus:bg-white focus:outline-none font-medium" onChange={e=>setForm({...form, subComp: e.target.value})} />
                        <div className="grid grid-cols-12 gap-2">
                          <input type="text" placeholder="作業内容" value={form.subTask || ''} className="col-span-7 p-3 border border-slate-300 rounded-xl text-sm md:text-base bg-slate-50 focus:bg-white focus:outline-none font-medium" onChange={e=>setForm({...form, subTask: e.target.value})} />
                          <input type="number" placeholder="単価" value={form.subPrice || ''} className="col-span-5 p-3 border border-slate-300 rounded-xl text-sm md:text-base bg-slate-50 focus:bg-white focus:outline-none font-medium" onChange={e=>setForm({...form, subPrice: e.target.value})} />
                        </div>
                        <button onClick={() => addMaster('subcontractors', {company: form.subComp, task: form.subTask, price: Number(form.subPrice)||0}, ['subComp', 'subTask', 'subPrice'])} className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3 rounded-xl font-bold text-sm md:text-base shadow-sm transition text-center">＋ 追加</button>
                      </div>
                    ) : sec.isDisp || sec.isScrap ? (
                      <div className="space-y-3 bg-white p-3.5 rounded-2xl border border-slate-200">
                        <input type="text" placeholder={sec.isDisp ? "処分場名" : "スクラップ場名"} value={form[sec.isDisp ? 'dLoc' : 'sLoc'] || ''} className="w-full p-3 border border-slate-300 rounded-xl text-sm md:text-base bg-slate-50 focus:bg-white focus:outline-none font-medium" onChange={e=>setForm({...form, [sec.isDisp ? 'dLoc' : 'sLoc']: e.target.value})} />
                        <div className="grid grid-cols-12 gap-2">
                          <input type="text" placeholder="品目" value={form[sec.isDisp ? 'dItem' : 'sItem'] || ''} className="col-span-4 p-3 border border-slate-300 rounded-xl text-sm md:text-base bg-slate-50 focus:bg-white focus:outline-none font-medium" onChange={e=>setForm({...form, [sec.isDisp ? 'dItem' : 'sItem']: e.target.value})} />
                          <input type="text" placeholder="単位" value={form[sec.isDisp ? 'dUnit' : 'sUnit'] || ''} className="col-span-3 p-3 border border-slate-300 rounded-xl text-sm md:text-base bg-slate-50 focus:bg-white focus:outline-none font-medium" onChange={e=>setForm({...form, [sec.isDisp ? 'dUnit' : 'sUnit']: e.target.value})} />
                          <input type="number" placeholder="単価" value={form[sec.isDisp ? 'dPrice' : 'sPrice'] || ''} className="col-span-5 p-3 border border-slate-300 rounded-xl text-sm md:text-base bg-slate-50 focus:bg-white focus:outline-none font-medium" onChange={e=>setForm({...form, [sec.isDisp ? 'dPrice' : 'sPrice']: e.target.value})} />
                        </div>
                        <button onClick={() => addMaster(sec.key, {location: form[sec.isDisp ? 'dLoc' : 'sLoc'], item: form[sec.isDisp ? 'dItem' : 'sItem'], unit: form[sec.isDisp ? 'dUnit' : 'sUnit'] || 't', price: Number(form[sec.isDisp ? 'dPrice' : 'sPrice'])||0}, sec.isDisp ? ['dLoc', 'dItem', 'dUnit', 'dPrice'] : ['sLoc', 'sItem', 'sUnit', 'sPrice'])} className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3 rounded-xl font-bold text-sm md:text-base shadow-sm transition text-center">＋ 追加</button>
                      </div>
                    ) : sec.isNoPrice ? (
                      <div className="space-y-3 bg-white p-3.5 rounded-2xl border border-slate-200">
                        <input type="text" placeholder={sec.placeholders[0]} value={form[sec.addForm[0]] || ''} className="w-full p-3 border border-slate-300 rounded-xl text-sm md:text-base bg-slate-50 focus:bg-white focus:outline-none font-medium" onChange={e=>setForm({...form, [sec.addForm[0]]: e.target.value})} />
                        <button onClick={() => addMaster(sec.key, {name: form[sec.addForm[0]]}, [sec.addForm[0]])} className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3 rounded-xl font-bold text-sm md:text-base shadow-sm transition text-center">＋ 追加</button>
                      </div>
                    ) : (
                      <div className="space-y-3 bg-white p-3.5 rounded-2xl border border-slate-200">
                        <input type="text" placeholder={sec.placeholders[0]} value={form[sec.addForm[0]] || ''} className="w-full p-3 border border-slate-300 rounded-xl text-sm md:text-base bg-slate-50 focus:bg-white focus:outline-none font-medium" onChange={e=>setForm({...form, [sec.addForm[0]]: e.target.value})} />
                        <input type="number" placeholder={sec.placeholders[1]} value={form[sec.addForm[1]] || ''} className="w-full p-3 border border-slate-300 rounded-xl text-sm md:text-base bg-slate-50 focus:bg-white focus:outline-none font-medium" onChange={e=>setForm({...form, [sec.addForm[1]]: e.target.value})} />
                        <button onClick={() => addMaster(sec.key, {name: form[sec.addForm[0]], price: Number(form[sec.addForm[1]])||0, isFinished: false}, sec.addForm)} className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3 rounded-xl font-bold text-sm md:text-base shadow-sm transition text-center">＋ 追加</button>
                      </div>
                    )}
                  </div>

                  {/* 登録済みリスト */}
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 bg-white border border-slate-300 rounded-2xl p-3 space-y-3 mt-4">
                    {(settings[sec.key] || []).length === 0 ? (
                      <p className="text-sm text-slate-400 text-center py-4">登録データがありません</p>
                    ) : (
                      (settings[sec.key] || []).map((item:any, idx:number)=>(
                        <div key={idx} className="py-3 flex flex-col gap-2.5 bg-slate-50/70 p-3 rounded-xl border border-slate-200 shadow-2xs">
                          <div className="flex justify-between items-center gap-2">
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button type="button" onClick={() => moveMasterItem(sec.key, idx, 'up')} disabled={idx === 0} className="w-7 h-7 bg-slate-200 hover:bg-slate-300 disabled:opacity-30 rounded-lg text-xs font-bold flex items-center justify-center transition" title="上へ">▲</button>
                              <button type="button" onClick={() => moveMasterItem(sec.key, idx, 'down')} disabled={idx === (settings[sec.key] || []).length - 1} className="w-7 h-7 bg-slate-200 hover:bg-slate-300 disabled:opacity-30 rounded-lg text-xs font-bold flex items-center justify-center transition" title="下へ">▼</button>
                            </div>
                            <div className="flex items-center gap-2">
                              {sec.key === 'locations' && (
                                <button 
                                  type="button" 
                                  onClick={() => toggleLocationFinished(typeof item === 'string' ? item : item.name)}
                                  className={`text-xs px-2.5 py-1 rounded-lg font-bold transition ${item.isFinished ? 'bg-slate-600 text-white' : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'}`}
                                >
                                  {item.isFinished ? '📁 完了済' : '完了にする'}
                                </button>
                              )}
                              <button type="button" onClick={()=>deleteMaster(sec.key, idx)} className="text-rose-600 hover:text-rose-800 font-bold text-xs px-2.5 py-1 bg-rose-50 hover:bg-rose-100 rounded-lg transition">削除</button>
                            </div>
                          </div>

                          {sec.isSub ? (
                            <div className="space-y-2">
                              <div className="grid grid-cols-2 gap-2">
                                <input type="text" value={item.company || ''} onChange={(e)=>updateItemField(sec.key, idx, 'company', e.target.value)} placeholder="会社名" className="p-2.5 border border-slate-300 rounded-xl text-sm md:text-base font-bold bg-white" />
                                <input type="text" value={item.task || ''} onChange={(e)=>updateItemField(sec.key, idx, 'task', e.target.value)} placeholder="作業内容" className="p-2.5 border border-slate-300 rounded-xl text-sm md:text-base font-bold bg-white" />
                              </div>
                              <div className="flex items-center justify-end gap-1.5 pt-1">
                                <span className="text-slate-500 font-bold text-sm">¥</span>
                                <input type="number" value={item.price || 0} onChange={(e)=>updateItemField(sec.key, idx, 'price', e.target.value)} className="w-32 p-2.5 border border-slate-300 rounded-xl text-right text-sm md:text-base font-black bg-white text-slate-900" placeholder="単価" />
                              </div>
                            </div>
                          ) : sec.isDisp || sec.isScrap ? (
                            <div className="space-y-2">
                              <div className="grid grid-cols-3 gap-2">
                                <input type="text" value={item.location || ''} onChange={(e)=>updateItemField(sec.key, idx, 'location', e.target.value)} placeholder="場所名" className="p-2.5 border border-slate-300 rounded-xl text-sm md:text-base font-bold bg-white" />
                                <input type="text" value={item.item || ''} onChange={(e)=>updateItemField(sec.key, idx, 'item', e.target.value)} placeholder="品目" className="p-2.5 border border-slate-300 rounded-xl text-sm md:text-base font-bold bg-white" />
                                <input type="text" value={item.unit || ''} onChange={(e)=>updateItemField(sec.key, idx, 'unit', e.target.value)} placeholder="単位" className="p-2.5 border border-slate-300 rounded-xl text-sm md:text-base font-bold bg-white" />
                              </div>
                              <div className="flex items-center justify-end gap-1.5 pt-1">
                                <span className="text-slate-500 font-bold text-sm">¥</span>
                                <input type="number" value={item.price || 0} onChange={(e)=>updateItemField(sec.key, idx, 'price', e.target.value)} className="w-32 p-2.5 border border-slate-300 rounded-xl text-right text-sm md:text-base font-black bg-white text-slate-900" placeholder="単価" />
                              </div>
                            </div>
                          ) : sec.isNoPrice ? (
                            <input type="text" value={item.name || ''} onChange={(e)=>updateItemField(sec.key, idx, 'name', e.target.value)} placeholder="名称" className="w-full p-2.5 border border-slate-300 rounded-xl text-sm md:text-base font-bold bg-white" />
                          ) : (
                            <input type="text" value={item.name || ''} onChange={(e)=>updateItemField(sec.key, idx, 'name', e.target.value)} placeholder="名称" className="w-full p-2.5 border border-slate-300 rounded-xl text-sm md:text-base font-bold bg-white" />
                          )}

                          {!sec.isNoPrice && !sec.isSub && !sec.isDisp && !sec.isScrap && (
                            <div className="flex items-center justify-end gap-1.5 pt-1">
                              <span className="text-slate-500 font-bold text-sm">¥</span>
                              <input type="number" value={item.price || 0} onChange={(e)=>updateItemField(sec.key, idx, 'price', e.target.value)} className="w-32 p-2.5 border border-slate-300 rounded-xl text-right text-sm md:text-base font-black bg-white text-slate-900" placeholder="単価/日額" />
                            </div>
                          )}
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
      <div className="bg-white p-4 md:p-8 rounded-2xl md:rounded-3xl shadow-sm border border-slate-100 space-y-6">
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredReports.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6 col-span-full">日報データはありません</p>
          ) : (
            filteredReports.map((r, i) => (
              <div key={r.id || r._id || i} className="p-5 bg-slate-50/90 rounded-3xl border border-slate-200/90 space-y-3.5 shadow-xs flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex justify-between items-start gap-2 border-b border-slate-200/80 pb-3">
                    <span className="font-bold text-slate-500 text-xs">📅 {r.date}</span>
                    <span className="font-black text-blue-700 text-sm md:text-base bg-blue-50 px-3 py-1 rounded-xl border border-blue-100 text-right leading-snug break-words max-w-[70%]">
                      {r.location}
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-xs md:text-sm text-slate-700 pt-1">
                    <div>
                      <span className="text-slate-400 block text-[11px] font-semibold mb-0.5">職長 / 作業者</span>
                      <span className="font-bold text-slate-900">
                        👤 {r.manager || '-'} / {(r.workers || []).join(', ') || '-'}
                      </span>
                    </div>

                    {(r.subcontractors || []).length > 0 && (
                      <div>
                        <span className="text-orange-600 block text-[11px] font-semibold mb-0.5">外注</span>
                        <span className="font-bold text-orange-700">
                          {(r.subcontractors || []).map((s:any)=>`${s.company} (${s.task}: ${s.count}人)`).join(', ')}
                        </span>
                      </div>
                    )}

                    <div>
                      <span className="text-slate-400 block text-[11px] font-semibold mb-0.5">重機 / 車両 / リース</span>
                      <span className="font-medium text-slate-800">
                        🚜 {[
                          ...(r.machines || []), 
                          ...(r.leaseHeavy || []), 
                          ...(r.leaseAttach || []), 
                          ...(r.leaseOther || []), 
                          ...(r.mokCustomMachines || []).map((m:any)=>`${m.name}(${m.count}個)`),
                          ...(r.otherLeases || []).map((ol:any)=>`${ol.company}(${ol.name}:${ol.count}個)`),
                          ...(r.ownMachines || []), 
                          ...(r.vehicles || [])
                        ].join(', ') || '-'}
                      </span>
                    </div>

                    {r.workDescription && (
                      <div className="bg-white p-3 rounded-2xl border border-slate-200/80">
                        <span className="text-slate-400 block text-[11px] font-semibold mb-0.5">作業内容</span>
                        <span className="text-slate-800 text-xs leading-relaxed whitespace-pre-wrap">{r.workDescription}</span>
                      </div>
                    )}
                  </div>
                </div>

                {authRole === 'admin' && (
                  <div className="flex gap-2 pt-3 border-t border-slate-200/80">
                    <button onClick={() => setEditingReport({ ...r })} className="flex-1 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-600 py-2.5 rounded-xl font-bold transition text-xs shadow-2xs">編集</button>
                    <button onClick={() => handleDeleteReport(r, i)} className="flex-1 bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-600 py-2.5 rounded-xl font-bold transition text-xs shadow-2xs">削除</button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* ✏️ 日報編集モーダル */}
      {editingReport && authRole === 'admin' && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-md flex items-center justify-center p-3 md:p-6 z-50 animate-fadeIn">
          <form onSubmit={handleUpdateReport} className="bg-white rounded-[32px] w-full max-w-4xl p-6 md:p-10 max-h-[92vh] overflow-y-auto space-y-8 shadow-2xl border border-slate-100">
            
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
            
            <div className="space-y-6">
              <div className="bg-slate-50/80 p-5 md:p-6 rounded-3xl border border-slate-200/60 space-y-4">
                <h3 className="text-sm font-black text-slate-600 uppercase tracking-wider">📌 基本情報</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1.5">日付</label>
                    <input type="text" value={editingReport.date || ''} onChange={e=>setEditingReport({...editingReport, date: e.target.value})} className="w-full p-3.5 border border-slate-300 rounded-2xl text-sm bg-white font-bold text-slate-800 shadow-2xs" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1.5">現場名</label>
                    <select value={editingReport.location || ''} onChange={e=>setEditingReport({...editingReport, location: e.target.value})} className="w-full p-3.5 border border-slate-300 rounded-2xl text-sm bg-white font-bold text-blue-600 shadow-2xs">
                      {locList.map((l:any)=><option key={l.name} value={l.name}>{l.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1.5">職長</label>
                    <select value={editingReport.manager || ''} onChange={e=>setEditingReport({...editingReport, manager: e.target.value})} className="w-full p-3.5 border border-slate-300 rounded-2xl text-sm bg-white font-bold text-slate-800 shadow-2xs">
                      <option value="">選択なし</option>
                      {(settings.managers || []).map((m:any)=><option key={m.name} value={m.name}>{m.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* 作業メンバー */}
              <div className="bg-slate-50/80 p-5 md:p-6 rounded-3xl border border-slate-200/60 space-y-4">
                <h3 className="text-sm font-black text-slate-600 uppercase tracking-wider">👥 作業メンバー</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                  {(settings.workers || []).map((w: any) => {
                    const checked = (editingReport.workers || []).includes(w.name);
                    return (
                      <label key={w.name} className={`flex items-center gap-2.5 p-3 rounded-2xl border cursor-pointer text-xs md:text-sm font-medium transition shadow-2xs ${checked ? 'bg-orange-50 border-orange-300 text-orange-900 font-bold' : 'bg-white border-slate-200'}`}>
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

              {/* 自社車両 */}
              <div className="bg-slate-50/80 p-5 md:p-6 rounded-3xl border border-slate-200/60 space-y-4">
                <h3 className="text-sm font-black text-slate-600 uppercase tracking-wider">🚚 自社車両</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                  {(settings.vehicles || []).map((v: any) => {
                    const checked = (editingReport.vehicles || []).includes(v.name);
                    return (
                      <label key={v.name} className={`flex items-center gap-2.5 p-3 rounded-2xl border cursor-pointer text-xs md:text-sm font-medium transition shadow-2xs ${checked ? 'bg-blue-50 border-blue-300 text-blue-900 font-bold' : 'bg-white border-slate-200'}`}>
                        <input 
                          type="checkbox" 
                          checked={checked} 
                          onChange={e => {
                            const current = editingReport.vehicles || [];
                            const updated = e.target.checked ? [...current, v.name] : current.filter((x: string) => x !== v.name);
                            setEditingReport({ ...editingReport, vehicles: updated });
                          }}
                          className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                        />
                        <span className="truncate">{v.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* 自社重機 */}
              <div className="bg-slate-50/80 p-5 md:p-6 rounded-3xl border border-slate-200/60 space-y-4">
                <h3 className="text-sm font-black text-slate-600 uppercase tracking-wider">🚜 自社重機</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                  {(settings.companyMachines || []).map((cm: any) => {
                    const checked = (editingReport.ownMachines || []).includes(cm.name);
                    return (
                      <label key={cm.name} className={`flex items-center gap-2.5 p-3 rounded-2xl border cursor-pointer text-xs md:text-sm font-medium transition shadow-2xs ${checked ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold' : 'bg-white border-slate-200'}`}>
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

              <div className="bg-slate-50/80 p-5 md:p-6 rounded-3xl border border-slate-200/60 space-y-4">
                <h3 className="text-sm font-black text-slate-600 uppercase tracking-wider">💰 燃料・経費</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1.5">軽油 (L)</label>
                    <input type="number" value={editingReport.fuel || 0} onChange={e=>setEditingReport({...editingReport, fuel: e.target.value})} className="w-full p-3.5 border border-slate-300 rounded-2xl text-sm bg-white font-bold text-right shadow-2xs" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1.5">高速代・ETC (円)</label>
                    <input type="number" value={editingReport.etcPrice || 0} onChange={e=>setEditingReport({...editingReport, etcPrice: e.target.value})} className="w-full p-3.5 border border-slate-300 rounded-2xl text-sm bg-white font-bold text-right shadow-2xs" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1.5">駐車場代 (円)</label>
                    <input type="number" value={editingReport.parkingPrice || 0} onChange={e=>setEditingReport({...editingReport, parkingPrice: e.target.value})} className="w-full p-3.5 border border-slate-300 rounded-2xl text-sm bg-white font-bold text-right shadow-2xs" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1.5">その他雑費 (円)</label>
                    <input type="number" value={editingReport.otherPrice || 0} onChange={e=>setEditingReport({...editingReport, otherPrice: e.target.value})} className="w-full p-3.5 border border-slate-300 rounded-2xl text-sm bg-white font-bold text-right shadow-2xs" />
                  </div>
                </div>
              </div>

              <div className="bg-slate-50/80 p-5 md:p-6 rounded-3xl border border-slate-200/60 space-y-4">
                <h3 className="text-sm font-black text-slate-600 uppercase tracking-wider">📝 作業内容メモ</h3>
                <textarea rows={3} value={editingReport.workDescription || ''} onChange={e=>setEditingReport({...editingReport, workDescription: e.target.value})} className="w-full p-4 border border-slate-300 rounded-2xl text-sm bg-white font-medium shadow-2xs leading-relaxed" placeholder="本日の作業内容や特記事項を入力..." />
              </div>

            </div>

            <div className="flex gap-4 pt-4 border-t border-slate-100">
              <button type="submit" className="flex-1 bg-orange-600 hover:bg-orange-700 text-white py-4 rounded-2xl font-black text-base md:text-lg shadow-lg shadow-orange-500/20 transition">
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

              {/* ⛽ 月ごとの軽油単価設定エリア */}
              <div className="bg-orange-50/80 p-4 md:p-5 rounded-2xl border border-orange-200 space-y-3">
                <div className="font-black text-orange-900 text-sm md:text-base">⛽ 月別 1Lあたりの軽油単価設定</div>
                <p className="text-xs text-orange-700">月をまたぐ現場の場合、月ごとの1L単価を入力すると下の「燃料代(軽油)」に自動反映されます。</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-1">
                  {modalReportYearMonths.length === 0 ? (
                    <p className="text-xs text-slate-500">この現場の日報データがまだありません</p>
                  ) : (
                    modalReportYearMonths.map(ym => {
                      const currentPrice = fuelUnitPrices[modalLocation]?.[ym] ?? '';
                      return (
                        <div key={ym} className="bg-white p-3 rounded-xl border border-orange-200 space-y-1 shadow-2xs">
                          <label className="text-xs font-bold text-slate-600 block">{ym} の単価(1L)</label>
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-slate-400">¥</span>
                            <input 
                              type="number" 
                              value={currentPrice} 
                              onChange={e => handleFuelUnitPriceChange(modalLocation, ym, e.target.value)}
                              placeholder="例: 145"
                              className="w-full p-2 border border-slate-300 rounded-lg text-sm font-bold text-right"
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
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
                  { key: 'fuel', label: '燃料代 (軽油・月別単価計算)', val: costOverrides[modalLocation]?.fuel ?? modalData.fuelCost },
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
                            value={costOverrides[modalLocation]?.[item.key] ?? item.val}
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
                    </div>
                  );
                })}

                {/* スクラップ売却計のUI */}
                <div className="bg-emerald-50 p-4 md:p-6 rounded-2xl border border-emerald-200 flex flex-col gap-2.5 col-span-full shadow-2xs">
                  <div className="flex justify-between items-center flex-wrap gap-3">
                    <span className="text-emerald-900 font-bold text-base md:text-lg">♻️ スクラップ売却計</span>
                    <div className="flex items-center gap-3">
                      <span className="font-black text-emerald-800 text-xl md:text-2xl">+ ¥{modalData.scrapTotal.toLocaleString()}</span>
                      <button onClick={() => setShowScrapModal(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs md:text-sm px-3.5 py-2 rounded-xl font-bold shadow-xs transition">
                        🔍 内訳を確認
                      </button>
                    </div>
                  </div>
                </div>
              </div>
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
              {Object.keys(modalData.aggregatedDisposalBreakdown).length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">処分費の明細データはありません</p>
              ) : (
                Object.entries(modalData.aggregatedDisposalBreakdown).map(([key, data]) => (
                  <div key={key} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex justify-between items-center gap-4">
                    <div className="space-y-1">
                      <div className="font-bold text-slate-800 text-sm md:text-base">{key}</div>
                      <div className="text-xs text-slate-500">数量: {data.quantity} / 単価: ¥{data.price.toLocaleString()}</div>
                    </div>
                    <div className="font-black text-slate-900 text-base md:text-lg shrink-0">
                      ¥{data.total.toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ♻️ スクラップ詳細モーダル */}
      {showScrapModal && modalLocation && modalData && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-3 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-2xl p-5 md:p-8 max-h-[85vh] overflow-y-auto space-y-5 shadow-2xl border border-slate-100">
            <div className="flex justify-between items-center border-b border-emerald-200 pb-3">
              <h3 className="text-lg md:text-2xl font-black text-slate-900">♻️ {modalLocation} - スクラップ売却内訳</h3>
              <button onClick={() => setShowScrapModal(false)} className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-xl text-xs md:text-base font-bold transition">閉じる</button>
            </div>
            
            <div className="space-y-3">
              {Object.keys(modalData.aggregatedScrapBreakdown).length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">スクラップの明細データはありません</p>
              ) : (
                Object.entries(modalData.aggregatedScrapBreakdown).map(([key, data]) => (
                  <div key={key} className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 flex justify-between items-center gap-4">
                    <div className="space-y-1">
                      <div className="font-bold text-emerald-900 text-sm md:text-base">{key}</div>
                      <div className="text-xs text-emerald-700">数量: {data.quantity} / 単価: ¥{data.price.toLocaleString()}</div>
                    </div>
                    <div className="font-black text-emerald-700 text-base md:text-lg shrink-0">
                      + ¥{data.total.toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
