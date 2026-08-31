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
  
  // リース詳細表示の開閉状態を管理するステート
  const [showLeaseDetailModal, setShowLeaseDetailModal] = useState(false);

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
        return typeof l === 'string' ? { name: l, price: 0, client: '', startDate: '', isFinished: !isFinished } : { ...l, isFinished: !isFinished };
      }
      return typeof l === 'string' ? { name: l, price: 0, client: '', startDate: '', isFinished: false } : l;
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
    const locMapped = reports.filter(r => r.location === locName || (r.location && r.location.includes('旧河北') && locName.includes('旧
