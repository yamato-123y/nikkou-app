'use client';
import { useState, useEffect } from 'react';

export default function Home() {
  const [settings, setSettings] = useState<any>({});
  const [reports, setReports] = useState<any[]>([]);
  const [showCostSummaryModal, setShowCostSummaryModal] = useState(false);

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
  const [workerOvertimeHours, setWorkerOvertimeHours] = useState<{[key: string]: number}>({});
  const [workerHalfDay, setWorkerHalfDay] = useState<{[key: string]: boolean}>({});
  const [workerOptionTarget, setWorkerOptionTarget] = useState<string | null>(null);
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
  const [officeMessage, setOfficeMessage] = useState('');


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
  const [showPreviousCopyModal, setShowPreviousCopyModal] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/settings').then(res => res.json()),
      fetch('/api/reports').then(res => res.json())
    ])
      .then(([settingsData, reportsData]) => {
        setSettings(settingsData || {});
        setReports(Array.isArray(reportsData) ? reportsData : []);
      })
      .catch(err => console.error(err));
  }, []);

  useEffect(() => {
    loadSitePhotos(location);
  }, [location]);

  const toggleSelection = (list: string[], item: string, setter: Function) => {
    setter(list.includes(item) ? list.filter(i => i !== item) : [...list, item]);
  };

  const toggleWorkerSelection = (workerName: string) => {
    if (selectedWorkers.includes(workerName)) {
      setSelectedWorkers(selectedWorkers.filter((name) => name !== workerName));
      setWorkerOvertimeHours((prev) => {
        const next = { ...prev };
        delete next[workerName];
        return next;
      });
      setWorkerHalfDay((prev) => {
        const next = { ...prev };
        delete next[workerName];
        return next;
      });
      if (workerOptionTarget === workerName) {
        setWorkerOptionTarget(null);
      }
    } else {
      setSelectedWorkers([...selectedWorkers, workerName]);
    }
  };

  const toggleWorkerHalfDay = (workerName: string) => {
    if (!selectedWorkers.includes(workerName)) {
      setSelectedWorkers([...selectedWorkers, workerName]);
    }

    setWorkerHalfDay((prev) => ({
      ...prev,
      [workerName]: !prev[workerName]
    }));
  };

  const changeWorkerOvertime = (workerName: string, delta: number) => {
    if (!selectedWorkers.includes(workerName)) {
      setSelectedWorkers([...selectedWorkers, workerName]);
    }

    setWorkerOvertimeHours((prev) => {
      const current = Number(prev[workerName] || 0);
      const nextValue = Math.max(0, current + delta);
      const next = { ...prev };

      if (nextValue === 0) {
        delete next[workerName];
      } else {
        next[workerName] = nextValue;
      }

      return next;
    });
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


  // ─────────────────────────────────────────────
  // 現場別「現在原価・残額」サマリー
  // 日報に保存済みの実績と、管理画面側で確定・上書きした金額をできるだけ反映する。
  // 細かな単価は表示せず、カテゴリ別合計のみ表示する。
  // ─────────────────────────────────────────────
  const normalizeSummaryDate = (dateStr: string) => {
    if (!dateStr) return '';
    const cleaned = String(dateStr).replace(/\//g, '-');
    const parts = cleaned.split('-');
    if (parts.length === 3) {
      return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    }
    return cleaned;
  };

  const getSummaryTargetLocationNames = (currentLoc: string) => {
    const keywordRules: { [key: string]: string } = {
      '旧河北郡市クリーンセンター等解体工事(石川県)': '旧河北郡市クリーンセンター',
      '美加の台地区施設一体型小中教育推進校整備工事': '美加の台地区施設',
      '和歌山下津港海岸(海南地区)船尾南護岸(第2工区)機側操作室解体工事': '船尾南護岸',
      '岸和田市別所町3丁目20-4解体工事': '岸和田市別所町3丁目'
    };

    const keyword = keywordRules[currentLoc];
    if (!keyword) return [currentLoc];

    const matched = Array.from(
      new Set(
        reports
          .map((r: any) => r.location)
          .filter((name: string) => name && name.includes(keyword))
      )
    );

    return matched.length > 0 ? matched : [currentLoc];
  };

  const getSummaryDisposalCost = (locName: string, locReports: any[]) => {
    const disposalOverrides = settings.disposalOverrides || {};
    const canonicalOv = disposalOverrides[locName] || {};
    let total = 0;

    locReports.forEach((r: any) => {
      const reportLocationName = r.location || locName;
      const reportOv = disposalOverrides[reportLocationName] || {};
      const normalizedDate = normalizeSummaryDate(r.date || '');
      const parts = normalizedDate.split('-');
      const ym = parts.length >= 2 ? `${parts[0]}-${parts[1]}` : '日付不明';
      const dateKey = normalizedDate || String(r.date || '日付不明');

      (Array.isArray(r.disposals) ? r.disposals : []).forEach((d: any) => {
        const disposalSite = d.location || 'その他処分場';
        const item = d.item || '品目未指定';
        const master = (settings.disposalLocations || []).find(
          (x: any) => x.location === disposalSite && x.item === item
        );

        const originalUnitPrice =
          d.price !== undefined && d.price !== null && d.price !== ''
            ? Number(d.price)
            : Number(master?.price || 0);

        const priceKey = `unitPrice__${disposalSite}__${ym}__${dateKey}__${item}`;
        const invoiceKey = `invoice__${disposalSite}__${ym}__${dateKey}__${item}`;
        const legacyPriceKey = `unitPrice__${disposalSite}__${ym}__${item}`;
        const legacyInvoiceKey = `invoice__${disposalSite}__${ym}__${item}`;

        const savedPrice =
          reportOv[priceKey] !== undefined ? reportOv[priceKey]
          : canonicalOv[priceKey] !== undefined ? canonicalOv[priceKey]
          : reportOv[legacyPriceKey] !== undefined ? reportOv[legacyPriceKey]
          : canonicalOv[legacyPriceKey];

        const effectiveUnitPrice =
          savedPrice !== '' && savedPrice !== undefined
            ? Number(savedPrice)
            : originalUnitPrice;

        const reportTotal = Number(d.quantity || 0) * effectiveUnitPrice;

        const savedInvoice =
          reportOv[invoiceKey] !== undefined ? reportOv[invoiceKey]
          : canonicalOv[invoiceKey] !== undefined ? canonicalOv[invoiceKey]
          : reportOv[legacyInvoiceKey] !== undefined ? reportOv[legacyInvoiceKey]
          : canonicalOv[legacyInvoiceKey];

        total +=
          savedInvoice !== '' && savedInvoice !== undefined
            ? Number(savedInvoice)
            : reportTotal;
      });
    });

    return total;
  };

  const buildDailyReportCostSnapshot = (r: any) => {
    const workerPrices: any = {};
    let lCost = 0;

    (Array.isArray(r.workers) ? r.workers : []).forEach((name: string) => {
      const master = (settings.workers || []).find((x: any) => x.name === name);
      const dailyPrice = Number(master?.price || 0);
      const shiftHours = Number(master?.shiftHours || 8) === 7 ? 7 : 8;
      const overtimeHours = Math.max(0, Number(r.workerOvertimeHours?.[name] || 0));
      const isHalfDay = !!r.workerHalfDay?.[name];
      const baseCost = isHalfDay ? Math.round(dailyPrice / 2) : dailyPrice;
      const overtimeCost = Math.round((dailyPrice / shiftHours) * overtimeHours);
      const total = baseCost + overtimeCost;

      workerPrices[name] = {
        dailyPrice,
        shiftHours,
        isHalfDay,
        overtimeHours,
        baseCost,
        overtimeCost,
        total
      };

      lCost += total;
    });

    let subCost = 0;
    const subcontractorPrices: any = {};
    (Array.isArray(r.subcontractors) ? r.subcontractors : []).forEach((sub: any) => {
      const company = sub.company || '';
      const task = sub.task || '';
      const master = (settings.subcontractors || []).find(
        (x: any) => x.company === company && x.task === task
      );
      const unitPrice =
        sub.price !== undefined && sub.price !== null && sub.price !== ''
          ? Number(sub.price)
          : Number(master?.price || 0);
      subcontractorPrices[`${company}__${task}`] = unitPrice;
      subCost += Number(sub.count || 0) * unitPrice;
    });

    const masterPrices: any = {
      leases: {},
      leaseHeavy: {},
      leaseAttach: {},
      leaseOther: {},
      ishikawaHeavy: {},
      ishikawaAttach: {},
      ishikawaOther: {},
      companyMachines: {},
      vehicles: {}
    };

    const getPrice = (key: string, name: string) => {
      if (masterPrices[key]?.[name] !== undefined) {
        return Number(masterPrices[key][name] || 0);
      }
      const price = Number((settings[key] || []).find((x: any) => x.name === name)?.price || 0);
      if (!masterPrices[key]) masterPrices[key] = {};
      masterPrices[key][name] = price;
      return price;
    };

    let leaseC = 0;
    let ishikawaLeaseDetail = 0;
    let mokLeaseDetail = 0;

    const machines = Array.isArray(r.machines) ? r.machines : [];
    const leaseHeavyList = Array.isArray(r.leaseHeavy) ? r.leaseHeavy : [];
    const legacyMachines = leaseHeavyList.length === 0 ? machines : [];

    (Array.isArray(r.ishikawaHeavy) ? r.ishikawaHeavy : []).forEach((name: string) => {
      const p = getPrice('ishikawaHeavy', name);
      leaseC += p;
      ishikawaLeaseDetail += p;
    });
    (Array.isArray(r.ishikawaAttach) ? r.ishikawaAttach : []).forEach((name: string) => {
      const p = getPrice('ishikawaAttach', name);
      leaseC += p;
      ishikawaLeaseDetail += p;
    });
    (Array.isArray(r.ishikawaOther) ? r.ishikawaOther : []).forEach((name: string) => {
      const p = getPrice('ishikawaOther', name);
      leaseC += p;
      ishikawaLeaseDetail += p;
    });
    (Array.isArray(r.ishikawaCustomMachines) ? r.ishikawaCustomMachines : []).forEach((item: any) => {
      const unitPrice =
        item.price !== undefined && item.price !== null && item.price !== ''
          ? Number(item.price)
          : 0;
      const cost = Number(item.count || 0) * unitPrice;
      leaseC += cost;
      ishikawaLeaseDetail += cost;
    });

    legacyMachines.forEach((name: string) => {
      const p = getPrice('leases', name);
      leaseC += p;
      mokLeaseDetail += p;
    });
    leaseHeavyList.forEach((name: string) => {
      const p = getPrice('leaseHeavy', name);
      leaseC += p;
      mokLeaseDetail += p;
    });
    (Array.isArray(r.leaseAttach) ? r.leaseAttach : []).forEach((name: string) => {
      const p = getPrice('leaseAttach', name);
      leaseC += p;
      mokLeaseDetail += p;
    });
    (Array.isArray(r.leaseOther) ? r.leaseOther : []).forEach((name: string) => {
      const p = getPrice('leaseOther', name);
      leaseC += p;
      mokLeaseDetail += p;
    });
    (Array.isArray(r.otherLeases) ? r.otherLeases : []).forEach((item: any) => {
      const cost = Number(item.price || 0);
      leaseC += cost;
      mokLeaseDetail += cost;
    });
    (Array.isArray(r.mokCustomMachines) ? r.mokCustomMachines : []).forEach((item: any) => {
      const master =
        (settings.leaseHeavy || []).find((x: any) => x.name === item.name) ||
        (settings.leaseAttach || []).find((x: any) => x.name === item.name) ||
        (settings.leaseOther || []).find((x: any) => x.name === item.name);
      const unitPrice =
        item.price !== undefined && item.price !== null && item.price !== ''
          ? Number(item.price)
          : Number(master?.price || 0);
      const cost = Number(item.count || 0) * unitPrice;
      leaseC += cost;
      mokLeaseDetail += cost;
    });

    let ownMachineC = 0;
    (Array.isArray(r.ownMachines) ? r.ownMachines : []).forEach((name: string) => {
      ownMachineC += getPrice('companyMachines', name);
    });

    let vehicleC = 0;
    (Array.isArray(r.vehicles) ? r.vehicles : []).forEach((name: string) => {
      vehicleC += getPrice('vehicles', name);
    });

    let dispC = 0;
    const disposalPrices: any = {};
    const disposalBreakdown: any = {};
    (Array.isArray(r.disposals) ? r.disposals : []).forEach((item: any) => {
      const disposalLocation = item.location || 'その他処分場';
      const itemName = item.item || '品目未指定';
      const master = (settings.disposalLocations || []).find(
        (x: any) => x.location === disposalLocation && x.item === itemName
      );
      const unit = item.unit || master?.unit || 't';
      const unitPrice =
        item.price !== undefined && item.price !== null && item.price !== ''
          ? Number(item.price)
          : Number(master?.price || 0);
      const quantity = Number(item.quantity || 0);
      const total = quantity * unitPrice;

      disposalPrices[`${disposalLocation}__${itemName}`] = { unitPrice, unit };
      dispC += total;

      if (!disposalBreakdown[disposalLocation]) {
        disposalBreakdown[disposalLocation] = { items: {}, total: 0 };
      }
      disposalBreakdown[disposalLocation].total += total;
      if (!disposalBreakdown[disposalLocation].items[itemName]) {
        disposalBreakdown[disposalLocation].items[itemName] = {
          quantity: 0,
          price: unitPrice,
          total: 0,
          unit,
          details: []
        };
      }
      disposalBreakdown[disposalLocation].items[itemName].quantity += quantity;
      disposalBreakdown[disposalLocation].items[itemName].total += total;
      disposalBreakdown[disposalLocation].items[itemName].details.push({
        date: r.date || '日付不明',
        item: itemName,
        quantity,
        unit,
        price: unitPrice,
        total
      });
    });

    let fuelCost = 0;
    let fuelUnitPrice: number | null = null;
    const normalized = normalizeSummaryDate(r.date || '');
    const parts = normalized.split('-');
    if (parts.length >= 2) {
      const ym = `${parts[0]}-${parts[1]}`;
      const fuelLocationKey =
        r.location && String(r.location).includes('旧河北郡市クリーンセンター')
          ? '旧河北郡市クリーンセンター等解体工事(石川県)'
          : r.location;
      const prices =
        settings.fuelUnitPrices?.[fuelLocationKey] ||
        settings.fuelUnitPrices?.[r.location] ||
        {};
      const unitPrice = prices?.[ym];
      if (unitPrice !== '' && unitPrice !== undefined) {
        fuelUnitPrice = Number(unitPrice);
        fuelCost = Number(r.fuel || 0) * fuelUnitPrice;
      }
    }

    return {
      version: 1,
      frozenAt: new Date().toISOString(),
      workerPrices,
      subcontractorPrices,
      masterPrices,
      disposalPrices,
      fuelUnitPrice,
      disposalBreakdown,
      totals: {
        lCost,
        subCost,
        leaseC,
        otherLeaseC: 0,
        ishikawaLeaseDetail,
        mokLeaseDetail,
        ownMachineC,
        vehicleC,
        dispC,
        fC: fuelCost,
        rawFuel: Number(r.fuel || 0),
        regularPrice: Number(r.regularPrice || 0),
        eC: Number(r.etcPrice || 0),
        pC: Number(r.parkingPrice || 0),
        oC: Number(r.otherPrice || 0)
      }
    };
  };

  const calculateLocationCostSummary = (locName: string) => {
    const targetNames = getSummaryTargetLocationNames(locName);
    const locReports = reports.filter((r: any) => targetNames.includes(r.location));

    let labor = 0;
    let subcontractor = 0;
    let snapshotSubcontractor = 0;
    let lease = 0;
    let ownMachine = 0;
    let vehicle = 0;
    let fuel = 0;
    let regular = 0;
    let etc = 0;
    let parking = 0;
    let other = 0;

    const subcontractorGroup: any = {};
    const fuelLitersByMonth: any = {};

    locReports.forEach((r: any) => {
      if (r?.costSnapshot?.totals) {
        const t = r.costSnapshot.totals;
        labor += Number(t.lCost || 0);
        snapshotSubcontractor += Number(t.subCost || 0);
        lease += Number(t.leaseC || 0) + Number(t.otherLeaseC || 0);
        ownMachine += Number(t.ownMachineC || 0);
        vehicle += Number(t.vehicleC || 0);
        fuel += Number(t.fC || 0);
        regular += Number(t.regularPrice || 0);
        etc += Number(t.eC || 0);
        parking += Number(t.pC || 0);
        other += Number(t.oC || 0);
        return;
      }

      // 旧日報（snapshot未保存）の互換計算
      // 人件費
      (Array.isArray(r.workers) ? r.workers : []).forEach((name: string) => {
        const workerMaster = (settings.workers || []).find((x: any) => x.name === name);
        const dailyPrice = Number(workerMaster?.price || 0);
        const shiftHours = Number(workerMaster?.shiftHours || 8) === 7 ? 7 : 8;
        const overtimeHours = Math.max(0, Number(r.workerOvertimeHours?.[name] || 0));
        const baseCost = r.workerHalfDay?.[name] ? Math.round(dailyPrice / 2) : dailyPrice;
        const overtimeCost = Math.round((dailyPrice / shiftHours) * overtimeHours);

        labor += baseCost + overtimeCost;
      });

      // 外注費（あとで業者・作業単位の確定額を反映）
      (Array.isArray(r.subcontractors) ? r.subcontractors : []).forEach((sub: any) => {
        const company = sub.company || '会社名未設定';
        const task = sub.task || '作業内容未設定';
        const key = `${company}__${task}`;
        const master = (settings.subcontractors || []).find(
          (x: any) => x.company === company && x.task === task
        );
        const unitPrice =
          sub.price !== undefined && sub.price !== null && sub.price !== ''
            ? Number(sub.price)
            : Number(master?.price || 0);

        subcontractorGroup[key] =
          (subcontractorGroup[key] || 0) + Number(sub.count || 0) * unitPrice;
      });

      // リース
      const leaseHeavyList = Array.isArray(r.leaseHeavy) ? r.leaseHeavy : [];
      const legacyMachines =
        leaseHeavyList.length === 0 && Array.isArray(r.machines) ? r.machines : [];

      legacyMachines.forEach((name: string) => {
        lease += Number((settings.leases || []).find((x: any) => x.name === name)?.price || 0);
      });
      leaseHeavyList.forEach((name: string) => {
        lease += Number((settings.leaseHeavy || []).find((x: any) => x.name === name)?.price || 0);
      });
      (Array.isArray(r.leaseAttach) ? r.leaseAttach : []).forEach((name: string) => {
        lease += Number((settings.leaseAttach || []).find((x: any) => x.name === name)?.price || 0);
      });
      (Array.isArray(r.leaseOther) ? r.leaseOther : []).forEach((name: string) => {
        lease += Number((settings.leaseOther || []).find((x: any) => x.name === name)?.price || 0);
      });

      (Array.isArray(r.ishikawaHeavy) ? r.ishikawaHeavy : []).forEach((name: string) => {
        lease += Number((settings.ishikawaHeavy || []).find((x: any) => x.name === name)?.price || 0);
      });
      (Array.isArray(r.ishikawaAttach) ? r.ishikawaAttach : []).forEach((name: string) => {
        lease += Number((settings.ishikawaAttach || []).find((x: any) => x.name === name)?.price || 0);
      });
      (Array.isArray(r.ishikawaOther) ? r.ishikawaOther : []).forEach((name: string) => {
        lease += Number((settings.ishikawaOther || []).find((x: any) => x.name === name)?.price || 0);
      });

      // 自由入力リースで日報に金額がある過去データだけ反映
      (Array.isArray(r.otherLeases) ? r.otherLeases : []).forEach((item: any) => {
        lease += Number(item.price || 0);
      });
      (Array.isArray(r.mokCustomMachines) ? r.mokCustomMachines : []).forEach((item: any) => {
        const master =
          (settings.leaseHeavy || []).find((x: any) => x.name === item.name) ||
          (settings.leaseAttach || []).find((x: any) => x.name === item.name) ||
          (settings.leaseOther || []).find((x: any) => x.name === item.name);
        const unitPrice =
          item.price !== undefined && item.price !== null && item.price !== ''
            ? Number(item.price)
            : Number(master?.price || 0);
        lease += Number(item.count || 0) * unitPrice;
      });
      (Array.isArray(r.ishikawaCustomMachines) ? r.ishikawaCustomMachines : []).forEach((item: any) => {
        if (item.price !== undefined && item.price !== null && item.price !== '') {
          lease += Number(item.count || 0) * Number(item.price);
        }
      });

      // 自社重機
      (Array.isArray(r.ownMachines) ? r.ownMachines : []).forEach((name: string) => {
        ownMachine += Number((settings.companyMachines || []).find((x: any) => x.name === name)?.price || 0);
      });

      // 車両
      (Array.isArray(r.vehicles) ? r.vehicles : []).forEach((name: string) => {
        vehicle += Number((settings.vehicles || []).find((x: any) => x.name === name)?.price || 0);
      });

      // 軽油（L × 月単価）
      const normalized = normalizeSummaryDate(r.date || '');
      const parts = normalized.split('-');
      if (parts.length >= 2) {
        const ym = `${parts[0]}-${parts[1]}`;
        fuelLitersByMonth[ym] = (fuelLitersByMonth[ym] || 0) + Number(r.fuel || 0);
      }

      // 日報に直接金額保存されているもの
      regular += Number(r.regularPrice || 0);
      etc += Number(r.etcPrice || 0);
      parking += Number(r.parkingPrice || 0);
      other += Number(r.otherPrice || 0);
    });

    // 外注：業者・作業別の管理画面確定額を反映
    const subDetailOverrides = settings.subcontractorDetailOverrides?.[locName] || {};
    subcontractor =
      snapshotSubcontractor +
      Object.entries(subcontractorGroup).reduce((sum: number, [key, raw]: any) => {
        const override = subDetailOverrides[key];
        return sum + (
          override !== '' && override !== undefined
            ? Number(override)
            : Number(raw || 0)
        );
      }, 0);

    // 管理画面から追加した一括外注
    const customSubsTotal = (settings.customSubcontractors?.[locName] || []).reduce(
      (sum: number, item: any) => sum + Number(item.price || 0),
      0
    );
    subcontractor += customSubsTotal;

    // 軽油月単価
    const fuelUnitPrices = settings.fuelUnitPrices?.[locName] || {};
    Object.entries(fuelLitersByMonth).forEach(([ym, liters]: any) => {
      const unitPrice = fuelUnitPrices[ym];
      if (unitPrice !== '' && unitPrice !== undefined) {
        fuel += Number(liters) * Number(unitPrice);
      }
    });

    // 処分費：管理画面の確定額を優先
    const disposal = getSummaryDisposalCost(locName, locReports);

    // 管理画面での全体上書き
    const ov = settings.costOverrides?.[locName] || {};
    if (ov.labor !== '' && ov.labor !== undefined) labor = Number(ov.labor);
    if (ov.sub !== '' && ov.sub !== undefined) subcontractor = Number(ov.sub);

    const isIshikawa = locName === '旧河北郡市クリーンセンター等解体工事(石川県)';
    if (!isIshikawa && ov.lease !== '' && ov.lease !== undefined) lease = Number(ov.lease);
    if (isIshikawa) {
      const ishikawaLease =
        ov.ishikawaLease !== '' && ov.ishikawaLease !== undefined
          ? Number(ov.ishikawaLease)
          : 0;
      const mokLease =
        ov.mokLease !== '' && ov.mokLease !== undefined
          ? Number(ov.mokLease)
          : 0;

      // 管理画面で個別確定されている場合だけ、その合計を優先
      if (
        (ov.ishikawaLease !== '' && ov.ishikawaLease !== undefined) ||
        (ov.mokLease !== '' && ov.mokLease !== undefined)
      ) {
        lease = ishikawaLease + mokLease;
      }
    }

    if (ov.ownMachine !== '' && ov.ownMachine !== undefined) ownMachine = Number(ov.ownMachine);
    if (ov.vehicle !== '' && ov.vehicle !== undefined) vehicle = Number(ov.vehicle);
    if (ov.fuel !== '' && ov.fuel !== undefined && !isIshikawa) fuel = Number(ov.fuel);
    if (ov.regular !== '' && ov.regular !== undefined && !isIshikawa) regular = Number(ov.regular);
    if (ov.etc !== '' && ov.etc !== undefined) etc = Number(ov.etc);
    if (ov.parking !== '' && ov.parking !== undefined) parking = Number(ov.parking);
    if (ov.other !== '' && ov.other !== undefined) other = Number(ov.other);

    // 石川県案件の宇野気石油合計
    if (isIshikawa) {
      if (ov.unokeTotal !== '' && ov.unokeTotal !== undefined) {
        fuel += Number(ov.unokeTotal);
      } else {
        if (ov.fuel !== '' && ov.fuel !== undefined) fuel += Number(ov.fuel);
        if (ov.regular !== '' && ov.regular !== undefined) regular += Number(ov.regular);
      }
    }

    // 管理画面で追加したその他経費
    const extra = (settings.customExtraExpenses?.[locName] || []).reduce(
      (sum: number, item: any) => sum + Number(item.amount || 0),
      0
    );

    const matchedLoc = (settings.locations || []).find(
      (l: any) => (typeof l === 'string' ? l : l?.name) === locName
    );
    const contractPrice = Number(
      typeof matchedLoc === 'object' && matchedLoc !== null ? matchedLoc.price || 0 : 0
    );

    const fuelAndRegular = fuel + regular;
    const total =
      labor +
      subcontractor +
      lease +
      ownMachine +
      vehicle +
      disposal +
      fuelAndRegular +
      etc +
      parking +
      other +
      extra;

    const remaining = contractPrice - total;

    return {
      contractPrice,
      labor,
      subcontractor,
      lease,
      ownMachine,
      vehicle,
      disposal,
      fuelAndRegular,
      etc,
      parking,
      other,
      extra,
      total,
      remaining,
      reportCount: locReports.length
    };
  };

  const selectedLocationCostSummary = location
    ? calculateLocationCostSummary(location)
    : null;

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

    const reportPayload: any = {
        date, location, manager, workers: selectedWorkers,
        workerOvertimeHours: Object.fromEntries(
          Object.entries(workerOvertimeHours)
            .filter(([name, hours]) => selectedWorkers.includes(name) && Number(hours) > 0)
        ),
        workerHalfDay: Object.fromEntries(
          selectedWorkers
            .filter((name) => !!workerHalfDay[name])
            .map((name) => [name, true])
        ),
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
        disposals, scraps,
        workDescription: description,
        officeMessage,
        createdAt: new Date().toISOString()
    };

    // 送信時点の単価・原価を日報自身へ保存。
    // 後からマスタ単価を変更しても、この日報の金額は変わらない。
    reportPayload.costSnapshot = buildDailyReportCostSnapshot(reportPayload);

    await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reportPayload)
    });

    setSelectedWorkers([]);
    setWorkerOvertimeHours({});
    setWorkerHalfDay({});
    setWorkerOptionTarget(null);
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
    setDisposals([]); setScraps([]); setDescription(''); setOfficeMessage('');

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

  const normalizeReportForCopy = (r: any) => {
    if (r?.data && typeof r.data === 'object') {
      return { ...r.data, id: r.id || r.data.id };
    }
    return r || {};
  };

  const previousReportForLocation = (() => {
    if (!location) return null;

    const currentDate = String(date || '');

    return reports
      .map(normalizeReportForCopy)
      .filter((r: any) => {
        if (String(r.location || '') !== String(location)) return false;
        if (!r.date) return false;
        if (!currentDate) return true;
        return String(r.date) <= currentDate;
      })
      .sort((a: any, b: any) => {
        const byDate = String(b.date || '').localeCompare(String(a.date || ''));
        if (byDate !== 0) return byDate;
        return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
      })[0] || null;
  })();

  const applyPreviousReportCopy = () => {
    if (!previousReportForLocation) return;

    const r: any = previousReportForLocation;

    // よく繰り返す項目だけコピーする。
    // 半日・残業・金額・処分・スクラップ・事務所への相談は、
    // 前日のまま残ると入力ミスにつながるため意図的にコピーしない。
    setManager(r.manager || '');
    setSelectedWorkers(Array.isArray(r.workers) ? [...r.workers] : []);
    setWorkerOvertimeHours({});
    setWorkerHalfDay({});
    setWorkerOptionTarget(null);

    setJobTypesCount(
      r.jobTypes && typeof r.jobTypes === 'object'
        ? { ...r.jobTypes }
        : {}
    );

    setSubcontractors(
      Array.isArray(r.subcontractors)
        ? r.subcontractors.map((x: any) => ({ ...x }))
        : []
    );

    setLeaseHeavy(Array.isArray(r.leaseHeavy) ? [...r.leaseHeavy] : []);
    setLeaseAttach(Array.isArray(r.leaseAttach) ? [...r.leaseAttach] : []);
    setLeaseOther(Array.isArray(r.leaseOther) ? [...r.leaseOther] : []);

    setIshikawaLeaseHeavy(
      Array.isArray(r.ishikawaHeavy)
        ? [...r.ishikawaHeavy]
        : Array.isArray(r.ishikawaLeaseHeavy)
          ? [...r.ishikawaLeaseHeavy]
          : []
    );
    setIshikawaLeaseAttach(
      Array.isArray(r.ishikawaAttach)
        ? [...r.ishikawaAttach]
        : Array.isArray(r.ishikawaLeaseAttach)
          ? [...r.ishikawaLeaseAttach]
          : []
    );
    setIshikawaLeaseOther(
      Array.isArray(r.ishikawaOther)
        ? [...r.ishikawaOther]
        : Array.isArray(r.ishikawaLeaseOther)
          ? [...r.ishikawaLeaseOther]
          : []
    );

    setIshikawaCustomMachines(
      Array.isArray(r.ishikawaCustomMachines)
        ? r.ishikawaCustomMachines.map((x: any) => ({ ...x }))
        : []
    );

    setMokCustomMachines(
      Array.isArray(r.mokCustomMachines)
        ? r.mokCustomMachines.map((x: any) => ({ ...x }))
        : []
    );

    setOtherLeases(
      Array.isArray(r.otherLeases)
        ? r.otherLeases.map((x: any) => ({ ...x }))
        : []
    );

    setSelectedOwnMachines(Array.isArray(r.ownMachines) ? [...r.ownMachines] : []);
    setSelectedVehicles(Array.isArray(r.vehicles) ? [...r.vehicles] : []);

    setDescription(r.workDescription || '');

    // その日ごとに必ず確認してほしい項目は空にする
    setFuel('');
    setRegularPrice('');
    setEtcPrice('');
    setParkingPrice('');
    setUnokeFuel('');
    setUnokeRegular('');
    setOtherItem('');
    setOtherPrice('');
    setDisposals([]);
    setScraps([]);
    setOfficeMessage('');

    setShowPreviousCopyModal(false);
    window.setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 50);
  };

  const getSubcontractorCount = (company: string, task: string) => {
    const found = subcontractors.find(
      (x) => x.company === company && x.task === task
    );
    return Math.max(0, Number(found?.count || 0));
  };

  const changeSubcontractorCount = (company: string, task: string, delta: number) => {
    setSubcontractors((prev) => {
      const current = prev.find(
        (x) => x.company === company && x.task === task
      );
      const currentCount = Math.max(0, Number(current?.count || 0));
      const nextCount = Math.max(0, currentCount + delta);

      if (nextCount === 0) {
        return prev.filter(
          (x) => !(x.company === company && x.task === task)
        );
      }

      if (current) {
        return prev.map((x) =>
          x.company === company && x.task === task
            ? { ...x, count: String(nextCount) }
            : x
        );
      }

      return [
        ...prev,
        {
          company,
          task,
          count: String(nextCount)
        }
      ];
    });
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

      {/* 前回の日報コピー確認 */}
      {showPreviousCopyModal && previousReportForLocation && (
        <div
          className="fixed inset-0 z-[110] bg-slate-950/55 flex items-end justify-center p-3"
          onClick={() => setShowPreviousCopyModal(false)}
        >
          <div
            className="w-full max-w-md bg-white rounded-t-3xl rounded-b-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-slate-200">
              <div className="text-[21px] font-semibold text-slate-950">
                📋 前回の日報をコピー
              </div>
              <div className="mt-2 text-[15px] text-slate-600 leading-relaxed">
                {previousReportForLocation.date} の日報から、よく繰り返す項目をコピーします。
              </div>
            </div>

            <div className="p-5 space-y-4">
              <div className="rounded-2xl bg-blue-50 border border-blue-200 p-4">
                <div className="text-sm font-semibold text-blue-900 mb-2">コピーする内容</div>
                <div className="text-[14px] leading-7 text-slate-700">
                  職長・作業員・作業種別・外注・リース・重機・車両・本日の作業内容
                </div>
              </div>

              <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4">
                <div className="text-sm font-semibold text-amber-900 mb-2">安全のためコピーしない内容</div>
                <div className="text-[14px] leading-7 text-slate-700">
                  半日・残業・燃料・ETC・駐車場・その他金額・処分・スクラップ・事務所への報告相談
                </div>
              </div>

              <button
                type="button"
                onClick={applyPreviousReportCopy}
                className="w-full h-14 rounded-2xl bg-blue-700 text-white text-[17px] font-semibold active:bg-blue-800"
              >
                この内容でコピーする
              </button>

              <button
                type="button"
                onClick={() => setShowPreviousCopyModal(false)}
                className="w-full h-12 rounded-2xl bg-slate-100 text-slate-700 text-[16px] font-medium"
              >
                やめる
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 現場別 現在原価・残額ポップアップ */}
      {showCostSummaryModal && location && selectedLocationCostSummary && (
        <div
          className="fixed inset-0 z-[90] bg-slate-950/55 backdrop-blur-sm flex items-center justify-center p-3 md:p-6"
          onClick={() => setShowCostSummaryModal(false)}
        >
          <div
            className="w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-white rounded-[28px] shadow-2xl border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-5 md:px-7 py-5 rounded-t-[28px]">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-black text-orange-600">現場原価の確認</div>
                  <h3 className="text-xl md:text-2xl font-black text-slate-950 mt-1 break-words">
                    {location}
                  </h3>
                  <div className="text-xs md:text-sm text-slate-400 font-bold mt-1">
                    保存済み日報 {selectedLocationCostSummary.reportCount}件を集計
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowCostSummaryModal(false)}
                  className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-black shrink-0"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-4 md:p-7 space-y-5">
              {/* 上部3項目 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                  <div className="text-sm font-bold text-slate-500">請負金額</div>
                  <div className="text-2xl md:text-3xl font-black text-slate-950 mt-1">
                    ¥{Math.round(selectedLocationCostSummary.contractPrice).toLocaleString('ja-JP')}
                  </div>
                </div>

                <div className="rounded-2xl bg-orange-50 border border-orange-200 p-4">
                  <div className="text-sm font-bold text-orange-700">現在までの経費</div>
                  <div className="text-2xl md:text-3xl font-black text-orange-700 mt-1">
                    ¥{Math.round(selectedLocationCostSummary.total).toLocaleString('ja-JP')}
                  </div>
                </div>

                <div className={`rounded-2xl border p-4 ${
                  selectedLocationCostSummary.remaining >= 0
                    ? 'bg-emerald-50 border-emerald-200'
                    : 'bg-rose-50 border-rose-200'
                }`}>
                  <div className={`text-sm font-bold ${
                    selectedLocationCostSummary.remaining >= 0 ? 'text-emerald-700' : 'text-rose-700'
                  }`}>
                    残りの金額
                  </div>
                  <div className={`text-2xl md:text-3xl font-black mt-1 ${
                    selectedLocationCostSummary.remaining >= 0 ? 'text-emerald-700' : 'text-rose-700'
                  }`}>
                    {selectedLocationCostSummary.remaining < 0 ? '▲ ' : ''}
                    ¥{Math.abs(Math.round(selectedLocationCostSummary.remaining)).toLocaleString('ja-JP')}
                  </div>
                </div>
              </div>

              {/* 経費内訳 */}
              <div className="rounded-2xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-900 text-white px-5 py-3 font-black text-lg">
                  経費の内訳
                </div>

                <div className="divide-y divide-slate-100">
                  {[
                    ['人件費', selectedLocationCostSummary.labor],
                    ['外注費', selectedLocationCostSummary.subcontractor],
                    ['リース', selectedLocationCostSummary.lease],
                    ['自社重機', selectedLocationCostSummary.ownMachine],
                    ['車両', selectedLocationCostSummary.vehicle],
                    ['処分費用', selectedLocationCostSummary.disposal],
                    ['燃料費', selectedLocationCostSummary.fuelAndRegular],
                    ['ETC', selectedLocationCostSummary.etc],
                    ['駐車場', selectedLocationCostSummary.parking],
                    ['その他経費', selectedLocationCostSummary.other + selectedLocationCostSummary.extra]
                  ].map(([label, amount]: any) => (
                    <div key={label} className="flex items-center justify-between gap-4 px-5 py-3.5">
                      <span className="text-base font-bold text-slate-700">{label}</span>
                      <span className="text-lg font-black text-slate-950">
                        ¥{Math.round(Number(amount || 0)).toLocaleString('ja-JP')}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between gap-4 px-5 py-4 bg-orange-50 border-t-2 border-orange-200">
                  <span className="text-lg font-black text-orange-800">使用した経費 合計</span>
                  <span className="text-2xl font-black text-orange-700">
                    ¥{Math.round(selectedLocationCostSummary.total).toLocaleString('ja-JP')}
                  </span>
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3 text-xs md:text-sm font-bold text-slate-500 leading-relaxed">
                ※ 金額は保存済みの日報と管理画面で確定・上書きされた金額をもとに集計しています。<br />
                ※ 今入力している未送信の日報内容は、まだこの金額には含まれません。<br />
                ※ 人件費などの単価は表示せず、項目ごとの合計金額のみ表示しています。
              </div>

              <button
                type="button"
                onClick={() => setShowCostSummaryModal(false)}
                className="w-full rounded-2xl bg-slate-900 hover:bg-slate-800 text-white py-4 font-black text-lg"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

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
                <span className="font-bold text-slate-800">
                  {selectedWorkers.length > 0
                    ? selectedWorkers
                        .map((name) => {
                          const overtime = Number(workerOvertimeHours[name] || 0);
                          const halfDay = !!workerHalfDay[name];
                          const notes = [
                            halfDay ? '半日' : '',
                            overtime > 0 ? `残業${overtime}時間` : ''
                          ].filter(Boolean);
                          return notes.length > 0 ? `${name}（${notes.join('・')}）` : name;
                        })
                        .join(', ')
                    : 'なし'}
                </span>
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

              {officeMessage && (
                <div>
                  <span className="font-bold text-orange-600 block text-xs">事務所への報告・相談</span>
                  <p className="font-bold text-slate-800 whitespace-pre-wrap line-clamp-4">{officeMessage}</p>
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

             {location && previousReportForLocation && (
               <button
                 type="button"
                 onClick={() => setShowPreviousCopyModal(true)}
                 className="mt-3 w-full rounded-2xl bg-blue-50 border-2 border-blue-300 text-blue-900 px-4 py-4 font-semibold text-[16px] shadow-sm active:bg-blue-100"
               >
                 📋 前回の日報をコピー
                 <span className="block mt-1 text-[13px] font-medium text-blue-600">
                   前回：{previousReportForLocation.date}
                 </span>
               </button>
             )}

             {location && (
               <button
                 type="button"
                 onClick={() => setShowCostSummaryModal(true)}
                 className="mt-3 w-full rounded-2xl bg-slate-900 hover:bg-slate-800 text-white px-4 py-4 font-black text-base md:text-lg shadow-sm flex items-center justify-center gap-2 transition"
               >
                 💰 現在の原価・残額を見る
               </button>
             )}
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
           <div className="grid grid-cols-2 gap-2 pt-1">
             {(settings.workers || []).map((w:any) => {
               const selected = selectedWorkers.includes(w.name);
               const overtime = Number(workerOvertimeHours[w.name] || 0);
               const isHalfDay = !!workerHalfDay[w.name];
               const hasSpecial = isHalfDay || overtime > 0;

               return (
                 <div
                   key={w.name}
                   className={`min-w-0 rounded-2xl border transition ${
                     selected
                       ? 'bg-blue-100 border-blue-600 shadow-sm'
                       : 'bg-white border-slate-300'
                   }`}
                 >
                   <button
                     type="button"
                     onClick={() => toggleWorkerSelection(w.name)}
                     className={`w-full min-h-[72px] px-2 py-3 text-center rounded-2xl transition ${
                       selected ? 'active:bg-blue-200' : 'active:bg-slate-100'
                     }`}
                   >
                     <div
                       className={`text-[19px] leading-tight font-semibold break-words ${
                         selected ? 'text-blue-950' : 'text-slate-900'
                       }`}
                     >
                       {selected ? '✓ ' : ''}{w.name}
                     </div>

                     {selected && hasSpecial && (
                       <div className="mt-1.5 text-[13px] leading-tight font-medium text-slate-600">
                         {[
                           isHalfDay ? '半日' : '',
                           overtime > 0 ? `残業${overtime}時間` : ''
                         ].filter(Boolean).join('・')}
                       </div>
                     )}
                   </button>

                   {selected && (
                     <div className="px-2 pb-2.5">
                       <button
                         type="button"
                         onClick={() => setWorkerOptionTarget(w.name)}
                         className="w-full h-10 rounded-xl border border-slate-300 bg-white text-[14px] font-medium text-slate-700 active:bg-slate-100"
                       >
                         勤務設定
                       </button>
                     </div>
                   )}
                 </div>
               );
             })}
           </div>

           {workerOptionTarget && (() => {
             const overtime = Number(workerOvertimeHours[workerOptionTarget] || 0);
             const isHalfDay = !!workerHalfDay[workerOptionTarget];

             return (
               <div className="fixed inset-0 z-[100] bg-black/45 flex items-end sm:items-center justify-center p-3">
                 <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">
                   <div className="p-5 border-b border-slate-200">
                     <div className="text-sm text-slate-500 mb-1">勤務設定</div>
                     <div className="text-[24px] leading-tight font-semibold text-slate-900">
                       {workerOptionTarget}
                     </div>
                   </div>

                   <div className="p-5 space-y-6">
                     <div>
                       <div className="text-[16px] font-medium text-slate-700 mb-3">
                         勤務区分
                       </div>
                       <div className="grid grid-cols-2 gap-3">
                         <button
                           type="button"
                           onClick={() =>
                             setWorkerHalfDay((prev) => ({
                               ...prev,
                               [workerOptionTarget]: false
                             }))
                           }
                           className={`h-14 rounded-2xl border-2 text-[17px] font-semibold transition ${
                             !isHalfDay
                               ? 'bg-blue-100 border-blue-600 text-blue-950'
                               : 'bg-white border-slate-300 text-slate-700'
                           }`}
                         >
                           通常勤務
                         </button>

                         <button
                           type="button"
                           onClick={() =>
                             setWorkerHalfDay((prev) => ({
                               ...prev,
                               [workerOptionTarget]: true
                             }))
                           }
                           className={`h-14 rounded-2xl border-2 text-[17px] font-semibold transition ${
                             isHalfDay
                               ? 'bg-amber-100 border-amber-500 text-amber-900'
                               : 'bg-white border-slate-300 text-slate-700'
                           }`}
                         >
                           半日
                         </button>
                       </div>
                     </div>

                     <div>
                       <div className="text-[16px] font-medium text-slate-700 mb-3">
                         残業時間
                       </div>

                       <div className="grid grid-cols-[56px_minmax(0,1fr)_56px] items-center gap-3">
                         <button
                           type="button"
                           onClick={() => changeWorkerOvertime(workerOptionTarget, -1)}
                           disabled={overtime <= 0}
                           className="h-14 rounded-2xl border-2 border-slate-300 bg-slate-50 text-[28px] font-medium text-slate-600 disabled:opacity-30 active:bg-slate-100"
                         >
                           −
                         </button>

                         <div className="h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-[18px] font-semibold text-slate-700">
                           残業{overtime}時間
                         </div>

                         <button
                           type="button"
                           onClick={() => changeWorkerOvertime(workerOptionTarget, 1)}
                           className="h-14 rounded-2xl border-2 border-blue-500 bg-blue-50 text-[28px] font-medium text-blue-700 active:bg-blue-100"
                         >
                           ＋
                         </button>
                       </div>
                     </div>

                     <button
                       type="button"
                       onClick={() => setWorkerOptionTarget(null)}
                       className="w-full h-14 rounded-2xl bg-slate-900 text-white text-[17px] font-semibold active:bg-slate-800"
                     >
                       設定を閉じる
                     </button>
                   </div>
                 </div>
               </div>
             );
           })()}
        </div>

        {/* 3. 外注会社・作業内容 */}
        <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-5">
          <div className="border-b pb-3 space-y-1">
            <span className="font-black text-lg text-orange-600 block">
              🏢 3. 外注会社・作業内容
            </span>
            <p className="text-xs md:text-sm font-bold text-slate-500">
              管理画面で登録した外注会社・作業内容から選択してください。
            </p>
          </div>

          {(settings.subcontractors || []).length === 0 ? (
            <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 text-sm font-medium text-slate-500">
              外注会社の登録がありません。
            </div>
          ) : (
            <div className="space-y-3">
              {Array.from(
                new Set(
                  (settings.subcontractors || [])
                    .map((s: any) => s.company)
                    .filter(Boolean)
                )
              ).map((company: any) => {
                const companyItems = (settings.subcontractors || []).filter(
                  (s: any) => s.company === company
                );

                return (
                  <div
                    key={company}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-3 space-y-2"
                  >
                    <div className="text-[16px] font-semibold text-slate-900 px-1">
                      {company}
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                      {companyItems.map((item: any, index: number) => {
                        const count = getSubcontractorCount(
                          item.company,
                          item.task
                        );
                        const selected = count > 0;

                        return (
                          <div
                            key={`${item.company}__${item.task}__${index}`}
                            className={`rounded-2xl border-2 p-3 transition ${
                              selected
                                ? 'bg-blue-50 border-blue-500'
                                : 'bg-white border-slate-200'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <button
                                type="button"
                                onClick={() =>
                                  changeSubcontractorCount(
                                    item.company,
                                    item.task,
                                    selected ? -count : 1
                                  )
                                }
                                className="min-w-0 flex-1 text-left py-1"
                              >
                                <div
                                  className={`text-[16px] leading-snug font-medium ${
                                    selected
                                      ? 'text-blue-950'
                                      : 'text-slate-900'
                                  }`}
                                >
                                  {selected ? '✓ ' : ''}
                                  {item.task || '作業内容未設定'}
                                </div>
                              </button>

                              {selected ? (
                                <div className="shrink-0 flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      changeSubcontractorCount(
                                        item.company,
                                        item.task,
                                        -1
                                      )
                                    }
                                    className="w-10 h-10 rounded-xl border border-slate-300 bg-white text-xl font-medium text-slate-600 active:bg-slate-100"
                                    aria-label={`${item.company} ${item.task} の人数を1人減らす`}
                                  >
                                    −
                                  </button>

                                  <div className="min-w-[52px] text-center text-[15px] font-semibold text-slate-800">
                                    {count}人
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      changeSubcontractorCount(
                                        item.company,
                                        item.task,
                                        1
                                      )
                                    }
                                    className="w-10 h-10 rounded-xl border border-blue-400 bg-blue-50 text-xl font-medium text-blue-700 active:bg-blue-100"
                                    aria-label={`${item.company} ${item.task} の人数を1人増やす`}
                                  >
                                    ＋
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() =>
                                    changeSubcontractorCount(
                                      item.company,
                                      item.task,
                                      1
                                    )
                                  }
                                  className="shrink-0 px-4 h-10 rounded-xl bg-slate-100 border border-slate-300 text-sm font-medium text-slate-700 active:bg-slate-200"
                                >
                                  選択
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {subcontractors.length > 0 && (
            <div className="rounded-2xl bg-blue-50 border border-blue-200 p-3">
              <div className="text-xs font-semibold text-blue-700 mb-1">
                選択中
              </div>
              <div className="text-sm font-medium text-slate-800 leading-relaxed">
                {subcontractors
                  .filter((s) => Number(s.count || 0) > 0)
                  .map(
                    (s) =>
                      `${s.company}／${s.task}：${Number(s.count || 0)}人`
                  )
                  .join('、')}
              </div>
            </div>
          )}
        </div>

        {/* 4. 重機・車両 */}
        <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-5">
           <div className="border-b pb-3">
             <span className="font-black text-lg text-orange-600">🚜 4. 重機・車両（複数選択可）</span>
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

        {/* 5. 燃料・経費 */}
        <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-4">
           <div className="border-b pb-3">
             <span className="font-black text-lg text-orange-600">⛽ 5. 燃料・経費</span>
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

        {/* 6. 処分場への搬出 */}
        <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-4">
           <div className="flex justify-between items-center border-b pb-3">
             <span className="font-black text-lg text-orange-600">🗑️ 6. 処分場への搬出</span>
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

        {/* 7. スクラップの搬出 */}
        <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-4">
           <div className="flex justify-between items-center border-b pb-3">
             <span className="font-black text-lg text-orange-600">♻️ 7. スクラップの搬出</span>
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

        {/* 8. 本日の作業内容 */}
        <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-4">
           <div className="border-b pb-3">
             <span className="font-black text-lg text-orange-600">📝 8. 本日の作業内容</span>
           </div>

           <div>
             <label className="text-base font-bold text-slate-800 block mb-2">本日の作業内容</label>
             <textarea
               placeholder="作業内容を入力してください"
               value={description}
               onChange={e=>setDescription(e.target.value)}
               className="w-full max-w-full min-w-0 p-4 rounded-2xl border-2 h-40 font-bold text-lg outline-none bg-white text-slate-950 box-border block"
             />
           </div>

           <div className="pt-4 border-t border-slate-200">
             <label className="text-base font-bold text-orange-700 block mb-2">
               📢 事務所への報告・相談
             </label>
             <div className="text-sm text-slate-500 mb-2 leading-relaxed">
               事務所へ伝えたいことや、相談したいことがあれば入力してください。
             </div>
             <textarea
               placeholder="〇〇について確認したい。など"
               value={officeMessage}
               onChange={e=>setOfficeMessage(e.target.value)}
               className="w-full max-w-full min-w-0 p-4 rounded-2xl border-2 border-orange-200 h-28 text-base font-medium outline-none bg-orange-50/40 text-slate-950 box-border block focus:border-orange-400"
             />
           </div>
        </div>

        <button type="submit" className="w-full bg-[#E56312] text-white font-black text-2xl py-5 rounded-3xl shadow-xl hover:bg-orange-700 transition">
          📩 日報を送信する
        </button>

      </form>
    </div>
  );
}
