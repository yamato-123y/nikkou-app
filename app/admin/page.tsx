'use client';

import { useState, useEffect } from 'react';

const formatAmount = (num: number | string, includeYen = true) => {
  const val = Number(num) || 0;
  const parts = val.toLocaleString('ja-JP', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).split('.');
  const integerPart = parts[0];
  const decimalPart = parts[1];

  return (
    <span>
      {includeYen && '¥'}
      {integerPart}
      {decimalPart !== undefined && (
        <span className="text-slate-400 font-normal">.{decimalPart}</span>
      )}
    </span>
  );
};

const formatInputNumber = (num: number | string) => {
  const val = Number(num) || 0;
  return String(Math.round((val + Number.EPSILON) * 100) / 100);
};

const getCurrentYearMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const getDayInfo = (dateStr: string) => {
  if (!dateStr || typeof dateStr !== 'string') return { dayOfWeek: 0, isHoliday: false };
  const parts = dateStr.split('-');
  if (parts.length < 3) return { dayOfWeek: 0, isHoliday: false };
  
  const [y, m, d] = parts.map(Number);
  if (!y || !m || !d) return { dayOfWeek: 0, isHoliday: false };
  
  const date = new Date(Date.UTC(y, m - 1, d));
  const dayOfWeek = date.getUTCDay();

  const holidays: { [key: string]: number[] } = {
    '1': [1, 12],
    '2': [11, 23],
    '3': [20],
    '4': [29],
    '5': [3, 4, 5, 6],
    '7': [20],
    '8': [11],
    '9': [21, 22, 23],
    '10': [12],
    '11': [3, 23],
    '12': [25]
  };

  let isHoliday = false;
  const monthKey = String(m);
  if (holidays[monthKey] && holidays[monthKey].includes(d)) {
    isHoliday = true;
  }

  if (y === 2026 && m === 9) {
    if (d === 21 || d === 23) isHoliday = true;
  }

  return { dayOfWeek, isHoliday };
};

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

  const [showAllMonthlyDisposalModal, setShowAllMonthlyDisposalModal] = useState(false);
  const [checkedDisposalRows, setCheckedDisposalRows] = useState<{ [key: string]: boolean }>({});
  const [monthlyDisposalInvoices, setMonthlyDisposalInvoices] = useState<{ [key: string]: string }>({});
  const [disposalRowMemos, setDisposalRowMemos] = useState<{ [key: string]: string }>({});
  const [disposalMemoModal, setDisposalMemoModal] = useState<any | null>(null);
  const [leaseCustomPrices, setLeaseCustomPrices] = useState<any>({});
  // 詳細分析・月別処分一覧の金額編集は、入力中は画面内だけ変更し「保存」でSupabaseへまとめて送信
  const [financialDirty, setFinancialDirty] = useState(false);
  const [isFinancialSaving, setIsFinancialSaving] = useState(false);

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
  const [showReportCalendarSection, setShowReportCalendarSection] = useState(false);

  const [disposalFilterQuery, setDisposalFilterQuery] = useState('');
  const [disposalStartDate, setDisposalStartDate] = useState('');
  const [disposalEndDate, setDisposalEndDate] = useState('');
  const [disposalSiteFilter, setDisposalSiteFilter] = useState('');

  const [calendarReportModal, setCalendarReportModal] = useState<{ date: string; location: string; reports: any[] } | null>(null);

  const [calendarYearMonth, setCalendarYearMonth] = useState(() => getCurrentYearMonth());

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [resR, resS] = await Promise.all([fetch('/api/reports'), fetch('/api/settings')]);
      if (resR.ok) {
        const rData = await resR.json();
        setReports(rData);
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
          if (sData.monthlyDisposalInvoices) setMonthlyDisposalInvoices(sData.monthlyDisposalInvoices);
          if (sData.disposalRowMemos) setDisposalRowMemos(sData.disposalRowMemos);
          if (sData.leaseCustomPrices) setLeaseCustomPrices(sData.leaseCustomPrices);
          if (sData.checkedDisposalRows) setCheckedDisposalRows(sData.checkedDisposalRows);
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
      // 管理者ログイン時もマスタ設定は閉じた状態から開始
      setShowAdminSection(false);
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
            if (Array.isArray(newR.disposals)) {
              newR.disposals = newR.disposals.map((d: any) => {
                if (d.location === u.oldName) {
                  reportChanged = true;
                  return { ...d, location: u.newName };
                }
                return d;
              });
            }
            if (Array.isArray(newR.scraps)) {
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
            if (Array.isArray(newR.subcontractors)) {
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

  const handleCostOverrideChange = (locName: string, field: string, val: string) => {
    if (authRole === 'viewer') return;
    const newOverrides = {
      ...costOverrides,
      [locName]: {
        ...(costOverrides[locName] || {}),
        [field]: val
      }
    };
    setCostOverrides(newOverrides);
    setFinancialDirty(true);
  };

  const handleDisposalOverrideChange = (locName: string, key: string, val: string) => {
    if (authRole === 'viewer') return;
    const newDisposalOverrides = {
      ...disposalOverrides,
      [locName]: {
        ...(disposalOverrides[locName] || {}),
        [key]: val
      }
    };
    setDisposalOverrides(newDisposalOverrides);
    setFinancialDirty(true);
  };

  const handleDisposalItemOverrideChange = (locName: string, disposalName: string, itemKey: string, val: string) => {
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
    setFinancialDirty(true);
  };

  const handleDisposalDetailOverrideChange = (
    locName: string,
    disposalName: string,
    yearMonth: string,
    dateKey: string,
    itemKey: string,
    field: 'unitPrice' | 'invoice',
    val: string
  ) => {
    if (authRole === 'viewer') return;

    const subKey = `${field}__${disposalName}__${yearMonth}__${dateKey}__${itemKey}`;
    const newDisposalOverrides = {
      ...disposalOverrides,
      [locName]: {
        ...(disposalOverrides[locName] || {}),
        [subKey]: val
      }
    };
    setDisposalOverrides(newDisposalOverrides);
    setFinancialDirty(true);
  };

  const handleDisposalMonthlyItemUnitPriceChange = (
    locName: string,
    disposalName: string,
    yearMonth: string,
    itemKey: string,
    rows: any[],
    val: string
  ) => {
    if (authRole === 'viewer') return;

    const nextLocOverrides = { ...(disposalOverrides[locName] || {}) };
    rows.forEach((row: any) => {
      const subKey = `unitPrice__${disposalName}__${yearMonth}__${row.dateKey}__${itemKey}`;
      nextLocOverrides[subKey] = val;
    });

    setDisposalOverrides({
      ...disposalOverrides,
      [locName]: nextLocOverrides
    });
    setFinancialDirty(true);
  };

  const handleDisposalMonthlyItemInvoiceChange = (
    locName: string,
    disposalName: string,
    yearMonth: string,
    itemKey: string,
    rows: any[],
    val: string
  ) => {
    if (authRole === 'viewer') return;

    const targetTotal = Number(val) || 0;
    const currentReportTotal = rows.reduce((sum: number, row: any) => sum + Number(row.reportTotal || 0), 0);
    const nextLocOverrides = { ...(disposalOverrides[locName] || {}) };

    let distributed = 0;
    rows.forEach((row: any, idx: number) => {
      let rowConfirmed = 0;

      if (idx === rows.length - 1) {
        rowConfirmed = Math.round((targetTotal - distributed) * 100) / 100;
      } else if (currentReportTotal > 0) {
        rowConfirmed = Math.round((targetTotal * (Number(row.reportTotal || 0) / currentReportTotal)) * 100) / 100;
        distributed += rowConfirmed;
      }

      const subKey = `invoice__${disposalName}__${yearMonth}__${row.dateKey}__${itemKey}`;
      nextLocOverrides[subKey] = String(rowConfirmed);
    });

    setDisposalOverrides({
      ...disposalOverrides,
      [locName]: nextLocOverrides
    });
    setFinancialDirty(true);
  };

  const handleScrapOverrideChange = (locName: string, key: string, val: string) => {
    if (authRole === 'viewer') return;
    const newScrapOverrides = {
      ...scrapOverrides,
      [locName]: {
        ...(scrapOverrides[locName] || {}),
        [key]: val
      }
    };
    setScrapOverrides(newScrapOverrides);
    setFinancialDirty(true);
  };

  const handleMonthlyDisposalInvoiceChange = (disposalSite: string, yearMonth: string, val: string) => {
    if (authRole === 'viewer') return;

    const key = `${disposalSite}__${yearMonth}`;
    setMonthlyDisposalInvoices({
      ...monthlyDisposalInvoices,
      [key]: val
    });
    setFinancialDirty(true);
  };

  const handleDisposalRowMemoChange = (rowKey: string, val: string) => {
    if (authRole === 'viewer') return;
    setDisposalRowMemos({
      ...disposalRowMemos,
      [rowKey]: val
    });
    setFinancialDirty(true);
  };

  const handleLeaseCustomPriceChange = (
    locName: string,
    scope: 'ishikawa' | 'mok',
    entryKey: string,
    val: string
  ) => {
    if (authRole === 'viewer') return;

    setLeaseCustomPrices({
      ...leaseCustomPrices,
      [locName]: {
        ...(leaseCustomPrices[locName] || {}),
        [scope]: {
          ...(leaseCustomPrices[locName]?.[scope] || {}),
          [entryKey]: val
        }
      }
    });
    setFinancialDirty(true);
  };

  const handleFuelUnitPriceChange = (locName: string, yearMonth: string, val: string) => {
    if (authRole === 'viewer') return;
    const newFuelPrices = {
      ...fuelUnitPrices,
      [locName]: {
        ...(fuelUnitPrices[locName] || {}),
        [yearMonth]: val
      }
    };
    setFuelUnitPrices(newFuelPrices);
    setFinancialDirty(true);
  };

  const saveFinancialEdits = async () => {
    if (authRole === 'viewer' || isFinancialSaving) return;

    try {
      setIsFinancialSaving(true);

      // 画面内で編集した金額関連を1回のPOSTにまとめる。
      // 入力のたびにSupabaseへ送らないため、連続書き込みを防ぎます。
      const newData = {
        ...settings,
        costOverrides,
        disposalOverrides,
        scrapOverrides,
        fuelUnitPrices,
        monthlyDisposalInvoices,
        disposalRowMemos,
        leaseCustomPrices,
        checkedDisposalRows,
        customSubcontractors
      };

      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newData)
      });

      if (!res.ok) {
        alert('金額の保存に失敗しました。');
        return;
      }

      setSettings(newData);
      setOriginalSettings(JSON.parse(JSON.stringify(newData)));
      setFinancialDirty(false);
      setShowSaveToast(true);
      setTimeout(() => setShowSaveToast(false), 2500);
    } catch (e) {
      console.error(e);
      alert('通信エラーが発生しました。');
    } finally {
      setIsFinancialSaving(false);
    }
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

  const getEditingLeaseQuantity = (field: string, item: string) => {
    const list = Array.isArray(editingReport?.[field]) ? editingReport[field] : [];
    return list.filter((x: string) => x === item).length;
  };

  const changeEditingLeaseQuantity = (field: string, item: string, delta: number) => {
    if (!editingReport) return;
    const list = Array.isArray(editingReport[field]) ? editingReport[field] : [];
    const current = list.filter((x: string) => x === item).length;
    const next = Math.max(0, current + delta);
    const withoutItem = list.filter((x: string) => x !== item);
    setEditingReport({ ...editingReport, [field]: [...withoutItem, ...Array(next).fill(item)] });
  };

  const handleUpdateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authRole === 'viewer') return;
    const payload = {
      ...editingReport,
      // 日報入力側で互換用に二重保持しているリース項目も編集内容に同期
      machines: Array.isArray(editingReport.leaseHeavy) ? editingReport.leaseHeavy : [],
      ishikawaLeaseHeavy: Array.isArray(editingReport.ishikawaHeavy) ? editingReport.ishikawaHeavy : [],
      ishikawaLeaseAttach: Array.isArray(editingReport.ishikawaAttach) ? editingReport.ishikawaAttach : [],
      ishikawaLeaseOther: Array.isArray(editingReport.ishikawaOther) ? editingReport.ishikawaOther : [],
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
    const workers = Array.isArray(r.workers) ? r.workers : [];
    workers.forEach((w: string) => lCost += ((settings.workers || []).find((x:any) => x.name === w)?.price || 0));

    let subCost = 0;
    const subcontractors = Array.isArray(r.subcontractors) ? r.subcontractors : [];
    subcontractors.forEach((sub: any) => {
      const subMaster = (settings.subcontractors || []).find((x:any) => x.company === sub.company && x.task === sub.task);
      const unitP = sub.price !== undefined && sub.price !== null && sub.price !== '' 
        ? Number(sub.price) 
        : (subMaster?.price || 0);
      subCost += (Number(sub.count || 0) * unitP);
    });

    let leaseC = 0;
    const machines = Array.isArray(r.machines) ? r.machines : [];
    const leaseHeavy = Array.isArray(r.leaseHeavy) ? r.leaseHeavy : [];
    const leaseAttach = Array.isArray(r.leaseAttach) ? r.leaseAttach : [];
    const leaseOther = Array.isArray(r.leaseOther) ? r.leaseOther : [];
    const ishikawaHeavy = Array.isArray(r.ishikawaHeavy) ? r.ishikawaHeavy : [];
    const ishikawaAttach = Array.isArray(r.ishikawaAttach) ? r.ishikawaAttach : [];
    const ishikawaOther = Array.isArray(r.ishikawaOther) ? r.ishikawaOther : [];
    const ishikawaCustomMachines = Array.isArray(r.ishikawaCustomMachines) ? r.ishikawaCustomMachines : [];
    const otherLeases = Array.isArray(r.otherLeases) ? r.otherLeases : [];
    const mokCustomMachines = Array.isArray(r.mokCustomMachines) ? r.mokCustomMachines : [];

    // machines は旧データ互換用。現在の日報では leaseHeavy と同じ内容が入るため、
    // leaseHeavy が存在する場合は二重計上しない。
    const legacyMachines = leaseHeavy.length === 0 ? machines : [];

    let ishikawaLeaseDetail = 0;
    ishikawaHeavy.forEach((m: string) => {
      const price = Number((settings.ishikawaHeavy || []).find((x:any) => x.name === m)?.price || 0);
      ishikawaLeaseDetail += price;
      leaseC += price;
    });
    ishikawaAttach.forEach((m: string) => {
      const price = Number((settings.ishikawaAttach || []).find((x:any) => x.name === m)?.price || 0);
      ishikawaLeaseDetail += price;
      leaseC += price;
    });
    ishikawaOther.forEach((m: string) => {
      const price = Number((settings.ishikawaOther || []).find((x:any) => x.name === m)?.price || 0);
      ishikawaLeaseDetail += price;
      leaseC += price;
    });

    // 石川県の自由入力機械は、日報側では「品名・個数」のみ。
    // price が保存されている過去/拡張データだけ金額計上し、通常は明細表示のみとする。
    ishikawaCustomMachines.forEach((m: any) => {
      const explicitUnitPrice = m.price !== undefined && m.price !== null && m.price !== '' ? Number(m.price) : 0;
      const customCost = explicitUnitPrice * Number(m.count || 0);
      ishikawaLeaseDetail += customCost;
      leaseC += customCost;
    });

    let mokLeaseDetail = 0;
    legacyMachines.forEach((m: string) => {
      const price = Number((settings.leases || []).find((x:any) => x.name === m)?.price || 0);
      mokLeaseDetail += price;
      leaseC += price;
    });
    leaseHeavy.forEach((m: string) => {
      const price = Number((settings.leaseHeavy || []).find((x:any) => x.name === m)?.price || 0);
      mokLeaseDetail += price;
      leaseC += price;
    });
    leaseAttach.forEach((m: string) => {
      const price = Number((settings.leaseAttach || []).find((x:any) => x.name === m)?.price || 0);
      mokLeaseDetail += price;
      leaseC += price;
    });
    leaseOther.forEach((m: string) => {
      const price = Number((settings.leaseOther || []).find((x:any) => x.name === m)?.price || 0);
      mokLeaseDetail += price;
      leaseC += price;
    });

    // 南大阪建機の「リスト以外の機械（自由入力）」は otherLeases に保存される。
    // 保存済み price がある場合はMOK側へ計上し、通常の品名・個数入力は明細表示のみ。
    otherLeases.forEach((ol: any) => {
      const customCost = Number(ol.price || 0);
      mokLeaseDetail += customCost;
      leaseC += customCost;
    });

    // 旧互換データ用
    mokCustomMachines.forEach((m: any) => {
      const matched =
        (settings.leaseHeavy || []).find((x:any) => x.name === m.name) ||
        (settings.leaseAttach || []).find((x:any) => x.name === m.name) ||
        (settings.leaseOther || []).find((x:any) => x.name === m.name);
      const unitP = m.price !== undefined && m.price !== null && m.price !== ''
        ? Number(m.price)
        : Number(matched?.price || 0);
      const customCost = Number(m.count || 0) * unitP;
      mokLeaseDetail += customCost;
      leaseC += customCost;
    });

    // 自由入力の南大阪建機分は上の MOK 通常リースへ分類するため、別枠には計上しない。
    let otherLeaseC = 0;

    let ownMachineC = 0;
    const ownMachines = Array.isArray(r.ownMachines) ? r.ownMachines : [];
    ownMachines.forEach((m: string) => ownMachineC += ((settings.companyMachines || []).find((x:any) => x.name === m)?.price || 0));

    let vehicleC = 0;
    const vehicles = Array.isArray(r.vehicles) ? r.vehicles : [];
    vehicles.forEach((v: string) => vehicleC += ((settings.vehicles || []).find((x:any) => x.name === v)?.price || 0));

    let dispC = 0;
    const disposalBreakdown: {[key: string]: {items: {[itemKey: string]: {quantity: number, price: number, total: number, unit: string, details: Array<{date: string, item: string, quantity: number, unit: string, price: number, total: number}>}}, total: number}} = {};

    const disposals = Array.isArray(r.disposals) ? r.disposals : [];
    disposals.forEach((d: any) => {
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
    const scraps = Array.isArray(r.scraps) ? r.scraps : [];
    scraps.forEach((sc: any) => {
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
      const fuelPriceLocationKey =
        r.location && r.location.includes('旧河北郡市クリーンセンター')
          ? '旧河北郡市クリーンセンター等解体工事(石川県)'
          : r.location;
      const locFuelPrices = fuelUnitPrices[fuelPriceLocationKey] || fuelUnitPrices[r.location] || {};
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

  const getLeaseDetailEntries = (locName: string) => {
    const targetNames = getTargetLocationNames(locName);
    const locReports = reports.filter(r => targetNames.includes(r.location));

    const ishikawaMap: {[key: string]: { key: string; label: string; count: number; unitPrice: number | null; total: number; isCustom?: boolean }} = {};
    const mokMap: {[key: string]: { key: string; label: string; count: number; unitPrice: number | null; total: number; isCustom?: boolean }} = {};

    const addMaster = (
      target: any,
      category: string,
      name: string,
      masterList: any[]
    ) => {
      const master = (masterList || []).find((x:any) => x.name === name);
      const unitPrice = Number(master?.price || 0);
      const key = `${category}__${name}`;
      if (!target[key]) target[key] = { key, label: `${category}：${name}`, count: 0, unitPrice, total: 0 };
      target[key].count += 1;
      target[key].total += unitPrice;
    };

    const addCustom = (
      target: any,
      category: string,
      item: any,
      priceMode: 'unit' | 'total' = 'unit'
    ) => {
      const name = item?.name || '名称未入力';
      const count = Number(item?.count || 0);
      const hasPrice = item?.price !== undefined && item?.price !== null && item?.price !== '';
      const price = hasPrice ? Number(item.price) : null;
      const total = price === null ? 0 : (priceMode === 'unit' ? price * count : price);
      const key = `${category}__${name}`;
      if (!target[key]) target[key] = { key, label: `${category}：${name}`, count: 0, unitPrice: price, total: 0, isCustom: true };
      target[key].count += count;
      target[key].total += total;
      if (target[key].unitPrice === null && price !== null) target[key].unitPrice = price;
    };

    locReports.forEach((r:any) => {
      const ishHeavy = Array.isArray(r.ishikawaHeavy) ? r.ishikawaHeavy : [];
      const ishAttach = Array.isArray(r.ishikawaAttach) ? r.ishikawaAttach : [];
      const ishOther = Array.isArray(r.ishikawaOther) ? r.ishikawaOther : [];
      const ishCustom = Array.isArray(r.ishikawaCustomMachines) ? r.ishikawaCustomMachines : [];

      ishHeavy.forEach((name:string) => addMaster(ishikawaMap, '重機', name, settings.ishikawaHeavy || []));
      ishAttach.forEach((name:string) => addMaster(ishikawaMap, 'アタッチメント', name, settings.ishikawaAttach || []));
      ishOther.forEach((name:string) => addMaster(ishikawaMap, 'その他機械・機器', name, settings.ishikawaOther || []));
      ishCustom.forEach((item:any) => addCustom(ishikawaMap, '自由入力', item, 'unit'));

      const leaseHeavy = Array.isArray(r.leaseHeavy) ? r.leaseHeavy : [];
      const leaseAttach = Array.isArray(r.leaseAttach) ? r.leaseAttach : [];
      const leaseOther = Array.isArray(r.leaseOther) ? r.leaseOther : [];
      const machines = Array.isArray(r.machines) ? r.machines : [];
      const legacyMachines = leaseHeavy.length === 0 ? machines : [];
      const otherLeases = Array.isArray(r.otherLeases) ? r.otherLeases : [];
      const mokCustomMachines = Array.isArray(r.mokCustomMachines) ? r.mokCustomMachines : [];

      legacyMachines.forEach((name:string) => addMaster(mokMap, '重機（旧データ）', name, settings.leases || []));
      leaseHeavy.forEach((name:string) => addMaster(mokMap, '重機', name, settings.leaseHeavy || []));
      leaseAttach.forEach((name:string) => addMaster(mokMap, 'アタッチメント', name, settings.leaseAttach || []));
      leaseOther.forEach((name:string) => addMaster(mokMap, 'その他機械・機器', name, settings.leaseOther || []));
      otherLeases.forEach((item:any) => addCustom(mokMap, '自由入力', item, 'total'));

      mokCustomMachines.forEach((item:any) => {
        const matched =
          (settings.leaseHeavy || []).find((x:any) => x.name === item.name) ||
          (settings.leaseAttach || []).find((x:any) => x.name === item.name) ||
          (settings.leaseOther || []).find((x:any) => x.name === item.name);
        const normalized = {
          ...item,
          price: item.price !== undefined && item.price !== null && item.price !== ''
            ? item.price
            : matched?.price
        };
        addCustom(mokMap, '自由入力（旧データ）', normalized, 'unit');
      });
    });

    return {
      ishikawa: Object.values(ishikawaMap),
      mok: Object.values(mokMap)
    };
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

  const getDisposalMonthlyBreakdown = (locName: string) => {
    const targetNames = getTargetLocationNames(locName);
    const locReports = reports.filter(r => targetNames.includes(r.location));
    const dispOv = disposalOverrides[locName] || {};
    const bySite: any = {};

    locReports.forEach((r: any) => {
      const normalizedDate = normalizeDateStr(r.date || '');
      const dateParts = normalizedDate.split('-');
      const ym = dateParts.length >= 2 ? `${dateParts[0]}-${dateParts[1]}` : '日付不明';
      const dateKey = normalizedDate || String(r.date || '日付不明');
      const displayDate = dateParts.length === 3
        ? `${Number(dateParts[1])}/${Number(dateParts[2])}`
        : String(r.date || '日付不明');
      const disposals = Array.isArray(r.disposals) ? r.disposals : [];

      disposals.forEach((d: any) => {
        const dLoc = d.location || 'その他処分場';
        const itemKey = d.item || '品目未指定';
        const masterRecord = (settings.disposalLocations || []).find(
          (s: any) => s.location === dLoc && s.item === itemKey
        );
        const unit = d.unit || masterRecord?.unit || 't';
        const rawUnitPrice =
          d.price !== undefined && d.price !== null && d.price !== ''
            ? Number(d.price)
            : Number(masterRecord?.price || 0);
        const quantity = Number(d.quantity || 0);

        // 新：日付単位。旧：月×品目単位の上書きもフォールバックで読み込む。
        const priceKey = `unitPrice__${dLoc}__${ym}__${dateKey}__${itemKey}`;
        const invoiceKey = `invoice__${dLoc}__${ym}__${dateKey}__${itemKey}`;
        const legacyPriceKey = `unitPrice__${dLoc}__${ym}__${itemKey}`;
        const legacyInvoiceKey = `invoice__${dLoc}__${ym}__${itemKey}`;

        const savedPrice =
          dispOv[priceKey] !== undefined ? dispOv[priceKey] : dispOv[legacyPriceKey];
        const effectiveUnitPrice =
          savedPrice !== '' && savedPrice !== undefined ? Number(savedPrice) : rawUnitPrice;
        const reportTotal = quantity * effectiveUnitPrice;

        const savedInvoice =
          dispOv[invoiceKey] !== undefined ? dispOv[invoiceKey] : dispOv[legacyInvoiceKey];
        const confirmedTotal =
          savedInvoice !== '' && savedInvoice !== undefined ? Number(savedInvoice) : reportTotal;

        if (!bySite[dLoc]) {
          bySite[dLoc] = { months: {}, reportTotal: 0, confirmedTotal: 0 };
        }
        if (!bySite[dLoc].months[ym]) {
          bySite[dLoc].months[ym] = { days: {}, reportTotal: 0, confirmedTotal: 0 };
        }
        if (!bySite[dLoc].months[ym].days[dateKey]) {
          bySite[dLoc].months[ym].days[dateKey] = {
            displayDate,
            rows: [],
            reportTotal: 0,
            confirmedTotal: 0
          };
        }

        const row = {
          dateKey,
          displayDate,
          item: itemKey,
          quantity,
          unit,
          originalUnitPrice: rawUnitPrice,
          unitPrice: effectiveUnitPrice,
          priceOverride: savedPrice ?? '',
          reportTotal,
          invoiceOverride: savedInvoice ?? '',
          confirmedTotal
        };

        const dayData = bySite[dLoc].months[ym].days[dateKey];
        dayData.rows.push(row);
        dayData.reportTotal += reportTotal;
        dayData.confirmedTotal += confirmedTotal;
        bySite[dLoc].months[ym].reportTotal += reportTotal;
        bySite[dLoc].months[ym].confirmedTotal += confirmedTotal;
        bySite[dLoc].reportTotal += reportTotal;
        bySite[dLoc].confirmedTotal += confirmedTotal;
      });
    });

    let reportTotal = 0;
    let confirmedTotal = 0;
    Object.values(bySite).forEach((siteData: any) => {
      reportTotal += Number(siteData.reportTotal || 0);
      confirmedTotal += Number(siteData.confirmedTotal || 0);
    });

    return { bySite, reportTotal, confirmedTotal };
  };

  const calculateCosts = (locName: string) => {
    const targetNames = getTargetLocationNames(locName);
    const locMapped = reports.filter(r => targetNames.includes(r.location));
    let calcLabor = 0, calcSub = 0, calcLease = 0, calcOtherLease = 0, calcIshikawaLease = 0, calcMokLease = 0, calcOwnMachine = 0, calcVehicle = 0, calcDispCalc = 0;
    let calcFuel = 0, calcRegular = 0, calcEtc = 0, calcParking = 0, calcOther = 0, scrapTotalCalc = 0;
    let totalFuelLitering = 0;
    let totalRegularLitering = 0;
    let totalUnokeFuelLitering = 0;
    let totalUnokeRegularLitering = 0;
    const monthlyFuelBreakdown: {[yearMonth: string]: { liters: number; unitPrice: number; total: number }} = {};

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
      totalFuelLitering += Number(r.fuel || 0);
      totalRegularLitering += Number(r.regularPrice || 0);
      totalUnokeFuelLitering += Number(r.unokeFuel || 0);
      totalUnokeRegularLitering += Number(r.unokeRegular || 0);

      const fuelDateNorm = (r.date || '').replace(/\//g, '-');
      const fuelDateParts = fuelDateNorm.split('-');
      if (fuelDateParts.length >= 2) {
        const fuelYm = `${fuelDateParts[0]}-${fuelDateParts[1].padStart(2, '0')}`;
        if (!monthlyFuelBreakdown[fuelYm]) {
          monthlyFuelBreakdown[fuelYm] = { liters: 0, unitPrice: 0, total: 0 };
        }
        monthlyFuelBreakdown[fuelYm].liters += Number(r.fuel || 0);
      }

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

    // 自由入力リースの管理画面金額を自動計算へ反映。
    // 日報にpriceが保存されている場合はその既存金額との差額だけを加えるため二重計上しない。
    const customLeaseDetails = getLeaseDetailEntries(locName);
    const locCustomLeasePrices = leaseCustomPrices[locName] || {};

    let ishikawaCustomAdjustment = 0;
    customLeaseDetails.ishikawa
      .filter((entry:any) => entry.isCustom)
      .forEach((entry:any) => {
        const raw = locCustomLeasePrices.ishikawa?.[entry.key];
        if (raw !== '' && raw !== undefined && raw !== null) {
          ishikawaCustomAdjustment += Number(raw) - Number(entry.total || 0);
        }
      });

    let mokCustomAdjustment = 0;
    customLeaseDetails.mok
      .filter((entry:any) => entry.isCustom)
      .forEach((entry:any) => {
        const raw = locCustomLeasePrices.mok?.[entry.key];
        if (raw !== '' && raw !== undefined && raw !== null) {
          mokCustomAdjustment += Number(raw) - Number(entry.total || 0);
        }
      });

    calcIshikawaLease += ishikawaCustomAdjustment;
    calcMokLease += mokCustomAdjustment;
    calcLease += ishikawaCustomAdjustment + mokCustomAdjustment;

    // 手動上書き前の概算を保持
    const reportEstimateLabor = calcLabor;
    // 外注だけは「日報由来」と「管理画面の手動追加・一括外注分」を分けて見せるため、
    // ここでは純粋な日報由来分を保持する。
    const reportEstimateSub = calcSub;
    const reportEstimateLease = calcLease;
    const reportEstimateOtherLease = calcOtherLease;
    const reportEstimateOwnMachine = calcOwnMachine;
    const reportEstimateVehicle = calcVehicle;
    const disposalMonthlyBreakdown = getDisposalMonthlyBreakdown(locName);
    const reportEstimateDisposal = disposalMonthlyBreakdown.reportTotal;
    const reportEstimateFuel = calcFuel;
    const reportEstimateRegular = calcRegular;
    const reportEstimateEtc = calcEtc;
    const reportEstimateParking = calcParking;
    const reportEstimateOther = calcOther;

    const customSubsList = customSubcontractors[locName] || [];
    const customSubsTotal = customSubsList.reduce((acc: number, cur: any) => acc + (Number(cur.price) || 0), 0);
    const reportEstimateSubWithCustom = reportEstimateSub + customSubsTotal;
    calcSub += customSubsTotal;

    const disposalTotal = disposalMonthlyBreakdown.confirmedTotal;

    const ov = costOverrides[locName] || {};
    const laborCost = ov.labor !== '' && ov.labor !== undefined ? Number(ov.labor) : calcLabor;
    const subCostTotal = ov.sub !== '' && ov.sub !== undefined ? Number(ov.sub) : calcSub;

    const isIshikawaLeaseSplit = locName === '旧河北郡市クリーンセンター等解体工事(石川県)';
    const ishikawaLeaseCost =
      isIshikawaLeaseSplit && ov.ishikawaLease !== '' && ov.ishikawaLease !== undefined
        ? Number(ov.ishikawaLease)
        : calcIshikawaLease;
    const mokLeaseCost =
      isIshikawaLeaseSplit && ov.mokLease !== '' && ov.mokLease !== undefined
        ? Number(ov.mokLease)
        : calcMokLease;

    // 旧河北郡市クリーンセンターだけは、石川県分＋MOK分を個別編集した結果をリース合計へ反映。
    // 他の現場は従来どおり lease の一括手動上書きを使用する。
    const leaseCost = isIshikawaLeaseSplit
      ? ishikawaLeaseCost + mokLeaseCost
      : (ov.lease !== '' && ov.lease !== undefined ? Number(ov.lease) : calcLease);

    const otherLeaseCost = ov.otherLease !== '' && ov.otherLease !== undefined ? Number(ov.otherLease) : calcOtherLease;
    const ownMachineCost = ov.ownMachine !== '' && ov.ownMachine !== undefined ? Number(ov.ownMachine) : calcOwnMachine;
    const vehicleCost = ov.vehicle !== '' && ov.vehicle !== undefined ? Number(ov.vehicle) : calcVehicle;
    const disposalCost = disposalTotal;
    const isIshikawaFuelSplit = locName === '旧河北郡市クリーンセンター等解体工事(石川県)';

    Object.keys(monthlyFuelBreakdown).forEach(ym => {
      const rawUnitPrice = fuelUnitPrices[locName]?.[ym];
      const unitPrice = rawUnitPrice !== '' && rawUnitPrice !== undefined ? Number(rawUnitPrice) : 0;
      monthlyFuelBreakdown[ym].unitPrice = unitPrice;
      monthlyFuelBreakdown[ym].total = monthlyFuelBreakdown[ym].liters * unitPrice;
    });

    const monthlyOsakaFuelCost = Object.values(monthlyFuelBreakdown)
      .reduce((sum, item) => sum + item.total, 0);

    const osakaFuelCost = isIshikawaFuelSplit ? monthlyOsakaFuelCost : calcFuel;
    const osakaRegularCost = calcRegular;
    const unokeFuelCost = isIshikawaFuelSplit && ov.fuel !== '' && ov.fuel !== undefined ? Number(ov.fuel) : 0;
    const unokeRegularCost = isIshikawaFuelSplit && ov.regular !== '' && ov.regular !== undefined ? Number(ov.regular) : 0;
    const fuelCost = isIshikawaFuelSplit
      ? osakaFuelCost + unokeFuelCost
      : (ov.fuel !== '' && ov.fuel !== undefined ? Number(ov.fuel) : calcFuel);
    const regularCost = isIshikawaFuelSplit
      ? osakaRegularCost + unokeRegularCost
      : (ov.regular !== '' && ov.regular !== undefined ? Number(ov.regular) : calcRegular);
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

    // 旧河北郡市クリーンセンター等解体工事(石川県)では、
    // 宇野気石油の軽油・レギュラー金額を分けず、合計金額で原価反映する。
    const unokeTotalOverride = costOverrides[locName]?.unokeTotal;
    const ishikawaFuelCombinedCost =
      isIshikawaFuelSplit && unokeTotalOverride !== '' && unokeTotalOverride !== undefined
        ? Number(unokeTotalOverride)
        : fuelCost + regularCost;

    const sumOverrideCost =
      laborCost +
      subCostTotal +
      leaseCost +
      otherLeaseCost +
      ownMachineCost +
      vehicleCost +
      disposalCost +
      (isIshikawaFuelSplit ? ishikawaFuelCombinedCost : fuelCost + regularCost) +
      etcCost +
      parkingCost +
      otherCost;

    // 「日報由来概算合計」は costOverrides / disposalOverrides / 管理画面手入力を含めない。
    // 石川県案件の宇野気石油分は日報に金額が無いため、概算側では0円のまま。
    const reportEstimatedTotal =
      reportEstimateLabor +
      reportEstimateSubWithCustom +
      reportEstimateLease +
      reportEstimateOtherLease +
      reportEstimateOwnMachine +
      reportEstimateVehicle +
      reportEstimateDisposal +
      (isIshikawaFuelSplit ? osakaFuelCost : reportEstimateFuel) +
      reportEstimateRegular +
      reportEstimateEtc +
      reportEstimateParking +
      reportEstimateOther;

    const matchedLocObj = (settings.locations || []).find((l: any) => (typeof l === 'string' ? l : l.name) === locName);
    const baseContractPrice = matchedLocObj?.price || 0;
    const isFinished = typeof matchedLocObj === 'object' ? matchedLocObj?.isFinished || false : false;

    const profitWithoutScrap = baseContractPrice - sumOverrideCost;
    const profit = profitWithoutScrap + scrapTotal;
    const reportEstimatedProfitWithoutScrap = baseContractPrice - reportEstimatedTotal;
    const reportEstimatedProfit = reportEstimatedProfitWithoutScrap + scrapTotal;

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
      ishikawaLeaseCost,
      mokLeaseCost,
      ownMachineCost,
      vehicleCost,
      disposalCost, 
      aggregatedDisposalBreakdown: disposalMonthlyBreakdown.bySite,
      fuelCost, 
      regularCost,
      osakaFuelCost,
      osakaRegularCost,
      unokeFuelCost,
      unokeRegularCost,
      etcCost, 
      parkingCost, 
      otherCost, 
      scrapTotal,
      aggregatedScrapBreakdown,
      total: sumOverrideCost,
      reportEstimatedTotal,
      reportEstimateLabor,
      reportEstimateSub,
      customSubsTotal,
      reportEstimateSubWithCustom,
      reportEstimateLease,
      reportEstimateOtherLease,
      reportEstimateOwnMachine,
      reportEstimateVehicle,
      reportEstimateDisposal,
      reportEstimateFuel: isIshikawaFuelSplit ? osakaFuelCost : reportEstimateFuel,
      reportEstimateRegular,
      reportEstimateEtc,
      reportEstimateParking,
      reportEstimateOther,
      contractPrice: baseContractPrice, 
      isFinished,
      profit,
      profitWithoutScrap,
      reportEstimatedProfit,
      reportEstimatedProfitWithoutScrap,
      reportsWithIndex: locMapped,
      clientStr: clients.join(', ') || '',
      startDateStr: startDates[0] || '',
      totalFuelLitering,
      totalRegularLitering,
      totalUnokeFuelLitering,
      totalUnokeRegularLitering,
      monthlyFuelBreakdown
    };
  };

  const downloadLocationCSV = (locName: string) => {
    const targetNames = getTargetLocationNames(locName);
    const locReports = reports.filter(r => targetNames.includes(r.location));
    const headers = ["日付", "現場名", "請負先", "開始日", "職長", "作業者", "職種・人数", "外注", "リース(重機等)", "その他リース", "自社重機", "車両", "軽油L", "レギュラー購入分(円)", "宇野気石油 軽油L", "宇野気石油 レギュラーL", "ETC", "駐車場代", "雑費名", "雑費金額", "作業内容"];
    const rows = locReports.map(r => {
      const workers = Array.isArray(r.workers) ? r.workers : [];
      const subcontractors = Array.isArray(r.subcontractors) ? r.subcontractors : [];
      const machines = Array.isArray(r.machines) ? r.machines : [];
      const leaseHeavy = Array.isArray(r.leaseHeavy) ? r.leaseHeavy : [];
      const leaseAttach = Array.isArray(r.leaseAttach) ? r.leaseAttach : [];
      const leaseOther = Array.isArray(r.leaseOther) ? r.leaseOther : [];
      const ishikawaHeavy = Array.isArray(r.ishikawaHeavy) ? r.ishikawaHeavy : [];
      const ishikawaAttach = Array.isArray(r.ishikawaAttach) ? r.ishikawaAttach : [];
      const ishikawaOther = Array.isArray(r.ishikawaOther) ? r.ishikawaOther : [];
      const mokCustomMachines = Array.isArray(r.mokCustomMachines) ? r.mokCustomMachines : [];
      const otherLeases = Array.isArray(r.otherLeases) ? r.otherLeases : [];
      const ownMachines = Array.isArray(r.ownMachines) ? r.ownMachines : [];
      const vehicles = Array.isArray(r.vehicles) ? r.vehicles : [];

      return [
        r.date, r.location, r.client || '', r.startDate || '', r.manager, workers.join('/'), 
        Object.entries(r.jobTypes || {}).map(([job, count]) => `${job}:${count}人`).join('/'),
        subcontractors.map((s:any)=>`${s.company}(${s.task}:${s.count}人)`).join('/'),
        [...machines, ...leaseHeavy, ...leaseAttach, ...leaseOther, ...ishikawaHeavy, ...ishikawaAttach, ...ishikawaOther, ...mokCustomMachines.map((m:any)=>`${m.name}(${m.count}個)`)].join('/'),
        otherLeases.map((ol:any)=>`${ol.company}(${ol.name}:${ol.count}個)`).join('/'),
        ownMachines.join('/'),
        vehicles.join('/'), 
        r.fuel || 0, r.regularPrice || 0, r.unokeFuel || 0, r.unokeRegular || 0, r.etcPrice || 0, r.parkingPrice || 0,
        r.otherItem || '', r.otherPrice || 0, `"${(r.workDescription || '').replace(/"/g, '""')}"`
      ];
    });
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
    const grouped: any = {};

    reports.forEach((r: any) => {
      const normalized = normalizeDateStr(r.date || '');
      const parts = normalized.split('-');
      if (parts.length < 2) return;

      const ym = `${parts[0]}-${parts[1]}`;
      const dateKey = normalized || String(r.date || '');
      const formattedDate =
        parts.length >= 3 ? `${Number(parts[1])}/${Number(parts[2])}` : String(r.date || '');
      const locationName = r.location || '現場名未設定';
      const disposals = Array.isArray(r.disposals) ? r.disposals : [];
      const locOv = disposalOverrides[locationName] || {};

      disposals.forEach((d: any, disposalIndex: number) => {
        const dLoc = d.location || 'その他処分場';
        const itemKey = d.item || '品目未指定';
        const masterRecord = (settings.disposalLocations || []).find(
          (s: any) => s.location === dLoc && s.item === itemKey
        );
        const unit = d.unit || masterRecord?.unit || 't';
        const originalUnitPrice =
          d.price !== undefined && d.price !== null && d.price !== ''
            ? Number(d.price)
            : Number(masterRecord?.price || 0);
        const quantity = Number(d.quantity || 0);

        const priceKey = `unitPrice__${dLoc}__${ym}__${dateKey}__${itemKey}`;
        const invoiceKey = `invoice__${dLoc}__${ym}__${dateKey}__${itemKey}`;
        const legacyPriceKey = `unitPrice__${dLoc}__${ym}__${itemKey}`;
        const legacyInvoiceKey = `invoice__${dLoc}__${ym}__${itemKey}`;

        const savedPrice =
          locOv[priceKey] !== undefined ? locOv[priceKey] : locOv[legacyPriceKey];
        const unitPrice =
          savedPrice !== '' && savedPrice !== undefined ? Number(savedPrice) : originalUnitPrice;
        const reportTotal = quantity * unitPrice;

        const savedInvoice =
          locOv[invoiceKey] !== undefined ? locOv[invoiceKey] : locOv[legacyInvoiceKey];
        const confirmedTotal =
          savedInvoice !== '' && savedInvoice !== undefined ? Number(savedInvoice) : reportTotal;

        if (!grouped[dLoc]) grouped[dLoc] = {};
        if (!grouped[dLoc][ym]) grouped[dLoc][ym] = [];

        grouped[dLoc][ym].push({
          dateKey,
          formattedDate,
          locationName,
          item: itemKey,
          quantity,
          unit,
          originalUnitPrice,
          unitPrice,
          priceOverride: savedPrice ?? '',
          reportTotal,
          invoiceOverride: savedInvoice ?? '',
          confirmedTotal,
          rowKey: `${dLoc}_${ym}_${dateKey}_${locationName}_${itemKey}_${disposalIndex}`
        });
      });
    });

    Object.values(grouped).forEach((monthObj: any) => {
      Object.values(monthObj).forEach((rows: any) => {
        rows.sort((a: any, b: any) =>
          a.dateKey.localeCompare(b.dateKey) ||
          a.locationName.localeCompare(b.locationName, 'ja') ||
          a.item.localeCompare(b.item, 'ja')
        );
      });
    });

    return grouped;
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
  const modalLeaseDetails = modalLocation ? getLeaseDetailEntries(modalLocation) : { ishikawa: [], mok: [] };
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
          <span>保存しました！</span>
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
          {authRole === 'admin' && (
            <button onClick={() => setShowAllMonthlyDisposalModal(true)} className="flex-1 md:flex-none bg-amber-600 hover:bg-amber-700 text-white px-4 py-2.5 rounded-xl font-bold text-sm md:text-base transition flex items-center justify-center gap-1.5 shadow-sm">
              📦 月別処分一覧
            </button>
          )}
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

            if (authRole === 'viewer') {
              return (
                <div key={loc.name} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-slate-100">
                    <div className="text-[17px] font-extrabold leading-snug text-slate-900 break-words">
                      {loc.name}
                    </div>
                  </div>

                  <div className={`mx-4 mt-4 p-3.5 rounded-xl border ${c.profit >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
                    <div className={`text-xs font-bold ${c.profit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      粗利（売却益込）
                    </div>
                    <div className={`text-2xl font-extrabold mt-1 ${c.profit >= 0 ? 'text-emerald-800' : 'text-rose-700'}`}>
                      {formatAmount(c.profit)}
                    </div>
                  </div>

                  <div className="m-4 rounded-xl border border-slate-200 divide-y divide-slate-200 bg-slate-50/70">
                    <div className="flex justify-between items-center gap-3 px-3.5 py-3">
                      <span className="text-xs font-bold text-slate-500">請負金額（税抜）</span>
                      <span className="text-base font-extrabold text-slate-900">{formatAmount(c.contractPrice)}</span>
                    </div>
                    <div className="flex justify-between items-center gap-3 px-3.5 py-3">
                      <span className="text-xs font-bold text-slate-500">合計経費</span>
                      <span className="text-base font-extrabold text-slate-900">{formatAmount(c.total)}</span>
                    </div>
                    <div className="flex justify-between items-center gap-3 px-3.5 py-3">
                      <span className="text-xs font-bold text-slate-500">稼働日数</span>
                      <span className="text-base font-extrabold text-slate-900">{c.days}日</span>
                    </div>
                  </div>

                  <div className="px-4 pb-4">
                    <button
                      onClick={() => setModalLocation(loc.name)}
                      className="w-full bg-blue-600 active:bg-blue-700 text-white py-3.5 rounded-xl text-sm font-bold shadow-sm transition"
                    >
                      🔍 詳細分析を見る
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div key={loc.name} className="p-4 rounded-2xl border space-y-3 shadow-xs bg-slate-50/90 border-slate-200">
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-lg leading-snug text-blue-600">{loc.name}</span>
                    </div>
                    <button onClick={() => toggleLocationFinished(loc.name)} className="bg-white hover:bg-slate-100 text-slate-600 text-xs px-2.5 py-1 rounded-lg font-bold border border-slate-300 transition">現場完了</button>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className={`text-sm px-3 py-1 rounded-xl font-bold inline-block ${c.profit >= 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                      粗利（売却益込）: {formatAmount(c.profit)}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-3 text-xs md:text-sm gap-1 bg-white p-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-center">
                  <div>請負<span className="text-slate-900 font-bold block text-base mt-1">{formatAmount(c.contractPrice)} <span className="text-xs font-normal text-slate-500">税抜</span></span></div>
                  <div>日数<span className="text-slate-900 font-bold block text-base mt-1">{c.days}日</span></div>
                  <div>経費<span className="text-slate-900 font-bold block text-base mt-1">{formatAmount(c.total)}</span></div>
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
                <th className="py-4 px-4 w-[16%]">粗利（売却益込）</th>
                <th className="py-4 px-4 w-[15%] text-center">ステータス / アクション</th>
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
                    <td className="py-5 px-4 text-slate-800 font-bold align-middle">{formatAmount(c.contractPrice)} <span className="text-xs font-normal text-slate-500">税抜</span></td>
                    <td className="py-5 px-4 text-slate-800 font-bold align-middle">{c.days} 日</td>
                    <td className="py-5 px-4 text-slate-900 font-bold align-middle">{formatAmount(c.total)}</td>
                    <td className={`py-5 px-4 font-bold text-2xl align-middle ${c.profit >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
                      {formatAmount(c.profit)}
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

            if (authRole === 'viewer') {
              return (
                <div key={loc.name} className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-slate-100">
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-[17px] font-extrabold leading-snug text-slate-800 break-words flex-1">
                        {loc.name}
                      </div>
                      <span className="shrink-0 bg-slate-700 text-white text-[11px] px-2.5 py-1 rounded-lg font-bold">📁 完了済</span>
                    </div>
                  </div>

                  <div className={"mx-4 mt-4 p-3.5 rounded-xl border " + (c.profit >= 0 ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200")}>
                    <div className={"text-xs font-bold " + (c.profit >= 0 ? "text-emerald-700" : "text-rose-700")}>粗利（売却益込）</div>
                    <div className={"text-2xl font-extrabold mt-1 " + (c.profit >= 0 ? "text-emerald-800" : "text-rose-700")}>
                      {formatAmount(c.profit)}
                    </div>
                  </div>

                  <div className="m-4 rounded-xl border border-slate-200 divide-y divide-slate-200 bg-slate-50/70">
                    <div className="flex justify-between items-center gap-3 px-3.5 py-3">
                      <span className="text-xs font-bold text-slate-500">請負金額（税抜）</span>
                      <span className="text-base font-extrabold text-slate-900">{formatAmount(c.contractPrice)}</span>
                    </div>
                    <div className="flex justify-between items-center gap-3 px-3.5 py-3">
                      <span className="text-xs font-bold text-slate-500">合計経費</span>
                      <span className="text-base font-extrabold text-slate-900">{formatAmount(c.total)}</span>
                    </div>
                    <div className="flex justify-between items-center gap-3 px-3.5 py-3">
                      <span className="text-xs font-bold text-slate-500">稼働日数</span>
                      <span className="text-base font-extrabold text-slate-900">{c.days}日</span>
                    </div>
                  </div>

                  <div className="px-4 pb-4">
                    <button onClick={() => setModalLocation(loc.name)} className="w-full bg-slate-700 active:bg-slate-800 text-white py-3.5 rounded-xl text-sm font-bold shadow-sm transition">
                      🔍 詳細分析を見る
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div key={loc.name} className="p-4 rounded-2xl border space-y-3 shadow-xs bg-slate-200/90 border-slate-300">
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-lg leading-snug text-slate-700">{loc.name}</span>
                      <span className="bg-slate-600 text-white text-xs px-2.5 py-0.5 rounded-md font-bold shadow-2xs">📁 完了済</span>
                    </div>
                    <button onClick={() => toggleLocationFinished(loc.name)} className="text-xs text-slate-600 hover:text-slate-900 underline font-medium">未完了に戻す</button>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className={`text-sm px-3 py-1 rounded-xl font-bold inline-block ${c.profit >= 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                      粗利（売却益込）: {formatAmount(c.profit)}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-3 text-xs md:text-sm gap-1 bg-white p-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-center">
                  <div>請負<span className="text-slate-900 font-bold block text-base mt-1">{formatAmount(c.contractPrice)} <span className="text-xs font-normal text-slate-500">税抜</span></span></div>
                  <div>日数<span className="text-slate-900 font-bold block text-base mt-1">{c.days}日</span></div>
                  <div>経費<span className="text-slate-900 font-bold block text-base mt-1">{formatAmount(c.total)}</span></div>
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
                <th className="py-4 px-4 w-[35%]">現場名</th>
                <th className="py-4 px-4 w-[12%]">請負金額</th>
                <th className="py-4 px-4 w-[10%]">稼働日数</th>
                <th className="py-4 px-4 w-[12%]">合計経費</th>
                <th className="py-4 px-4 w-[16%]">粗利（売却益込）</th>
                <th className="py-4 px-4 w-[15%] text-center">ステータス / アクション</th>
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
                    <td className="py-5 px-4 text-slate-800 font-bold align-middle">{formatAmount(c.contractPrice)} <span className="text-xs font-normal text-slate-500">税抜</span></td>
                    <td className="py-5 px-4 text-slate-800 font-bold align-middle">{c.days} 日</td>
                    <td className="py-5 px-4 text-slate-900 font-bold align-middle">{formatAmount(c.total)}</td>
                    <td className={`py-5 px-4 font-bold text-2xl align-middle ${c.profit >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
                      {formatAmount(c.profit)}
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
              onClick={() => {
                if (!showCalendarSection) {
                  setCalendarYearMonth(getCurrentYearMonth());
                }
                setShowCalendarSection(!showCalendarSection);
              }}
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
                        const { dayOfWeek, isHoliday } = getDayInfo(dateStr);
                        const weekDays = ['日', '月', '火', '水', '木', '金', '土'];
                        const wDay = weekDays[dayOfWeek];
                        const isSunday = dayOfWeek === 0;
                        const isSaturday = dayOfWeek === 6;

                        let colorClass = '';
                        if (isSunday || isHoliday) {
                          colorClass = 'text-rose-600 bg-rose-50/50';
                        } else if (isSaturday) {
                          colorClass = 'text-blue-600 bg-blue-50/50';
                        }

                        return (
                          <th key={dateStr} className={`py-3 px-1 text-center min-w-[40px] ${colorClass}`}>
                            <div className={`text-xs font-bold ${isSunday || isHoliday ? 'text-rose-600' : isSaturday ? 'text-blue-600' : 'text-slate-500'}`}>{wDay}</div>
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
                            const { dayOfWeek, isHoliday } = getDayInfo(dateStr);
                            const isSunday = dayOfWeek === 0;
                            const isSaturday = dayOfWeek === 6;

                            let cellBgClass = '';
                            if (isSunday || isHoliday) {
                              cellBgClass = 'bg-rose-50/20';
                            } else if (isSaturday) {
                              cellBgClass = 'bg-blue-50/20';
                            }

                            const matchedReports = reports.filter(r => {
                              const rDateNormalized = normalizeDateStr(r.date);
                              if (rDateNormalized !== dateStr) return false;
                              const isManager = r.manager === staff;
                              const workers = Array.isArray(r.workers) ? r.workers : [];
                              const isWorker = workers.includes(staff);
                              return isManager || isWorker;
                            });

                            const hasEntry = matchedReports.length > 0;
                            const locNames = Array.from(new Set(matchedReports.map(r => r.location))).join(', ');

                            return (
                              <td key={dateStr} className={`py-3 px-1 text-center align-middle ${cellBgClass}`}>
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
        <div className="bg-white p-4 md:p-8 rounded-3xl shadow-sm border border-slate-100 space-y-6">
          <div className="flex justify-between items-center flex-wrap gap-4 border-b border-slate-200 pb-5">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-slate-900">⚙️ マスタ登録・単価設定（PC管理者用）</h2>
              <p className="text-sm text-slate-500 mt-1">新規追加 → 登録済みデータを直接編集 → 「保存」の順で操作できます</p>
            </div>
            <button 
              onClick={() => setShowAdminSection(!showAdminSection)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-bold text-sm transition"
            >
              {showAdminSection ? '📂 設定エリアを隠す ▲' : '📁 設定エリアを開く ▼'}
            </button>
          </div>

          {showAdminSection && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 pt-2 animate-fadeIn items-start">
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
                { title: "🗾 （石川県）重機＆日額単価", key: "ishikawaHeavy", nameKey: "name", priceKey: "price", addForm: ['ihName', 'ihPrice'], placeholders: ["重機名", "日額"], type: "ishikawaHeavy", isIshikawa: true },
                { title: "🗾 （石川県）アタッチメント＆日額単価", key: "ishikawaAttach", nameKey: "name", priceKey: "price", addForm: ['iaName', 'iaPrice'], placeholders: ["アタッチメント名", "日額"], type: "ishikawaAttach", isIshikawa: true },
                { title: "🗾 （石川県）その他機械・機器＆日額単価", key: "ishikawaOther", nameKey: "name", priceKey: "price", addForm: ['ioName', 'ioPrice'], placeholders: ["機械・機器名", "日額"], type: "ishikawaOther", isIshikawa: true },
                { title: "🗑️ 処分場マスタ＆単価", key: "disposalLocations", isDisp: true },
                { title: "♻️ スクラップマスタ", key: "scrapLocations", isScrap: true },
              ].map((sec, idx) => (
                <div key={idx} className={`p-4 md:p-5 rounded-2xl border space-y-5 flex flex-col shadow-sm ${sec.isIshikawa ? 'bg-indigo-50/70 border-indigo-200' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="space-y-4">
                    <div className="flex justify-between items-start gap-3 pb-3 border-b border-slate-200/80">
                      <div className="min-w-0">
                        <h3 className={`font-extrabold text-base md:text-lg leading-snug ${sec.isIshikawa ? 'text-indigo-800' : 'text-slate-800'}`}>{sec.title}</h3>
                        <p className="text-xs text-slate-500 mt-1">登録済み {(settings[sec.key] || []).length} 件</p>
                      </div>
                      <button 
                        onClick={() => saveMaster(sec.key)} 
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs md:text-sm px-4 py-2.5 rounded-xl font-bold shadow-sm transition shrink-0"
                      >
                        💾 保存
                      </button>
                    </div>

                    <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                      <span className="w-7 h-7 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center">＋</span>
                      新規追加
                    </div>

                    {sec.isSub ? (
                      <div className="space-y-3 bg-white p-4 rounded-2xl border-2 border-dashed border-slate-300">
                        <input type="text" placeholder="外注会社名" value={form.subComp || ''} className="w-full p-3 border border-slate-300 rounded-xl text-sm md:text-base bg-slate-50 focus:bg-white focus:outline-none font-medium" onChange={e=>setForm({...form, subComp: e.target.value})} />
                        <div className="grid grid-cols-12 gap-2">
                          <input type="text" placeholder="作業内容" value={form.subTask || ''} className="col-span-7 p-3 border border-slate-300 rounded-xl text-sm md:text-base bg-slate-50 focus:bg-white focus:outline-none font-medium" onChange={e=>setForm({...form, subTask: e.target.value})} />
                          <input type="number" placeholder="単価" value={form.subPrice || ''} className="col-span-5 p-3 border border-slate-300 rounded-xl text-sm md:text-base bg-slate-50 focus:bg-white focus:outline-none font-medium" onChange={e=>setForm({...form, subPrice: e.target.value})} />
                        </div>
                        <button onClick={() => addMaster('subcontractors', {company: form.subComp, task: form.subTask, price: Number(form.subPrice)||0}, ['subComp', 'subTask', 'subPrice'])} className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3 rounded-xl font-bold text-sm md:text-base shadow-sm transition text-center">＋ 追加</button>
                      </div>
                    ) : sec.isDisp ? (
                      <div className="space-y-3 bg-white p-4 rounded-2xl border-2 border-dashed border-slate-300">
                        <input type="text" placeholder="処分場名" value={form.dLoc || ''} className="w-full p-3 border border-slate-300 rounded-xl text-sm md:text-base bg-slate-50 focus:bg-white focus:outline-none font-medium" onChange={e=>setForm({...form, dLoc: e.target.value})} />
                        <div className="grid grid-cols-12 gap-2">
                          <input type="text" placeholder="品目" value={form.dItem || ''} className="col-span-4 p-3 border border-slate-300 rounded-xl text-sm md:text-base bg-slate-50 focus:bg-white focus:outline-none font-medium" onChange={e=>setForm({...form, dItem: e.target.value})} />
                          <input type="text" placeholder="単位" value={form.dUnit || ''} className="col-span-3 p-3 border border-slate-300 rounded-xl text-sm md:text-base bg-slate-50 focus:bg-white focus:outline-none font-medium" onChange={e=>setForm({...form, dUnit: e.target.value})} />
                          <input type="number" placeholder="単価" value={form.dPrice || ''} className="col-span-5 p-3 border border-slate-300 rounded-xl text-sm md:text-base bg-slate-50 focus:bg-white focus:outline-none font-medium" onChange={e=>setForm({...form, dPrice: e.target.value})} />
                        </div>
                        <button onClick={() => addMaster(sec.key, {location: form.dLoc, item: form.dItem, unit: form.dUnit || 't', price: Number(form.dPrice)||0}, ['dLoc', 'dItem', 'dUnit', 'dPrice'])} className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3 rounded-xl font-bold text-sm md:text-base shadow-sm transition text-center">＋ 追加</button>
                      </div>
                    ) : sec.isScrap ? (
                      <div className="space-y-3 bg-white p-4 rounded-2xl border-2 border-dashed border-slate-300">
                        <input type="text" placeholder="スクラップ場名" value={form.sLoc || ''} className="w-full p-3 border border-slate-300 rounded-xl text-sm md:text-base bg-slate-50 focus:bg-white focus:outline-none font-medium" onChange={e=>setForm({...form, sLoc: e.target.value})} />
                        <div className="grid grid-cols-12 gap-2">
                          <input type="text" placeholder="品目" value={form.sItem || ''} className="col-span-7 p-3 border border-slate-300 rounded-xl text-sm md:text-base bg-slate-50 focus:bg-white focus:outline-none font-medium" onChange={e=>setForm({...form, sItem: e.target.value})} />
                          <input type="text" placeholder="単位" value={form.sUnit || ''} className="col-span-5 p-3 border border-slate-300 rounded-xl text-sm md:text-base bg-slate-50 focus:bg-white focus:outline-none font-medium" onChange={e=>setForm({...form, sUnit: e.target.value})} />
                        </div>
                        <button onClick={() => addMaster(sec.key, {location: form.sLoc, item: form.sItem, unit: form.sUnit || 'kg'}, ['sLoc', 'sItem', 'sUnit'])} className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3 rounded-xl font-bold text-sm md:text-base shadow-sm transition text-center">＋ 追加</button>
                      </div>
                    ) : sec.isNoPrice ? (
                      <div className="space-y-3 bg-white p-4 rounded-2xl border-2 border-dashed border-slate-300">
                        <input type="text" placeholder={sec.placeholders[0]} value={form[sec.addForm[0]] || ''} className="w-full p-3 border border-slate-300 rounded-xl text-sm md:text-base bg-slate-50 focus:bg-white focus:outline-none font-medium" onChange={e=>setForm({...form, [sec.addForm[0]]: e.target.value})} />
                        <button onClick={() => addMaster(sec.key, {name: form[sec.addForm[0]]}, [sec.addForm[0]])} className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3 rounded-xl font-bold text-sm md:text-base shadow-sm transition text-center">＋ 追加</button>
                      </div>
                    ) : (
                      <div className="space-y-3 bg-white p-4 rounded-2xl border-2 border-dashed border-slate-300">
                        <input type="text" placeholder={sec.placeholders[0]} value={form[sec.addForm[0]] || ''} className="w-full p-3 border border-slate-300 rounded-xl text-sm md:text-base bg-slate-50 focus:bg-white focus:outline-none font-medium" onChange={e=>setForm({...form, [sec.addForm[0]]: e.target.value})} />
                        <input type="number" placeholder={sec.placeholders[1]} value={form[sec.addForm[1]] || ''} className="w-full p-3 border border-slate-300 rounded-xl text-sm md:text-base bg-slate-50 focus:bg-white focus:outline-none font-medium" onChange={e=>setForm({...form, [sec.addForm[1]]: e.target.value})} />
                        <button onClick={() => addMaster(sec.key, {name: form[sec.addForm[0]], price: Number(form[sec.addForm[1]])||0, isFinished: false}, sec.addForm)} className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3 rounded-xl font-bold text-sm md:text-base shadow-sm transition text-center">＋ 追加</button>
                      </div>
                    )}
                  </div>

                  {/* 登録済みリスト */}
                  <div className="space-y-2 mt-1">
                    <div className="flex items-center justify-between px-1">
                      <div className="text-sm font-bold text-slate-700">✏️ 登録済みデータ（直接編集できます）</div>
                      <div className="text-xs text-slate-400">変更後は右上の「💾 保存」</div>
                    </div>
                    <div className="max-h-[420px] overflow-y-auto bg-white border border-slate-300 rounded-2xl p-3 space-y-3">
                    {(settings[sec.key] || []).length === 0 ? (
                      <p className="text-sm text-slate-400 text-center py-4">登録データがありません</p>
                    ) : (
                      (settings[sec.key] || []).map((item:any, idx:number)=>(
                        <div key={idx} className="flex flex-col gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 transition">
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
                              <button type="button" onClick={()=>deleteMaster(sec.key, idx)} className="text-rose-700 hover:text-white font-bold text-xs px-3 py-2 bg-rose-50 hover:bg-rose-600 border border-rose-200 rounded-lg transition">🗑 削除</button>
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
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 送信された日報一覧（カレンダー＆現場別リスト） */}
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

        {/* 現場日報カレンダー表示セクション */}
        <div className="bg-slate-50 p-4 md:p-6 rounded-3xl border border-slate-200 space-y-4">
          <div className="flex justify-between items-center gap-3 flex-wrap">
            <h3 className="text-lg md:text-xl font-bold text-slate-800">📅 月別カレンダー（現場名から日報を表示）</h3>
            <button
              type="button"
              onClick={() => {
                if (!showReportCalendarSection) {
                  setCalendarYearMonth(getCurrentYearMonth());
                }
                setShowReportCalendarSection(!showReportCalendarSection);
              }}
              className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2.5 rounded-xl font-bold text-sm transition"
            >
              {showReportCalendarSection ? 'カレンダーを閉じる ▲' : 'カレンダーを開く ▼'}
            </button>
          </div>

          {showReportCalendarSection && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex justify-end items-center gap-2">
                <span className="text-sm font-bold text-slate-700">表示月:</span>
                <input 
                  type="month" 
                  value={calendarYearMonth} 
                  onChange={e => setCalendarYearMonth(e.target.value)}
                  className="p-2.5 border border-slate-300 rounded-xl text-sm font-bold bg-white focus:outline-none"
                />
              </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-7 gap-2">
            {calendarDays.map(dateStr => {
              const dayNum = Number(dateStr.split('-')[2]);
              const { dayOfWeek, isHoliday } = getDayInfo(dateStr);
              const weekDays = ['日', '月', '火', '水', '木', '金', '土'];
              const wDay = weekDays[dayOfWeek];
              const isSunday = dayOfWeek === 0;
              const isSaturday = dayOfWeek === 6;

              let dayBoxClass = 'bg-white border-slate-200';
              let headerColorClass = 'text-slate-800';
              if (isSunday || isHoliday) {
                dayBoxClass = 'bg-rose-50/40 border-rose-200';
                headerColorClass = 'text-rose-600 font-bold';
              } else if (isSaturday) {
                dayBoxClass = 'bg-blue-50/40 border-blue-200';
                headerColorClass = 'text-blue-600 font-bold';
              }

              const dayReports = reports.filter(r => normalizeDateStr(r.date) === dateStr);
              const dayLocations = Array.from(new Set(dayReports.map(r => r.location).filter(Boolean)));

              return (
                <div key={dateStr} className={`p-3 rounded-2xl border flex flex-col justify-between min-h-[110px] ${dayBoxClass}`}>
                  <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                    <span className={`text-sm ${headerColorClass}`}>{Number(dateStr.split('-')[1])}/{dayNum} ({wDay})</span>
                    {dayLocations.length > 0 && (
                      <span className="text-xs bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded font-bold">{dayLocations.length}件</span>
                    )}
                  </div>
                  <div className="space-y-1.5 pt-2 overflow-y-auto max-h-24">
                    {dayLocations.length > 0 ? (
                      dayLocations.map((locName, lIdx) => {
                        const matchedReportsForDayAndLoc = dayReports.filter(r => r.location === locName);
                        return (
                          <button
                            key={lIdx}
                            onClick={() => setCalendarReportModal({ date: dateStr, location: locName, reports: matchedReportsForDayAndLoc })}
                            className="w-full text-left text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold p-1.5 rounded-xl border border-blue-200 truncate transition shadow-2xs"
                            title={`${dateStr} の ${locName} の日報を表示`}
                          >
                            🏢 {locName}
                          </button>
                        );
                      })
                    ) : (
                      <span className="text-xs text-slate-300 text-center block py-2">-</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

            </div>
          )}
        </div>

        {/* 送信された日報一覧（稼働中の現場） */}
        <div className="bg-white p-4 md:p-8 rounded-2xl md:rounded-3xl shadow-sm border border-slate-100 space-y-6">
          <div className="flex justify-between items-center flex-wrap gap-3">
            <h2 className="text-xl md:text-2xl font-bold text-slate-900">📥 送信された日報一覧（稼働中の現場）</h2>
          </div>

          <div className="space-y-6">
            {activeLocList.filter(loc => !filterLocation || loc.name.includes(filterLocation)).map(loc => {
              const targetNames = getTargetLocationNames(loc.name);
              const locReports = filteredReports.filter(r => targetNames.includes(r.location));
              if (locReports.length === 0) return null;

              const sortedLocReports = [...locReports].sort((a, b) => {
                const dateA = normalizeDateStr(a.date || '');
                const dateB = normalizeDateStr(b.date || '');
                return dateB.localeCompare(dateA);
              });

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
                      {sortedLocReports.map((r, i) => {
                        const originalIndex = reports.findIndex(item => (item.id && item.id === r.id) || (item._id && item._id === r._id) || item === r);
                        const workers = Array.isArray(r.workers) ? r.workers : [];
                        const subcontractors = Array.isArray(r.subcontractors) ? r.subcontractors : [];
                        const machines = Array.isArray(r.machines) ? r.machines : [];
                        const leaseHeavy = Array.isArray(r.leaseHeavy) ? r.leaseHeavy : [];
                        const leaseAttach = Array.isArray(r.leaseAttach) ? r.leaseAttach : [];
                        const leaseOther = Array.isArray(r.leaseOther) ? r.leaseOther : [];
                        const ishikawaHeavy = Array.isArray(r.ishikawaHeavy) ? r.ishikawaHeavy : [];
                        const ishikawaAttach = Array.isArray(r.ishikawaAttach) ? r.ishikawaAttach : [];
                        const ishikawaOther = Array.isArray(r.ishikawaOther) ? r.ishikawaOther : [];
                        const mokCustomMachines = Array.isArray(r.mokCustomMachines) ? r.mokCustomMachines : [];
                        const otherLeases = Array.isArray(r.otherLeases) ? r.otherLeases : [];
                        const ownMachines = Array.isArray(r.ownMachines) ? r.ownMachines : [];
                        const vehicles = Array.isArray(r.vehicles) ? r.vehicles : [];
                        const disposals = Array.isArray(r.disposals) ? r.disposals : [];
                        const scraps = Array.isArray(r.scraps) ? r.scraps : [];

                        return (
                          <div key={r.id || r._id || i} className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-2xs">
                            <div className="space-y-2.5 flex-1 w-full">
                              <div className="flex items-center gap-3 flex-wrap">
                                <span className="font-bold text-slate-700 text-sm md:text-base">📅 {r.date}</span>
                                {r.client && <span className="font-bold text-blue-700 text-sm md:text-base">🏢 請負先: {r.client}</span>}
                                {r.startDate && <span className="font-bold text-slate-600 text-sm md:text-base">⏱ 開始日: {r.startDate}</span>}
                                <span className="font-bold text-slate-900 text-sm md:text-base">👤 職長: {r.manager || '-'} / 作業者: {workers.join(', ') || '-'}</span>
                              </div>

                              {r.jobTypes && Object.keys(r.jobTypes).length > 0 && (
                                <div className="text-sm text-indigo-800 font-bold">
                                  🏷️ 職種人数: {Object.entries(r.jobTypes).map(([job, count]) => `${job}: ${count}人`).join(', ')}
                                </div>
                              )}

                              {subcontractors.length > 0 && (
                                <div className="text-sm text-orange-800 font-bold">
                                  外注: {subcontractors.map((s:any)=>`${s.company} (${s.task}: ${s.count}人)`).join(', ')}
                                </div>
                              )}

                              {/* 重機・車両の内訳をカテゴリごとに見やすく整理 */}
                              <div className="text-sm text-slate-700 font-medium space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-200">
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">🚜 重機・車両・リース内訳</div>
                                {machines.length > 0 && <div>🔹 <b>MOKリース(旧):</b> {machines.join(', ')}</div>}
                                {leaseHeavy.length > 0 && <div>🔸 <b>MOK重機:</b> {leaseHeavy.join(', ')}</div>}
                                {leaseAttach.length > 0 && <div>🔸 <b>MOKアタッチメント:</b> {leaseAttach.join(', ')}</div>}
                                {leaseOther.length > 0 && <div>🔸 <b>MOKその他機器:</b> {leaseOther.join(', ')}</div>}
                                {ishikawaHeavy.length > 0 && <div>🗾 <b>石川重機:</b> {ishikawaHeavy.join(', ')}</div>}
                                {ishikawaAttach.length > 0 && <div>🗾 <b>石川アタッチメント:</b> {ishikawaAttach.join(', ')}</div>}
                                {ishikawaOther.length > 0 && <div>🗾 <b>石川その他機器:</b> {ishikawaOther.join(', ')}</div>}
                                {mokCustomMachines.length > 0 && <div>📦 <b>その他機械(MOK):</b> {mokCustomMachines.map((m:any)=>`${m.name}(${m.count}個)`).join(', ')}</div>}
                                {otherLeases.length > 0 && <div>📦 <b>その他リース:</b> {otherLeases.map((ol:any)=>`${ol.company}(${ol.name}:${ol.count}個)`).join(', ')}</div>}
                                {r.otherMachines && <div>📦 <b>自由入力機械:</b> {r.otherMachines}</div>}
                                {ownMachines.length > 0 && <div>🟩 <b>自社重機:</b> {ownMachines.join(', ')}</div>}
                                {vehicles.length > 0 && <div>🚙 <b>自社車両:</b> {vehicles.join(', ')}</div>}
                                {machines.length === 0 && leaseHeavy.length === 0 && leaseAttach.length === 0 && leaseOther.length === 0 && ishikawaHeavy.length === 0 && ishikawaAttach.length === 0 && ishikawaOther.length === 0 && mokCustomMachines.length === 0 && otherLeases.length === 0 && !r.otherMachines && ownMachines.length === 0 && vehicles.length === 0 && (
                                  <span className="text-slate-400">なし</span>
                                )}
                              </div>

                              <div className="text-sm text-slate-700 font-medium grid grid-cols-2 md:grid-cols-4 gap-2 bg-slate-50 p-2.5 rounded-xl border">
                                <div>軽油: <b>{r.fuel || 0} L</b></div>
                                <div>レギュラー: <b>{formatAmount(r.regularPrice || 0)}</b></div>
                                {r.location?.includes('旧河北郡市クリーンセンター') && (
                                  <div className="col-span-2">
                                    宇野気石油 合計: <b>{(Number(r.unokeFuel || 0) + Number(r.unokeRegular || 0)).toLocaleString('ja-JP')} L</b>
                                  </div>
                                )}
                                <div>ETC: <b>{formatAmount(r.etcPrice || 0)}</b></div>
                                <div>駐車場代: <b>{formatAmount(r.parkingPrice || 0)}</b></div>
                                {r.otherItem && <div className="col-span-2">雑費({r.otherItem}): <b>{formatAmount(r.otherPrice || 0)}</b></div>}
                              </div>

                              {(disposals.length > 0 || scraps.length > 0) && (
                                <div className="flex flex-col gap-1 pt-0.5">
                                  {disposals.length > 0 && (
                                    <div className="text-sm text-amber-800 font-bold">
                                      🗑️ 処分: {disposals.map((d: any) => `${d.location || 'その他'} (${d.item || '品目未指定'}: ${d.quantity || 0}${d.unit || 't'})`).join(', ')}
                                    </div>
                                  )}
                                  {scraps.length > 0 && (
                                    <div className="text-sm text-emerald-800 font-bold">
                                      ♻️ スクラップ: {scraps.map((sc: any) => `${sc.location || 'その他'} (${sc.item || '品目未指定'}: ${sc.quantity || 0}${sc.unit || 'kg'})`).join(', ')}
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
          </div>
        </div>

        {/* 送信された日報一覧（完了済の現場） */}
        <div className="bg-slate-50 p-4 md:p-8 rounded-2xl md:rounded-3xl shadow-sm border border-slate-200 space-y-6">
          <h2 className="text-xl md:text-2xl font-bold text-slate-700">📁 送信された日報一覧（完了済の現場）</h2>
          
          <div className="space-y-6">
            {finishedLocList.filter(loc => !filterLocation || loc.name.includes(filterLocation)).map(loc => {
              const targetNames = getTargetLocationNames(loc.name);
              const locReports = filteredReports.filter(r => targetNames.includes(r.location));
              if (locReports.length === 0) return null;

              const sortedLocReports = [...locReports].sort((a, b) => {
                const dateA = normalizeDateStr(a.date || '');
                const dateB = normalizeDateStr(b.date || '');
                return dateB.localeCompare(dateA);
              });

              const isReportOpen = reportSectionOpen[loc.name] || false;

              return (
                <div key={loc.name} className="bg-slate-100 rounded-3xl border border-slate-300 p-4 md:p-6 space-y-4 shadow-xs">
                  <div className="flex justify-between items-center border-b border-slate-300 pb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-xl md:text-2xl text-slate-600">🏢 {loc.name}</span>
                      <span className="bg-slate-600 text-white text-xs md:text-sm px-3 py-1 rounded-full font-bold">📁 完了済 ({locReports.length}件)</span>
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
                      {sortedLocReports.map((r, i) => {
                        const originalIndex = reports.findIndex(item => (item.id && item.id === r.id) || (item._id && item._id === r._id) || item === r);
                        const workers = Array.isArray(r.workers) ? r.workers : [];
                        const subcontractors = Array.isArray(r.subcontractors) ? r.subcontractors : [];
                        const machines = Array.isArray(r.machines) ? r.machines : [];
                        const leaseHeavy = Array.isArray(r.leaseHeavy) ? r.leaseHeavy : [];
                        const leaseAttach = Array.isArray(r.leaseAttach) ? r.leaseAttach : [];
                        const leaseOther = Array.isArray(r.leaseOther) ? r.leaseOther : [];
                        const ishikawaHeavy = Array.isArray(r.ishikawaHeavy) ? r.ishikawaHeavy : [];
                        const ishikawaAttach = Array.isArray(r.ishikawaAttach) ? r.ishikawaAttach : [];
                        const ishikawaOther = Array.isArray(r.ishikawaOther) ? r.ishikawaOther : [];
                        const mokCustomMachines = Array.isArray(r.mokCustomMachines) ? r.mokCustomMachines : [];
                        const otherLeases = Array.isArray(r.otherLeases) ? r.otherLeases : [];
                        const ownMachines = Array.isArray(r.ownMachines) ? r.ownMachines : [];
                        const vehicles = Array.isArray(r.vehicles) ? r.vehicles : [];
                        const disposals = Array.isArray(r.disposals) ? r.disposals : [];
                        const scraps = Array.isArray(r.scraps) ? r.scraps : [];

                        return (
                          <div key={r.id || r._id || i} className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-2xs">
                            <div className="space-y-2.5 flex-1 w-full">
                              <div className="flex items-center gap-3 flex-wrap">
                                <span className="font-bold text-slate-700 text-sm md:text-base">📅 {r.date}</span>
                                {r.client && <span className="font-bold text-blue-700 text-sm md:text-base">🏢 請負先: {r.client}</span>}
                                {r.startDate && <span className="font-bold text-slate-600 text-sm md:text-base">⏱ 開始日: {r.startDate}</span>}
                                <span className="font-bold text-slate-900 text-sm md:text-base">👤 職長: {r.manager || '-'} / 作業者: {workers.join(', ') || '-'}</span>
                              </div>

                              {r.jobTypes && Object.keys(r.jobTypes).length > 0 && (
                                <div className="text-sm text-indigo-800 font-bold">
                                  🏷️ 職種人数: {Object.entries(r.jobTypes).map(([job, count]) => `${job}: ${count}人`).join(', ')}
                                </div>
                              )}

                              {subcontractors.length > 0 && (
                                <div className="text-sm text-orange-800 font-bold">
                                  外注: {subcontractors.map((s:any)=>`${s.company} (${s.task}: ${s.count}人)`).join(', ')}
                                </div>
                              )}

                              {/* 重機・車両の内訳をカテゴリごとに見やすく整理 */}
                              <div className="text-sm text-slate-700 font-medium space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-200">
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">🚜 重機・車両・リース内訳</div>
                                {machines.length > 0 && <div>🔹 <b>MOKリース(旧):</b> {machines.join(', ')}</div>}
                                {leaseHeavy.length > 0 && <div>🔸 <b>MOK重機:</b> {leaseHeavy.join(', ')}</div>}
                                {leaseAttach.length > 0 && <div>🔸 <b>MOKアタッチメント:</b> {leaseAttach.join(', ')}</div>}
                                {leaseOther.length > 0 && <div>🔸 <b>MOKその他機器:</b> {leaseOther.join(', ')}</div>}
                                {ishikawaHeavy.length > 0 && <div>🗾 <b>石川重機:</b> {ishikawaHeavy.join(', ')}</div>}
                                {ishikawaAttach.length > 0 && <div>🗾 <b>石川アタッチメント:</b> {ishikawaAttach.join(', ')}</div>}
                                {ishikawaOther.length > 0 && <div>🗾 <b>石川その他機器:</b> {ishikawaOther.join(', ')}</div>}
                                {mokCustomMachines.length > 0 && <div>📦 <b>その他機械(MOK):</b> {mokCustomMachines.map((m:any)=>`${m.name}(${m.count}個)`).join(', ')}</div>}
                                {otherLeases.length > 0 && <div>📦 <b>その他リース:</b> {otherLeases.map((ol:any)=>`${ol.company}(${ol.name}:${ol.count}個)`).join(', ')}</div>}
                                {r.otherMachines && <div>📦 <b>自由入力機械:</b> {r.otherMachines}</div>}
                                {ownMachines.length > 0 && <div>🟩 <b>自社重機:</b> {ownMachines.join(', ')}</div>}
                                {vehicles.length > 0 && <div>🚙 <b>自社車両:</b> {vehicles.join(', ')}</div>}
                                {machines.length === 0 && leaseHeavy.length === 0 && leaseAttach.length === 0 && leaseOther.length === 0 && ishikawaHeavy.length === 0 && ishikawaAttach.length === 0 && ishikawaOther.length === 0 && mokCustomMachines.length === 0 && otherLeases.length === 0 && !r.otherMachines && ownMachines.length === 0 && vehicles.length === 0 && (
                                  <span className="text-slate-400">なし</span>
                                )}
                              </div>

                              <div className="text-sm text-slate-700 font-medium grid grid-cols-2 md:grid-cols-4 gap-2 bg-slate-50 p-2.5 rounded-xl border">
                                <div>軽油: <b>{r.fuel || 0} L</b></div>
                                <div>レギュラー: <b>{formatAmount(r.regularPrice || 0)}</b></div>
                                {r.location?.includes('旧河北郡市クリーンセンター') && (
                                  <div className="col-span-2">
                                    宇野気石油 合計: <b>{(Number(r.unokeFuel || 0) + Number(r.unokeRegular || 0)).toLocaleString('ja-JP')} L</b>
                                  </div>
                                )}
                                <div>ETC: <b>{formatAmount(r.etcPrice || 0)}</b></div>
                                <div>駐車場代: <b>{formatAmount(r.parkingPrice || 0)}</b></div>
                                {r.otherItem && <div className="col-span-2">雑費({r.otherItem}): <b>{formatAmount(r.otherPrice || 0)}</b></div>}
                              </div>

                              {(disposals.length > 0 || scraps.length > 0) && (
                                <div className="flex flex-col gap-1 pt-0.5">
                                  {disposals.length > 0 && (
                                    <div className="text-sm text-amber-800 font-bold">
                                      🗑️ 処分: {disposals.map((d: any) => `${d.location || 'その他'} (${d.item || '品目未指定'}: ${d.quantity || 0}${d.unit || 't'})`).join(', ')}
                                    </div>
                                  )}
                                  {scraps.length > 0 && (
                                    <div className="text-sm text-emerald-800 font-bold">
                                      ♻️ スクラップ: {scraps.map((sc: any) => `${sc.location || 'その他'} (${sc.item || '品目未指定'}: ${sc.quantity || 0}${sc.unit || 'kg'})`).join(', ')}
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
          </div>
        </div>
      </div>

      {/* カレンダーの日付・現場名をクリックしたときに日報を表示するモーダル */}
      {calendarReportModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-md flex items-center justify-center p-3 md:p-6 z-50 animate-fadeIn" onClick={() => setCalendarReportModal(null)}>
          <div className="bg-white rounded-[32px] w-full max-w-4xl p-6 md:p-10 max-h-[92vh] overflow-y-auto space-y-6 shadow-2xl border border-slate-100" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-xl md:text-2xl font-bold text-slate-900">
                  📅 日報確認：{calendarReportModal.date} - {calendarReportModal.location}
                </h3>
                <p className="text-xs md:text-sm text-slate-500 mt-0.5">指定された日時に送信された日報内容です</p>
              </div>
              <button 
                onClick={() => setCalendarReportModal(null)} 
                className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-lg transition"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {calendarReportModal.reports.length === 0 ? (
                <p className="text-base text-slate-500 text-center py-8">該当する日報データはありません</p>
              ) : (
                calendarReportModal.reports.map((r, i) => {
                  const originalIndex = reports.findIndex(item => (item.id && item.id === r.id) || (item._id && item._id === r._id) || item === r);
                  const workers = Array.isArray(r.workers) ? r.workers : [];
                  const subcontractors = Array.isArray(r.subcontractors) ? r.subcontractors : [];
                  const machines = Array.isArray(r.machines) ? r.machines : [];
                  const leaseHeavy = Array.isArray(r.leaseHeavy) ? r.leaseHeavy : [];
                  const leaseAttach = Array.isArray(r.leaseAttach) ? r.leaseAttach : [];
                  const leaseOther = Array.isArray(r.leaseOther) ? r.leaseOther : [];
                  const ishikawaHeavy = Array.isArray(r.ishikawaHeavy) ? r.ishikawaHeavy : [];
                  const ishikawaAttach = Array.isArray(r.ishikawaAttach) ? r.ishikawaAttach : [];
                  const ishikawaOther = Array.isArray(r.ishikawaOther) ? r.ishikawaOther : [];
                  const mokCustomMachines = Array.isArray(r.mokCustomMachines) ? r.mokCustomMachines : [];
                  const otherLeases = Array.isArray(r.otherLeases) ? r.otherLeases : [];
                  const ownMachines = Array.isArray(r.ownMachines) ? r.ownMachines : [];
                  const vehicles = Array.isArray(r.vehicles) ? r.vehicles : [];
                  const disposals = Array.isArray(r.disposals) ? r.disposals : [];
                  const scraps = Array.isArray(r.scraps) ? r.scraps : [];

                  return (
                    <div key={r.id || r._id || i} className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3 shadow-2xs">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-bold text-slate-700 text-sm md:text-base">📅 {r.date}</span>
                        {r.client && <span className="font-bold text-blue-700 text-sm md:text-base">🏢 請負先: {r.client}</span>}
                        {r.startDate && <span className="font-bold text-slate-600 text-sm md:text-base">⏱ 開始日: {r.startDate}</span>}
                        <span className="font-bold text-slate-900 text-sm md:text-base">👤 職長: {r.manager || '-'} / 作業者: {workers.join(', ') || '-'}</span>
                      </div>

                      {r.jobTypes && Object.keys(r.jobTypes).length > 0 && (
                        <div className="text-sm text-indigo-800 font-bold">
                          🏷️ 職種人数: {Object.entries(r.jobTypes).map(([job, count]) => `${job}: ${count}人`).join(', ')}
                        </div>
                      )}

                      {subcontractors.length > 0 && (
                        <div className="text-sm text-orange-800 font-bold">
                          外注: {subcontractors.map((s:any)=>`${s.company} (${s.task}: ${s.count}人)`).join(', ')}
                        </div>
                      )}

                      <div className="text-sm text-slate-700 font-medium space-y-1 bg-white p-3 rounded-xl border">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">🚜 重機・車両・リース内訳</div>
                        {machines.length > 0 && <div>🔹 <b>MOKリース(旧):</b> {machines.join(', ')}</div>}
                        {leaseHeavy.length > 0 && <div>🔸 <b>MOK重機:</b> {leaseHeavy.join(', ')}</div>}
                        {leaseAttach.length > 0 && <div>🔸 <b>MOKアタッチメント:</b> {leaseAttach.join(', ')}</div>}
                        {leaseOther.length > 0 && <div>🔸 <b>MOKその他機器:</b> {leaseOther.join(', ')}</div>}
                        {ishikawaHeavy.length > 0 && <div>🗾 <b>石川重機:</b> {ishikawaHeavy.join(', ')}</div>}
                        {ishikawaAttach.length > 0 && <div>🗾 <b>石川アタッチメント:</b> {ishikawaAttach.join(', ')}</div>}
                        {ishikawaOther.length > 0 && <div>🗾 <b>石川その他機器:</b> {ishikawaOther.join(', ')}</div>}
                        {mokCustomMachines.length > 0 && <div>📦 <b>その他機械(MOK):</b> {mokCustomMachines.map((m:any)=>`${m.name}(${m.count}個)`).join(', ')}</div>}
                        {otherLeases.length > 0 && <div>📦 <b>その他リース:</b> {otherLeases.map((ol:any)=>`${ol.company}(${ol.name}:${ol.count}個)`).join(', ')}</div>}
                        {r.otherMachines && <div>📦 <b>自由入力機械:</b> {r.otherMachines}</div>}
                        {ownMachines.length > 0 && <div>🟩 <b>自社重機:</b> {ownMachines.join(', ')}</div>}
                        {vehicles.length > 0 && <div>🚙 <b>自社車両:</b> {vehicles.join(', ')}</div>}
                      </div>

                      <div className="text-sm text-slate-700 font-medium grid grid-cols-2 md:grid-cols-4 gap-2 bg-white p-3 rounded-xl border">
                        <div>軽油: <b>{r.fuel || 0} L</b></div>
                        <div>レギュラー: <b>{formatAmount(r.regularPrice || 0)}</b></div>
                        {r.location?.includes('旧河北郡市クリーンセンター') && (
                          <div className="col-span-2">
                            宇野気石油 合計: <b>{(Number(r.unokeFuel || 0) + Number(r.unokeRegular || 0)).toLocaleString('ja-JP')} L</b>
                          </div>
                        )}
                        <div>ETC: <b>{formatAmount(r.etcPrice || 0)}</b></div>
                        <div>駐車場代: <b>{formatAmount(r.parkingPrice || 0)}</b></div>
                        {r.otherItem && <div className="col-span-2">雑費({r.otherItem}): <b>{formatAmount(r.otherPrice || 0)}</b></div>}
                      </div>

                      {(disposals.length > 0 || scraps.length > 0) && (
                        <div className="flex flex-col gap-1 pt-0.5">
                          {disposals.length > 0 && (
                            <div className="text-sm text-amber-800 font-bold">
                              🗑️ 処分: {disposals.map((d: any) => `${d.location || 'その他'} (${d.item || '品目未指定'}: ${d.quantity || 0}${d.unit || 't'})`).join(', ')}
                            </div>
                          )}
                          {scraps.length > 0 && (
                            <div className="text-sm text-emerald-800 font-bold">
                              ♻️ スクラップ: {scraps.map((sc: any) => `${sc.location || 'その他'} (${sc.item || '品目未指定'}: ${sc.quantity || 0}${sc.unit || 'kg'})`).join(', ')}
                            </div>
                          )}
                        </div>
                      )}

                      {r.workDescription && (
                        <div className="text-sm md:text-base text-slate-700 font-medium bg-white p-3.5 rounded-xl border border-slate-200 whitespace-pre-wrap">
                          {r.workDescription}
                        </div>
                      )}

                      {authRole === 'admin' && (
                        <div className="flex gap-2 pt-2">
                          <button onClick={() => { setCalendarReportModal(null); setEditingReport({ ...r }); }} className="bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-600 px-4 py-2 rounded-xl font-bold transition text-sm shadow-2xs">編集</button>
                          <button onClick={() => { handleDeleteReport(r, originalIndex !== -1 ? originalIndex : i); setCalendarReportModal(null); }} className="bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-600 px-4 py-2 rounded-xl font-bold transition text-sm shadow-2xs">削除</button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setCalendarReportModal(null)} 
                className="bg-slate-800 hover:bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold text-base transition"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 全処分対象：月別処分一覧 ポップアップモダール */}
      {showAllMonthlyDisposalModal && authRole === 'admin' && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-md flex items-center justify-center p-2 md:p-6 z-50 animate-fadeIn" onClick={() => setShowAllMonthlyDisposalModal(false)}>
          <div className="bg-white rounded-[28px] w-full max-w-7xl p-4 md:p-7 max-h-[94vh] overflow-y-auto space-y-5 shadow-2xl border border-slate-100" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-xl md:text-2xl font-bold text-slate-900">📦 月別処分一覧（全現場・処分場別）</h3>
                <p className="text-sm md:text-base text-slate-600 mt-1.5 leading-relaxed">
                  各現場の「詳細分析 → 処分費」の内容を、処分場・月ごとにまとめて表示します。
                </p>
                <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm md:text-base text-amber-900 font-bold leading-relaxed">
                  📄 請求書と見比べるための一覧です。<br />
                  日報由来と確定額が違う行には「❕」が表示されます。押すと理由を入力・確認できます。<br />
                  <span className="text-emerald-700">金額・理由・照合済みの色を変更したら、最後に「💾 保存」を押してください。</span>
                </div>
              </div>
              <button onClick={() => setShowAllMonthlyDisposalModal(false)} className="shrink-0 w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-lg transition">✕</button>
            </div>

            <div className="space-y-8">
              {(() => {
                const groupedData = getAllMonthlyDisposalGroupedData();
                const disposalSites = Object.keys(groupedData);
                if (disposalSites.length === 0) {
                  return <p className="text-base text-slate-500 text-center py-8">処分データはありません</p>;
                }

                return disposalSites.map(dSite => (
                  <section key={dSite} className="space-y-4">
                    <div className="sticky top-0 z-10 bg-slate-800 text-white px-4 py-3 rounded-2xl shadow-sm">
                      <div className="font-extrabold text-lg">🏢 {dSite}</div>
                    </div>

                    {Object.entries(groupedData[dSite])
                      .sort(([a], [b]) => b.localeCompare(a))
                      .map(([ym, items]: any) => {
                        const [y, m] = ym.split('-');
                        const reportMonthlyTotal = items.reduce(
                          (sum: number, it: any) => sum + Number(it.reportTotal || 0), 0
                        );
                        const confirmedMonthlyTotal = items.reduce(
                          (sum: number, it: any) => sum + Number(it.confirmedTotal || 0), 0
                        );
                        const invoiceKey = `${dSite}__${ym}`;
                        const invoiceValue = monthlyDisposalInvoices[invoiceKey] ?? '';

                        return (
                          <div key={ym} className="rounded-3xl border border-slate-200 bg-slate-50 overflow-hidden shadow-2xs">
                            <div className="p-4 bg-white border-b border-slate-200">
                              <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
                                <div className="font-extrabold text-lg text-slate-900">📅 {y}年{Number(m)}月</div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full xl:w-auto">
                                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                                    <div className="text-[11px] font-bold text-slate-500">日報由来 合計</div>
                                    <div className="font-extrabold text-slate-800">{formatAmount(reportMonthlyTotal)}</div>
                                  </div>
                                  <div className="rounded-xl border border-blue-200 bg-blue-50/50 px-3 py-2">
                                    <div className="text-[11px] font-bold text-blue-600">確定額 合計（原価反映）</div>
                                    <div className="font-extrabold text-blue-800">{formatAmount(confirmedMonthlyTotal)}</div>
                                  </div>
                                  <div className="rounded-xl border border-violet-200 bg-violet-50/40 px-3 py-2">
                                    <div className="text-[11px] font-bold text-violet-700">処分場請求書（税別・照合メモ）</div>
                                    <div className="flex items-center gap-1 mt-1">
                                      <span className="text-slate-500 font-bold">¥</span>
                                      <input
                                        type="number"
                                        value={invoiceValue}
                                        onClick={(e) => e.stopPropagation()}
                                        onChange={(e) => handleMonthlyDisposalInvoiceChange(dSite, ym, e.target.value)}
                                        placeholder="請求書金額"
                                        className="w-full p-1.5 border border-violet-300 rounded-lg bg-white font-bold text-right text-sm"
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 text-sm md:text-base text-slate-700 font-bold leading-relaxed">
                              「日報由来」＝日報からの計算額　／　「確定額」＝請求書を確認して必要なら修正する金額
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full min-w-[1180px] text-left border-collapse text-base">
                                <thead>
                                  <tr className="border-b border-slate-300 text-slate-700 font-extrabold bg-slate-100 text-base">
                                    <th className="py-3.5 px-3 w-[90px] text-base">日付</th>
                                    <th className="py-3 px-3">現場名</th>
                                    <th className="py-3 px-3">品目</th>
                                    <th className="py-3 px-3 text-right">数量</th>
                                    <th className="py-3 px-3 text-right">単価</th>
                                    <th className="py-3 px-3 text-right">日報由来</th>
                                    <th className="py-3 px-3 text-right">確定額</th>
                                    <th className="py-3 px-3 text-center w-[72px]">理由</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                  {items.map((it: any) => {
                                    const isChecked = !!checkedDisposalRows[it.rowKey];
                                    const displayPrice =
                                      it.priceOverride !== '' && it.priceOverride !== undefined
                                        ? it.priceOverride
                                        : formatInputNumber(it.unitPrice);
                                    const displayInvoice =
                                      it.invoiceOverride !== '' && it.invoiceOverride !== undefined
                                        ? it.invoiceOverride
                                        : formatInputNumber(it.reportTotal);

                                    return (
                                      <tr
                                        key={it.rowKey}
                                        onClick={() => {
                                          setCheckedDisposalRows(prev => ({ ...prev, [it.rowKey]: !prev[it.rowKey] }));
                                          setFinancialDirty(true);
                                        }}
                                        className={
                                          "cursor-pointer transition " +
                                          (isChecked
                                            ? "bg-emerald-100/80 text-slate-500"
                                            : "bg-white hover:bg-amber-50")
                                        }
                                      >
                                        <td className="py-3 px-3 align-top">
                                          <div className={"font-extrabold rounded-lg px-2 py-1 inline-block " + (isChecked ? "bg-emerald-200 text-emerald-900" : "bg-slate-100 text-slate-800")}>
                                            {it.formattedDate || '-'}
                                          </div>
                                          {isChecked && (
                                            <div className="text-[11px] font-extrabold text-emerald-700 mt-1">✓ 照合済</div>
                                          )}
                                        </td>
                                        <td className="py-3 px-3 font-bold max-w-[300px] align-top">{it.locationName}</td>
                                        <td className="py-3 px-3 font-bold align-top">{it.item}</td>
                                        <td className="py-3 px-3 text-right font-bold align-top">
                                          {Number(it.quantity || 0).toLocaleString('ja-JP')} {it.unit}
                                        </td>
                                        <td className="py-3 px-3 text-right align-top">
                                          <div className="flex items-center justify-end gap-1">
                                            <span className="text-slate-400">¥</span>
                                            <input
                                              type="number"
                                              value={displayPrice}
                                              onClick={(e) => e.stopPropagation()}
                                              onChange={(e) => handleDisposalDetailOverrideChange(
                                                it.locationName, dSite, ym, it.dateKey, it.item, 'unitPrice', e.target.value
                                              )}
                                              className="w-28 p-2.5 border border-slate-300 rounded-lg text-right font-extrabold bg-white text-base"
                                            />
                                          </div>
                                        </td>
                                        <td className="py-3 px-3 text-right font-extrabold text-slate-700 align-top">
                                          {formatAmount(it.reportTotal)}
                                        </td>
                                        <td className="py-3 px-3 text-right align-top">
                                          <div className="flex items-center justify-end gap-1">
                                            <span className="text-blue-500 font-bold">¥</span>
                                            <input
                                              type="number"
                                              value={displayInvoice}
                                              onClick={(e) => e.stopPropagation()}
                                              onChange={(e) => handleDisposalDetailOverrideChange(
                                                it.locationName, dSite, ym, it.dateKey, it.item, 'invoice', e.target.value
                                              )}
                                              className="w-32 p-2.5 border border-blue-300 rounded-lg text-right font-extrabold bg-blue-50/40 text-blue-900 text-base"
                                            />
                                          </div>
                                        </td>
                                        <td className="py-3 px-3 text-center align-middle">
                                          {(() => {
                                            const hasDifference = Math.abs(Number(it.reportTotal || 0) - Number(it.confirmedTotal || 0)) > 0.009;
                                            const hasMemo = !!(disposalRowMemos[it.rowKey] || '').trim();

                                            return (
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setDisposalMemoModal({
                                                    rowKey: it.rowKey,
                                                    date: it.formattedDate,
                                                    locationName: it.locationName,
                                                    disposalSite: dSite,
                                                    item: it.item,
                                                    reportTotal: it.reportTotal,
                                                    confirmedTotal: it.confirmedTotal
                                                  });
                                                }}
                                                title={hasMemo ? '理由を確認・編集' : (hasDifference ? '差額の理由を入力' : 'メモを追加')}
                                                className={`mx-auto w-10 h-10 rounded-full inline-flex items-center justify-center font-black text-lg border-2 transition ${
                                                  hasDifference
                                                    ? (hasMemo
                                                        ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                                                        : 'bg-amber-50 text-amber-600 border-amber-400 animate-pulse')
                                                    : (hasMemo
                                                        ? 'bg-slate-700 text-white border-slate-700'
                                                        : 'bg-white text-slate-300 border-slate-200 hover:text-slate-500')
                                                }`}
                                              >
                                                {hasDifference ? '❕' : '✎'}
                                              </button>
                                            );
                                          })()}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>

                            <div className="px-4 py-2 text-[11px] text-slate-400 bg-white border-t border-slate-100">
                              💡 日付ボタンを押すと照合済みの目印（打消し）を付けられます。
                            </div>
                          </div>
                        );
                      })}
                  </section>
                ));
              })()}
            </div>

            <div className="sticky bottom-0 z-20 bg-white/95 backdrop-blur-sm pt-4 pb-1 border-t border-slate-200 flex items-center justify-end gap-3">
              {authRole === 'admin' && (
                <div className="flex items-center gap-3 mr-auto">
                  <span className={`text-sm font-bold ${financialDirty ? 'text-orange-600' : 'text-emerald-600'}`}>
                    {financialDirty ? '● 未保存の変更があります' : '✓ 保存済み'}
                  </span>
                  <button
                    type="button"
                    onClick={saveFinancialEdits}
                    disabled={!financialDirty || isFinancialSaving}
                    className={`px-6 py-3 rounded-xl font-extrabold text-base transition shadow-sm ${
                      !financialDirty || isFinancialSaving
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                  >
                    {isFinancialSaving ? '保存中…' : '💾 保存'}
                  </button>
                </div>
              )}
              <button onClick={() => setShowAllMonthlyDisposalModal(false)} className="bg-slate-800 hover:bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold text-base transition">閉じる</button>
            </div>
          </div>
        </div>
      )}

      {/* 月別処分一覧：差額理由メモモーダル */}
      {disposalMemoModal && authRole === 'admin' && (
        <div
          className="fixed inset-0 bg-slate-900/45 backdrop-blur-sm flex items-center justify-center p-4 z-[70] animate-fadeIn"
          onClick={() => setDisposalMemoModal(null)}
        >
          <div
            className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between gap-4">
              <div>
                <div className="text-xl font-extrabold text-slate-900">❕ 金額が違う理由</div>
                <div className="text-sm text-slate-500 mt-1">
                  {disposalMemoModal.date}　{disposalMemoModal.item}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDisposalMemoModal(null)}
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 text-sm">
                <div className="font-bold text-slate-700">{disposalMemoModal.locationName}</div>
                <div className="text-slate-500 mt-1">処分場：{disposalMemoModal.disposalSite}</div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div className="rounded-xl bg-white border border-slate-200 p-3">
                    <div className="text-xs font-bold text-slate-500">日報由来</div>
                    <div className="text-lg font-extrabold text-slate-900 mt-1">
                      {formatAmount(disposalMemoModal.reportTotal)}
                    </div>
                  </div>
                  <div className="rounded-xl bg-blue-50 border border-blue-200 p-3">
                    <div className="text-xs font-bold text-blue-700">確定額</div>
                    <div className="text-lg font-extrabold text-blue-900 mt-1">
                      {formatAmount(disposalMemoModal.confirmedTotal)}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-extrabold text-slate-700 block mb-2">
                  理由・確認内容
                </label>
                <textarea
                  autoFocus
                  value={disposalRowMemos[disposalMemoModal.rowKey] ?? ''}
                  onChange={(e) => handleDisposalRowMemoChange(disposalMemoModal.rowKey, e.target.value)}
                  placeholder="例：請求書では端数切捨て／先方確認済み／数量差のため修正"
                  rows={5}
                  className="w-full p-3.5 border-2 border-amber-300 focus:border-amber-500 outline-none rounded-2xl bg-amber-50/30 text-base text-slate-800 resize-y"
                />
                <p className="text-xs text-slate-500 mt-2">
                  ※ここに入力しても日報データは変更されません。請求書照合用のメモです。
                </p>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDisposalMemoModal(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 text-white font-extrabold"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 日報編集モーダル */}
      {editingReport && authRole === 'admin' && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-md flex items-center justify-center p-3 md:p-6 z-50 animate-fadeIn" onClick={() => setEditingReport(null)}>
          <form onSubmit={handleUpdateReport} className="bg-white rounded-[32px] w-full max-w-4xl p-6 md:p-10 max-h-[92vh] overflow-y-auto space-y-8 shadow-2xl border border-slate-100" onClick={(e) => e.stopPropagation()}>
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                    <label className="text-xs font-bold text-slate-600 block mb-1.5">請負先</label>
                    <input 
                      type="text" 
                      placeholder="例: 〇〇建設" 
                      value={editingReport.client || ''} 
                      onChange={e => setEditingReport({...editingReport, client: e.target.value})} 
                      className="w-full p-3.5 border border-slate-300 rounded-2xl text-sm bg-white font-bold text-slate-800 shadow-2xs" 
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1.5">開始日</label>
                    <input 
                      type="date" 
                      value={editingReport.startDate || ''} 
                      onChange={e => setEditingReport({...editingReport, startDate: e.target.value})} 
                      className="w-full p-3.5 border border-slate-300 rounded-2xl text-sm bg-white font-bold text-slate-800 shadow-2xs" 
                    />
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
                    const workers = Array.isArray(editingReport.workers) ? editingReport.workers : [];
                    const checked = workers.includes(w.name);
                    return (
                      <label key={w.name} className={`flex items-center gap-2.5 p-3 rounded-2xl border cursor-pointer text-xs md:text-sm font-medium transition shadow-2xs ${checked ? 'bg-orange-50 border-orange-300 text-orange-900 font-bold' : 'bg-white border-slate-200'}`}>
                        <input 
                          type="checkbox" 
                          checked={checked} 
                          onChange={e => {
                            const current = Array.isArray(editingReport.workers) ? editingReport.workers : [];
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
                  <button type="button" onClick={() => {
                    const subs = Array.isArray(editingReport.subcontractors) ? editingReport.subcontractors : [];
                    setEditingReport({...editingReport, subcontractors: [...subs, {company: '', task: '', count: ''}]});
                  }} className="bg-emerald-600 text-white text-xs px-3 py-1.5 rounded-xl font-bold shadow hover:bg-emerald-700 transition">＋ 追加</button>
                </div>
                {(Array.isArray(editingReport.subcontractors) ? editingReport.subcontractors : []).map((sub: any, sIdx: number) => {
                  const uniqueCompanies = Array.from(new Set((settings.subcontractors || []).map((s:any) => s.company).filter(Boolean)));
                  const availableTasks = (settings.subcontractors || []).filter((s:any) => s.company === sub.company).map((s:any) => s.task);
                  return (
                    <div key={sIdx} className="p-4 border-2 rounded-2xl bg-white space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-bold text-slate-700 block mb-1">外注会社名</label>
                          <select className="w-full p-2.5 rounded-xl border font-bold text-sm bg-white" value={sub.company} onChange={e => {
                            const updated = [...(Array.isArray(editingReport.subcontractors) ? editingReport.subcontractors : [])];
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
                            const updated = [...(Array.isArray(editingReport.subcontractors) ? editingReport.subcontractors : [])];
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
                            const updated = [...(Array.isArray(editingReport.subcontractors) ? editingReport.subcontractors : [])];
                            updated[sIdx] = { ...updated[sIdx], count: e.target.value };
                            setEditingReport({ ...editingReport, subcontractors: updated });
                          }}/>
                        </div>
                        <button type="button" onClick={() => {
                          const updated = (Array.isArray(editingReport.subcontractors) ? editingReport.subcontractors : []).filter((_:any, i:number)=>i!==sIdx);
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
                  <button type="button" onClick={() => {
                    const disposals = Array.isArray(editingReport.disposals) ? editingReport.disposals : [];
                    setEditingReport({...editingReport, disposals: [...disposals, {location: '', item: '', quantity: '', unit: 't'}]});
                  }} className="bg-emerald-600 text-white text-xs px-3 py-1.5 rounded-xl font-bold shadow hover:bg-emerald-700 transition">＋ 処分項目を追加</button>
                </div>
                {(Array.isArray(editingReport.disposals) ? editingReport.disposals : []).map((disp: any, dIdx: number) => {
                  const uniqueDispLocations = Array.from(new Set((settings.disposalLocations || []).map((d:any) => d.location).filter(Boolean)));
                  const availableDispItems = (settings.disposalLocations || []).filter((d:any) => d.location === disp.location);
                  return (
                    <div key={dIdx} className="p-4 border-2 rounded-2xl bg-white space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-bold text-slate-700 block mb-1">処分場名</label>
                          <select className="w-full p-2.5 rounded-xl border font-bold text-sm bg-white" value={disp.location} onChange={e => {
                            const updated = [...(Array.isArray(editingReport.disposals) ? editingReport.disposals : [])];
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
                            const updated = [...(Array.isArray(editingReport.disposals) ? editingReport.disposals : [])];
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
                            const updated = [...(Array.isArray(editingReport.disposals) ? editingReport.disposals : [])];
                            updated[dIdx] = { ...updated[dIdx], quantity: e.target.value };
                            setEditingReport({ ...editingReport, disposals: updated });
                          }}/>
                        </div>
                        <button type="button" onClick={() => {
                          const updated = (Array.isArray(editingReport.disposals) ? editingReport.disposals : []).filter((_:any, i:number)=>i!==dIdx);
                          setEditingReport({ ...editingReport, disposals: updated });
                        }} className="bg-red-100 text-red-700 px-3 py-2.5 rounded-xl font-bold text-xs">削除</button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* スクリップ（scraps）の編集セクション */}
              <div className="bg-slate-50/80 p-5 md:p-6 rounded-3xl border border-slate-200/60 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wider">♻️ スクラップ搬出データ</h3>
                  <button type="button" onClick={() => {
                    const scraps = Array.isArray(editingReport.scraps) ? editingReport.scraps : [];
                    setEditingReport({...editingReport, scraps: [...scraps, {location: '', item: '', quantity: '', unit: 'kg'}]});
                  }} className="bg-emerald-600 text-white text-xs px-3 py-1.5 rounded-xl font-bold shadow hover:bg-emerald-700 transition">＋ スクラップ項目を追加</button>
                </div>
                {(Array.isArray(editingReport.scraps) ? editingReport.scraps : []).map((sc: any, scIdx: number) => {
                  const uniqueScrapLocations = Array.from(new Set((settings.scrapLocations || []).map((s:any) => s.location).filter(Boolean)));
                  const availableScrapItems = (settings.scrapLocations || []).filter((s:any) => s.location === sc.location);
                  return (
                    <div key={scIdx} className="p-4 border-2 rounded-2xl bg-white space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-bold text-slate-700 block mb-1">スクラップ場名</label>
                          <select className="w-full p-2.5 rounded-xl border font-bold text-sm bg-white" value={sc.location} onChange={e => {
                            const updated = [...(Array.isArray(editingReport.scraps) ? editingReport.scraps : [])];
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
                            const updated = [...(Array.isArray(editingReport.scraps) ? editingReport.scraps : [])];
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
                            const updated = [...(Array.isArray(editingReport.scraps) ? editingReport.scraps : [])];
                            updated[scIdx] = { ...updated[scIdx], quantity: e.target.value };
                            setEditingReport({ ...editingReport, scraps: updated });
                          }}/>
                        </div>
                        <button type="button" onClick={() => {
                          const updated = (Array.isArray(editingReport.scraps) ? editingReport.scraps : []).filter((_:any, i:number)=>i!==scIdx);
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
                      const ownMachines = Array.isArray(editingReport.ownMachines) ? editingReport.ownMachines : [];
                      const checked = ownMachines.includes(cm.name);
                      return (
                        <label key={cm.name} className={`flex items-center gap-2.5 p-3 rounded-2xl border cursor-pointer text-xs md:text-sm font-medium transition shadow-2xs ${checked ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold' : 'bg-white border-slate-200'}`}>
                          <input 
                            type="checkbox" 
                            checked={checked} 
                            onChange={e => {
                              const current = Array.isArray(editingReport.ownMachines) ? editingReport.ownMachines : [];
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
                      const vehicles = Array.isArray(editingReport.vehicles) ? editingReport.vehicles : [];
                      const checked = vehicles.includes(v.name);
                      return (
                        <label key={v.name} className={`flex items-center gap-2.5 p-3 rounded-2xl border cursor-pointer text-xs md:text-sm font-medium transition shadow-2xs ${checked ? 'bg-blue-50 border-blue-300 text-blue-900 font-bold' : 'bg-white border-slate-200'}`}>
                          <input 
                            type="checkbox" 
                            checked={checked} 
                            onChange={e => {
                              const current = Array.isArray(editingReport.vehicles) ? editingReport.vehicles : [];
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
                      const qty = getEditingLeaseQuantity('leaseHeavy', m.name);
                      return (
                        <div key={m.name} className={`p-3 rounded-2xl border text-xs md:text-sm transition ${qty > 0 ? 'bg-blue-50 border-blue-300 text-blue-950 font-bold' : 'bg-white border-slate-200'}`}>
                          <div className="truncate text-center mb-2">{m.name}</div>
                          <div className="flex items-center justify-center gap-2">
                            <button type="button" disabled={qty === 0} onClick={() => changeEditingLeaseQuantity('leaseHeavy', m.name, -1)}
                              className={`w-8 h-8 rounded-lg font-black border ${qty === 0 ? 'bg-slate-100 text-slate-300 border-slate-200' : 'bg-white text-slate-700 border-slate-300'}`}>−</button>
                            <span className="min-w-[42px] text-center font-black">{qty}台</span>
                            <button type="button" onClick={() => changeEditingLeaseQuantity('leaseHeavy', m.name, 1)}
                              className="w-8 h-8 rounded-lg bg-blue-600 text-white font-black">＋</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 block">【アタッチメント】</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                    {(settings.leaseAttach || []).map((m: any) => {
                      const qty = getEditingLeaseQuantity('leaseAttach', m.name);
                      return (
                        <div key={m.name} className={`p-3 rounded-2xl border text-xs md:text-sm transition ${qty > 0 ? 'bg-blue-50 border-blue-300 text-blue-950 font-bold' : 'bg-white border-slate-200'}`}>
                          <div className="truncate text-center mb-2">{m.name}</div>
                          <div className="flex items-center justify-center gap-2">
                            <button type="button" disabled={qty === 0} onClick={() => changeEditingLeaseQuantity('leaseAttach', m.name, -1)}
                              className={`w-8 h-8 rounded-lg font-black border ${qty === 0 ? 'bg-slate-100 text-slate-300 border-slate-200' : 'bg-white text-slate-700 border-slate-300'}`}>−</button>
                            <span className="min-w-[42px] text-center font-black">{qty}台</span>
                            <button type="button" onClick={() => changeEditingLeaseQuantity('leaseAttach', m.name, 1)}
                              className="w-8 h-8 rounded-lg bg-blue-600 text-white font-black">＋</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 block">【その他の機械・機器】</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                    {(settings.leaseOther || []).map((m: any) => {
                      const qty = getEditingLeaseQuantity('leaseOther', m.name);
                      return (
                        <div key={m.name} className={`p-3 rounded-2xl border text-xs md:text-sm transition ${qty > 0 ? 'bg-blue-50 border-blue-300 text-blue-950 font-bold' : 'bg-white border-slate-200'}`}>
                          <div className="truncate text-center mb-2">{m.name}</div>
                          <div className="flex items-center justify-center gap-2">
                            <button type="button" disabled={qty === 0} onClick={() => changeEditingLeaseQuantity('leaseOther', m.name, -1)}
                              className={`w-8 h-8 rounded-lg font-black border ${qty === 0 ? 'bg-slate-100 text-slate-300 border-slate-200' : 'bg-white text-slate-700 border-slate-300'}`}>−</button>
                            <span className="min-w-[42px] text-center font-black">{qty}台</span>
                            <button type="button" onClick={() => changeEditingLeaseQuantity('leaseOther', m.name, 1)}
                              className="w-8 h-8 rounded-lg bg-blue-600 text-white font-black">＋</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-3 pt-2 border-t border-blue-200">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-700 block">【📦 リスト以外の機械（自由入力）】</label>
                    <button
                      type="button"
                      onClick={() => {
                        const current = Array.isArray(editingReport.otherLeases) ? editingReport.otherLeases : [];
                        setEditingReport({
                          ...editingReport,
                          otherLeases: [...current, { company: '南大阪建機', name: '', count: '' }]
                        });
                      }}
                      className="bg-blue-600 text-white text-xs px-3 py-1.5 rounded-xl font-bold shadow hover:bg-blue-700 transition"
                    >
                      ＋ 追加
                    </button>
                  </div>

                  {(Array.isArray(editingReport.otherLeases) ? editingReport.otherLeases : []).map((ol: any, idx: number) => (
                    <div key={idx} className="p-3 border-2 border-blue-200 rounded-2xl bg-white">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
                        <div>
                          <label className="text-xs font-bold text-slate-700 block mb-1">会社名</label>
                          <input
                            type="text"
                            value={ol.company || ''}
                            onChange={e => {
                              const updated = [...(Array.isArray(editingReport.otherLeases) ? editingReport.otherLeases : [])];
                              updated[idx] = { ...updated[idx], company: e.target.value };
                              setEditingReport({ ...editingReport, otherLeases: updated });
                            }}
                            className="w-full p-2.5 rounded-xl border font-bold text-sm bg-white"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-700 block mb-1">リース内容（品名）</label>
                          <input
                            type="text"
                            value={ol.name || ''}
                            onChange={e => {
                              const updated = [...(Array.isArray(editingReport.otherLeases) ? editingReport.otherLeases : [])];
                              updated[idx] = { ...updated[idx], name: e.target.value };
                              setEditingReport({ ...editingReport, otherLeases: updated });
                            }}
                            className="w-full p-2.5 rounded-xl border font-bold text-sm bg-white"
                          />
                        </div>
                        <div className="flex gap-2 items-end">
                          <div className="flex-1">
                            <label className="text-xs font-bold text-slate-700 block mb-1">個数</label>
                            <input
                              type="number"
                              value={ol.count || ''}
                              onChange={e => {
                                const updated = [...(Array.isArray(editingReport.otherLeases) ? editingReport.otherLeases : [])];
                                updated[idx] = { ...updated[idx], count: e.target.value };
                                setEditingReport({ ...editingReport, otherLeases: updated });
                              }}
                              className="w-full p-2.5 rounded-xl border font-bold text-sm bg-white text-right"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = (Array.isArray(editingReport.otherLeases) ? editingReport.otherLeases : []).filter((_: any, i: number) => i !== idx);
                              setEditingReport({ ...editingReport, otherLeases: updated });
                            }}
                            className="bg-red-100 text-red-700 px-3 py-2.5 rounded-xl font-bold text-xs"
                          >
                            削除
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-indigo-50/60 p-5 md:p-6 rounded-3xl border border-indigo-200 space-y-4">
                <h3 className="text-sm font-bold text-indigo-800 uppercase tracking-wider">🗾 石川県出張用リース機器</h3>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 block">【（石川県）重機】</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                    {(settings.ishikawaHeavy || []).map((m: any) => {
                      const qty = getEditingLeaseQuantity('ishikawaHeavy', m.name);
                      return (
                        <div key={m.name} className={`p-3 rounded-2xl border text-xs md:text-sm transition ${qty > 0 ? 'bg-indigo-50 border-indigo-300 text-indigo-950 font-bold' : 'bg-white border-slate-200'}`}>
                          <div className="truncate text-center mb-2">{m.name}</div>
                          <div className="flex items-center justify-center gap-2">
                            <button type="button" disabled={qty === 0} onClick={() => changeEditingLeaseQuantity('ishikawaHeavy', m.name, -1)}
                              className={`w-8 h-8 rounded-lg font-black border ${qty === 0 ? 'bg-slate-100 text-slate-300 border-slate-200' : 'bg-white text-slate-700 border-slate-300'}`}>−</button>
                            <span className="min-w-[42px] text-center font-black">{qty}台</span>
                            <button type="button" onClick={() => changeEditingLeaseQuantity('ishikawaHeavy', m.name, 1)}
                              className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-black">＋</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 block">【（石川県）アタッチメント】</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                    {(settings.ishikawaAttach || []).map((m: any) => {
                      const qty = getEditingLeaseQuantity('ishikawaAttach', m.name);
                      return (
                        <div key={m.name} className={`p-3 rounded-2xl border text-xs md:text-sm transition ${qty > 0 ? 'bg-indigo-50 border-indigo-300 text-indigo-950 font-bold' : 'bg-white border-slate-200'}`}>
                          <div className="truncate text-center mb-2">{m.name}</div>
                          <div className="flex items-center justify-center gap-2">
                            <button type="button" disabled={qty === 0} onClick={() => changeEditingLeaseQuantity('ishikawaAttach', m.name, -1)}
                              className={`w-8 h-8 rounded-lg font-black border ${qty === 0 ? 'bg-slate-100 text-slate-300 border-slate-200' : 'bg-white text-slate-700 border-slate-300'}`}>−</button>
                            <span className="min-w-[42px] text-center font-black">{qty}台</span>
                            <button type="button" onClick={() => changeEditingLeaseQuantity('ishikawaAttach', m.name, 1)}
                              className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-black">＋</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 block">【（石川県）その他機械・機器】</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                    {(settings.ishikawaOther || []).map((m: any) => {
                      const qty = getEditingLeaseQuantity('ishikawaOther', m.name);
                      return (
                        <div key={m.name} className={`p-3 rounded-2xl border text-xs md:text-sm transition ${qty > 0 ? 'bg-indigo-50 border-indigo-300 text-indigo-950 font-bold' : 'bg-white border-slate-200'}`}>
                          <div className="truncate text-center mb-2">{m.name}</div>
                          <div className="flex items-center justify-center gap-2">
                            <button type="button" disabled={qty === 0} onClick={() => changeEditingLeaseQuantity('ishikawaOther', m.name, -1)}
                              className={`w-8 h-8 rounded-lg font-black border ${qty === 0 ? 'bg-slate-100 text-slate-300 border-slate-200' : 'bg-white text-slate-700 border-slate-300'}`}>−</button>
                            <span className="min-w-[42px] text-center font-black">{qty}台</span>
                            <button type="button" onClick={() => changeEditingLeaseQuantity('ishikawaOther', m.name, 1)}
                              className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-black">＋</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {(
                editingReport.location?.includes('旧河北郡市クリーンセンター') ||
                editingReport.manager === '徳本' ||
                (Array.isArray(editingReport.ishikawaCustomMachines) && editingReport.ishikawaCustomMachines.length > 0)
              ) && (
                <div className="bg-indigo-50/60 p-5 md:p-6 rounded-3xl border border-indigo-200 space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-bold text-indigo-800 uppercase tracking-wider">📦 石川県 リスト以外の機械（自由入力）</h3>
                    <button
                      type="button"
                      onClick={() => {
                        const current = Array.isArray(editingReport.ishikawaCustomMachines) ? editingReport.ishikawaCustomMachines : [];
                        setEditingReport({
                          ...editingReport,
                          ishikawaCustomMachines: [...current, { name: '', count: '' }]
                        });
                      }}
                      className="bg-indigo-600 text-white text-xs px-3 py-1.5 rounded-xl font-bold shadow hover:bg-indigo-700 transition"
                    >
                      ＋ 追加
                    </button>
                  </div>

                  {(Array.isArray(editingReport.ishikawaCustomMachines) ? editingReport.ishikawaCustomMachines : []).map((ic: any, idx: number) => (
                    <div key={idx} className="p-3 border-2 border-indigo-200 rounded-2xl bg-white">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
                        <div className="md:col-span-2">
                          <label className="text-xs font-bold text-slate-700 block mb-1">リース内容（品名）</label>
                          <input
                            type="text"
                            value={ic.name || ''}
                            onChange={e => {
                              const updated = [...(Array.isArray(editingReport.ishikawaCustomMachines) ? editingReport.ishikawaCustomMachines : [])];
                              updated[idx] = { ...updated[idx], name: e.target.value };
                              setEditingReport({ ...editingReport, ishikawaCustomMachines: updated });
                            }}
                            className="w-full p-2.5 rounded-xl border font-bold text-sm bg-white"
                          />
                        </div>
                        <div className="flex gap-2 items-end">
                          <div className="flex-1">
                            <label className="text-xs font-bold text-slate-700 block mb-1">個数</label>
                            <input
                              type="number"
                              value={ic.count || ''}
                              onChange={e => {
                                const updated = [...(Array.isArray(editingReport.ishikawaCustomMachines) ? editingReport.ishikawaCustomMachines : [])];
                                updated[idx] = { ...updated[idx], count: e.target.value };
                                setEditingReport({ ...editingReport, ishikawaCustomMachines: updated });
                              }}
                              className="w-full p-2.5 rounded-xl border font-bold text-sm bg-white text-right"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = (Array.isArray(editingReport.ishikawaCustomMachines) ? editingReport.ishikawaCustomMachines : []).filter((_: any, i: number) => i !== idx);
                              setEditingReport({ ...editingReport, ishikawaCustomMachines: updated });
                            }}
                            className="bg-red-100 text-red-700 px-3 py-2.5 rounded-xl font-bold text-xs"
                          >
                            削除
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 燃料・経費セクション */}
              <div className="bg-slate-50/80 p-5 md:p-6 rounded-3xl border border-slate-200/60 space-y-4">
                <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wider">⛽ 燃料・経費</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {editingReport.location?.includes('旧河北郡市クリーンセンター') ? (
                    <>
                      <div>
                        <label className="text-xs font-bold text-slate-600 block mb-1.5">⛽ 軽油（大阪） (L)</label>
                        <input type="number" value={editingReport.fuel ?? ''} onChange={e=>setEditingReport({...editingReport, fuel: e.target.value})} className="w-full p-3.5 border border-slate-300 rounded-2xl text-sm bg-white font-bold text-right shadow-2xs" />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-600 block mb-1.5">⛽ レギュラー購入分（大阪） (円)</label>
                        <input type="number" value={editingReport.regularPrice ?? ''} onChange={e=>setEditingReport({...editingReport, regularPrice: e.target.value})} className="w-full p-3.5 border border-slate-300 rounded-2xl text-sm bg-white font-bold text-right shadow-2xs" />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-600 block mb-1.5">⛽ 宇野気石油 軽油 (L)</label>
                        <input type="number" value={editingReport.unokeFuel ?? ''} onChange={e=>setEditingReport({...editingReport, unokeFuel: e.target.value})} className="w-full p-3.5 border border-indigo-300 rounded-2xl text-sm bg-indigo-50/40 font-bold text-right shadow-2xs" />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-600 block mb-1.5">⛽ 宇野気石油 レギュラー (L)</label>
                        <input type="number" value={editingReport.unokeRegular ?? ''} onChange={e=>setEditingReport({...editingReport, unokeRegular: e.target.value})} className="w-full p-3.5 border border-indigo-300 rounded-2xl text-sm bg-indigo-50/40 font-bold text-right shadow-2xs" />
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="text-xs font-bold text-slate-600 block mb-1.5">軽油 (L)</label>
                        <input type="number" value={editingReport.fuel ?? ''} onChange={e=>setEditingReport({...editingReport, fuel: e.target.value})} className="w-full p-3.5 border border-slate-300 rounded-2xl text-sm bg-white font-bold text-right shadow-2xs" />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-600 block mb-1.5">レギュラー購入分 (円)</label>
                        <input type="number" value={editingReport.regularPrice ?? ''} onChange={e=>setEditingReport({...editingReport, regularPrice: e.target.value})} className="w-full p-3.5 border border-slate-300 rounded-2xl text-sm bg-white font-bold text-right shadow-2xs" />
                      </div>
                    </>
                  )}

                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1.5">高速代・ETC (円)</label>
                    <input type="number" value={editingReport.etcPrice ?? ''} onChange={e=>setEditingReport({...editingReport, etcPrice: e.target.value})} className="w-full p-3.5 border border-slate-300 rounded-2xl text-sm bg-white font-bold text-right shadow-2xs" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1.5">駐車場代 (円)</label>
                    <input type="number" value={editingReport.parkingPrice ?? ''} onChange={e=>setEditingReport({...editingReport, parkingPrice: e.target.value})} className="w-full p-3.5 border border-slate-300 rounded-2xl text-sm bg-white font-bold text-right shadow-2xs" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1.5">その他雑費 品名・内容</label>
                    <input type="text" value={editingReport.otherItem ?? ''} onChange={e=>setEditingReport({...editingReport, otherItem: e.target.value})} className="w-full p-3.5 border border-slate-300 rounded-2xl text-sm bg-white font-bold shadow-2xs" placeholder="例: コーナン" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1.5">その他雑費 金額 (円)</label>
                    <input type="number" value={editingReport.otherPrice ?? ''} onChange={e=>setEditingReport({...editingReport, otherPrice: e.target.value})} className="w-full p-3.5 border border-slate-300 rounded-2xl text-sm bg-white font-bold text-right shadow-2xs" />
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
        <div
          className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-40 animate-fadeIn overflow-y-auto ${authRole === 'viewer' ? 'p-1.5 md:p-8' : 'p-2 md:p-8'}`}
          onClick={() => setModalLocation(null)}
        >
          <div
            className={`bg-white rounded-3xl w-full max-h-[94vh] md:max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-100 ${
              authRole === 'viewer'
                ? 'max-w-6xl p-4 md:p-10 space-y-5 md:space-y-8'
                : 'max-w-[1400px] p-6 md:p-9 space-y-7 md:space-y-9'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200 pb-4 md:pb-6 gap-3">
              <div className="flex flex-col items-start gap-3 w-full">
                <button onClick={() => setModalLocation(null)} className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-5 md:px-6 py-2.5 md:py-3 rounded-xl text-sm md:text-base font-bold transition">閉じる</button>
                <div className="w-full">
                  <h2 className={`${authRole === 'admin' ? 'text-3xl md:text-4xl' : 'text-2xl md:text-4xl'} font-extrabold text-slate-900 leading-tight`}>
                    {modalLocation}
                    <span className="text-base md:text-xl font-normal text-slate-500 block md:inline md:ml-2">（詳細分析）</span>
                  </h2>
                  
                  <div className={`grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mt-4 bg-slate-50 rounded-2xl border border-slate-200 ${authRole === 'viewer' ? 'p-3.5' : 'p-4'}`}>
                    {authRole === 'viewer' ? (
                      <>
                        <div className="bg-white rounded-xl border border-slate-200 p-3.5">
                          <div className="text-xs font-bold text-slate-500">🏢 請負先</div>
                          <div className="text-base font-extrabold text-slate-900 mt-1.5 break-words">
                            {modalData.clientStr || '未登録'}
                          </div>
                        </div>
                        <div className="bg-white rounded-xl border border-slate-200 p-3.5">
                          <div className="text-xs font-bold text-slate-500">⏱ 開始日</div>
                          <div className="text-base font-extrabold text-slate-900 mt-1.5">
                            {modalData.startDateStr || '未登録'}
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <label className="text-sm md:text-base font-bold text-slate-800 block mb-1.5">🏢 請負先</label>
                          <input 
                            type="text" 
                            value={modalData.clientStr} 
                            onChange={async (e) => {
                              const val = e.target.value;
                              const targetNames = getTargetLocationNames(modalLocation);
                              const updatedReports = reports.map(r => {
                                if (targetNames.includes(r.location)) {
                                  return { ...r, client: val };
                                }
                                return r;
                              });
                              setReports(updatedReports);
                              for (const r of updatedReports) {
                                if (targetNames.includes(r.location)) {
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
                            }}
                            placeholder="例: 〇〇建設" 
                            className="w-full p-3.5 border border-slate-300 rounded-xl text-base md:text-lg font-bold bg-white text-slate-800"
                          />
                        </div>
                        <div>
                          <label className="text-sm md:text-base font-bold text-slate-800 block mb-1.5">⏱ 開始日</label>
                          <input 
                            type="date" 
                            value={modalData.startDateStr} 
                            onChange={async (e) => {
                              const val = e.target.value;
                              const targetNames = getTargetLocationNames(modalLocation);
                              const updatedReports = reports.map(r => {
                                if (targetNames.includes(r.location)) {
                                  return { ...r, startDate: val };
                                }
                                return r;
                              });
                              setReports(updatedReports);
                              for (const r of updatedReports) {
                                if (targetNames.includes(r.location)) {
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
                            }}
                            className="w-full p-3.5 border border-slate-300 rounded-xl text-base md:text-lg font-bold bg-white text-slate-800"
                          />
                        </div>
                      </>
                    )}
                  </div>

                                    {authRole === 'admin' && (
                    <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50/60 p-4 md:p-5">
                      <div className="text-lg md:text-xl font-extrabold text-blue-900 mb-3">📘 この画面の見方</div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-base leading-relaxed">
                        <div className="bg-white rounded-xl border border-slate-200 p-3.5">
                          <div className="font-extrabold text-slate-800">① 日報由来の概算</div>
                          <div className="text-slate-600 mt-1">日々の日報から自動計算された金額です。</div>
                        </div>
                        <div className="bg-white rounded-xl border border-blue-200 p-3.5">
                          <div className="font-extrabold text-blue-800">② 確定金額</div>
                          <div className="text-slate-600 mt-1">請求書が届いたら、実際の金額に修正します。変更後は画面下の「💾 保存」を押します。</div>
                        </div>
                        <div className="bg-white rounded-xl border border-emerald-200 p-3.5">
                          <div className="font-extrabold text-emerald-800">③ 原価への反映額</div>
                          <div className="text-slate-600 mt-1">利益・粗利の計算に実際に使われている金額です。</div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3 mt-4 flex-wrap">
                    <p className={`${authRole === 'admin' ? 'text-lg font-bold text-slate-700' : 'text-sm md:text-base text-slate-500'}`}>原価・収支および内訳明細</p>
                    {authRole === 'admin' && (
                      <button onClick={() => downloadLocationCSV(modalLocation)} className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs px-3 py-1.5 rounded-lg font-bold transition shadow-2xs flex items-center gap-1">
                        📥 CSV出力
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {authRole === 'admin' && (
              <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
                <span className="bg-slate-900 text-white text-sm font-extrabold px-3 py-1.5 rounded-lg">STEP 1</span>
                <div>
                  <div className="text-xl md:text-2xl font-extrabold text-slate-900">まず、現場全体の収支を確認</div>
                  <div className="text-base text-slate-500 mt-0.5">請負金額・経費・利益の全体像です。</div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
              <div className="bg-slate-50 p-5 md:p-6 rounded-2xl border border-slate-200 flex flex-col justify-between space-y-3 shadow-2xs">
                <div>
                  <div className="text-base md:text-lg font-extrabold text-slate-700">
                    📉 スクラップ売却額を差引しない場合（純粋な粗利）
                  </div>
                  <div className="text-sm md:text-base text-slate-500 mt-1.5">
                    （請負金額 {formatAmount(modalData.contractPrice)} 税抜 - 合計経費 {formatAmount(modalData.total)}）
                  </div>
                </div>
                <div className={`text-2xl md:text-4xl font-bold ${modalData.profitWithoutScrap >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                  {formatAmount(modalData.profitWithoutScrap)}
                </div>
              </div>

              <div className="bg-emerald-50/80 p-5 md:p-6 rounded-2xl border border-emerald-200 flex flex-col justify-between space-y-3 shadow-2xs">
                <div>
                  <div className="text-base md:text-lg font-extrabold text-emerald-800">
                    📈 スクラップ売却額を差引した後（売却益込・最終粗利）
                  </div>
                  <div className="text-sm md:text-base text-emerald-700 mt-1.5">
                    （純粋な粗利 ＋ スクラップ売却計 +{formatAmount(modalData.scrapTotal)}）
                  </div>
                </div>
                <div className={`text-2xl md:text-4xl font-bold ${modalData.profit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                  {formatAmount(modalData.profit)}
                </div>
              </div>
            </div>

            {authRole === 'admin' && (
              <div className="text-lg md:text-xl font-extrabold text-slate-800 mt-1">📊 現在の集計結果</div>
            )}
            <div className={`grid md:grid-cols-4 gap-3 md:gap-5 text-center ${authRole === 'viewer' ? 'grid-cols-2 items-stretch' : 'grid-cols-2'}`}>
              <div className={`bg-slate-50 p-4 md:p-6 rounded-2xl border border-slate-200 ${authRole === 'viewer' ? 'min-h-[132px] flex flex-col justify-center' : ''}`}><div className="text-sm md:text-lg text-slate-700 font-extrabold">請負金額 (税抜)</div><div className="text-xl md:text-3xl font-bold text-slate-900 mt-1.5">{formatAmount(modalData.contractPrice)}</div></div>
              <div className={`bg-emerald-50/60 p-4 md:p-6 rounded-2xl border border-slate-200 ${authRole === 'viewer' ? 'min-h-[132px] flex flex-col justify-center' : ''}`}>
                <div className="text-sm md:text-lg text-emerald-800 font-extrabold">合計経費</div>
                <div className="mt-2 space-y-2 text-left">
                  <div>
                    <div className="text-sm font-bold text-slate-600">概算合計（日報＋手動追加分）</div>
                    <div className="text-lg md:text-2xl font-bold text-slate-700">{formatAmount(modalData.reportEstimatedTotal)}</div>
                    {Number(modalData.customSubsTotal || 0) > 0 && (
                      <div className="mt-2 rounded-lg bg-orange-50 border border-orange-200 px-2.5 py-2 text-xs md:text-sm text-orange-800 font-bold leading-relaxed">
                        ＋ 手動追加・一括外注分 {formatAmount(modalData.customSubsTotal)}
                        <span className="block font-medium text-orange-700 mt-0.5">
                          ※管理画面で追加した外注費も、この概算合計に含めています。
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="border-t border-emerald-200 pt-2">
                    <div className="text-sm font-bold text-emerald-700">確定後の合計経費</div>
                    <div className="text-xl md:text-3xl font-bold text-emerald-800">{formatAmount(modalData.total)}</div>
                  </div>
                </div>
              </div>
              <div className={`bg-blue-50/60 p-4 md:p-6 rounded-2xl border border-slate-200 ${authRole === 'viewer' ? 'min-h-[132px] flex flex-col justify-center' : ''}`}><div className="text-sm md:text-lg text-blue-800 font-extrabold">利益（売却益込）</div><div className="text-xl md:text-3xl font-bold text-blue-800 mt-1.5">{formatAmount(modalData.profit)}</div></div>
              <div className={`bg-amber-50/60 p-4 md:p-6 rounded-2xl border border-slate-200 ${authRole === 'viewer' ? 'min-h-[132px] flex flex-col justify-center' : ''}`}><div className="text-sm md:text-lg text-amber-800 font-extrabold">稼働日数</div><div className="text-xl md:text-3xl font-bold text-amber-800 mt-1.5">{modalData.days}日</div></div>
            </div>

            <div className="bg-orange-50 p-4 md:p-6 rounded-2xl border border-orange-200 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 shadow-2xs">
              <div><div className="flex items-center gap-2 font-extrabold text-orange-900 text-lg md:text-xl"><span>🗑️ 処分費</span></div><div className="text-sm md:text-base text-slate-600 mt-1.5 font-medium">日報由来 {formatAmount(modalData.reportEstimateDisposal)} ／ 確定額 {formatAmount(modalData.disposalCost)}</div></div>
              <button onClick={() => setShowDisposalModal(true)} className="bg-orange-600 hover:bg-orange-700 text-white text-xs md:text-base px-4 py-2.5 rounded-xl font-bold shadow-xs transition">🔍 処分費の内訳を確認</button>
            </div>

            <div className="bg-emerald-50 p-4 md:p-6 rounded-2xl border border-emerald-200 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 shadow-2xs">
              <div className="flex items-center gap-2 font-extrabold text-emerald-900 text-lg md:text-xl">
                <span>♻️ スクラップ売却計</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xl md:text-2xl font-bold text-emerald-800">+ {formatAmount(modalData.scrapTotal)}</span>
                <button onClick={() => setShowScrapModal(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs md:text-base px-4 py-2.5 rounded-xl font-bold shadow-xs transition">
                  🔍 内訳・金額入力
                </button>
              </div>
            </div>

            {modalLocation === '旧河北郡市クリーンセンター等解体工事(石川県)' && (
              <div className="bg-slate-50 p-4 md:p-8 rounded-2xl md:rounded-3xl border border-slate-200 space-y-4 md:space-y-6">
                <div className="flex justify-between items-center flex-wrap gap-3">
                  <h3 className="font-bold text-lg md:text-xl text-slate-900">⛽ 燃料内訳（大阪・石川県）</h3>
                </div>

                <div className="bg-orange-50/80 p-4 md:p-5 rounded-2xl border border-orange-200 space-y-3">
                  <div className="font-bold text-orange-900 text-base md:text-lg">⛽ 月別 1Lあたりの軽油単価設定</div>
                  <p className="text-xs md:text-sm text-orange-700 font-medium">月をまたぐ現場の場合、月ごとの1L単価を入力すると下の「燃料代（大阪）」に自動反映されます。</p>
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

                <div className="grid grid-cols-1 gap-3 md:gap-5">
                  <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-300 shadow-2xs flex flex-col justify-between gap-3">
                    <div className="text-base md:text-lg font-bold text-slate-700">⛽ 燃料代（大阪）</div>
                    <div className="text-sm font-bold text-slate-700">
                      日報入力計: <span className="text-blue-600 font-extrabold text-lg">{Number(modalData.totalFuelLitering || 0).toLocaleString('ja-JP')} L</span>
                    </div>
                    <div className="space-y-2">
                      <div className="text-xs font-bold text-slate-500">月別合計</div>
                      {Object.entries(modalData.monthlyFuelBreakdown || {})
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([ym, item]: [string, any]) => (
                          <div key={ym} className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs md:text-sm">
                            <div className="font-bold text-slate-700">{ym}</div>
                            <div className="text-slate-600 mt-1">
                              {Number(item.liters || 0).toLocaleString('ja-JP')} L × ¥{Number(item.unitPrice || 0).toLocaleString('ja-JP')}
                            </div>
                            <div className="font-extrabold text-slate-900 mt-1">
                              {formatAmount(item.total || 0)}
                            </div>
                          </div>
                        ))}
                    </div>
                    <div className="border-t border-slate-200 pt-3">
                      <div className="text-xs font-bold text-slate-500 mb-1">大阪軽油 合計金額</div>
                      <div className="text-xl md:text-2xl font-bold text-slate-900">
                        {formatAmount(modalData.osakaFuelCost)}
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-300 shadow-2xs flex flex-col justify-between gap-3">
                    <div className="text-base md:text-lg font-bold text-slate-700">⛽ レギュラー購入分（大阪）</div>
                    <div className="text-sm font-bold text-slate-700">
                      日報入力計: <span className="text-blue-600 font-extrabold text-lg">{formatAmount(modalData.totalRegularLitering)}</span><span className="ml-1">円</span>
                    </div>
                  </div>

                  <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-300 shadow-2xs flex flex-col justify-between gap-4">
                    <div className="text-base md:text-lg font-bold text-slate-700">⛽ 宇野気石油（石川県）</div>

                    <div className="rounded-xl bg-blue-50 border border-blue-200 p-3">
                      <div className="text-sm font-bold text-slate-700">日報入力計（軽油＋レギュラー）</div>
                      <div className="text-blue-700 font-extrabold text-xl md:text-2xl mt-1">
                        {(Number(modalData.totalUnokeFuelLitering || 0) + Number(modalData.totalUnokeRegularLitering || 0)).toLocaleString('ja-JP')} L
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-bold text-slate-600 block mb-1">宇野気石油 合計金額</label>
                      <div className="flex items-center gap-1">
                        <span className="text-slate-500 font-bold">¥</span>
                        <input
                          type="number"
                          value={
                            costOverrides[modalLocation]?.unokeTotal ??
                            (
                              (costOverrides[modalLocation]?.fuel !== '' && costOverrides[modalLocation]?.fuel !== undefined
                                ? Number(costOverrides[modalLocation]?.fuel)
                                : 0) +
                              (costOverrides[modalLocation]?.regular !== '' && costOverrides[modalLocation]?.regular !== undefined
                                ? Number(costOverrides[modalLocation]?.regular)
                                : 0)
                            )
                          }
                          onChange={(e) => handleCostOverrideChange(modalLocation, 'unokeTotal', e.target.value)}
                          placeholder="合計金額を入力"
                          readOnly={authRole === 'viewer'}
                          className={`w-full p-2.5 border border-orange-400 rounded-xl font-bold text-right bg-orange-50/50 text-base ${authRole === 'viewer' ? 'bg-slate-100 cursor-not-allowed' : ''}`}
                        />
                      </div>
                    </div>

                    <p className="text-xs md:text-sm text-slate-500">
                      ※リットル数・金額ともに、軽油とレギュラーを分けず宇野気石油の合計のみ表示します。
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-orange-50/50 p-5 rounded-2xl border border-orange-200 space-y-4">
              <div 
                className="flex justify-between items-center cursor-pointer select-none"
                onClick={() => setSubcontractorSectionOpen(!subcontractorSectionOpen)}
              >
                <div className="flex items-center gap-2 font-bold text-lg text-orange-900">
                  <span>👥 外注費 詳細・計算内訳</span>
                  <span className="text-xs text-orange-700 bg-orange-100 px-2 py-0.5 rounded">
                    {subcontractorSectionOpen ? '▲ 閉じる' : '▼ 開く'}
                  </span>
                </div>
                <span className="text-sm font-bold text-orange-800 bg-orange-100 px-3 py-1 rounded-xl">外注費合計: {formatAmount(modalData.subCostTotal)}</span>
              </div>

              {subcontractorSectionOpen && (
                <div className="space-y-4 pt-3 border-t border-orange-200 animate-fadeIn">
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
                          <span>🏢 <b>{cs.company}</b> ({cs.task}) : <span className="text-orange-700 font-bold">{formatAmount(Number(cs.price))}</span></span>
                          {authRole === 'admin' && (
                            <button type="button" onClick={() => handleDeleteCustomSubcontractor(modalLocation, csIdx)} className="bg-rose-50 hover:bg-rose-100 text-rose-600 px-3 py-1 rounded-lg text-xs font-bold transition">削除</button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="text-xs font-bold text-slate-600">【日報由来の外注費】</div>
                    {reports.filter(r => {
                      const targetNames = getTargetLocationNames(modalLocation);
                      const subcontractors = Array.isArray(r.subcontractors) ? r.subcontractors : [];
                      return targetNames.includes(r.location) && subcontractors.length > 0;
                    }).length === 0 ? (
                      <p className="text-sm text-slate-500 text-center py-2">日報データに基づく外注費はありません</p>
                    ) : (
                      reports.filter(r => {
                        const targetNames = getTargetLocationNames(modalLocation);
                        const subcontractors = Array.isArray(r.subcontractors) ? r.subcontractors : [];
                        return targetNames.includes(r.location) && subcontractors.length > 0;
                      }).map((r, idx) => {
                        const subcontractors = Array.isArray(r.subcontractors) ? r.subcontractors : [];
                        return (
                          <div key={idx} className="bg-white p-3.5 rounded-xl border border-orange-200 space-y-2">
                            <div className="text-xs font-bold text-slate-600">🗓️ 日付: {r.date}</div>
                            {subcontractors.map((sub: any, sIdx: number) => {
                              const subMaster = (settings.subcontractors || []).find((x:any) => x.company === sub.company && x.task === sub.task);
                              const unitP = sub.price !== undefined && sub.price !== null && sub.price !== '' ? Number(sub.price) : (subMaster?.price || 0);
                              const subTotalCalc = Number(sub.count || 0) * unitP;
                              return (
                                <div key={sIdx} className="flex justify-between items-center text-sm font-medium text-slate-800 bg-slate-50 p-2.5 rounded-lg">
                                  <span>🏢 <b>{sub.company}</b> ({sub.task}) : 数量 {sub.count}人 × 単価 {formatAmount(unitP)}</span>
                                  <span className="font-bold text-orange-700">{formatAmount(subTotalCalc)}</span>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {authRole === 'admin' && (
              <div className="flex items-center gap-3 border-b border-slate-200 pb-3 pt-2">
                <span className="bg-blue-700 text-white text-sm font-extrabold px-3 py-1.5 rounded-lg">STEP 2</span>
                <div>
                  <div className="text-xl md:text-2xl font-extrabold text-slate-900">請求書が届いたら、各経費を確認・確定</div>
                  <div className="text-base text-slate-500 mt-0.5">日報の概算と実際の請求額を比べて、違う場合だけ修正してください。</div>
                </div>
              </div>
            )}

            {modalLocation !== '旧河北郡市クリーンセンター等解体工事(石川県)' && (
              <div className="bg-slate-50 p-4 md:p-8 rounded-2xl md:rounded-3xl border border-slate-200 space-y-4 md:space-y-6">
                <div className="flex justify-between items-center flex-wrap gap-3">
                  <h3 className="font-extrabold text-xl md:text-2xl text-slate-900">📋 経費の確認・確定</h3>
                </div>

                <div className="bg-orange-50/80 p-4 md:p-5 rounded-2xl border border-orange-200 space-y-3">
                  <div className="font-bold text-orange-900 text-base md:text-lg">⛽ 月別 1Lあたりの軽油単価設定</div>
                  <p className="text-sm md:text-base text-orange-800 font-medium">軽油は月ごとに単価が変わるため、請求書などで確認した1L単価を入力してください。入力すると「燃料代（軽油）」を自動計算します。</p>
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
            )}

            <div className={`grid grid-cols-1 gap-4 md:gap-5 ${authRole === 'admin' ? 'md:grid-cols-2' : 'md:grid-cols-2 lg:grid-cols-3'}`}>
              {[
                { key: 'labor', label: '社員人件費', estimate: modalData.reportEstimateLabor, val: modalData.laborCost },
                { key: 'sub', label: '外注人件費', estimate: modalData.reportEstimateSubWithCustom, val: modalData.subCostTotal, isSubcontractor: true },
                { key: 'lease', label: 'リース合計', estimate: modalData.reportEstimateLease, val: modalData.leaseCost, isLease: true, isIshikawaSpecial: modalLocation === '旧河北郡市クリーンセンター等解体工事(石川県)' },
                { key: 'otherLease', label: 'その他リース', estimate: modalData.reportEstimateOtherLease, val: modalData.otherLeaseCost },
                { key: 'ownMachine', label: '自社重機', estimate: modalData.reportEstimateOwnMachine, val: modalData.ownMachineCost },
                { key: 'vehicle', label: '自社車両', estimate: modalData.reportEstimateVehicle, val: modalData.vehicleCost },
                { key: 'disposal', label: '🗑️ 処分費 (合計)', estimate: modalData.reportEstimateDisposal, val: modalData.disposalCost, isDisposal: true },
                ...(modalLocation !== '旧河北郡市クリーンセンター等解体工事(石川県)' ? [
                  { key: 'fuel', label: '燃料代 (軽油・月別単価)', estimate: modalData.reportEstimateFuel, val: modalData.fuelCost },
                  { key: 'regular', label: 'レギュラー購入分', estimate: modalData.reportEstimateRegular, val: modalData.regularCost }
                ] : []),
                { key: 'etc', label: '高速代・ETC', estimate: modalData.reportEstimateEtc, val: modalData.etcCost },
                { key: 'parking', label: '駐車場代', estimate: modalData.reportEstimateParking, val: modalData.parkingCost },
                { key: 'other', label: 'その他雑費', estimate: modalData.reportEstimateOther, val: modalData.otherCost },
              ].map((item) => {
                return (
                  <div key={item.key} className={`bg-white p-5 md:p-6 rounded-2xl border border-slate-300 shadow-2xs flex flex-col justify-between gap-4 ${item.isDisposal ? 'col-span-full md:col-span-1' : ''}`}>
                    <div className="flex justify-between items-center">
                      <span className={`text-lg md:text-xl font-extrabold ${item.isDisposal ? 'text-orange-700' : 'text-slate-800'}`}>{item.label}</span>
                      <div className="flex items-center gap-2">
                        {item.isLease && (
                          <button
                            type="button"
                            onClick={() => setShowIshikawaLeaseModal(true)}
                            className={`${item.isIshikawaSpecial ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-blue-600 hover:bg-blue-700'} text-white text-xs px-2.5 py-1.5 rounded-lg font-bold shadow-xs transition`}
                          >
                            詳細
                          </button>
                        )}

                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      {item.isCustomFuel ? (
                        <div className="space-y-2">
                          <div className="text-sm font-bold text-slate-700">
                            日報入力計: <span className="text-blue-600 font-extrabold text-lg">{item.litering} L</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-slate-500 font-bold">¥</span>
                            <input
                              type="number"
                              value={costOverrides[modalLocation]?.[item.key] ?? ''}
                              onChange={(e) => handleCostOverrideChange(modalLocation, item.key, e.target.value)}
                              placeholder="金額を入力"
                              readOnly={authRole === 'viewer'}
                              className={`w-full p-2.5 border border-orange-400 rounded-xl font-bold text-right bg-orange-50/50 text-base ${authRole === 'viewer' ? 'bg-slate-100 cursor-not-allowed' : ''}`}
                            />
                          </div>
                        </div>
                      ) : item.isCustomRegular ? (
                        <div className="space-y-2">
                          <div className="text-sm font-bold text-slate-700">
                            日報入力計: <span className="text-blue-600 font-extrabold text-lg">{item.litering} L</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-slate-500 font-bold">¥</span>
                            <input
                              type="number"
                              value={costOverrides[modalLocation]?.[item.key] ?? ''}
                              onChange={(e) => handleCostOverrideChange(modalLocation, item.key, e.target.value)}
                              placeholder="金額を入力"
                              readOnly={authRole === 'viewer'}
                              className={`w-full p-2.5 border border-orange-400 rounded-xl font-bold text-right bg-orange-50/50 text-base ${authRole === 'viewer' ? 'bg-slate-100 cursor-not-allowed' : ''}`}
                            />
                          </div>
                        </div>
                      ) : item.isSubcontractor ? (
                        <div className="space-y-3">
                          <div className="bg-slate-50 rounded-xl border border-slate-200 p-3">
                            <div className="text-sm md:text-base font-bold text-slate-600">概算の内訳</div>
                            <div className="mt-2 space-y-1.5">
                              <div className="flex justify-between gap-3 text-sm md:text-base">
                                <span className="text-slate-600">日報からの外注費</span>
                                <span className="font-extrabold text-slate-900">{formatAmount(modalData.reportEstimateSub || 0)}</span>
                              </div>
                              <div className="flex justify-between gap-3 text-sm md:text-base">
                                <span className="text-orange-700 font-bold">＋ 手動追加・一括外注分</span>
                                <span className="font-extrabold text-orange-700">{formatAmount(modalData.customSubsTotal || 0)}</span>
                              </div>
                              <div className="border-t border-slate-200 pt-2 flex justify-between gap-3 text-base md:text-lg">
                                <span className="font-extrabold text-slate-700">概算合計</span>
                                <span className="font-extrabold text-slate-900">{formatAmount(modalData.reportEstimateSubWithCustom || 0)}</span>
                              </div>
                            </div>
                            <div className="text-xs md:text-sm text-slate-500 mt-2">
                              ※「手動追加・一括外注分」は、上の【手動追加・一括外注分】で管理画面から追加した金額です。
                            </div>
                          </div>

                          <div>
                            <div className="text-sm md:text-base font-extrabold text-blue-800 mb-2">請求書の金額（違う場合だけ入力）</div>
                            {authRole === 'admin' ? (
                              <div className="flex items-center gap-1 w-full">
                                <span className="text-slate-500 font-bold">¥</span>
                                <input
                                  type="number"
                                  value={costOverrides[modalLocation]?.[item.key] ?? ''}
                                  onChange={(e) => handleCostOverrideChange(modalLocation, item.key, e.target.value)}
                                  placeholder={`未入力：概算 ${Number(modalData.reportEstimateSubWithCustom || 0).toLocaleString('ja-JP')}円`}
                                  className="w-full p-3 border-2 border-blue-400 rounded-xl font-extrabold text-right bg-blue-50/40 text-lg"
                                />
                              </div>
                            ) : (
                              <div className="text-lg md:text-xl font-bold text-blue-800">
                                {costOverrides[modalLocation]?.[item.key] !== '' && costOverrides[modalLocation]?.[item.key] !== undefined
                                  ? formatAmount(costOverrides[modalLocation][item.key])
                                  : <span className="text-slate-400 text-sm">未入力（概算を使用）</span>}
                              </div>
                            )}
                          </div>

                          <div className="border-t border-slate-200 pt-3">
                            <div className="text-sm md:text-base font-extrabold text-emerald-700">利益計算に使う金額</div>
                            <div className="text-xl md:text-2xl font-extrabold text-emerald-800 mt-1">{formatAmount(item.val || 0)}</div>
                            {authRole === 'admin' && (
                              <div className="text-sm text-slate-500 mt-1.5">
                                ※請求書金額が未入力なら、日報分＋手動追加分の概算合計を使います。
                              </div>
                            )}
                          </div>
                        </div>
                      ) : item.isDisposal ? (
                        <div className="space-y-3">
                          <div className="bg-slate-50 rounded-xl border border-slate-200 p-3"><div className="text-sm md:text-base font-bold text-slate-600">日報からの概算</div><div className="text-xl md:text-2xl font-bold text-slate-900 mt-1">{formatAmount(item.estimate || 0)}</div></div>
                          <div className="bg-blue-50/50 rounded-xl border border-blue-200 p-3"><div className="text-sm md:text-base font-extrabold text-blue-800">確定額（原価に反映）</div><div className="text-lg md:text-xl font-bold text-blue-900 mt-1">{formatAmount(item.val || 0)}</div></div>
                          <button type="button" onClick={() => setShowDisposalModal(true)} className="w-full bg-orange-600 hover:bg-orange-700 text-white py-2.5 rounded-xl font-bold text-sm">処分場・月・品目ごとに確認／編集</button>
                        </div>
                      ) : item.isIshikawaSpecial ? (
                        <div className="space-y-2">
                          <div className="bg-slate-50 rounded-xl border border-slate-200 p-3">
                            <div className="text-sm md:text-base font-bold text-slate-600">日報からの概算</div>
                            <div className="text-xl md:text-2xl font-bold text-slate-900 mt-1">{formatAmount(item.estimate || 0)}</div>
                          </div>
                          <div className="text-xs font-bold text-indigo-700">
                            確定・反映金額: {formatAmount(item.val || 0)}
                            <span className="ml-1">※詳細から石川県分・MOK分を個別入力</span>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="bg-slate-50 rounded-xl border border-slate-200 p-3">
                            <div className="text-sm md:text-base font-bold text-slate-600">日報からの概算</div>
                            <div className="text-xl md:text-2xl font-bold text-slate-900 mt-1">{formatAmount(item.estimate || 0)}</div>
                          </div>

                          <div>
                            <div className="text-sm md:text-base font-extrabold text-blue-800 mb-2">請求書の金額（違う場合だけ入力）</div>
                            {authRole === 'admin' ? (
                              <div className="flex items-center gap-1 w-full">
                                <span className="text-slate-500 font-bold">¥</span>
                                <input
                                  type="number"
                                  value={costOverrides[modalLocation]?.[item.key] ?? ''}
                                  onChange={(e) => handleCostOverrideChange(modalLocation, item.key, e.target.value)}
                                  placeholder={`未入力：概算 ${Number(item.estimate || 0).toLocaleString('ja-JP')}円`}
                                  className="w-full p-3 border-2 border-blue-400 rounded-xl font-extrabold text-right bg-blue-50/40 text-lg"
                                />
                              </div>
                            ) : (
                              <div className="text-lg md:text-xl font-bold text-blue-800">
                                {costOverrides[modalLocation]?.[item.key] !== '' && costOverrides[modalLocation]?.[item.key] !== undefined
                                  ? formatAmount(costOverrides[modalLocation][item.key])
                                  : <span className="text-slate-400 text-sm">未入力（概算を使用）</span>}
                              </div>
                            )}
                          </div>

                          <div className="border-t border-slate-200 pt-3">
                            <div className="text-sm md:text-base font-extrabold text-emerald-700">利益計算に使う金額</div>
                            <div className="text-xl md:text-2xl font-extrabold text-emerald-800 mt-1">{formatAmount(item.val || 0)}</div>
                            {authRole === 'admin' && (
                              <div className="text-sm text-slate-500 mt-1.5">
                                ※入力欄が空なら、日報の概算をそのまま使います。
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div
              className={`sticky bottom-0 z-30 bg-white/95 backdrop-blur-sm border-t border-slate-200 flex items-center justify-end gap-3 ${
                authRole === 'viewer'
                  ? '-mx-4 md:-mx-10 -mb-4 md:-mb-10 px-4 md:px-10 py-4'
                  : '-mx-6 md:-mx-9 -mb-6 md:-mb-9 px-6 md:px-9 py-4'
              }`}
            >
              {authRole === 'admin' && (
                <div className="flex items-center gap-3 mr-auto">
                  <span className={`text-sm font-bold ${financialDirty ? 'text-orange-600' : 'text-emerald-600'}`}>
                    {financialDirty ? '● 未保存の変更があります' : '✓ 保存済み'}
                  </span>
                  <button
                    type="button"
                    onClick={saveFinancialEdits}
                    disabled={!financialDirty || isFinancialSaving}
                    className={`px-6 py-3 rounded-xl font-extrabold text-base transition shadow-sm ${
                      !financialDirty || isFinancialSaving
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                  >
                    {isFinancialSaving ? '保存中…' : '💾 保存'}
                  </button>
                </div>
              )}
              <button
                type="button"
                onClick={() => setModalLocation(null)}
                className="bg-slate-800 hover:bg-slate-900 text-white px-8 md:px-12 py-3.5 rounded-2xl font-extrabold text-base md:text-lg transition shadow-lg"
              >
                閉じる
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 石川県現場専用 リース詳細内訳ポップアップ */}
      {showIshikawaLeaseModal && modalLocation && modalData && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-md flex items-center justify-center p-3 md:p-6 z-50 animate-fadeIn overflow-y-auto"
          onClick={() => setShowIshikawaLeaseModal(false)}
        >
          <div
            className="bg-white rounded-[32px] w-full max-w-2xl max-h-[92vh] overflow-y-auto p-6 md:p-8 space-y-6 shadow-2xl border border-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-20 bg-white flex justify-between items-center border-b border-slate-100 pb-4 pt-1">
              <div>
                <h3 className="text-xl md:text-2xl font-bold text-slate-900">
                  {modalLocation === '旧河北郡市クリーンセンター等解体工事(石川県)'
                    ? '🗾 石川県現場 リース費用の内訳'
                    : '🔹 南大阪建機(MOK) リース費用の内訳'}
                </h3>
                <p className="text-xs md:text-sm text-slate-500 mt-0.5">
                  {modalLocation === '旧河北郡市クリーンセンター等解体工事(石川県)'
                    ? '石川県用の機器リースと、通常のMOKリースの内訳です'
                    : '日報で選択されたMOKリースと自由入力分の内訳です'}
                </p>
              </div>
              <button onClick={() => setShowIshikawaLeaseModal(false)} className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-lg transition">✕</button>
            </div>

            <div className="space-y-5">
              {modalLocation === '旧河北郡市クリーンセンター等解体工事(石川県)' && (
              <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-200 space-y-3">
                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
                  <div>
                    <span className="font-bold text-indigo-900 text-base">🗾 石川県出張用リース機器合計</span>
                    <div className="text-xs text-indigo-700 mt-1">
                      自動計算: {formatAmount(modalData.calcIshikawaLease)}
                    </div>
                  </div>

                  {authRole === 'admin' ? (
                    <div className="flex items-center gap-2 md:w-[260px]">
                      <span className="font-bold text-indigo-700">¥</span>
                      <input
                        type="number"
                        value={costOverrides[modalLocation]?.ishikawaLease ?? ''}
                        onChange={(e) => handleCostOverrideChange(modalLocation, 'ishikawaLease', e.target.value)}
                        placeholder={String(modalData.calcIshikawaLease || 0)}
                        className="w-full p-2.5 border border-indigo-300 rounded-xl bg-white font-bold text-right text-base"
                      />
                    </div>
                  ) : (
                    <span className="text-xl font-bold text-indigo-700">{formatAmount(modalData.ishikawaLeaseCost)}</span>
                  )}
                </div>

                {authRole === 'admin' && (
                  <div className="text-xs text-indigo-700 font-bold">
                    反映金額: {formatAmount(modalData.ishikawaLeaseCost)}
                    {costOverrides[modalLocation]?.ishikawaLease !== '' && costOverrides[modalLocation]?.ishikawaLease !== undefined
                      ? '（手動上書き中）'
                      : '（自動計算）'}
                  </div>
                )}

                <div className="border-t border-indigo-200 pt-3 space-y-2">
                  {modalLeaseDetails.ishikawa.length === 0 ? (
                    <div className="text-sm text-slate-500">選択・入力された石川県リース機器はありません。</div>
                  ) : (
                    modalLeaseDetails.ishikawa.map((entry:any, idx:number) => (
                      <div key={`ish_${idx}`} className="bg-white/80 rounded-xl border border-indigo-100 px-3 py-2.5 flex flex-col md:flex-row md:items-center md:justify-between gap-1">
                        <div>
                          <div className="font-bold text-slate-800 text-sm">{entry.label}</div>
                          <div className="text-xs text-slate-500">
                            {entry.isCustom ? `入力個数：${entry.count}` : `延べ使用数：${entry.count}`}
                            {entry.isCustom && entry.unitPrice === null ? ' ／ 金額単価は日報では未設定' : ''}
                          </div>
                        </div>
                        {entry.isCustom ? (
                          <div className="w-full md:w-[220px]">
                            {authRole === 'admin' ? (
                              <>
                                <div className="text-[11px] font-bold text-indigo-700 mb-1">自由入力分の金額</div>
                                <div className="flex items-center gap-1">
                                  <span className="text-slate-500 font-bold">¥</span>
                                  <input
                                    type="number"
                                    value={leaseCustomPrices[modalLocation]?.ishikawa?.[entry.key] ?? ''}
                                    onChange={(e) => handleLeaseCustomPriceChange(modalLocation, 'ishikawa', entry.key, e.target.value)}
                                    placeholder={entry.total ? String(entry.total) : '金額を入力'}
                                    className="w-full p-2 border border-indigo-300 rounded-lg bg-white font-bold text-right text-sm"
                                  />
                                </div>
                              </>
                            ) : (
                              <div className="text-sm font-bold text-indigo-700 text-right">
                                {leaseCustomPrices[modalLocation]?.ishikawa?.[entry.key] !== '' &&
                                 leaseCustomPrices[modalLocation]?.ishikawa?.[entry.key] !== undefined
                                  ? formatAmount(leaseCustomPrices[modalLocation].ishikawa[entry.key])
                                  : (entry.total ? formatAmount(entry.total) : '金額未入力')}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-sm font-bold text-indigo-700">
                            {entry.unitPrice !== null && <>単価 {formatAmount(entry.unitPrice)} ／ </>}
                            合計 {formatAmount(entry.total)}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              )}

              <div className="bg-blue-50 p-4 rounded-2xl border border-blue-200 space-y-3">
                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
                  <div>
                    <span className="font-bold text-blue-900 text-base">🔹 南大阪建機(MOK) 通常リース合計</span>
                    <div className="text-xs text-blue-700 mt-1">
                      自動計算: {formatAmount(modalData.calcMokLease)}
                    </div>
                  </div>

                  {modalLocation === '旧河北郡市クリーンセンター等解体工事(石川県)' ? (
                    authRole === 'admin' ? (
                      <div className="flex items-center gap-2 md:w-[260px]">
                        <span className="font-bold text-blue-700">¥</span>
                        <input
                          type="number"
                          value={costOverrides[modalLocation]?.mokLease ?? ''}
                          onChange={(e) => handleCostOverrideChange(modalLocation, 'mokLease', e.target.value)}
                          placeholder={String(modalData.calcMokLease || 0)}
                          className="w-full p-2.5 border border-blue-300 rounded-xl bg-white font-bold text-right text-base"
                        />
                      </div>
                    ) : (
                      <span className="text-xl font-bold text-blue-700">{formatAmount(modalData.mokLeaseCost)}</span>
                    )
                  ) : (
                    <span className="text-xl font-bold text-blue-700">{formatAmount(modalData.reportEstimateLease)}</span>
                  )}
                </div>

                {authRole === 'admin' && modalLocation === '旧河北郡市クリーンセンター等解体工事(石川県)' && (
                  <div className="text-xs text-blue-700 font-bold">
                    反映金額: {formatAmount(modalData.mokLeaseCost)}
                    {costOverrides[modalLocation]?.mokLease !== '' && costOverrides[modalLocation]?.mokLease !== undefined
                      ? '（手動上書き中）'
                      : '（自動計算）'}
                  </div>
                )}

                <div className="border-t border-blue-200 pt-3 space-y-2">
                  {modalLeaseDetails.mok.length === 0 ? (
                    <div className="text-sm text-slate-500">選択・入力されたMOKリース機器はありません。</div>
                  ) : (
                    modalLeaseDetails.mok.map((entry:any, idx:number) => (
                      <div key={`mok_${idx}`} className="bg-white/80 rounded-xl border border-blue-100 px-3 py-2.5 flex flex-col md:flex-row md:items-center md:justify-between gap-1">
                        <div>
                          <div className="font-bold text-slate-800 text-sm">{entry.label}</div>
                          <div className="text-xs text-slate-500">
                            {entry.isCustom ? `入力個数：${entry.count}` : `延べ使用数：${entry.count}`}
                            {entry.isCustom && entry.unitPrice === null ? ' ／ 金額単価は日報では未設定' : ''}
                          </div>
                        </div>
                        {entry.isCustom ? (
                          <div className="w-full md:w-[220px]">
                            {authRole === 'admin' ? (
                              <>
                                <div className="text-[11px] font-bold text-blue-700 mb-1">自由入力分の金額</div>
                                <div className="flex items-center gap-1">
                                  <span className="text-slate-500 font-bold">¥</span>
                                  <input
                                    type="number"
                                    value={leaseCustomPrices[modalLocation]?.mok?.[entry.key] ?? ''}
                                    onChange={(e) => handleLeaseCustomPriceChange(modalLocation, 'mok', entry.key, e.target.value)}
                                    placeholder={entry.total ? String(entry.total) : '金額を入力'}
                                    className="w-full p-2 border border-blue-300 rounded-lg bg-white font-bold text-right text-sm"
                                  />
                                </div>
                              </>
                            ) : (
                              <div className="text-sm font-bold text-blue-700 text-right">
                                {leaseCustomPrices[modalLocation]?.mok?.[entry.key] !== '' &&
                                 leaseCustomPrices[modalLocation]?.mok?.[entry.key] !== undefined
                                  ? formatAmount(leaseCustomPrices[modalLocation].mok[entry.key])
                                  : (entry.total ? formatAmount(entry.total) : '金額未入力')}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-sm font-bold text-blue-700">
                            {entry.unitPrice !== null && <>単価 {formatAmount(entry.unitPrice)} ／ </>}
                            合計 {formatAmount(entry.total)}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 z-20 bg-white pt-4 pb-1 border-t border-slate-200 flex items-center justify-end gap-3">
              {authRole === 'admin' && (
                <div className="flex items-center gap-3 mr-auto">
                  <span className={`text-sm font-bold ${financialDirty ? 'text-orange-600' : 'text-emerald-600'}`}>
                    {financialDirty ? '● 未保存の変更があります' : '✓ 保存済み'}
                  </span>
                  <button
                    type="button"
                    onClick={saveFinancialEdits}
                    disabled={!financialDirty || isFinancialSaving}
                    className={`px-6 py-3 rounded-xl font-extrabold text-base transition shadow-sm ${
                      !financialDirty || isFinancialSaving
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                  >
                    {isFinancialSaving ? '保存中…' : '💾 保存'}
                  </button>
                </div>
              )}
              <button onClick={() => setShowIshikawaLeaseModal(false)} className="bg-slate-800 hover:bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold text-base transition">閉じる</button>
            </div>
          </div>
        </div>
      )}

      {/* 処分費内訳確認モーダル */}
      {showDisposalModal && modalLocation && modalData && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-md flex items-center justify-center p-2 md:p-6 z-50 animate-fadeIn" onClick={() => setShowDisposalModal(false)}>
          <div className="bg-white rounded-[28px] w-full max-w-6xl p-4 md:p-8 max-h-[94vh] overflow-y-auto space-y-6 shadow-2xl border border-slate-100" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-2xl md:text-3xl font-extrabold text-slate-900">🗑️ 処分費の内訳明細</h3>
                <p className="text-sm md:text-base text-slate-600 mt-1.5">
                  処分場ごとに、各月の「品目・総数量・単価・日報由来・請求確定額」を確認します。
                </p>
                <div className="text-sm md:text-base font-bold text-slate-800 mt-2">現場：{modalLocation}</div>
                {authRole === 'admin' && (
                  <div className="mt-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm md:text-base text-blue-900 font-bold leading-relaxed">
                    金額を修正すると、📦 月別処分一覧にも同じ内容が反映されます。<br />
                    「請求確定額」は、この現場の処分費・合計経費・利益の計算にも使われます。
                  </div>
                )}
              </div>
              <button onClick={() => setShowDisposalModal(false)} className="shrink-0 w-11 h-11 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-xl transition">✕</button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
                <div className="text-sm font-bold text-slate-600">日報由来 処分費合計</div>
                <div className="text-2xl md:text-3xl font-extrabold text-slate-900 mt-1">{formatAmount(modalData.reportEstimateDisposal)}</div>
              </div>
              <div className="bg-blue-50/60 border border-blue-200 rounded-2xl p-5">
                <div className="text-sm font-bold text-blue-700">請求確定額 合計（原価反映）</div>
                <div className="text-2xl md:text-3xl font-extrabold text-blue-900 mt-1">{formatAmount(modalData.disposalCost)}</div>
              </div>
            </div>

            <div className="space-y-8">
              {Object.keys(modalData.aggregatedDisposalBreakdown || {}).length === 0 ? (
                <p className="text-lg text-slate-500 text-center py-8">処分データはありません</p>
              ) : (
                Object.entries(modalData.aggregatedDisposalBreakdown).map(([dLoc, siteData]: any) => (
                  <section key={dLoc} className="rounded-3xl border border-slate-200 bg-slate-50 overflow-hidden">
                    <div className="bg-slate-800 text-white px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <h4 className="font-extrabold text-xl">🏢 {dLoc}</h4>
                      <div className="flex gap-4 text-sm md:text-base font-bold">
                        <span>日報由来 {formatAmount(siteData.reportTotal)}</span>
                        <span className="text-blue-200">確定 {formatAmount(siteData.confirmedTotal)}</span>
                      </div>
                    </div>

                    <div className="p-3 md:p-5 space-y-5">
                      {Object.entries(siteData.months)
                        .sort(([a], [b]) => b.localeCompare(a))
                        .map(([ym, monthData]: any) => {
                          const [y, m] = ym.split('-');

                          const summaryByItem: any = {};
                          Object.values(monthData.days || {}).forEach((dayData: any) => {
                            (dayData.rows || []).forEach((row: any) => {
                              if (!summaryByItem[row.item]) {
                                summaryByItem[row.item] = {
                                  item: row.item,
                                  quantity: 0,
                                  unit: row.unit,
                                  reportTotal: 0,
                                  confirmedTotal: 0,
                                  rows: []
                                };
                              }
                              summaryByItem[row.item].quantity += Number(row.quantity || 0);
                              summaryByItem[row.item].reportTotal += Number(row.reportTotal || 0);
                              summaryByItem[row.item].confirmedTotal += Number(row.confirmedTotal || 0);
                              summaryByItem[row.item].rows.push(row);
                            });
                          });

                          const summaryRows = Object.values(summaryByItem).map((summary: any) => {
                            const unitPrice = summary.quantity !== 0
                              ? summary.reportTotal / summary.quantity
                              : 0;
                            return { ...summary, unitPrice };
                          });

                          return (
                            <div key={ym} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                              <div className="px-5 py-4 bg-slate-100 border-b border-slate-200 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                                <div className="font-extrabold text-lg md:text-xl text-slate-900">📅 {y}年{Number(m)}月分</div>
                                <div className="flex gap-4 text-sm md:text-base font-bold">
                                  <span className="text-slate-700">日報由来 {formatAmount(monthData.reportTotal)}</span>
                                  <span className="text-blue-700">確定 {formatAmount(monthData.confirmedTotal)}</span>
                                </div>
                              </div>

                              <div className="overflow-x-auto">
                                <table className="w-full min-w-[850px] text-left border-collapse text-base">
                                  <thead>
                                    <tr className="bg-slate-50 text-slate-700 font-extrabold border-b border-slate-200">
                                      <th className="py-3.5 px-4">品目</th>
                                      <th className="py-3.5 px-4 text-right">月の総数量</th>
                                      <th className="py-3.5 px-4 text-right">単価</th>
                                      <th className="py-3.5 px-4 text-right">日報由来</th>
                                      <th className="py-3.5 px-4 text-right">請求確定額</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {summaryRows.map((summary: any) => {
                                      return (
                                        <tr key={summary.item} className="hover:bg-slate-50/70">
                                          <td className="py-4 px-4 font-extrabold text-slate-900 text-base md:text-lg">{summary.item}</td>
                                          <td className="py-4 px-4 text-right font-extrabold text-slate-900">
                                            {Number(summary.quantity || 0).toLocaleString('ja-JP', { maximumFractionDigits: 2 })} {summary.unit}
                                          </td>

                                          <td className="py-4 px-4 text-right">
                                            {authRole === 'admin' ? (
                                              <div className="flex items-center justify-end gap-1">
                                                <span className="text-slate-500 font-bold">¥</span>
                                                <input
                                                  type="number"
                                                  value={formatInputNumber(summary.unitPrice)}
                                                  onChange={(e) => handleDisposalMonthlyItemUnitPriceChange(
                                                    modalLocation, dLoc, ym, summary.item, summary.rows, e.target.value
                                                  )}
                                                  className="w-32 p-2.5 border border-slate-300 rounded-lg text-right font-extrabold bg-white text-base"
                                                />
                                              </div>
                                            ) : (
                                              <span className="font-extrabold">{formatAmount(summary.unitPrice)}</span>
                                            )}
                                          </td>

                                          <td className="py-4 px-4 text-right font-extrabold text-slate-900 text-base md:text-lg">
                                            {formatAmount(summary.reportTotal)}
                                          </td>

                                          <td className="py-4 px-4 text-right">
                                            {authRole === 'admin' ? (
                                              <div className="flex items-center justify-end gap-1">
                                                <span className="text-blue-500 font-bold">¥</span>
                                                <input
                                                  type="number"
                                                  value={formatInputNumber(summary.confirmedTotal)}
                                                  onChange={(e) => handleDisposalMonthlyItemInvoiceChange(
                                                    modalLocation, dLoc, ym, summary.item, summary.rows, e.target.value
                                                  )}
                                                  className="w-36 p-2.5 border border-blue-300 rounded-lg text-right font-extrabold bg-blue-50/40 text-blue-900 text-base"
                                                />
                                              </div>
                                            ) : (
                                              <span className="font-extrabold text-blue-800 text-base md:text-lg">{formatAmount(summary.confirmedTotal)}</span>
                                            )}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </section>
                ))
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-sm md:text-base text-blue-900 font-bold leading-relaxed">
              📌 この画面と「📦 月別処分一覧」は同じ処分データを見ています。どちらで金額を直しても、もう一方にも反映されます。
            </div>

            <div className="sticky bottom-0 z-20 bg-white/95 backdrop-blur-sm pt-4 pb-1 border-t border-slate-200 flex items-center justify-end gap-3">
              {authRole === 'admin' && (
                <div className="flex items-center gap-3 mr-auto">
                  <span className={`text-sm font-bold ${financialDirty ? 'text-orange-600' : 'text-emerald-600'}`}>
                    {financialDirty ? '● 未保存の変更があります' : '✓ 保存済み'}
                  </span>
                  <button
                    type="button"
                    onClick={saveFinancialEdits}
                    disabled={!financialDirty || isFinancialSaving}
                    className={`px-6 py-3 rounded-xl font-extrabold text-base transition shadow-sm ${
                      !financialDirty || isFinancialSaving
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                  >
                    {isFinancialSaving ? '保存中…' : '💾 保存'}
                  </button>
                </div>
              )}
              <button onClick={() => setShowDisposalModal(false)} className="bg-slate-800 hover:bg-slate-900 text-white px-7 py-3.5 rounded-2xl font-bold text-base md:text-lg transition">閉じる</button>
            </div>
          </div>
        </div>
      )}

      {/* スクラップ内訳・金額入力モーダル */}
      {showScrapModal && modalLocation && modalData && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-md flex items-center justify-center p-3 md:p-6 z-50 animate-fadeIn" onClick={() => setShowScrapModal(false)}>
          <div className="bg-white rounded-[32px] w-full max-w-4xl p-6 md:p-10 max-h-[92vh] overflow-y-auto space-y-6 shadow-2xl border border-slate-100" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-xl md:text-2xl font-bold text-slate-900">♻️ スクラップ売却の内訳・金額入力</h3>
                <p className="text-xs md:text-sm text-slate-500 mt-0.5">{modalLocation} のスクラップ売却内訳と金額の設定を行います</p>
              </div>
              <button onClick={() => setShowScrapModal(false)} className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-lg transition">✕</button>
            </div>

            <div className="space-y-6">
              <div className="bg-emerald-50 p-4 md:p-5 rounded-2xl border border-emerald-200 space-y-3">
                <div className="font-bold text-emerald-900 text-base md:text-lg">💰 スクラップ売却計（総合計の手動上書き）</div>
                <p className="text-xs md:text-sm text-emerald-700 font-medium">金額を直接上書きして設定することも可能です。</p>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-800 font-bold text-lg">+ ¥</span>
                  <input 
                    type="number" 
                    value={scrapOverrides[modalLocation]?.total ?? modalData.scrapTotal} 
                    onChange={e => handleScrapOverrideChange(modalLocation, 'total', e.target.value)}
                    readOnly={authRole === 'viewer'}
                    placeholder="例: 150000"
                    className={`w-full max-w-xs p-3 border border-emerald-400 rounded-xl text-xl font-bold text-right bg-white ${authRole === 'viewer' ? 'bg-slate-100 cursor-not-allowed' : ''}`}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-bold text-lg text-slate-800">📋 日報ごとのスクラップ搬出明細</h4>
                {Object.keys(modalData.aggregatedScrapBreakdown).length === 0 ? (
                  <p className="text-base text-slate-500 text-center py-8">スクラップ搬出データはありません</p>
                ) : (
                  Object.entries(modalData.aggregatedScrapBreakdown).map(([key, data]) => {
                    const scOv = scrapOverrides[modalLocation] || {};
                    const currentOverride = scOv[key] !== undefined ? scOv[key] : '';

                    return (
                      <div key={key} className="bg-slate-50 p-5 rounded-3xl border border-slate-200 space-y-4 shadow-2xs">
                        <div className="flex justify-between items-center flex-wrap gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                          <div>
                            <h5 className="font-bold text-lg text-slate-900">♻️ {key}</h5>
                            <span className="text-sm font-bold text-emerald-700">合計数量: {data.quantity}</span>
                          </div>
                          {authRole === 'admin' && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-600">この項目の金額上書き:</span>
                              <input 
                                type="number" 
                                value={currentOverride} 
                                onChange={e => handleScrapOverrideChange(modalLocation, key, e.target.value)} 
                                placeholder="金額" 
                                className="w-32 p-2 border border-emerald-400 rounded-xl text-right text-sm font-bold bg-white" 
                              />
                            </div>
                          )}
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse text-sm md:text-base">
                            <thead>
                              <tr className="border-b border-slate-300 text-slate-600 font-bold bg-slate-100">
                                <th className="py-2.5 px-3">日付</th>
                                <th className="py-2.5 px-3">品目</th>
                                <th className="py-2.5 px-3 text-right">数量</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 font-medium">
                              {data.details.map((detail, dIdx) => (
                                <tr key={dIdx} className="bg-white hover:bg-slate-50 transition">
                                  <td className="py-3 px-3 font-bold">{detail.date}</td>
                                  <td className="py-3 px-3">{detail.item}</td>
                                  <td className="py-3 px-3 text-right font-bold">{detail.quantity} {detail.unit}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="sticky bottom-0 z-20 bg-white/95 backdrop-blur-sm pt-4 pb-1 border-t border-slate-200 flex items-center justify-end gap-3">
              {authRole === 'admin' && (
                <div className="flex items-center gap-3 mr-auto">
                  <span className={`text-sm font-bold ${financialDirty ? 'text-orange-600' : 'text-emerald-600'}`}>
                    {financialDirty ? '● 未保存の変更があります' : '✓ 保存済み'}
                  </span>
                  <button
                    type="button"
                    onClick={saveFinancialEdits}
                    disabled={!financialDirty || isFinancialSaving}
                    className={`px-6 py-3 rounded-xl font-extrabold text-base transition shadow-sm ${
                      !financialDirty || isFinancialSaving
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                  >
                    {isFinancialSaving ? '保存中…' : '💾 保存'}
                  </button>
                </div>
              )}
              <button onClick={() => setShowScrapModal(false)} className="bg-slate-800 hover:bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold text-base transition">閉じる</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
