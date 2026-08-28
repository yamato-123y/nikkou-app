```tsx
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
  const [customSubcontractors, setCustomSubcontractors] = useState<any>({});
  const [customSubForm, setCustomSubForm] = useState<{ [key: string]: { company: string; task: string; price: string } }>({});

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
          if (sData.customSubcontractors) setCustomSubcontractors(sData.customSubcontractors);
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

  const handleAddCustomSubcontractor = async (locName: string) => {
    if (authRole === 'viewer') return;
    const formVal = customSubForm[locName] || { company: '', task: '', price: '' };
    if (!formVal.company || !formVal.price) {
      alert('会社名と金額を入力してください。');
      return;
    }
    const currentList = customSubcontractors[locName] || [];
    const updatedList = [...currentList, { company: formVal.company, task: formVal.task || '一括請負', price: Number(formVal.price) || 0 }];
    const newCustomSubs = { ...customSubcontractors, [locName]: updatedList };
    setCustomSubcontractors(newCustomSubs);
    setCustomSubForm({ ...customSubForm, [locName]: { company: '', task: '', price: '' } });

    const newData = { ...settings, customSubcontractors: newCustomSubs };
    setSettings(newData);
    await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newData) });
  };

  const handleDeleteCustomSubcontractor = async (locName: string, idx: number) => {
    if (authRole === 'viewer') return;
    const currentList = customSubcontractors[locName] || [];
    const updatedList = currentList.filter((_: any, i: number) => i !== idx);
    const newCustomSubs = { ...customSubcontractors, [locName]: updatedList };
    setCustomSubcontractors(newCustomSubs);

    const newData = { ...settings, customSubcontractors: newCustomSubs };
    setSettings(newData);
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
    (r.ishikawaHeavy || []).forEach((m: string) => leaseC += ((settings.ishikawaHeavy || []).find((x:any) => x.name === m)?.price || 0));
    (r.ishikawaAttach || []).forEach((m: string) => leaseC += ((settings.ishikawaAttach || []).find((x:any) => x.name === m)?.price || 0));
    (r.ishikawaOther || []).forEach((m: string) => leaseC += ((settings.ishikawaOther || []).find((x:any) => x.name === m)?.price || 0));

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

    const customSubsList = customSubcontractors[locName] || [];
    const customSubsTotal = customSubsList.reduce((acc: number, cur: any) => acc + (Number(cur.price) || 0), 0);
    calcSub += customSubsTotal;

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
    const headers = ["日付", "現場名", "職長", "作業者", "職種・人数", "外注", "リース(重機等)", "その他リース", "自社重機", "車両", "軽油L", "レギュラー購入分(円)", "ETC", "駐車場代", "雑費名", "雑費金額", "作業内容"];
    const rows = locReports.map(r => [
      r.date, r.location, r.manager, (r.workers || []).join('/'), 
      Object.entries(r.jobTypes || {}).map(([job, count]) => `${job}:${count}人`).join('/'),
      (r.subcontractors || []).map((s:any)=>`${s.company}(${s.task}:${s.count}人)`).join('/'),
      [...(r.machines || []), ...(r.leaseHeavy || []), ...(r.leaseAttach || []), ...(r.leaseOther || []), ...(r.ishikawaHeavy || []), ...(r.ishikawaAttach || []), ...(r.ishikawaOther || []), ...(r.mokCustomMachines || []).map((m:any)=>`${m.name}(${m.count}個)`)].join('/'),
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
      <div className="bg-white p-8 md:p-12 rounded-3xl shadow-xl space-y-8 w-full max-w-lg border border-slate-100 text-center">
        <div className="space-y-3">
          <div className="text-5xl">🔒</div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800">日報システム</h1>
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
              className="w-full bg-orange-600 hover:bg-orange-700 text-white py-4 rounded-2xl font-bold text-base md:text-lg shadow-md shadow-orange-500/20 transition flex items-center justify-center gap-2"
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
              className="w-full bg-slate-700 hover:bg-slate-800 text-white py-4 rounded-2xl font-bold text-base md:text-lg transition shadow-md"
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
  
  const activeLocList = locList.filter((l:any) => !l.isFinished);
  const finishedLocList = locList.filter((l:any) => l.isFinished);

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
    <div className="p-3 md:p-10 bg-slate-100 min-h-screen space-y-4 md:space-y-8 w-full max-w-[1800px] mx-auto font-sans text-slate-800 text-base md:text-lg relative">

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
            <h1 className="text-xl md:text-3xl font-bold text-slate-950 tracking-tight">📊 現場日報・原価管理</h1>
            <span className={`text-xs md:text-sm px-3 py-1 rounded-full font-bold ${authRole === 'admin' ? 'bg-orange-100 text-orange-700' : 'bg-orange-100 text-orange-700'}`}>
              {authRole === 'admin' ? '👑 管理者モード' : '👑 社長モード'}
            </span>
          </div>
          <p className="text-sm md:text-base text-slate-500 font-medium">株式会社大和 音声日報システム</p>
        </div>
        <div className="flex w-full md:w-auto gap-2">
          <button onClick={fetchData} className="flex-1 md:flex-none bg-blue-50 hover:bg-blue-100 text-blue-600 px-4 py-2.5 rounded-xl font-bold text-sm md:text-base transition flex items-center justify-center gap-1.5">
            🔄 最新の状態にする
          </button>
          <button onClick={() => { setIsAuthed(false); setAuthRole(null); }} className="flex-1 md:flex-none bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2.5 rounded-xl font-bold text-sm md:text-base transition">
            ログアウト
          </button>
        </div>
      </div>

      {authRole === 'viewer' && (
        <div className="bg-orange-50 border border-orange-200 text-orange-800 p-4 rounded-2xl font-bold text-center text-sm md:text-lg shadow-xs">
          👑 社長モードで表示しています。（データの確認が可能です）
        </div>
      )}

      {/* 稼働中の現場サマリー */}
      <div className="bg-white p-4 md:p-8 rounded-2xl md:rounded-3xl shadow-sm border border-slate-100 space-y-5">
        <h2 className="text-xl md:text-2xl font-bold text-slate-900">🏢 稼働中の現場 一覧</h2>

        <div className="block md:hidden space-y-4">
          {activeLocList.map((loc:any) => {
            const c = calculateCosts(loc.name);
            return (
              <div key={loc.name} className="p-4 rounded-2xl border space-y-3 shadow-xs bg-slate-50/90 border-slate-200">
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-lg leading-snug text-blue-600">{loc.name}</span>
                    </div>
                    {authRole !== 'viewer' && (
                      <button onClick={() => toggleLocationFinished(loc.name)} className="bg-white hover:bg-slate-100 text-slate-600 text-xs px-2.5 py-1 rounded-lg font-bold border border-slate-300 transition">現場完了</button>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className={`text-sm px-3 py-1 rounded-xl font-bold inline-block ${c.profit >= 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                      粗利（売却益込）: ¥{c.profit.toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-3 text-xs md:text-sm gap-1 bg-white p-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-center">
                  <div>請負<span className="text-slate-900 font-bold block text-base mt-1">¥{c.contractPrice.toLocaleString()} <span className="text-xs font-normal text-slate-500">税抜</span></span></div>
                  <div>日数<span className="text-slate-900 font-bold block text-base mt-1">{c.days}日</span></div>
                  <div>経費<span className="text-slate-900 font-bold block text-base mt-1">¥{c.total.toLocaleString()}</span></div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={() => setModalLocation(loc.name)} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-sm font-bold shadow-xs transition">🔍 詳細分析を見る</button>
                </div>
              </div>
            );
          })}
          {activeLocList.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-4">稼働中の現場はありません</p>
          )}
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse table-fixed">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 text-base font-bold uppercase tracking-wider">
                <th className="py-4 px-4 w-[32%]">現場名</th>
                <th className="py-4 px-4 w-[13%]">請負金額</th>
                <th className="py-4 px-4 w-[11%]">稼働日数</th>
                <th className="py-4 px-4 w-[13%]">合計経費</th>
                <th className="py-4 px-4 w-[17%]">粗利（売却益込）</th>
                <th className="py-4 px-4 w-[14%] text-center">ステータス / アクション</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-lg font-medium">
              {activeLocList.map((loc:any) => {
                const c = calculateCosts(loc.name);
                return (
                  <tr key={loc.name} className="hover:bg-slate-50/80 transition">
                    <td className="py-5 px-4 align-middle">
                      <span className="font-bold text-xl break-all leading-snug text-blue-600">{loc.name}</span>
                    </td>
                    <td className="py-5 px-4 text-slate-800 font-bold align-middle">¥{c.contractPrice.toLocaleString()} <span className="text-xs font-normal text-slate-500">税抜</span></td>
                    <td className="py-5 px-4 text-slate-800 font-bold align-middle">{c.days} 日</td>
                    <td className="py-5 px-4 text-slate-900 font-bold align-middle">¥{c.total.toLocaleString()}</td>
                    <td className={`py-5 px-4 font-bold text-2xl align-middle ${c.profit >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
                      ¥{c.profit.toLocaleString()}
                    </td>
                    <td className="py-5 px-4 text-center align-middle">
                      <div className="flex items-center justify-center gap-2 flex-nowrap">
                        {authRole !== 'viewer' && (
                          <button onClick={() => toggleLocationFinished(loc.name)} className="bg-white hover:bg-slate-100 text-slate-600 px-3 py-2 rounded-xl text-xs font-bold border border-slate-300 shadow-2xs transition">
                            現場完了
                          </button>
                        )}
                        <button onClick={() => setModalLocation(loc.name)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold transition shadow-sm text-sm whitespace-nowrap">
                          詳細分析 →
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {activeLocList.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-6 text-slate-400 text-base">稼働中の現場はありません</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 完了済の現場 一覧 */}
      <div className="bg-slate-100 p-4 md:p-8 rounded-2xl md:rounded-3xl shadow-sm border border-slate-200 space-y-5">
        <h2 className="text-xl md:text-2xl font-bold text-slate-700">📁 完了済の現場 一覧</h2>

        <div className="block md:hidden space-y-4">
          {finishedLocList.map((loc:any) => {
            const c = calculateCosts(loc.name);
            return (
              <div key={loc.name} className="p-4 rounded-2xl border space-y-3 shadow-xs bg-slate-200/90 border-slate-300">
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-lg leading-snug text-slate-700">{loc.name}</span>
                      <span className="bg-slate-600 text-white text-xs px-2.5 py-0.5 rounded-md font-bold shadow-2xs">📁 完了済</span>
                    </div>
                    {authRole !== 'viewer' && (
                      <button onClick={() => toggleLocationFinished(loc.name)} className="text-xs text-slate-600 hover:text-slate-900 underline font-medium">未完了に戻す</button>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className={`text-sm px-3 py-1 rounded-xl font-bold inline-block ${c.profit >= 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                      粗利（売却益込）: ¥{c.profit.toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-3 text-xs md:text-sm gap-1 bg-white p-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-center">
                  <div>請負<span className="text-slate-900 font-bold block text-base mt-1">¥{c.contractPrice.toLocaleString()} <span className="text-xs font-normal text-slate-500">税抜</span></span></div>
                  <div>日数<span className="text-slate-900 font-bold block text-base mt-1">{c.days}日</span></div>
                  <div>経費<span className="text-slate-900 font-bold block text-base mt-1">¥{c.total.toLocaleString()}</span></div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={() => setModalLocation(loc.name)} className="w-full bg-slate-700 hover:bg-slate-800 text-white py-3 rounded-xl text-sm font-bold shadow-xs transition">🔍 詳細分析を見る</button>
                </div>
              </div>
            );
          })}
          {finishedLocList.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-4">完了済みの現場はありません</p>
          )}
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse table-fixed">
            <thead>
              <tr className="border-b border-slate-300 text-slate-500 text-base font-bold uppercase tracking-wider">
                <th className="py-4 px-4 w-[32%]">現場名</th>
                <th className="py-4 px-4 w-[13%]">請負金額</th>
                <th className="py-4 px-4 w-[11%]">稼働日数</th>
                <th className="py-4 px-4 w-[13%]">合計経費</th>
                <th className="py-4 px-4 w-[17%]">粗利（売却益込）</th>
                <th className="py-4 px-4 w-[14%] text-center">ステータス / アクション</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-lg font-medium">
              {finishedLocList.map((loc:any) => {
                const c = calculateCosts(loc.name);
                return (
                  <tr key={loc.name} className="bg-slate-50/80">
                    <td className="py-5 px-4 align-middle">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xl break-all leading-snug text-slate-600">{loc.name}</span>
                        <span className="bg-slate-600 text-white px-2.5 py-1 rounded-md text-xs font-bold shadow-2xs shrink-0">📁 完了済</span>
                      </div>
                    </td>
                    <td className="py-5 px-4 text-slate-800 font-bold align-middle">¥{c.contractPrice.toLocaleString()} <span className="text-xs font-normal text-slate-500">税抜</span></td>
                    <td className="py-5 px-4 text-slate-800 font-bold align-middle">{c.days} 日</td>
                    <td className="py-5 px-4 text-slate-900 font-bold align-middle">¥{c.total.toLocaleString()}</td>
                    <td className={`py-5 px-4 font-bold text-2xl align-middle ${c.profit >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
                      ¥{c.profit.toLocaleString()}
                    </td>
                    <td className="py-5 px-4 text-center align-middle">
                      <div className="flex items-center justify-center gap-2 flex-nowrap">
                        {authRole !== 'viewer' && (
                          <button onClick={() => toggleLocationFinished(loc.name)} className="text-xs text-slate-500 hover:text-slate-800 underline font-medium">未完了に戻す</button>
                        )}
                        <button onClick={() => setModalLocation(loc.name)} className="bg-slate-700 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl font-bold transition shadow-sm text-sm whitespace-nowrap">
                          詳細分析 →
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {finishedLocList.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-6 text-slate-400 text-base">完了済みの現場はありません</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 出勤確認表 */}
      <div className="bg-white p-4 md:p-8 rounded-2xl md:rounded-3xl shadow-sm border border-slate-100 space-y-4">
        <div className="flex justify-between items-center flex-wrap gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-900">📅 出勤確認表（スタッフ別カレンダー）</h2>
            <p className="text-sm md:text-base text-slate-500 mt-0.5">どの日に・誰がどの現場に入っていたかチェックできます</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {showCalendarSection && (
              <div className="flex items-center gap-2">
                <span className="text-sm md:text-base font-bold text-slate-700">表示月:</span>
                <input 
                  type="month" 
                  value={calendarYearMonth} 
                  onChange={e => setCalendarYearMonth(e.target.value)}
                  className="p-3 border border-slate-300 rounded-xl text-base font-bold bg-slate-50 focus:bg-white focus:outline-none"
                />
              </div>
            )}
            <button 
              onClick={() => setShowCalendarSection(!showCalendarSection)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-4 py-3 rounded-xl font-bold text-sm md:text-base transition"
            >
              {showCalendarSection ? '📅 出勤確認表を隠す ▲' : '📅 出勤確認表を開く ▼'}
            </button>
          </div>
        </div>

        {showCalendarSection && (
          <div className="pt-2 animate-fadeIn">
            {allStaffNames.length === 0 ? (
              <p className="text-base text-slate-500 text-center py-6">登録されているスタッフがいません</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm md:text-base">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 font-bold">
                      <th className="py-3 px-3 sticky left-0 bg-slate-50 z-10 min-w-[140px] shadow-xs">スタッフ名</th>
                      {calendarDays.map(dateStr => {
                        const dayNum = Number(dateStr.split('-')[2]);
                        const dObj = new Date(dateStr);
                        const weekDays = ['日', '月', '火', '水', '木', '金', '土'];
                        const wDay = weekDays[dObj.getDay()];
                        const isWeekend = dObj.getDay() === 0 || dObj.getDay() === 6;
                        return (
                          <th key={dateStr} className={`py-3 px-1 text-center min-w-[40px] ${isWeekend ? 'text-rose-600 bg-rose-50/50' : ''}`}>
                            <div className="text-xs text-slate-500 font-bold">{wDay}</div>
                            <div className="text-sm md:text-base font-bold">{dayNum}</div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {allStaffNames.map(staff => {
                      return (
                        <tr key={staff} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-3 font-bold text-slate-900 sticky left-0 bg-white z-10 shadow-xs whitespace-nowrap text-base">
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
                                    className="w-8 h-8 mx-auto bg-emerald-100 text-emerald-800 rounded-lg flex items-center justify-center font-bold text-sm shadow-2xs cursor-help"
                                  >
                                    ◯
                                  </div>
                                ) : (
                                  <div className="w-8 h-8 mx-auto bg-slate-100 text-slate-400 rounded-lg flex items-center justify-center text-xs font-bold">
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

      {/* マスタ登録・単価設定エリア（管理者のみ） */}
      {authRole === 'admin' && (
        <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 space-y-6">
          <div className="flex justify-between items-center flex-wrap gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-slate-900">⚙️ マスタ登録・単価設定（PC管理者用）</h2>
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
                { title: "🏢 現場名一覧", key: "locations", nameKey: "name", priceKey: "price", addForm: ['lName', 'lPrice'], placeholders: ["新しい現場名", "請負金額（税抜）"], type: "locations" },
                { title: "👤 職長一覧", key: "managers", nameKey: "name", priceKey: "price", addForm: ['mName', 'mPrice'], placeholders: ["職長名", "単価不要"], type: "managers", isNoPrice: true },
                { title: "👥 作業メンバー＆日額単価", key: "workers", nameKey: "name", priceKey: "price", addForm: ['wName', 'wPrice'], placeholders: ["メンバー名", "日額"], type: "workers" },
                { title: "🏷️ 職種一覧", key: "jobTypes", nameKey: "name", addForm: ['jName'], placeholders: ["職種名 (例: 解体工、オペなど)"], type: "jobTypes", isNoPrice: true },
                { title: "🏢 外注会社・作業内容・単価", key: "subcontractors", isSub: true },
                { title: "🚚 自社車両＆日額単価", key: "vehicles", nameKey: "name", priceKey: "price", addForm: ['vName', 'vPrice'], placeholders: ["車両名", "日額"], type: "vehicles" },
                { title: "🚜 自社重機＆日額単価", key: "companyMachines", nameKey: "name", priceKey: "price", addForm: ['cmName', 'cmPrice'], placeholders: ["重機名", "日額"], type: "companyMachines" },
                { title: "🚜 リース：重機＆日額単価", key: "leaseHeavy", nameKey: "name", priceKey: "price", addForm: ['lhName', 'lhPrice'], placeholders: ["重機名", "日額"], type: "leaseHeavy" },
                { title: "⚙️ リース：アタッチメント＆日額単価", key: "leaseAttach", nameKey: "name", priceKey: "price", addForm: ['laName', 'laPrice'], placeholders: ["アタッチメント名", "日額"], type: "leaseAttach" },
                { title: "🛠️ リース：その他 機械・機器＆日額単価", key: "leaseOther", nameKey: "name", priceKey: "price", addForm: ['loName', 'loPrice'], placeholders: ["機械・機器名", "日額"], type: "leaseOther" },
                { title: "🗾 （石川県）重機＆日額単価", key: "ishikawaHeavy", nameKey: "name", priceKey: "price", addForm: ['ihName', 'ihPrice'], placeholders: ["重機名", "日額"], type: "ishikawaHeavy" },
                { title: "🗾 （石川県）アタッチメント＆日額単価", key: "ishikawaAttach", nameKey: "name", priceKey: "price", addForm: ['iaName', 'iaPrice'], placeholders: ["アタッチメント名", "日額"], type: "ishikawaAttach" },
                { title: "🗾 （石川県）その他機械・機器＆日額単価", key: "ishikawaOther", nameKey: "name", priceKey: "price", addForm: ['ioName', 'ioPrice'], placeholders: ["機械・機器名", "日額"], type: "ishikawaOther" },
                { title: "🗑️ 処分場マスタ＆単価", key: "disposalLocations", isDisp: true },
                { title: "♻️ スクラップマスタ", key: "scrapLocations", isScrap: true },
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
                    ) : sec.isDisp ? (
                      <div className="space-y-3 bg-white p-3.5 rounded-2xl border border-slate-200">
                        <input type="text" placeholder="処分場名" value={form.dLoc || ''} className="w-full p-3 border border-slate-300 rounded-xl text-sm md:text-base bg-slate-50 focus:bg-white focus:outline-none font-medium" onChange={e=>setForm({...form, dLoc: e.target.value})} />
                        <div className="grid grid-cols-12 gap-2">
                          <input type="text" placeholder="品目" value={form.dItem || ''} className="col-span-4 p-3 border border-slate-300 rounded-xl text-sm md:text-base bg-slate-50 focus:bg-white focus:outline-none font-medium" onChange={e=>setForm({...form, dItem: e.target.value})} />
                          <input type="text" placeholder="単位" value={form.dUnit || ''} className="col-span-3 p-3 border border-slate-300 rounded-xl text-sm md:text-base bg-slate-50 focus:bg-white focus:outline-none font-medium" onChange={e=>setForm({...form, dUnit: e.target.value})} />
                          <input type="number" placeholder="単価" value={form.dPrice || ''} className="col-span-5 p-3 border border-slate-300 rounded-xl text-sm md:text-base bg-slate-50 focus:bg-white focus:outline-none font-medium" onChange={e=>setForm({...form, dPrice: e.target.value})} />
                        </div>
                        <button onClick={() => addMaster(sec.key, {location: form.dLoc, item: form.dItem, unit: form.dUnit || 't', price: Number(form.dPrice)||0}, ['dLoc', 'dItem', 'dUnit', 'dPrice'])} className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3 rounded-xl font-bold text-sm md:text-base shadow-sm transition text-center">＋ 追加</button>
                      </div>
                    ) : sec.isScrap ? (
                      <div className="space-y-3 bg-white p-3.5 rounded-2xl border border-slate-200">
                        <input type="text" placeholder="スクラップ場名" value={form.sLoc || ''} className="w-full p-3 border border-slate-300 rounded-xl text-sm md:text-base bg-slate-50 focus:bg-white focus:outline-none font-medium" onChange={e=>setForm({...form, sLoc: e.target.value})} />
                        <div className="grid grid-cols-12 gap-2">
                          <input type="text" placeholder="品目" value={form.sItem || ''} className="col-span-7 p-3 border border-slate-300 rounded-xl text-sm md:text-base bg-slate-50 focus:bg-white focus:outline-none font-medium" onChange={e=>setForm({...form, sItem: e.target.value})} />
                          <input type="text" placeholder="単位" value={form.sUnit || ''} className="col-span-5 p-3 border border-slate-300 rounded-xl text-sm md:text-base bg-slate-50 focus:bg-white focus:outline-none font-medium" onChange={e=>setForm({...form, sUnit: e.target.value})} />
                        </div>
                        <button onClick={() => addMaster(sec.key, {location: form.sLoc, item: form.sItem, unit: form.sUnit || 'kg'}, ['sLoc', 'sItem', 'sUnit'])} className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3 rounded-xl font-bold text-sm md:text-base shadow-sm transition text-center">＋ 追加</button>
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
                                  {item.isFinished ? '📁 完了済' : '現場完了'}
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
                                <input type="number" value={item.price || 0} onChange={(e)=>updateItemField(sec.key, idx, 'price', e.target.value)} className="w-32 p-2.5 border border-slate-300 rounded-xl text-right text-sm md:text-base font-bold bg-white text-slate-900" placeholder="単価" />
                              </div>
                            </div>
                          ) : sec.isDisp ? (
                            <div className="space-y-2">
                              <div className="grid grid-cols-3 gap-2">
                                <input type="text" value={item.location || ''} onChange={(e)=>updateItemField(sec.key, idx, 'location', e.target.value)} placeholder="場所名" className="p-2.5 border border-slate-300 rounded-xl text-sm md:text-base font-bold bg-white" />
                                <input type="text" value={item.item || ''} onChange={(e)=>updateItemField(sec.key, idx, 'item', e.target.value)} placeholder="品目" className="p-2.5 border border-slate-300 rounded-xl text-sm md:text-base font-bold bg-white" />
                                <input type="text" value={item.unit || ''} onChange={(e)=>updateItemField(sec.key, idx, 'unit', e.target.value)} placeholder="単位" className="p-2.5 border border-slate-300 rounded-xl text-sm md:text-base font-bold bg-white" />
                              </div>
                              <div className="flex items-center justify-end gap-1.5 pt-1">
                                <span className="text-slate-500 font-bold text-sm">¥</span>
                                <input type="number" value={item.price || 0} onChange={(e)=>updateItemField(sec.key, idx, 'price', e.target.value)} className="w-32 p-2.5 border border-slate-300 rounded-xl text-right text-sm md:text-base font-bold bg-white text-slate-900" placeholder="単価" />
                              </div>
                            </div>
                          ) : sec.isScrap ? (
                            <div className="space-y-2">
                              <div className="grid grid-cols-2 gap-2">
                                <input type="text" value={item.location || ''} onChange={(e)=>updateItemField(sec.key, idx, 'location', e.target.value)} placeholder="スクラップ場名" className="p-2.5 border border-slate-300 rounded-xl text-sm md:text-base font-bold bg-white" />
                                <input type="text" value={item.item || ''} onChange={(e)=>updateItemField(sec.key, idx, 'item', e.target.value)} placeholder="品目" className="p-2.5 border border-slate-300 rounded-xl text-sm md:text-base font-bold bg-white" />
                              </div>
                              <div className="pt-1">
                                <input type="text" value={item.unit || ''} onChange={(e)=>updateItemField(sec.key, idx, 'unit', e.target.value)} placeholder="単位 (例: kg, t)" className="w-full p-2.5 border border-slate-300 rounded-xl text-sm md:text-base font-bold bg-white" />
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
                                <div className="relative w-32">
                                    <input type="number" value={item.price || 0} onChange={(e)=>updateItemField(sec.key, idx, 'price', e.target.value)} className="w-full p-2.5 pr-12 border border-slate-300 rounded-xl text-right text-sm md:text-base font-bold bg-white text-slate-900" placeholder="単価/日額" />
                                    {sec.key === 'locations' && (
                                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-normal text-slate-500 pointer-events-none">税抜</span>
                                    )}
                                </div>
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

      {/* 送信された日報一覧 */}
      <div className="bg-white p-4 md:p-8 rounded-2xl md:rounded-3xl shadow-sm border border-slate-100 space-y-6">
        <div className="flex justify-between items-center flex-wrap gap-3">
          <h2 className="text-xl md:text-2xl font-bold text-slate-900">📥 送信された日報一覧（現場別リスト）</h2>
          <input 
            type="text" 
            placeholder="🔍 現場名で絞り込み..." 
            value={filterLocation} 
            onChange={e => setFilterLocation(e.target.value)} 
            className="p-3.5 border border-slate-300 rounded-xl text-base bg-slate-50 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:outline-none w-full md:w-80 transition font-bold" 
          />
        </div>

        <div className="space-y-6">
          {locList.filter(loc => !filterLocation || loc.name.includes(filterLocation)).map(loc => {
            const locReports = filteredReports.filter(r => r.location === loc.name);
            if (locReports.length === 0) return null;

            const isReportOpen = reportSectionOpen[loc.name] || false;

            return (
              <div key={loc.name} className="bg-slate-50/90 rounded-3xl border border-slate-200 p-4 md:p-6 space-y-4 shadow-xs">
                <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-xl md:text-2xl text-blue-700">🏢 {loc.name}</span>
                    <span className="bg-slate-200 text-slate-700 text-xs md:text-sm px-3 py-1 rounded-full font-bold">{locReports.length}件の日報</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReportSectionOpen({ ...reportSectionOpen, [loc.name]: !isReportOpen })}
                    className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 px-4 py-2 rounded-xl text-sm md:text-base font-bold shadow-2xs transition flex items-center gap-1.5"
                  >
                    {isReportOpen ? '日報を閉じる ▲' : '日報を開く ▼'}
                  </button>
                </div>

                {isReportOpen && (
                  <div className="space-y-3 animate-fadeIn pt-1">
                    {locReports.map((r, i) => {
                      const originalIndex = reports.findIndex(item => (item.id && item.id === r.id) || (item._id && item._id === r._id) || item === r);
                      return (
                        <div key={r.id || r._id || i} className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-2xs">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-3 flex-wrap">
                              <span className="font-bold text-slate-700 text-sm md:text-base">📅 {r.date}</span>
                              <span className="font-bold text-slate-900 text-sm md:text-base">👤 職長: {r.manager || '-'} / 作業者: {(r.workers || []).join(', ') || '-'}</span>
                            </div>

                            {r.jobTypes && Object.keys(r.jobTypes).length > 0 && (
                              <div className="text-sm text-indigo-800 font-bold">
                                🏷️ 職種人数: {Object.entries(r.jobTypes).map(([job, count]) => `${job}: ${count}人`).join(', ')}
                              </div>
                            )}

                            {(r.subcontractors || []).length > 0 && (
                              <div className="text-sm text-orange-800 font-bold">
                                外注: {(r.subcontractors || []).map((s:any)=>`${s.company} (${s.task}: ${s.count}人)`).join(', ')}
                              </div>
                            )}

                            <div className="text-sm text-slate-700 font-medium">
                              重機・車両: {[
                                ...(r.machines || []), 
                                ...(r.leaseHeavy || []), 
                                ...(r.leaseAttach || []), 
                                ...(r.leaseOther || []), 
                                ...(r.ishikawaHeavy || []), 
                                ...(r.ishikawaAttach || []), 
                                ...(r.ishikawaOther || []), 
                                ...(r.mokCustomMachines || []).map((m:any)=>`${m.name}(${m.count}個)`),
                                ...(r.otherLeases || []).map((ol:any)=>`${ol.company}(${ol.name}:${ol.count}個)`),
                                ...(r.ownMachines || []), 
                                ...(r.vehicles || [])
                              ].join(', ') || '-'}
                            </div>

                            <div className="text-sm text-slate-700 font-medium grid grid-cols-2 md:grid-cols-4 gap-2 bg-slate-50 p-2.5 rounded-xl border">
                              <div>軽油: <b>{r.fuel || 0} L</b></div>
                              <div>レギュラー: <b>¥{Number(r.regularPrice || 0).toLocaleString()}</b></div>
                              <div>ETC: <b>¥{Number(r.etcPrice || 0).toLocaleString()}</b></div>
                              <div>駐車場代: <b>¥{Number(r.parkingPrice || 0).toLocaleString()}</b></div>
                              {r.otherItem && <div className="col-span-2">雑費({r.otherItem}): <b>¥{Number(r.otherPrice || 0).toLocaleString()}</b></div>}
                            </div>

                            {((r.disposals || []).length > 0 || (r.scraps || []).length > 0) && (
                              <div className="flex flex-col gap-1 pt-0.5">
                                {(r.disposals || []).length > 0 && (
                                  <div className="text-sm text-amber-800 font-bold">
                                    🗑️ 処分: {(r.disposals || []).map((d: any) => `${d.location || 'その他'} (${d.item || '品目未指定'}: ${d.quantity || 0}${d.unit || 't'})`).join(', ')}
                                  </div>
                                )}
                                {(r.scraps || []).length > 0 && (
                                  <div className="text-sm text-emerald-800 font-bold">
                                    ♻️ スクラップ: {(r.scraps || []).map((sc: any) => `${sc.location || 'その他'} (${sc.item || '品目未指定'}: ${sc.quantity || 0}${sc.unit || 'kg'})`).join(', ')}
                                  </div>
                                )}
                              </div>
                            )}

                            {r.workDescription && (
                              <div className="text-sm md:text-base text-slate-700 font-medium bg-slate-50 p-3 rounded-xl border border-slate-200 whitespace-pre-wrap">
                                {r.workDescription}
                              </div>
                            )}
                          </div>

                          {authRole === 'admin' && (
                            <div className="flex md:flex-col gap-2 shrink-0 w-full md:w-auto">
                              <button onClick={() => setEditingReport({ ...r })} className="flex-1 md:flex-none bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-600 px-4 py-2.5 rounded-xl font-bold transition text-sm shadow-2xs">編集</button>
                              <button onClick={() => handleDeleteReport(r, originalIndex !== -1 ? originalIndex : i)} className="flex-1 md:flex-none bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-600 px-4 py-2.5 rounded-xl font-bold transition text-sm shadow-2xs">削除</button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          {filteredReports.length === 0 && (
            <p className="text-base text-slate-400 text-center py-6">日報データはありません</p>
          )}
        </div>
      </div>

      {/* 日報編集モーダル */}
      {editingReport && authRole === 'admin' && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-md flex items-center justify-center p-3 md:p-6 z-50 animate-fadeIn">
          <form onSubmit={handleUpdateReport} className="bg-white rounded-[32px] w-full max-w-4xl p-6 md:p-10 max-h-[92vh] overflow-y-auto space-y-8 shadow-2xl border border-slate-100">

            <div className="flex justify-between items-center border-b border-slate-100 pb-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center text-2xl shadow-inner">📝</div>
                <div>
                  <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">日報データの編集</h2>
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
                <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wider">📍 日付と現場の選択</h3>
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

              <div className="bg-slate-50/80 p-5 md:p-6 rounded-3xl border border-slate-200/60 space-y-4">
                <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wider">👥 作業員</h3>
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

              <div className="bg-slate-50/80 p-5 md:p-6 rounded-3xl border border-slate-200/60 space-y-4">
                <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wider">🏷️ 職種ごとの人数</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {(settings.jobTypes || []).map((j: any) => (
                    <div key={j.name} className="bg-white p-3 rounded-2xl border flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-slate-700">{j.name}</span>
                      <input 
                        type="number" 
                        min="0"
                        className="w-20 p-2 border rounded-xl text-center font-bold text-sm"
                        value={editingReport.jobTypes?.[j.name] || ''}
                        onChange={e => {
                          const currentJobTypes = editingReport.jobTypes || {};
                          setEditingReport({
                            ...editingReport,
                            jobTypes: { ...currentJobTypes, [j.name]: e.target.value }
                          });
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-50/80 p-5 md:p-6 rounded-3xl border border-slate-200/60 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wider">👤 外注・派遣作業員</h3>
                  <button type="button" onClick={() => setEditingReport({...editingReport, subcontractors: [...(editingReport.subcontractors || []), {company: '', task: '', count: ''}]})} className="bg-emerald-600 text-white text-xs px-3 py-1.5 rounded-xl font-bold shadow hover:bg-emerald-700 transition">＋ 追加</button>
                </div>
                {(editingReport.subcontractors || []).map((sub: any, sIdx: number) => {
                  const uniqueCompanies = Array.from(new Set((settings.subcontractors || []).map((s:any) => s.company).filter(Boolean)));
                  const availableTasks = (settings.subcontractors || []).filter((s:any) => s.company === sub.company).map((s:any) => s.task);
                  return (
                    <div key={sIdx} className="p-4 border-2 rounded-2xl bg-white space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-bold text-slate-700 block mb-1">外注会社名</label>
                          <select className="w-full p-2.5 rounded-xl border font-bold text-sm bg-white" value={sub.company} onChange={e => {
                            const updated = [...(editingReport.subcontractors || [])];
                            updated[sIdx] = { ...updated[sIdx], company: e.target.value, task: '' };
                            setEditingReport({ ...editingReport, subcontractors: updated });
                          }}>
                            <option value="">会社を選択...</option>
                            {uniqueCompanies.map((comp:any)=><option key={comp} value={comp}>{comp}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-700 block mb-1">作業内容</label>
                          <select className="w-full p-2.5 rounded-xl border font-bold text-sm bg-white" value={sub.task} onChange={e => {
                            const updated = [...(editingReport.subcontractors || [])];
                            updated[sIdx] = { ...updated[sIdx], task: e.target.value };
                            setEditingReport({ ...editingReport, subcontractors: updated });
                          }}>
                            <option value="">内容を選択...</option>
                            {availableTasks.map((t:any, idx:number)=><option key={idx} value={t}>{t}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="flex items-end gap-3">
                        <div className="flex-1">
                          <label className="text-xs font-bold text-slate-700 block mb-1">人数</label>
                          <input type="number" placeholder="0" className="w-full p-2.5 rounded-xl border font-bold text-sm bg-white" value={sub.count} onChange={e => {
                            const updated = [...(editingReport.subcontractors || [])];
                            updated[sIdx] = { ...updated[sIdx], count: e.target.value };
                            setEditingReport({ ...editingReport, subcontractors: updated });
                          }}/>
                        </div>
                        <button type="button" onClick={() => {
                          const updated = (editingReport.subcontractors || []).filter((_:any, i:number)=>i!==sIdx);
                          setEditingReport({ ...editingReport, subcontractors: updated });
                        }} className="bg-red-100 text-red-700 px-3 py-2.5 rounded-xl font-bold text-xs">削除</button>
                      </div>
                    </div>
                );
                })}
              </div>

              {/* 処分（disposals）の編集セクション */}
              <div className="bg-slate-50/80 p-5 md:p-6 rounded-3xl border border-slate-200/60 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wider">🗑️ 処分場・搬出データ</h3>
                  <button type="button" onClick={() => setEditingReport({...editingReport, disposals: [...(editingReport.disposals || []), {location: '', item: '', quantity: '', unit: 't'}]})} className="bg-emerald-600 text-white text-xs px-3 py-1.5 rounded-xl font-bold shadow hover:bg-emerald-700 transition">＋ 処分項目を追加</button>
                </div>
                {(editingReport.disposals || []).map((disp: any, dIdx: number) => {
                  const uniqueDispLocations = Array.from(new Set((settings.disposalLocations || []).map((d:any) => d.location).filter(Boolean)));
                  const availableDispItems = (settings.disposalLocations || []).filter((d:any) => d.location === disp.location);
                  return (
                    <div key={dIdx} className="p-4 border-2 rounded-2xl bg-white space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-bold text-slate-700 block mb-1">処分場名</label>
                          <select className="w-full p-2.5 rounded-xl border font-bold text-sm bg-white" value={disp.location} onChange={e => {
                            const updated = [...(editingReport.disposals || [])];
                            updated[dIdx] = { ...updated[dIdx], location: e.target.value, item: '' };
                            setEditingReport({ ...editingReport, disposals: updated });
                          }}>
                            <option value="">処分場を選択...</option>
                            {uniqueDispLocations.map((loc:any)=><option key={loc} value={loc}>{loc}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-700 block mb-1">品目</label>
                          <select className="w-full p-2.5 rounded-xl border font-bold text-sm bg-white" value={disp.item} onChange={e => {
                            const updated = [...(editingReport.disposals || [])];
                            const selectedItemObj = availableDispItems.find((d:any) => d.item === e.target.value);
                            updated[dIdx] = { ...updated[dIdx], item: e.target.value, unit: selectedItemObj?.unit || 't' };
                            setEditingReport({ ...editingReport, disposals: updated });
                          }}>
                            <option value="">品目を選択...</option>
                            {availableDispItems.map((d:any, idx:number)=><option key={idx} value={d.item}>{d.item} ({d.unit})</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="flex items-end gap-3">
                        <div className="flex-1">
                          <label className="text-xs font-bold text-slate-700 block mb-1">数量 ({disp.unit || 't'})</label>
                          <input type="number" step="0.01" placeholder="0" className="w-full p-2.5 rounded-xl border font-bold text-sm bg-white" value={disp.quantity} onChange={e => {
                            const updated = [...(editingReport.disposals || [])];
                            updated[dIdx] = { ...updated[dIdx], quantity: e.target.value };
                            setEditingReport({ ...editingReport, disposals: updated });
                          }}/>
                        </div>
                        <button type="button" onClick={() => {
                          const updated = (editingReport.disposals || []).filter((_:any, i:number)=>i!==dIdx);
                          setEditingReport({ ...editingReport, disposals: updated });
                        }} className="bg-red-100 text-red-700 px-3 py-2.5 rounded-xl font-bold text-xs">削除</button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* スクラップ（scraps）の編集セクション */}
              <div className="bg-slate-50/80 p-5 md:p-6 rounded-3xl border border-slate-200/60 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wider">♻️ スクラップ搬出データ</h3>
                  <button type="button" onClick={() => setEditingReport({...editingReport, scraps: [...(editingReport.scraps || []), {location: '', item: '', quantity: '', unit: 'kg'}]})} className="bg-emerald-600 text-white text-xs px-3 py-1.5 rounded-xl font-bold shadow hover:bg-emerald-700 transition">＋ スクラップ項目を追加</button>
                </div>
                {(editingReport.scraps || []).map((sc: any, scIdx: number) => {
                  const uniqueScrapLocations = Array.from(new Set((settings.scrapLocations || []).map((s:any) => s.location).filter(Boolean)));
                  const availableScrapItems = (settings.scrapLocations || []).filter((s:any) => s.location === sc.location);
                  return (
                    <div key={scIdx} className="p-4 border-2 rounded-2xl bg-white space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-bold text-slate-700 block mb-1">スクラップ場名</label>
                          <select className="w-full p-2.5 rounded-xl border font-bold text-sm bg-white" value={sc.location} onChange={e => {
                            const updated = [...(editingReport.scraps || [])];
                            updated[scIdx] = { ...updated[scIdx], location: e.target.value, item: '' };
                            setEditingReport({ ...editingReport, scraps: updated });
                          }}>
                            <option value="">スクラップ場を選択...</option>
                            {uniqueScrapLocations.map((loc:any)=><option key={loc} value={loc}>{loc}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-700 block mb-1">品目</label>
                          <select className="w-full p-2.5 rounded-xl border font-bold text-sm bg-white" value={sc.item} onChange={e => {
                            const updated = [...(editingReport.scraps || [])];
                            const selectedItemObj = availableScrapItems.find((s:any) => s.item === e.target.value);
                            updated[scIdx] = { ...updated[scIdx], item: e.target.value, unit: selectedItemObj?.unit || 'kg' };
                            setEditingReport({ ...editingReport, scraps: updated });
                          }}>
                            <option value="">品目を選択...</option>
                            {availableScrapItems.map((s:any, idx:number)=><option key={idx} value={s.item}>{s.item} ({s.unit})</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="flex items-end gap-3">
                        <div className="flex-1">
                          <label className="text-xs font-bold text-slate-700 block mb-1">数量 ({sc.unit || 'kg'})</label>
                          <input type="number" step="0.01" placeholder="0" className="w-full p-2.5 rounded-xl border font-bold text-sm bg-white" value={sc.quantity} onChange={e => {
                            const updated = [...(editingReport.scraps || [])];
                            updated[scIdx] = { ...updated[scIdx], quantity: e.target.value };
                            setEditingReport({ ...editingReport, scraps: updated });
                          }}/>
                        </div>
                        <button type="button" onClick={() => {
                          const updated = (editingReport.scraps || []).filter((_:any, i:number)=>i!==scIdx);
                          setEditingReport({ ...editingReport, scraps: updated });
                        }} className="bg-red-100 text-red-700 px-3 py-2.5 rounded-xl font-bold text-xs">削除</button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="bg-slate-50/80 p-5 md:p-6 rounded-3xl border border-slate-200/60 space-y-4">
                <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wider">🚛 自社保有（重機・車両）</h3>
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-700 block">【自社重機】</label>
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
                <div className="space-y-3 pt-2">
                  <label className="text-xs font-bold text-slate-700 block">【自社車両（乗用車・トラック）】</label>
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
              </div>

              <div className="bg-slate-50/80 p-5 md:p-6 rounded-3xl border border-slate-200/60 space-y-4">
                <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wider">🏢 南大阪建機（MOK）からのリース</h3>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 block">【重機】</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                    {(settings.leaseHeavy || []).map((m: any) => {
                      const checked = (editingReport.leaseHeavy || []).includes(m.name);
                      return (
                        <label key={m.name} className={`flex items-center gap-2.5 p-3 rounded-2xl border cursor-pointer text-xs md:text-sm font-medium transition ${checked ? 'bg-blue-50 border-blue-300 text-blue-900 font-bold' : 'bg-white border-slate-200'}`}>
                          <input type="checkbox" checked={checked} onChange={e => {
                            const current = editingReport.leaseHeavy || [];
                            const updated = e.target.checked ? [...current, m.name] : current.filter((x: string) => x !== m.name);
                            setEditingReport({ ...editingReport, leaseHeavy: updated });
                          }} className="rounded text-blue-600 w-4 h-4" />
                          <span className="truncate">{m.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 block">【アタッチメント】</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                    {(settings.leaseAttach || []).map((m: any) => {
                      const checked = (editingReport.leaseAttach || []).includes(m.name);
                      return (
                        <label key={m.name} className={`flex items-center gap-2.5 p-3 rounded-2xl border cursor-pointer text-xs md:text-sm font-medium transition ${checked ? 'bg-blue-50 border-blue-300 text-blue-900 font-bold' : 'bg-white border-slate-200'}`}>
                          <input type="checkbox" checked={checked} onChange={e => {
                            const current = editingReport.leaseAttach || [];
                            const updated = e.target.checked ? [...current, m.name] : current.filter((x: string) => x !== m.name);
                            setEditingReport({ ...editingReport, leaseAttach: updated });
                          }} className="rounded text-blue-600 w-4 h-4" />
                          <span className="truncate">{m.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 block">【その他の機械・機器】</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                    {(settings.leaseOther || []).map((m: any) => {
                      const checked = (editingReport.leaseOther || []).includes(m.name);
                      return (
                        <label key={m.name} className={`flex items-center gap-2.5 p-3 rounded-2xl border cursor-pointer text-xs md:text-sm font-medium transition ${checked ? 'bg-blue-50 border-blue-300 text-blue-900 font-bold' : 'bg-white border-slate-200'}`}>
                          <input type="checkbox" checked={checked} onChange={e => {
                            const current = editingReport.leaseOther || [];
                            const updated = e.target.checked ? [...current, m.name] : current.filter((x: string) => x !== m.name);
                            setEditingReport({ ...editingReport, leaseOther: updated });
                          }} className="rounded text-blue-600 w-4 h-4" />
                          <span className="truncate">{m.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="bg-slate-50/80 p-5 md:p-6 rounded-3xl border border-slate-200/60 space-y-4">
                <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wider">🗾 石川県出張用リース機器</h3>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 block">【（石川県）重機を選択】</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                    {(settings.ishikawaHeavy || []).map((m: any) => {
                      const checked = (editingReport.ishikawaHeavy || []).includes(m.name);
                      return (
                        <label key={m.name} className={`flex items-center gap-2.5 p-3 rounded-2xl border cursor-pointer text-xs md:text-sm font-medium transition ${checked ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-bold' : 'bg-white border-slate-200'}`}>
                          <input type="checkbox" checked={checked} onChange={e => {
                            const current = editingReport.ishikawaHeavy || [];
                            const updated = e.target.checked ? [...current, m.name] : current.filter((x: string) => x !== m.name);
                            setEditingReport({ ...editingReport, ishikawaHeavy: updated });
                          }} className="rounded text-indigo-600 w-4 h-4" />
                          <span className="truncate">{m.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 block">【（石川県）アタッチメントを選択】</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                    {(settings.ishikawaAttach || []).map((m: any) => {
                      const checked = (editingReport.ishikawaAttach || []).includes(m.name);
                      return (
                        <label key={m.name} className={`flex items-center gap-2.5 p-3 rounded-2xl border cursor-pointer text-xs md:text-sm font-medium transition ${checked ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-bold' : 'bg-white border-slate-200'}`}>
                          <input type="checkbox" checked={checked} onChange={e => {
                            const current = editingReport.ishikawaAttach || [];
                            const updated = e.target.checked ? [...current, m.name] : current.filter((x: string) => x !== m.name);
                            setEditingReport({ ...editingReport, ishikawaAttach: updated });
                          }} className="rounded text-indigo-600 w-4 h-4" />
                          <span className="truncate">{m.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 block">【（石川県）その他機械・機器を選択】</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                    {(settings.ishikawaOther || []).map((m: any) => {
                      const checked = (editingReport.ishikawaOther || []).includes(m.name);
                      return (
                        <label key={m.name} className={`flex items-center gap-2.5 p-3 rounded-2xl border cursor-pointer text-xs md:text-sm font-medium transition ${checked ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-bold' : 'bg-white border-slate-200'}`}>
                          <input type="checkbox" checked={checked} onChange={e => {
                            const current = editingReport.ishikawaOther || [];
                            const updated = e.target.checked ? [...current, m.name] : current.filter((x: string) => x !== m.name);
                            setEditingReport({ ...editingReport, ishikawaOther: updated });
                          }} className="rounded text-indigo-600 w-4 h-4" />
                          <span className="truncate">{m.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="bg-slate-50/80 p-5 md:p-6 rounded-3xl border border-slate-200/60 space-y-4">
                <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wider">⛽ 燃料・経費</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1.5">軽油 (L)</label>
                    <input type="number" value={editingReport.fuel || 0} onChange={e=>setEditingReport({...editingReport, fuel: e.target.value})} className="w-full p-3.5 border border-slate-300 rounded-2xl text-sm bg-white font-bold text-right shadow-2xs" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1.5">レギュラー購入分 (円)</label>
                    <input type="number" value={editingReport.regularPrice || 0} onChange={e=>setEditingReport({...editingReport, regularPrice: e.target.value})} className="w-full p-3.5 border border-slate-300 rounded-2xl text-sm bg-white font-bold text-right shadow-2xs" />
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
                <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wider">📝 作業内容メモ</h3>
                <textarea rows={3} value={editingReport.workDescription || ''} onChange={e=>setEditingReport({...editingReport, workDescription: e.target.value})} className="w-full p-4 border border-slate-300 rounded-2xl text-sm bg-white font-medium shadow-2xs leading-relaxed" placeholder="本日の作業内容や特記事項を入力..." />
              </div>

            </div>

            <div className="flex gap-4 pt-4 border-t border-slate-100">
              <button type="submit" className="flex-1 bg-orange-600 hover:bg-orange-700 text-white py-4 rounded-2xl font-bold text-base md:text-lg shadow-lg shadow-orange-500/20 transition">
                💾 更新を保存する
              </button>
              <button type="button" onClick={() => setEditingReport(null)} className="px-8 bg-slate-200 hover:bg-slate-300 text-slate-700 py-4 rounded-2xl font-bold text-base transition">
                キャンセル
              </button>
            </div>

          </form>
        </div>
      )}

      {/* 現場詳細モーダル */}
      {modalLocation && modalData && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-2 md:p-8 z-40 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-6xl p-5 md:p-10 max-h-[92vh] overflow-y-auto space-y-6 md:space-y-8 shadow-2xl border border-slate-100">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200 pb-4 md:pb-6 gap-3">
              <div className="flex flex-col items-start gap-3">
                <button onClick={() => setModalLocation(null)} className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-5 md:px-6 py-2.5 md:py-3 rounded-xl text-sm md:text-base font-bold transition">閉じる</button>
                <div>
                  <h2 className="text-2xl md:text-4xl font-bold text-slate-900">{modalLocation} <span className="text-base md:text-xl font-normal text-slate-500 block md:inline">（詳細分析）</span></h2>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <p className="text-sm md:text-base text-slate-500">原価・収支および内訳明細</p>
                    {authRole === 'admin' && (
                      <button onClick={() => downloadLocationCSV(modalLocation)} className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs px-3 py-1.5 rounded-lg font-bold transition shadow-2xs flex items-center gap-1">
                        📥 CSV出力
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50 p-5 md:p-6 rounded-2xl border border-slate-200 flex flex-col justify-between space-y-3 shadow-2xs">
                <div>
                  <div className="text-sm md:text-base font-bold text-slate-600">
                    📉 スクラップ売却額を差引しない場合（純粋な粗利）
                  </div>
                  <div className="text-xs md:text-sm text-slate-400 mt-1">
                    （請負金額 ¥{modalData.contractPrice.toLocaleString()} 税抜 - 合計経費 ¥{modalData.total.toLocaleString()}）
                  </div>
                </div>
                <div className={`text-2xl md:text-4xl font-bold ${modalData.profitWithoutScrap >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                  ¥{modalData.profitWithoutScrap.toLocaleString()}
                </div>
              </div>

              <div className="bg-emerald-50/80 p-5 md:p-6 rounded-2xl border border-emerald-200 flex flex-col justify-between space-y-3 shadow-2xs">
                <div>
                  <div className="text-sm md:text-base font-bold text-emerald-800">
                    📈 スクラップ売却額を差引した後（売却益込・最終粗利）
                  </div>
                  <div className="text-xs md:text-sm text-emerald-600 mt-1">
                    （純粋な粗利 ＋ スクラップ売却計 +¥{modalData.scrapTotal.toLocaleString()}）
                  </div>
                </div>
                <div className={`text-2xl md:text-4xl font-bold ${modalData.profit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                  ¥{modalData.profit.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5 text-center">
              <div className="bg-slate-50 p-4 md:p-6 rounded-2xl border border-slate-200"><div className="text-xs md:text-base text-slate-600 font-bold">請負金額 (税抜)</div><div className="text-xl md:text-3xl font-bold text-slate-900 mt-1.5">¥{modalData.contractPrice.toLocaleString()}</div></div>
              <div className="bg-emerald-50/60 p-4 md:p-6 rounded-2xl border border-emerald-200"><div className="text-xs md:text-base text-emerald-700 font-bold">合計経費</div><div className="text-xl md:text-3xl font-bold text-emerald-800 mt-1.5">¥{modalData.total.toLocaleString()}</div></div>
              <div className="bg-blue-50/60 p-4 md:p-6 rounded-2xl border border-blue-200"><div className="text-xs md:text-base text-blue-700 font-bold">利益（売却益込）</div><div className="text-xl md:text-3xl font-bold text-blue-800 mt-1.5">¥{modalData.profit.toLocaleString()}</div></div>
              <div className="bg-amber-50/60 p-4 md:p-6 rounded-2xl border border-amber-200"><div className="text-xs md:text-base text-amber-700 font-bold">稼働日数</div><div className="text-xl md:text-3xl font-bold text-amber-800 mt-1.5">{modalData.days}日</div></div>
            </div>

            <div className="bg-emerald-50 p-4 md:p-6 rounded-2xl border border-emerald-200 flex flex-col gap-3 shadow-2xs">
              <div className="flex justify-between items-center flex-wrap gap-3">
                <span className="text-emerald-900 font-bold text-base md:text-xl">♻️ スクラップ売却計</span>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-emerald-800 text-2xl md:text-3xl">+ ¥{modalData.scrapTotal.toLocaleString()}</span>
                  <button onClick={() => setShowScrapModal(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs md:text-base px-4 py-2.5 rounded-xl font-bold shadow-xs transition">
                    🔍 内訳・金額入力
                  </button>
                </div>
              </div>
            </div>

            {/* 外注費 詳細・計算内訳 ＋ 手動一括請負追加フォーム */}
            <div className="bg-orange-50/50 p-5 rounded-2xl border border-orange-200 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-lg text-orange-900">👥 外注費 詳細・計算内訳</h3>
                <span className="text-sm font-bold text-orange-800 bg-orange-100 px-3 py-1 rounded-xl">外注費合計: ¥{modalData.subCostTotal.toLocaleString()}</span>
              </div>

              {authRole === 'admin' && (
                <div className="bg-white p-4 rounded-xl border border-orange-300 space-y-3 shadow-2xs">
                  <div className="text-sm font-bold text-orange-900">＋ 一括請負・外注費の直接追加</div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <input 
                      type="text" 
                      placeholder="会社名 (例: 〇〇工業)" 
                      value={customSubForm[modalLocation]?.company || ''} 
                      onChange={e => setCustomSubForm({ ...customSubForm, [modalLocation]: { ...(customSubForm[modalLocation] || {}), company: e.target.value } })} 
                      className="p-2.5 border border-slate-300 rounded-xl text-sm font-bold bg-slate-50"
                    />
                    <input 
                      type="text" 
                      placeholder="作業内容 (例: 解体一式)" 
                      value={customSubForm[modalLocation]?.task || ''} 
                      onChange={e => setCustomSubForm({ ...customSubForm, [modalLocation]: { ...(customSubForm[modalLocation] || {}), task: e.target.value } })} 
                      className="p-2.5 border border-slate-300 rounded-xl text-sm font-bold bg-slate-50"
                    />
                    <input 
                      type="number" 
                      placeholder="金額 (例: 1000000)" 
                      value={customSubForm[modalLocation]?.price || ''} 
                      onChange={e => setCustomSubForm({ ...customSubForm, [modalLocation]: { ...(customSubForm[modalLocation] || {}), price: e.target.value } })} 
                      className="p-2.5 border border-slate-300 rounded-xl text-sm font-bold bg-slate-50"
                    />
                  </div>
                  <button 
                    type="button" 
                    onClick={() => handleAddCustomSubcontractor(modalLocation)} 
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white py-2.5 rounded-xl font-bold text-sm shadow-xs transition"
                  >
                    この外注費を追加する
                  </button>
                </div>
              )}

              {(customSubcontractors[modalLocation] || []).length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-bold text-orange-800">【手動追加・一括外注分】</div>
                  {(customSubcontractors[modalLocation] || []).map((cs: any, csIdx: number) => (
                    <div key={csIdx} className="bg-white p-3.5 rounded-xl border border-orange-300 flex justify-between items-center text-sm font-medium text-slate-800 shadow-2xs">
                      <span>🏢 <b>{cs.company}</b> ({cs.task}) : <span className="text-orange-700 font-bold">¥{Number(cs.price).toLocaleString()}</span></span>
                      {authRole === 'admin' && (
                        <button type="button" onClick={() => handleDeleteCustomSubcontractor(modalLocation, csIdx)} className="bg-rose-50 hover:bg-rose-100 text-rose-600 px-3 py-1 rounded-lg text-xs font-bold transition">削除</button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-600">【日報由来の外注費】</div>
                {reports.filter(r => r.location === modalLocation && (r.subcontractors || []).length > 0).length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-2">日報データに基づく外注費はありません</p>
                ) : (
                  reports.filter(r => r.location === modalLocation && (r.subcontractors || []).length > 0).map((r, idx) => (
                    <div key={idx} className="bg-white p-3.5 rounded-xl border border-orange-200 space-y-2">
                      <div className="text-xs font-bold text-slate-600">🗓️ 日付: {r.date}</div>
                      {(r.subcontractors || []).map((sub: any, sIdx: number) => {
                        const subMaster = (settings.subcontractors || []).find((x:any) => x.company === sub.company && x.task === sub.task);
                        const unitP = sub.price !== undefined && sub.price !== null && sub.price !== '' ? Number(sub.price) : (subMaster?.price || 0);
                        const subTotalCalc = Number(sub.count || 0) * unitP;
                        return (
                          <div key={sIdx} className="flex justify-between items-center text-sm font-medium text-slate-800 bg-slate-50 p-2.5 rounded-lg">
                            <span>🏢 <b>{sub.company}</b> ({sub.task}) : 数量 {sub.count}人 × 単価 ¥{unitP.toLocaleString()}</span>
                            <span className="font-bold text-orange-700">¥{subTotalCalc.toLocaleString()}</span>
                          </div>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-slate-50 p-4 md:p-8 rounded-2xl md:rounded-3xl border border-slate-200 space-y-4 md:space-y-6">
              <div className="flex justify-between items-center flex-wrap gap-3">
                <h3 className="font-bold text-lg md:text-xl text-slate-900">📋 経費・収支の内訳明細</h3>
                <button onClick={() => setShowDisposalModal(true)} className="bg-orange-600 hover:bg-orange-700 text-white text-xs md:text-base px-4 py-2.5 rounded-xl font-bold shadow-xs transition">🔍 処分費の内訳を確認</button>
              </div>

              <div className="bg-orange-50/80 p-4 md:p-5 rounded-2xl border border-orange-200 space-y-3">
                <div className="font-bold text-orange-900 text-base md:text-lg">⛽ 月別 1Lあたりの軽油単価設定</div>
                <p className="text-xs md:text-sm text-orange-700 font-medium">月をまたぐ現場の場合、月ごとの1L単価を入力すると下の「燃料代(軽油)」に自動反映されます。</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-1">
                  {modalReportYearMonths.length === 0 ? (
                    <p className="text-sm text-slate-500 font-medium">この現場の日報データがまだありません</p>
                  ) : (
                    modalReportYearMonths.map(ym => {
                      const currentPrice = fuelUnitPrices[modalLocation]?.[ym] ?? '';
                      return (
                        <div key={ym} className="bg-white p-3.5 rounded-xl border border-orange-200 space-y-1.5 shadow-2xs">
                          <label className="text-xs md:text-sm font-bold text-slate-700 block">{ym} の単価(1L)</label>
                          <div className="flex items-center gap-1">
                            <span className="text-sm text-slate-500 font-bold">¥</span>
                            <input 
                              type="number" 
                              value={currentPrice} 
                              onChange={e => handleFuelUnitPriceChange(modalLocation, ym, e.target.value)}
                              readOnly={authRole === 'viewer'}
                              placeholder="例: 145"
                              className={`w-full p-2.5 border border-slate-300 rounded-lg text-base font-bold text-right ${authRole === 'viewer' ? 'bg-slate-100 cursor-not-allowed' : 'bg-white'}`}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
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
                { key: 'fuel', label: '燃料代 (軽油・月別単価)', val: costOverrides[modalLocation]?.fuel ?? modalData.fuelCost },
                { key: 'regular', label: 'レギュラー購入分', val: costOverrides[modalLocation]?.regular ?? modalData.regularCost },
                { key: 'etc', label: '高速代・ETC', val: costOverrides[modalLocation]?.etc ?? modalData.etcCost },
                { key: 'parking', label: '駐車場代', val: costOverrides[modalLocation]?.parking ?? modalData.parkingCost },
                { key: 'other', label: 'その他雑費', val: costOverrides[modalLocation]?.other ?? modalData.otherCost },
              ].map((item) => {
                const isEditing = editingCostFields[modalLocation]?.[item.key];
                return (
                  <div key={item.key} className={`bg-white p-4 md:p-6 rounded-2xl border border-slate-300 shadow-2xs flex flex-col justify-between gap-3 ${item.isDisposal ? 'col-span-full md:col-span-1' : ''}`}>
                    <div className="flex justify-between items-center">
                      <span className={`text-base md:text-lg font-bold ${item.isDisposal ? 'text-orange-600' : 'text-slate-700'}`}>{item.label}</span>
                      {authRole === 'admin' && (
                        <button
                          type="button"
                          onClick={() => toggleCostFieldEdit(modalLocation, item.key)}
                          className="text-xs text-blue-600 hover:text-blue-800 underline font-bold"
                        >
                          {isEditing ? '完了' : '手動上書き'}
                        </button>
                      )}
                    </div>

                    <div className="flex items-baseline justify-between">
                      {isEditing ? (
                        <div className="flex items-center gap-1 w-full">
                          <span className="text-slate-500 font-bold">¥</span>
                          <input
                            type="number"
                            value={costOverrides[modalLocation]?.[item.key] ?? ''}
                            onChange={(e) => handleCostOverrideChange(modalLocation, item.key, e.target.value)}
                            placeholder="上書き金額"
                            className="w-full p-2.5 border border-orange-400 rounded-xl font-bold text-right bg-orange-50/50 text-base"
                          />
                        </div>
                      ) : (
                        <div className="text-xl md:text-2xl font-bold text-slate-900">
                          ¥{Number(item.val || 0).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 処分費内訳モーダル */}
      {showDisposalModal && modalLocation && modalData && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-md flex items-center justify-center p-3 md:p-6 z-50 animate-fadeIn">
          <div className="bg-white rounded-[32px] w-full max-w-4xl p-6 md:p-10 max-h-[92vh] overflow-y-auto space-y-6 shadow-2xl border border-slate-100">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-xl md:text-2xl font-bold text-slate-900">🗑️ 処分費の内訳明細 ({modalLocation})</h3>
                <p className="text-xs md:text-sm text-slate-500 mt-0.5">処分場・品目ごとの数量および小計を確認できます</p>
              </div>
              <button onClick={() => setShowDisposalModal(false)} className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-lg transition">✕</button>
            </div>

            <div className="space-y-6">
              {Object.keys(modalData.aggregatedDisposalBreakdown).length === 0 ? (
                <p className="text-base text-slate-500 text-center py-8">この現場の処分データはありません</p>
              ) : (
                Object.entries(modalData.aggregatedDisposalBreakdown).map(([locKey, locObj]) => {
                  const isOpen = disposalDetailsOpen[locKey] || false;
                  return (
                    <div key={locKey} className="bg-slate-50 p-5 rounded-3xl border border-slate-200 space-y-4 shadow-2xs">
                      <div className="flex justify-between items-center flex-wrap gap-3 border-b border-slate-200 pb-3">
                        <div className="space-y-1">
                          <h4 className="font-bold text-lg md:text-xl text-blue-700">🏢 {locKey}</h4>
                          <div className="text-sm font-bold text-slate-700">
                            小計: <span className="text-orange-600 text-lg">¥{locObj.total.toLocaleString()}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {authRole === 'admin' && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-slate-600">手動上書き(合計):</span>
                              <input
                                type="number"
                                value={disposalOverrides[modalLocation]?.[locKey] ?? ''}
                                onChange={(e) => handleDisposalOverrideChange(modalLocation, locKey, e.target.value)}
                                placeholder="金額"
                                className="w-32 p-2 border border-slate-300 rounded-xl text-right font-bold text-sm bg-white"
                              />
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => setDisposalDetailsOpen({ ...disposalDetailsOpen, [locKey]: !isOpen })}
                            className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 px-3.5 py-2 rounded-xl text-xs md:text-sm font-bold shadow-2xs transition"
                          >
                            {isOpen ? '明細を閉じる ▲' : '明細を開く ▼'}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {Object.entries(locObj.items).map(([itemKey, itemData]) => {
                          const subKey = `${locKey}__${itemKey}`;
                          return (
                            <div key={itemKey} className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3 shadow-2xs">
                              <div className="flex justify-between items-center flex-wrap gap-3">
                                <div>
                                  <span className="font-bold text-base text-slate-800">{itemKey}</span>
                                  <div className="text-xs text-slate-500 font-medium mt-0.5">
                                    数量: <b className="text-slate-800">{itemData.quantity} {itemData.unit}</b> × 単価 ¥{itemData.price.toLocaleString()} = <b className="text-orange-600">¥{itemData.total.toLocaleString()}</b>
                                  </div>
                                </div>
                                {authRole === 'admin' && (
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-bold text-slate-600">品目別上書き:</span>
                                    <input
                                      type="number"
                                      value={disposalOverrides[modalLocation]?.[subKey] ?? ''}
                                      onChange={(e) => handleDisposalItemOverrideChange(modalLocation, locKey, itemKey, e.target.value)}
                                      placeholder="金額"
                                      className="w-28 p-2 border border-slate-300 rounded-xl text-right font-bold text-sm bg-white"
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {isOpen && (
                        <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2 pt-3">
                          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">📅 日別明細一覧</div>
                          <div className="space-y-1.5 max-h-60 overflow-y-auto">
                            {Object.values(locObj.items).flatMap(it => it.details).map((det, dIdx) => (
                              <div key={dIdx} className="flex justify-between items-center text-xs md:text-sm bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                <span>🗓️ {det.date} / <b>{det.item}</b></span>
                                <span>{det.quantity} {det.unit} × ¥{det.price.toLocaleString()} = <b>¥{det.total.toLocaleString()}</b></span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button onClick={() => setShowDisposalModal(false)} className="bg-slate-800 hover:bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold text-base transition">閉じる</button>
            </div>
          </div>
        </div>
      )}

      {/* スクラップ売却内訳モーダル */}
      {showScrapModal && modalLocation && modalData && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-md flex items-center justify-center p-3 md:p-6 z-50 animate-fadeIn">
          <div className="bg-white rounded-[32px] w-full max-w-4xl p-6 md:p-10 max-h-[92vh] overflow-y-auto space-y-6 shadow-2xl border border-slate-100">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-xl md:text-2xl font-bold text-slate-900">♻️ スクラップ売却内訳・金額入力 ({modalLocation})</h3>
                <p className="text-xs md:text-sm text-slate-500 mt-0.5">スクラップの搬出数量と売却額（またはトータル金額）を設定します</p>
              </div>
              <button onClick={() => setShowScrapModal(false)} className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-lg transition">✕</button>
            </div>

            <div className="space-y-6">
              <div className="bg-emerald-50 p-5 rounded-3xl border border-emerald-200 space-y-4">
                <div className="flex justify-between items-center flex-wrap gap-3">
                  <div>
                    <h4 className="font-bold text-lg text-emerald-900">💰 スクラップ売却額 合計手動設定</h4>
                    <p className="text-xs text-emerald-700 mt-0.5">ここに金額を入力すると、下の個別明細の合計に関わらずこの金額が最終粗利に加算されます。</p>
                  </div>
                  {authRole === 'admin' && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-emerald-800">¥</span>
                      <input
                        type="number"
                        value={scrapOverrides[modalLocation]?.total ?? ''}
                        onChange={(e) => handleScrapOverrideChange(modalLocation, 'total', e.target.value)}
                        placeholder="例: 150000"
                        className="w-40 p-2.5 border border-emerald-400 rounded-xl text-right font-bold text-base bg-white text-emerald-900 shadow-2xs"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-bold text-base text-slate-800">📦 搬出されたスクラップ一覧</h4>
                {Object.keys(modalData.aggregatedScrapBreakdown).length === 0 ? (
                  <p className="text-base text-slate-500 text-center py-6">この現場のスクラップ搬出データはありません</p>
                ) : (
                  Object.entries(modalData.aggregatedScrapBreakdown).map(([key, data]) => {
                    const isOpen = scrapDetailsOpen[key] || false;
                    const itemOvVal = scrapOverrides[modalLocation]?.[key] ?? '';
                    return (
                      <div key={key} className="bg-slate-50 p-5 rounded-3xl border border-slate-200 space-y-4 shadow-2xs">
                        <div className="flex justify-between items-center flex-wrap gap-3 border-b border-slate-200 pb-3">
                          <div>
                            <h5 className="font-bold text-lg text-slate-800">♻️ {key}</h5>
                            <div className="text-sm font-bold text-slate-600 mt-1">
                              総数量: <b className="text-slate-900">{data.quantity.toLocaleString()}</b>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            {authRole === 'admin' && (
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-slate-600">金額上書き:</span>
                                <input
                                  type="number"
                                  value={itemOvVal}
                                  onChange={(e) => handleScrapOverrideChange(modalLocation, key, e.target.value)}
                                  placeholder="金額"
                                  className="w-32 p-2 border border-slate-300 rounded-xl text-right font-bold text-sm bg-white"
                                />
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => setScrapDetailsOpen({ ...scrapDetailsOpen, [key]: !isOpen })}
                              className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 px-3.5 py-2 rounded-xl text-xs md:text-sm font-bold shadow-2xs transition"
                            >
                              {isOpen ? '明細を閉じる ▲' : '明細を開く ▼'}
                            </button>
                          </div>
                        </div>

                        {isOpen && (
                          <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2">
                            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">📅 搬出日別明細</div>
                            <div className="space-y-1.5 max-h-60 overflow-y-auto">
                              {data.details.map((det, dIdx) => (
                                <div key={dIdx} className="flex justify-between items-center text-xs md:text-sm bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                  <span>🗓️ {det.date} / <b>{det.item}</b></span>
                                  <span><b>{det.quantity} {det.unit}</b></span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button onClick={() => setShowScrapModal(false)} className="bg-slate-800 hover:bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold text-base transition">閉じる</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

```
