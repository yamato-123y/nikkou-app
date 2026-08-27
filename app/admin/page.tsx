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

  const [editingReport, setEditingReport] = useState<any | null>(null);
  const [showSaveToast, setShowSaveToast] = useState(false);
  const [showDisposalModal, setShowDisposalModal] = useState(false);
  const [showScrapModal, setShowScrapModal] = useState(false);

  const [disposalDetailsOpen, setDisposalDetailsOpen] = useState<any>({});
  const [scrapDetailsOpen, setScrapDetailsOpen] = useState<any>({});
  const [reportSectionOpen, setReportSectionOpen] = useState<any>({});
  const [costOverrides, setCostOverrides] = useState<any>({});
  const [disposalOverrides, setDisposalOverrides] = useState<any>({});
  const [scrapOverrides, setScrapOverrides] = useState<any>({});
  const [fuelUnitPrices, setFuelUnitPrices] = useState<any>({});
  const [editingCostFields, setEditingCostFields] = useState<any>({});
  const [showAdminSection, setShowAdminSection] = useState(false);
  const [showCalendarSection, setShowCalendarSection] = useState(false);

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
          if (sData.disposalOverrides) setDisposalOverrides(sData.disposalOverrides);
          if (sData.scrapOverrides) setScrapOverrides(sData.scrapOverrides);
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

  const handleDisposalOverrideChange = async (locName: string, key: string, val: string) => {
    if (authRole === 'viewer') return;
    const newDisposalOverrides = {
      ...disposalOverrides,
      [locName]: {
        ...(disposalOverrides[locName] || {}),
        [key]: val
      }
    };
    setDisposalOverrides(newDisposalOverrides);
    const newData = { ...settings, disposalOverrides: newDisposalOverrides };
    setSettings(newData);
    await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newData) });
  };

  const handleDisposalItemOverrideChange = async (locName: string, disposalName: string, itemKey: string, val: string) => {
    if (authRole === 'viewer') return;
    const subKey = `${disposalName}__${itemKey}`;
    const newDisposalOverrides = {
      ...disposalOverrides,
      [locName]: {
        ...(disposalOverrides[locName] || {}),
        [subKey]: val
      }
    };
    setDisposalOverrides(newDisposalOverrides);
    const newData = { ...settings, disposalOverrides: newDisposalOverrides };
    setSettings(newData);
    await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newData) });
  };

  const handleScrapOverrideChange = async (locName: string, key: string, val: string) => {
    if (authRole === 'viewer') return;
    const newScrapOverrides = {
      ...scrapOverrides,
      [locName]: {
        ...(scrapOverrides[locName] || {}),
        [key]: val
      }
    };
    setScrapOverrides(newScrapOverrides);
    const newData = { ...settings, scrapOverrides: newScrapOverrides };
    setSettings(newData);
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
    const disposalBreakdown: {[key: string]: {items: {[itemKey: string]: {quantity: number, price: number, total: number, unit: string, details: Array<{date: string, item: string, quantity: number, unit: string, price: number, total: number}>}}, total: number}} = {};
    
    (r.disposals || []).forEach((d: any) => {
      const locName = d.location || 'その他処分場';
      const itemName = d.item || '品目未指定';
      const masterRecord = (settings.disposalLocations || []).find((s: any) => s.location === locName && s.item === itemName);
      const unitStr = d.unit || masterRecord?.unit || 't';
      const masterPrice = masterRecord?.price || 0;
      const uPrice = d.price !== undefined && d.price !== null && d.price !== '' 
        ? Number(d.price) 
        : masterPrice;
      const subT = Number(d.quantity || 0) * uPrice;
      dispC += subT;

      if (!disposalBreakdown[locName]) {
        disposalBreakdown[locName] = { items: {}, total: 0 };
      }
      disposalBreakdown[locName].total += subT;

      if (!disposalBreakdown[locName].items[itemName]) {
        disposalBreakdown[locName].items[itemName] = { quantity: 0, price: uPrice, total: 0, unit: unitStr, details: [] };
      }
      disposalBreakdown[locName].items[itemName].quantity += Number(d.quantity || 0);
      disposalBreakdown[locName].items[itemName].total += subT;
      disposalBreakdown[locName].items[itemName].details.push({
        date: r.date || '日付不明',
        item: itemName,
        quantity: Number(d.quantity || 0),
        unit: unitStr,
        price: uPrice,
        total: subT
      });
    });

    let scrapC = 0;
    const scrapBreakdown: {[key: string]: {quantity: number, total: number, details: Array<{date: string, item: string, quantity: number, unit: string, reportId?: any}>}} = {};
    (r.scraps || []).forEach((sc: any) => {
      const matchedMaster = (settings.scrapLocations || []).find((s: any) => s.location === sc.location && s.item === sc.item);
      const unitStr = sc.unit || matchedMaster?.unit || 't';
      const subT = 0; 
      scrapC += subT;
      const scrapKey = `${sc.location || 'その他スクラップ場'} (${sc.item || '品目未指定'})`;
      if (!scrapBreakdown[scrapKey]) {
        scrapBreakdown[scrapKey] = { quantity: 0, total: 0, details: [] };
      }
      scrapBreakdown[scrapKey].quantity += Number(sc.quantity || 0);
      scrapBreakdown[scrapKey].details.push({
        date: r.date || '日付不明',
        item: sc.item || '品目未指定',
        quantity: Number(sc.quantity || 0),
        unit: unitStr,
        reportId: r.id || r._id
      });
    });

    const rDateNorm = (r.date || '').replace(/\//g, '-');
    const parts = rDateNorm.split('-');
    let fuelCost = 0;
    const rawFuelL = Number(r.fuel || 0);
    if (parts.length >= 2) {
      const ym = `${parts[0]}-${parts[1].padStart(2, '0')}`;
      const locFuelPrices = fuelUnitPrices[r.location] || {};
      const unitPrice = locFuelPrices[ym];
      if (unitPrice !== '' && unitPrice !== undefined) {
        fuelCost = rawFuelL * Number(unitPrice);
      }
    }

    const regPrice = Number(r.regularPrice || 0);
    const eC = Number(r.etcPrice || 0);
    const pC = Number(r.parkingPrice || 0);
    const oC = Number(r.otherPrice || 0);

    return { lCost, subCost, leaseC, otherLeaseC, ownMachineC, vehicleC, dispC, disposalBreakdown, fC: fuelCost, rawFuel: rawFuelL, regularPrice: regPrice, eC, pC, oC, scrapC, scrapBreakdown };
  };

  const calculateCosts = (locName: string) => {
    const locMapped = reports.filter(r => r.location === locName);
    let calcLabor = 0, calcSub = 0, calcLease = 0, calcOtherLease = 0, calcOwnMachine = 0, calcVehicle = 0, calcDispCalc = 0;
    let calcFuel = 0, calcRegular = 0, calcEtc = 0, calcParking = 0, calcOther = 0, scrapTotalCalc = 0;
    
    const aggregatedDisposalBreakdown: {[key: string]: {items: {[itemKey: string]: {quantity: number, price: number, total: number, unit: string, details: Array<{date: string, item: string, quantity: number, unit: string, price: number, total: number}>}}, total: number}} = {};
    const aggregatedScrapBreakdown: {[key: string]: {quantity: number, total: number, details: Array<{date: string, item: string, quantity: number, unit: string, reportId?: any}>}} = {};
    
    locMapped.forEach(r => {
      const dc = calculateReportDailyCost(r);
      calcLabor += dc.lCost; 
      calcSub += dc.subCost; 
      calcLease += dc.leaseC; 
      calcOtherLease += dc.otherLeaseC;
      calcOwnMachine += dc.ownMachineC;
      calcVehicle += dc.vehicleC;
      calcDispCalc += dc.dispC;

      Object.entries(dc.disposalBreakdown).forEach(([locKey, locData]) => {
        if (!aggregatedDisposalBreakdown[locKey]) {
          aggregatedDisposalBreakdown[locKey] = { items: {}, total: 0 };
        }
        aggregatedDisposalBreakdown[locKey].total += locData.total;

        Object.entries(locData.items).forEach(([itemKey, itemData]) => {
          if (!aggregatedDisposalBreakdown[locKey].items[itemKey]) {
            aggregatedDisposalBreakdown[locKey].items[itemKey] = { quantity: 0, price: itemData.price, total: 0, unit: itemData.unit, details: [] };
          }
          aggregatedDisposalBreakdown[locKey].items[itemKey].quantity += itemData.quantity;
          aggregatedDisposalBreakdown[locKey].items[itemKey].total += itemData.total;
          aggregatedDisposalBreakdown[locKey].items[itemKey].details.push(...itemData.details);
        });
      });

      Object.entries(dc.scrapBreakdown).forEach(([key, data]) => {
        if (!aggregatedScrapBreakdown[key]) {
          aggregatedScrapBreakdown[key] = { quantity: 0, total: 0, details: [] };
        }
        aggregatedScrapBreakdown[key].quantity += data.quantity;
        aggregatedScrapBreakdown[key].details.push(...data.details);
      });

      calcFuel += dc.fC; 
      calcRegular += dc.regularPrice;
      calcEtc += dc.eC; 
      calcParking += dc.pC; 
      calcOther += dc.oC; 
      scrapTotalCalc += dc.scrapC;
    });

    const dispOv = disposalOverrides[locName] || {};
    let disposalTotal = calcDispCalc;
    const globalDispOvTotal = dispOv.total !== undefined && dispOv.total !== '' ? Number(dispOv.total) : null;
    
    if (globalDispOvTotal !== null) {
      disposalTotal = globalDispOvTotal;
    } else {
      let overriddenDispSum = 0;
      let hasIndividualDispOverride = false;
      Object.keys(aggregatedDisposalBreakdown).forEach(locKey => {
        if (dispOv[locKey] !== undefined && dispOv[locKey] !== '') {
          overriddenDispSum += Number(dispOv[locKey]);
          hasIndividualDispOverride = true;
        } else {
          let locSum = 0;
          let hasItemOverride = false;
          Object.keys(aggregatedDisposalBreakdown[locKey].items).forEach(itemKey => {
            const subKey = `${locKey}__${itemKey}`;
            if (dispOv[subKey] !== undefined && dispOv[subKey] !== '') {
              locSum += Number(dispOv[subKey]);
              hasItemOverride = true;
            } else {
              locSum += aggregatedDisposalBreakdown[locKey].items[itemKey].total;
            }
          });
          if (hasItemOverride) {
            overriddenDispSum += locSum;
            hasIndividualDispOverride = true;
          } else {
            overriddenDispSum += aggregatedDisposalBreakdown[locKey].total;
          }
        }
      });
      if (hasIndividualDispOverride) {
        disposalTotal = overriddenDispSum;
      }
    }

    const ov = costOverrides[locName] || {};
    const laborCost = ov.labor !== '' && ov.labor !== undefined ? Number(ov.labor) : calcLabor;
    const subCostTotal = ov.sub !== '' && ov.sub !== undefined ? Number(ov.sub) : calcSub;
    const leaseCost = ov.lease !== '' && ov.lease !== undefined ? Number(ov.lease) : calcLease;
    const otherLeaseCost = ov.otherLease !== '' && ov.otherLease !== undefined ? Number(ov.otherLease) : calcOtherLease;
    const ownMachineCost = ov.ownMachine !== '' && ov.ownMachine !== undefined ? Number(ov.ownMachine) : calcOwnMachine;
    const vehicleCost = ov.vehicle !== '' && ov.vehicle !== undefined ? Number(ov.vehicle) : calcVehicle;
    const disposalCost = ov.disposal !== '' && ov.disposal !== undefined ? Number(ov.disposal) : disposalTotal;
    const fuelCost = ov.fuel !== '' && ov.fuel !== undefined ? Number(ov.fuel) : calcFuel;
    const regularCost = ov.regular !== '' && ov.regular !== undefined ? Number(ov.regular) : calcRegular;
    const etcCost = ov.etc !== '' && ov.etc !== undefined ? Number(ov.etc) : calcEtc;
    const parkingCost = ov.parking !== '' && ov.parking !== undefined ? Number(ov.parking) : calcParking;
    const otherCost = ov.other !== '' && ov.other !== undefined ? Number(ov.other) : calcOther;

    const scOv = scrapOverrides[locName] || {};
    let scrapTotal = scrapTotalCalc;
    if (scOv.total !== undefined && scOv.total !== '') {
      scrapTotal = Number(scOv.total);
    } else {
      let overriddenScrapSum = 0;
      let hasIndividualOverride = false;
      Object.keys(aggregatedScrapBreakdown).forEach(key => {
        if (scOv[key] !== undefined && scOv[key] !== '') {
          overriddenScrapSum += Number(scOv[key]);
          hasIndividualOverride = true;
        }
      });
      if (hasIndividualOverride) {
        scrapTotal = overriddenScrapSum;
      }
    }

    const sumOverrideCost = laborCost + subCostTotal + leaseCost + otherLeaseCost + ownMachineCost + vehicleCost + disposalCost + fuelCost + regularCost + etcCost + parkingCost + otherCost;
    const matchedLocObj = (settings.locations || []).find((l: any) => (typeof l === 'string' ? l : l.name) === locName);
    const baseContractPrice = matchedLocObj?.price || 0;
    const isFinished = typeof matchedLocObj === 'object' ? matchedLocObj?.isFinished || false : false;
    
    const profitWithoutScrap = baseContractPrice - sumOverrideCost;
    const profit = profitWithoutScrap + scrapTotal;

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
      regularCost,
      etcCost, 
      parkingCost, 
      otherCost, 
      scrapTotal,
      aggregatedScrapBreakdown,
      total: sumOverrideCost, 
      contractPrice: baseContractPrice, 
      isFinished,
      profit, 
      profitWithoutScrap, 
      reportsWithIndex: locMapped 
    };
  };

  const downloadLocationCSV = (locName: string) => {
    const locReports = reports.filter(r => r.location === locName);
    const headers = ["日付", "現場名", "職長", "作業者", "外注", "リース(重機等)", "その他リース", "自社重機", "車両", "軽油L", "レギュラー購入分(円)", "ETC", "駐車場代", "雑費名", "雑費金額", "作業内容"];
    const rows = locReports.map(r => [
      r.date, r.location, r.manager, (r.workers || []).join('/'), 
      (r.subcontractors || []).map((s:any)=>`${s.company}(${s.task}:${s.count}人)`).join('/'),
      [...(r.machines || []), ...(r.leaseHeavy || []), ...(r.leaseAttach || []), ...(r.leaseOther || []), ...(r.mokCustomMachines || []).map((m:any)=>`${m.name}(${m.count}個)`)].join('/'),
      (r.otherLeases || []).map((ol:any)=>`${ol.company}(${ol.name}:${ol.count}個)`).join('/'),
      (r.ownMachines || []).join('/'),
      (r.vehicles || []).join('/'), 
      r.fuel || 0, r.regularPrice || 0, r.etcPrice || 0, r.parkingPrice || 0,
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
      <div className="bg-white p-6 sm:p-10 rounded-3xl shadow-xl space-y-8 w-full max-w-md border border-slate-100 text-center">
        <div className="space-y-3">
          <div className="text-5xl">🔒</div>
          <h1 className="text-2xl font-black text-slate-900">日報システム</h1>
          <p className="text-sm font-bold text-slate-500">株式会社大和</p>
        </div>
        
        <div className="space-y-6 pt-2">
          <div className="bg-orange-50/70 p-5 sm:p-6 rounded-3xl border border-orange-200/80 space-y-4 text-left shadow-xs">
            <input 
              type="password" 
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="パスワードを入力" 
              className="w-full p-4 border-2 border-orange-200 rounded-2xl text-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/25 focus:border-orange-500 transition text-center font-bold" 
              value={viewerPassword}
              onChange={e => setViewerPassword(e.target.value)} 
              onKeyDown={e => e.key === 'Enter' && handleLogin('viewer')}
            />
            <button 
              onClick={() => handleLogin('viewer')} 
              className="w-full bg-orange-600 hover:bg-orange-700 text-white py-4 rounded-2xl font-black text-base shadow-md shadow-orange-500/20 transition flex items-center justify-center gap-2"
            >
              👑 社長モードでログイン
            </button>
          </div>
          
          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink mx-4 text-slate-400 text-xs font-bold">または管理者</span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          <div className="bg-slate-50 p-5 sm:p-6 rounded-3xl border border-slate-200 space-y-4 text-left">
            <input 
              type="password" 
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="管理者パスワード" 
              className="w-full p-4 border-2 border-slate-200 rounded-2xl text-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-500/25 focus:border-slate-500 transition text-center font-bold" 
              value={password}
              onChange={e => setPassword(e.target.value)} 
              onKeyDown={e => e.key === 'Enter' && handleLogin('admin')}
            />
            <button 
              onClick={() => handleLogin('admin')} 
              className="w-full bg-slate-700 hover:bg-slate-800 text-white py-4 rounded-2xl font-black text-base transition shadow-md"
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
      <div className="min-h-screen flex items-center justify-center bg-slate-100 font-sans text-lg font-bold text-slate-600">
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
    <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-6 sm:space-y-8 font-sans pb-24 bg-slate-100 min-h-screen text-slate-900 text-base relative">
      
      {showSaveToast && (
        <div className="fixed top-6 right-6 z-50 bg-emerald-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-bounce font-bold text-base">
          <span className="text-2xl">✨</span>
          <span>日報の編集を保存しました！</span>
        </div>
      )}

      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-5 sm:p-8 rounded-3xl shadow-sm border border-slate-200/80 gap-4">
        <div className="space-y-1 text-center sm:text-left">
          <div className="flex items-center gap-2.5 justify-center sm:justify-start flex-wrap">
            <h1 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight">📊 現場日報・原価管理</h1>
            <span className="bg-orange-100 text-orange-800 text-xs px-3 py-1 rounded-full font-black shadow-2xs">
              👑 社長モード
            </span>
          </div>
          <p className="text-sm sm:text-base font-bold text-slate-500">株式会社大和 音声日報システム</p>
        </div>
        <div className="flex w-full sm:w-auto gap-3">
          <button onClick={fetchData} className="flex-1 sm:flex-none bg-blue-50 hover:bg-blue-100 text-blue-700 px-5 py-3 rounded-2xl font-bold text-sm transition flex items-center justify-center gap-2 shadow-2xs">
            🔄 最新にする
          </button>
          <button onClick={() => { setIsAuthed(false); setAuthRole(null); }} className="flex-1 sm:flex-none bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-3 rounded-2xl font-bold text-sm transition">
            ログアウト
          </button>
        </div>
      </div>

      <div className="bg-orange-50 border-2 border-orange-200 text-orange-900 p-4 rounded-2xl font-bold text-center text-sm sm:text-base shadow-xs">
        👑 社長モードで表示しています。（データの確認・詳細分析が可能です）
      </div>

      {/* 🏢 現場別 経費集計サマリー */}
      <div className="bg-white p-5 sm:p-8 rounded-3xl shadow-sm border border-slate-200/80 space-y-5">
        <h2 className="text-xl sm:text-2xl font-black text-slate-900">🏢 現場別 経費集計サマリー</h2>
        
        <div className="space-y-4">
          {locList.map((loc:any) => {
            const c = calculateCosts(loc.name);
            return (
              <div key={loc.name} className={`p-4 sm:p-6 rounded-3xl border-2 space-y-3.5 shadow-xs transition ${c.isFinished ? 'bg-slate-100 border-slate-300' : 'bg-slate-50/80 border-slate-200'}`}>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className={`font-black text-lg sm:text-xl tracking-tight ${c.isFinished ? 'text-slate-600' : 'text-blue-700'}`}>{loc.name}</span>
                    {c.isFinished && (
                      <span className="bg-slate-600 text-white text-xs px-2.5 py-1 rounded-lg font-bold shadow-2xs">📁 完了済</span>
                    )}
                  </div>
                  {c.isFinished ? (
                    <button 
                      onClick={() => toggleLocationFinished(loc.name)} 
                      className="text-xs sm:text-sm text-slate-500 hover:text-slate-800 underline font-bold"
                    >
                      未完了に戻す
                    </button>
                  ) : (
                    <button 
                      onClick={() => toggleLocationFinished(loc.name)} 
                      className="bg-white hover:bg-slate-100 text-slate-700 text-xs px-3 py-1.5 rounded-xl font-bold border-2 border-slate-300 transition shadow-2xs"
                    >
                      完了にする
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 bg-white p-3.5 rounded-2xl border border-slate-200 text-slate-600 font-bold text-center text-xs sm:text-sm">
                  <div>請負金額<span className="text-slate-950 font-black block text-sm sm:text-base mt-1">¥{c.contractPrice.toLocaleString()}</span></div>
                  <div>稼働日数<span className="text-slate-950 font-black block text-sm sm:text-base mt-1">{c.days}日</span></div>
                  <div>合計経費<span className="text-slate-950 font-black block text-sm sm:text-base mt-1">¥{c.total.toLocaleString()}</span></div>
                </div>

                <div className={`p-3.5 rounded-2xl border flex justify-between items-center text-sm sm:text-base font-black ${c.profit >= 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
                  <span>粗利（売却益込・差引後）:</span>
                  <span className="text-lg sm:text-xl">¥{c.profit.toLocaleString()}</span>
                </div>

                <div className="flex gap-3 pt-1">
                  <button onClick={() => setModalLocation(loc.name)} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-2xl text-sm sm:text-base font-black shadow-sm transition">詳細分析を見る →</button>
                  <button onClick={() => downloadLocationCSV(loc.name)} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-2xl text-sm sm:text-base font-black shadow-sm transition">CSV出力</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 📅 出勤確認表 */}
      <div className="bg-white p-5 sm:p-8 rounded-3xl shadow-sm border border-slate-200/80 space-y-4">
        <div className="flex justify-between items-center flex-wrap gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">📅 出勤確認表（スタッフ別カレンダー）</h2>
            <p className="text-sm font-bold text-slate-400 mt-0.5">どの日に・誰がどの現場に入っていたか確認できます</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap w-full sm:w-auto">
            {showCalendarSection && (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-sm font-bold text-slate-700">表示月:</span>
                <input 
                  type="month" 
                  value={calendarYearMonth} 
                  onChange={e => setCalendarYearMonth(e.target.value)}
                  className="p-3 border-2 border-slate-300 rounded-xl text-sm font-bold bg-slate-50 focus:bg-white focus:outline-none w-full sm:w-auto"
                />
              </div>
            )}
            <button 
              onClick={() => setShowCalendarSection(!showCalendarSection)}
              className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 text-slate-800 px-5 py-3 rounded-2xl font-bold text-sm transition"
            >
              {showCalendarSection ? '📅 出勤確認表を隠す ▲' : '📅 出勤確認表を開く ▼'}
            </button>
          </div>
        </div>

        {showCalendarSection && (
          <div className="pt-2 animate-fadeIn">
            {allStaffNames.length === 0 ? (
              <p className="text-sm font-bold text-slate-400 text-center py-6">登録されているスタッフがいません</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b-2 border-slate-200 bg-slate-50 text-slate-700 font-bold">
                      <th className="py-3 px-3 sticky left-0 bg-slate-50 z-10 min-w-[130px] shadow-xs">スタッフ名</th>
                      {calendarDays.map(dateStr => {
                        const dayNum = Number(dateStr.split('-')[2]);
                        const dObj = new Date(dateStr);
                        const weekDays = ['日', '月', '火', '水', '木', '金', '土'];
                        const wDay = weekDays[dObj.getDay()];
                        const isWeekend = dObj.getDay() === 0 || dObj.getDay() === 6;
                        return (
                          <th key={dateStr} className={`py-3 px-1 text-center min-w-[40px] ${isWeekend ? 'text-rose-600 bg-rose-50/60' : ''}`}>
                            <div className="text-[11px] text-slate-400">{wDay}</div>
                            <div className="text-sm font-bold">{dayNum}</div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {allStaffNames.map(staff => {
                      return (
                        <tr key={staff} className="hover:bg-slate-50 transition">
                          <td className="py-3 px-3 font-black text-slate-900 sticky left-0 bg-white z-10 shadow-xs whitespace-nowrap">
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
                                    className="w-8 h-8 mx-auto bg-emerald-100 text-emerald-800 rounded-xl flex items-center justify-center font-black text-xs shadow-2xs cursor-help"
                                  >
                                    ◯
                                  </div>
                                ) : (
                                  <div className="w-8 h-8 mx-auto bg-slate-100 text-slate-300 rounded-xl flex items-center justify-center text-xs">
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
              </div>
            )}
          </div>
        )}
      </div>

      {/* 📥 送信された日報一覧 */}
      <div className="bg-white p-5 sm:p-8 rounded-3xl shadow-sm border border-slate-200/80 space-y-6">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900">📥 送信された日報一覧</h2>
          <input 
            type="text" 
            placeholder="🔍 現場名で絞り込み..." 
            value={filterLocation} 
            onChange={e => setFilterLocation(e.target.value)} 
            className="p-3.5 border-2 border-slate-300 rounded-2xl text-base bg-slate-50 focus:bg-white focus:outline-none w-full sm:w-80 font-bold transition" 
          />
        </div>

        <div className="space-y-6">
          {locList.filter(loc => !filterLocation || loc.name.includes(filterLocation)).map(loc => {
            const locReports = filteredReports.filter(r => r.location === loc.name);
            if (locReports.length === 0) return null;

            const isReportOpen = reportSectionOpen[loc.name] || false;

            return (
              <div key={loc.name} className="bg-slate-50 rounded-3xl border-2 border-slate-200 p-4 sm:p-6 space-y-4 shadow-xs">
                <div className="flex justify-between items-center border-b border-slate-200 pb-3.5">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-black text-lg sm:text-xl text-blue-700">🏢 {loc.name}</span>
                    <span className="bg-slate-200 text-slate-800 text-xs px-3 py-1 rounded-full font-bold">{locReports.length}件</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReportSectionOpen({ ...reportSectionOpen, [loc.name]: !isReportOpen })}
                    className="bg-white hover:bg-slate-100 text-slate-800 border-2 border-slate-300 px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold shadow-2xs transition"
                  >
                    {isReportOpen ? '日報を閉じる ▲' : '日報を開く ▼'}
                  </button>
                </div>

                {isReportOpen && (
                  <div className="space-y-4 animate-fadeIn pt-1">
                    {locReports.map((r, i) => (
                      <div key={r.id || r._id || i} className="bg-white p-4 sm:p-5 rounded-2xl border-2 border-slate-200 space-y-3 shadow-2xs">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <span className="font-bold text-slate-600 text-sm">📅 {r.date}</span>
                          <span className="font-black text-slate-900 text-sm">👤 職長: {r.manager || '-'}</span>
                        </div>

                        <div className="text-sm font-bold text-slate-800">
                          作業者: {(r.workers || []).join(', ') || '-'}
                        </div>

                        {(r.subcontractors || []).length > 0 && (
                          <div className="text-xs sm:text-sm text-orange-800 font-bold bg-orange-50 p-2.5 rounded-xl border border-orange-200">
                            外注: {(r.subcontractors || []).map((s:any)=>`${s.company} (${s.task}: ${s.count}人)`).join(', ')}
                          </div>
                        )}

                        <div className="text-xs sm:text-sm text-slate-700 font-medium">
                          重機・車両: {[
                            ...(r.machines || []), 
                            ...(r.leaseHeavy || []), 
                            ...(r.leaseAttach || []), 
                            ...(r.leaseOther || []), 
                            ...(r.mokCustomMachines || []).map((m:any)=>`${m.name}(${m.count}個)`),
                            ...(r.otherLeases || []).map((ol:any)=>`${ol.company}(${ol.name}:${ol.count}個)`),
                            ...(r.ownMachines || []), 
                            ...(r.vehicles || [])
                          ].join(', ') || '-'}
                        </div>

                        {r.workDescription && (
                          <div className="text-sm text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200 whitespace-pre-wrap font-medium leading-relaxed">
                            {r.workDescription}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {filteredReports.length === 0 && (
            <p className="text-base font-bold text-slate-400 text-center py-8">日報データはありません</p>
          )}
        </div>
      </div>

      {/* 🔍 現場詳細モーダル */}
      {modalLocation && modalData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 z-40 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-4xl p-5 sm:p-10 max-h-[92vh] overflow-y-auto space-y-6 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center border-b-2 border-slate-200 pb-4 sm:pb-6 gap-3">
              <div>
                <h2 className="text-xl sm:text-3xl font-black text-slate-900">{modalLocation}</h2>
                <p className="text-sm font-bold text-slate-500 mt-0.5">原価・収支および内訳明細</p>
              </div>
              <div className="flex gap-2.5 shrink-0">
                <button onClick={() => downloadLocationCSV(modalLocation)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 sm:px-6 py-3 rounded-2xl text-sm font-black shadow-sm transition">CSV出力</button>
                <button onClick={() => setModalLocation(null)} className="bg-slate-200 hover:bg-slate-300 text-slate-800 px-4 sm:px-6 py-3 rounded-2xl text-sm font-black transition">閉じる</button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-50 p-5 sm:p-6 rounded-2xl border-2 border-slate-200 flex flex-col justify-between space-y-2">
                <div className="text-sm font-bold text-slate-600">
                  📉 スクラップ売却額を差引しない場合（純粋な粗利）
                </div>
                <div className={`text-2xl sm:text-3xl font-black ${modalData.profitWithoutScrap >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                  ¥{modalData.profitWithoutScrap.toLocaleString()}
                </div>
              </div>

              <div className="bg-emerald-50 p-5 sm:p-6 rounded-2xl border-2 border-emerald-300 flex flex-col justify-between space-y-2">
                <div className="text-sm font-bold text-emerald-900">
                  📈 スクラップ売却額を差引した後（売却益込・最終粗利）
                </div>
                <div className={`text-2xl sm:text-3xl font-black ${modalData.profit >= 0 ? 'text-emerald-800' : 'text-rose-600'}`}>
                  ¥{modalData.profit.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 text-center">
              <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border-2 border-slate-200"><div className="text-xs sm:text-sm font-bold text-slate-600">請負金額</div><div className="text-lg sm:text-2xl font-black text-slate-900 mt-1">¥{modalData.contractPrice.toLocaleString()}</div></div>
              <div className="bg-emerald-50/60 p-4 sm:p-5 rounded-2xl border-2 border-emerald-200"><div className="text-xs sm:text-sm font-bold text-emerald-800">合計経費</div><div className="text-lg sm:text-2xl font-black text-emerald-900 mt-1">¥{modalData.total.toLocaleString()}</div></div>
              <div className="bg-blue-50/60 p-4 sm:p-5 rounded-2xl border-2 border-blue-200"><div className="text-xs sm:text-sm font-bold text-blue-800">最終利益</div><div className="text-lg sm:text-2xl font-black text-blue-900 mt-1">¥{modalData.profit.toLocaleString()}</div></div>
              <div className="bg-amber-50/60 p-4 sm:p-5 rounded-2xl border-2 border-amber-200"><div className="text-xs sm:text-sm font-bold text-amber-800">稼働日数</div><div className="text-lg sm:text-2xl font-black text-amber-900 mt-1">{modalData.days}日</div></div>
            </div>

            <div className="bg-emerald-50 border-2 border-emerald-300 p-5 rounded-2xl flex justify-between items-center flex-wrap gap-4 shadow-xs">
              <span className="text-emerald-950 font-black text-base sm:text-lg">♻️ スクラップ売却計</span>
              <div className="flex items-center gap-3">
                <span className="font-black text-emerald-900 text-xl sm:text-2xl">+ ¥{modalData.scrapTotal.toLocaleString()}</span>
                <button onClick={() => setShowScrapModal(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm px-4 py-2.5 rounded-xl font-black shadow-xs transition">
                  🔍 内訳を見る
                </button>
              </div>
            </div>

            <div className="bg-slate-50 p-5 sm:p-8 rounded-3xl border-2 border-slate-200 space-y-6">
              <div className="flex justify-between items-center flex-wrap gap-4">
                <h3 className="font-black text-lg sm:text-xl text-slate-900">📋 経費・収支の内訳明細</h3>
                <button onClick={() => setShowDisposalModal(true)} className="bg-orange-600 hover:bg-orange-700 text-white text-xs sm:text-sm px-4 py-2.5 rounded-xl font-black shadow-xs transition">🔍 処分費の内訳を確認</button>
              </div>

              {/* 燃料単価設定 */}
              <div className="bg-orange-50 p-4 sm:p-5 rounded-2xl border-2 border-orange-200 space-y-3">
                <div className="font-black text-orange-950 text-sm sm:text-base">⛽ 月別 1Lあたりの軽油単価設定</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
                  {modalReportYearMonths.length === 0 ? (
                    <p className="text-xs font-bold text-slate-500">日報データがまだありません</p>
                  ) : (
                    modalReportYearMonths.map(ym => {
                      const currentPrice = fuelUnitPrices[modalLocation]?.[ym] ?? '';
                      return (
                        <div key={ym} className="bg-white p-3 rounded-xl border-2 border-orange-200 space-y-1">
                          <label className="text-xs font-bold text-slate-600 block">{ym} 単価(1L)</label>
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-slate-400">¥</span>
                            <input 
                              type="number" 
                              value={currentPrice} 
                              onChange={e => handleFuelUnitPriceChange(modalLocation, ym, e.target.value)}
                              placeholder="例: 145"
                              className="w-full p-2 border-2 border-slate-300 rounded-lg text-sm font-bold text-right"
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { key: 'labor', label: '社員人件費', val: costOverrides[modalLocation]?.labor ?? modalData.laborCost },
                  { key: 'sub', label: '外注人件費', val: costOverrides[modalLocation]?.sub ?? modalData.subCostTotal },
                  { key: 'lease', label: 'リース合計', val: costOverrides[modalLocation]?.lease ?? modalData.leaseCost },
                  { key: 'otherLease', label: 'その他リース', val: costOverrides[modalLocation]?.otherLease ?? modalData.otherLeaseCost },
                  { key: 'ownMachine', label: '自社重機', val: costOverrides[modalLocation]?.ownMachine ?? modalData.ownMachineCost },
                  { key: 'vehicle', label: '自社車両', val: costOverrides[modalLocation]?.vehicle ?? modalData.vehicleCost },
                  { key: 'disposal', label: '🗑️ 処分費 (合計)', val: costOverrides[modalLocation]?.disposal ?? modalData.disposalCost, isDisposal: true },
                  { key: 'fuel', label: '燃料代 (軽油)', val: costOverrides[modalLocation]?.fuel ?? modalData.fuelCost },
                  { key: 'regular', label: 'レギュラー購入分', val: costOverrides[modalLocation]?.regular ?? modalData.regularCost },
                  { key: 'etc', label: '高速代・ETC', val: costOverrides[modalLocation]?.etc ?? modalData.etcCost },
                  { key: 'parking', label: '駐車場代', val: costOverrides[modalLocation]?.parking ?? modalData.parkingCost },
                  { key: 'other', label: 'その他雑費', val: costOverrides[modalLocation]?.other ?? modalData.otherCost },
                ].map((item) => (
                  <div key={item.key} className="bg-white p-5 rounded-2xl border-2 border-slate-200 shadow-2xs space-y-2">
                    <span className="text-sm font-black text-slate-600">{item.label}</span>
                    <div className="font-black text-slate-900 text-2xl sm:text-3xl">
                      ¥{Number(item.val || 0).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 🗑️ 処分費詳細モーダル */}
      {showDisposalModal && modalLocation && modalData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-2xl p-5 sm:p-8 max-h-[85vh] overflow-y-auto space-y-5 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center border-b-2 border-slate-200 pb-3">
              <h3 className="text-lg sm:text-2xl font-black text-slate-900">🗑️ 処分内容一覧</h3>
              <button onClick={() => setShowDisposalModal(false)} className="bg-slate-200 hover:bg-slate-300 text-slate-800 px-4 py-2 rounded-xl text-sm font-black transition">閉じる</button>
            </div>
            
            <div className="space-y-4">
              {Object.keys(modalData.aggregatedDisposalBreakdown).length === 0 ? (
                <p className="text-sm font-bold text-slate-400 text-center py-6">処分費の明細データはありません</p>
              ) : (
                Object.entries(modalData.aggregatedDisposalBreakdown).map(([disposalName, disposalData]) => (
                  <div key={disposalName} className="bg-slate-50 p-4 sm:p-5 rounded-2xl border-2 border-slate-200 space-y-3">
                    <div className="flex justify-between items-center gap-3 flex-wrap">
                      <div className="font-black text-slate-900 text-base sm:text-lg">🏢 {disposalName}</div>
                      <div className="font-black text-orange-700 text-lg">¥{disposalData.total.toLocaleString()}</div>
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-2xl p-5 sm:p-8 max-h-[85vh] overflow-y-auto space-y-5 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center border-b-2 border-emerald-200 pb-3">
              <h3 className="text-lg sm:text-2xl font-black text-slate-900">♻️ スクラップ売却内訳</h3>
              <button onClick={() => setShowScrapModal(false)} className="bg-slate-200 hover:bg-slate-300 text-slate-800 px-4 py-2 rounded-xl text-sm font-black transition">閉じる</button>
            </div>
            
            <div className="space-y-3">
              {Object.keys(modalData.aggregatedScrapBreakdown).length === 0 ? (
                <p className="text-sm font-bold text-slate-400 text-center py-6">スクラップの明細データはありません</p>
              ) : (
                Object.entries(modalData.aggregatedScrapBreakdown).map(([key, data]) => (
                  <div key={key} className="bg-emerald-50 p-4 rounded-2xl border-2 border-emerald-200 space-y-2">
                    <div className="font-black text-emerald-950 text-base">{key}</div>
                    <div className="text-xs font-bold text-emerald-800">合計数量: {data.quantity}</div>
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
