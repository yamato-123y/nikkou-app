'use client';
import { useState, useEffect } from 'react';

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [viewerPassword, setViewerPassword] = useState('');
  const [isAuthed, setIsAuthed] = useState(false);
  const [authRole, setAuthRole] = useState<'admin' | 'viewer' | null>(null);

  const [reports, setReports] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [originalSettings, setOriginalSettings] = useState<any>({});
  const [isLoading, setIsLoading] = useState(false);

  const [modalLocation, setModalLocation] = useState<string | null>(null);
  const [filterLocation, setFilterLocation] = useState('');
  const [form, setForm] = useState<any>({});

  const [editingReport, setEditingReport] = useState<any | null>(null);
  const [showSaveToast, setShowSaveToast] = useState(false);
  const [showDisposalModal, setShowDisposalModal] = useState(false);
  const [showScrapModal, setShowScrapModal] = useState(false);
  const [showIshikawaLeaseModal, setShowIshikawaLeaseModal] = useState(false);

  // 追加：全処分を対象とした月別処分一覧ポップアップ用のステート
  const [showAllMonthlyDisposalModal, setShowAllMonthlyDisposalModal] = useState(false);
  // 請求書照合用：クリックされた行のキーを保持して状態（チェック済み）を管理
  const [checkedDisposalRows, setCheckedDisposalRows] = useState<{ [key: string]: boolean }>({});

  const [disposalDetailsOpen, setDisposalDetailsOpen] = useState<any>({});
  const [scrapDetailsOpen, setScrapDetailsOpen] = useState<any>({});
  const [reportSectionOpen, setReportSectionOpen] = useState<any>({});
  const [costOverrides, setCostOverrides] = useState<any>({});
  const [disposalOverrides, setDisposalOverrides] = useState<any>({});
  const [scrapOverrides, setScrapOverrides] = useState<any>({});
  const [fuelUnitPrices, setFuelUnitPrices] = useState<any>({});
  const [customSubcontractors, setCustomSubcontractors] = useState<any>({});
  const [customSubForm, setCustomSubForm] = useState<{ [key: string]: { company: string; task: string; price: string } }>({});

  const [subcontractorSectionOpen, setSubcontractorSectionOpen] = useState(false);

  const [editingCostFields, setEditingCostFields] = useState<any>({});
  const [showAdminSection, setShowAdminSection] = useState(false);
  const [showCalendarSection, setShowCalendarSection] = useState(false);

  const [disposalFilterQuery, setDisposalFilterQuery] = useState('');
  const [disposalStartDate, setDisposalStartDate] = useState('');
  const [disposalEndDate, setDisposalEndDate] = useState('');
  const [disposalSiteFilter, setDisposalSiteFilter] = useState('');

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
          setOriginalSettings(JSON.parse(JSON.stringify(sData)));
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
      
      const oldList = originalSettings[key] || [];
      const newList = targetList || [];
      const locationUpdates: { oldName: string; newName: string }[] = [];
      const subUpdates: { oldComp: string; oldTask: string; newComp: string; newTask: string }[] = [];

      if (key === 'locations') {
        newList.forEach((newItem: any, idx: number) => {
          const oldItem = oldList[idx];
          const oldName = typeof oldItem === 'string' ? oldItem : oldItem?.name;
          const newName = typeof newItem === 'string' ? newItem : newItem?.name;
          if (oldName && newName && oldName !== newName) {
            locationUpdates.push({ oldName, newName });
          }
        });
      } else if (key === 'subcontractors') {
        newList.forEach((newItem: any, idx: number) => {
          const oldItem = oldList[idx];
          if (oldItem && newItem) {
            if (oldItem.company !== newItem.company || oldItem.task !== newItem.task) {
              subUpdates.push({
                oldComp: oldItem.company,
                oldTask: oldItem.task,
                newComp: newItem.company,
                newTask: newItem.task
              });
            }
          }
        });
      }

      const newData = { ...settings, [key]: targetList };
      const res = await fetch('/api/settings', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(newData) 
      });

      if (!res.ok) {
        alert('保存に失敗しました。');
        return;
      }

      if (locationUpdates.length > 0 || subUpdates.length > 0) {
        let hasChanges = false;
        const updatedReports = reports.map(r => {
          let reportChanged = false;
          let newR = { ...r };

          locationUpdates.forEach(u => {
            if (newR.location === u.oldName) {
              newR.location = u.newName;
              reportChanged = true;
            }
            if (newR.disposals) {
              newR.disposals = newR.disposals.map((d: any) => {
                if (d.location === u.oldName) {
                  reportChanged = true;
                  return { ...d, location: u.newName };
                }
                return d;
              });
            }
            if (newR.scraps) {
              newR.scraps = newR.scraps.map((sc: any) => {
                if (sc.location === u.oldName) {
                  reportChanged = true;
                  return { ...sc, location: u.newName };
                }
                return sc;
              });
            }
          });

          subUpdates.forEach(su => {
            if (newR.subcontractors) {
              newR.subcontractors = newR.subcontractors.map((sub: any) => {
                if (sub.company === su.oldComp && sub.task === su.oldTask) {
                  reportChanged = true;
                  return { ...sub, company: su.newComp, task: su.newTask };
                }
                return sub;
              });
            }
          });

          if (reportChanged) {
            hasChanges = true;
            return newR;
          }
          return r;
        });

        if (hasChanges) {
          for (const r of updatedReports) {
            const targetId = r.id || r._id;
            if (targetId) {
              await fetch('/api/reports', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...r, id: targetId })
              });
            }
          }
        }
      }

      setSettings(newData);
      setOriginalSettings(JSON.parse(JSON.stringify(newData)));
      alert('保存しました！過去の日報の名称も自動で更新されました。');
      fetchData();
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

    let ishikawaLeaseDetail = 0;
    (r.ishikawaHeavy || []).forEach((m: string) => ishikawaLeaseDetail += ((settings.ishikawaHeavy || []).find((x:any) => x.name === m)?.price || 0));
    (r.ishikawaAttach || []).forEach((m: string) => ishikawaLeaseDetail += ((settings.ishikawaAttach || []).find((x:any) => x.name === m)?.price || 0));
    (r.ishikawaOther || []).forEach((m: string) => ishikawaLeaseDetail += ((settings.ishikawaOther || []).find((x:any) => x.name === m)?.price || 0));

    let mokLeaseDetail = 0;
    (r.machines || []).forEach((m: string) => mokLeaseDetail += ((settings.leases || []).find((x:any) => x.name === m)?.price || 0));
    (r.leaseHeavy || []).forEach((m: string) => mokLeaseDetail += ((settings.leaseHeavy || []).find((x:any) => x.name === m)?.price || 0));
    (r.leaseAttach || []).forEach((m: string) => mokLeaseDetail += ((settings.leaseAttach || []).find((x:any) => x.name === m)?.price || 0));
    (r.leaseOther || []).forEach((m: string) => mokLeaseDetail += ((settings.leaseOther || []).find((x:any) => x.name === m)?.price || 0));

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

    return { lCost, subCost, leaseC, otherLeaseC, ishikawaLeaseDetail, mokLeaseDetail, ownMachineC, vehicleC, dispC, disposalBreakdown, fC: fuelCost, rawFuel: rawFuelL, regularPrice: regPrice, eC, pC, oC, scrapC, scrapBreakdown };
  };

  const getTargetLocationNames = (currentLoc: string) => {
    const keywordRules: { [key: string]: string } = {
      '旧河北郡市クリーンセンター等解体工事(石川県)': '旧河北郡市クリーンセンター',
      '美加の台地区施設一体型小中教育推進校整備工事': '美加の台地区施設',
      '和歌山下津港海岸(海南地区)船尾南護岸(第2工区)機側操作室解体工事': '船尾南護岸',
      '岸和田市別所町3丁目20-4解体工事': '岸和田市別所町3丁目'
    };

    const keyword = keywordRules[currentLoc];
    if (!keyword) {
      return [currentLoc];
    }

    const matchedLocations = Array.from(
      new Set(
        reports
          .map(r => r.location)
          .filter(loc => loc && loc.includes(keyword))
      )
    );

    return matchedLocations.length > 0 ? matchedLocations : [currentLoc];
  };

  const calculateCosts = (locName: string) => {
    const targetNames = getTargetLocationNames(locName);
    const locMapped = reports.filter(r => targetNames.includes(r.location));
    let calcLabor = 0, calcSub = 0, calcLease = 0, calcOtherLease = 0, calcIshikawaLease = 0, calcMokLease = 0, calcOwnMachine = 0, calcVehicle = 0, calcDispCalc = 0;
    let calcFuel = 0, calcRegular = 0, calcEtc = 0, calcParking = 0, calcOther = 0, scrapTotalCalc = 0;

    const aggregatedDisposalBreakdown: {[key: string]: {items: {[itemKey: string]: {quantity: number, price: number, total: number, unit: string, details: Array<{date: string, item: string, quantity: number, unit: string, price: number, total: number}>}}, total: number}} = {};
    const aggregatedScrapBreakdown: {[key: string]: {quantity: number, total: number, details: Array<{date: string, item: string, quantity: number, unit: string, reportId?: any}>}} = {};

    locMapped.forEach(r => {
      const dc = calculateReportDailyCost(r);
      calcLabor += dc.lCost; 
      calcSub += dc.subCost; 
      calcLease += dc.leaseC; 
      calcOtherLease += dc.otherLeaseC;
      calcIshikawaLease += dc.ishikawaLeaseDetail;
      calcMokLease += dc.mokLeaseDetail;
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

    const clients = Array.from(new Set(locMapped.map((r: any) => r.client).filter(Boolean)));
    const startDates = Array.from(new Set(locMapped.map((r: any) => r.startDate).filter(Boolean))).sort();

    return { 
      days: locMapped.length, 
      laborCost, 
      subCostTotal, 
      leaseCost, 
      otherLeaseCost,
      calcIshikawaLease,
      calcMokLease,
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
      reportsWithIndex: locMapped,
      clientStr: clients.join(', ') || '',
      startDateStr: startDates[0] || ''
    };
  };

  const downloadLocationCSV = (locName: string) => {
    const targetNames = getTargetLocationNames(locName);
    const locReports = reports.filter(r => targetNames.includes(r.location));
    const headers = ["日付", "現場名", "請負先", "開始日", "職長", "作業者", "職種・人数", "外注", "リース(重機等)", "その他リース", "自社重機", "車両", "軽油L", "レギュラー購入分(円)", "ETC", "駐車場代", "雑費名", "雑費金額", "作業内容"];
    const rows = locReports.map(r => [
      r.date, r.location, r.client || '', r.startDate || '', r.manager, (r.workers || []).join('/'), 
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

  const getAllMonthlyDisposalGroupedData = () => {
    const result: { [disposalSite: string]: { [yearMonth: string]: Array<{ date: string; rawDate: string; locationName: string; item: string; quantity: number; unit: string; rowKey: string }> } } = {};

    reports.forEach(r => {
      const reportDate = r.date || '';
      const norm = reportDate.replace(/\//g, '-');
      const parts = norm.split('-');
      
      let yearMonth = '';
      let formattedDate = reportDate;

      if (parts.length === 3) {
        yearMonth = `${parts[0]}-${parts[1].padStart(2, '0')}`;
        formattedDate = `${Number(parts[1])}/${Number(parts[2])}`;
      } else if (parts.length === 2) {
        const currentYear = new Date().getFullYear();
        yearMonth = `${currentYear}-${parts[0].padStart(2, '0')}`;
        formattedDate = `${Number(parts[0])}/${Number(parts[1])}`;
      } else {
        yearMonth = '2026-07';
      }

      (r.disposals || []).forEach((d: any, dIdx: number) => {
        const dLoc = d.location || '〇〇処分場';
        const dItem = d.item || '品目未指定';
        const dQty = Number(d.quantity || 0);
        const masterRecord = (settings.disposalLocations || []).find((s: any) => s.location === dLoc && s.item === dItem);
        const dUnit = d.unit || masterRecord?.unit || 't';

        const rowKey = `${dLoc}_${yearMonth}_${reportDate}_${dItem}_${dIdx}_${r.location}`;

        if (!result[dLoc]) {
          result[dLoc] = {};
        }
        if (!result[dLoc][yearMonth]) {
          result[dLoc][yearMonth] = [];
        }

        result[dLoc][yearMonth].push({
          date: formattedDate,
          rawDate: reportDate,
          locationName: r.location || '',
          item: dItem,
          quantity: dQty,
          unit: dUnit,
          rowKey
        });
      });
    });

    Object.keys(result).forEach(dLoc => {
      Object.keys(result[dLoc]).forEach(ym => {
        result[dLoc][ym].sort((a, b) => a.rawDate.localeCompare(b.rawDate, 'ja', { numeric: true }));
      });
    });

    return result;
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
      .filter(r => {
        const targetNames = getTargetLocationNames(modalLocation);
        return targetNames.includes(r.location);
      })
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
        <div className="flex w-full md:w-auto gap-2 flex-wrap items-center">
          <button onClick={() => setShowAllMonthlyDisposalModal(true)} className="flex-1 md:flex-none bg-amber-600 hover:bg-amber-700 text-white px-4 py-2.5 rounded-xl font-bold text-sm md:text-base transition flex items-center justify-center gap-1.5 shadow-sm">
            📦 月別処分一覧
          </button>
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
                <th className="py-4 px-4 w-[35%]">現場名</th>
                <th className="py-4 px-4 w-[12%]">請負金額</th>
                <th className="py-4 px-4 w-[10%]">稼働日数</th>
                <th className="py-4 px-4 w-[12%]">合計経費</th>
                <th className
