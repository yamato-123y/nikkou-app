'use client';

import { useState, useEffect, Fragment, useRef } from 'react';
import * as XLSX from 'xlsx-js-style';

// リース品の互換識別：
// 過去日報の「〈業者名〉品名」を読み取りつつ、現在のマスタは「業者 + 品名」で区別する。
// 南大阪建機の従来データは品名だけの保存も引き続き認識する。
const parseLeaseSelectionValue = (value: any) => {
  const raw = String(value ?? '').trim();
  const matched = raw.match(/^〈([^〉]+)〉(.+)$/);
  if (matched) {
    return { raw, vendor: String(matched[1] || '').trim(), name: String(matched[2] || '').trim() };
  }
  return { raw, vendor: '', name: raw };
};

const getLeaseMasterCleanName = (master: any) =>
  parseLeaseSelectionValue(master?.name || '').name;

const getLeaseMasterVendor = (master: any, fallbackVendor = '') => {
  const explicit = String(master?.vendor || '').trim();
  if (explicit) return explicit;
  const legacy = parseLeaseSelectionValue(master?.name || '').vendor;
  return legacy || fallbackVendor;
};

const makeLeaseSelectionValue = (master: any, fallbackVendor = '') => {
  const name = getLeaseMasterCleanName(master);
  const vendor = getLeaseMasterVendor(master, fallbackVendor);
  if (!name) return '';
  // 南大阪建機は従来どおり品名だけで保存し、既存日報との互換性を最大限維持する。
  if (!vendor || vendor === '南大阪建機') return name;
  return `〈${vendor}〉${name}`;
};

const findLeaseMasterForSelection = (masters: any[], storedValue: any, fallbackVendor = '') => {
  const list = Array.isArray(masters) ? masters : [];
  const parsed = parseLeaseSelectionValue(storedValue);
  if (!parsed.name) return null;

  const candidates = list.filter((master: any) => getLeaseMasterCleanName(master) === parsed.name);

  if (parsed.vendor) {
    return candidates.find((master: any) => getLeaseMasterVendor(master, fallbackVendor) === parsed.vendor)
      || list.find((master: any) => String(master?.name || '').trim() === parsed.raw)
      || null;
  }

  if (fallbackVendor) {
    return candidates.find((master: any) => getLeaseMasterVendor(master, fallbackVendor) === fallbackVendor)
      || candidates.find((master: any) => !String(master?.vendor || '').trim())
      || candidates[0]
      || null;
  }

  return candidates.length === 1
    ? candidates[0]
    : (list.find((master: any) => String(master?.name || '').trim() === parsed.raw) || candidates[0] || null);
};

const formatLeaseSelectionLabel = (value: any) => {
  const parsed = parseLeaseSelectionValue(value);
  return parsed.vendor ? `${parsed.vendor}：${parsed.name}` : parsed.name;
};


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

// 20日締めの月次勤怠用。21日になったら翌月締めのページを初期表示する。
const getCurrentAttendanceYearMonth = () => {
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth() + (now.getDate() >= 21 ? 1 : 0), 1);
  return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}`;
};

const DEFAULT_COMPANY_CALENDARS: any = {
  '2025-2026': {
    yamato: {
      label: '大和社員',
      workHours: 8,
      sourceFileName: '大和社員カレンダー 2025-2026.pdf',
      pdfPath: '',
      holidays: [
        '2026-02-22','2026-02-23','2026-03-01','2026-03-07','2026-03-08','2026-03-15','2026-03-20',
        '2026-03-21','2026-03-22','2026-03-28','2026-03-29','2026-04-05','2026-04-11','2026-04-12','2026-04-18','2026-04-19',
        '2026-04-26','2026-04-29','2026-05-03','2026-05-04','2026-05-05','2026-05-06','2026-05-10','2026-05-16','2026-05-17',
        '2026-05-23','2026-05-24','2026-05-30','2026-05-31','2026-06-06','2026-06-07','2026-06-13','2026-06-14','2026-06-20',
        '2026-06-21','2026-06-27','2026-06-28','2026-07-05','2026-07-11','2026-07-12','2026-07-19','2026-07-20',
        '2026-07-26','2026-08-01','2026-08-02','2026-08-09','2026-08-11','2026-08-13','2026-08-14','2026-08-15','2026-08-16',
        '2026-08-22','2026-08-23','2026-08-29','2026-08-30','2026-09-05','2026-09-06','2026-09-12','2026-09-13','2026-09-20',
        '2026-09-21','2026-09-22','2026-09-23','2026-09-27','2026-10-04','2026-10-11','2026-10-12','2026-10-18',
        '2026-10-24','2026-10-25','2026-10-31','2026-11-01','2026-11-03','2026-11-07','2026-11-08','2026-11-14','2026-11-15'
      ]
    },
    trainee: {
      label: '実習生',
      workHours: 7,
      sourceFileName: '実習生カレンダー 2025-2026.pdf',
      pdfPath: '',
      holidays: [
        '2026-02-22','2026-02-23','2026-03-01','2026-03-08','2026-03-15','2026-03-20',
        '2026-03-21','2026-03-22','2026-04-05','2026-04-11','2026-04-12','2026-04-19',
        '2026-04-26','2026-04-29','2026-05-03','2026-05-04','2026-05-05','2026-05-06','2026-05-10','2026-05-17',
        '2026-05-24','2026-05-31','2026-06-06','2026-06-07','2026-06-13','2026-06-14',
        '2026-06-21','2026-06-28','2026-07-05','2026-07-12','2026-07-19','2026-07-20',
        '2026-07-26','2026-08-02','2026-08-09','2026-08-11','2026-08-13','2026-08-14','2026-08-15','2026-08-16',
        '2026-08-23','2026-08-29','2026-08-30','2026-09-06','2026-09-12','2026-09-13','2026-09-20',
        '2026-09-21','2026-09-22','2026-09-23','2026-09-27','2026-10-04','2026-10-11','2026-10-12','2026-10-18',
        '2026-10-25','2026-10-31','2026-11-01','2026-11-03','2026-11-08','2026-11-14','2026-11-15'
      ]
    }
  }
};

const mergeCompanyCalendars = (saved: any) => {
  const result = JSON.parse(JSON.stringify(DEFAULT_COMPANY_CALENDARS));
  Object.entries(saved || {}).forEach(([cycle, cycleValue]: any) => {
    result[cycle] = {
      ...(result[cycle] || {}),
      ...(cycleValue || {}),
      yamato: {
        ...(result[cycle]?.yamato || {}),
        ...(cycleValue?.yamato || {})
      },
      trainee: {
        ...(result[cycle]?.trainee || {}),
        ...(cycleValue?.trainee || {})
      }
    };
  });
  return result;
};

const getCalendarCycleForDate = (dateStr: string) => {
  const [y, m] = String(dateStr || '').split('-').map(Number);
  if (!y || !m) return '';
  return m >= 11 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
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

  // リース業者は「一般用」と「石川県用」を分離して管理する。
  // 既存データでは石川県用業者も leaseVendors に入っていたため、
  // 石川県用リース品の vendor を見て安全に振り分ける。品名・単価・過去日報は変更しない。
  const normalizeLeaseVendorSettings = (source: any) => {
    const data = source && typeof source === 'object' ? source : {};
    const nameOf = (value: any) => String(value?.name ?? value ?? '').trim();
    const itemVendorNames = (keys: string[]) => keys.flatMap((key) =>
      (Array.isArray(data[key]) ? data[key] : [])
        .map((item: any) => getLeaseMasterVendor(item))
        .filter(Boolean)
    );

    const normalUsed = new Set(itemVendorNames(['leaseHeavy', 'leaseAttach', 'leaseOther']));
    const ishikawaUsed = new Set(itemVendorNames(['ishikawaHeavy', 'ishikawaAttach', 'ishikawaOther']));
    const currentGeneral = Array.isArray(data.leaseVendors) ? data.leaseVendors : [];
    const currentIshikawa = Array.isArray(data.ishikawaLeaseVendors) ? data.ishikawaLeaseVendors : [];

    const generalMap = new Map<string, any>();
    currentGeneral.forEach((vendor: any) => {
      const name = nameOf(vendor);
      if (!name || name === '南大阪建機') return;
      if (ishikawaUsed.has(name) && !normalUsed.has(name)) return;
      generalMap.set(name, typeof vendor === 'object' ? { ...vendor, name } : { name });
    });
    normalUsed.forEach((name) => {
      if (!name || name === '南大阪建機') return;
      if (!generalMap.has(name)) generalMap.set(name, { name });
    });

    const ishikawaMap = new Map<string, any>();
    currentIshikawa.forEach((vendor: any) => {
      const name = nameOf(vendor);
      if (!name) return;
      ishikawaMap.set(name, typeof vendor === 'object' ? { ...vendor, name } : { name });
    });
    ishikawaUsed.forEach((name) => {
      if (!name) return;
      if (!ishikawaMap.has(name)) {
        const oldVendor = currentGeneral.find((vendor: any) => nameOf(vendor) === name);
        ishikawaMap.set(name, oldVendor && typeof oldVendor === 'object' ? { ...oldVendor, name } : { name });
      }
    });

    return {
      ...data,
      leaseVendors: Array.from(generalMap.values()),
      ishikawaLeaseVendors: Array.from(ishikawaMap.values())
    };
  };
  const [originalSettings, setOriginalSettings] = useState<any>({});
  const [isLoading, setIsLoading] = useState(false);

  const [modalLocation, setModalLocation] = useState<string | null>(null);
  const [filterLocation, setFilterLocation] = useState('');
  const [form, setForm] = useState<any>({});
  // 詳細分析上部の「請負先・開始日」は入力中に日報全件へ即保存せず、
  // 画面内で編集してからまとめて保存する。
  const [projectMetaEdit, setProjectMetaEdit] = useState<{ client: string; startDate: string }>({
    client: '',
    startDate: ''
  });
  const [projectMetaDirty, setProjectMetaDirty] = useState(false);
  const [projectMetaSaving, setProjectMetaSaving] = useState(false);

  const [editingReport, setEditingReport] = useState<any | null>(null);
  // 日報の報告事項に対する管理者返信。返信は日報そのものへ保存し、報告者本人だけに表示する。
  const [replyingReport, setReplyingReport] = useState<any | null>(null);
  const [adminReplyDraft, setAdminReplyDraft] = useState('');
  const [adminReplySaving, setAdminReplySaving] = useState(false);
  const [showSaveToast, setShowSaveToast] = useState(false);
  const [showDisposalModal, setShowDisposalModal] = useState(false);
  const [showScrapModal, setShowScrapModal] = useState(false);
  const [showIshikawaLeaseModal, setShowIshikawaLeaseModal] = useState(false);

  const [showAllMonthlyDisposalModal, setShowAllMonthlyDisposalModal] = useState(false);
  const [showAllMonthlyScrapModal, setShowAllMonthlyScrapModal] = useState(false);
  const [checkedDisposalRows, setCheckedDisposalRows] = useState<{ [key: string]: boolean }>({});
  const [checkedScrapRows, setCheckedScrapRows] = useState<{ [key: string]: boolean }>({});
  const [scrapRowOverrides, setScrapRowOverrides] = useState<{ [key: string]: string }>({});
  // スクラップ場 × 月ごとの「いつ仕切ったか」日付
  // key: `${スクラップ場}__${YYYY-MM}`
  const [scrapSettlementDates, setScrapSettlementDates] = useState<{ [key: string]: string }>({});
  // 現場 × スクラップ場 × 月ごとの「仕切り書」確定合計
  const [monthlyScrapStatementTotals, setMonthlyScrapStatementTotals] = useState<{ [key: string]: string }>({});
  const [monthlyDisposalInvoices, setMonthlyDisposalInvoices] = useState<{ [key: string]: string }>({});
  const [disposalRowMemos, setDisposalRowMemos] = useState<{ [key: string]: string }>({});
  const [disposalMemoModal, setDisposalMemoModal] = useState<any | null>(null);
  const [leaseCustomPrices, setLeaseCustomPrices] = useState<any>({});
  // 詳細分析・月別処分一覧の金額編集は、入力中は画面内だけ変更し「保存」でSupabaseへまとめて送信
  const [financialDirty, setFinancialDirty] = useState(false);
  const [isFinancialSaving, setIsFinancialSaving] = useState(false);


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

  const deleteSitePhoto = async (path: string, locationName: string) => {
    if (authRole !== 'admin') return;
    if (!confirm('この写真を削除しますか？')) return;

    try {
      const res = await fetch('/api/site-photos', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data?.error || '写真の削除に失敗しました。');
        return;
      }
      await loadSitePhotos(locationName);
    } catch (e) {
      console.error(e);
      alert('写真の削除に失敗しました。');
    }
  };

  const [disposalDetailsOpen, setDisposalDetailsOpen] = useState<any>({});
  const [scrapDetailsOpen, setScrapDetailsOpen] = useState<any>({});
  const [reportSectionOpen, setReportSectionOpen] = useState<any>({});
  const [costOverrides, setCostOverrides] = useState<any>({});
  const [disposalOverrides, setDisposalOverrides] = useState<any>({});
  const [scrapOverrides, setScrapOverrides] = useState<any>({});
  const [fuelUnitPrices, setFuelUnitPrices] = useState<any>({});
  const [customSubcontractors, setCustomSubcontractors] = useState<any>({});
  // 日報由来の外注費を「業者＋作業内容」単位で確定額調整するための上書き
  const [subcontractorDetailOverrides, setSubcontractorDetailOverrides] = useState<any>({});
  // 旧：現場・月ごとの外注単価。過去設定との互換用に残す。
  const [subcontractorMonthlyUnitPrices, setSubcontractorMonthlyUnitPrices] = useState<any>({});
  // 現場・任意期間ごとの外注単価。締め日に合わせて 8/21〜9/20 のような期間指定ができる。
  const [subcontractorPeriodUnitPrices, setSubcontractorPeriodUnitPrices] = useState<any>({});
  // 期間単価を追加するときの入力内容。これは画面内だけで保持し、追加後に設定へ反映する。
  const [subcontractorPeriodDrafts, setSubcontractorPeriodDrafts] = useState<any>({});
  // 請求書照合：日報の外注明細を「その現場・その日・その行」だけ修正する上書き。
  // マスタ単価や他現場の日報には影響させない。
  const [subcontractorInvoiceOverrides, setSubcontractorInvoiceOverrides] = useState<any>({});
  const [showSubcontractorInvoiceModal, setShowSubcontractorInvoiceModal] = useState(false);
  const [subcontractorInvoiceFilter, setSubcontractorInvoiceFilter] = useState({ startDate: '', endDate: '', company: '' });
  const [subcontractorInvoiceEditingKey, setSubcontractorInvoiceEditingKey] = useState<string | null>(null);
  const [subcontractorInvoiceDrafts, setSubcontractorInvoiceDrafts] = useState<any>({});
  const [subcontractorInvoiceAmount, setSubcontractorInvoiceAmount] = useState('');
  // 外注以外の経費も、請求書と日ごとの明細を照合して行単位で修正する。
  // マスタ・他現場・元の日報は変更しない。
  const [expenseInvoiceLineOverrides, setExpenseInvoiceLineOverrides] = useState<any>({});
  const [showExpenseInvoiceModal, setShowExpenseInvoiceModal] = useState(false);
  const [showExpenseInvoiceDetails, setShowExpenseInvoiceDetails] = useState(false);
  const [expenseInvoiceCategory, setExpenseInvoiceCategory] = useState<{ key: string; label: string } | null>(null);
  const [expenseInvoiceFilter, setExpenseInvoiceFilter] = useState({ startDate: '', endDate: '', vendor: '' });
  const [expenseInvoiceEditingKey, setExpenseInvoiceEditingKey] = useState<string | null>(null);
  const [expenseInvoiceDrafts, setExpenseInvoiceDrafts] = useState<any>({});
  const [expenseInvoiceAmount, setExpenseInvoiceAmount] = useState('');
  const [expenseInvoiceReconcileEditingId, setExpenseInvoiceReconcileEditingId] = useState<string | null>(null);
  // 請求書照合を実施した記録。変更がなくても「確認済み」を残せる。
  const [invoiceReconcileStatus, setInvoiceReconcileStatus] = useState<any>({});
  // 請求書照合の履歴。対象期間・照合日時・請求書金額・差額を現場／カテゴリーごとに残す。
  const [invoiceReconcileHistory, setInvoiceReconcileHistory] = useState<any>({});
  const [invoiceHistoryOpen, setInvoiceHistoryOpen] = useState<any>({});
  // 日報入力画面へ表示する管理者アナウンス。表示期間を指定して公開する。
  const [dailyAnnouncementDraft, setDailyAnnouncementDraft] = useState(() => {
    const today = new Date().toLocaleDateString('sv-SE');
    const end = new Date();
    end.setDate(end.getDate() + 7);
    return {
      title: '',
      message: '',
      startDate: today,
      endDate: end.toLocaleDateString('sv-SE'),
      priority: 'normal' as 'normal' | 'important'
    };
  });
  const [dailyAnnouncementSaving, setDailyAnnouncementSaving] = useState(false);
  // 現場ごとの突発的な追加経費（管理画面から自由追加）
  const [customExtraExpenses, setCustomExtraExpenses] = useState<any>({});
  const [customSubForm, setCustomSubForm] = useState<{ [key: string]: { company: string; task: string; price: string } }>({});

  const [subcontractorSectionOpen, setSubcontractorSectionOpen] = useState(false);
  const [subcontractorEstimateOpen, setSubcontractorEstimateOpen] = useState(false);
  const [deletingCompletedSite, setDeletingCompletedSite] = useState<string | null>(null);

  const [editingCostFields, setEditingCostFields] = useState<any>({});
  const [showAdminSection, setShowAdminSection] = useState(false);
  const [showCalendarSection, setShowCalendarSection] = useState(false);
  const [showReportCalendarSection, setShowReportCalendarSection] = useState(true);
  const [showMonthlyAttendance, setShowMonthlyAttendance] = useState(false);
  const [attendanceYearMonth, setAttendanceYearMonth] = useState(() => getCurrentAttendanceYearMonth());

  // 月次勤怠の現場クリックカウントは「数えるためだけ」の一時チェック。
  // Supabaseには保存せず、この画面を開いている間だけ保持する。
  // 値はクリック順（1, 2, 3...）。解除すると後ろの番号を自動で詰める。
  const [travelAllowanceMarks, setTravelAllowanceMarks] = useState<{
    [workerName: string]: { [dateStr: string]: number }
  }>({});
  // 月次勤怠の個別休日変更：会社カレンダーは変えず、作業員ごとに休みの日だけ移動する。
  const [selectedHolidayMove, setSelectedHolidayMove] = useState<{ workerName: string; fromDate: string } | null>(null);
  // 月次勤怠の手動変更は、操作ごとに保存せず最後にまとめて保存する。
  const [attendanceChangesDirty, setAttendanceChangesDirty] = useState(false);
  const [attendanceChangesSaving, setAttendanceChangesSaving] = useState(false);
  // 月次勤怠表の作業員並び順を、区分内だけドラッグで変更する。
  const [draggedAttendanceWorker, setDraggedAttendanceWorker] = useState<{ name: string; calendarType: string } | null>(null);

  const attendanceTopScrollRef = useRef<HTMLDivElement | null>(null);
  const attendanceTableScrollRef = useRef<HTMLDivElement | null>(null);

  const [showCompanyCalendarSection, setShowCompanyCalendarSection] = useState(false);
  const [companyCalendars, setCompanyCalendars] = useState<any>(() => mergeCompanyCalendars({}));
  const [companyCalendarCycle, setCompanyCalendarCycle] = useState('2025-2026');
  const [companyCalendarPattern, setCompanyCalendarPattern] = useState<'yamato' | 'trainee'>('yamato');
  const [companyCalendarEditMonth, setCompanyCalendarEditMonth] = useState('2026-09');
  const [companyCalendarSaving, setCompanyCalendarSaving] = useState(false);
  const [companyCalendarUploading, setCompanyCalendarUploading] = useState(false);

  const [disposalFilterQuery, setDisposalFilterQuery] = useState('');
  const [disposalStartDate, setDisposalStartDate] = useState('');
  const [disposalEndDate, setDisposalEndDate] = useState('');
  const [disposalSiteFilter, setDisposalSiteFilter] = useState('');

  const [calendarReportModal, setCalendarReportModal] = useState<{ date: string; location: string; reports: any[] } | null>(null);

  const [calendarYearMonth, setCalendarYearMonth] = useState(() => getCurrentYearMonth());
  // 社長モード専用UX：スマホで「何を確認したいか」から入る
  const [viewerSection, setViewerSection] = useState<'home' | 'sites' | 'costs' | 'reports' | 'attendance'>('home');
  // 社長モード詳細分析：経費内訳の開閉
  const [viewerExpenseDetailKey, setViewerExpenseDetailKey] = useState<string | null>(null);

  // 社長モード専用・簡易工程表（試験版）
  // ※ この試験版はSupabaseへ保存しません。画面を再読み込みするとリセットされます。
  const [showTrialSchedule, setShowTrialSchedule] = useState(false);
  const [trialScheduleLocation, setTrialScheduleLocation] = useState('');
  const [trialScheduleMonth, setTrialScheduleMonth] = useState(() => getCurrentYearMonth());
  const [trialScheduleTasks, setTrialScheduleTasks] = useState<any[]>([]);
  const [trialScheduleDrag, setTrialScheduleDrag] = useState<any | null>(null);
  const [trialResourceDrag, setTrialResourceDrag] = useState<any | null>(null);
  const [trialResourceDragPos, setTrialResourceDragPos] = useState<{ x: number; y: number } | null>(null);

  const fetchData = async () => {
    try {
      setIsLoading(true);

      // Render / Supabase の初回アクセス直後に一時的な空応答が返っても、
      // その空データをそのまま管理画面へ採用しないよう最大3回まで自動再取得する。
      // 保存データやAPIの形式は変更せず、読み込み時だけ安全性を高める。
      let loadedReports: any[] | null = null;
      let loadedSettings: any = null;
      let lastError: any = null;

      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          const [resR, resS] = await Promise.all([
            fetch('/api/reports', { cache: 'no-store' }),
            fetch('/api/settings', { cache: 'no-store' })
          ]);

          if (!resR.ok || !resS.ok) {
            throw new Error(`データ取得に失敗しました。reports=${resR.status}, settings=${resS.status}`);
          }

          const [rData, sData] = await Promise.all([resR.json(), resS.json()]);
          const reportsOk = Array.isArray(rData);
          const settingsOk = !!sData && typeof sData === 'object' && Object.keys(sData).length > 0;

          // このシステムでは設定データが常に存在するため、settings が空なら
          // 初回アクセス時の一時的な取得失敗とみなし、少し待って再試行する。
          if ((!reportsOk || !settingsOk) && attempt < 2) {
            await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
            continue;
          }

          if (!reportsOk || !settingsOk) {
            throw new Error('管理画面データが空の状態で返されました。');
          }

          loadedReports = rData;
          loadedSettings = sData;
          break;
        } catch (e) {
          lastError = e;
          if (attempt < 2) {
            await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
          }
        }
      }

      if (!loadedReports || !loadedSettings) {
        throw lastError || new Error('管理画面データを取得できませんでした。');
      }

      setReports(loadedReports);

      const sData = loadedSettings;
      const normalizedSettings = normalizeLeaseVendorSettings(sData);
      setSettings(normalizedSettings);
      setOriginalSettings(JSON.parse(JSON.stringify(normalizedSettings)));
      if (sData.costOverrides) setCostOverrides(sData.costOverrides);
      if (sData.disposalOverrides) setDisposalOverrides(sData.disposalOverrides);
      if (sData.scrapOverrides) setScrapOverrides(sData.scrapOverrides);
      if (sData.scrapRowOverrides) setScrapRowOverrides(sData.scrapRowOverrides);
      if (sData.scrapSettlementDates) setScrapSettlementDates(sData.scrapSettlementDates);
      if (sData.checkedScrapRows) setCheckedScrapRows(sData.checkedScrapRows);
      if (sData.monthlyScrapStatementTotals) setMonthlyScrapStatementTotals(sData.monthlyScrapStatementTotals);
      if (sData.fuelUnitPrices) setFuelUnitPrices(sData.fuelUnitPrices);
      if (sData.customSubcontractors) setCustomSubcontractors(sData.customSubcontractors);
      if (sData.subcontractorDetailOverrides) setSubcontractorDetailOverrides(sData.subcontractorDetailOverrides);
      if (sData.subcontractorMonthlyUnitPrices) setSubcontractorMonthlyUnitPrices(sData.subcontractorMonthlyUnitPrices);
      if (sData.subcontractorPeriodUnitPrices) setSubcontractorPeriodUnitPrices(sData.subcontractorPeriodUnitPrices);
      if (sData.subcontractorInvoiceOverrides) setSubcontractorInvoiceOverrides(sData.subcontractorInvoiceOverrides);
      if (sData.expenseInvoiceLineOverrides) setExpenseInvoiceLineOverrides(sData.expenseInvoiceLineOverrides);
      if (sData.invoiceReconcileStatus) setInvoiceReconcileStatus(sData.invoiceReconcileStatus);
      if (sData.invoiceReconcileHistory) setInvoiceReconcileHistory(sData.invoiceReconcileHistory);
      if (sData.customExtraExpenses) setCustomExtraExpenses(sData.customExtraExpenses);
      if (sData.monthlyDisposalInvoices) setMonthlyDisposalInvoices(sData.monthlyDisposalInvoices);
      if (sData.disposalRowMemos) setDisposalRowMemos(sData.disposalRowMemos);
      if (sData.leaseCustomPrices) setLeaseCustomPrices(sData.leaseCustomPrices);
      if (sData.checkedDisposalRows) setCheckedDisposalRows(sData.checkedDisposalRows);
      setCompanyCalendars(mergeCompanyCalendars(sData.companyCalendars || {}));
    } catch (e) {
      console.error(e);
      alert('データの読み込みに失敗しました。自動再取得でも復旧できなかったため、「最新の状態にする」を押してください。');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthed && authRole) fetchData();
  }, [isAuthed, authRole]);

  // 未保存の勤怠・原価・請負先/開始日がある状態で、
  // ブラウザ更新・タブを閉じる・別ページへ移動しようとした時に警告する。
  useEffect(() => {
    const hasUnsavedChanges = attendanceChangesDirty || financialDirty || projectMetaDirty;
    if (!hasUnsavedChanges) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [attendanceChangesDirty, financialDirty, projectMetaDirty]);

  useEffect(() => {
    if (modalLocation) {
      loadSitePhotos(modalLocation);

      const targetNames = getTargetLocationNames(modalLocation);
      const locReports = reports.filter((r: any) => targetNames.includes(r.location));
      const clients = Array.from(new Set(locReports.map((r: any) => r.client).filter(Boolean)));
      const startDates = Array.from(new Set(locReports.map((r: any) => r.startDate).filter(Boolean))).sort();
      const locationMaster = (settings.locations || []).find((loc: any) =>
        (typeof loc === 'string' ? loc : loc?.name) === modalLocation
      );
      const masterClient = typeof locationMaster === 'object' ? String(locationMaster?.clientName || '').trim() : '';
      const masterStartDate = typeof locationMaster === 'object' ? String(locationMaster?.startDate || '').trim() : '';

      setProjectMetaEdit({
        client: masterClient || clients.join(', ') || '',
        startDate: masterStartDate || startDates[0] || ''
      });
      setProjectMetaDirty(false);
    } else {
      setSitePhotos({ before: [], after: [] });
      setProjectMetaEdit({ client: '', startDate: '' });
      setProjectMetaDirty(false);
    }
  }, [modalLocation]);



  const trialDayWidth = 54;

  const trialParseYmd = (value: string) => {
    const [y, m, d] = String(value || '').split('-').map(Number);
    if (!y || !m || !d) return null;
    return new Date(Date.UTC(y, m - 1, d));
  };

  const trialFormatYmd = (date: Date) =>
    `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;

  const trialAddDays = (value: string, days: number) => {
    const d = trialParseYmd(value);
    if (!d) return value;
    d.setUTCDate(d.getUTCDate() + days);
    return trialFormatYmd(d);
  };

  const trialDiffDays = (from: string, to: string) => {
    const a = trialParseYmd(from);
    const b = trialParseYmd(to);
    if (!a || !b) return 0;
    return Math.round((b.getTime() - a.getTime()) / 86400000);
  };

  const trialMonthDays = (ym: string) => {
    const [y, m] = ym.split('-').map(Number);
    if (!y || !m) return [];
    const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
    return Array.from({ length: last }, (_, i) => `${ym}-${String(i + 1).padStart(2, '0')}`);
  };

  const getTrialResourceCatalog = () => {
    const workers = (settings.workers || []).map((x: any) => ({
      id: `worker__${x.name}`,
      type: 'worker',
      label: x.name,
      detail: '社員'
    }));
    const machines = (settings.companyMachines || []).map((x: any) => ({
      id: `machine__${x.name}`,
      type: 'machine',
      label: x.name,
      detail: '自社重機'
    }));
    const vehicles = (settings.vehicles || []).map((x: any) => ({
      id: `vehicle__${x.name}`,
      type: 'vehicle',
      label: x.name,
      detail: '車両'
    }));
    const subcontractors = (settings.subcontractors || []).map((x: any) => ({
      id: `sub__${x.company}__${x.task}`,
      type: 'subcontractor',
      label: x.company,
      detail: x.task || '外注'
    }));
    return { workers, machines, vehicles, subcontractors };
  };

  const trialResourceIcon = (type: string) =>
    type === 'worker' ? '👷' :
    type === 'machine' ? '🚜' :
    type === 'vehicle' ? '🚚' : '🏢';

  const addTrialScheduleTask = () => {
    if (!trialScheduleLocation) {
      alert('先に現場を選択してください。');
      return;
    }
    const start = `${trialScheduleMonth}-01`;
    setTrialScheduleTasks(prev => [
      ...prev,
      {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        name: '新しい工程',
        start,
        end: trialAddDays(start, 2),
        completed: false,
        resources: []
      }
    ]);
  };

  const patchTrialTask = (taskId: string, patch: any) => {
    setTrialScheduleTasks(prev =>
      prev.map(task => task.id === taskId ? { ...task, ...patch } : task)
    );
  };

  const addTrialResourceToTask = (taskId: string, resource: any) => {
    setTrialScheduleTasks(prev =>
      prev.map(task => {
        if (task.id !== taskId) return task;
        const resources = Array.isArray(task.resources) ? task.resources : [];
        const existing = resources.find((r: any) => r.id === resource.id);
        return {
          ...task,
          resources: existing
            ? resources.map((r: any) =>
                r.id === resource.id
                  ? { ...r, quantity: Math.max(1, Number(r.quantity || 1) + 1) }
                  : r
              )
            : [...resources, { ...resource, quantity: 1 }]
        };
      })
    );
  };

  const changeTrialResourceQty = (taskId: string, resourceId: string, delta: number) => {
    setTrialScheduleTasks(prev =>
      prev.map(task => {
        if (task.id !== taskId) return task;
        return {
          ...task,
          resources: (task.resources || [])
            .map((r: any) =>
              r.id === resourceId
                ? { ...r, quantity: Math.max(0, Number(r.quantity || 1) + delta) }
                : r
            )
            .filter((r: any) => Number(r.quantity || 0) > 0)
        };
      })
    );
  };

  const startTrialTaskDrag = (e: React.PointerEvent, task: any, mode: 'move' | 'resize') => {
    e.preventDefault();
    e.stopPropagation();
    setTrialScheduleDrag({
      taskId: task.id,
      mode,
      startX: e.clientX,
      originalStart: task.start,
      originalEnd: task.end,
      deltaDays: 0
    });
  };

  useEffect(() => {
    if (!trialScheduleDrag) return;

    const move = (e: PointerEvent) => {
      const deltaDays = Math.round((e.clientX - trialScheduleDrag.startX) / trialDayWidth);
      if (deltaDays === trialScheduleDrag.deltaDays) return;

      setTrialScheduleDrag((prev: any) => prev ? { ...prev, deltaDays } : prev);
      setTrialScheduleTasks(prev =>
        prev.map(task => {
          if (task.id !== trialScheduleDrag.taskId) return task;

          if (trialScheduleDrag.mode === 'move') {
            return {
              ...task,
              start: trialAddDays(trialScheduleDrag.originalStart, deltaDays),
              end: trialAddDays(trialScheduleDrag.originalEnd, deltaDays)
            };
          }

          const candidateEnd = trialAddDays(trialScheduleDrag.originalEnd, deltaDays);
          return {
            ...task,
            end: trialDiffDays(trialScheduleDrag.originalStart, candidateEnd) < 0
              ? trialScheduleDrag.originalStart
              : candidateEnd
          };
        })
      );
    };

    const up = () => setTrialScheduleDrag(null);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [trialScheduleDrag]);

  const startTrialResourceDrag = (e: React.PointerEvent, resource: any) => {
    e.preventDefault();
    e.stopPropagation();
    setTrialResourceDrag(resource);
    setTrialResourceDragPos({ x: e.clientX, y: e.clientY });
  };

  useEffect(() => {
    if (!trialResourceDrag) return;

    const move = (e: PointerEvent) => {
      setTrialResourceDragPos({ x: e.clientX, y: e.clientY });
    };

    const up = (e: PointerEvent) => {
      const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      const row = el?.closest?.('[data-trial-task-drop]') as HTMLElement | null;
      const taskId = row?.dataset?.trialTaskDrop;
      if (taskId) addTrialResourceToTask(taskId, trialResourceDrag);
      setTrialResourceDrag(null);
      setTrialResourceDragPos(null);
    };

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [trialResourceDrag]);

  const saveLocationBillingField = async (
    locationName: string,
    field: 'closingDay',
    value: string
  ) => {
    if (authRole !== 'admin') return;

    try {
      const nextLocations = (settings.locations || []).map((loc: any) => {
        const locName = typeof loc === 'string' ? loc : loc?.name;
        if (locName !== locationName) return loc;

        const base =
          typeof loc === 'string'
            ? { name: loc, shortName: '', price: 0, isFinished: false }
            : { ...loc };

        return {
          ...base,
          [field]: value
        };
      });

      const newData = {
        ...settings,
        locations: nextLocations
      };

      setSettings(newData);

      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newData)
      });

      if (!res.ok) {
        throw new Error('保存に失敗しました。');
      }

      setOriginalSettings(JSON.parse(JSON.stringify(newData)));
      setShowSaveToast(true);
      setTimeout(() => setShowSaveToast(false), 1800);
    } catch (e) {
      console.error(e);
      alert('締め日の保存に失敗しました。');
      fetchData();
    }
  };

  const isStorageYardLocation = (loc: any) => {
    const name = typeof loc === 'string' ? loc : loc?.name;
    const type = typeof loc === 'string' ? '' : loc?.locationType;
    return type === 'yard' || name === '置場';
  };

  const getStorageYardManager = (loc: any) => {
    if (typeof loc === 'string') return '湯浅';
    return loc?.yardManager || '湯浅';
  };

  const getLocationShortName = (locationName: string) => {
    const master = (settings.locations || []).find((loc: any) => {
      const fullName = typeof loc === 'string' ? loc : loc?.name;
      return fullName === locationName;
    });

    if (!master || typeof master === 'string') return locationName;

    const shortName = String(master.shortName || '').trim();
    return shortName || locationName;
  };

  const isIshikawaAttendanceSite = (siteName: string) => {
    const fullName = String(siteName || '');
    const shortName = getLocationShortName(fullName);
    return fullName.includes('石川県') || shortName === '石川県' || shortName.includes('石川');
  };

  const toggleTravelAllowanceMark = (
    workerName: string,
    dateStr: string
  ) => {
    setTravelAllowanceMarks((prev) => {
      const workerMap = { ...(prev[workerName] || {}) };
      const currentNumber = Number(workerMap[dateStr] || 0);

      if (currentNumber > 0) {
        delete workerMap[dateStr];

        // 例: 1,2,3 の「2」を解除したら、3 を 2 に詰める。
        Object.keys(workerMap).forEach((key) => {
          const value = Number(workerMap[key] || 0);
          if (value > currentNumber) workerMap[key] = value - 1;
        });
      } else {
        const maxNumber = Math.max(
          0,
          ...Object.values(workerMap).map((value) => Number(value || 0))
        );
        workerMap[dateStr] = maxNumber + 1;
      }

      const next = {
        ...prev,
        [workerName]: workerMap
      };

      if (Object.keys(workerMap).length === 0) {
        delete next[workerName];
      }

      return next;
    });
  };

  const saveManualAttendanceStatus = (
    workerName: string,
    dateStr: string,
    status: '管理' | 'サンセイ' | '欠勤' | ''
  ) => {
    if (authRole !== 'admin') return;

    const current = settings.manualAttendanceOverrides || {};
    const workerMap = { ...(current[workerName] || {}) };

    if (status) workerMap[dateStr] = status;
    else delete workerMap[dateStr];

    const nextOverrides = { ...current, [workerName]: workerMap };
    if (Object.keys(workerMap).length === 0) delete nextOverrides[workerName];

    // 「欠勤」と有給は同じ日に重ならないようにする。
    if (status === '欠勤') {
      const currentPaidLeave = settings.paidLeaveOverrides || {};
      const paidLeaveWorkerMap = { ...(currentPaidLeave[workerName] || {}) };
      delete paidLeaveWorkerMap[dateStr];
      const nextPaidLeave = { ...currentPaidLeave };
      if (Object.keys(paidLeaveWorkerMap).length > 0) nextPaidLeave[workerName] = paidLeaveWorkerMap;
      else delete nextPaidLeave[workerName];

      setSettings((prev: any) => ({
        ...prev,
        manualAttendanceOverrides: nextOverrides,
        paidLeaveOverrides: nextPaidLeave
      }));
    } else {
      setSettings((prev: any) => ({ ...prev, manualAttendanceOverrides: nextOverrides }));
    }
    setAttendanceChangesDirty(true);
  };

  const getWorkerHolidayMoves = (workerName: string) => {
    const raw = settings.workerHolidayMoves?.[workerName];
    return Array.isArray(raw)
      ? raw.filter((x: any) => x?.from && x?.to)
      : [];
  };

  const isEffectiveWorkerHoliday = (
    worker: any,
    dateStr: string,
    baseHoliday: boolean
  ) => {
    // 月次勤怠表だけの個人別休日変更。日曜日も他の会社休日と同じように移動できる。
    // 日報そのものは変更せず、この表の休日判定だけを差し替える。
    const moves = getWorkerHolidayMoves(worker?.name || '');
    if (moves.some((x: any) => x.to === dateStr)) return true;
    if (moves.some((x: any) => x.from === dateStr)) return false;
    return baseHoliday;
  };

  const saveWorkerHolidayMove = (
    workerName: string,
    fromDate: string,
    toDate: string
  ) => {
    if (authRole !== 'admin' || !workerName || !fromDate || !toDate || fromDate === toDate) return;

    const allMoves = { ...(settings.workerHolidayMoves || {}) };
    const currentMoves = Array.isArray(allMoves[workerName])
      ? allMoves[workerName].map((x: any) => ({ ...x }))
      : [];

    const chainedIndex = currentMoves.findIndex((x: any) => x.to === fromDate);
    let nextMoves: any[];

    if (chainedIndex >= 0) {
      nextMoves = currentMoves.map((x: any, idx: number) =>
        idx === chainedIndex ? { ...x, to: toDate } : x
      );
    } else {
      nextMoves = [
        ...currentMoves.filter((x: any) => x.from !== fromDate),
        { from: fromDate, to: toDate }
      ];
    }

    nextMoves = nextMoves.filter(
      (x: any, idx: number, arr: any[]) =>
        arr.findIndex((y: any) => y.from === x.from && y.to === x.to) === idx
    );

    const nextAllMoves = { ...allMoves, [workerName]: nextMoves };
    setSettings((prev: any) => ({ ...prev, workerHolidayMoves: nextAllMoves }));
    setAttendanceChangesDirty(true);
  };

  const resetWorkerHolidayMove = (workerName: string, targetDate: string) => {
    if (authRole !== 'admin') return;

    const allMoves = { ...(settings.workerHolidayMoves || {}) };
    const currentMoves = Array.isArray(allMoves[workerName]) ? allMoves[workerName] : [];
    const nextMoves = currentMoves.filter((x: any) => x.to !== targetDate);
    const nextAllMoves = { ...allMoves };

    if (nextMoves.length > 0) nextAllMoves[workerName] = nextMoves;
    else delete nextAllMoves[workerName];

    setSettings((prev: any) => ({ ...prev, workerHolidayMoves: nextAllMoves }));
    setAttendanceChangesDirty(true);
  };

  const savePaidLeaveStatus = (
    workerName: string,
    dateStr: string,
    status: '有給' | '午前有給' | '午後有給' | ''
  ) => {
    if (authRole !== 'admin') return;

    const current = settings.paidLeaveOverrides || {};
    const workerMap = { ...(current[workerName] || {}) };

    if (status) workerMap[dateStr] = status;
    else delete workerMap[dateStr];

    const nextOverrides = { ...current, [workerName]: workerMap };
    if (Object.keys(workerMap).length === 0) delete nextOverrides[workerName];

    // 有給を設定した日は、手動の「欠勤」があれば解除する。
    if (status) {
      const currentManual = settings.manualAttendanceOverrides || {};
      const manualWorkerMap = { ...(currentManual[workerName] || {}) };
      if (manualWorkerMap[dateStr] === '欠勤') {
        delete manualWorkerMap[dateStr];
      }
      const nextManual = { ...currentManual };
      if (Object.keys(manualWorkerMap).length > 0) nextManual[workerName] = manualWorkerMap;
      else delete nextManual[workerName];

      setSettings((prev: any) => ({
        ...prev,
        paidLeaveOverrides: nextOverrides,
        manualAttendanceOverrides: nextManual
      }));
    } else {
      setSettings((prev: any) => ({ ...prev, paidLeaveOverrides: nextOverrides }));
    }
    setAttendanceChangesDirty(true);
  };

  const buildAttendanceChangeHistoryEntries = () => {
    const savedAt = new Date().toISOString();
    const entries: any[] = [];
    const makeId = (suffix: string) => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${suffix}`;

    const oldManual = originalSettings.manualAttendanceOverrides || {};
    const newManual = settings.manualAttendanceOverrides || {};
    const manualWorkers = new Set([...Object.keys(oldManual), ...Object.keys(newManual)]);
    manualWorkers.forEach((workerName: string) => {
      const oldMap = oldManual[workerName] || {};
      const newMap = newManual[workerName] || {};
      const dates = new Set([...Object.keys(oldMap), ...Object.keys(newMap)]);
      dates.forEach((date: string) => {
        const before = oldMap[date] || '';
        const after = newMap[date] || '';
        if (before === after) return;
        const detail = !before && after
          ? `「${after}」を設定`
          : before && !after
            ? `「${before}」を解除`
            : `「${before}」から「${after}」へ変更`;
        entries.push({ id: makeId(`${workerName}-${date}-manual`), savedAt, workerName, date, category: '手動勤怠', detail });
      });
    });

    const oldPaid = originalSettings.paidLeaveOverrides || {};
    const newPaid = settings.paidLeaveOverrides || {};
    const paidWorkers = new Set([...Object.keys(oldPaid), ...Object.keys(newPaid)]);
    paidWorkers.forEach((workerName: string) => {
      const oldMap = oldPaid[workerName] || {};
      const newMap = newPaid[workerName] || {};
      const dates = new Set([...Object.keys(oldMap), ...Object.keys(newMap)]);
      dates.forEach((date: string) => {
        const before = oldMap[date] || '';
        const after = newMap[date] || '';
        if (before === after) return;
        const detail = !before && after
          ? `「${after}」を設定`
          : before && !after
            ? `「${before}」を解除`
            : `「${before}」から「${after}」へ変更`;
        entries.push({ id: makeId(`${workerName}-${date}-paid`), savedAt, workerName, date, category: '有給', detail });
      });
    });

    const oldMoves = originalSettings.workerHolidayMoves || {};
    const newMoves = settings.workerHolidayMoves || {};
    const moveWorkers = new Set([...Object.keys(oldMoves), ...Object.keys(newMoves)]);
    moveWorkers.forEach((workerName: string) => {
      const oldByFrom = Object.fromEntries((Array.isArray(oldMoves[workerName]) ? oldMoves[workerName] : []).map((x: any) => [x.from, x.to]));
      const newByFrom = Object.fromEntries((Array.isArray(newMoves[workerName]) ? newMoves[workerName] : []).map((x: any) => [x.from, x.to]));
      const fromDates = new Set([...Object.keys(oldByFrom), ...Object.keys(newByFrom)]);
      fromDates.forEach((fromDate: string) => {
        const before = oldByFrom[fromDate] || '';
        const after = newByFrom[fromDate] || '';
        if (before === after) return;
        const detail = !before && after
          ? `休日を ${fromDate} → ${after} に振替`
          : before && !after
            ? `個別休日変更 ${fromDate} → ${before} を解除`
            : `個別休日変更を ${fromDate} → ${before} から ${fromDate} → ${after} に変更`;
        entries.push({ id: makeId(`${workerName}-${fromDate}-holiday`), savedAt, workerName, date: fromDate, category: '個別休日変更', detail });
      });
    });

    const oldOrder = Array.isArray(originalSettings.attendanceWorkerOrder) ? originalSettings.attendanceWorkerOrder : [];
    const newOrder = Array.isArray(settings.attendanceWorkerOrder) ? settings.attendanceWorkerOrder : [];
    if (JSON.stringify(oldOrder) !== JSON.stringify(newOrder)) {
      entries.push({ id: makeId('order'), savedAt, workerName: '全体', date: '', category: '表示順', detail: '作業員の表示順を変更' });
    }

    return entries;
  };

  const saveAttendanceChanges = async () => {
    if (authRole !== 'admin' || !attendanceChangesDirty || attendanceChangesSaving) return;

    try {
      setAttendanceChangesSaving(true);

      // 共有履歴は保存時に確定させる。保存直前に最新設定を読み、他の人の履歴をできるだけ取りこぼさない。
      const historyEntries = buildAttendanceChangeHistoryEntries();
      let latestHistory = Array.isArray(settings.attendanceChangeHistory)
        ? settings.attendanceChangeHistory
        : [];
      try {
        const latestRes = await fetch('/api/settings', { cache: 'no-store' });
        if (latestRes.ok) {
          const latestSettings = await latestRes.json();
          latestHistory = Array.isArray(latestSettings?.attendanceChangeHistory)
            ? latestSettings.attendanceChangeHistory
            : latestHistory;
        }
      } catch (historyFetchError) {
        console.warn('勤怠変更履歴の最新取得に失敗しました。現在画面の履歴を使います。', historyFetchError);
      }

      const attendanceChangeHistory = [...historyEntries, ...latestHistory]
        .filter((item: any, index: number, arr: any[]) =>
          item?.id && arr.findIndex((x: any) => x?.id === item.id) === index
        )
        .slice(0, 200);

      const payload = {
        manualAttendanceOverrides: settings.manualAttendanceOverrides || {},
        workerHolidayMoves: settings.workerHolidayMoves || {},
        paidLeaveOverrides: settings.paidLeaveOverrides || {},
        attendanceWorkerOrder: Array.isArray(settings.attendanceWorkerOrder)
          ? settings.attendanceWorkerOrder
          : [],
        attendanceChangeHistory
      };

      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('勤怠変更の保存に失敗しました。');

      setSettings((prev: any) => ({ ...prev, attendanceChangeHistory: payload.attendanceChangeHistory }));
      setOriginalSettings((prev: any) => ({ ...prev, ...payload }));
      setAttendanceChangesDirty(false);
      setSelectedHolidayMove(null);
      setShowSaveToast(true);
      setTimeout(() => setShowSaveToast(false), 1800);
    } catch (e) {
      console.error(e);
      alert('勤怠変更の保存に失敗しました。画面上の変更は残っています。もう一度「変更を保存」を押してください。');
    } finally {
      setAttendanceChangesSaving(false);
    }
  };

  const cancelAttendanceChanges = () => {
    if (!attendanceChangesDirty) return;
    if (!confirm('まだ保存していない勤怠変更をすべて取り消しますか？')) return;

    setSettings((prev: any) => ({
      ...prev,
      manualAttendanceOverrides: originalSettings.manualAttendanceOverrides || {},
      workerHolidayMoves: originalSettings.workerHolidayMoves || {},
      paidLeaveOverrides: originalSettings.paidLeaveOverrides || {},
      attendanceWorkerOrder: Array.isArray(originalSettings.attendanceWorkerOrder)
        ? originalSettings.attendanceWorkerOrder
        : []
    }));
    setSelectedHolidayMove(null);
    setAttendanceChangesDirty(false);
  };

  const getAttendancePeriodInfo = (ym: string) => {
    const [yearText, monthText] = ym.split('-');
    const year = Number(yearText);
    const month = Number(monthText);

    const start = new Date(year, month - 2, 21);
    const end = new Date(year, month - 1, 20);

    const toYmd = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const dates: string[] = [];
    const cursor = new Date(start);
    while (cursor <= end) {
      dates.push(toYmd(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }

    return {
      start,
      end,
      startYmd: toYmd(start),
      endYmd: toYmd(end),
      dates
    };
  };

  const attendancePeriodInfo = getAttendancePeriodInfo(attendanceYearMonth);

  const getCalendarEntryForWorker = (worker: any, dateStr: string) => {
    const calendarType = worker?.calendarType || 'none';
    if (calendarType === 'none') return null;

    const cycle = getCalendarCycleForDate(dateStr);
    return companyCalendars?.[cycle]?.[calendarType] || null;
  };

  const monthlyAttendanceRows = (() => {
    const { startYmd, endYmd, dates } = attendancePeriodInfo;

    const workerDayMap: Record<
      string,
      Record<string, { fraction: number; overtime: number; holidayWorkHours: number; sites: Set<string> }>
    > = {};

    reports.forEach((raw: any) => {
      const r =
        raw?.data && typeof raw.data === 'object'
          ? { ...raw.data, id: raw.id || raw.data.id }
          : raw || {};

      const reportDate = String(r.date || '').replace(/\//g, '-');
      if (!reportDate || reportDate < startYmd || reportDate > endYmd) return;

      const workers = Array.isArray(r.workers) ? r.workers : [];
      const halfDayMap =
        r.workerHalfDay && typeof r.workerHalfDay === 'object'
          ? r.workerHalfDay
          : {};
      const overtimeMap =
        r.workerOvertimeHours && typeof r.workerOvertimeHours === 'object'
          ? r.workerOvertimeHours
          : {};

      workers.forEach((workerName: string) => {
        if (!workerName) return;

        if (!workerDayMap[workerName]) workerDayMap[workerName] = {};
        if (!workerDayMap[workerName][reportDate]) {
          workerDayMap[workerName][reportDate] = {
            fraction: 0,
            overtime: 0,
            holidayWorkHours: 0,
            sites: new Set<string>()
          };
        }

        const day = workerDayMap[workerName][reportDate];
        const fraction = halfDayMap[workerName] ? 0.5 : 1;

        day.fraction = Math.min(1, day.fraction + fraction);
        day.overtime += Math.max(0, Number(overtimeMap[workerName] || 0));
        day.holidayWorkHours += Math.max(0, Number(r.workerHolidayWorkHours?.[workerName] || 0));
        if (r.location) day.sites.add(String(r.location));
      });
    });

    const masterNames = (settings.workers || [])
      .map((w: any) => w?.name)
      .filter(Boolean);

    const allNames = Array.from(
      new Set([...masterNames, ...Object.keys(workerDayMap)])
    );

    return allNames
      .map((name: string) => {
        const workerMaster =
          (settings.workers || []).find((w: any) => w.name === name) || {
            name,
            calendarType: 'none'
          };

        const calendarType = workerMaster?.calendarType || 'none';
        const holidayMovesForWorker = getWorkerHolidayMoves(name);

        const dayDetails = dates.map((date) => {
          // 個別休日変更は「休」の判定だけを移動する。
          // 日報から作った勤務実績（現場名・人工・残業等）は元の日付のまま固定し、
          // 休日を移動しても日報表示や勤怠実績そのものは一切移動させない。
          const displayActualDate = date;
          const actual = workerDayMap[name]?.[date];
          const calendarEntry = getCalendarEntryForWorker(workerMaster, date);
          const holidays = new Set(calendarEntry?.holidays || []);
          const isCalendarLinked = !!calendarEntry;
          const [displayY, displayM, displayD] = date.split('-').map(Number);
          const isJapaneseSunday = new Date(displayY, displayM - 1, displayD).getDay() === 0;
          const isJapaneseHoliday = getDayInfo(date).isHoliday;
          const noneCategoryHoliday = calendarType === 'none' && (isJapaneseSunday || isJapaneseHoliday);
          const baseHoliday = isCalendarLinked ? holidays.has(date) : noneCategoryHoliday;
          const isHoliday = isCalendarLinked
            ? isEffectiveWorkerHoliday(workerMaster, date, baseHoliday)
            : noneCategoryHoliday;
          const isScheduled = isCalendarLinked ? !isHoliday : false;
          const holidayMoves = holidayMovesForWorker;
          const holidayMove = holidayMoves.find((x: any) => x.to === date) || null;
          const holidayMovedFrom = holidayMoves.find((x: any) => x.from === date) || null;
          const manualStatus =
            settings.manualAttendanceOverrides?.[name]?.[date] || '';
          const paidLeaveStatus =
            settings.paidLeaveOverrides?.[name]?.[date] || '';
          const fraction = Number(actual?.fraction || 0);
          const attendanceFraction =
            fraction > 0 ? fraction : (manualStatus === '管理' || manualStatus === 'サンセイ') ? 1 : 0;

          const explicitHolidayWorkHours = Number(actual?.holidayWorkHours || 0);
          const [yy, mm, dd] = date.split('-').map(Number);
          const isSunday = new Date(yy, mm - 1, dd).getDay() === 0;
          const isAutoHolidayWork =
            fraction > 0 && isCalendarLinked && isHoliday;
          const defaultHolidayHours =
            Number(workerMaster?.shiftHours || 8) === 7 ? 7 : 8;
          const effectiveHolidayWorkHours =
            (isCalendarLinked && isHoliday)
              ? (explicitHolidayWorkHours > 0
                  ? explicitHolidayWorkHours
                  : isAutoHolidayWork
                    ? defaultHolidayHours
                    : 0)
              : 0;

          const sites = actual ? Array.from(actual.sites) : [];
          const isIshikawaWork =
            fraction > 0 &&
            sites.some((site: string) => isIshikawaAttendanceSite(site));
          const travelAllowanceMarkNumber =
            Number(travelAllowanceMarks?.[name]?.[date] || 0);
          const travelAllowanceMarked = travelAllowanceMarkNumber > 0;

          return {
            date,
            displayActualDate,
            fraction,
            attendanceFraction,
            manualStatus,
            paidLeaveStatus,
            overtime: Number(actual?.overtime || 0),
            holidayWorkHours: effectiveHolidayWorkHours,
            holidayWorkHoursExplicit: explicitHolidayWorkHours > 0,
            sites,
            isIshikawaWork,
            travelAllowanceMarked,
            travelAllowanceMarkNumber,
            isHoliday,
            isSunday,
            isScheduled,
            isCalendarLinked,
            baseHoliday,
            holidayMove,
            holidayMovedFrom
          };
        });

        const attendanceDays = dayDetails.filter((d) => d.attendanceFraction > 0).length;
        const equivalentDays = dayDetails.reduce(
          (sum, d) => sum + Number(d.attendanceFraction || 0),
          0
        );
        const halfDayCount = dayDetails.filter((d) => d.fraction === 0.5).length;
        const overtimeHours = dayDetails.reduce(
          (sum, d) => sum + Number(d.overtime || 0),
          0
        );

        const scheduledDays =
          calendarType === 'none'
            ? null
            : dayDetails.filter((d) => d.isScheduled).length;

        const calendarHours =
          calendarType === 'none'
            ? null
            : Number(
                dayDetails.find((d) => d.isCalendarLinked)
                  ? getCalendarEntryForWorker(workerMaster, dayDetails.find((d) => d.isCalendarLinked)!.date)?.workHours
                  : workerMaster?.shiftHours || 0
              );

        const scheduledHours =
          scheduledDays === null || calendarHours === null
            ? null
            : scheduledDays * calendarHours;

        // 右側の「欠勤」は、手動で「欠勤」を置いた日を必ずカウントする。
        // それ以外は従来どおり、会社カレンダー上の出勤日に勤務記録がない日を欠勤候補として数える。
        const manualAbsenceDays = dayDetails.filter(
          (d) => d.manualStatus === '欠勤'
        ).length;

        const automaticAbsenceCandidates =
          calendarType === 'none'
            ? 0
            : dayDetails.filter(
                (d) =>
                  d.manualStatus !== '欠勤' &&
                  d.isScheduled &&
                  d.attendanceFraction === 0 &&
                  !d.paidLeaveStatus
              ).length;

        const absenceCandidates = manualAbsenceDays + automaticAbsenceCandidates;

        const restHolidayWorkDays = dayDetails.filter((d) => {
          if (Number(d.holidayWorkHours || 0) <= 0) return false;
          return !d.isSunday;
        }).length;

        const restHolidayWorkHours = dayDetails.reduce((sum, d) => {
          if (Number(d.holidayWorkHours || 0) <= 0) return sum;
          return d.isSunday ? sum : sum + Number(d.holidayWorkHours || 0);
        }, 0);

        const legalHolidayWorkDays = dayDetails.filter((d) => {
          if (Number(d.holidayWorkHours || 0) <= 0) return false;
          return !!d.isSunday;
        }).length;

        const legalHolidayWorkHours = dayDetails.reduce((sum, d) => {
          if (Number(d.holidayWorkHours || 0) <= 0) return sum;
          return d.isSunday ? sum + Number(d.holidayWorkHours || 0) : sum;
        }, 0);

        const travelAllowanceDays = dayDetails.filter(
          (d) => d.travelAllowanceMarked
        ).length;

        const paidLeaveEquivalent = dayDetails.reduce((sum, d) => {
          if (d.paidLeaveStatus === '有給') return sum + 1;
          if (d.paidLeaveStatus === '午前有給' || d.paidLeaveStatus === '午後有給') {
            return sum + 0.5;
          }
          return sum;
        }, 0);

        return {
          name,
          isWeeklyPay: !!workerMaster?.isWeeklyPay,
          calendarType,
          attendanceDays,
          halfDayCount,
          equivalentDays,
          overtimeHours,
          scheduledDays,
          scheduledHours,
          absenceCandidates,
          restHolidayWorkDays,
          restHolidayWorkHours,
          legalHolidayWorkDays,
          legalHolidayWorkHours,
          travelAllowanceDays,
          paidLeaveEquivalent,
          details: dayDetails
        };
      })
      .sort((a: any, b: any) => {
        // 区分（社員 → 実習生 → 該当なし）は固定し、
        // 各区分の中は「マスタ情報 > 作業員」の登録順をそのまま使う。
        // マスタの並び順を上下変更して保存すると、この月次勤怠表にも反映される。
        const groupOrder: any = { yamato: 0, trainee: 1, none: 2 };
        const typeDiff =
          (groupOrder[a.calendarType] ?? 9) - (groupOrder[b.calendarType] ?? 9);
        if (typeDiff !== 0) return typeDiff;

        const customOrder = Array.isArray(settings.attendanceWorkerOrder)
          ? settings.attendanceWorkerOrder
          : [];
        const customA = customOrder.indexOf(a.name);
        const customB = customOrder.indexOf(b.name);
        if (customA >= 0 && customB >= 0) return customA - customB;

        const masterWorkers = Array.isArray(settings.workers) ? settings.workers : [];
        const aIndex = masterWorkers.findIndex((w: any) => w?.name === a.name);
        const bIndex = masterWorkers.findIndex((w: any) => w?.name === b.name);

        // まだ表内で並び替えていない人は、マスタ情報の登録順を使う。
        // 過去日報にだけ残っていて現在の作業員マスタにいない人は各区分の最後へ。
        if (aIndex >= 0 && bIndex >= 0) return aIndex - bIndex;
        if (aIndex >= 0) return -1;
        if (bIndex >= 0) return 1;
        return a.name.localeCompare(b.name, 'ja');
      });
  })();

  const saveCompanyCalendars = async (nextCalendars = companyCalendars) => {
    if (authRole !== 'admin') return;
    try {
      setCompanyCalendarSaving(true);
      const newData = { ...settings, companyCalendars: nextCalendars };
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newData)
      });
      if (!res.ok) throw new Error('会社カレンダーの保存に失敗しました。');

      setSettings(newData);
      setOriginalSettings(JSON.parse(JSON.stringify(newData)));
      setCompanyCalendars(nextCalendars);
      setShowSaveToast(true);
      setTimeout(() => setShowSaveToast(false), 2500);
    } catch (e) {
      console.error(e);
      alert('会社カレンダーの保存に失敗しました。');
    } finally {
      setCompanyCalendarSaving(false);
    }
  };

  const ensureCompanyCalendarCycle = (cycle: string) => {
    setCompanyCalendars((prev: any) => {
      if (prev?.[cycle]) return prev;
      return {
        ...prev,
        [cycle]: {
          yamato: {
            label: '大和社員',
            workHours: 8,
            sourceFileName: '',
            pdfPath: '',
            holidays: []
          },
          trainee: {
            label: '実習生',
            workHours: 7,
            sourceFileName: '',
            pdfPath: '',
            holidays: []
          }
        }
      };
    });
  };

  const toggleCompanyCalendarHoliday = (dateStr: string) => {
    setCompanyCalendars((prev: any) => {
      const cycleData = prev?.[companyCalendarCycle] || {};
      const current = cycleData?.[companyCalendarPattern] || {
        label: companyCalendarPattern === 'yamato' ? '大和社員' : '実習生',
        workHours: companyCalendarPattern === 'yamato' ? 8 : 7,
        holidays: []
      };
      const set = new Set(current.holidays || []);
      if (set.has(dateStr)) set.delete(dateStr);
      else set.add(dateStr);

      return {
        ...prev,
        [companyCalendarCycle]: {
          ...cycleData,
          [companyCalendarPattern]: {
            ...current,
            holidays: Array.from(set).sort()
          }
        }
      };
    });
  };

  const uploadCompanyCalendarPdf = async (file: File | null) => {
    if (!file) return;
    if (file.type !== 'application/pdf') {
      alert('PDFファイルを選択してください。');
      return;
    }

    try {
      setCompanyCalendarUploading(true);
      const formData = new FormData();
      formData.append('cycle', companyCalendarCycle);
      formData.append('pattern', companyCalendarPattern);
      formData.append('file', file);

      const res = await fetch('/api/company-calendar-files', {
        method: 'POST',
        body: formData
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'PDFアップロードに失敗しました。');

      const current = companyCalendars?.[companyCalendarCycle]?.[companyCalendarPattern] || {};
      const nextCalendars = {
        ...companyCalendars,
        [companyCalendarCycle]: {
          ...(companyCalendars?.[companyCalendarCycle] || {}),
          [companyCalendarPattern]: {
            ...current,
            label: companyCalendarPattern === 'yamato' ? '大和社員' : '実習生',
            workHours: companyCalendarPattern === 'yamato' ? 8 : 7,
            sourceFileName: file.name,
            pdfPath: data.path || '',
            holidays: current.holidays || []
          }
        }
      };
      setCompanyCalendars(nextCalendars);
      await saveCompanyCalendars(nextCalendars);
    } catch (e: any) {
      console.error(e);
      alert(e?.message || 'PDFアップロードに失敗しました。');
    } finally {
      setCompanyCalendarUploading(false);
    }
  };

  const openCompanyCalendarPdf = async () => {
    const path =
      companyCalendars?.[companyCalendarCycle]?.[companyCalendarPattern]?.pdfPath;
    if (!path) {
      alert('保存済みPDFがありません。');
      return;
    }
    const res = await fetch(
      `/api/company-calendar-files?path=${encodeURIComponent(path)}`
    );
    const data = await res.json().catch(() => ({}));
    if (res.ok && data?.url) {
      window.open(data.url, '_blank', 'noopener,noreferrer');
    } else {
      alert(data?.error || 'PDFを開けませんでした。');
    }
  };

  const exportMonthlyAttendanceExcel = () => {
    const { start, end, dates } = attendancePeriodInfo;
    const fmt = (d: Date) =>
      `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;

    const weekdayJa = ['日','月','火','水','木','金','土'];
    const headers = [
      '作業員',
      ...dates.map((d) => Number(d.slice(8))),
      '支払区分',
      'カレンダー',
      '労働時間',
      '普通残業',
      '欠勤候補',
      '休出',
      '法出',
      '出勤日数'
    ];

    const weekdayRow = [
      '',
      ...dates.map((d) => {
        const [y,m,day] = d.split('-').map(Number);
        return weekdayJa[new Date(y, m - 1, day).getDay()];
      }),
      '', '', '', '', '', '', '', ''
    ];

    const rows: any[][] = [
      ['株式会社大和　出勤確認表'],
      ['集計期間', `${fmt(start)} ～ ${fmt(end)}（20日締め）`],
      [],
      headers,
      weekdayRow
    ];

    monthlyAttendanceRows.forEach((row: any) => {
      const master = (settings.workers || []).find((w: any) => w.name === row.name);
      rows.push([
        row.name,
        ...row.details.map((d: any) => {
          if (d.fraction > 0) {
            const siteText = d.sites.map((site: string) => getLocationShortName(site)).join('・');
            const marks = [
              d.fraction === 0.5 ? '半日' : '',
              d.holidayWorkHours > 0 ? `${d.holidayWorkHours}時間` : '',
              d.overtime > 0 ? `残${d.overtime}h` : '',
              d.paidLeaveStatus || '',
              d.travelAllowanceMarked ? String(d.travelAllowanceMarkNumber || '') : ''
            ].filter(Boolean).join(' ');
            return [siteText, marks].filter(Boolean).join(' ');
          }

          if (d.manualStatus === '管理' || d.manualStatus === 'サンセイ') {
            return [d.manualStatus, d.paidLeaveStatus || ''].filter(Boolean).join(' ');
          }

          if (d.isHoliday) {
            return ['休', d.paidLeaveStatus || ''].filter(Boolean).join(' ');
          }

          if (d.paidLeaveStatus) return d.paidLeaveStatus;
          if (row.calendarType !== 'none' && d.isScheduled) return '欠勤?';
          return '';
        }),
        row.isWeeklyPay ? '週払い' : '月払い',
        row.calendarType === 'yamato'
          ? '大和社員'
          : row.calendarType === 'trainee'
            ? '実習生'
            : '該当なし',
        row.scheduledHours ?? '',
        row.overtimeHours,
        row.absenceCandidates,
        row.restHolidayWorkDays > 0 || row.restHolidayWorkHours > 0
          ? `${row.restHolidayWorkDays}日\n${row.restHolidayWorkHours}h`
          : '',
        row.legalHolidayWorkDays > 0 || row.legalHolidayWorkHours > 0
          ? `${row.legalHolidayWorkDays}日\n${row.legalHolidayWorkHours}h`
          : '',
        row.paidLeaveEquivalent > 0
          ? `${row.equivalentDays}日\n有給${row.paidLeaveEquivalent}`
          : `${row.equivalentDays}日`
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const dateCount = dates.length;
    const summaryStartCol = 1 + dateCount;

    ws['!freeze'] = { xSplit: 1, ySplit: 5 };
    ws['!cols'] = [
      { wch: 16 },
      ...dates.map(() => ({ wch: 9 })),
      { wch: 11 },
      { wch: 11 },
      { wch: 10 },
      { wch: 11 },
      { wch: 11 },
      { wch: 11 },
      { wch: 11 },
      { wch: 9 }
    ];

    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');

    for (let c = 0; c <= range.e.c; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r: 3, c })];
      if (cell) {
        cell.s = {
          font: { name: 'Yu Gothic', bold: true },
          alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
          fill: { fgColor: { rgb: c === 0 ? 'D9EAD3' : 'E2E8F0' } },
          border: {
            top: { style: 'thin', color: { rgb: '94A3B8' } },
            bottom: { style: 'thin', color: { rgb: '94A3B8' } },
            left: { style: 'thin', color: { rgb: '94A3B8' } },
            right: { style: 'thin', color: { rgb: '94A3B8' } }
          }
        };
      }
    }

    monthlyAttendanceRows.forEach((row: any, idx: number) => {
      const excelRow = 5 + idx;
      const markedSiteNames = new Set<string>(
        row.details
          .filter((detail: any) => Number(detail.travelAllowanceMarkNumber || 0) > 0)
          .flatMap((detail: any) => detail.sites || [])
      );
      row.details.forEach((d: any, dateIdx: number) => {
        const cell = ws[XLSX.utils.encode_cell({ r: excelRow, c: 1 + dateIdx })];
        if (!cell) return;

        let fill = 'FFFFFF';
        let fontColor = '0F172A';

        if (d.sites?.some((site: string) => markedSiteNames.has(site))) {
          fill = 'BFDBFE';
          fontColor = '075985';
        } else if (d.paidLeaveStatus && d.fraction === 0 && d.manualStatus !== '管理' && d.manualStatus !== 'サンセイ') {
          fill = 'F3E8FF';
          fontColor = '6B21A8';
        } else if (d.manualStatus === '管理' && d.fraction === 0) {
          fill = 'DBEAFE';
          fontColor = '1D4ED8';
        } else if (d.manualStatus === 'サンセイ' && d.fraction === 0) {
          fill = 'D1FAE5';
          fontColor = '047857';
        } else if (d.isHoliday) {
          fill = d.attendanceFraction > 0 ? 'FED7AA' : '374151';
          fontColor = d.attendanceFraction > 0 ? '9A3412' : 'FFFFFF';
        } else if (d.fraction === 0.5) {
          fill = 'FEF3C7';
        } else if (d.fraction > 0) {
          fill = 'FFFFFF';
        } else if (row.calendarType !== 'none' && d.isScheduled) {
          fill = 'FEE2E2';
          fontColor = 'B91C1C';
        }

        cell.s = {
          font: { name: 'Yu Gothic', color: { rgb: fontColor } },
          alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
          fill: { fgColor: { rgb: fill } },
          border: {
            top: { style: 'thin', color: { rgb: 'CBD5E1' } },
            bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
            left: { style: 'thin', color: { rgb: 'CBD5E1' } },
            right: { style: 'thin', color: { rgb: 'CBD5E1' } }
          }
        };
      });
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '出勤確認表');
    XLSX.writeFile(wb, `出勤確認表_${attendanceYearMonth}.xlsx`);
  };


  const handleLogin = (role: 'admin' | 'viewer') => {
    const targetPassword = role === 'viewer' ? viewerPassword : password;
    if (targetPassword === '19770323') {
      // 権限を確定してから認証済みにする。ログイン直後のデータ取得が
      // authRole 未確定の瞬間に走らないようにする。
      setAuthRole(role);
      setIsAuthed(true);
      setShowAdminSection(false);
      if (role === 'viewer') setViewerSection('home');
    } else {
      alert('パスワードが間違っています。');
    }
  };

  const getMasterAnnouncementCategory = (key: string) => {
    const labels: Record<string, string> = {
      jobTypes: '作業種別', subcontractors: '外注',
      leaseHeavy: 'リース重機', leaseAttach: 'リースアタッチメント', leaseOther: 'その他リース',
      ishikawaHeavy: '石川県リース重機', ishikawaAttach: '石川県アタッチメント', ishikawaOther: '石川県その他リース',
      companyMachines: '自社重機', vehicles: '自社車両',
      disposalLocations: '処分', scrapLocations: 'スクラップ',
      workers: '作業員', managers: '職長'
    };
    return labels[key] || 'マスタ';
  };

  const getMasterAnnouncementSignature = (key: string, item: any) => {
    if (typeof item === 'string') return item.trim();
    if (!item || typeof item !== 'object') return String(item || '');
    if (key === 'subcontractors') return `${item.company || ''}__${item.task || ''}`;
    if (key === 'disposalLocations' || key === 'scrapLocations') return `${item.location || ''}__${item.item || ''}`;
    return String(item.name || item.item || item.task || item.company || JSON.stringify(item));
  };

  const getMasterAnnouncementName = (key: string, item: any) => {
    if (typeof item === 'string') return item;
    if (!item || typeof item !== 'object') return String(item || '');
    if (key === 'subcontractors') return `${item.company || ''}${item.task ? ` / ${item.task}` : ''}`;
    if (key === 'disposalLocations' || key === 'scrapLocations') return `${item.location || ''}${item.item ? ` / ${item.item}` : ''}`;
    return String(item.name || item.item || item.task || item.company || '新規項目');
  };

  const makeAutomaticMasterAnnouncements = (key: string, oldList: any[], newList: any[]) => {
    // 自動お知らせは、日報入力者が手入力しやすいリース系6項目だけを対象にする。
    const autoNoticeTargetKeys = new Set([
      'leaseHeavy',
      'leaseAttach',
      'leaseOther',
      'ishikawaHeavy',
      'ishikawaAttach',
      'ishikawaOther'
    ]);
    if (!autoNoticeTargetKeys.has(key)) return [];
    const oldSignatures = new Set((oldList || []).map((x: any) => getMasterAnnouncementSignature(key, x)));
    const added = (newList || []).filter((x: any) => !oldSignatures.has(getMasterAnnouncementSignature(key, x)));
    if (added.length === 0) return [];

    const now = new Date();
    const startDate = now.toLocaleDateString('sv-SE');
    const end = new Date(now);
    end.setDate(end.getDate() + 7);
    const endDate = end.toLocaleDateString('sv-SE');
    const category = getMasterAnnouncementCategory(key);
    return added.map((item: any, idx: number) => ({
      id: `master-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 8)}`,
      type: 'master',
      title: `🆕 ${category}に新しい項目を追加しました`,
      message: `「${getMasterAnnouncementName(key, item)}」を項目に追加しました。手入力ではなく、リストにある場合はこちらを選択してください。`,
      category,
      startDate,
      endDate,
      createdAt: new Date().toISOString()
    }));
  };

  const publishDailyAnnouncement = async () => {
    if (authRole !== 'admin' || dailyAnnouncementSaving) return;
    const title = dailyAnnouncementDraft.title.trim();
    const message = dailyAnnouncementDraft.message.trim();
    if (!title || !message || !dailyAnnouncementDraft.startDate || !dailyAnnouncementDraft.endDate) {
      alert('タイトル・本文・表示開始日・表示終了日を入力してください。');
      return;
    }
    if (dailyAnnouncementDraft.startDate > dailyAnnouncementDraft.endDate) {
      alert('表示終了日は開始日以降にしてください。');
      return;
    }
    try {
      setDailyAnnouncementSaving(true);
      const item = {
        id: `notice-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type: 'manual',
        title,
        message,
        startDate: dailyAnnouncementDraft.startDate,
        endDate: dailyAnnouncementDraft.endDate,
        priority: dailyAnnouncementDraft.priority,
        createdAt: new Date().toISOString()
      };
      const nextAnnouncements = [item, ...(settings.dailyAnnouncements || [])];
      const newData = { ...settings, dailyAnnouncements: nextAnnouncements };
      const res = await fetch('/api/settings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newData)
      });
      if (!res.ok) throw new Error('お知らせの保存に失敗しました');
      setSettings(newData);
      setOriginalSettings(JSON.parse(JSON.stringify(newData)));
      const today = new Date().toLocaleDateString('sv-SE');
      const end = new Date(); end.setDate(end.getDate() + 7);
      setDailyAnnouncementDraft({ title: '', message: '', startDate: today, endDate: end.toLocaleDateString('sv-SE'), priority: 'normal' });
      alert('日報入力画面へのお知らせを公開しました。');
    } catch (e) {
      console.error(e);
      alert('お知らせの公開に失敗しました。');
    } finally {
      setDailyAnnouncementSaving(false);
    }
  };

  const deleteDailyAnnouncement = async (id: string) => {
    if (authRole !== 'admin') return;
    if (!confirm('このお知らせを削除しますか？')) return;
    const nextAnnouncements = (settings.dailyAnnouncements || []).filter((x: any) => x?.id !== id);
    const newData = { ...settings, dailyAnnouncements: nextAnnouncements };
    try {
      const res = await fetch('/api/settings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newData)
      });
      if (!res.ok) throw new Error('削除に失敗しました');
      setSettings(newData);
      setOriginalSettings(JSON.parse(JSON.stringify(newData)));
    } catch (e) {
      console.error(e);
      alert('お知らせの削除に失敗しました。');
    }
  };

  const deleteMasterAnnouncement = async (id: string) => {
    if (authRole !== 'admin') return;
    if (!confirm('この自動お知らせを削除しますか？')) return;
    const nextAnnouncements = (settings.masterAnnouncements || []).filter((x: any) => x?.id !== id);
    const newData = { ...settings, masterAnnouncements: nextAnnouncements };
    try {
      const res = await fetch('/api/settings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newData)
      });
      if (!res.ok) throw new Error('削除に失敗しました');
      setSettings(newData);
      setOriginalSettings(JSON.parse(JSON.stringify(newData)));
    } catch (e) {
      console.error(e);
      alert('自動お知らせの削除に失敗しました。');
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
      // 現場一覧以外のマスタ単価を保存する前に、
      // まだ固定されていない過去日報へ「その時点の単価」を保存する。
      // これにより、今回変更する単価は今後の日報だけに適用される。
      if (key !== 'locations') {
        await freezeExistingReportsIfNeeded();
      }

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

      const automaticMasterAnnouncements = makeAutomaticMasterAnnouncements(key, oldList, newList);
      const nextMasterAnnouncements = automaticMasterAnnouncements.length > 0
        ? [...automaticMasterAnnouncements, ...(settings.masterAnnouncements || [])].slice(0, 100)
        : (settings.masterAnnouncements || []);
      const newData = { ...settings, [key]: targetList, masterAnnouncements: nextMasterAnnouncements };
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
        const updatedReports = reports.map((raw: any) => {
          let reportChanged = false;

          // /api/reports の返却形式が
          // ① 日報データがそのまま入っている形式
          // ② { id, data: {...日報データ...} } の形式
          // のどちらでも過去日報を更新できるようにする。
          const isWrapped =
            raw?.data &&
            typeof raw.data === 'object' &&
            !Array.isArray(raw.data);

          let reportData = isWrapped
            ? { ...raw.data }
            : { ...raw };

          locationUpdates.forEach(u => {
            if (reportData.location === u.oldName) {
              reportData.location = u.newName;
              reportChanged = true;
            }

            if (Array.isArray(reportData.disposals)) {
              reportData.disposals = reportData.disposals.map((d: any) => {
                if (d.location === u.oldName) {
                  reportChanged = true;
                  return { ...d, location: u.newName };
                }
                return d;
              });
            }

            if (Array.isArray(reportData.scraps)) {
              reportData.scraps = reportData.scraps.map((sc: any) => {
                if (sc.location === u.oldName) {
                  reportChanged = true;
                  return { ...sc, location: u.newName };
                }
                return sc;
              });
            }
          });

          subUpdates.forEach(su => {
            if (Array.isArray(reportData.subcontractors)) {
              reportData.subcontractors = reportData.subcontractors.map((sub: any) => {
                if (sub.company === su.oldComp && sub.task === su.oldTask) {
                  reportChanged = true;
                  return { ...sub, company: su.newComp, task: su.newTask };
                }
                return sub;
              });
            }
          });

          if (!reportChanged) return raw;

          hasChanges = true;

          return {
            raw,
            reportData,
            targetId: raw.id || raw._id || reportData.id || reportData._id,
            changed: true
          };
        });

        if (hasChanges) {
          for (const item of updatedReports) {
            if (!item?.changed) continue;

            const targetId = item.targetId;
            if (!targetId) continue;

            const resReport = await fetch('/api/reports', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ...item.reportData,
                id: targetId
              })
            });

            if (!resReport.ok) {
              throw new Error(`過去日報の現場名更新に失敗しました。ID: ${targetId}`);
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

  const saveUnifiedLeaseMaster = async () => {
    if (authRole === 'viewer') return;
    if (isLoading) {
      alert('データを読み込み中です。しばらくお待ちください。');
      return;
    }
    try {
      await freezeExistingReportsIfNeeded();
      const keys = ['leaseHeavy', 'leaseAttach', 'leaseOther'];
      const announcements = keys.flatMap((key) =>
        makeAutomaticMasterAnnouncements(key, originalSettings[key] || [], settings[key] || [])
      );
      const nextMasterAnnouncements = announcements.length > 0
        ? [...announcements, ...(settings.masterAnnouncements || [])].slice(0, 100)
        : (settings.masterAnnouncements || []);
      const newData = { ...settings, masterAnnouncements: nextMasterAnnouncements };
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newData)
      });
      if (!res.ok) {
        alert('保存に失敗しました。');
        return;
      }
      setSettings(newData);
      setOriginalSettings(JSON.parse(JSON.stringify(newData)));
      alert('リースマスタを保存しました！');
      fetchData();
    } catch (e) {
      console.error(e);
      alert('通信エラーが発生しました。');
    }
  };

  const saveUnifiedIshikawaLeaseMaster = async () => {
    if (authRole === 'viewer') return;
    if (isLoading) {
      alert('データを読み込み中です。しばらくお待ちください。');
      return;
    }
    try {
      await freezeExistingReportsIfNeeded();
      const keys = ['ishikawaHeavy', 'ishikawaAttach', 'ishikawaOther'];
      const announcements = keys.flatMap((key) =>
        makeAutomaticMasterAnnouncements(key, originalSettings[key] || [], settings[key] || [])
      );
      const nextMasterAnnouncements = announcements.length > 0
        ? [...announcements, ...(settings.masterAnnouncements || [])].slice(0, 100)
        : (settings.masterAnnouncements || []);
      const newData = { ...settings, masterAnnouncements: nextMasterAnnouncements };
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newData)
      });
      if (!res.ok) {
        alert('保存に失敗しました。');
        return;
      }
      setSettings(newData);
      setOriginalSettings(JSON.parse(JSON.stringify(newData)));
      alert('石川県用リースマスタを保存しました！');
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

  const deleteCompletedSite = async (locName: string) => {
    if (authRole !== 'admin' || deletingCompletedSite) return;

    const finishedLoc = (settings.locations || []).find((l: any) => {
      const name = typeof l === 'string' ? l : l?.name;
      const isFinished = typeof l === 'object' ? !!l?.isFinished : false;
      return name === locName && isFinished;
    });

    if (!finishedLoc) {
      alert('完了済みの現場だけ削除できます。');
      return;
    }

    const backupOk = confirm(
      `⚠️ 現場データを完全削除します。\n\n` +
      `【${locName}】\n\n` +
      `この現場のExcel出力・Supabaseバックアップは済んでいますか？\n\n` +
      `削除すると、この現場の日報・現場別原価情報・写真などは元に戻せません。\n` +
      `社員・外注・車両・重機・処分場などのマスタと、他の現場は削除されません。`
    );

    if (!backupOk) return;

    const typed = prompt(
      `最終確認です。\n\n本当に削除する場合は、下の現場名をそのまま入力してください。\n\n${locName}`
    );

    if (typed !== locName) {
      alert('現場名が一致しないため、削除を中止しました。');
      return;
    }

    try {
      setDeletingCompletedSite(locName);

      const res = await fetch('/api/admin/delete-completed-site', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: locName,
          confirmation: typed
        })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(data?.error || '現場データの削除に失敗しました。');
        return;
      }

      if (modalLocation === locName) {
        setModalLocation(null);
      }

      await fetchData();

      alert(
        `削除しました。\n\n` +
        `現場：${locName}\n` +
        `削除した日報：${Number(data?.deletedReports || 0)}件\n` +
        `削除した写真：${Number(data?.deletedPhotos || 0)}枚\n\n` +
        `他の現場・マスタ登録情報は変更していません。`
      );
    } catch (e) {
      console.error(e);
      alert('通信エラーが発生しました。削除結果を確認してから再操作してください。');
    } finally {
      setDeletingCompletedSite(null);
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

    // 詳細分析では複数の表記違い現場を1現場としてまとめる場合がある。
    // 月別処分一覧と同じ元の日報現場名へ保存し、両画面の金額を必ず一致させる。
    const nextAllOverrides = { ...disposalOverrides };

    rows.forEach((row: any) => {
      const targetLocation = row.locationName || locName;
      const targetOverrides = { ...(nextAllOverrides[targetLocation] || {}) };
      const subKey = `unitPrice__${disposalName}__${yearMonth}__${row.dateKey}__${itemKey}`;
      targetOverrides[subKey] = val;
      nextAllOverrides[targetLocation] = targetOverrides;
    });

    setDisposalOverrides(nextAllOverrides);
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

    const isClearing = String(val).trim() === '';
    const targetTotal = isClearing ? 0 : Number(val);
    const currentReportTotal = rows.reduce((sum: number, row: any) => sum + Number(row.reportTotal || 0), 0);
    const nextAllOverrides = { ...disposalOverrides };

    let distributed = 0;
    rows.forEach((row: any, idx: number) => {
      let rowConfirmed = 0;

      if (!isClearing) {
        if (idx === rows.length - 1) {
          rowConfirmed = Math.round((targetTotal - distributed) * 100) / 100;
        } else if (currentReportTotal > 0) {
          rowConfirmed = Math.round((targetTotal * (Number(row.reportTotal || 0) / currentReportTotal)) * 100) / 100;
          distributed += rowConfirmed;
        }
      }

      const targetLocation = row.locationName || locName;
      const targetOverrides = { ...(nextAllOverrides[targetLocation] || {}) };
      const subKey = `invoice__${disposalName}__${yearMonth}__${row.dateKey}__${itemKey}`;
      // 空欄に戻した場合は、日報由来の金額を原価として使う。
      targetOverrides[subKey] = isClearing ? '' : String(rowConfirmed);
      nextAllOverrides[targetLocation] = targetOverrides;
    });

    setDisposalOverrides(nextAllOverrides);
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

  const handleScrapRowOverrideChange = (rowKey: string, val: string) => {
    if (authRole === 'viewer') return;
    setScrapRowOverrides({
      ...scrapRowOverrides,
      [rowKey]: val
    });
    setFinancialDirty(true);
  };

  const handleMonthlyScrapStatementTotalChange = (key: string, val: string) => {
    if (authRole === 'viewer') return;
    setMonthlyScrapStatementTotals({
      ...monthlyScrapStatementTotals,
      [key]: val
    });
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

  const handleSubcontractorDetailOverrideChange = (
    locName: string,
    key: string,
    val: string
  ) => {
    if (authRole === 'viewer') return;

    setSubcontractorDetailOverrides({
      ...subcontractorDetailOverrides,
      [locName]: {
        ...(subcontractorDetailOverrides[locName] || {}),
        [key]: val
      }
    });
    setFinancialDirty(true);
  };

  const handleSubcontractorMonthlyUnitPriceChange = (
    locName: string,
    yearMonth: string,
    key: string,
    val: string
  ) => {
    if (authRole === 'viewer') return;
    const overrideKey = `${yearMonth}__${key}`;
    setSubcontractorMonthlyUnitPrices({
      ...subcontractorMonthlyUnitPrices,
      [locName]: {
        ...(subcontractorMonthlyUnitPrices[locName] || {}),
        [overrideKey]: val
      }
    });
    setFinancialDirty(true);
  };


  const handleSubcontractorPeriodDraftChange = (
    locName: string,
    field: 'startDate' | 'endDate',
    val: string
  ) => {
    if (authRole === 'viewer') return;
    setSubcontractorPeriodDrafts((prev: any) => ({
      ...prev,
      [locName]: {
        ...(prev[locName] || {}),
        [field]: val,
        prices: { ...((prev[locName] || {}).prices || {}) }
      }
    }));
  };

  const handleSubcontractorPeriodDraftPriceChange = (
    locName: string,
    key: string,
    val: string
  ) => {
    if (authRole === 'viewer') return;
    setSubcontractorPeriodDrafts((prev: any) => ({
      ...prev,
      [locName]: {
        ...(prev[locName] || {}),
        prices: {
          ...((prev[locName] || {}).prices || {}),
          [key]: val
        }
      }
    }));
  };

  const handleAddSubcontractorPeriodUnitPrices = (locName: string, subs: any[]) => {
    if (authRole === 'viewer') return;
    const draft = subcontractorPeriodDrafts[locName] || {};
    const startDate = String(draft.startDate || '');
    const endDate = String(draft.endDate || '');
    if (!startDate || !endDate) {
      alert('適用する開始日と終了日を選択してください。');
      return;
    }
    if (startDate > endDate) {
      alert('終了日は開始日以降の日付を選択してください。');
      return;
    }

    const priceMap = draft.prices || {};
    const targets = (subs || []).filter((sub: any) => {
      const raw = priceMap[sub.key];
      return raw !== '' && raw !== undefined && raw !== null;
    });
    if (targets.length === 0) {
      alert('期間単価を1件以上入力してください。');
      return;
    }

    const current = Array.isArray(subcontractorPeriodUnitPrices[locName])
      ? subcontractorPeriodUnitPrices[locName]
      : [];
    const stamp = Date.now();
    const additions = targets.map((sub: any, idx: number) => ({
      id: `${stamp}_${idx}_${Math.random().toString(36).slice(2, 7)}`,
      key: sub.key,
      company: sub.company,
      task: sub.task,
      startDate,
      endDate,
      price: String(priceMap[sub.key])
    }));

    setSubcontractorPeriodUnitPrices({
      ...subcontractorPeriodUnitPrices,
      [locName]: [...current, ...additions]
    });
    setSubcontractorPeriodDrafts((prev: any) => ({
      ...prev,
      [locName]: { startDate, endDate, prices: {} }
    }));
    setFinancialDirty(true);
  };

  const handleSubcontractorPeriodUnitPriceChange = (
    locName: string,
    id: string,
    field: 'startDate' | 'endDate' | 'price',
    val: string
  ) => {
    if (authRole === 'viewer') return;
    const current = Array.isArray(subcontractorPeriodUnitPrices[locName])
      ? subcontractorPeriodUnitPrices[locName]
      : [];
    setSubcontractorPeriodUnitPrices({
      ...subcontractorPeriodUnitPrices,
      [locName]: current.map((rule: any) =>
        rule.id === id ? { ...rule, [field]: val } : rule
      )
    });
    setFinancialDirty(true);
  };

  const handleDeleteSubcontractorPeriodUnitPrice = (locName: string, id: string) => {
    if (authRole === 'viewer') return;
    const current = Array.isArray(subcontractorPeriodUnitPrices[locName])
      ? subcontractorPeriodUnitPrices[locName]
      : [];
    setSubcontractorPeriodUnitPrices({
      ...subcontractorPeriodUnitPrices,
      [locName]: current.filter((rule: any) => rule.id !== id)
    });
    setFinancialDirty(true);
  };

  const getSubcontractorInvoiceLineKey = (r: any, subIndex: number) => {
    const reportId = r?.id ?? r?.reportId ?? `${normalizeDateStr(r?.date || '')}_${String(r?.location || '')}`;
    return `${String(reportId)}__${subIndex}`;
  };

  const getEffectiveSubcontractorInvoiceLine = (
    locName: string,
    r: any,
    sub: any,
    subIndex: number
  ) => {
    const lineKey = getSubcontractorInvoiceLineKey(r, subIndex);
    const rowOverride = subcontractorInvoiceOverrides?.[locName]?.[lineKey] || {};
    const originalCompany = String(sub?.company || '会社名未設定');
    const originalTask = String(sub?.task || '作業内容未設定');
    const task = rowOverride.task !== undefined ? String(rowOverride.task) : originalTask;
    const company = originalCompany;
    const originalKey = `${originalCompany}__${originalTask}`;
    const key = `${company}__${task}`;
    const subDate = normalizeDateStr(r?.date || '');

    const subMaster = (settings.subcontractors || []).find(
      (x: any) => x.company === company && x.task === task
    );
    const originalMaster = (settings.subcontractors || []).find(
      (x: any) => x.company === originalCompany && x.task === originalTask
    );
    const snapshotPrice = r?.costSnapshot?.subcontractorPrices?.[originalKey];
    const baseUnitPrice =
      sub?.price !== undefined && sub?.price !== null && sub?.price !== ''
        ? Number(sub.price)
        : snapshotPrice !== undefined && snapshotPrice !== null && snapshotPrice !== ''
          ? Number(snapshotPrice)
          : Number(subMaster?.price ?? originalMaster?.price ?? 0);

    const subParts = subDate.split('-');
    const subYearMonth = subParts.length >= 2 ? `${subParts[0]}-${subParts[1]}` : '日付不明';
    const monthlyOverrideKey = `${subYearMonth}__${key}`;
    const rawMonthlyOverride = subcontractorMonthlyUnitPrices?.[locName]?.[monthlyOverrideKey];
    const locPeriodRules = Array.isArray(subcontractorPeriodUnitPrices?.[locName])
      ? subcontractorPeriodUnitPrices[locName]
      : [];
    const periodRule = [...locPeriodRules].reverse().find((rule: any) => {
      if (!rule || rule.key !== key || !subDate) return false;
      const startDate = String(rule.startDate || '');
      const endDate = String(rule.endDate || '');
      const rawPrice = rule.price;
      if (!startDate || !endDate || rawPrice === '' || rawPrice === undefined || rawPrice === null) return false;
      return subDate >= startDate && subDate <= endDate;
    });

    const rawRowPrice = rowOverride.price;
    const rawPeriodOverride = periodRule?.price;
    const unitPrice =
      rawRowPrice !== '' && rawRowPrice !== undefined && rawRowPrice !== null
        ? Number(rawRowPrice)
        : rawPeriodOverride !== '' && rawPeriodOverride !== undefined && rawPeriodOverride !== null
          ? Number(rawPeriodOverride)
          : rawMonthlyOverride !== '' && rawMonthlyOverride !== undefined && rawMonthlyOverride !== null
            ? Number(rawMonthlyOverride)
            : baseUnitPrice;

    const rawCount = rowOverride.count;
    const count = rawCount !== '' && rawCount !== undefined && rawCount !== null
      ? Number(rawCount)
      : Number(sub?.count || 0);

    return {
      lineKey,
      reportId: r?.id,
      date: subDate,
      location: r?.location || locName,
      company,
      task,
      originalTask,
      originalKey,
      key,
      count,
      unitPrice,
      amount: count * unitPrice,
      hasOverride: !!subcontractorInvoiceOverrides?.[locName]?.[lineKey]
    };
  };

  const openSubcontractorInvoiceModal = () => {
    if (!modalLocation) return;
    setSubcontractorInvoiceFilter({ startDate: '', endDate: '', company: '' });
    setSubcontractorInvoiceEditingKey(null);
    setSubcontractorInvoiceDrafts({});
    setSubcontractorInvoiceAmount('');
    setShowSubcontractorInvoiceModal(true);
  };

  const startSubcontractorInvoiceEdit = (line: any) => {
    if (authRole !== 'admin') return;
    setSubcontractorInvoiceEditingKey(line.lineKey);
    setSubcontractorInvoiceDrafts((prev: any) => ({
      ...prev,
      [line.lineKey]: {
        task: String(line.task || ''),
        count: String(line.count ?? ''),
        price: String(line.unitPrice ?? '')
      }
    }));
  };

  const handleSubcontractorInvoiceDraftChange = (
    lineKey: string,
    field: 'task' | 'count' | 'price',
    value: string
  ) => {
    setSubcontractorInvoiceDrafts((prev: any) => ({
      ...prev,
      [lineKey]: {
        ...(prev[lineKey] || {}),
        [field]: value
      }
    }));
  };

  const saveSubcontractorInvoiceRow = (locName: string, line: any) => {
    if (authRole !== 'admin') return;
    const draft = subcontractorInvoiceDrafts[line.lineKey] || {};
    if (!String(draft.task || '').trim()) {
      alert('作業内容を入力してください。');
      return;
    }
    if (draft.count === '' || Number(draft.count) < 0 || Number.isNaN(Number(draft.count))) {
      alert('人工数を正しく入力してください。');
      return;
    }
    if (draft.price === '' || Number(draft.price) < 0 || Number.isNaN(Number(draft.price))) {
      alert('単価を正しく入力してください。');
      return;
    }

    setSubcontractorInvoiceOverrides((prev: any) => ({
      ...prev,
      [locName]: {
        ...(prev[locName] || {}),
        [line.lineKey]: {
          task: String(draft.task).trim(),
          count: String(draft.count),
          price: String(draft.price),
          updatedAt: new Date().toISOString()
        }
      }
    }));

    // 行単位の請求書照合を使う場合は、同じ「業者＋作業内容」の一括確定額より明細を優先する。
    setSubcontractorDetailOverrides((prev: any) => {
      const nextLoc = { ...(prev?.[locName] || {}) };
      delete nextLoc[line.originalKey];
      delete nextLoc[`${line.company}__${String(draft.task).trim()}`];
      return { ...prev, [locName]: nextLoc };
    });

    // 旧「外注費全体を金額で上書き」が残っている場合は、行単位の照合を優先するため解除する。
    setCostOverrides((prev: any) => ({
      ...prev,
      [locName]: { ...(prev?.[locName] || {}), sub: '' }
    }));
    setFinancialDirty(true);
    setSubcontractorInvoiceEditingKey(null);
  };

  const resetSubcontractorInvoiceRow = (locName: string, lineKey: string) => {
    if (authRole !== 'admin') return;
    setSubcontractorInvoiceOverrides((prev: any) => {
      const nextLoc = { ...(prev?.[locName] || {}) };
      delete nextLoc[lineKey];
      return { ...prev, [locName]: nextLoc };
    });
    setFinancialDirty(true);
    setSubcontractorInvoiceEditingKey(null);
  };

  const getExpenseInvoiceLines = (locName: string, category: string) => {
    const targetNames = getTargetLocationNames(locName);
    const locOverrides = expenseInvoiceLineOverrides?.[locName]?.[category] || {};
    const lines: any[] = [];

    const addLine = (r: any, index: number, label: string, quantity: number, unitPrice: number, meta: any = {}) => {
      const date = normalizeDateStr(r?.date || '');
      if (!date) return;
      const reportId = String(r?.id ?? r?._id ?? `${date}_${r?.location || locName}`);
      const lineKey = `${category}__${reportId}__${index}`;
      const baseQuantity = Number(quantity || 0);
      const baseUnitPrice = Number(unitPrice || 0);
      const baseAmount = baseQuantity * baseUnitPrice;
      const ov = locOverrides?.[lineKey] || {};
      const effectiveQuantity = ov.quantity !== '' && ov.quantity !== undefined && ov.quantity !== null ? Number(ov.quantity) : baseQuantity;
      const effectiveUnitPrice = ov.unitPrice !== '' && ov.unitPrice !== undefined && ov.unitPrice !== null ? Number(ov.unitPrice) : baseUnitPrice;
      lines.push({
        lineKey,
        date,
        reportId: r?.id ?? r?._id,
        location: r?.location || locName,
        label: ov.label !== undefined && ov.label !== '' ? String(ov.label) : label,
        baseLabel: label,
        baseQuantity,
        baseUnitPrice,
        baseAmount,
        quantity: effectiveQuantity,
        unitPrice: effectiveUnitPrice,
        amount: effectiveQuantity * effectiveUnitPrice,
        hasOverride: !!locOverrides?.[lineKey],
        ...meta
      });
    };

    reports
      .filter((r: any) => targetNames.includes(r.location))
      .forEach((r: any) => {
        let idx = 0;
        if (category === 'lease') {
          const getLeaseMaster = (masterKey: string, name: string) => {
            const fallbackVendor = ['leases', 'leaseHeavy', 'leaseAttach', 'leaseOther'].includes(masterKey) ? '南大阪建機' : '';
            return findLeaseMasterForSelection(settings[masterKey] || [], name, fallbackVendor);
          };
          const vendorName = (master: any, fallback = '未設定') => getLeaseMasterVendor(master, fallback) || fallback;
          const leaseHeavy = Array.isArray(r.leaseHeavy) ? r.leaseHeavy : [];
          const legacyMachines = leaseHeavy.length === 0 && Array.isArray(r.machines) ? r.machines : [];
          legacyMachines.forEach((name: string) => {
            const master = getLeaseMaster('leases', name);
            const price = Number(master?.price || 0);
            addLine(r, idx++, `${vendorName(master, '南大阪建機')} リース：${master ? getLeaseMasterCleanName(master) : formatLeaseSelectionLabel(name)}`, 1, price, { vendor: vendorName(master, '南大阪建機') });
          });
          leaseHeavy.forEach((name: string) => {
            const master = getLeaseMaster('leaseHeavy', name);
            const price = Number(master?.price || 0);
            addLine(r, idx++, `${vendorName(master, '南大阪建機')} 重機：${master ? getLeaseMasterCleanName(master) : formatLeaseSelectionLabel(name)}`, 1, price, { vendor: vendorName(master, '南大阪建機') });
          });
          (Array.isArray(r.leaseAttach) ? r.leaseAttach : []).forEach((name: string) => {
            const master = getLeaseMaster('leaseAttach', name);
            const price = Number(master?.price || 0);
            addLine(r, idx++, `${vendorName(master, '南大阪建機')} アタッチメント：${master ? getLeaseMasterCleanName(master) : formatLeaseSelectionLabel(name)}`, 1, price, { vendor: vendorName(master, '南大阪建機') });
          });
          (Array.isArray(r.leaseOther) ? r.leaseOther : []).forEach((name: string) => {
            const master = getLeaseMaster('leaseOther', name);
            const price = Number(master?.price || 0);
            addLine(r, idx++, `${vendorName(master, '南大阪建機')} その他：${master ? getLeaseMasterCleanName(master) : formatLeaseSelectionLabel(name)}`, 1, price, { vendor: vendorName(master, '南大阪建機') });
          });
          (Array.isArray(r.ishikawaHeavy) ? r.ishikawaHeavy : []).forEach((name: string) => {
            const master = getLeaseMaster('ishikawaHeavy', name);
            const price = Number(master?.price || 0);
            addLine(r, idx++, `${vendorName(master)} 重機：${master ? getLeaseMasterCleanName(master) : formatLeaseSelectionLabel(name)}`, 1, price, { vendor: vendorName(master) });
          });
          (Array.isArray(r.ishikawaAttach) ? r.ishikawaAttach : []).forEach((name: string) => {
            const master = getLeaseMaster('ishikawaAttach', name);
            const price = Number(master?.price || 0);
            addLine(r, idx++, `${vendorName(master)} アタッチメント：${master ? getLeaseMasterCleanName(master) : formatLeaseSelectionLabel(name)}`, 1, price, { vendor: vendorName(master) });
          });
          (Array.isArray(r.ishikawaOther) ? r.ishikawaOther : []).forEach((name: string) => {
            const master = getLeaseMaster('ishikawaOther', name);
            const price = Number(master?.price || 0);
            addLine(r, idx++, `${vendorName(master)} その他：${master ? getLeaseMasterCleanName(master) : formatLeaseSelectionLabel(name)}`, 1, price, { vendor: vendorName(master) });
          });
          (Array.isArray(r.otherLeases) ? r.otherLeases : []).forEach((item: any) => {
            const total = Number(item?.price || 0);
            const vendor = String(item?.company || '').trim() || '未設定';
            addLine(r, idx++, `${item?.company || 'リース'}：${item?.name || '自由入力'}`, 1, total, { vendor });
          });
          (Array.isArray(r.mokCustomMachines) ? r.mokCustomMachines : []).forEach((item: any) => {
            const master = (settings.leaseHeavy || []).find((x:any) => x.name === item?.name) ||
              (settings.leaseAttach || []).find((x:any) => x.name === item?.name) ||
              (settings.leaseOther || []).find((x:any) => x.name === item?.name);
            const unitPrice = item?.price !== undefined && item?.price !== null && item?.price !== '' ? Number(item.price) : Number(master?.price || 0);
            addLine(r, idx++, `${vendorName(master, '南大阪建機')} 自由入力：${item?.name || '名称未入力'}`, Number(item?.count || 0), unitPrice, { vendor: vendorName(master, '南大阪建機') });
          });
          (Array.isArray(r.ishikawaCustomMachines) ? r.ishikawaCustomMachines : []).forEach((item: any) => {
            const unitPrice = item?.price !== undefined && item?.price !== null && item?.price !== '' ? Number(item.price) : 0;
            const vendor = String(item?.company || item?.vendor || '').trim() || '未設定';
            addLine(r, idx++, `${vendor} 自由入力：${item?.name || '名称未入力'}`, Number(item?.count || 0), unitPrice, { vendor });
          });
        } else if (category === 'ownMachine') {
          (Array.isArray(r.ownMachines) ? r.ownMachines : []).forEach((name: string) => {
            const price = Number((settings.companyMachines || []).find((x:any) => x.name === name)?.price || 0);
            addLine(r, idx++, `自社重機：${name}`, 1, price);
          });
        } else if (category === 'vehicle') {
          (Array.isArray(r.vehicles) ? r.vehicles : []).forEach((name: string) => {
            const price = Number((settings.vehicles || []).find((x:any) => x.name === name)?.price || 0);
            addLine(r, idx++, `自社車両：${name}`, 1, price);
          });
        } else if (category === 'fuel') {
          const liters = Number(r.fuel || 0);
          if (liters > 0) {
            const date = normalizeDateStr(r.date || '');
            const parts = date.split('-');
            const ym = parts.length >= 2 ? `${parts[0]}-${parts[1]}` : '';
            const fuelPriceLocationKey = r.location && r.location.includes('旧河北郡市クリーンセンター')
              ? '旧河北郡市クリーンセンター等解体工事(石川県)'
              : r.location;
            const unitPrice = Number((fuelUnitPrices[fuelPriceLocationKey] || fuelUnitPrices[r.location] || {})?.[ym] || 0);
            addLine(r, idx++, '軽油', liters, unitPrice, { unitLabel: 'L' });
          }
        } else {
          const flatMap: any = {
            regular: { field: 'regularPrice', label: 'レギュラー購入分' },
            etc: { field: 'etcPrice', label: '高速代・ETC' },
            parking: { field: 'parkingPrice', label: '駐車場代' },
            other: { field: 'otherPrice', label: 'その他雑費' }
          };
          const conf = flatMap[category];
          if (conf) {
            const amount = Number(r?.[conf.field] || 0);
            if (amount !== 0) addLine(r, idx++, conf.label, 1, amount, { isFlatAmount: true });
          }
        }
      });

    return lines.sort((a: any, b: any) => a.date.localeCompare(b.date) || a.label.localeCompare(b.label, 'ja'));
  };

  const getLeaseCostApplication = (locName: string) => {
    const lines = getExpenseInvoiceLines(locName, 'lease');
    const history = getInvoiceReconcileHistory(locName, 'lease')
      .filter((entry: any) => {
        const startDate = String(entry?.startDate || '');
        const endDate = String(entry?.endDate || '');
        return entry?.applyToCost === true &&
          !!String(entry?.company || '').trim() &&
          /^\d{4}-\d{2}-\d{2}$/.test(startDate) &&
          /^\d{4}-\d{2}-\d{2}$/.test(endDate) &&
          startDate <= endDate &&
          entry?.invoiceAmount !== null && entry?.invoiceAmount !== undefined &&
          !Number.isNaN(Number(entry.invoiceAmount));
      })
      .sort((a: any, b: any) => String(b?.checkedAt || '').localeCompare(String(a?.checkedAt || '')));

    // 同一業者で期間が重複する古い確定履歴は二重計上しない。
    // 最新の確定履歴を優先し、請求書期間に含まれる日報明細をその請求書金額へ置き換える。
    const coveredLineKeys = new Set<string>();
    const acceptedHistory: any[] = [];

    history.forEach((entry: any) => {
      const vendor = String(entry?.company || '').trim();
      const startDate = String(entry?.startDate || '');
      const endDate = String(entry?.endDate || '');
      const matchingLines = lines.filter((line: any) =>
        String(line?.vendor || '未設定').trim() === vendor &&
        String(line?.date || '') >= startDate &&
        String(line?.date || '') <= endDate
      );
      if (matchingLines.length === 0) return;
      if (matchingLines.some((line: any) => coveredLineKeys.has(String(line?.lineKey || '')))) return;

      matchingLines.forEach((line: any) => coveredLineKeys.add(String(line?.lineKey || '')));
      acceptedHistory.push({ ...entry, matchingLines });
    });

    const invoiceTotal = acceptedHistory.reduce((sum: number, entry: any) => sum + Number(entry?.invoiceAmount || 0), 0);
    const unreconciledTotal = lines.reduce((sum: number, line: any) => {
      if (coveredLineKeys.has(String(line?.lineKey || ''))) return sum;
      return sum + Number(line?.baseAmount ?? line?.amount ?? 0);
    }, 0);

    return { lines, acceptedHistory, coveredLineKeys, total: invoiceTotal + unreconciledTotal };
  };

  const getExpenseInvoiceAdjustedTotal = (locName: string, category: string, fallbackTotal: number) => {
    const lines = getExpenseInvoiceLines(locName, category);

    // リースは請求書で確定した「業者＋任意期間」だけ請求書金額へ置き換え、
    // それ以外の期間は日報由来の概算をそのまま原価に使う。
    if (category === 'lease') {
      return getLeaseCostApplication(locName).total;
    }

    const delta = lines.reduce((sum: number, line: any) => {
      if (!line.hasOverride) return sum;
      return sum + (Number(line.amount || 0) - Number(line.baseAmount || 0));
    }, 0);
    return Number(fallbackTotal || 0) + delta;
  };

  const getLeaseMonthlyVendorSummary = (locName: string) => {
    const { lines, acceptedHistory, coveredLineKeys } = getLeaseCostApplication(locName);
    const rows: any[] = [];

    // 照合済みは、請求書で指定した期間を1行として表示する。
    acceptedHistory.forEach((entry: any) => {
      const startDate = String(entry?.startDate || '');
      const endDate = String(entry?.endDate || '');
      const vendor = String(entry?.company || '').trim() || '未設定';
      const estimate = (entry?.matchingLines || []).reduce((sum: number, line: any) => sum + Number(line?.baseAmount ?? line?.amount ?? 0), 0);
      rows.push({
        key: `reconciled__${entry?.id || `${vendor}__${startDate}__${endDate}`}`,
        yearMonth: startDate.slice(0, 7),
        vendor,
        firstDate: startDate,
        lastDate: endDate,
        periodLabel: `${startDate} ～ ${endDate}`,
        estimate,
        lineCount: (entry?.matchingLines || []).length,
        confirmed: entry,
        isReconciled: true,
        appliedAmount: Number(entry?.invoiceAmount || 0)
      });
    });

    // 照合されていない明細は、従来どおり月×業者でまとめて日報由来の概算を表示する。
    const unreconciledGroups: Record<string, any> = {};
    lines.forEach((line: any) => {
      if (coveredLineKeys.has(String(line?.lineKey || ''))) return;
      const date = String(line?.date || '');
      const yearMonth = date.slice(0, 7);
      if (!/^\d{4}-\d{2}$/.test(yearMonth)) return;
      const vendor = String(line?.vendor || '未設定').trim() || '未設定';
      const key = `${yearMonth}__${vendor}`;
      if (!unreconciledGroups[key]) {
        unreconciledGroups[key] = {
          key: `unreconciled__${key}`,
          yearMonth,
          vendor,
          firstDate: date,
          lastDate: date,
          estimate: 0,
          lineCount: 0,
          confirmed: null,
          isReconciled: false
        };
      }
      unreconciledGroups[key].estimate += Number(line?.baseAmount ?? line?.amount ?? 0);
      unreconciledGroups[key].lineCount += 1;
      if (date < unreconciledGroups[key].firstDate) unreconciledGroups[key].firstDate = date;
      if (date > unreconciledGroups[key].lastDate) unreconciledGroups[key].lastDate = date;
    });

    Object.values(unreconciledGroups).forEach((group: any) => {
      rows.push({ ...group, periodLabel: `${group.yearMonth}（未照合）`, appliedAmount: Number(group.estimate || 0) });
    });

    return rows.sort((a: any, b: any) =>
      String(a.firstDate || '').localeCompare(String(b.firstDate || '')) || String(a.vendor || '').localeCompare(String(b.vendor || ''), 'ja')
    );
  };

  const formatInvoiceReconcileTime = (iso: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString('ja-JP', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getInvoiceDefaultPeriod = (locName: string) => {
    const targetNames = getTargetLocationNames(locName);
    const dates = reports
      .filter((r: any) => targetNames.includes(r.location) && r.date)
      .map((r: any) => String(r.date))
      .sort();
    return { startDate: dates[0] || '', endDate: dates[dates.length - 1] || '' };
  };

  const formatInvoicePeriod = (startDate?: string, endDate?: string) => {
    if (startDate && endDate) return `${startDate} ～ ${endDate}`;
    if (startDate) return `${startDate} ～`;
    if (endDate) return `～ ${endDate}`;
    return '期間未記録';
  };

  const markInvoiceReconciled = (
    locName: string,
    category: string,
    detail: {
      startDate?: string;
      endDate?: string;
      company?: string;
      hadChanges?: boolean;
      invoiceAmount?: number | null;
      diff?: number | null;
      systemAmount?: number | null;
      applyToCost?: boolean;
      existingId?: string | null;
    } = {}
  ) => {
    if (authRole !== 'admin') return;
    const fallbackPeriod = getInvoiceDefaultPeriod(locName);
    const entry = {
      id: detail.existingId || `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      checkedAt: new Date().toISOString(),
      startDate: detail.startDate || fallbackPeriod.startDate || '',
      endDate: detail.endDate || fallbackPeriod.endDate || '',
      company: detail.company || '',
      hadChanges: !!detail.hadChanges,
      invoiceAmount: detail.invoiceAmount === null || detail.invoiceAmount === undefined ? null : Number(detail.invoiceAmount),
      diff: detail.diff === null || detail.diff === undefined ? null : Number(detail.diff),
      systemAmount: detail.systemAmount === null || detail.systemAmount === undefined ? null : Number(detail.systemAmount),
      applyToCost: category === 'lease' && detail.applyToCost === true
    };

    setInvoiceReconcileStatus((prev: any) => ({
      ...prev,
      [locName]: {
        ...(prev?.[locName] || {}),
        [category]: entry
      }
    }));
    setInvoiceReconcileHistory((prev: any) => {
      const current = Array.isArray(prev?.[locName]?.[category]) ? prev[locName][category] : [];
      const nextHistory = detail.existingId
        ? (current.some((x: any) => x?.id === detail.existingId)
            ? current.map((x: any) => x?.id === detail.existingId ? entry : x)
            : [entry, ...current])
        : [entry, ...current];
      return {
        ...prev,
        [locName]: {
          ...(prev?.[locName] || {}),
          [category]: nextHistory.slice(0, 50)
        }
      };
    });
    setFinancialDirty(true);
  };

  const getInvoiceReconcileStatus = (locName: string, category: string) =>
    invoiceReconcileStatus?.[locName]?.[category] || null;

  const getInvoiceReconcileHistory = (locName: string, category: string) =>
    Array.isArray(invoiceReconcileHistory?.[locName]?.[category]) ? invoiceReconcileHistory[locName][category] : [];

  const openExpenseInvoiceModal = (key: string, label: string) => {
    if (!modalLocation) return;
    setExpenseInvoiceCategory({ key, label });
    setExpenseInvoiceFilter({ startDate: '', endDate: '', vendor: '' });
    setExpenseInvoiceEditingKey(null);
    setExpenseInvoiceDrafts({});
    setExpenseInvoiceAmount('');
    setExpenseInvoiceReconcileEditingId(null);
    setShowExpenseInvoiceDetails(false);
    setShowExpenseInvoiceModal(true);
  };

  const openLeaseInvoiceConfirmedEdit = (entry: any) => {
    if (!modalLocation || authRole !== 'admin' || !entry) return;
    setExpenseInvoiceCategory({ key: 'lease', label: 'リース' });
    setExpenseInvoiceFilter({
      startDate: String(entry.startDate || ''),
      endDate: String(entry.endDate || ''),
      vendor: String(entry.company || '')
    });
    setExpenseInvoiceEditingKey(null);
    setExpenseInvoiceDrafts({});
    setExpenseInvoiceAmount(entry.invoiceAmount === null || entry.invoiceAmount === undefined ? '' : String(entry.invoiceAmount));
    setExpenseInvoiceReconcileEditingId(entry.id || null);
    setShowExpenseInvoiceDetails(false);
    setShowExpenseInvoiceModal(true);
  };

  const deleteLeaseInvoiceConfirmed = (entry: any) => {
    if (!modalLocation || authRole !== 'admin' || !entry) return;
    if (!window.confirm('この請求書確定・原価反映の履歴を削除しますか？\n削除後はこの確定金額が原価反映から外れます。')) return;

    const isSameEntry = (candidate: any) => {
      if (entry?.id && candidate?.id) return candidate.id === entry.id;
      return String(candidate?.checkedAt || '') === String(entry?.checkedAt || '')
        && String(candidate?.startDate || '') === String(entry?.startDate || '')
        && String(candidate?.endDate || '') === String(entry?.endDate || '')
        && String(candidate?.company || '') === String(entry?.company || '');
    };

    const currentHistory = getInvoiceReconcileHistory(modalLocation, 'lease');
    const nextHistory = currentHistory.filter((candidate: any) => !isSameEntry(candidate));

    setInvoiceReconcileHistory((prev: any) => ({
      ...prev,
      [modalLocation]: {
        ...(prev?.[modalLocation] || {}),
        lease: nextHistory
      }
    }));

    setInvoiceReconcileStatus((prev: any) => {
      const currentStatus = prev?.[modalLocation]?.lease;
      const nextLocationStatus = { ...(prev?.[modalLocation] || {}) };
      if (currentStatus && isSameEntry(currentStatus)) {
        if (nextHistory.length > 0) nextLocationStatus.lease = nextHistory[0];
        else delete nextLocationStatus.lease;
      }
      return {
        ...prev,
        [modalLocation]: nextLocationStatus
      };
    });

    if (expenseInvoiceReconcileEditingId && entry?.id === expenseInvoiceReconcileEditingId) {
      setExpenseInvoiceReconcileEditingId(null);
      setShowExpenseInvoiceModal(false);
    }
    setFinancialDirty(true);
  };

  const startExpenseInvoiceEdit = (line: any) => {
    if (authRole !== 'admin') return;
    setExpenseInvoiceEditingKey(line.lineKey);
    setExpenseInvoiceDrafts((prev: any) => ({
      ...prev,
      [line.lineKey]: {
        label: String(line.label || ''),
        quantity: String(line.quantity ?? ''),
        unitPrice: String(line.unitPrice ?? '')
      }
    }));
  };

  const saveExpenseInvoiceRow = (locName: string, category: string, line: any) => {
    if (authRole !== 'admin') return;
    const draft = expenseInvoiceDrafts[line.lineKey] || {};
    if (!String(draft.label || '').trim()) return alert('内容を入力してください。');
    if (draft.quantity === '' || Number.isNaN(Number(draft.quantity)) || Number(draft.quantity) < 0) return alert('数量を正しく入力してください。');
    if (draft.unitPrice === '' || Number.isNaN(Number(draft.unitPrice)) || Number(draft.unitPrice) < 0) return alert('単価を正しく入力してください。');

    setExpenseInvoiceLineOverrides((prev: any) => ({
      ...prev,
      [locName]: {
        ...(prev?.[locName] || {}),
        [category]: {
          ...(prev?.[locName]?.[category] || {}),
          [line.lineKey]: {
            label: String(draft.label).trim(),
            quantity: String(draft.quantity),
            unitPrice: String(draft.unitPrice),
            updatedAt: new Date().toISOString()
          }
        }
      }
    }));
    // 旧「カテゴリー全体を金額で上書き」は行単位照合へ移行したため解除。
    setCostOverrides((prev: any) => ({
      ...prev,
      [locName]: { ...(prev?.[locName] || {}), [category]: '' }
    }));
    setFinancialDirty(true);
    setExpenseInvoiceEditingKey(null);
  };

  const resetExpenseInvoiceRow = (locName: string, category: string, lineKey: string) => {
    if (authRole !== 'admin') return;
    setExpenseInvoiceLineOverrides((prev: any) => {
      const nextCategory = { ...(prev?.[locName]?.[category] || {}) };
      delete nextCategory[lineKey];
      return {
        ...prev,
        [locName]: { ...(prev?.[locName] || {}), [category]: nextCategory }
      };
    });
    setFinancialDirty(true);
    setExpenseInvoiceEditingKey(null);
  };

  const handleAddCustomExtraExpense = (locName: string) => {
    if (authRole === 'viewer') return;
    const current = Array.isArray(customExtraExpenses[locName]) ? customExtraExpenses[locName] : [];
    const newItem = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      label: '',
      amount: ''
    };
    setCustomExtraExpenses({
      ...customExtraExpenses,
      [locName]: [...current, newItem]
    });
    setFinancialDirty(true);
  };

  const handleCustomExtraExpenseChange = (
    locName: string,
    id: string,
    field: 'label' | 'amount',
    value: string
  ) => {
    if (authRole === 'viewer') return;
    const current = Array.isArray(customExtraExpenses[locName]) ? customExtraExpenses[locName] : [];
    setCustomExtraExpenses({
      ...customExtraExpenses,
      [locName]: current.map((item: any) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    });
    setFinancialDirty(true);
  };

  const handleDeleteCustomExtraExpense = (locName: string, id: string) => {
    if (authRole === 'viewer') return;
    const current = Array.isArray(customExtraExpenses[locName]) ? customExtraExpenses[locName] : [];
    setCustomExtraExpenses({
      ...customExtraExpenses,
      [locName]: current.filter((item: any) => item.id !== id)
    });
    setFinancialDirty(true);
  };

  const saveFinancialEdits = async () => {
    if (authRole === 'viewer' || isFinancialSaving) return;

    try {
      setIsFinancialSaving(true);

      // 燃料単価などの金額設定変更でも、過去日報は固定したままにする。
      await freezeExistingReportsIfNeeded();

      // 画面内で編集した金額関連を1回のPOSTにまとめる。
      // 入力のたびにSupabaseへ送らないため、連続書き込みを防ぎます。
      const newData = {
        ...settings,
        costOverrides,
        disposalOverrides,
        scrapOverrides,
        scrapRowOverrides,
        scrapSettlementDates,
        checkedScrapRows,
        monthlyScrapStatementTotals,
        fuelUnitPrices,
        monthlyDisposalInvoices,
        disposalRowMemos,
        leaseCustomPrices,
        checkedDisposalRows,
        customSubcontractors,
        subcontractorDetailOverrides,
        subcontractorMonthlyUnitPrices,
        subcontractorPeriodUnitPrices,
        subcontractorInvoiceOverrides,
        expenseInvoiceLineOverrides,
        invoiceReconcileStatus,
        invoiceReconcileHistory,
        customExtraExpenses
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

  const saveProjectMeta = async () => {
    if (!modalLocation || authRole !== 'admin' || projectMetaSaving) return;

    try {
      setProjectMetaSaving(true);
      const targetNames = getTargetLocationNames(modalLocation);

      // 現場マスタにも保存する。日報がまだ0件の現場でも、請負先・開始日を保持できるようにする。
      const nextLocations = (settings.locations || []).map((loc: any) => {
        const locName = typeof loc === 'string' ? loc : loc?.name;
        if (locName !== modalLocation) return loc;

        const base =
          typeof loc === 'string'
            ? { name: loc, shortName: '', price: 0, isFinished: false }
            : { ...loc };

        return {
          ...base,
          clientName: projectMetaEdit.client,
          startDate: projectMetaEdit.startDate
        };
      });

      const settingsRes = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locations: nextLocations })
      });

      if (!settingsRes.ok) {
        throw new Error('請負先・開始日の設定保存に失敗しました');
      }

      const nextSettings = { ...settings, locations: nextLocations };
      setSettings(nextSettings);
      setOriginalSettings(JSON.parse(JSON.stringify(nextSettings)));

      // 既存の日報がある現場は、従来通り日報側にも反映する。
      const updatedReports = reports.map((r: any) => {
        if (!targetNames.includes(r.location)) return r;
        return {
          ...r,
          client: projectMetaEdit.client,
          startDate: projectMetaEdit.startDate
        };
      });

      const targets = updatedReports.filter((r: any) => targetNames.includes(r.location));

      for (const r of targets) {
        const targetId = r.id || r._id || r.reportId;
        if (!targetId) continue;

        const res = await fetch('/api/reports', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...r, id: targetId })
        });

        if (!res.ok) {
          throw new Error('請負先・開始日の日報反映に失敗しました');
        }
      }

      setReports(updatedReports);
      setProjectMetaDirty(false);
      setShowSaveToast(true);
      setTimeout(() => setShowSaveToast(false), 2500);
    } catch (e) {
      console.error(e);
      alert('請負先・開始日の保存に失敗しました。');
    } finally {
      setProjectMetaSaving(false);
    }
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

    const selectedWorkers = Array.isArray(editingReport.workers) ? editingReport.workers : [];
    const overtimeMap =
      editingReport.workerOvertimeHours && typeof editingReport.workerOvertimeHours === 'object'
        ? editingReport.workerOvertimeHours
        : {};
    const halfDayMap =
      editingReport.workerHalfDay && typeof editingReport.workerHalfDay === 'object'
        ? editingReport.workerHalfDay
        : {};
    const holidayWorkMap =
      editingReport.workerHolidayWorkHours && typeof editingReport.workerHolidayWorkHours === 'object'
        ? editingReport.workerHolidayWorkHours
        : {};

    // 過去日報の単価は変更せず、保存済みの当時単価を使って
    // 「半日」「残業」だけを再計算する。
    let nextCostSnapshot = editingReport.costSnapshot;

    if (editingReport?.costSnapshot?.totals) {
      const oldWorkerPrices = editingReport.costSnapshot.workerPrices || {};
      const nextWorkerPrices: any = {};
      let nextLaborCost = 0;

      selectedWorkers.forEach((workerName: string) => {
        const frozen = oldWorkerPrices[workerName];
        const currentMaster = (settings.workers || []).find((x: any) => x.name === workerName);

        const dailyPrice =
          frozen?.dailyPrice !== undefined
            ? Number(frozen.dailyPrice || 0)
            : Number(currentMaster?.price || 0);

        const shiftHours =
          Number(frozen?.shiftHours || currentMaster?.shiftHours || 8) === 7 ? 7 : 8;

        const overtimeHours = Math.max(0, Number(overtimeMap[workerName] || 0));
        const isHalfDay = !!halfDayMap[workerName];
        const baseCost = isHalfDay ? Math.round(dailyPrice / 2) : dailyPrice;
        const overtimeCost = Math.round((dailyPrice / shiftHours) * overtimeHours);
        const total = baseCost + overtimeCost;

        nextWorkerPrices[workerName] = {
          dailyPrice,
          shiftHours,
          isHalfDay,
          overtimeHours,
          baseCost,
          overtimeCost,
          total
        };

        nextLaborCost += total;
      });

      nextCostSnapshot = {
        ...editingReport.costSnapshot,
        workerPrices: nextWorkerPrices,
        totals: {
          ...editingReport.costSnapshot.totals,
          lCost: nextLaborCost
        }
      };
    }

    const reportDateText = String(editingReport.date || '').replace(/\//g, '-');
    const [saveY, saveM, saveD] = reportDateText.split('-').map(Number);
    const saveIsSunday =
      !!saveY && !!saveM && !!saveD
        ? new Date(saveY, saveM - 1, saveD).getDay() === 0
        : false;

    const cleanedHolidayWorkHours = Object.fromEntries(
      selectedWorkers
        .map((name: string) => {
          const explicit = Number(holidayWorkMap[name] || 0);
          if (explicit > 0) return [name, explicit];

          const worker = (settings.workers || []).find((w:any) => w.name === name);
          const calendarType = worker?.calendarType || 'none';
          const cycle =
            saveM >= 11
              ? `${saveY}-${saveY + 1}`
              : `${saveY - 1}-${saveY}`;
          const isCompanyHoliday =
            calendarType !== 'none' &&
            (settings.companyCalendars?.[cycle]?.[calendarType]?.holidays || [])
              .includes(reportDateText);

          if (saveIsSunday || isCompanyHoliday) {
            return [name, Number(worker?.shiftHours || 8) === 7 ? 7 : 8];
          }

          return [name, 0];
        })
        .filter(([, hours]) => Number(hours) > 0)
    );

    const payload = {
      ...editingReport,
      workerHolidayWorkHours: cleanedHolidayWorkHours,
      costSnapshot: nextCostSnapshot,
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

  const openReportReply = (report: any) => {
    if (authRole !== 'admin' || !report) return;
    setReplyingReport({ ...report });
    setAdminReplyDraft(String(report.adminReply || report.data?.adminReply || ''));
  };

  const saveReportReply = async () => {
    if (authRole !== 'admin' || !replyingReport || adminReplySaving) return;
    const replyText = adminReplyDraft.trim();
    if (!replyText) {
      alert('返信内容を入力してください。');
      return;
    }

    try {
      setAdminReplySaving(true);
      const payload = {
        ...replyingReport,
        adminReply: replyText,
        adminReplyAt: new Date().toISOString(),
        // 内容を更新した場合は、報告者側でもう一度未読として表示する。
        adminReplyReadAt: '',
        id: replyingReport.id || replyingReport._id
      };
      const res = await fetch('/api/reports', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        alert('返信の保存に失敗しました。');
        return;
      }
      setReplyingReport(null);
      setAdminReplyDraft('');
      await fetchData();
      setShowSaveToast(true);
      setTimeout(() => setShowSaveToast(false), 2500);
    } catch (e) {
      console.error(e);
      alert('返信の保存に失敗しました。');
    } finally {
      setAdminReplySaving(false);
    }
  };

  const buildReportCostSnapshot = (
    r: any,
    pricingSettings: any,
    pricingFuelUnitPrices: any
  ) => {
    const workerPrices: any = {};
    let lCost = 0;
    const workers = Array.isArray(r.workers) ? r.workers : [];
    const overtimeMap =
      r.workerOvertimeHours && typeof r.workerOvertimeHours === 'object'
        ? r.workerOvertimeHours
        : {};
    const halfDayMap =
      r.workerHalfDay && typeof r.workerHalfDay === 'object'
        ? r.workerHalfDay
        : {};

    workers.forEach((name: string) => {
      const master = (pricingSettings.workers || []).find((x: any) => x.name === name);
      const dailyPrice = Number(master?.price || 0);
      const shiftHours = Number(master?.shiftHours || 8) === 7 ? 7 : 8;
      const overtimeHours = Math.max(0, Number(overtimeMap[name] || 0));
      const isHalfDay = !!halfDayMap[name];
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
      const master = (pricingSettings.subcontractors || []).find(
        (x: any) => x.company === company && x.task === task
      );
      const unitPrice =
        sub.price !== undefined && sub.price !== null && sub.price !== ''
          ? Number(sub.price)
          : Number(master?.price || 0);
      subcontractorPrices[`${company}__${task}`] = unitPrice;
      subCost += Number(sub.count || 0) * unitPrice;
    });

    const masterPriceMaps: any = {
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
      if (masterPriceMaps[key]?.[name] !== undefined) {
        return Number(masterPriceMaps[key][name] || 0);
      }
      const leaseKeys = new Set(['leases', 'leaseHeavy', 'leaseAttach', 'leaseOther', 'ishikawaHeavy', 'ishikawaAttach', 'ishikawaOther']);
      const fallbackVendor = ['leases', 'leaseHeavy', 'leaseAttach', 'leaseOther'].includes(key) ? '南大阪建機' : '';
      const master = leaseKeys.has(key)
        ? findLeaseMasterForSelection(pricingSettings[key] || [], name, fallbackVendor)
        : (pricingSettings[key] || []).find((x: any) => x.name === name);
      const price = Number(master?.price || 0);
      if (!masterPriceMaps[key]) masterPriceMaps[key] = {};
      masterPriceMaps[key][name] = price;
      return price;
    };

    let leaseC = 0;
    let ishikawaLeaseDetail = 0;
    let mokLeaseDetail = 0;

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
    const legacyMachines = leaseHeavy.length === 0 ? machines : [];

    ishikawaHeavy.forEach((name: string) => {
      const p = getPrice('ishikawaHeavy', name);
      leaseC += p;
      ishikawaLeaseDetail += p;
    });
    ishikawaAttach.forEach((name: string) => {
      const p = getPrice('ishikawaAttach', name);
      leaseC += p;
      ishikawaLeaseDetail += p;
    });
    ishikawaOther.forEach((name: string) => {
      const p = getPrice('ishikawaOther', name);
      leaseC += p;
      ishikawaLeaseDetail += p;
    });
    ishikawaCustomMachines.forEach((item: any) => {
      const explicit = item.price !== undefined && item.price !== null && item.price !== ''
        ? Number(item.price)
        : 0;
      const cost = explicit * Number(item.count || 0);
      leaseC += cost;
      ishikawaLeaseDetail += cost;
    });

    legacyMachines.forEach((name: string) => {
      const p = getPrice('leases', name);
      leaseC += p;
      mokLeaseDetail += p;
    });
    leaseHeavy.forEach((name: string) => {
      const p = getPrice('leaseHeavy', name);
      leaseC += p;
      mokLeaseDetail += p;
    });
    leaseAttach.forEach((name: string) => {
      const p = getPrice('leaseAttach', name);
      leaseC += p;
      mokLeaseDetail += p;
    });
    leaseOther.forEach((name: string) => {
      const p = getPrice('leaseOther', name);
      leaseC += p;
      mokLeaseDetail += p;
    });
    otherLeases.forEach((item: any) => {
      const cost = Number(item.price || 0);
      leaseC += cost;
      mokLeaseDetail += cost;
    });
    mokCustomMachines.forEach((item: any) => {
      const matched =
        (pricingSettings.leaseHeavy || []).find((x: any) => x.name === item.name) ||
        (pricingSettings.leaseAttach || []).find((x: any) => x.name === item.name) ||
        (pricingSettings.leaseOther || []).find((x: any) => x.name === item.name);
      const unitPrice =
        item.price !== undefined && item.price !== null && item.price !== ''
          ? Number(item.price)
          : Number(matched?.price || 0);
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
      const master = (pricingSettings.disposalLocations || []).find(
        (x: any) => x.location === disposalLocation && x.item === itemName
      );
      const unit = item.unit || master?.unit || 't';
      const unitPrice =
        item.price !== undefined && item.price !== null && item.price !== ''
          ? Number(item.price)
          : Number(master?.price || 0);
      const quantity = Number(item.quantity || 0);
      const total = quantity * unitPrice;

      disposalPrices[`${disposalLocation}__${itemName}`] = {
        unitPrice,
        unit
      };
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
    let snapshotFuelUnitPrice: number | null = null;
    const normalizedDate = String(r.date || '').replace(/\//g, '-');
    const parts = normalizedDate.split('-');
    if (parts.length >= 2) {
      const ym = `${parts[0]}-${String(parts[1]).padStart(2, '0')}`;
      const fuelLocationKey =
        r.location && String(r.location).includes('旧河北郡市クリーンセンター')
          ? '旧河北郡市クリーンセンター等解体工事(石川県)'
          : r.location;
      const locationFuelPrices =
        pricingFuelUnitPrices?.[fuelLocationKey] ||
        pricingFuelUnitPrices?.[r.location] ||
        {};
      const unitPrice = locationFuelPrices?.[ym];
      if (unitPrice !== '' && unitPrice !== undefined) {
        snapshotFuelUnitPrice = Number(unitPrice);
        fuelCost = Number(r.fuel || 0) * snapshotFuelUnitPrice;
      }
    }

    const totals = {
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
    };

    return {
      version: 1,
      frozenAt: new Date().toISOString(),
      workerPrices,
      subcontractorPrices,
      masterPrices: masterPriceMaps,
      disposalPrices,
      fuelUnitPrice: snapshotFuelUnitPrice,
      disposalBreakdown,
      totals
    };
  };

  const freezeExistingReportsIfNeeded = async () => {
    const targets = reports.filter((r: any) => !r?.costSnapshot?.totals);
    if (targets.length === 0) return;

    const oldPricingSettings = originalSettings && Object.keys(originalSettings).length > 0
      ? originalSettings
      : settings;
    const oldFuelPrices =
      oldPricingSettings?.fuelUnitPrices ||
      fuelUnitPrices ||
      {};

    const updatedById = new Map<any, any>();

    for (const report of targets) {
      const targetId = report.id || report._id || report.reportId;
      if (!targetId) continue;

      const updated = {
        ...report,
        costSnapshot: buildReportCostSnapshot(
          report,
          oldPricingSettings,
          oldFuelPrices
        ),
        id: targetId
      };

      const res = await fetch('/api/reports', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });

      if (!res.ok) {
        throw new Error('過去日報の金額固定に失敗しました。マスタ単価はまだ変更していません。');
      }

      updatedById.set(targetId, updated);
    }

    if (updatedById.size > 0) {
      setReports((prev: any[]) =>
        prev.map((r: any) => {
          const id = r.id || r._id || r.reportId;
          return updatedById.get(id) || r;
        })
      );
    }
  };

  const calculateReportDailyCost = (r: any) => {
    if (r?.costSnapshot?.totals) {
      const s = r.costSnapshot;
      return {
        ...s.totals,
        disposalBreakdown: s.disposalBreakdown || {},
        scrapC: 0,
        scrapBreakdown: {}
      };
    }
    let lCost = 0;
    const workers = Array.isArray(r.workers) ? r.workers : [];
    const workerOvertimeHours =
      r.workerOvertimeHours && typeof r.workerOvertimeHours === 'object'
        ? r.workerOvertimeHours
        : {};
    const workerHalfDay =
      r.workerHalfDay && typeof r.workerHalfDay === 'object'
        ? r.workerHalfDay
        : {};

    workers.forEach((w: string) => {
      const workerMaster = (settings.workers || []).find((x:any) => x.name === w);
      const dailyPrice = Number(workerMaster?.price || 0);
      const shiftHours = Number(workerMaster?.shiftHours || 8) === 7 ? 7 : 8;
      const overtimeHours = Math.max(0, Number(workerOvertimeHours[w] || 0));
      const baseCost = workerHalfDay[w] ? Math.round(dailyPrice / 2) : dailyPrice;
      const overtimeCost = Math.round((dailyPrice / shiftHours) * overtimeHours);

      lCost += baseCost + overtimeCost;
    });

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
      const price = Number(findLeaseMasterForSelection(settings.ishikawaHeavy || [], m)?.price || 0);
      ishikawaLeaseDetail += price;
      leaseC += price;
    });
    ishikawaAttach.forEach((m: string) => {
      const price = Number(findLeaseMasterForSelection(settings.ishikawaAttach || [], m)?.price || 0);
      ishikawaLeaseDetail += price;
      leaseC += price;
    });
    ishikawaOther.forEach((m: string) => {
      const price = Number(findLeaseMasterForSelection(settings.ishikawaOther || [], m)?.price || 0);
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
      const price = Number(findLeaseMasterForSelection(settings.leases || [], m, '南大阪建機')?.price || 0);
      mokLeaseDetail += price;
      leaseC += price;
    });
    leaseHeavy.forEach((m: string) => {
      const price = Number(findLeaseMasterForSelection(settings.leaseHeavy || [], m, '南大阪建機')?.price || 0);
      mokLeaseDetail += price;
      leaseC += price;
    });
    leaseAttach.forEach((m: string) => {
      const price = Number(findLeaseMasterForSelection(settings.leaseAttach || [], m, '南大阪建機')?.price || 0);
      mokLeaseDetail += price;
      leaseC += price;
    });
    leaseOther.forEach((m: string) => {
      const price = Number(findLeaseMasterForSelection(settings.leaseOther || [], m, '南大阪建機')?.price || 0);
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
    scraps.forEach((sc: any, scrapIndex: number) => {
      const matchedMaster = (settings.scrapLocations || []).find((s: any) => s.location === sc.location && s.item === sc.item);
      const unitStr = sc.unit || matchedMaster?.unit || 't';
      const rowKey = getScrapRowKey(r, sc, scrapIndex);
      const rowOverride = scrapRowOverrides[rowKey];
      const subT =
        rowOverride !== '' && rowOverride !== undefined
          ? Number(rowOverride)
          : 0;

      scrapC += subT;
      const scrapKey = `${sc.location || 'その他スクラップ場'} (${sc.item || '品目未指定'})`;
      if (!scrapBreakdown[scrapKey]) {
        scrapBreakdown[scrapKey] = { quantity: 0, total: 0, details: [] };
      }
      scrapBreakdown[scrapKey].quantity += Number(sc.quantity || 0);
      scrapBreakdown[scrapKey].total += subT;
      scrapBreakdown[scrapKey].details.push({
        date: r.date || '日付不明',
        item: sc.item || '品目未指定',
        quantity: Number(sc.quantity || 0),
        unit: unitStr,
        reportId: r.id || r._id,
        rowKey,
        saleAmount: subT
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
      const fallbackVendor = category.includes('旧データ') || !String(category).startsWith('石川') ? '南大阪建機' : '';
      const master = findLeaseMasterForSelection(masterList || [], name, fallbackVendor);
      const unitPrice = Number(master?.price || 0);
      const displayName = master ? getLeaseMasterCleanName(master) : formatLeaseSelectionLabel(name);
      const vendor = master ? getLeaseMasterVendor(master, fallbackVendor) : parseLeaseSelectionValue(name).vendor;
      const key = `${category}__${vendor}__${displayName}`;
      if (!target[key]) target[key] = { key, label: `${category}：${vendor ? `${vendor}／` : ''}${displayName}`, count: 0, unitPrice, total: 0 };
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

  const getCanonicalLocationForReport = (reportLocation: string) => {
    const locationNames = (settings.locations || []).map((l: any) =>
      typeof l === 'string' ? l : l?.name
    ).filter(Boolean);

    const matched = locationNames.find((locName: string) =>
      getTargetLocationNames(locName).includes(reportLocation)
    );

    return matched || reportLocation || '現場名未設定';
  };

  const getMonthlyScrapStatementKey = (
    canonicalLocation: string,
    scrapSite: string,
    yearMonth: string
  ) => `${canonicalLocation}__${scrapSite}__${yearMonth}`;

  const getLocationMonthlyScrapData = (locName: string) => {
    const targetNames = getTargetLocationNames(locName);
    const locReports = reports.filter((r: any) => targetNames.includes(r.location));
    const months: any = {};

    locReports.forEach((r: any) => {
      const normalized = normalizeDateStr(r.date || '');
      const parts = normalized.split('-');
      if (parts.length < 2) return;

      const ym = `${parts[0]}-${parts[1]}`;
      const displayDate = parts.length >= 3
        ? `${Number(parts[1])}/${Number(parts[2])}`
        : String(r.date || '');
      const scraps = Array.isArray(r.scraps) ? r.scraps : [];

      scraps.forEach((sc: any, scrapIndex: number) => {
        const scrapSite = sc.location || 'その他スクラップ場';
        const item = sc.item || '品目未指定';
        const master = (settings.scrapLocations || []).find(
          (s: any) => s.location === scrapSite && s.item === item
        );
        const unit = sc.unit || master?.unit || 'kg';
        const quantity = Number(sc.quantity || 0);
        const rowKey = getScrapRowKey(r, sc, scrapIndex);
        const rawRowAmount = scrapRowOverrides[rowKey];
        const saleAmount =
          rawRowAmount !== '' && rawRowAmount !== undefined
            ? Number(rawRowAmount)
            : 0;

        if (!months[ym]) months[ym] = { sites: {} };
        if (!months[ym].sites[scrapSite]) {
          months[ym].sites[scrapSite] = {
            rows: [],
            quantityByUnit: {},
            rowSaleTotal: 0,
            statementKey: getMonthlyScrapStatementKey(locName, scrapSite, ym)
          };
        }

        const siteData = months[ym].sites[scrapSite];
        siteData.rows.push({
          rowKey,
          dateKey: normalized,
          displayDate,
          item,
          quantity,
          unit,
          saleAmount,
          saleOverride: rawRowAmount ?? ''
        });
        siteData.quantityByUnit[unit] =
          (siteData.quantityByUnit[unit] || 0) + quantity;
        siteData.rowSaleTotal += saleAmount;
      });
    });

    Object.values(months).forEach((monthData: any) => {
      Object.values(monthData.sites).forEach((siteData: any) => {
        siteData.rows.sort((a: any, b: any) =>
          a.dateKey.localeCompare(b.dateKey) || a.item.localeCompare(b.item, 'ja')
        );
        const rawStatement = monthlyScrapStatementTotals[siteData.statementKey];
        siteData.statementTotal =
          rawStatement !== '' && rawStatement !== undefined
            ? Number(rawStatement)
            : siteData.rowSaleTotal;
        siteData.statementOverride = rawStatement ?? '';
      });
    });

    return months;
  };

  const getDisposalMonthlyBreakdown = (locName: string) => {
    const targetNames = getTargetLocationNames(locName);
    const locReports = reports.filter(r => targetNames.includes(r.location));
    const canonicalOv = disposalOverrides[locName] || {};
    const bySite: any = {};

    locReports.forEach((r: any) => {
      const reportLocationName = r.location || locName;
      const reportOv = disposalOverrides[reportLocationName] || {};

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

        // 月別処分一覧では「実際の日報の現場名」で確定額を保存しているため、
        // 詳細分析でもまず同じ現場名の値を読む。
        // 過去に詳細分析側で保存した旧データは canonicalOv からフォールバックして互換維持する。
        const savedPrice =
          reportOv[priceKey] !== undefined ? reportOv[priceKey]
          : canonicalOv[priceKey] !== undefined ? canonicalOv[priceKey]
          : reportOv[legacyPriceKey] !== undefined ? reportOv[legacyPriceKey]
          : canonicalOv[legacyPriceKey];

        const effectiveUnitPrice =
          savedPrice !== '' && savedPrice !== undefined ? Number(savedPrice) : rawUnitPrice;
        const reportTotal = quantity * effectiveUnitPrice;

        // 請求確定額は日付別に実際に入力した値だけを共有する。
        // 月×品目の旧確定額は、複数行へ同じ金額が流れ込むためここでは使用しない。
        const savedInvoice =
          reportOv[invoiceKey] !== undefined ? reportOv[invoiceKey]
          : canonicalOv[invoiceKey];

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
          locationName: reportLocationName,
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

    const subcontractorBreakdownMap: {
      [key: string]: {
        key: string;
        company: string;
        task: string;
        count: number;
        unitPrice: number | null;
        reportTotal: number;
        hasMultipleUnitPrices: boolean;
      }
    } = {};

    const locSubcontractorMonthlyUnitPrices = subcontractorMonthlyUnitPrices[locName] || {};
    const locSubcontractorPeriodUnitPrices = Array.isArray(subcontractorPeriodUnitPrices[locName])
      ? subcontractorPeriodUnitPrices[locName]
      : [];
    const subcontractorMonthlyBreakdown: any = {};

    // 社員ごとの入場日数を集計。
    // 日付そのものは画面に出さず、「氏名：○日」だけを表示する。
    // 同じ日報内の重複や同日複数データがあっても、同じ現場・同じ人・同じ日は1日扱い。
    const workerAttendanceDateMap: { [name: string]: Set<string> } = {};
    const workerOvertimeTotalMap: { [name: string]: number } = {};
    const workerHalfDayCountMap: { [name: string]: number } = {};

    locMapped.forEach(r => {
      const dc = calculateReportDailyCost(r);
      calcLabor += dc.lCost;

      const attendanceDateKey = normalizeDateStr(r.date || '') || String(r.date || '');
      const attendanceWorkers = Array.from(
        new Set(
          (Array.isArray(r.workers) ? r.workers : [])
            .filter((name: any) => typeof name === 'string' && name.trim() !== '')
        )
      ) as string[];

      attendanceWorkers.forEach((workerName: string) => {
        if (!workerAttendanceDateMap[workerName]) {
          workerAttendanceDateMap[workerName] = new Set<string>();
        }
        workerAttendanceDateMap[workerName].add(attendanceDateKey);

        const reportOvertimeMap =
          r.workerOvertimeHours && typeof r.workerOvertimeHours === 'object'
            ? r.workerOvertimeHours
            : {};
        const reportHalfDayMap =
          r.workerHalfDay && typeof r.workerHalfDay === 'object'
            ? r.workerHalfDay
            : {};

        workerOvertimeTotalMap[workerName] =
          Number(workerOvertimeTotalMap[workerName] || 0) +
          Math.max(0, Number(reportOvertimeMap[workerName] || 0));

        if (reportHalfDayMap[workerName]) {
          workerHalfDayCountMap[workerName] =
            Number(workerHalfDayCountMap[workerName] || 0) + 1;
        }
      });

      calcSub += dc.subCost;

      // 外注業者ごとに、人数・単価・日報由来合計を集計
      const reportSubs = Array.isArray(r.subcontractors) ? r.subcontractors : [];
      reportSubs.forEach((sub: any, subIndex: number) => {
        const effectiveLine = getEffectiveSubcontractorInvoiceLine(locName, r, sub, subIndex);
        const company = effectiveLine.company;
        const task = effectiveLine.task;
        const key = effectiveLine.key;
        const baseUnitPrice = effectiveLine.unitPrice;
        const subDate = effectiveLine.date;
        const subParts = subDate.split('-');
        const subYearMonth = subParts.length >= 2 ? `${subParts[0]}-${subParts[1]}` : '日付不明';
        const monthlyOverrideKey = `${subYearMonth}__${key}`;
        const rawMonthlyOverride = locSubcontractorMonthlyUnitPrices[monthlyOverrideKey];
        const unitPrice = effectiveLine.unitPrice;
        const count = effectiveLine.count;
        const reportTotal = effectiveLine.amount;

        if (!subcontractorBreakdownMap[key]) {
          subcontractorBreakdownMap[key] = {
            key,
            company,
            task,
            count: 0,
            unitPrice,
            reportTotal: 0,
            hasMultipleUnitPrices: false
          };
        } else if (
          subcontractorBreakdownMap[key].unitPrice !== null &&
          Number(subcontractorBreakdownMap[key].unitPrice) !== unitPrice
        ) {
          subcontractorBreakdownMap[key].hasMultipleUnitPrices = true;
          subcontractorBreakdownMap[key].unitPrice = null;
        }

        subcontractorBreakdownMap[key].count += count;
        subcontractorBreakdownMap[key].reportTotal += reportTotal;

        if (!subcontractorMonthlyBreakdown[subYearMonth]) {
          subcontractorMonthlyBreakdown[subYearMonth] = { items: {}, total: 0, originalTotal: 0 };
        }
        if (!subcontractorMonthlyBreakdown[subYearMonth].items[key]) {
          subcontractorMonthlyBreakdown[subYearMonth].items[key] = {
            key,
            company,
            task,
            count: 0,
            baseUnitPrice,
            hasMultipleBaseUnitPrices: false,
            overrideValue: rawMonthlyOverride ?? '',
            unitPrice,
            total: 0,
            originalTotal: 0
          };
        } else if (
          !subcontractorMonthlyBreakdown[subYearMonth].items[key].hasMultipleBaseUnitPrices &&
          Number(subcontractorMonthlyBreakdown[subYearMonth].items[key].baseUnitPrice) !== baseUnitPrice
        ) {
          subcontractorMonthlyBreakdown[subYearMonth].items[key].hasMultipleBaseUnitPrices = true;
          subcontractorMonthlyBreakdown[subYearMonth].items[key].baseUnitPrice = null;
        }
        const monthlyItem = subcontractorMonthlyBreakdown[subYearMonth].items[key];
        monthlyItem.count += count;
        monthlyItem.overrideValue = rawMonthlyOverride ?? '';
        monthlyItem.unitPrice = unitPrice;
        monthlyItem.total += reportTotal;
        monthlyItem.originalTotal += count * baseUnitPrice;
        subcontractorMonthlyBreakdown[subYearMonth].total += reportTotal;
        subcontractorMonthlyBreakdown[subYearMonth].originalTotal += count * baseUnitPrice;
      });

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
        aggregatedScrapBreakdown[key].total += Number(data.total || 0);
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

    const workerMasterOrder = new Map(
      (settings.workers || []).map((worker: any, index: number) => [worker.name, index])
    );
    const workerAttendance = Object.entries(workerAttendanceDateMap)
      .map(([name, dateSet]) => ({
        name,
        days: dateSet.size,
        overtimeHours: Number(workerOvertimeTotalMap[name] || 0),
        halfDays: Number(workerHalfDayCountMap[name] || 0)
      }))
      .filter((entry: any) => entry.days > 0)
      .sort((a: any, b: any) => {
        const aOrder = workerMasterOrder.has(a.name) ? Number(workerMasterOrder.get(a.name)) : 999999;
        const bOrder = workerMasterOrder.has(b.name) ? Number(workerMasterOrder.get(b.name)) : 999999;
        return aOrder - bOrder || a.name.localeCompare(b.name, 'ja');
      });

    // 外注だけは「日報由来」と「管理画面の手動追加・一括外注分」を分けて見せるため、
    // ここでは純粋な日報由来分を保持する。
    const reportEstimateSub = calcSub;

    const locSubDetailOverrides = subcontractorDetailOverrides[locName] || {};
    const subcontractorBreakdown = Object.values(subcontractorBreakdownMap)
      .map((entry: any) => {
        const rawOverride = locSubDetailOverrides[entry.key];
        const confirmedTotal =
          rawOverride !== '' && rawOverride !== undefined
            ? Number(rawOverride)
            : Number(entry.reportTotal || 0);

        return {
          ...entry,
          confirmedTotal
        };
      })
      .sort((a: any, b: any) =>
        a.company.localeCompare(b.company, 'ja') ||
        a.task.localeCompare(b.task, 'ja')
      );

    const subcontractorConfirmedTotal = subcontractorBreakdown.reduce(
      (sum: number, entry: any) => sum + Number(entry.confirmedTotal || 0),
      0
    );

    // 全体上書きが無い場合は、業者別に調整した合計を原価側へ使う
    calcSub = subcontractorConfirmedTotal;

    // 「その他リース」は詳細分析では独立項目にせず、リース合計へ統合する。
    // 過去データ互換のため calcOtherLease 自体は残し、概算ではリース側へ加算する。
    const reportEstimateOtherLease = calcOtherLease;
    const reportEstimateLease = calcLease + reportEstimateOtherLease;
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
    const legacyOtherLeaseCost =
      ov.otherLease !== '' && ov.otherLease !== undefined
        ? Number(ov.otherLease)
        : calcOtherLease;
    const leaseBaseCost = (isIshikawaLeaseSplit
      ? ishikawaLeaseCost + mokLeaseCost
      : (ov.lease !== '' && ov.lease !== undefined ? Number(ov.lease) : calcLease)) + legacyOtherLeaseCost;
    const leaseCost = getExpenseInvoiceAdjustedTotal(locName, 'lease', leaseBaseCost);

    // 旧「その他リース」金額は leaseCost に統合済み。
    // 戻り値のキーは既存参照との互換のため残すが、別原価としては計上しない。
    const otherLeaseCost = 0;
    const ownMachineBaseCost = ov.ownMachine !== '' && ov.ownMachine !== undefined ? Number(ov.ownMachine) : calcOwnMachine;
    const vehicleBaseCost = ov.vehicle !== '' && ov.vehicle !== undefined ? Number(ov.vehicle) : calcVehicle;
    const ownMachineCost = getExpenseInvoiceAdjustedTotal(locName, 'ownMachine', ownMachineBaseCost);
    const vehicleCost = getExpenseInvoiceAdjustedTotal(locName, 'vehicle', vehicleBaseCost);
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
    const fuelBaseCost = isIshikawaFuelSplit
      ? osakaFuelCost + unokeFuelCost
      : (ov.fuel !== '' && ov.fuel !== undefined ? Number(ov.fuel) : calcFuel);
    const regularBaseCost = isIshikawaFuelSplit
      ? osakaRegularCost + unokeRegularCost
      : (ov.regular !== '' && ov.regular !== undefined ? Number(ov.regular) : calcRegular);
    const etcBaseCost = ov.etc !== '' && ov.etc !== undefined ? Number(ov.etc) : calcEtc;
    const parkingBaseCost = ov.parking !== '' && ov.parking !== undefined ? Number(ov.parking) : calcParking;
    const otherBaseCost = ov.other !== '' && ov.other !== undefined ? Number(ov.other) : calcOther;
    const fuelCost = getExpenseInvoiceAdjustedTotal(locName, 'fuel', fuelBaseCost);
    const regularCost = getExpenseInvoiceAdjustedTotal(locName, 'regular', regularBaseCost);
    const etcCost = getExpenseInvoiceAdjustedTotal(locName, 'etc', etcBaseCost);
    const parkingCost = getExpenseInvoiceAdjustedTotal(locName, 'parking', parkingBaseCost);
    const otherCost = getExpenseInvoiceAdjustedTotal(locName, 'other', otherBaseCost);

    // 管理画面でこの現場だけに追加した突発的な経費
    const customExtraExpenseList = Array.isArray(customExtraExpenses[locName])
      ? customExtraExpenses[locName]
      : [];
    const customExtraExpenseTotal = customExtraExpenseList.reduce(
      (sum: number, item: any) => sum + (Number(item.amount) || 0),
      0
    );

    const scOv = scrapOverrides[locName] || {};
    let scrapTotal = 0;

    if (scOv.total !== undefined && scOv.total !== '') {
      // 現場全体のスクラップ売却額を直接上書きしている場合は最優先。
      scrapTotal = Number(scOv.total);
    } else {
      // 基本は「現場 × スクラップ場 × 月」の仕切り書合計を使う。
      // 仕切り書合計が未入力の月は、スクラップ確認表の日別売却金額合計を使う。
      const monthlyScrapData = getLocationMonthlyScrapData(locName);
      Object.entries(monthlyScrapData).forEach(([ym, monthData]: any) => {
        Object.entries(monthData.sites || {}).forEach(([scrapSite, siteData]: any) => {
          const rawStatement = monthlyScrapStatementTotals[siteData.statementKey];
          if (rawStatement !== '' && rawStatement !== undefined) {
            scrapTotal += Number(rawStatement);
          } else if (Number(siteData.rowSaleTotal || 0) !== 0) {
            scrapTotal += Number(siteData.rowSaleTotal || 0);
          } else {
            // 過去の品目別上書きデータがある場合だけ互換用に利用。
            Object.entries(aggregatedScrapBreakdown).forEach(([key, data]: any) => {
              if (!key.startsWith(`${scrapSite} (`)) return;
              if (scOv[key] !== undefined && scOv[key] !== '') {
                scrapTotal += Number(scOv[key]);
              }
            });
          }
        });
      });
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
      ownMachineCost +
      vehicleCost +
      disposalCost +
      (isIshikawaFuelSplit ? ishikawaFuelCombinedCost : fuelCost + regularCost) +
      etcCost +
      parkingCost +
      otherCost +
      customExtraExpenseTotal;

    // 「日報由来概算合計」は costOverrides / disposalOverrides / 管理画面手入力を含めない。
    // 石川県案件の宇野気石油分は日報に金額が無いため、概算側では0円のまま。
    const reportEstimatedTotal =
      reportEstimateLabor +
      reportEstimateSubWithCustom +
      reportEstimateLease +
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
      customExtraExpenseList,
      customExtraExpenseTotal,
      scrapTotal,
      aggregatedScrapBreakdown,
      total: sumOverrideCost,
      reportEstimatedTotal,
      reportEstimateLabor,
      workerAttendance,
      reportEstimateSub,
      subcontractorBreakdown,
      subcontractorMonthlyBreakdown,
      subcontractorConfirmedTotal,
      customSubsList,
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
      clientStr: String(matchedLocObj?.clientName || '').trim() || clients.join(', ') || '',
      startDateStr: String(matchedLocObj?.startDate || '').trim() || startDates[0] || '',
      totalFuelLitering,
      totalRegularLitering,
      totalUnokeFuelLitering,
      totalUnokeRegularLitering,
      monthlyFuelBreakdown
    };
  };

  const downloadLocationExcel = (locName: string) => {
    const targetNames = getTargetLocationNames(locName);
    const locReports = reports
      .filter((r: any) => targetNames.includes(r.location))
      .sort((a: any, b: any) => String(a.date || '').localeCompare(String(b.date || '')));

    const costs = calculateCosts(locName);
    const disposalData = getDisposalMonthlyBreakdown(locName);
    const scrapData = getLocationMonthlyScrapData(locName);

    const workbook = XLSX.utils.book_new();

    const yenFormat = '¥#,##0;[Red]-¥#,##0';
    const numberFormat = '#,##0';
    const decimalFormat = '#,##0.00';
    const percentFormat = '0.0%';

    const setNumberFormat = (ws: any, cellAddress: string, format: string) => {
      if (ws[cellAddress] && typeof ws[cellAddress].v === 'number') {
        ws[cellAddress].z = format;
      }
    };

    const setRowFormats = (
      ws: any,
      startRow: number,
      endRow: number,
      columns: number[],
      format: string
    ) => {
      for (let r = startRow; r <= endRow; r++) {
        columns.forEach((c) => {
          const address = XLSX.utils.encode_cell({ r, c });
          setNumberFormat(ws, address, format);
        });
      }
    };


    // ============================================================
    // Excel表示用 共通デザイン
    // ※ xlsx-js-style を使い、背景色・フォント・罫線・配置を保存
    // ============================================================
    const excelFont = 'Yu Gothic';

    const colors = {
      navy: '1F4E78',
      blue: '4472C4',
      lightBlue: 'D9EAF7',
      veryLightBlue: 'F4F8FC',
      green: '70AD47',
      lightGreen: 'E2F0D9',
      orange: 'ED7D31',
      lightOrange: 'FCE4D6',
      gray: 'E7E6E6',
      lightGray: 'F7F7F7',
      dark: '1F2937',
      white: 'FFFFFF',
      border: 'C9D2DC'
    };

    const thinBorder = {
      top: { style: 'thin', color: { rgb: colors.border } },
      bottom: { style: 'thin', color: { rgb: colors.border } },
      left: { style: 'thin', color: { rgb: colors.border } },
      right: { style: 'thin', color: { rgb: colors.border } }
    };

    const applyStyle = (ws: any, address: string, style: any) => {
      if (!ws[address]) return;
      ws[address].s = {
        ...(ws[address].s || {}),
        ...style,
        font: {
          name: excelFont,
          sz: 11,
          color: { rgb: colors.dark },
          ...(ws[address].s?.font || {}),
          ...(style.font || {})
        },
        alignment: {
          vertical: 'center',
          ...(ws[address].s?.alignment || {}),
          ...(style.alignment || {})
        }
      };
    };

    const styleRange = (ws: any, range: string, style: any) => {
      const decoded = XLSX.utils.decode_range(range);
      for (let r = decoded.s.r; r <= decoded.e.r; r++) {
        for (let c = decoded.s.c; c <= decoded.e.c; c++) {
          applyStyle(ws, XLSX.utils.encode_cell({ r, c }), style);
        }
      }
    };

    const styleUsedRange = (ws: any) => {
      if (!ws['!ref']) return;
      const decoded = XLSX.utils.decode_range(ws['!ref']);
      for (let r = decoded.s.r; r <= decoded.e.r; r++) {
        for (let c = decoded.s.c; c <= decoded.e.c; c++) {
          const address = XLSX.utils.encode_cell({ r, c });
          if (!ws[address]) continue;
          applyStyle(ws, address, {
            font: { name: excelFont, sz: 11, color: { rgb: colors.dark } },
            alignment: {
              vertical: 'center',
              wrapText: true
            }
          });
        }
      }
    };

    const styleTableHeader = (ws: any, range: string) => {
      styleRange(ws, range, {
        fill: { fgColor: { rgb: colors.blue } },
        font: { name: excelFont, sz: 11, bold: true, color: { rgb: colors.white } },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        border: thinBorder
      });
    };

    const styleTotalRow = (ws: any, range: string) => {
      styleRange(ws, range, {
        fill: { fgColor: { rgb: colors.lightGreen } },
        font: { name: excelFont, sz: 11, bold: true, color: { rgb: colors.dark } },
        border: thinBorder,
        alignment: { vertical: 'center' }
      });
    };

    const setBodyBorders = (ws: any, range: string) => {
      styleRange(ws, range, {
        border: thinBorder,
        alignment: { vertical: 'center', wrapText: true }
      });
    };

    // ============================================================
    // 1. 現場サマリー
    // ============================================================
    const costRate =
      Number(costs.contractPrice || 0) > 0
        ? Number(costs.total || 0) / Number(costs.contractPrice || 0)
        : 0;

    const summaryRows: any[][] = [
      [`${locName}　現場完了・集計資料`, '', '', ''],
      ['', '', '', ''],
      ['【現場概要】', '', '', ''],
      ['現場名', locName, '状態', costs.isFinished ? '完了' : '稼働中'],
      ['請負先', costs.clientStr || '未登録', '開始日', costs.startDateStr || '未登録'],
      ['日報件数', Number(costs.days || 0), '出力日', new Date().toLocaleDateString('ja-JP')],
      ['', '', '', ''],
      ['【収支サマリー】', '', '', ''],
      ['請負金額', Number(costs.contractPrice || 0), '原価率', costRate],
      ['経費合計', Number(costs.total || 0), 'スクラップ売却', Number(costs.scrapTotal || 0)],
      ['利益（スクラップ込）', Number(costs.profit || 0), '利益（スクラップ除く）', Number(costs.profitWithoutScrap || 0)],
      ['', '', '', ''],
      ['【経費内訳】', '金額', '構成比', ''],
      ['人件費', Number(costs.laborCost || 0), Number(costs.total || 0) ? Number(costs.laborCost || 0) / Number(costs.total || 0) : 0, ''],
      ['外注費', Number(costs.subCostTotal || 0), Number(costs.total || 0) ? Number(costs.subCostTotal || 0) / Number(costs.total || 0) : 0, ''],
      ['リース', Number(costs.leaseCost || 0) + Number(costs.otherLeaseCost || 0), Number(costs.total || 0) ? (Number(costs.leaseCost || 0) + Number(costs.otherLeaseCost || 0)) / Number(costs.total || 0) : 0, ''],
      ['自社重機', Number(costs.ownMachineCost || 0), Number(costs.total || 0) ? Number(costs.ownMachineCost || 0) / Number(costs.total || 0) : 0, ''],
      ['車両', Number(costs.vehicleCost || 0), Number(costs.total || 0) ? Number(costs.vehicleCost || 0) / Number(costs.total || 0) : 0, ''],
      ['処分費', Number(costs.disposalCost || 0), Number(costs.total || 0) ? Number(costs.disposalCost || 0) / Number(costs.total || 0) : 0, ''],
      ['燃料・レギュラー', Number(costs.fuelCost || 0) + Number(costs.regularCost || 0), Number(costs.total || 0) ? (Number(costs.fuelCost || 0) + Number(costs.regularCost || 0)) / Number(costs.total || 0) : 0, ''],
      ['ETC', Number(costs.etcCost || 0), Number(costs.total || 0) ? Number(costs.etcCost || 0) / Number(costs.total || 0) : 0, ''],
      ['駐車場', Number(costs.parkingCost || 0), Number(costs.total || 0) ? Number(costs.parkingCost || 0) / Number(costs.total || 0) : 0, ''],
      ['その他', Number(costs.otherCost || 0) + Number(costs.customExtraExpenseTotal || 0), Number(costs.total || 0) ? (Number(costs.otherCost || 0) + Number(costs.customExtraExpenseTotal || 0)) / Number(costs.total || 0) : 0, ''],
      ['経費合計', Number(costs.total || 0), 1, '']
    ];

    const summaryWs = XLSX.utils.aoa_to_sheet(summaryRows);
    summaryWs['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 3 } },
      { s: { r: 7, c: 0 }, e: { r: 7, c: 3 } }
    ];
    summaryWs['!cols'] = [
      { wch: 26 },
      { wch: 34 },
      { wch: 26 },
      { wch: 28 }
    ];
    summaryWs['!rows'] = Array.from({ length: summaryRows.length }, (_, idx) => ({
      hpt:
        idx === 0 ? 38 :
        idx === 1 || idx === 6 || idx === 11 ? 10 :
        idx === 2 || idx === 7 || idx === 12 ? 28 :
        25
    }));

    ['B9', 'B10', 'D10', 'B11', 'D11'].forEach((addr) =>
      setNumberFormat(summaryWs, addr, yenFormat)
    );
    for (let r = 13; r <= 23; r++) {
      setNumberFormat(summaryWs, `B${r + 1}`, yenFormat);
      setNumberFormat(summaryWs, `C${r + 1}`, percentFormat);
    }
    setNumberFormat(summaryWs, 'D9', percentFormat);
    setNumberFormat(summaryWs, 'B6', numberFormat);

    styleUsedRange(summaryWs);

    // タイトル
    styleRange(summaryWs, 'A1:D1', {
      fill: { fgColor: { rgb: colors.navy } },
      font: { name: excelFont, sz: 18, bold: true, color: { rgb: colors.white } },
      alignment: { horizontal: 'center', vertical: 'center' }
    });

    // セクション見出し
    ['A3:D3', 'A8:D8'].forEach((range) => {
      styleRange(summaryWs, range, {
        fill: { fgColor: { rgb: colors.lightBlue } },
        font: { name: excelFont, sz: 12, bold: true, color: { rgb: colors.navy } },
        alignment: { vertical: 'center' },
        border: thinBorder
      });
    });

    // 現場概要
    styleRange(summaryWs, 'A4:D6', {
      border: thinBorder,
      alignment: { vertical: 'center', wrapText: true }
    });
    ['A4', 'C4', 'A5', 'C5', 'A6', 'C6'].forEach((addr) => {
      applyStyle(summaryWs, addr, {
        fill: { fgColor: { rgb: colors.lightGray } },
        font: { name: excelFont, sz: 11, bold: true, color: { rgb: colors.dark } }
      });
    });

    // 収支サマリー：重要数字が一目で分かる配色
    styleRange(summaryWs, 'A9:D11', { border: thinBorder });
    ['A9', 'C9', 'A10', 'C10', 'A11', 'C11'].forEach((addr) => {
      applyStyle(summaryWs, addr, {
        fill: { fgColor: { rgb: colors.lightGray } },
        font: { name: excelFont, sz: 11, bold: true }
      });
    });
    applyStyle(summaryWs, 'B9', {
      fill: { fgColor: { rgb: colors.veryLightBlue } },
      font: { name: excelFont, sz: 14, bold: true, color: { rgb: colors.navy } },
      alignment: { horizontal: 'right' }
    });
    applyStyle(summaryWs, 'D9', {
      fill: { fgColor: { rgb: colors.lightOrange } },
      font: { name: excelFont, sz: 14, bold: true, color: { rgb: colors.orange } },
      alignment: { horizontal: 'right' }
    });
    applyStyle(summaryWs, 'B10', {
      fill: { fgColor: { rgb: colors.lightOrange } },
      font: { name: excelFont, sz: 14, bold: true, color: { rgb: colors.orange } },
      alignment: { horizontal: 'right' }
    });
    applyStyle(summaryWs, 'D10', {
      fill: { fgColor: { rgb: colors.veryLightBlue } },
      font: { name: excelFont, sz: 14, bold: true, color: { rgb: colors.navy } },
      alignment: { horizontal: 'right' }
    });
    ['B11', 'D11'].forEach((addr) => {
      applyStyle(summaryWs, addr, {
        fill: { fgColor: { rgb: colors.lightGreen } },
        font: { name: excelFont, sz: 14, bold: true, color: { rgb: colors.green } },
        alignment: { horizontal: 'right' }
      });
    });

    // 経費内訳表
    styleTableHeader(summaryWs, 'A13:C13');
    setBodyBorders(summaryWs, 'A14:C24');
    styleRange(summaryWs, 'B14:C24', { alignment: { horizontal: 'right', vertical: 'center' } });
    for (let r = 14; r <= 23; r++) {
      if (r % 2 === 0) {
        styleRange(summaryWs, `A${r}:C${r}`, {
          fill: { fgColor: { rgb: colors.veryLightBlue } }
        });
      }
    }
    styleTotalRow(summaryWs, 'A24:C24');

    XLSX.utils.book_append_sheet(workbook, summaryWs, '現場サマリー');

    // ============================================================
    // 2. 日報一覧
    // ============================================================
    const dailyHeaders = [
      '日付', '職長', '作業者', '職種・人数', '外注',
      'リース・重機', '自社重機', '車両',
      '軽油L', 'レギュラー購入額', '宇野気石油 軽油L',
      '宇野気石油 レギュラーL', 'ETC', '駐車場代',
      '雑費名', '雑費金額', '作業内容', '日報原価概算'
    ];

    const dailyRows = locReports.map((r: any) => {
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

      const dailyCost = calculateReportDailyCost(r);
      const dailyTotal =
        Number(dailyCost.lCost || 0) +
        Number(dailyCost.subCost || 0) +
        Number(dailyCost.leaseC || 0) +
        Number(dailyCost.otherLeaseC || 0) +
        Number(dailyCost.ownMachineC || 0) +
        Number(dailyCost.vehicleC || 0) +
        Number(dailyCost.dispC || 0) +
        Number(dailyCost.fC || 0) +
        Number(dailyCost.regularPrice || 0) +
        Number(dailyCost.eC || 0) +
        Number(dailyCost.pC || 0) +
        Number(dailyCost.oC || 0);

      return [
        r.date || '',
        r.manager || '',
        workers.join(' / '),
        Object.entries(r.jobTypes || {})
          .map(([job, count]) => `${job}:${count}人`)
          .join(' / '),
        subcontractors
          .map((s: any) => `${s.company}（${s.task}:${s.count}人）`)
          .join(' / '),
        [
          ...machines,
          ...leaseHeavy,
          ...leaseAttach,
          ...leaseOther,
          ...ishikawaHeavy,
          ...ishikawaAttach,
          ...ishikawaOther,
          ...mokCustomMachines.map((m: any) => `${m.name}(${m.count}個)`),
          ...otherLeases.map((ol: any) => `${ol.company}:${ol.name}(${ol.count}個)`)
        ].join(' / '),
        ownMachines.join(' / '),
        vehicles.join(' / '),
        Number(r.fuel || 0),
        Number(r.regularPrice || 0),
        Number(r.unokeFuel || 0),
        Number(r.unokeRegular || 0),
        Number(r.etcPrice || 0),
        Number(r.parkingPrice || 0),
        r.otherItem || '',
        Number(r.otherPrice || 0),
        r.workDescription || '',
        dailyTotal
      ];
    });

    const dailyTotalRow = [
      '合計', '', '', '', '', '', '', '',
      dailyRows.reduce((s: number, r: any[]) => s + Number(r[8] || 0), 0),
      dailyRows.reduce((s: number, r: any[]) => s + Number(r[9] || 0), 0),
      dailyRows.reduce((s: number, r: any[]) => s + Number(r[10] || 0), 0),
      dailyRows.reduce((s: number, r: any[]) => s + Number(r[11] || 0), 0),
      dailyRows.reduce((s: number, r: any[]) => s + Number(r[12] || 0), 0),
      dailyRows.reduce((s: number, r: any[]) => s + Number(r[13] || 0), 0),
      '',
      dailyRows.reduce((s: number, r: any[]) => s + Number(r[15] || 0), 0),
      '',
      dailyRows.reduce((s: number, r: any[]) => s + Number(r[17] || 0), 0)
    ];

    const dailyWs = XLSX.utils.aoa_to_sheet([dailyHeaders, ...dailyRows, dailyTotalRow]);
    dailyWs['!cols'] = [
      { wch: 12 }, { wch: 14 }, { wch: 28 }, { wch: 24 }, { wch: 30 },
      { wch: 34 }, { wch: 25 }, { wch: 25 }, { wch: 10 }, { wch: 16 },
      { wch: 16 }, { wch: 18 }, { wch: 13 }, { wch: 13 }, { wch: 20 },
      { wch: 15 }, { wch: 48 }, { wch: 18 }
    ];
    dailyWs['!rows'] = Array.from({ length: dailyRows.length + 2 }, (_, idx) => ({
      hpt: idx === 0 ? 34 : idx === dailyRows.length + 1 ? 30 : 28
    }));
    dailyWs['!autofilter'] = {
      ref: XLSX.utils.encode_range({
        s: { r: 0, c: 0 },
        e: { r: Math.max(dailyRows.length, 1), c: dailyHeaders.length - 1 }
      })
    };
    setRowFormats(dailyWs, 1, dailyRows.length + 1, [8, 10, 11], decimalFormat);
    setRowFormats(dailyWs, 1, dailyRows.length + 1, [9, 12, 13, 15, 17], yenFormat);

    styleUsedRange(dailyWs);
    styleTableHeader(dailyWs, `A1:R1`);
    if (dailyRows.length > 0) {
      setBodyBorders(dailyWs, `A2:R${dailyRows.length + 1}`);
      for (let r = 2; r <= dailyRows.length + 1; r++) {
        if (r % 2 === 0) {
          styleRange(dailyWs, `A${r}:R${r}`, {
            fill: { fgColor: { rgb: colors.veryLightBlue } }
          });
        }
      }
    }
    styleTotalRow(dailyWs, `A${dailyRows.length + 2}:R${dailyRows.length + 2}`);
    styleRange(dailyWs, `I2:R${dailyRows.length + 2}`, {
      alignment: { vertical: 'center', wrapText: true }
    });

    XLSX.utils.book_append_sheet(workbook, dailyWs, '日報一覧');

    // ============================================================
    // 3. 人員・外注集計
    // ============================================================
    const workerRows = (costs.workerAttendance || []).map((x: any) => [
      x.name,
      Number(x.days || 0),
      Number(x.halfDays || 0),
      Number(x.overtimeHours || 0)
    ]);

    const subRows = (costs.subcontractorBreakdown || []).map((x: any) => [
      x.company,
      x.task,
      Number(x.count || 0),
      Number(x.confirmedTotal || 0)
    ]);

    const customSubRows = (customSubcontractors[locName] || []).map((x: any) => [
      x.company,
      x.task || '一括請負',
      '',
      Number(x.price || 0)
    ]);

    const peopleSheetRows: any[][] = [
      ['【作業員 稼働集計】', '', '', ''],
      ['作業員名', '稼働日数', '半日回数', '残業時間'],
      ...workerRows,
      [
        '合計',
        workerRows.reduce((s: number, x: any[]) => s + Number(x[1] || 0), 0),
        workerRows.reduce((s: number, x: any[]) => s + Number(x[2] || 0), 0),
        workerRows.reduce((s: number, x: any[]) => s + Number(x[3] || 0), 0)
      ],
      ['', '', '', ''],
      ['【外注費 集計】', '', '', ''],
      ['会社名', '作業内容', '延べ人数', '確定金額'],
      ...subRows,
      ...customSubRows,
      ['外注費合計', '', '', Number(costs.subCostTotal || 0)]
    ];

    const peopleWs = XLSX.utils.aoa_to_sheet(peopleSheetRows);
    peopleWs['!cols'] = [
      { wch: 28 }, { wch: 34 }, { wch: 16 }, { wch: 20 }
    ];
    peopleWs['!rows'] = Array.from({ length: peopleSheetRows.length }, (_, idx) => ({
      hpt: idx === 0 || peopleSheetRows[idx]?.[0] === '【外注費 集計】' ? 30 : 25
    }));
    Object.keys(peopleWs).forEach((addr) => {
      if (addr.startsWith('D') && peopleWs[addr] && typeof peopleWs[addr].v === 'number') {
        peopleWs[addr].z = yenFormat;
      }
    });

    styleUsedRange(peopleWs);
    const workerHeaderRow = 2;
    const workerTotalRow = workerRows.length + 3;
    const subTitleRow = workerRows.length + 5;
    const subHeaderRow = workerRows.length + 6;
    const subTotalRow = peopleSheetRows.length;

    styleRange(peopleWs, 'A1:D1', {
      fill: { fgColor: { rgb: colors.lightBlue } },
      font: { name: excelFont, sz: 13, bold: true, color: { rgb: colors.navy } },
      border: thinBorder
    });
    styleTableHeader(peopleWs, `A${workerHeaderRow}:D${workerHeaderRow}`);
    if (workerRows.length > 0) setBodyBorders(peopleWs, `A3:D${workerTotalRow - 1}`);
    styleTotalRow(peopleWs, `A${workerTotalRow}:D${workerTotalRow}`);

    styleRange(peopleWs, `A${subTitleRow}:D${subTitleRow}`, {
      fill: { fgColor: { rgb: colors.lightBlue } },
      font: { name: excelFont, sz: 13, bold: true, color: { rgb: colors.navy } },
      border: thinBorder
    });
    styleTableHeader(peopleWs, `A${subHeaderRow}:D${subHeaderRow}`);
    if (subTotalRow > subHeaderRow + 1) {
      setBodyBorders(peopleWs, `A${subHeaderRow + 1}:D${subTotalRow - 1}`);
    }
    styleTotalRow(peopleWs, `A${subTotalRow}:D${subTotalRow}`);

    XLSX.utils.book_append_sheet(workbook, peopleWs, '人員・外注集計');

    // ============================================================
    // 4. 処分費集計
    // ============================================================
    const disposalRows: any[][] = [];
    Object.entries(disposalData.bySite || {}).forEach(([siteName, siteData]: any) => {
      Object.entries(siteData.months || {}).forEach(([ym, monthData]: any) => {
        Object.values(monthData.days || {}).forEach((dayData: any) => {
          (dayData.rows || []).forEach((row: any) => {
            disposalRows.push([
              siteName,
              ym,
              row.dateKey || '',
              row.item || '',
              Number(row.quantity || 0),
              row.unit || '',
              Number(row.confirmedTotal || 0)
            ]);
          });
        });
      });
    });

    const disposalSheetRows = [
      ['処分場', '月', '日付', '品目', '数量', '単位', '確定金額'],
      ...disposalRows,
      [
        '合計', '', '', '', '', '',
        Number(costs.disposalCost || 0)
      ]
    ];

    const disposalWs = XLSX.utils.aoa_to_sheet(disposalSheetRows);
    disposalWs['!cols'] = [
      { wch: 30 }, { wch: 11 }, { wch: 13 }, { wch: 28 },
      { wch: 13 }, { wch: 11 }, { wch: 20 }
    ];
    disposalWs['!rows'] = Array.from({ length: disposalRows.length + 2 }, (_, idx) => ({
      hpt: idx === 0 ? 32 : idx === disposalRows.length + 1 ? 30 : 25
    }));
    disposalWs['!autofilter'] = {
      ref: XLSX.utils.encode_range({
        s: { r: 0, c: 0 },
        e: { r: Math.max(disposalRows.length, 1), c: 6 }
      })
    };
    setRowFormats(disposalWs, 1, disposalRows.length + 1, [4], decimalFormat);
    setRowFormats(disposalWs, 1, disposalRows.length + 1, [6], yenFormat);

    styleUsedRange(disposalWs);
    styleTableHeader(disposalWs, 'A1:G1');
    if (disposalRows.length > 0) {
      setBodyBorders(disposalWs, `A2:G${disposalRows.length + 1}`);
      for (let r = 2; r <= disposalRows.length + 1; r++) {
        if (r % 2 === 0) styleRange(disposalWs, `A${r}:G${r}`, { fill: { fgColor: { rgb: colors.veryLightBlue } } });
      }
    }
    styleTotalRow(disposalWs, `A${disposalRows.length + 2}:G${disposalRows.length + 2}`);

    XLSX.utils.book_append_sheet(workbook, disposalWs, '処分費集計');

    // ============================================================
    // 5. スクラップ集計
    // ============================================================
    const scrapRows: any[][] = [];
    Object.entries(scrapData || {}).forEach(([ym, monthData]: any) => {
      Object.entries(monthData.sites || {}).forEach(([siteName, siteData]: any) => {
        (siteData.rows || []).forEach((row: any) => {
          scrapRows.push([
            ym,
            siteName,
            row.dateKey || '',
            row.item || '',
            Number(row.quantity || 0),
            row.unit || '',
            Number(row.saleAmount || 0)
          ]);
        });

        scrapRows.push([
          ym,
          `${siteName}（月計）`,
          '',
          '仕切書・月計',
          '',
          '',
          Number(siteData.statementTotal || 0)
        ]);
      });
    });

    const scrapSheetRows = [
      ['月', 'スクラップ場', '日付', '品目', '数量', '単位', '売却金額'],
      ...scrapRows,
      ['合計', '', '', '', '', '', Number(costs.scrapTotal || 0)]
    ];

    const scrapWs = XLSX.utils.aoa_to_sheet(scrapSheetRows);
    scrapWs['!cols'] = [
      { wch: 11 }, { wch: 32 }, { wch: 13 }, { wch: 28 },
      { wch: 13 }, { wch: 11 }, { wch: 20 }
    ];
    scrapWs['!rows'] = Array.from({ length: scrapRows.length + 2 }, (_, idx) => ({
      hpt: idx === 0 ? 32 : idx === scrapRows.length + 1 ? 30 : 25
    }));
    scrapWs['!autofilter'] = {
      ref: XLSX.utils.encode_range({
        s: { r: 0, c: 0 },
        e: { r: Math.max(scrapRows.length, 1), c: 6 }
      })
    };
    setRowFormats(scrapWs, 1, scrapRows.length + 1, [4], decimalFormat);
    setRowFormats(scrapWs, 1, scrapRows.length + 1, [6], yenFormat);

    styleUsedRange(scrapWs);
    styleTableHeader(scrapWs, 'A1:G1');
    if (scrapRows.length > 0) {
      setBodyBorders(scrapWs, `A2:G${scrapRows.length + 1}`);
      for (let r = 2; r <= scrapRows.length + 1; r++) {
        if (r % 2 === 0) styleRange(scrapWs, `A${r}:G${r}`, { fill: { fgColor: { rgb: colors.veryLightBlue } } });
      }
    }
    styleTotalRow(scrapWs, `A${scrapRows.length + 2}:G${scrapRows.length + 2}`);

    XLSX.utils.book_append_sheet(workbook, scrapWs, 'スクラップ集計');

    // ============================================================
    // 6. その他経費
    // ============================================================
    const extraRows: any[][] = [];

    locReports.forEach((r: any) => {
      if (Number(r.etcPrice || 0) !== 0) {
        extraRows.push([r.date || '', 'ETC', 'ETC', Number(r.etcPrice || 0)]);
      }
      if (Number(r.parkingPrice || 0) !== 0) {
        extraRows.push([r.date || '', '駐車場', '駐車場代', Number(r.parkingPrice || 0)]);
      }
      if (Number(r.otherPrice || 0) !== 0) {
        extraRows.push([r.date || '', 'その他', r.otherItem || 'その他', Number(r.otherPrice || 0)]);
      }
    });

    (costs.customExtraExpenseList || []).forEach((x: any) => {
      extraRows.push(['管理側追加', 'その他', x.label || 'その他経費', Number(x.amount || 0)]);
    });

    const extraTotal = extraRows.reduce((s: number, r: any[]) => s + Number(r[3] || 0), 0);

    const extraWs = XLSX.utils.aoa_to_sheet([
      ['日付', '区分', '内容', '金額'],
      ...extraRows,
      ['合計', '', '', extraTotal]
    ]);
    extraWs['!cols'] = [
      { wch: 15 }, { wch: 18 }, { wch: 40 }, { wch: 20 }
    ];
    extraWs['!rows'] = Array.from({ length: extraRows.length + 2 }, (_, idx) => ({
      hpt: idx === 0 ? 32 : idx === extraRows.length + 1 ? 30 : 25
    }));
    setRowFormats(extraWs, 1, extraRows.length + 1, [3], yenFormat);

    styleUsedRange(extraWs);
    styleTableHeader(extraWs, 'A1:D1');
    if (extraRows.length > 0) {
      setBodyBorders(extraWs, `A2:D${extraRows.length + 1}`);
      for (let r = 2; r <= extraRows.length + 1; r++) {
        if (r % 2 === 0) styleRange(extraWs, `A${r}:D${r}`, { fill: { fgColor: { rgb: colors.veryLightBlue } } });
      }
    }
    styleTotalRow(extraWs, `A${extraRows.length + 2}:D${extraRows.length + 2}`);

    XLSX.utils.book_append_sheet(workbook, extraWs, 'その他経費');

    workbook.Props = {
      Title: `${locName} 現場完了・集計資料`,
      Subject: '現場日報・原価集計',
      Author: '株式会社大和',
      CreatedDate: new Date()
    };

    const safeFileName = locName.replace(/[\\/:*?"<>|]/g, '_');
    XLSX.writeFile(workbook, `${safeFileName}_現場完了集計.xlsx`);
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

  const getScrapRowKey = (report: any, scrap: any, scrapIndex: number) => {
    const reportId = report?.id || report?._id || report?.reportId || '';
    const dateKey = normalizeDateStr(report?.date || '') || String(report?.date || '');
    const locationName = report?.location || '現場名未設定';
    const scrapSite = scrap?.location || 'その他スクラップ場';
    const item = scrap?.item || '品目未指定';
    return `${reportId || `${dateKey}_${locationName}`}__${scrapSite}__${item}__${scrapIndex}`;
  };

  const getAllMonthlyScrapGroupedData = () => {
    const grouped: any = {};

    reports.forEach((r: any) => {
      const normalized = normalizeDateStr(r.date || '');
      const parts = normalized.split('-');
      if (parts.length < 2) return;

      const ym = `${parts[0]}-${parts[1]}`;
      const formattedDate =
        parts.length >= 3 ? `${Number(parts[1])}/${Number(parts[2])}` : String(r.date || '');
      const locationName = r.location || '現場名未設定';
      const canonicalLocation = getCanonicalLocationForReport(locationName);
      const scraps = Array.isArray(r.scraps) ? r.scraps : [];

      scraps.forEach((sc: any, scrapIndex: number) => {
        const scrapSite = sc.location || 'その他スクラップ場';
        const item = sc.item || '品目未指定';
        const master = (settings.scrapLocations || []).find(
          (s: any) => s.location === scrapSite && s.item === item
        );
        const unit = sc.unit || master?.unit || 'kg';
        const quantity = Number(sc.quantity || 0);
        const rowKey = getScrapRowKey(r, sc, scrapIndex);
        const override = scrapRowOverrides[rowKey];
        const saleAmount =
          override !== '' && override !== undefined
            ? Number(override)
            : 0;

        if (!grouped[scrapSite]) grouped[scrapSite] = {};
        if (!grouped[scrapSite][ym]) grouped[scrapSite][ym] = [];

        grouped[scrapSite][ym].push({
          rowKey,
          dateKey: normalized,
          formattedDate,
          locationName,
          canonicalLocation,
          statementKey: getMonthlyScrapStatementKey(canonicalLocation, scrapSite, ym),
          item,
          quantity,
          unit,
          saleAmount,
          saleOverride: override ?? ''
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

        // 請求確定額は、その日・その品目へ実際に入力した値だけを使用する。
        // 旧「月×品目」確定額は別行へ流れ込む恐れがあるため、日付別一覧では使用しない。
        const savedInvoice = locOv[invoiceKey];
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
              className="w-full bg-slate-500 hover:bg-slate-800 text-white py-4 rounded-2xl font-bold text-base md:text-lg transition shadow-md"
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

  const renderAttendanceTools = () => (
    <div className="flex flex-wrap items-center gap-3 text-xs">
      <span className="inline-flex items-center gap-1.5"><span className="w-4 h-4 bg-slate-800 rounded"></span>会社休日</span>
      <span className="inline-flex items-center gap-1.5"><span className="w-4 h-4 bg-orange-100 border border-orange-300 rounded"></span>休日出勤</span>
      <span className="inline-flex items-center gap-1.5"><span className="w-4 h-4 bg-amber-100 border border-amber-300 rounded"></span>半日</span>
      <span className="inline-flex items-center gap-1.5"><span className="w-4 h-4 bg-rose-100 border border-rose-300 rounded"></span>欠勤候補</span>
      <span className="inline-flex items-center gap-1.5">
        <span className="w-4 h-4 bg-sky-100 border border-sky-300 rounded"></span>
        現場クリック（1・2・3…でカウント）
      </span>

      <div className="ml-1 inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-2 py-1.5">
        <span className="text-blue-800 font-bold">手動勤怠：</span>
        <div draggable onDragStart={(e) => { e.dataTransfer.setData('text/plain', '管理'); e.dataTransfer.effectAllowed = 'copy'; }} title="「欠勤?」または「休」のセルへドラッグしてください" className="cursor-grab active:cursor-grabbing select-none rounded-lg border-2 border-blue-400 bg-white px-3 py-1.5 font-bold text-blue-700 shadow-sm">管理</div>
        <div draggable onDragStart={(e) => { e.dataTransfer.setData('text/plain', 'サンセイ'); e.dataTransfer.effectAllowed = 'copy'; }} title="日報が入っていない日付セルへドラッグしてください" className="cursor-grab active:cursor-grabbing select-none rounded-lg border-2 border-emerald-400 bg-white px-3 py-1.5 font-bold text-emerald-700 shadow-sm">サンセイ</div>
        <div draggable onDragStart={(e) => { e.dataTransfer.setData('text/plain', '欠勤'); e.dataTransfer.effectAllowed = 'copy'; }} title="日報がない出勤日のセルへドラッグしてください" className="cursor-grab active:cursor-grabbing select-none rounded-lg border-2 border-rose-400 bg-white px-3 py-1.5 font-bold text-rose-700 shadow-sm">欠勤</div>
        <span className="text-slate-500">→ 日報がないセルへ</span>
      </div>

      <div className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-slate-100 px-2 py-1.5">
        <span className="font-bold text-slate-700">個別休日変更：</span>
        <span className="text-slate-600">表内の「休」を右クリック→移動先を右クリック。ドラッグ、または「休」をクリック→移動先をクリックでも可（日曜日も可・会社カレンダー自体は変更しません）</span>
      </div>

      <div className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-2 py-1.5">
        <span className="text-violet-800 font-bold">有給：</span>
        {(['有給', '午前有給', '午後有給'] as const).map((leaveType) => (
          <div key={leaveType} draggable onDragStart={(e) => { e.dataTransfer.setData('text/plain', `PAID_LEAVE:${leaveType}`); e.dataTransfer.effectAllowed = 'copy'; }} title="どの日付セルにもドラッグできます" className="cursor-grab active:cursor-grabbing select-none rounded-lg border-2 border-violet-300 bg-white px-2 py-1.5 font-bold text-violet-700 shadow-sm">{leaveType}</div>
        ))}
        <span className="text-slate-500">→どのセルにも可</span>
      </div>
    </div>
  );

  const formatAttendanceHistoryTime = (value: string) => {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // 管理画面上部の「新着・要確認」ダッシュボード用。
  // 日報は flat / { id, data: {...} } のどちらのAPI形式でも扱えるように正規化する。
  const dashboardReports = reports.map((raw: any) =>
    raw?.data && typeof raw.data === 'object'
      ? { ...raw.data, id: raw.id || raw.data.id, _rawReport: raw }
      : { ...(raw || {}), _rawReport: raw }
  );

  const toLocalYmd = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

  const dashboardNow = new Date();
  const dashboardToday = toLocalYmd(dashboardNow);
  const dashboardYesterdayDate = new Date(dashboardNow);
  dashboardYesterdayDate.setDate(dashboardYesterdayDate.getDate() - 1);
  const dashboardYesterday = toLocalYmd(dashboardYesterdayDate);

  const normalizeDashboardDate = (value: any) => String(value || '').replace(/\//g, '-');

  const getDashboardReportTime = (report: any) => {
    const createdAt = report?.createdAt || report?.submittedAt || '';
    const parsed = createdAt ? new Date(createdAt) : null;
    if (parsed && !Number.isNaN(parsed.getTime())) return parsed.getTime();

    const dateText = normalizeDashboardDate(report?.date);
    const fallback = dateText ? new Date(`${dateText}T12:00:00`) : null;
    return fallback && !Number.isNaN(fallback.getTime()) ? fallback.getTime() : 0;
  };

  const formatDashboardReportTime = (report: any) => {
    const createdAt = report?.createdAt || report?.submittedAt || '';
    if (createdAt) {
      const d = new Date(createdAt);
      if (!Number.isNaN(d.getTime())) {
        return d.toLocaleString('ja-JP', {
          month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
      }
    }
    const dateText = normalizeDashboardDate(report?.date);
    if (!dateText) return '日時未記録';
    const [y, m, d] = dateText.split('-').map(Number);
    return y && m && d ? `${m}/${d}（送信時刻未記録）` : dateText;
  };

  // 「直近の日報」は、本日分を除き、日報が存在する最新の日付を対象にする。
  // 月曜に土曜分を確認する場合や、休祝日を挟む場合でも「昨日」に固定しない。
  const dashboardLatestPastDate = Array.from(new Set(
    dashboardReports
      .map((r: any) => normalizeDashboardDate(r?.date))
      .filter((dateText: string) => !!dateText && dateText < dashboardToday)
  )).sort().reverse()[0] || '';

  const dashboardLatestPastReports = dashboardLatestPastDate
    ? dashboardReports.filter((r: any) => normalizeDashboardDate(r?.date) === dashboardLatestPastDate)
    : [];

  const dashboardLatestPastMessageReports = dashboardLatestPastReports.filter(
    (r: any) => String(r?.officeMessage || '').trim()
  );

  const formatDashboardTargetDate = (dateText: string) => {
    if (!dateText) return '対象日なし';
    const [y, m, d] = dateText.split('-').map(Number);
    return y && m && d ? `${y}年${m}月${d}日分` : `${dateText}分`;
  };

  const dashboardTodayReports = dashboardReports.filter(
    (r: any) => normalizeDashboardDate(r?.date) === dashboardToday
  );

  const dashboardTodayUnrecordedReporter = dashboardTodayReports.filter(
    (r: any) => !String(r?.reporter || '').trim()
  );

  // 「前日未入力候補」は、会社カレンダー上の出勤日なのに、
  // 日報・管理・サンセイ・有給のいずれも確認できない人だけを候補表示する。
  // 「該当なし」区分は所定出勤日の判定ができないため対象外。
  const dashboardYesterdayWorkerNames = new Set<string>();
  dashboardReports.forEach((r: any) => {
    if (normalizeDashboardDate(r?.date) !== dashboardYesterday) return;
    (Array.isArray(r?.workers) ? r.workers : []).forEach((name: string) => {
      if (name) dashboardYesterdayWorkerNames.add(name);
    });
  });

  const dashboardMissingYesterday = (settings.workers || [])
    .filter((worker: any) => {
      const name = String(worker?.name || '');
      const calendarType = worker?.calendarType || 'none';
      if (!name || calendarType === 'none') return false;

      const calendarEntry = getCalendarEntryForWorker(worker, dashboardYesterday);
      if (!calendarEntry) return false;

      const baseHoliday = new Set(calendarEntry?.holidays || []).has(dashboardYesterday);
      const isHoliday = isEffectiveWorkerHoliday(worker, dashboardYesterday, baseHoliday);
      if (isHoliday) return false;

      const manualStatus = settings.manualAttendanceOverrides?.[name]?.[dashboardYesterday] || '';
      const paidLeaveStatus = settings.paidLeaveOverrides?.[name]?.[dashboardYesterday] || '';
      if (manualStatus || paidLeaveStatus) return false;

      return !dashboardYesterdayWorkerNames.has(name);
    })
    .map((worker: any) => worker.name);

  const dashboardFeed = [
    ...dashboardReports.map((report: any) => ({
      kind: 'report' as const,
      sortTime: getDashboardReportTime(report),
      report
    })),
    ...(Array.isArray(settings.attendanceChangeHistory) ? settings.attendanceChangeHistory : []).map((item: any) => ({
      kind: 'attendance' as const,
      sortTime: item?.savedAt && !Number.isNaN(new Date(item.savedAt).getTime())
        ? new Date(item.savedAt).getTime()
        : 0,
      item
    }))
  ]
    .sort((a: any, b: any) => Number(b.sortTime || 0) - Number(a.sortTime || 0))
    .slice(0, 10);

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
            <>
              <button onClick={() => setShowAllMonthlyDisposalModal(true)} className="flex-1 md:flex-none bg-amber-600 hover:bg-amber-700 text-white px-4 py-2.5 rounded-xl font-bold text-sm md:text-base transition flex items-center justify-center gap-1.5 shadow-sm">
                📦 月別処分一覧
              </button>
              <button onClick={() => setShowAllMonthlyScrapModal(true)} className="flex-1 md:flex-none bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl font-bold text-sm md:text-base transition flex items-center justify-center gap-1.5 shadow-sm">
                ♻️ スクラップ確認表
              </button>
            </>
          )}
          {authRole === 'viewer' && (
            <button
              onClick={() => {
                const firstActive = (settings.locations || []).find((loc: any) =>
                  typeof loc === 'string' ? true : !loc?.isFinished
                );
                const firstName = typeof firstActive === 'string' ? firstActive : firstActive?.name;
                if (!trialScheduleLocation && firstName) setTrialScheduleLocation(firstName);
                setShowTrialSchedule(true);
              }}
              className="flex-1 md:flex-none bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-bold text-sm md:text-base transition flex items-center justify-center gap-1.5 shadow-sm"
            >
              📅 工程表
            </button>
          )}

          <button onClick={fetchData} className="flex-1 md:flex-none bg-blue-50 hover:bg-blue-100 text-blue-600 px-4 py-2.5 rounded-xl font-bold text-sm md:text-base transition flex items-center justify-center gap-1.5">
            🔄 最新の状態にする
          </button>
          <button
            onClick={() => {
              setIsAuthed(false);
              setAuthRole(null);
            }}
            className="flex-1 md:flex-none bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2.5 rounded-xl font-bold text-sm md:text-base transition"
          >
            ログアウト
          </button>
        </div>
      </div>

      {authRole === 'admin' && (
        <section className="rounded-2xl md:rounded-3xl border border-indigo-200 bg-white shadow-sm overflow-hidden">
          <div className="px-4 md:px-6 py-4 border-b border-indigo-100 bg-gradient-to-r from-indigo-50 to-violet-50">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <div>
                <h2 className="text-lg md:text-xl font-black text-indigo-950">📢 日報入力者へのお知らせ</h2>
                <p className="mt-1 text-xs md:text-sm text-indigo-700">指定した期間だけ、日報入力画面の上部に表示します。マスタへ新規項目を保存した場合は7日間、自動で「新着マスタ」として表示します。</p>
              </div>
              <span className="self-start rounded-full bg-indigo-600 px-3 py-1 text-xs font-black text-white">公開中 {(settings.dailyAnnouncements || []).filter((x:any) => { const t=new Date().toLocaleDateString('sv-SE'); return (!x.startDate || x.startDate<=t) && (!x.endDate || x.endDate>=t); }).length}件</span>
            </div>
          </div>
          <div className="p-4 md:p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input value={dailyAnnouncementDraft.title} onChange={(e)=>setDailyAnnouncementDraft({...dailyAnnouncementDraft,title:e.target.value})} placeholder="タイトル　例：リース項目を追加しました" className="rounded-xl border border-slate-300 bg-white px-3 py-3 font-bold text-slate-900" />
              <select value={dailyAnnouncementDraft.priority} onChange={(e)=>setDailyAnnouncementDraft({...dailyAnnouncementDraft,priority:e.target.value as 'normal'|'important'})} className="rounded-xl border border-slate-300 bg-white px-3 py-3 font-bold text-slate-900">
                <option value="normal">通常のお知らせ</option><option value="important">⚠️ 重要なお知らせ</option>
              </select>
            </div>
            <textarea value={dailyAnnouncementDraft.message} onChange={(e)=>setDailyAnnouncementDraft({...dailyAnnouncementDraft,message:e.target.value})} placeholder="本文　例：○○リースを項目に追加しました。手入力せずリストから選択してください。" rows={3} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 font-medium text-slate-900" />
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-[1fr_1fr_auto] gap-3 items-end">
              <label className="text-xs font-black text-slate-600">表示開始日<input type="date" value={dailyAnnouncementDraft.startDate} onChange={(e)=>setDailyAnnouncementDraft({...dailyAnnouncementDraft,startDate:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-bold" /></label>
              <label className="text-xs font-black text-slate-600">表示終了日<input type="date" value={dailyAnnouncementDraft.endDate} onChange={(e)=>setDailyAnnouncementDraft({...dailyAnnouncementDraft,endDate:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-bold" /></label>
              <button type="button" disabled={dailyAnnouncementSaving} onClick={publishDailyAnnouncement} className="h-[44px] rounded-xl bg-indigo-600 px-5 font-black text-white hover:bg-indigo-700 disabled:opacity-50">{dailyAnnouncementSaving ? '送信中...' : '📨 入力画面へ公開'}</button>
            </div>
            {((settings.dailyAnnouncements || []).length > 0 || (settings.masterAnnouncements || []).length > 0) && (
              <div className="space-y-3">
                {(settings.dailyAnnouncements || []).length > 0 && (
                  <div className="rounded-2xl border border-slate-200 overflow-hidden">
                    <div className="bg-blue-50 px-4 py-2 text-xs font-black text-blue-700">📢 手動お知らせ</div>
                    <div className="divide-y divide-slate-100">
                      {(settings.dailyAnnouncements || []).slice(0, 10).map((n:any) => (
                        <div key={n.id} className="flex items-start justify-between gap-3 px-4 py-3">
                          <div className="min-w-0"><div className="font-black text-slate-900">{n.priority==='important'?'⚠️ ':''}{n.title}</div><div className="mt-0.5 text-xs text-slate-500">{n.startDate} ～ {n.endDate}</div><div className="mt-1 text-sm text-slate-700 whitespace-pre-wrap">{n.message}</div></div>
                          <button type="button" onClick={()=>deleteDailyAnnouncement(n.id)} className="shrink-0 rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs font-black text-rose-700">削除</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {(settings.masterAnnouncements || []).length > 0 && (
                  <div className="rounded-2xl border border-emerald-200 overflow-hidden">
                    <div className="bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-700">🆕 自動お知らせ（マスタ追加）</div>
                    <div className="divide-y divide-emerald-100">
                      {(settings.masterAnnouncements || []).slice(0, 20).map((n:any) => (
                        <div key={n.id} className="flex items-start justify-between gap-3 px-4 py-3">
                          <div className="min-w-0"><div className="font-black text-slate-900">{n.title}</div><div className="mt-0.5 text-xs text-slate-500">{n.startDate} ～ {n.endDate}</div><div className="mt-1 text-sm text-slate-700 whitespace-pre-wrap">{n.message}</div></div>
                          <button type="button" onClick={()=>deleteMasterAnnouncement(n.id)} className="shrink-0 rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs font-black text-rose-700">削除</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {authRole === 'admin' && (
        <section className="rounded-2xl md:rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-4 md:px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg md:text-xl font-black text-slate-900">🔔 新着・要確認</h2>
                <span className="rounded-full bg-blue-600 px-2.5 py-1 text-[11px] font-black text-white">最新10件</span>
              </div>
              <p className="mt-1 text-xs md:text-sm text-slate-500">新しい日報・報告事項・勤怠変更を、管理画面を開いた時にまとめて確認できます。</p>
            </div>
            <button
              onClick={fetchData}
              className="self-start md:self-auto rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs md:text-sm font-black text-blue-700 hover:bg-blue-50 transition"
            >
              🔄 更新
            </button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 p-4 md:p-5 bg-slate-50/70 border-b border-slate-200">
            <div className="rounded-2xl border border-blue-200 bg-white p-3.5">
              <div className="text-[11px] md:text-xs font-bold text-slate-500">直近の日報</div>
              <div className="mt-0.5 text-[10px] md:text-[11px] font-bold text-blue-500">{formatDashboardTargetDate(dashboardLatestPastDate)}</div>
              <div className="mt-1 text-2xl md:text-3xl font-black text-blue-700">{dashboardLatestPastReports.length}<span className="ml-1 text-sm text-slate-500">件</span></div>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-white p-3.5">
              <div className="text-[11px] md:text-xs font-bold text-slate-500">直近の報告事項</div>
              <div className="mt-0.5 text-[10px] md:text-[11px] font-bold text-amber-600">{formatDashboardTargetDate(dashboardLatestPastDate)}</div>
              <div className="mt-1 text-2xl md:text-3xl font-black text-amber-700">{dashboardLatestPastMessageReports.length}<span className="ml-1 text-sm text-slate-500">件</span></div>
            </div>
            <div className={`rounded-2xl border bg-white p-3.5 ${dashboardMissingYesterday.length > 0 ? 'border-rose-300 ring-1 ring-rose-100' : 'border-emerald-200'}`}>
              <div className="text-[11px] md:text-xs font-bold text-slate-500">前日未入力候補</div>
              <div className={`mt-1 text-2xl md:text-3xl font-black ${dashboardMissingYesterday.length > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                {dashboardMissingYesterday.length}<span className="ml-1 text-sm text-slate-500">人</span>
              </div>
            </div>
            <div className={`rounded-2xl border bg-white p-3.5 ${dashboardTodayUnrecordedReporter.length > 0 ? 'border-orange-300' : 'border-slate-200'}`}>
              <div className="text-[11px] md:text-xs font-bold text-slate-500">報告者未記録</div>
              <div className={`mt-1 text-2xl md:text-3xl font-black ${dashboardTodayUnrecordedReporter.length > 0 ? 'text-orange-700' : 'text-slate-700'}`}>
                {dashboardTodayUnrecordedReporter.length}<span className="ml-1 text-sm text-slate-500">件</span>
              </div>
            </div>
          </div>

          {dashboardMissingYesterday.length > 0 && (
            <div className="mx-4 md:mx-5 mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-black text-rose-800">⚠️ {dashboardYesterday} の未入力候補</span>
                <span className="text-[11px] font-bold text-rose-600">※欠勤確定ではありません</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {dashboardMissingYesterday.map((name: string) => (
                  <span key={name} className="rounded-full border border-rose-200 bg-white px-2.5 py-1 text-xs font-black text-rose-700">{name}</span>
                ))}
              </div>
            </div>
          )}

          <div className="p-4 md:p-5">
            {dashboardFeed.length === 0 ? (
              <div className="py-8 text-center text-sm font-bold text-slate-400">まだ新着情報はありません。</div>
            ) : (
              <div className="relative ml-2 border-l-2 border-slate-200 pl-5 space-y-3">
                {dashboardFeed.map((entry: any, idx: number) => {
                  if (entry.kind === 'attendance') {
                    const item = entry.item || {};
                    return (
                      <div key={item?.id || `attendance-feed-${idx}`} className="relative rounded-2xl border border-emerald-100 bg-emerald-50/40 px-4 py-3">
                        <span className="absolute -left-[28px] top-5 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500 shadow" />
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-700">勤怠変更</span>
                          <span className="text-[11px] font-bold text-slate-400">{formatAttendanceHistoryTime(item?.savedAt || '')}</span>
                        </div>
                        <div className="mt-1 text-sm md:text-base text-slate-700">
                          <span className="font-black text-slate-900">{item?.workerName || '不明'}</span>
                          {item?.date ? <span className="text-slate-500"> ・ {item.date}</span> : null}
                          <span> ・ {item?.detail || '変更'}</span>
                        </div>
                      </div>
                    );
                  }

                  const report = entry.report || {};
                  const officeMessage = String(report?.officeMessage || '').trim();
                  return (
                    <div key={report?.id || `report-feed-${idx}`} className={`relative rounded-2xl border px-4 py-3 ${officeMessage ? 'border-amber-200 bg-amber-50/40' : 'border-blue-100 bg-blue-50/30'}`}>
                      <span className={`absolute -left-[28px] top-5 h-3.5 w-3.5 rounded-full border-2 border-white shadow ${officeMessage ? 'bg-amber-500' : 'bg-blue-500'}`} />
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-black text-blue-700">新着日報</span>
                            {officeMessage && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-700">報告事項あり</span>}
                            <span className="text-[11px] font-bold text-slate-400">{formatDashboardReportTime(report)}</span>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm md:text-base">
                            <span className="font-black text-slate-900">{report?.location || '現場未記録'}</span>
                            <span className="text-slate-600">📨 報告者：<span className="font-black">{report?.reporter || '未記録'}</span></span>
                            {report?.manager && <span className="text-slate-500">職長：{report.manager}</span>}
                          </div>
                          {officeMessage && (
                            <div className="mt-2 rounded-xl border border-amber-100 bg-white/80 px-3 py-2 text-xs md:text-sm font-bold text-amber-900">
                              📣 {officeMessage.length > 90 ? `${officeMessage.slice(0, 90)}…` : officeMessage}
                            </div>
                          )}
                          {(report?.adminReply || report?.data?.adminReply) && (
                            <div className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs md:text-sm font-bold text-emerald-900">
                              💬 返信済み：{String(report?.adminReply || report?.data?.adminReply)}
                              {(report?.adminReplyReadAt || report?.data?.adminReplyReadAt) && (
                                <span className="ml-2 text-[10px] text-emerald-600">✓ 本人確認済み</span>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="shrink-0 flex flex-wrap items-center gap-2">
                          {officeMessage && (
                            <button
                              type="button"
                              onClick={() => openReportReply(report)}
                              className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs md:text-sm font-black text-emerald-700 hover:bg-emerald-100 transition"
                            >
                              💬 {(report?.adminReply || report?.data?.adminReply) ? '返信を編集' : '返信する'}
                            </button>
                          )}
                          <button
                            onClick={() => setEditingReport({ ...report })}
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs md:text-sm font-black text-slate-700 hover:bg-slate-100 transition"
                          >
                            日報を見る
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {authRole === 'viewer' && (
        <div className="bg-orange-50 border border-orange-200 text-orange-800 p-4 rounded-2xl font-bold text-center text-sm md:text-lg shadow-xs">
          👑 社長モードで表示しています。（データの確認が可能です）
        </div>
      )}

      {authRole === 'viewer' && (() => {
        const activeSummary = activeLocList.map((loc: any) => {
          const c = calculateCosts(loc.name);
          const spentRate = c.contractPrice > 0
            ? Math.min(999, Math.round((c.total / c.contractPrice) * 100))
            : 0;
          const remaining = c.contractPrice - c.total;
          return { loc, c, spentRate, remaining };
        });

        const totalContract = activeSummary.reduce((sum: number, x: any) => sum + Number(x.c.contractPrice || 0), 0);
        const totalCost = activeSummary.reduce((sum: number, x: any) => sum + Number(x.c.total || 0), 0);
        const totalRemaining = totalContract - totalCost;

        const formatWholeYen = (value: number) =>
          `¥${Math.round(Number(value || 0)).toLocaleString('ja-JP')}`;

        return (
          <div className="space-y-4">
            <section className="rounded-[24px] bg-white border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-4 pt-4 pb-3">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] font-medium text-orange-700">👑 社長モード</div>
                    <h2 className="mt-1 text-[28px] leading-tight font-semibold text-slate-950">
                      現在の会社状況
                    </h2>
                    <p className="mt-1 text-[15px] leading-relaxed text-slate-600">
                      確認したい内容を選んでください
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={fetchData}
                    className="shrink-0 rounded-xl bg-slate-100 px-4 py-3 text-[17px] font-medium text-slate-800 active:bg-slate-200"
                  >
                    🔄 更新
                  </button>
                </div>
              </div>

              <div className="px-4 pb-4">
                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                  <div className="text-[15px] leading-tight text-slate-600">稼働中の現場</div>
                  <div className="mt-1 flex items-end gap-1">
                    <span className="text-[32px] leading-none font-semibold text-slate-950">
                      {activeLocList.length}
                    </span>
                    <span className="text-[14px] text-slate-600">件</span>
                  </div>
                </div>
              </div>
            </section>

            <section className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setViewerSection(viewerSection === 'sites' ? 'home' : 'sites')}
                className={`col-span-2 min-w-0 rounded-[22px] border p-4 text-left shadow-sm transition active:scale-[0.99] ${
                  viewerSection === 'sites'
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-white border-blue-100 text-slate-900'
                }`}
              >
                <div className="text-[32px] leading-none">🏢</div>
                <div className="mt-3 text-[19px] leading-tight font-semibold">現場の状況</div>
                <div className={`mt-1.5 text-[14px] leading-relaxed ${
                  viewerSection === 'sites' ? 'text-blue-50' : 'text-slate-500'
                }`}>
                  稼働中・完了・利益を確認
                </div>
              </button>

              <button
                type="button"
                onClick={() => setViewerSection(viewerSection === 'costs' ? 'home' : 'costs')}
                className={`min-w-0 rounded-[22px] border p-4 text-left shadow-sm transition active:scale-[0.99] ${
                  viewerSection === 'costs'
                    ? 'bg-emerald-600 border-emerald-600 text-white'
                    : 'bg-white border-emerald-100 text-slate-900'
                }`}
              >
                <div className="text-[32px] leading-none">💰</div>
                <div className="mt-3 text-[19px] leading-tight font-semibold">経費の流れ</div>
                <div className={`mt-1.5 text-[14px] leading-relaxed ${
                  viewerSection === 'costs' ? 'text-emerald-50' : 'text-slate-500'
                }`}>
                  使用額・残額を確認
                </div>
              </button>

              <button
                type="button"
                onClick={() => setViewerSection(viewerSection === 'reports' ? 'home' : 'reports')}
                className={`min-w-0 rounded-[22px] border p-4 text-left shadow-sm transition active:scale-[0.99] ${
                  viewerSection === 'reports'
                    ? 'bg-violet-600 border-violet-600 text-white'
                    : 'bg-white border-violet-100 text-slate-900'
                }`}
              >
                <div className="text-[32px] leading-none">📋</div>
                <div className="mt-3 text-[19px] leading-tight font-semibold">日報を見る</div>
                <div className={`mt-1.5 text-[14px] leading-relaxed ${
                  viewerSection === 'reports' ? 'text-violet-50' : 'text-slate-500'
                }`}>
                  今日・過去の日報
                </div>
              </button>

            </section>

            <button
              type="button"
              onClick={() => setViewerSection(viewerSection === 'attendance' ? 'home' : 'attendance')}
              className={`w-full rounded-2xl border px-4 py-3.5 text-left shadow-sm ${
                viewerSection === 'attendance'
                  ? 'bg-slate-900 border-slate-900 text-white'
                  : 'bg-white border-slate-200 text-slate-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="text-[24px]">👷</div>
                <div className="min-w-0 flex-1">
                  <div className="text-[17px] font-medium">出勤状況を確認</div>
                  <div className={`mt-0.5 text-[15px] leading-relaxed ${
                    viewerSection === 'attendance' ? 'text-slate-300' : 'text-slate-400'
                  }`}>
                    誰が、どの現場に入っていたか
                  </div>
                </div>
                <div className="text-xl">›</div>
              </div>
            </button>

            {viewerSection === 'home' && (
              <section className="rounded-[24px] bg-white border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-4 py-4 border-b border-slate-100">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-[21px] font-semibold text-slate-900">🏗️ 現在の現場</h3>
                      <p className="mt-0.5 text-[15px] leading-relaxed text-slate-400">
                        経費の使用状況を一覧で確認
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setViewerSection('sites')}
                      className="shrink-0 text-[14px] font-medium text-blue-700"
                    >
                      すべて見る →
                    </button>
                  </div>
                </div>

                <div className="divide-y divide-slate-100">
                  {activeSummary.slice(0, 4).map(({ loc, c, spentRate, remaining }: any) => (
                    <button
                      key={loc.name}
                      type="button"
                      onClick={() => setModalLocation(loc.name)}
                      className="w-full px-4 py-4 text-left active:bg-slate-50"
                    >
                      <div className="text-[16px] leading-relaxed font-medium text-slate-950 break-words">
                        {loc.name}
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-3">
                        <div className="text-[15px] text-slate-600">
                          経費使用率
                          <span className={`ml-1 font-semibold ${
                            spentRate >= 90 ? 'text-rose-600'
                            : spentRate >= 75 ? 'text-amber-600'
                            : 'text-emerald-600'
                          }`}>
                            {spentRate}%
                          </span>
                        </div>

                        <div className={`text-[15px] font-semibold text-right ${
                          remaining >= 0 ? 'text-emerald-700' : 'text-rose-700'
                        }`}>
                          残り {formatWholeYen(remaining)}
                        </div>
                      </div>

                      <div className="mt-2.5 h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            spentRate >= 90 ? 'bg-rose-500'
                            : spentRate >= 75 ? 'bg-amber-500'
                            : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, spentRate)}%` }}
                        />
                      </div>
                    </button>
                  ))}

                  {activeSummary.length === 0 && (
                    <div className="px-4 py-8 text-center text-[15px] text-slate-400">
                      稼働中の現場はありません
                    </div>
                  )}
                </div>
              </section>
            )}

            {viewerSection === 'costs' && (
              <section className="space-y-3">
                {activeSummary.map(({ loc, c, spentRate, remaining }: any) => {
                  const otherCosts =
                    Number(c.ownMachineCost || 0) +
                    Number(c.vehicleCost || 0) +
                    Number(c.fuelCost || 0) +
                    Number(c.regularCost || 0) +
                    Number(c.etcCost || 0) +
                    Number(c.parkingCost || 0) +
                    Number(c.otherCost || 0) +
                    Number(c.customExtraExpenseTotal || 0);

                  return (
                    <div
                      key={loc.name}
                      className="rounded-[24px] bg-white border border-slate-200 shadow-sm overflow-hidden"
                    >
                      <button
                        type="button"
                        onClick={() => setModalLocation(loc.name)}
                        className="w-full p-4 text-left"
                      >
                        <div className="flex items-start gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="text-[16px] leading-relaxed font-medium text-slate-950 break-words">
                              {loc.name}
                            </div>
                          </div>

                          <div className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                            spentRate >= 90 ? 'bg-rose-100 text-rose-700'
                            : spentRate >= 75 ? 'bg-amber-100 text-amber-700'
                            : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {spentRate}%
                          </div>
                        </div>

                        <div className="mt-3 h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              spentRate >= 90 ? 'bg-rose-500'
                              : spentRate >= 75 ? 'bg-amber-500'
                              : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(100, spentRate)}%` }}
                          />
                        </div>

                        <div className="mt-4 space-y-2 text-[15px]">
                          <div className="flex justify-between gap-3">
                            <span className="text-slate-500">請負金額</span>
                            <span className="font-medium text-slate-900 text-right">{formatWholeYen(c.contractPrice)}</span>
                          </div>
                          <div className="flex justify-between gap-3">
                            <span className="text-slate-500">現在経費</span>
                            <span className="font-medium text-orange-700 text-right">{formatWholeYen(c.total)}</span>
                          </div>
                          <div className="flex justify-between gap-3">
                            <span className="text-slate-500">残り</span>
                            <span className={`font-medium text-right ${
                              remaining >= 0 ? 'text-emerald-700' : 'text-rose-700'
                            }`}>
                              {formatWholeYen(remaining)}
                            </span>
                          </div>
                        </div>
                      </button>

                      <div className="border-t border-slate-100 px-4 py-3.5">
                        <div className="space-y-2.5 text-[14px]">
                          <div className="flex justify-between gap-3">
                            <span className="text-slate-500">人件費</span>
                            <span className="font-medium text-right">{formatWholeYen(c.laborCost)}</span>
                          </div>
                          <div className="flex justify-between gap-3">
                            <span className="text-slate-500">外注費</span>
                            <span className="font-medium text-right">{formatWholeYen(c.subCostTotal)}</span>
                          </div>
                          <div className="flex justify-between gap-3">
                            <span className="text-slate-500">リース</span>
                            <span className="font-medium text-right">{formatWholeYen(c.leaseCost + c.otherLeaseCost)}</span>
                          </div>
                          <div className="flex justify-between gap-3">
                            <span className="text-slate-500">処分費</span>
                            <span className="font-medium text-right">{formatWholeYen(c.disposalCost)}</span>
                          </div>
                          <div className="flex justify-between gap-3">
                            <span className="text-slate-500">車両・重機・燃料・その他</span>
                            <span className="font-medium text-right">{formatWholeYen(otherCosts)}</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setModalLocation(loc.name)}
                          className="mt-4 w-full rounded-xl bg-slate-900 py-3 text-[15px] font-medium text-white"
                        >
                          詳細を見る
                        </button>
                      </div>
                    </div>
                  );
                })}
              </section>
            )}

            {viewerSection !== 'home' && (
              <button
                type="button"
                onClick={() => setViewerSection('home')}
                className="w-full rounded-2xl bg-white border border-slate-200 py-3.5 text-[15px] font-medium text-slate-600 shadow-sm"
              >
                ← 社長ホームへ戻る
              </button>
            )}
          </div>
        );
      })()}

      {/* 稼働中の現場サマリー */}
      <div className={`${authRole === 'viewer' && viewerSection !== 'sites' ? 'hidden' : ''} bg-white p-4 md:p-8 rounded-2xl md:rounded-3xl shadow-sm border border-slate-100 space-y-5`}>
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
                    <div className={`text-2xl font-extrabold mt-1 ${c.profit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
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
                      className="w-full bg-blue-600 active:bg-blue-500 text-white py-3.5 rounded-xl text-sm font-bold shadow-sm transition"
                    >
                      {isStorageYardLocation(loc) ? '📦 置場管理を見る' : '🔍 詳細分析を見る'}
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
                <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
                  <div>
                    <div className="text-[11px] font-bold text-slate-500 mb-1">請負先</div>
                    <div className="text-sm font-bold text-slate-800">
                      {c.clientStr || '－'}
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] font-bold text-slate-500 mb-1">締め日</div>
                    <select
                      value={loc.closingDay || ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        setSettings((prev: any) => ({
                          ...prev,
                          locations: (prev.locations || []).map((x: any) =>
                            (typeof x === 'string' ? x : x?.name) === loc.name
                              ? {
                                  ...(typeof x === 'string'
                                    ? { name: x, shortName: '', price: 0, isFinished: false }
                                    : x),
                                  closingDay: value
                                }
                              : x
                          )
                        }));
                        saveLocationBillingField(loc.name, 'closingDay', value);
                      }}
                      className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm font-bold"
                    >
                      <option value="">未設定</option>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                        <option key={day} value={String(day)}>{day}日締め</option>
                      ))}
                      <option value="末日">末日締め</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 text-xs md:text-sm gap-1 bg-white p-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-center">
                  <div>請負<span className="text-slate-900 font-bold block text-base mt-1">{formatAmount(c.contractPrice)} <span className="text-xs font-normal text-slate-500">税抜</span></span></div>
                  <div>日数<span className="text-slate-900 font-bold block text-base mt-1">{c.days}日</span></div>
                  <div>経費<span className="text-slate-900 font-bold block text-base mt-1">{formatAmount(c.total)}</span></div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={() => setModalLocation(loc.name)} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl text-sm font-bold shadow-xs transition">{isStorageYardLocation(loc) ? '📦 置場管理を見る' : '🔍 詳細分析を見る'}</button>
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
                <th className="py-4 px-3 w-[23%]">現場名</th>
                <th className="py-4 px-3 w-[13%]">請負先</th>
                <th className="py-4 px-3 w-[8%] text-center">締め日</th>
                <th className="py-4 px-3 w-[11%]">請負金額</th>
                <th className="py-4 px-3 w-[7%]">稼働日数</th>
                <th className="py-4 px-3 w-[11%]">合計経費</th>
                <th className="py-4 px-3 w-[14%]">粗利（売却益込）</th>
                <th className="py-4 px-3 w-[13%] text-center">ステータス / アクション</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-lg font-medium">
              {activeLocList.map((loc:any) => {
                const c = calculateCosts(loc.name);
                return (
                  <tr key={loc.name} className="hover:bg-slate-50/80 transition">
                    <td className="py-5 px-3 align-middle">
                      <span className="font-bold text-lg break-all leading-snug text-blue-600">{loc.name}</span>
                    </td>

                    <td className="py-5 px-3 align-middle">
                      <span className="text-sm font-bold text-slate-700 break-words">
                        {c.clientStr || '－'}
                      </span>
                    </td>

                    <td className="py-5 px-2 text-center align-middle">
                      {authRole === 'viewer' ? (
                        <span className="text-sm font-bold text-slate-700">
                          {loc.closingDay ? `${loc.closingDay}日` : '－'}
                        </span>
                      ) : (
                        <select
                          value={loc.closingDay || ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            setSettings((prev: any) => ({
                              ...prev,
                              locations: (prev.locations || []).map((x: any) =>
                                (typeof x === 'string' ? x : x?.name) === loc.name
                                  ? {
                                      ...(typeof x === 'string'
                                        ? { name: x, shortName: '', price: 0, isFinished: false }
                                        : x),
                                      closingDay: value
                                    }
                                  : x
                              )
                            }));
                            saveLocationBillingField(loc.name, 'closingDay', value);
                          }}
                          className="w-full rounded-lg border border-slate-300 bg-white px-1 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
                        >
                          <option value="">未設定</option>
                          {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                            <option key={day} value={String(day)}>{day}日</option>
                          ))}
                          <option value="末日">末日</option>
                        </select>
                      )}
                    </td>

                    <td className="py-5 px-3 text-slate-800 font-bold align-middle">{formatAmount(c.contractPrice)} <span className="text-xs font-normal text-slate-500">税抜</span></td>
                    <td className="py-5 px-3 text-slate-800 font-bold align-middle">{c.days} 日</td>
                    <td className="py-5 px-3 text-slate-900 font-bold align-middle">{formatAmount(c.total)}</td>
                    <td className={`py-5 px-3 font-bold text-xl align-middle ${c.profit >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
                      {formatAmount(c.profit)}
                    </td>
                    <td className="py-5 px-3 text-center align-middle">
                      <div className="flex items-center justify-center gap-2 flex-nowrap">
                        {authRole !== 'viewer' && (
                          <button onClick={() => toggleLocationFinished(loc.name)} className="bg-white hover:bg-slate-100 text-slate-600 px-3 py-2 rounded-xl text-xs font-bold border border-slate-300 shadow-2xs transition">
                            現場完了
                          </button>
                        )}
                        <button
                          onClick={() => setModalLocation(loc.name)}
                          className={`px-4 py-2.5 rounded-xl font-bold transition shadow-sm text-sm whitespace-nowrap text-white ${
                            isStorageYardLocation(loc)
                              ? 'bg-amber-600 hover:bg-amber-500'
                              : 'bg-blue-600 hover:bg-blue-500'
                          }`}
                        >
                          {isStorageYardLocation(loc) ? '置場管理 →' : '詳細分析 →'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {activeLocList.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-6 text-slate-400 text-base">稼働中の現場はありません</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 完了済の現場 一覧 */}
      <div className={`${authRole === 'viewer' && viewerSection !== 'sites' ? 'hidden' : ''} bg-slate-50 rounded-2xl md:rounded-3xl shadow-sm border-2 border-slate-300 overflow-hidden`}>
        <div className="bg-slate-300 px-4 md:px-8 py-4 md:py-5">
          <h2 className="text-xl md:text-2xl font-bold text-slate-800">📁 完了済の現場 一覧</h2>
          <p className="text-sm md:text-base text-slate-600 mt-1">完了した現場の確認・詳細分析・削除を行います</p>
        </div>
        <div className="p-4 md:p-8 space-y-5">

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
                      <span className="shrink-0 bg-slate-500 text-white text-[11px] px-2.5 py-1 rounded-lg font-bold">📁 完了済</span>
                    </div>
                  </div>

                  <div className={"mx-4 mt-4 p-3.5 rounded-xl border " + (c.profit >= 0 ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200")}>
                    <div className={"text-xs font-bold " + (c.profit >= 0 ? "text-emerald-700" : "text-rose-700")}>粗利（売却益込）</div>
                    <div className={"text-2xl font-extrabold mt-1 " + (c.profit >= 0 ? "text-emerald-700" : "text-rose-700")}>
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
                    <button onClick={() => setModalLocation(loc.name)} className="w-full bg-slate-500 active:bg-slate-800 text-white py-3.5 rounded-xl text-sm font-bold shadow-sm transition">
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
                <div className="grid grid-cols-1 gap-2 pt-1">
                  <button
                    onClick={() => setModalLocation(loc.name)}
                    className="w-full bg-slate-500 hover:bg-slate-800 text-white py-3 rounded-xl text-sm font-bold shadow-xs transition"
                  >
                    🔍 詳細分析を見る
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteCompletedSite(loc.name)}
                    disabled={deletingCompletedSite === loc.name}
                    className="w-full bg-white hover:bg-rose-50 text-rose-700 border-2 border-rose-300 py-3 rounded-xl text-sm font-bold shadow-xs transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deletingCompletedSite === loc.name ? '削除中…' : '🗑 現場データを削除'}
                  </button>
                  <div className="text-[11px] leading-relaxed text-rose-600 px-1">
                    ※この完了現場の日報・現場別情報・写真のみ削除します。マスタや他現場は削除しません。
                  </div>
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
                          <>
                            <button onClick={() => toggleLocationFinished(loc.name)} className="text-xs text-slate-500 hover:text-slate-800 underline font-medium">未完了に戻す</button>
                            <button
                              type="button"
                              onClick={() => deleteCompletedSite(loc.name)}
                              disabled={deletingCompletedSite === loc.name}
                              className="bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 px-3 py-2.5 rounded-xl font-bold transition shadow-sm text-xs whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {deletingCompletedSite === loc.name ? '削除中…' : '🗑 削除'}
                            </button>
                          </>
                        )}
                        <button onClick={() => setModalLocation(loc.name)} className="bg-slate-500 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl font-bold transition shadow-sm text-sm whitespace-nowrap">
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
      </div>

      {/* 出勤確認表：社長モードのみ表示 */}
      {authRole === 'viewer' && (
      <div className={`${viewerSection !== 'attendance' ? 'hidden' : ''} bg-blue-50/40 rounded-2xl md:rounded-3xl shadow-sm border-2 border-blue-200 overflow-hidden`}>
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            if (!showCalendarSection) {
              setCalendarYearMonth(getCurrentYearMonth());
            }
            setShowCalendarSection(!showCalendarSection);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              if (!showCalendarSection) {
                setCalendarYearMonth(getCurrentYearMonth());
              }
              setShowCalendarSection(!showCalendarSection);
            }
          }}
          className="flex justify-between items-center flex-wrap gap-3 bg-blue-200 px-4 md:px-8 py-4 md:py-5 cursor-pointer select-none"
        >
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-blue-900">📅 出勤確認表（スタッフ別カレンダー）</h2>
            <p className="text-sm md:text-base text-blue-700 mt-1">誰が・いつ・どの現場に入ったか確認する画面です</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
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
              className="bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 px-4 py-3 rounded-xl font-bold text-sm md:text-base transition shadow-sm"
            >
              {showCalendarSection ? '📅 出勤確認表を隠す ▲' : '📅 出勤確認表を開く ▼'}
            </button>
          </div>
        </div>

        {showCalendarSection && (
          <div className="p-4 md:p-8 pt-5 animate-fadeIn">
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
                                    className="w-8 h-8 mx-auto bg-emerald-100 text-emerald-700 rounded-lg flex items-center justify-center font-bold text-sm shadow-2xs cursor-help"
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
      )}

      {/* 月次勤怠（管理者のみ） */}
      {authRole === 'admin' && (
        <div className="bg-emerald-50/40 rounded-3xl shadow-sm border-2 border-emerald-200 overflow-hidden">
          <div
            role="button"
            tabIndex={0}
            onClick={() => setShowMonthlyAttendance(!showMonthlyAttendance)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setShowMonthlyAttendance(!showMonthlyAttendance);
              }
            }}
            className="flex items-center justify-between gap-3 flex-wrap bg-emerald-200 px-4 md:px-7 py-4 md:py-5 cursor-pointer select-none"
          >
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-emerald-900">👷 作業員 月次勤怠・会社カレンダー</h2>
              <p className="text-sm md:text-base text-emerald-700 mt-1">
                20日締めの勤怠と、大和社員・実習生の会社カレンダーをこの画面でまとめて確認します
              </p>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowMonthlyAttendance(!showMonthlyAttendance);
              }}
              className="px-4 py-2.5 rounded-xl bg-white border border-emerald-200 text-emerald-700 text-sm font-bold shadow-sm hover:bg-emerald-50"
            >
              {showMonthlyAttendance ? '勤怠を閉じる ▲' : '勤怠を見る ▼'}
            </button>
          </div>

          {showMonthlyAttendance && (
            <div className="space-y-4 p-4 md:p-7">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 flex-wrap">
                  <input
                    type="month"
                    value={attendanceYearMonth}
                    onChange={(e) => {
                      setAttendanceYearMonth(e.target.value);
                      setCompanyCalendarEditMonth(e.target.value);
                    }}
                    className="px-4 py-3 rounded-xl border-2 border-slate-300 bg-white text-base font-bold"
                  />
                  <div className="text-sm text-slate-600">
                    {attendancePeriodInfo.startYmd} ～ {attendancePeriodInfo.endYmd}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={exportMonthlyAttendanceExcel}
                  className="px-4 py-3 rounded-xl bg-emerald-600 text-white text-sm font-bold shadow-sm"
                >
                  📊 Excel出力
                </button>
              </div>

              {/* 月次勤怠内：会社カレンダー */}
              <div className="rounded-2xl border-2 border-sky-200 bg-sky-50/60 overflow-hidden">
                <div className="flex items-center justify-between gap-3 flex-wrap px-4 py-3 bg-sky-100">
                  <div>
                    <div className="text-base md:text-lg font-bold text-sky-900">🗓️ 会社カレンダー</div>
                    <div className="text-xs md:text-sm text-sky-700 mt-0.5">
                      月次勤怠の判定に使う休日カレンダーです
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowCompanyCalendarSection(!showCompanyCalendarSection)}
                    className="px-4 py-2 rounded-xl bg-white border border-sky-300 text-sky-800 text-sm font-bold shadow-sm"
                  >
                    {showCompanyCalendarSection ? 'カレンダーを閉じる ▲' : 'カレンダーを確認・編集 ▼'}
                  </button>
                </div>

                <div className="px-4 py-3 border-t border-sky-200 bg-white/70">
                  <div className="flex items-center gap-2 flex-wrap text-sm">
                    <span className="font-bold text-slate-700">現在の登録：</span>
                    <span className="inline-flex px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800 font-bold">
                      大和社員
                    </span>
                    <span className="inline-flex px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 font-bold">
                      実習生
                    </span>
                    <span className="text-slate-500">
                      ／ 表示月：{attendanceYearMonth}
                    </span>
                  </div>
                </div>

                {showCompanyCalendarSection && (
                  <div className="p-4 md:p-5 space-y-5 border-t border-sky-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">年度</label>
                        <input
                          value={companyCalendarCycle}
                          onChange={(e) => {
                            const value = e.target.value;
                            setCompanyCalendarCycle(value);
                            ensureCompanyCalendarCycle(value);
                          }}
                          placeholder="例：2025-2026"
                          className="w-full p-3 rounded-xl border-2 border-slate-300 bg-white font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">カレンダーパターン</label>
                        <select
                          value={companyCalendarPattern}
                          onChange={(e) => setCompanyCalendarPattern(e.target.value as 'yamato' | 'trainee')}
                          className="w-full p-3 rounded-xl border-2 border-slate-300 bg-white font-bold"
                        >
                          <option value="yamato">① 大和社員</option>
                          <option value="trainee">② 実習生</option>
                        </select>
                      </div>
                    </div>

                    <div className="rounded-2xl bg-white border border-sky-200 p-4">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div>
                          <div className="text-sm font-bold text-slate-700">年間カレンダーPDF</div>
                          <div className="text-sm text-slate-500 mt-1">
                            {companyCalendars?.[companyCalendarCycle]?.[companyCalendarPattern]?.sourceFileName || '未登録'}
                          </div>
                        </div>

                        <div className="flex gap-2 flex-wrap">
                          <label className="px-4 py-2.5 rounded-xl bg-sky-600 text-white text-sm font-bold cursor-pointer">
                            {companyCalendarUploading ? 'アップロード中...' : 'PDFをアップロード'}
                            <input
                              type="file"
                              accept="application/pdf"
                              disabled={companyCalendarUploading}
                              className="hidden"
                              onChange={(e) => uploadCompanyCalendarPdf(e.target.files?.[0] || null)}
                            />
                          </label>

                          {companyCalendars?.[companyCalendarCycle]?.[companyCalendarPattern]?.pdfPath && (
                            <button
                              type="button"
                              onClick={openCompanyCalendarPdf}
                              className="px-4 py-2.5 rounded-xl bg-white border border-sky-300 text-sky-800 text-sm font-bold"
                            >
                              PDFを確認
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {attendanceYearMonth && (() => {
                      const [y, m] = attendanceYearMonth.split('-').map(Number);
                      const lastDay = new Date(y, m, 0).getDate();
                      const dates = Array.from({ length: lastDay }, (_, i) =>
                        `${y}-${String(m).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`
                      );
                      const holidays = new Set(
                        companyCalendars?.[companyCalendarCycle]?.[companyCalendarPattern]?.holidays || []
                      );

                      return (
                        <div className="rounded-2xl bg-white border border-slate-200 p-4">
                          <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
                            <div>
                              <div className="font-bold text-slate-900">
                                {y}年{m}月 ／ {companyCalendarPattern === 'yamato' ? '大和社員' : '実習生'}
                              </div>
                              <div className="text-xs text-slate-500 mt-1">
                                黒い日が会社休日です。日付をタップすると休日／出勤日を切り替えられます。
                              </div>
                            </div>

                            <div className="flex items-center gap-3 text-xs">
                              <span className="inline-flex items-center gap-1">
                                <span className="w-4 h-4 rounded bg-slate-800 inline-block"></span>休日
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <span className="w-4 h-4 rounded bg-white border inline-block"></span>出勤日
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-7 gap-1.5">
                            {['日','月','火','水','木','金','土'].map((w) => (
                              <div key={w} className="text-center text-xs font-bold text-slate-500 py-1">{w}</div>
                            ))}

                            {Array.from({ length: new Date(y, m - 1, 1).getDay() }, (_, i) => (
                              <div key={`blank-${i}`} />
                            ))}

                            {dates.map((dateStr) => {
                              const day = Number(dateStr.slice(8));
                              const holiday = holidays.has(dateStr);
                              return (
                                <button
                                  key={dateStr}
                                  type="button"
                                  onClick={() => toggleCompanyCalendarHoliday(dateStr)}
                                  className={`h-11 rounded-lg border text-sm font-bold transition ${
                                    holiday
                                      ? 'bg-slate-800 border-slate-800 text-white'
                                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                  }`}
                                >
                                  {day}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}

                    <button
                      type="button"
                      onClick={() => saveCompanyCalendars()}
                      disabled={companyCalendarSaving}
                      className="w-full md:w-auto px-6 py-3 rounded-xl bg-sky-700 text-white font-bold disabled:opacity-50"
                    >
                      {companyCalendarSaving ? '保存中...' : '会社カレンダーを保存'}
                    </button>
                  </div>
                )}
              </div>

              {renderAttendanceTools()}

              {authRole === 'admin' && (
                <div className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-3 py-2 ${
                  attendanceChangesDirty
                    ? 'border-amber-300 bg-amber-50'
                    : 'border-emerald-200 bg-emerald-50'
                }`}>
                  <div className={`text-sm font-bold ${attendanceChangesDirty ? 'text-amber-800' : 'text-emerald-700'}`}>
                    {attendanceChangesDirty ? '● 未保存の勤怠変更があります' : '✓ 勤怠変更は保存済みです'}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={cancelAttendanceChanges}
                      disabled={!attendanceChangesDirty || attendanceChangesSaving}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      変更を取り消す
                    </button>
                    <button
                      type="button"
                      onClick={saveAttendanceChanges}
                      disabled={!attendanceChangesDirty || attendanceChangesSaving}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-black text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      {attendanceChangesSaving ? '保存中…' : '勤怠変更を保存'}
                    </button>
                  </div>
                </div>
              )}

              {/* 上部横スクロールバー */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-2 pt-2 pb-1 lg:hidden">
                <div className="text-[11px] text-slate-500 mb-1 text-center">
                  画面幅が狭い場合のみ横スクロールできます
                </div>
                <div
                  ref={attendanceTopScrollRef}
                  onScroll={(e) => {
                    if (attendanceTableScrollRef.current) {
                      attendanceTableScrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
                    }
                  }}
                  className="overflow-x-auto overflow-y-hidden h-5"
                >
                  <div
                    style={{
                      width: `${54 + (attendancePeriodInfo.dates.length * 34) + 242}px`,
                      height: '1px'
                    }}
                  />
                </div>
              </div>

              <div
                ref={attendanceTableScrollRef}
                onScroll={(e) => {
                  if (attendanceTopScrollRef.current) {
                    attendanceTopScrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
                  }
                }}
                className="max-h-[72vh] overflow-auto rounded-2xl border border-slate-300 bg-white"
              >
                <table className="border-collapse text-[8px] min-w-max lg:w-full">
                  <thead>
                    <tr className="bg-slate-100">
                      <th rowSpan={2} className="sticky left-0 top-0 z-40 w-[54px] min-w-[54px] max-w-[54px] px-0.5 py-1 border border-slate-300 bg-emerald-100 text-left text-[9px]">
                        作業員
                      </th>
                      {attendancePeriodInfo.dates.map((dateStr) => {
                        const [y,m,d] = dateStr.split('-').map(Number);
                        return (
                          <th key={dateStr} className="sticky top-0 z-30 w-[30px] min-w-[30px] px-0.5 py-1 border border-slate-300 bg-slate-100 text-center">
                            {d}
                          </th>
                        );
                      })}
                      <th rowSpan={2} className="sticky top-0 z-30 w-[30px] min-w-[30px] px-1 border border-slate-300 bg-slate-100">支払</th>
                      <th rowSpan={2} className="sticky top-0 z-30 w-[32px] min-w-[32px] px-1 border border-slate-300 bg-slate-100">区分</th>
                      <th rowSpan={2} className="sticky top-0 z-30 w-[30px] min-w-[30px] px-1 border border-slate-300 bg-slate-100">時間</th>
                      <th rowSpan={2} className="sticky top-0 z-30 w-[28px] min-w-[28px] px-1 border border-slate-300 bg-slate-100">残業</th>
                      <th rowSpan={2} className="sticky top-0 z-30 w-[28px] min-w-[28px] px-1 border border-slate-300 bg-slate-100">欠勤</th>
                      <th rowSpan={2} className="sticky top-0 z-30 w-[28px] min-w-[28px] px-1 border border-slate-300 bg-slate-100">休出</th>
                      <th rowSpan={2} className="sticky top-0 z-30 w-[28px] min-w-[28px] px-1 border border-slate-300 bg-slate-100">法出</th>
                      <th rowSpan={2} className="sticky top-0 z-30 w-[30px] min-w-[30px] px-1 border border-slate-300 bg-slate-100">出勤</th>
                    </tr>
                    <tr className="bg-slate-50">
                      {attendancePeriodInfo.dates.map((dateStr) => {
                        const [y,m,d] = dateStr.split('-').map(Number);
                        const weekday = ['日','月','火','水','木','金','土'][new Date(y, m - 1, d).getDay()];
                        return (
                          <th key={`${dateStr}-w`} className={`sticky top-[25px] z-30 px-1 py-1 border border-slate-300 bg-slate-50 text-center ${
                            weekday === '日' ? 'text-rose-600' : weekday === '土' ? 'text-blue-600' : 'text-slate-500'
                          }`}>
                            {weekday}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>

                  <tbody>
                    {monthlyAttendanceRows.map((row: any, index: number) => {
                      const previousType = index > 0 ? monthlyAttendanceRows[index - 1].calendarType : null;
                      const showGroup = previousType !== row.calendarType;
                      const groupLabel =
                        row.calendarType === 'yamato'
                          ? '社員'
                          : row.calendarType === 'trainee'
                            ? '実習生'
                            : '該当なし';

                      return (
                        <Fragment key={row.name}>
                          {showGroup && (
                            <tr>
                              <td
                                colSpan={attendancePeriodInfo.dates.length + 10}
                                className={`px-3 py-2 border border-slate-300 font-bold text-sm ${
                                  row.calendarType === 'yamato'
                                    ? 'bg-blue-50 text-blue-900'
                                    : row.calendarType === 'trainee'
                                      ? 'bg-amber-50 text-amber-900'
                                      : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {groupLabel}
                              </td>
                            </tr>
                          )}

                          <tr>
                            <td
                              className={`sticky left-0 z-10 w-[54px] min-w-[54px] max-w-[54px] px-0.5 py-1 border border-slate-300 bg-white font-bold text-[9px] whitespace-nowrap overflow-hidden text-ellipsis ${
                                draggedAttendanceWorker?.name === row.name ? 'opacity-50' : ''
                              }`}
                              onDragOver={(e) => {
                                if (draggedAttendanceWorker && draggedAttendanceWorker.calendarType === row.calendarType) {
                                  e.preventDefault();
                                  e.dataTransfer.dropEffect = 'move';
                                }
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                if (!draggedAttendanceWorker) return;
                                if (draggedAttendanceWorker.calendarType !== row.calendarType) {
                                  setDraggedAttendanceWorker(null);
                                  return;
                                }
                                if (draggedAttendanceWorker.name === row.name) {
                                  setDraggedAttendanceWorker(null);
                                  return;
                                }

                                const sameGroup = monthlyAttendanceRows
                                  .filter((x: any) => x.calendarType === row.calendarType)
                                  .map((x: any) => x.name);
                                const fromIndex = sameGroup.indexOf(draggedAttendanceWorker.name);
                                const toIndex = sameGroup.indexOf(row.name);
                                if (fromIndex < 0 || toIndex < 0) {
                                  setDraggedAttendanceWorker(null);
                                  return;
                                }

                                const reorderedGroup = [...sameGroup];
                                const [moved] = reorderedGroup.splice(fromIndex, 1);
                                reorderedGroup.splice(toIndex, 0, moved);

                                const currentByGroup = ['yamato', 'trainee', 'none'].flatMap((type) => {
                                  if (type === row.calendarType) return reorderedGroup;
                                  return monthlyAttendanceRows
                                    .filter((x: any) => x.calendarType === type)
                                    .map((x: any) => x.name);
                                });
                                const knownNames = new Set(currentByGroup);
                                const masterExtras = (Array.isArray(settings.workers) ? settings.workers : [])
                                  .map((w: any) => w?.name)
                                  .filter((name: string) => name && !knownNames.has(name));

                                setSettings((prev: any) => ({
                                  ...prev,
                                  attendanceWorkerOrder: [...currentByGroup, ...masterExtras]
                                }));
                                setAttendanceChangesDirty(true);
                                setDraggedAttendanceWorker(null);
                              }}
                            >
                              <div className="flex items-center gap-0.5 min-w-0">
                                <span
                                  draggable
                                  onDragStart={(e) => {
                                    setDraggedAttendanceWorker({ name: row.name, calendarType: row.calendarType });
                                    e.dataTransfer.setData('text/plain', `ATTENDANCE_WORKER:${row.name}`);
                                    e.dataTransfer.effectAllowed = 'move';
                                  }}
                                  onDragEnd={() => setDraggedAttendanceWorker(null)}
                                  title="ドラッグして同じ区分内の順番を変更"
                                  className="shrink-0 cursor-grab active:cursor-grabbing text-slate-400 select-none"
                                >
                                  ⋮⋮
                                </span>
                                <span className="min-w-0 overflow-hidden text-ellipsis">{row.name}</span>
                              </div>
                            </td>

                            {row.details.map((d: any) => {
                              const hasReportWork = d.fraction > 0;
                              const isManagement = d.manualStatus === '管理' && !hasReportWork;
                              const isSansei = d.manualStatus === 'サンセイ' && !hasReportWork;
                              const isAbsence = d.manualStatus === '欠勤' && !hasReportWork;
                              const paidLeaveStatus = d.paidLeaveStatus || '';
                              const hasAttendance = d.attendanceFraction > 0;
                              const travelMarkNumber = Number(d.travelAllowanceMarkNumber || 0);
                              const travelMarked = travelMarkNumber > 0;
                              const selectedSiteNames = new Set<string>(
                                row.details
                                  .filter((detail: any) => Number(detail.travelAllowanceMarkNumber || 0) > 0)
                                  .flatMap((detail: any) => detail.sites || [])
                              );
                              const isSelectedSite =
                                hasReportWork &&
                                d.sites.some((site: string) => selectedSiteNames.has(site));
                              const isShiftedHoliday = !!d.holidayMove;
                              const canDragHoliday =
                                row.calendarType !== 'none' &&
                                d.isHoliday;
                              const canDropManagement =
                                !hasReportWork &&
                                !isManagement &&
                                !isSansei &&
                                !isAbsence &&
                                row.calendarType !== 'none' &&
                                (d.isScheduled || d.isHoliday);
                              const canDropSansei =
                                !hasReportWork &&
                                !isManagement &&
                                !isSansei &&
                                !isAbsence;
                              const canDropAbsence =
                                !hasReportWork &&
                                !isManagement &&
                                !isSansei &&
                                !isAbsence &&
                                !paidLeaveStatus &&
                                !d.isHoliday;

                              let bg = 'bg-white';
                              let textColor = 'text-slate-700';

                              if (isSelectedSite) {
                                bg = 'bg-sky-200';
                                textColor = 'text-sky-900';
                              } else if (paidLeaveStatus && !hasReportWork && !isManagement) {
                                bg = 'bg-violet-50';
                                textColor = 'text-violet-900';
                              } else if (isManagement) {
                                bg = 'bg-blue-100';
                                textColor = 'text-blue-800';
                              } else if (isSansei) {
                                bg = 'bg-emerald-100';
                                textColor = 'text-emerald-800';
                              } else if (isAbsence) {
                                bg = 'bg-rose-100';
                                textColor = 'text-rose-800';
                              } else if (d.isHoliday) {
                                if (hasAttendance) {
                                  bg = 'bg-orange-100';
                                  textColor = 'text-orange-900';
                                } else {
                                  bg = 'bg-slate-800';
                                  textColor = 'text-white';
                                }
                              } else if (d.fraction === 0.5) {
                                bg = 'bg-amber-100';
                              } else if (!hasAttendance && row.calendarType !== 'none' && d.isScheduled) {
                                bg = 'bg-rose-50';
                                textColor = 'text-rose-700';
                              }

                              const displaySites = d.sites.map((site: string) => getLocationShortName(site));
                              const label = hasReportWork
                                ? displaySites.join('・') || '出勤'
                                : isManagement
                                  ? '管理'
                                  : isSansei
                                    ? 'サンセイ'
                                    : isAbsence
                                      ? '欠勤'
                                      : d.isHoliday
                                      ? ''
                                      : paidLeaveStatus
                                        ? ''
                                        : row.calendarType !== 'none' && d.isScheduled
                                          ? '欠勤?'
                                          : '';

                              return (
                                <td
                                  key={`${row.name}-${d.date}`}
                                  title={
                                    hasReportWork && d.sites.length > 0
                                      ? `${d.date} / ${d.sites.join(' / ')} / ${travelMarked ? `カウント ${travelMarkNumber}（クリックで解除・保存なし）` : 'クリックでカウント（保存なし）'}`
                                      : isShiftedHoliday
                                        ? `${d.date} / 個別休日変更（元：${d.holidayMove?.from}）※この作業員だけ`
                                        : isManagement
                                          ? `${d.date} / 管理（クリックで解除）`
                                        : isSansei
                                          ? `${d.date} / サンセイ（クリックで解除）`
                                        : isAbsence
                                          ? `${d.date} / 欠勤（クリックで解除）`
                                        : canDropManagement
                                          ? `${d.date} / 「管理」「サンセイ」「欠勤」をここへドラッグできます。有給はどのセルにもドラッグできます`
                                        : canDropSansei || canDropAbsence
                                          ? `${d.date} / 「サンセイ」または「欠勤」をここへドラッグできます。有給はどのセルにもドラッグできます`
                                          : `${d.date}${d.sites.length ? ` / ${d.sites.join(' / ')}` : ''}${paidLeaveStatus ? ` / ${paidLeaveStatus}` : ''}`
                                  }
                                  onContextMenu={(e) => {
                                    e.preventDefault();
                                    // 右クリック操作：休を右クリックして選択 → 同じ作業員の移動先を右クリック。
                                    if (selectedHolidayMove && selectedHolidayMove.workerName === row.name && selectedHolidayMove.fromDate !== d.date) {
                                      const fromDate = selectedHolidayMove.fromDate;
                                      if (confirm(`${row.name} の休みを ${fromDate} から ${d.date} へ個別変更しますか？`)) {
                                        saveWorkerHolidayMove(row.name, fromDate, d.date);
                                      }
                                      setSelectedHolidayMove(null);
                                      return;
                                    }
                                    if (canDragHoliday) {
                                      setSelectedHolidayMove({ workerName: row.name, fromDate: d.date });
                                    }
                                  }}
                                  onDragOver={(e) => {
                                    e.preventDefault();
                                    e.dataTransfer.dropEffect = 'copy';
                                  }}
                                  onDrop={(e) => {
                                    e.preventDefault();
                                    const dropped = e.dataTransfer.getData('text/plain');

                                    if (dropped === '管理') {
                                      if (canDropManagement) {
                                        saveManualAttendanceStatus(row.name, d.date, '管理');
                                      }
                                      return;
                                    }

                                    if (dropped === 'サンセイ') {
                                      if (canDropSansei) {
                                        saveManualAttendanceStatus(row.name, d.date, 'サンセイ');
                                      }
                                      return;
                                    }

                                    if (dropped === '欠勤') {
                                      if (canDropAbsence) {
                                        saveManualAttendanceStatus(row.name, d.date, '欠勤');
                                      }
                                      return;
                                    }

                                    if (dropped.startsWith('PAID_LEAVE:')) {
                                      const leaveType = dropped.replace('PAID_LEAVE:', '');
                                      if (
                                        leaveType === '有給' ||
                                        leaveType === '午前有給' ||
                                        leaveType === '午後有給'
                                      ) {
                                        savePaidLeaveStatus(
                                          row.name,
                                          d.date,
                                          leaveType as '有給' | '午前有給' | '午後有給'
                                        );
                                      }
                                      return;
                                    }

                                    if (dropped.startsWith('HOLIDAY_MOVE:')) {
                                      const [, sourceWorker, fromDate] = dropped.split(':');
                                      if (sourceWorker === row.name && fromDate && fromDate !== d.date) {
                                        saveWorkerHolidayMove(row.name, fromDate, d.date);
                                      }
                                    }
                                  }}
                                  onClick={() => {
                                    // 「休」をクリック選択した後は、同じ作業員の移動先セルをクリックでも振替できる。
                                    if (
                                      selectedHolidayMove &&
                                      selectedHolidayMove.workerName === row.name &&
                                      selectedHolidayMove.fromDate !== d.date
                                    ) {
                                      const fromDate = selectedHolidayMove.fromDate;
                                      setSelectedHolidayMove(null);
                                      saveWorkerHolidayMove(row.name, fromDate, d.date);
                                      return;
                                    }

                                    if (hasReportWork && d.sites.length > 0) {
                                      toggleTravelAllowanceMark(row.name, d.date);
                                      return;
                                    }

                                    if (
                                      isManagement &&
                                      confirm(`${row.name} / ${d.date} の「管理」を解除しますか？`)
                                    ) {
                                      saveManualAttendanceStatus(row.name, d.date, '');
                                      return;
                                    }

                                    if (
                                      isSansei &&
                                      confirm(`${row.name} / ${d.date} の「サンセイ」を解除しますか？`)
                                    ) {
                                      saveManualAttendanceStatus(row.name, d.date, '');
                                      return;
                                    }

                                    if (
                                      isAbsence &&
                                      confirm(`${row.name} / ${d.date} の「欠勤」を解除しますか？`)
                                    ) {
                                      saveManualAttendanceStatus(row.name, d.date, '');
                                    }
                                  }}
                                  className={`w-[30px] min-w-[30px] max-w-[44px] h-[42px] px-0.5 py-0.5 border border-slate-300 text-center align-middle ${bg} ${textColor} ${
                                    canDropManagement ? 'hover:ring-2 hover:ring-inset hover:ring-blue-400' : canDropAbsence ? 'hover:ring-2 hover:ring-inset hover:ring-rose-400' : ''
                                  } ${(isManagement || isSansei || isAbsence || (hasReportWork && d.sites.length > 0)) ? 'cursor-pointer' : ''} ${
                                    canDragHoliday ? 'cursor-grab active:cursor-grabbing' : ''
                                  } ${
                                    travelMarked ? 'ring-2 ring-inset ring-sky-500' : ''
                                  } ${
                                    selectedHolidayMove?.workerName === row.name && selectedHolidayMove.fromDate !== d.date
                                      ? 'hover:ring-2 hover:ring-inset hover:ring-emerald-400'
                                      : ''
                                  }`}
                                >
                                  <div className="flex flex-col items-center justify-center gap-0.5">
                                    <div className="max-w-[32px] truncate font-medium leading-tight text-[8px]">
                                      {label}
                                    </div>
                                    {row.calendarType === 'none' && d.isHoliday && !hasReportWork && !isManagement && !isSansei && !isAbsence && (
                                      <div
                                        title="日曜日・日本の祝日（表示用）"
                                        className="select-none rounded bg-slate-900 px-1 py-1 text-[8px] font-black leading-none text-white min-w-[24px]"
                                      >
                                        休
                                      </div>
                                    )}
                                    {canDragHoliday && (
                                      <div
                                        draggable
                                        onContextMenu={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          setSelectedHolidayMove({ workerName: row.name, fromDate: d.date });
                                        }}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const sameSelected =
                                            selectedHolidayMove?.workerName === row.name &&
                                            selectedHolidayMove?.fromDate === d.date;
                                          setSelectedHolidayMove(
                                            sameSelected ? null : { workerName: row.name, fromDate: d.date }
                                          );
                                        }}
                                        onDragStart={(e) => {
                                          e.stopPropagation();
                                          setSelectedHolidayMove(null);
                                          e.dataTransfer.setData(
                                            'text/plain',
                                            `HOLIDAY_MOVE:${row.name}:${d.date}`
                                          );
                                          e.dataTransfer.effectAllowed = 'move';
                                        }}
                                        title="この『休』を右クリック→移動先を右クリック。ドラッグ、またはクリック→移動先クリックでも可"
                                        className={`select-none rounded px-1 py-1 text-[8px] font-black leading-none text-white cursor-grab active:cursor-grabbing ${
                                          selectedHolidayMove?.workerName === row.name && selectedHolidayMove?.fromDate === d.date
                                            ? 'bg-emerald-600 ring-2 ring-emerald-300'
                                            : 'bg-slate-900'
                                        } ${hasReportWork ? '' : 'min-w-[24px]'}`}
                                      >
                                        休
                                      </div>
                                    )}
                                  </div>

                                  {isShiftedHoliday && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (confirm(`${row.name} / ${d.date} の個別休日変更を元の日へ戻しますか？`)) {
                                          resetWorkerHolidayMove(row.name, d.date);
                                        }
                                      }}
                                      title="クリックで個別休日変更を元に戻す"
                                      className="mt-0.5 max-w-[32px] truncate rounded bg-slate-200 px-0.5 text-[7px] font-black leading-tight text-slate-700"
                                    >
                                      個別休
                                    </button>
                                  )}

                                  {paidLeaveStatus && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (
                                          confirm(
                                            `${row.name} / ${d.date} の「${paidLeaveStatus}」を解除しますか？\n日報データは変更されません。`
                                          )
                                        ) {
                                          savePaidLeaveStatus(row.name, d.date, '');
                                        }
                                      }}
                                      title="クリックで有給表示を解除"
                                      className="mt-0.5 max-w-[32px] truncate rounded bg-violet-100 px-0.5 text-[7px] font-black leading-tight text-violet-800"
                                    >
                                      {paidLeaveStatus}
                                    </button>
                                  )}

                                  {travelMarked && (
                                    <div className="text-[8px] font-black text-sky-700 leading-none mt-0.5">{travelMarkNumber}</div>
                                  )}
                                  {d.holidayWorkHours > 0 && (
                                    <div className="text-[7px] font-bold text-rose-700 leading-none mt-0.5">
                                      {d.holidayWorkHours}時間
                                    </div>
                                  )}
                                  {d.fraction === 0.5 && <div className="text-[7px] text-amber-700 leading-none">半</div>}
                                  {d.overtime > 0 && <div className="text-[7px] text-orange-700 leading-none">+{d.overtime}</div>}
                                </td>
                              );
                            })}

                            <td className="px-0.5 border border-slate-300 text-center">
                              {row.isWeeklyPay ? (
                                <span className="text-orange-700 font-bold">週払い</span>
                              ) : '月払い'}
                            </td>

                            <td className="px-0.5 border border-slate-300 text-center font-medium">
                              {row.calendarType === 'yamato'
                                ? '社員'
                                : row.calendarType === 'trainee'
                                  ? '実習'
                                  : 'なし'}
                            </td>

                            <td className="px-0.5 border border-slate-300 text-center">
                              {row.scheduledHours !== null ? `${row.scheduledHours}h` : '-'}
                            </td>
                            <td className="px-0.5 border border-slate-300 text-center font-bold text-orange-700">
                              {row.overtimeHours}h
                            </td>
                            <td className="px-0.5 border border-slate-300 text-center font-bold text-rose-700">
                              {row.absenceCandidates}
                            </td>
                            <td className="px-0.5 border border-slate-300 text-center font-bold text-orange-700 leading-tight">
                              {row.restHolidayWorkDays > 0 || row.restHolidayWorkHours > 0 ? (
                                <div className="flex flex-col items-center justify-center">
                                  <span>{row.restHolidayWorkDays}日</span>
                                  <span>{row.restHolidayWorkHours}h</span>
                                </div>
                              ) : '-'}
                            </td>
                            <td className="px-0.5 border border-slate-300 text-center font-bold text-rose-700 leading-tight">
                              {row.legalHolidayWorkDays > 0 || row.legalHolidayWorkHours > 0 ? (
                                <div className="flex flex-col items-center justify-center">
                                  <span>{row.legalHolidayWorkDays}日</span>
                                  <span>{row.legalHolidayWorkHours}h</span>
                                </div>
                              ) : '-'}
                            </td>
                            <td className="px-0.5 border border-slate-300 text-center font-bold text-blue-800 leading-tight">
                              <div className="flex flex-col items-center justify-center">
                                <span>{row.equivalentDays}日</span>
                                {row.paidLeaveEquivalent > 0 && (
                                  <span className="text-violet-700">有給{row.paidLeaveEquivalent}</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* カレンダー下部にも上部と同じ操作欄を表示 */}
              <div className="pt-2 border-t border-slate-200">{renderAttendanceTools()}</div>

              {/* 保存済みの勤怠変更履歴。Supabaseのsettingsに保存するため、複数端末で共有される。 */}
              <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
                  <div>
                    <div className="font-black text-slate-800">🕘 勤怠変更履歴（共有）</div>
                    <div className="mt-0.5 text-[11px] text-slate-500">「勤怠変更を保存」を押した内容を、新しい順に表示します。</div>
                  </div>
                  <div className="text-[11px] font-bold text-slate-500">最新30件</div>
                </div>
                <div className="max-h-80 overflow-y-auto px-4 py-3">
                  {(Array.isArray(settings.attendanceChangeHistory) ? settings.attendanceChangeHistory : []).length === 0 ? (
                    <div className="py-4 text-center text-sm text-slate-400">まだ保存済みの変更履歴はありません。</div>
                  ) : (
                    <div className="relative ml-2 border-l-2 border-slate-200 pl-5 space-y-4">
                      {(settings.attendanceChangeHistory || []).slice(0, 30).map((item: any, idx: number) => (
                        <div key={item?.id || `${item?.savedAt || 'history'}-${idx}`} className="relative">
                          <span className="absolute -left-[27px] top-1.5 h-3 w-3 rounded-full border-2 border-white bg-blue-500 shadow" />
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="text-[11px] font-bold text-slate-400">{formatAttendanceHistoryTime(item?.savedAt || '')}</span>
                            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">{item?.category || '変更'}</span>
                          </div>
                          <div className="mt-1 text-sm leading-relaxed text-slate-700">
                            <span className="font-black text-slate-900">{item?.workerName || '不明'}</span>
                            {item?.date ? <span className="text-slate-500"> ・ {item.date}</span> : null}
                            <span> ・ {item?.detail || ''}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="text-xs text-slate-500 leading-relaxed space-y-1">
                <div>※ 「欠勤?」は会社カレンダー上の出勤日に日報の出勤記録がない日です。欠勤確定ではなく確認用です。</div>
                <div>※ 日曜日に出勤した日は自動で「法出」、それ以外の会社休日に出勤した日は自動で「休出」として集計します。</div>
                <div>※ 日報で休日出勤時間を入力した場合はその時間を使用し、入力がない場合は作業員マスタの所定勤務時間（8時間／7時間）を自動で使用します。</div>
                <div>※ 現場名が入っているセルはどの現場でもクリックできます。クリックしたセルには 1・2・3… と順番を表示し、その現場の同じ月のセルをまとめて水色表示します。このチェックは一時機能で、Supabaseには保存されません。画面を再読み込みするとリセットされます。</div>
                <div>※ 現場管理・安全パトロール等で日報を送信しない日は「管理」を、サンセイ勤務の日は「サンセイ」を、欠勤日は「欠勤」を対象セルへドラッグしてください。「管理」「サンセイ」は1日出勤として集計し、「欠勤」は出勤には加算しません。</div>
                <div>※ 会社カレンダーの「休」は作業員ごとに別の日へ変更できます。「休」を右クリック→移動先を右クリック（ドラッグ／クリック操作も可）。その作業員だけの変更で、会社カレンダー・元の日報・現場情報は変更しません。</div>
                <div>※ 「有給」「午前有給」「午後有給」はどの日付セルにもドラッグできます。日報が入力済みの日に付けても、現場名や日報データは消えず、有給表示だけを重ねます。</div>
                <div>※ 出勤欄の下に有給換算を表示します。有給=1、午前有給=0.5、午後有給=0.5です。</div>
                <div>※ 有給表示を解除する場合は、セル内の紫色の「有給／午前有給／午後有給」をクリックしてください。</div>
                <div>※ 「管理」「サンセイ」「欠勤」を解除する場合は、それぞれの色付きセルをクリックしてください。</div>
                <div>※ 個別休日変更・有給・管理・サンセイ・欠勤は操作中は画面内だけに反映されます。最後に「勤怠変更を保存」を押すと、まとめて1回保存され、変更履歴にも追加されます。</div>
                <div>※ 「該当なし」は会社カレンダーによる所定日数・欠勤候補の判定は行いませんが、日曜日と日本の祝日は「休」と表示します。</div>
                <div>※ 同日に複数現場へ入っている場合、勤務換算日数は最大1日として集計します。</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* マスタ登録・単価設定エリア（管理者のみ） */}
      {authRole === 'admin' && (
        <div className="bg-violet-50/40 rounded-3xl shadow-sm border-2 border-violet-200 overflow-hidden">
          <div
            role="button"
            tabIndex={0}
            onClick={() => setShowAdminSection(!showAdminSection)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setShowAdminSection(!showAdminSection);
              }
            }}
            className="flex justify-between items-center flex-wrap gap-4 bg-violet-200 px-4 md:px-8 py-4 md:py-5 cursor-pointer select-none"
          >
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-violet-900">⚙️ マスタ登録・単価設定（PC管理者用）</h2>
              <p className="text-sm md:text-base text-violet-700 mt-1">作業員・職長・車両・重機・外注・処分場などの登録と単価設定</p>
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setShowAdminSection(!showAdminSection);
              }}
              className="bg-white hover:bg-violet-50 text-violet-700 border border-violet-200 px-4 py-2.5 rounded-xl font-bold text-sm transition shadow-sm"
            >
              {showAdminSection ? '⚙️ 設定エリアを隠す ▲' : '⚙️ 設定エリアを開く ▼'}
            </button>
          </div>

          {showAdminSection && (
            <div className="p-5 lg:p-6 animate-fadeIn">
              <div className="max-w-[1360px] mx-auto">
              <div className="mb-5 rounded-2xl border border-violet-200 bg-white p-4 shadow-sm">
                <div className="mb-4">
                  <h3 className="text-lg md:text-xl font-extrabold text-slate-900">🔎 何を登録しますか？</h3>
                  <p className="text-sm text-slate-600 mt-1">下の項目を押すと、そのマスタ登録欄まで移動します。</p>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5">
                  {[
                    { title: '👷 人・基本情報', tone: 'blue', items: [
                      ['作業員', 'workers'], ['職長', 'managers'], ['職種', 'jobTypes'], ['現場', 'locations']
                    ] },
                    { title: '🏢 外注・自社保有', tone: 'emerald', items: [
                      ['外注会社', 'subcontractors'], ['自社車両', 'vehicles'], ['自社重機', 'companyMachines']
                    ] },
                    { title: '🚜 リース', tone: 'amber', items: [
                      ['リース業者', 'leaseVendors'], ['リースマスタ', 'leaseMasterUnified']
                    ] },
                    { title: '🗾 石川県用', tone: 'indigo', items: [
                      ['石川県用リースマスタ', 'ishikawa-group']
                    ] },
                    { title: '🗑️ 処分・売却', tone: 'rose', items: [
                      ['処分場', 'disposalLocations'], ['スクラップ', 'scrapLocations']
                    ] },
                  ].map((group:any) => (
                    <div key={group.title} className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                      <div className="font-extrabold text-sm text-slate-800 mb-2">{group.title}</div>
                      <div className="flex flex-wrap gap-2">
                        {group.items.map(([label, key]: string[]) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => document.getElementById(`master-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                            className="bg-white hover:bg-violet-50 text-slate-700 hover:text-violet-700 border border-slate-200 hover:border-violet-300 px-2.5 py-1.5 rounded-lg text-xs font-bold transition shadow-sm"
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 text-xs md:text-sm text-slate-500 bg-violet-50 rounded-xl px-3 py-2.5">
                  💡 登録の流れ：①「新規追加」に入力 → ②「＋追加」 → ③ 右上の「💾 保存」
                </div>
              </div>

              <div id="master-leaseMasterUnified" className="mb-5 scroll-mt-6 p-4 rounded-2xl border-2 border-amber-200 bg-amber-50/60 space-y-4 shadow-sm">
                <div className="flex justify-between items-start gap-3 pb-3 border-b border-amber-200">
                  <div>
                    <div className="text-[11px] font-extrabold px-2 py-1 rounded-full bg-white border border-amber-200 text-amber-700 inline-flex mb-1">リース</div>
                    <h3 className="font-extrabold text-base md:text-lg text-slate-800">🚜 リースマスタ</h3>
                    <p className="text-xs md:text-sm text-slate-600 mt-1 leading-relaxed">リース業者 → カテゴリー → 名称 → 日額単価の順で、通常リースをまとめて登録します。</p>
                    <p className="text-xs text-slate-500 mt-1.5">※既存の重機・アタッチメント・その他機器データはそのまま使用します。業者未設定の既存データは南大阪建機として扱います。</p>
                  </div>
                  <button
                    type="button"
                    onClick={saveUnifiedLeaseMaster}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3.5 py-2 rounded-lg font-bold shadow-sm transition shrink-0"
                  >
                    💾 保存
                  </button>
                </div>

                <div id="master-leaseVendors" className="scroll-mt-6 rounded-2xl border border-amber-200 bg-white p-3.5">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div>
                      <div className="font-extrabold text-sm text-slate-800">🏢 リース業者登録</div>
                      <div className="text-xs text-slate-500 mt-0.5">ここで業者を登録すると、下のリースマスタですぐ選択できます。</div>
                    </div>
                    <div className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 whitespace-nowrap">登録済み {(settings.leaseVendors || []).length} 社</div>
                  </div>
                  <div className="grid grid-cols-[1fr_110px] gap-2 mb-3">
                    <input
                      type="text"
                      placeholder="リース業者名（例：○○リース）"
                      value={form.leaseVendorName || ''}
                      onChange={(e)=>setForm({...form, leaseVendorName: e.target.value})}
                      className="w-full p-2.5 border border-slate-300 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const name = String(form.leaseVendorName || '').trim();
                        if (!name) return alert('リース業者名を入力してください。');
                        if (name === '南大阪建機' || (settings.leaseVendors || []).some((v:any) => String(v?.name || '').trim() === name)) return alert('同じリース業者がすでに登録されています。');
                        addMaster('leaseVendors', { name }, ['leaseVendorName']);
                      }}
                      className="bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-sm shadow-sm transition"
                    >
                      ＋ 追加
                    </button>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                    <div className="flex items-center gap-2 p-2.5 rounded-xl border border-amber-200 bg-amber-50">
                      <div className="flex-1 font-bold text-sm text-slate-800">南大阪建機</div>
                      <span className="text-[11px] font-bold text-amber-800 bg-white border border-amber-200 rounded-lg px-2 py-1">標準・常設</span>
                    </div>
                    {(settings.leaseVendors || []).map((vendor:any, vendorIdx:number) => (
                      <div key={`${vendor.name || ''}_${vendorIdx}`} className="flex items-center gap-2 p-2 rounded-xl border border-slate-200 bg-slate-50">
                        <input
                          type="text"
                          value={vendor.name || ''}
                          onChange={(e)=>updateItemField('leaseVendors', vendorIdx, 'name', e.target.value)}
                          className="flex-1 min-w-0 p-2 border border-slate-300 rounded-lg text-sm font-bold bg-white"
                        />
                        <button type="button" onClick={() => deleteMaster('leaseVendors', vendorIdx)} className="text-rose-700 hover:text-white font-bold text-xs px-2.5 py-2 bg-rose-50 hover:bg-rose-600 border border-rose-200 rounded-lg transition whitespace-nowrap">🗑 削除</button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-2xl border-2 border-dashed border-amber-300">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-3">
                    <span className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">＋</span>
                    リース品を新規追加
                  </div>
                  <div className="grid grid-cols-[1.15fr_1fr_1.35fr_0.75fr_110px] gap-2.5 items-end">
                    <label className="text-xs font-bold text-slate-600">リース業者
                      <select value={form.unifiedLeaseVendor || ''} onChange={(e)=>setForm({...form, unifiedLeaseVendor: e.target.value})} className="mt-1 w-full p-2.5 border border-slate-300 rounded-xl text-sm bg-slate-50 font-bold">
                        <option value="">リース業者を選択</option>
                        <option value="南大阪建機">南大阪建機</option>
                        {(settings.leaseVendors || []).filter((vendor:any) => vendor.name && vendor.name !== '南大阪建機').map((vendor:any, vendorIdx:number) => (
                          <option key={`${vendor.name || ''}_${vendorIdx}`} value={vendor.name || ''}>{vendor.name || ''}</option>
                        ))}
                      </select>
                    </label>
                    <label className="text-xs font-bold text-slate-600">カテゴリー
                      <select value={form.unifiedLeaseCategory || 'leaseHeavy'} onChange={(e)=>setForm({...form, unifiedLeaseCategory: e.target.value})} className="mt-1 w-full p-2.5 border border-slate-300 rounded-xl text-sm bg-slate-50 font-bold">
                        <option value="leaseHeavy">重機</option>
                        <option value="leaseAttach">アタッチメント</option>
                        <option value="leaseOther">その他の機械・機器</option>
                      </select>
                    </label>
                    <label className="text-xs font-bold text-slate-600">名称
                      <input type="text" value={form.unifiedLeaseName || ''} onChange={(e)=>setForm({...form, unifiedLeaseName: e.target.value})} placeholder="名称" className="mt-1 w-full p-2.5 border border-slate-300 rounded-xl text-sm bg-slate-50 font-medium" />
                    </label>
                    <label className="text-xs font-bold text-slate-600">日額単価
                      <input type="number" value={form.unifiedLeasePrice || ''} onChange={(e)=>setForm({...form, unifiedLeasePrice: e.target.value})} placeholder="日額" className="mt-1 w-full p-2.5 border border-slate-300 rounded-xl text-sm bg-slate-50 font-medium text-right" />
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const vendor = String(form.unifiedLeaseVendor || '').trim();
                        const category = String(form.unifiedLeaseCategory || 'leaseHeavy');
                        const name = String(form.unifiedLeaseName || '').trim();
                        if (!vendor) return alert('リース業者を選択してください。');
                        if (!name) return alert('名称を入力してください。');
                        addMaster(category, { name, price: Number(form.unifiedLeasePrice) || 0, vendor, isFinished: false }, ['unifiedLeaseVendor', 'unifiedLeaseName', 'unifiedLeasePrice']);
                      }}
                      className="h-[42px] bg-orange-600 hover:bg-orange-700 text-white px-4 rounded-xl font-bold text-sm shadow-sm transition text-center whitespace-nowrap"
                    >
                      ＋ 追加
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <div className="text-sm font-bold text-slate-700">✏️ 登録済みリース（直接編集できます）</div>
                    <div className="text-xs text-slate-400">変更後は右上の「💾 保存」</div>
                  </div>
                  <div className="max-h-[520px] overflow-y-auto bg-white border border-slate-300 rounded-2xl p-3 space-y-3">
                    {[
                      ...(settings.leaseHeavy || []).map((item:any, idx:number) => ({ item, idx, key: 'leaseHeavy', categoryLabel: '重機' })),
                      ...(settings.leaseAttach || []).map((item:any, idx:number) => ({ item, idx, key: 'leaseAttach', categoryLabel: 'アタッチメント' })),
                      ...(settings.leaseOther || []).map((item:any, idx:number) => ({ item, idx, key: 'leaseOther', categoryLabel: 'その他の機械・機器' }))
                    ].map((row:any) => (
                      <div key={`${row.key}_${row.idx}`} className="grid grid-cols-[120px_1.1fr_1.35fr_0.75fr_78px] gap-2 items-center p-2.5 rounded-xl border border-slate-200 bg-slate-50">
                        <span className="text-xs font-extrabold px-2.5 py-1.5 rounded-lg bg-amber-100 text-amber-800 text-center whitespace-nowrap">{row.categoryLabel}</span>
                        <select value={row.item.vendor || ''} onChange={(e)=>updateItemField(row.key, row.idx, 'vendor', e.target.value)} className="w-full min-w-0 p-2.5 border border-slate-300 rounded-xl text-sm font-bold bg-white min-w-0">
                          <option value="">未設定（南大阪建機扱い）</option>
                          <option value="南大阪建機">南大阪建機</option>
                          {(settings.leaseVendors || []).filter((vendor:any) => vendor.name && vendor.name !== '南大阪建機').map((vendor:any, vendorIdx:number) => (
                            <option key={`${vendor.name || ''}_${vendorIdx}`} value={vendor.name || ''}>{vendor.name || ''}</option>
                          ))}
                        </select>
                        <input type="text" value={row.item.name || ''} onChange={(e)=>updateItemField(row.key, row.idx, 'name', e.target.value)} placeholder="名称" className="w-full min-w-0 p-2.5 border border-slate-300 rounded-xl text-sm font-bold bg-white min-w-0" />
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-slate-500 font-bold text-sm">¥</span>
                          <input type="number" value={row.item.price || 0} onChange={(e)=>updateItemField(row.key, row.idx, 'price', e.target.value)} className="w-full min-w-0 p-2.5 border border-slate-300 rounded-xl text-right text-sm font-bold bg-white" placeholder="日額" />
                        </div>
                        <button type="button" onClick={() => deleteMaster(row.key, row.idx)} className="text-rose-700 hover:text-white font-bold text-xs px-2 py-2.5 bg-rose-50 hover:bg-rose-600 border border-rose-200 rounded-lg transition whitespace-nowrap">🗑 削除</button>
                      </div>
                    ))}
                    {(settings.leaseHeavy || []).length + (settings.leaseAttach || []).length + (settings.leaseOther || []).length === 0 && (
                      <p className="text-sm text-slate-400 text-center py-4">登録データがありません</p>
                    )}
                  </div>
                </div>
              </div>

              {(() => {
                const masterSections: any[] = [
                      { title: "🏢 現場名一覧", description: "工事現場・置場の正式名、略称、請負金額などを登録します。", category: "基本情報", key: "locations", nameKey: "name", priceKey: "price", addForm: ['lName', 'lPrice'], placeholders: ["新しい現場名", "請負金額（税抜）"], type: "locations" },
                      { title: "👤 職長一覧", description: "日報で選択する職長名を登録します。", category: "人・基本情報", key: "managers", nameKey: "name", priceKey: "price", addForm: ['mName', 'mPrice'], placeholders: ["職長名", "単価不要"], type: "managers", isNoPrice: true },
                      { title: "👥 作業メンバー＆日額単価", description: "作業員名、日額、勤務時間、社員・実習生などの区分を登録します。", category: "人・基本情報", key: "workers", nameKey: "name", priceKey: "price", addForm: ['wName', 'wPrice'], placeholders: ["メンバー名", "日額"], type: "workers" },
                      { title: "🏷️ 職種一覧", description: "日報で使用する作業内容・職種名を登録します。", category: "人・基本情報", key: "jobTypes", nameKey: "name", addForm: ['jName'], placeholders: ["職種名 (例: 解体工、オペなど)"], type: "jobTypes", isNoPrice: true },
                      { title: "🏢 外注会社・作業内容・単価", description: "外注会社ごとの作業内容と単価を登録します。", category: "外注・自社保有", key: "subcontractors", isSub: true },
                      { title: "🚚 自社車両＆日額単価", description: "自社で保有する車両と1日あたりの原価を登録します。", category: "外注・自社保有", key: "vehicles", nameKey: "name", priceKey: "price", addForm: ['vName', 'vPrice'], placeholders: ["車両名", "日額"], type: "vehicles" },
                      { title: "🚜 自社重機＆日額単価", description: "自社で保有する重機と1日あたりの原価を登録します。", category: "外注・自社保有", key: "companyMachines", nameKey: "name", priceKey: "price", addForm: ['cmName', 'cmPrice'], placeholders: ["重機名", "日額"], type: "companyMachines" },
                      { title: "🗾 （石川県）重機＆日額単価", description: "石川県出張で使用するリース重機の日額を登録します。業者は上の「石川県用リース業者マスタ」から選択します。", category: "石川県用", key: "ishikawaHeavy", nameKey: "name", priceKey: "price", addForm: ['ihName', 'ihPrice'], placeholders: ["重機名", "日額"], type: "ishikawaHeavy", isIshikawa: true, isLeaseMaster: true },
                      { title: "🗾 （石川県）アタッチメント＆日額単価", description: "石川県出張で使用するアタッチメントの日額を登録します。業者は上の「石川県用リース業者マスタ」から選択します。", category: "石川県用", key: "ishikawaAttach", nameKey: "name", priceKey: "price", addForm: ['iaName', 'iaPrice'], placeholders: ["アタッチメント名", "日額"], type: "ishikawaAttach", isIshikawa: true, isLeaseMaster: true },
                      { title: "🗾 （石川県）その他機械・機器＆日額単価", description: "石川県出張で使用するその他機器の日額を登録します。業者は上の「石川県用リース業者マスタ」から選択します。", category: "石川県用", key: "ishikawaOther", nameKey: "name", priceKey: "price", addForm: ['ioName', 'ioPrice'], placeholders: ["機械・機器名", "日額"], type: "ishikawaOther", isIshikawa: true, isLeaseMaster: true },
                      { title: "🗑️ 処分場マスタ＆単価", description: "処分場ごとの品目・単位・処分単価を登録します。", category: "処分・売却", key: "disposalLocations", isDisp: true },
                      { title: "♻️ スクラップマスタ", description: "スクラップ場ごとの品目・単位を登録します。", category: "処分・売却", key: "scrapLocations", isScrap: true },
                    ];
                const renderMasterSection = (sec: any, idx: number) => (
                          <div id={`master-${sec.key}`} key={idx} className={`scroll-mt-6 min-w-0 overflow-hidden p-4 rounded-2xl border space-y-3 flex flex-col shadow-sm ${(sec.isSub || sec.isDisp || sec.isScrap || sec.isLeaseMaster || sec.key === 'locations' || sec.key === 'workers') ? 'xl:col-span-2' : ''} ${sec.isIshikawa ? 'bg-indigo-50/70 border-indigo-200' : 'bg-slate-50 border-slate-200'}`}>
                            <div className="space-y-3">
                              <div className="flex justify-between items-start gap-3 pb-2.5 border-b border-slate-200/80">
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2 mb-1">
                                    <span className="text-[11px] font-extrabold px-2 py-1 rounded-full bg-white border border-slate-200 text-slate-500">{sec.category}</span>
                                  </div>
                                  <h3 className={`font-extrabold text-base md:text-lg leading-snug ${sec.isIshikawa ? 'text-indigo-800' : 'text-slate-800'}`}>{sec.title}</h3>
                                  <p className="text-xs md:text-sm text-slate-600 mt-1 leading-relaxed">{sec.description}</p>
                                  <p className="text-xs text-slate-400 mt-1.5">登録済み {(settings[sec.key] || []).length} 件</p>
                                </div>
                                <button 
                                  onClick={() => saveMaster(sec.key)} 
                                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3.5 py-2 rounded-lg font-bold shadow-sm transition shrink-0"
                                >
                                  💾 保存
                                </button>
                              </div>

                              <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                                <span className="w-7 h-7 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center">＋</span>
                                新規追加
                              </div>

                              {sec.isSub ? (
                                <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)_150px_96px] gap-2 items-end bg-white p-3 rounded-xl border-2 border-dashed border-slate-300">
                                  <input type="text" placeholder="外注会社名" value={form.subComp || ''} className="w-full p-2.5 border border-slate-300 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none font-medium" onChange={e=>setForm({...form, subComp: e.target.value})} />
                                  <input type="text" placeholder="作業内容" value={form.subTask || ''} className="w-full min-w-0 p-2.5 border border-slate-300 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none font-medium" onChange={e=>setForm({...form, subTask: e.target.value})} />
                                  <input type="number" placeholder="単価" value={form.subPrice || ''} className="w-full min-w-0 p-2.5 border border-slate-300 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none font-medium text-right" onChange={e=>setForm({...form, subPrice: e.target.value})} />
                                  <button onClick={() => addMaster('subcontractors', {company: form.subComp, task: form.subTask, price: Number(form.subPrice)||0}, ['subComp', 'subTask', 'subPrice'])} className="h-[42px] bg-orange-600 hover:bg-orange-700 text-white px-3 rounded-xl font-bold text-sm shadow-sm transition text-center">＋ 追加</button>
                                </div>
                              ) : sec.isDisp ? (
                                <div className="grid grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_90px_140px_96px] gap-2 items-end bg-white p-3 rounded-xl border-2 border-dashed border-slate-300">
                                  <input type="text" placeholder="処分場名" value={form.dLoc || ''} className="w-full p-2.5 border border-slate-300 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none font-medium" onChange={e=>setForm({...form, dLoc: e.target.value})} />
                                  <input type="text" placeholder="品目" value={form.dItem || ''} className="w-full min-w-0 p-2.5 border border-slate-300 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none font-medium" onChange={e=>setForm({...form, dItem: e.target.value})} />
                                  <input type="text" placeholder="単位" value={form.dUnit || ''} className="w-full min-w-0 p-2.5 border border-slate-300 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none font-medium" onChange={e=>setForm({...form, dUnit: e.target.value})} />
                                  <input type="number" placeholder="単価" value={form.dPrice || ''} className="w-full min-w-0 p-2.5 border border-slate-300 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none font-medium text-right" onChange={e=>setForm({...form, dPrice: e.target.value})} />
                                  <button onClick={() => addMaster(sec.key, {location: form.dLoc, item: form.dItem, unit: form.dUnit || 't', price: Number(form.dPrice)||0}, ['dLoc', 'dItem', 'dUnit', 'dPrice'])} className="h-[42px] bg-orange-600 hover:bg-orange-700 text-white px-3 rounded-xl font-bold text-sm shadow-sm transition text-center">＋ 追加</button>
                                </div>
                              ) : sec.isScrap ? (
                                <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_110px_96px] gap-2 items-end bg-white p-3 rounded-xl border-2 border-dashed border-slate-300">
                                  <input type="text" placeholder="スクラップ場名" value={form.sLoc || ''} className="w-full p-2.5 border border-slate-300 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none font-medium" onChange={e=>setForm({...form, sLoc: e.target.value})} />
                                  <input type="text" placeholder="品目" value={form.sItem || ''} className="w-full min-w-0 p-2.5 border border-slate-300 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none font-medium" onChange={e=>setForm({...form, sItem: e.target.value})} />
                                  <input type="text" placeholder="単位" value={form.sUnit || ''} className="w-full min-w-0 p-2.5 border border-slate-300 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none font-medium" onChange={e=>setForm({...form, sUnit: e.target.value})} />
                                  <button onClick={() => addMaster(sec.key, {location: form.sLoc, item: form.sItem, unit: form.sUnit || 'kg'}, ['sLoc', 'sItem', 'sUnit'])} className="h-[42px] bg-orange-600 hover:bg-orange-700 text-white px-3 rounded-xl font-bold text-sm shadow-sm transition text-center">＋ 追加</button>
                                </div>
                              ) : sec.isLeaseMaster ? (
                                <div className="grid grid-cols-[minmax(0,1.1fr)_minmax(0,1.35fr)_150px_96px] gap-2 items-end bg-white p-3 rounded-xl border-2 border-dashed border-slate-300">
                                  <select
                                    value={form[`${sec.key}Vendor`] || ''}
                                    onChange={(e) => setForm({ ...form, [`${sec.key}Vendor`]: e.target.value })}
                                    className="w-full p-2.5 border border-slate-300 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none font-bold"
                                  >
                                    <option value="">リース業者を選択</option>
                                    {(settings.ishikawaLeaseVendors || []).map((vendor:any, vendorIdx:number) => (
                                      <option key={`${vendor.name || ''}_${vendorIdx}`} value={vendor.name || ''}>{vendor.name || ''}</option>
                                    ))}
                                  </select>
                                  <input type="text" placeholder={sec.placeholders[0]} value={form[sec.addForm[0]] || ''} className="w-full p-2.5 border border-slate-300 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none font-medium" onChange={e=>setForm({...form, [sec.addForm[0]]: e.target.value})} />
                                  <input type="number" placeholder={sec.placeholders[1]} value={form[sec.addForm[1]] || ''} className="w-full p-2.5 border border-slate-300 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none font-medium" onChange={e=>setForm({...form, [sec.addForm[1]]: e.target.value})} />
                                  <button onClick={() => {
                                    const vendor = String(form[`${sec.key}Vendor`] || '').trim();
                                    if (!vendor) return alert('リース業者を選択してください。');
                                    addMaster(sec.key, {name: form[sec.addForm[0]], price: Number(form[sec.addForm[1]])||0, vendor, isFinished: false}, [...sec.addForm, `${sec.key}Vendor`]);
                                  }} className="h-[42px] bg-orange-600 hover:bg-orange-700 text-white px-3 rounded-xl font-bold text-sm shadow-sm transition text-center">＋ 追加</button>
                                </div>
                              ) : sec.isNoPrice ? (
                                <div className="grid grid-cols-[1fr_100px] gap-2 items-end bg-white p-3 rounded-xl border-2 border-dashed border-slate-300">
                                  <input type="text" placeholder={sec.placeholders[0]} value={form[sec.addForm[0]] || ''} className="w-full p-2.5 border border-slate-300 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none font-medium" onChange={e=>setForm({...form, [sec.addForm[0]]: e.target.value})} />
                                  <button onClick={() => addMaster(sec.key, {name: form[sec.addForm[0]]}, [sec.addForm[0]])} className="h-[42px] bg-orange-600 hover:bg-orange-700 text-white px-3 rounded-xl font-bold text-sm shadow-sm transition text-center">＋ 追加</button>
                                </div>
                              ) : sec.key === 'locations' ? (
                                <div className="grid grid-cols-2 gap-2.5 bg-white p-3 rounded-xl border-2 border-dashed border-slate-300">
                                  <div className="col-span-2">
                                    <label className="block text-xs font-bold text-slate-600 mb-1">正式な現場名</label>
                                    <input
                                      type="text"
                                      placeholder="例：旧河北郡市クリーンセンター等解体工事(石川県)"
                                      value={form.lName || ''}
                                      className="w-full p-2.5 border border-slate-300 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none font-medium"
                                      onChange={e=>setForm({...form, lName: e.target.value})}
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">
                                      略称名 <span className="font-normal text-slate-400">（任意）</span>
                                    </label>
                                    <input
                                      type="text"
                                      placeholder="例：石川県"
                                      value={form.lShortName || ''}
                                      className="w-full p-2.5 border border-slate-300 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none font-medium"
                                      onChange={e=>setForm({...form, lShortName: e.target.value})}
                                    />
                                    <div className="text-[11px] text-slate-500 mt-1">
                                      月次勤怠では略称名を優先表示します。未入力なら正式名を表示します。
                                    </div>
                                  </div>

                                  <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">区分</label>
                                    <select
                                      value={form.lLocationType || 'site'}
                                      onChange={e=>setForm({...form, lLocationType: e.target.value})}
                                      className="w-full p-2.5 border border-slate-300 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none font-medium"
                                    >
                                      <option value="site">工事現場</option>
                                      <option value="yard">置場</option>
                                    </select>
                                  </div>

                                  {(form.lLocationType || 'site') === 'yard' && (
                                    <div>
                                      <label className="block text-xs font-bold text-slate-600 mb-1">置場責任者</label>
                                      <select
                                        value={form.lYardManager || '湯浅'}
                                        onChange={e=>setForm({...form, lYardManager: e.target.value})}
                                        className="w-full p-2.5 border border-slate-300 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none font-medium"
                                      >
                                        <option value="">未設定</option>
                                        {(settings.workers || []).map((w:any) => (
                                          <option key={w.name} value={w.name}>{w.name}</option>
                                        ))}
                                      </select>
                                    </div>
                                  )}

                                  <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">
                                      締め日 <span className="font-normal text-slate-400">（任意）</span>
                                    </label>
                                    <select
                                      value={form.lClosingDay || ''}
                                      onChange={e=>setForm({...form, lClosingDay: e.target.value})}
                                      className="w-full p-2.5 border border-slate-300 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none font-medium"
                                    >
                                      <option value="">未設定</option>
                                      {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                                        <option key={day} value={String(day)}>{day}日締め</option>
                                      ))}
                                      <option value="末日">末日締め</option>
                                    </select>
                                  </div>

                                  <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">請負金額（税抜）</label>
                                    <input
                                      type="number"
                                      placeholder="請負金額（税抜）"
                                      value={form.lPrice || ''}
                                      className="w-full p-2.5 border border-slate-300 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none font-medium"
                                      onChange={e=>setForm({...form, lPrice: e.target.value})}
                                    />
                                  </div>

                                  <button
                                    onClick={() =>
                                      addMaster(
                                        'locations',
                                        {
                                          name: form.lName,
                                          shortName: form.lShortName || '',
                                          locationType: form.lLocationType || 'site',
                                          yardManager: (form.lLocationType || 'site') === 'yard'
                                            ? (form.lYardManager || '湯浅')
                                            : '',
                                          closingDay: form.lClosingDay || '',
                                          price: Number(form.lPrice) || 0,
                                          isFinished: false
                                        },
                                        ['lName', 'lShortName', 'lLocationType', 'lYardManager', 'lClosingDay', 'lPrice']
                                      )
                                    }
                                    className="col-span-2 h-[42px] bg-orange-600 hover:bg-orange-700 text-white px-4 rounded-xl font-bold text-sm shadow-sm transition text-center"
                                  >
                                    ＋ 追加
                                  </button>
                                </div>
                              ) : sec.key === 'workers' ? (
                                <div className="grid grid-cols-2 gap-2.5 bg-white p-3 rounded-xl border-2 border-dashed border-slate-300">
                                  <input
                                    type="text"
                                    placeholder="メンバー名"
                                    value={form.wName || ''}
                                    className="w-full p-2.5 border border-slate-300 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none font-medium"
                                    onChange={e=>setForm({...form, wName: e.target.value})}
                                  />
                                  <input
                                    type="number"
                                    placeholder="日額"
                                    value={form.wPrice || ''}
                                    className="w-full p-2.5 border border-slate-300 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none font-medium"
                                    onChange={e=>setForm({...form, wPrice: e.target.value})}
                                  />

                                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                    <div className="text-sm font-bold text-slate-700 mb-2">所定勤務時間</div>
                                    <div className="grid grid-cols-2 gap-2">
                                      {[8, 7].map((hours) => (
                                        <label
                                          key={hours}
                                          className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 cursor-pointer font-bold transition ${
                                            Number(form.wShiftHours || 8) === hours
                                              ? 'bg-blue-50 border-blue-500 text-blue-700'
                                              : 'bg-white border-slate-200 text-slate-700'
                                          }`}
                                        >
                                          <input
                                            type="radio"
                                            name="new-worker-shift-hours"
                                            value={hours}
                                            checked={Number(form.wShiftHours || 8) === hours}
                                            onChange={() => setForm({...form, wShiftHours: hours})}
                                            className="accent-blue-600"
                                          />
                                          {hours}時間勤務
                                        </label>
                                      ))}
                                    </div>
                                  </div>

                                  <label className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition ${
                                    form.wWeeklyPay
                                      ? 'bg-orange-50 border-orange-300 text-orange-900'
                                      : 'bg-white border-slate-200 text-slate-700'
                                  }`}>
                                    <input
                                      type="checkbox"
                                      checked={!!form.wWeeklyPay}
                                      onChange={(e) => setForm({...form, wWeeklyPay: e.target.checked})}
                                      className="w-5 h-5 accent-orange-600"
                                    />
                                    <div>
                                      <div className="text-sm font-bold">週払い対象</div>
                                      <div className="text-xs text-slate-500 mt-0.5">毎週払いの作業員はこちら</div>
                                    </div>
                                  </label>

                                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                                    <div className="text-sm font-bold text-slate-700 mb-2">会社カレンダー</div>
                                    <select
                                      value={form.wCalendarType || 'none'}
                                      onChange={(e) => {
                                        const calendarType = e.target.value;
                                        setForm({
                                          ...form,
                                          wCalendarType: calendarType,
                                          wShiftHours:
                                            calendarType === 'yamato'
                                              ? 8
                                              : calendarType === 'trainee'
                                                ? 7
                                                : form.wShiftHours || 8
                                        });
                                      }}
                                      className="w-full p-2.5 rounded-xl border-2 border-slate-300 bg-white text-sm font-bold"
                                    >
                                      <option value="yamato">① 大和社員</option>
                                      <option value="trainee">② 実習生</option>
                                      <option value="none">③ 該当なし</option>
                                    </select>
                                  </div>

                                  <button
                                    onClick={() =>
                                      addMaster(
                                        'workers',
                                        {
                                          name: form.wName,
                                          price: Number(form.wPrice) || 0,
                                          shiftHours: Number(form.wShiftHours || 8),
                                          isWeeklyPay: !!form.wWeeklyPay,
                                          calendarType: form.wCalendarType || 'none'
                                        },
                                        ['wName', 'wPrice', 'wShiftHours', 'wWeeklyPay', 'wCalendarType']
                                      )
                                    }
                                    className="col-span-2 h-[42px] bg-orange-600 hover:bg-orange-700 text-white px-4 rounded-xl font-bold text-sm shadow-sm transition text-center"
                                  >
                                    ＋ 追加
                                  </button>
                                </div>
                              ) : (
                                <div className="grid grid-cols-[minmax(0,1fr)_150px_96px] gap-2 items-end bg-white p-3 rounded-xl border-2 border-dashed border-slate-300">
                                  <input type="text" placeholder={sec.placeholders[0]} value={form[sec.addForm[0]] || ''} className="w-full p-2.5 border border-slate-300 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none font-medium" onChange={e=>setForm({...form, [sec.addForm[0]]: e.target.value})} />
                                  <input type="number" placeholder={sec.placeholders[1]} value={form[sec.addForm[1]] || ''} className="w-full p-2.5 border border-slate-300 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none font-medium text-right" onChange={e=>setForm({...form, [sec.addForm[1]]: e.target.value})} />
                                  <button onClick={() => addMaster(sec.key, {name: form[sec.addForm[0]], price: Number(form[sec.addForm[1]])||0, isFinished: false}, sec.addForm)} className="h-[42px] bg-orange-600 hover:bg-orange-700 text-white px-3 rounded-xl font-bold text-sm shadow-sm transition text-center">＋ 追加</button>
                                </div>
                              )}
                            </div>

                            {/* 登録済みリスト */}
                            <div className="space-y-2 mt-1">
                              <div className="flex items-center justify-between px-1">
                                <div className="text-sm font-bold text-slate-700">✏️ 登録済みデータ（直接編集できます）</div>
                                <div className="text-xs text-slate-400">変更後は右上の「💾 保存」</div>
                              </div>
                              <div className="max-h-[380px] overflow-y-auto bg-white border border-slate-300 rounded-xl p-2.5 space-y-2">
                              {(settings[sec.key] || []).length === 0 ? (
                                <p className="text-sm text-slate-400 text-center py-4">登録データがありません</p>
                              ) : (
                                (settings[sec.key] || []).map((item:any, idx:number)=>(
                                  <div key={idx} className="flex flex-col gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 transition">
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
                                      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)_160px] gap-2 items-center">
                                        <input type="text" value={item.company || ''} onChange={(e)=>updateItemField(sec.key, idx, 'company', e.target.value)} placeholder="会社名" className="w-full min-w-0 p-2.5 border border-slate-300 rounded-xl text-sm font-bold bg-white" />
                                        <input type="text" value={item.task || ''} onChange={(e)=>updateItemField(sec.key, idx, 'task', e.target.value)} placeholder="作業内容" className="w-full min-w-0 p-2.5 border border-slate-300 rounded-xl text-sm font-bold bg-white" />
                                        <div className="relative min-w-0">
                                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">¥</span>
                                          <input type="number" value={item.price || 0} onChange={(e)=>updateItemField(sec.key, idx, 'price', e.target.value)} className="w-full min-w-0 p-2.5 pl-7 border border-slate-300 rounded-xl text-right text-sm font-bold bg-white text-slate-900" placeholder="単価" />
                                        </div>
                                      </div>
                                    ) : sec.isDisp ? (
                                      <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_100px_160px] gap-2 items-center">
                                        <input type="text" value={item.location || ''} onChange={(e)=>updateItemField(sec.key, idx, 'location', e.target.value)} placeholder="処分場名" className="w-full min-w-0 p-2.5 border border-slate-300 rounded-xl text-sm font-bold bg-white" />
                                        <input type="text" value={item.item || ''} onChange={(e)=>updateItemField(sec.key, idx, 'item', e.target.value)} placeholder="品目" className="w-full min-w-0 p-2.5 border border-slate-300 rounded-xl text-sm font-bold bg-white" />
                                        <input type="text" value={item.unit || ''} onChange={(e)=>updateItemField(sec.key, idx, 'unit', e.target.value)} placeholder="単位" className="w-full min-w-0 p-2.5 border border-slate-300 rounded-xl text-sm font-bold bg-white" />
                                        <div className="relative min-w-0">
                                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">¥</span>
                                          <input type="number" value={item.price || 0} onChange={(e)=>updateItemField(sec.key, idx, 'price', e.target.value)} className="w-full min-w-0 p-2.5 pl-7 border border-slate-300 rounded-xl text-right text-sm font-bold bg-white text-slate-900" placeholder="単価" />
                                        </div>
                                      </div>
                                    ) : sec.isScrap ? (
                                      <div className="grid grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_120px] gap-2 items-center">
                                        <input type="text" value={item.location || ''} onChange={(e)=>updateItemField(sec.key, idx, 'location', e.target.value)} placeholder="スクラップ場名" className="w-full min-w-0 p-2.5 border border-slate-300 rounded-xl text-sm font-bold bg-white" />
                                        <input type="text" value={item.item || ''} onChange={(e)=>updateItemField(sec.key, idx, 'item', e.target.value)} placeholder="品目" className="w-full min-w-0 p-2.5 border border-slate-300 rounded-xl text-sm font-bold bg-white" />
                                        <input type="text" value={item.unit || ''} onChange={(e)=>updateItemField(sec.key, idx, 'unit', e.target.value)} placeholder="単位" className="w-full min-w-0 p-2.5 border border-slate-300 rounded-xl text-sm font-bold bg-white" />
                                      </div>
                                    ) : sec.key === 'locations' ? (
                                      <div className="space-y-2">
                                        <div>
                                          <div className="text-[11px] font-bold text-slate-500 mb-1">正式な現場名</div>
                                          <input
                                            type="text"
                                            value={typeof item === 'string' ? item : item.name || ''}
                                            onChange={(e)=>updateItemField(sec.key, idx, 'name', e.target.value)}
                                            placeholder="正式な現場名"
                                            className="w-full p-2.5 border border-slate-300 rounded-xl text-sm md:text-base font-bold bg-white"
                                          />
                                        </div>
                                        <div>
                                          <div className="text-[11px] font-bold text-slate-500 mb-1">
                                            略称名 <span className="font-normal text-slate-400">（月次勤怠用・任意）</span>
                                          </div>
                                          <input
                                            type="text"
                                            value={typeof item === 'string' ? '' : item.shortName || ''}
                                            onChange={(e)=>updateItemField(sec.key, idx, 'shortName', e.target.value)}
                                            placeholder="例：石川県"
                                            className="w-full p-2.5 border border-slate-300 rounded-xl text-sm md:text-base font-bold bg-white"
                                          />
                                        </div>

                                        <div>
                                          <div className="text-[11px] font-bold text-slate-500 mb-1">区分</div>
                                          <select
                                            value={typeof item === 'string' ? (item === '置場' ? 'yard' : 'site') : (item.locationType || (item.name === '置場' ? 'yard' : 'site'))}
                                            onChange={(e)=>updateItemField(sec.key, idx, 'locationType', e.target.value)}
                                            className="w-full p-2.5 border border-slate-300 rounded-xl text-sm md:text-base font-bold bg-white"
                                          >
                                            <option value="site">工事現場</option>
                                            <option value="yard">置場</option>
                                          </select>
                                        </div>

                                        {(
                                          typeof item === 'string'
                                            ? item === '置場'
                                            : ((item.locationType || (item.name === '置場' ? 'yard' : 'site')) === 'yard')
                                        ) && (
                                          <div>
                                            <div className="text-[11px] font-bold text-slate-500 mb-1">置場責任者</div>
                                            <select
                                              value={typeof item === 'string' ? '湯浅' : (item.yardManager || '湯浅')}
                                              onChange={(e)=>updateItemField(sec.key, idx, 'yardManager', e.target.value)}
                                              className="w-full p-2.5 border border-slate-300 rounded-xl text-sm md:text-base font-bold bg-white"
                                            >
                                              <option value="">未設定</option>
                                              {(settings.workers || []).map((w:any) => (
                                                <option key={w.name} value={w.name}>{w.name}</option>
                                              ))}
                                            </select>
                                          </div>
                                        )}

                                        <div>
                                          <div className="text-[11px] font-bold text-slate-500 mb-1">
                                            締め日 <span className="font-normal text-slate-400">（任意）</span>
                                          </div>
                                          <select
                                            value={typeof item === 'string' ? '' : item.closingDay || ''}
                                            onChange={(e)=>updateItemField(sec.key, idx, 'closingDay', e.target.value)}
                                            className="w-full p-2.5 border border-slate-300 rounded-xl text-sm md:text-base font-bold bg-white"
                                          >
                                            <option value="">未設定</option>
                                            {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                                              <option key={day} value={String(day)}>{day}日締め</option>
                                            ))}
                                            <option value="末日">末日締め</option>
                                          </select>
                                        </div>
                                      </div>
                                    ) : sec.isLeaseMaster ? (
                                      <div className="space-y-2">
                                        <select
                                          value={item.vendor || ''}
                                          onChange={(e)=>updateItemField(sec.key, idx, 'vendor', e.target.value)}
                                          className="w-full p-2.5 border border-slate-300 rounded-xl text-sm md:text-base font-bold bg-white"
                                        >
                                          <option value="">業者未設定</option>
                                          {(settings.ishikawaLeaseVendors || []).map((vendor:any, vendorIdx:number) => (
                                            <option key={`${vendor.name || ''}_${vendorIdx}`} value={vendor.name || ''}>{vendor.name || ''}</option>
                                          ))}
                                        </select>
                                        <input type="text" value={item.name || ''} onChange={(e)=>updateItemField(sec.key, idx, 'name', e.target.value)} placeholder="名称" className="w-full p-2.5 border border-slate-300 rounded-xl text-sm md:text-base font-bold bg-white" />
                                      </div>
                                    ) : sec.isNoPrice ? (
                                      <input type="text" value={item.name || ''} onChange={(e)=>updateItemField(sec.key, idx, 'name', e.target.value)} placeholder="名称" className="w-full p-2.5 border border-slate-300 rounded-xl text-sm md:text-base font-bold bg-white" />
                                    ) : (
                                      <input type="text" value={item.name || ''} onChange={(e)=>updateItemField(sec.key, idx, 'name', e.target.value)} placeholder="名称" className="w-full p-2.5 border border-slate-300 rounded-xl text-sm md:text-base font-bold bg-white" />
                                    )}

                                    {sec.key === 'workers' && (
                                      <div className="rounded-xl border border-slate-200 bg-white p-3">
                                        <div className="text-xs font-bold text-slate-500 mb-2">所定勤務時間</div>
                                        <div className="grid grid-cols-2 gap-2">
                                          {[8, 7].map((hours) => (
                                            <label
                                              key={hours}
                                              className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border-2 cursor-pointer text-sm font-bold transition ${
                                                Number(item.shiftHours || 8) === hours
                                                  ? 'bg-blue-50 border-blue-500 text-blue-700'
                                                  : 'bg-slate-50 border-slate-200 text-slate-700'
                                              }`}
                                            >
                                              <input
                                                type="radio"
                                                name={`worker-shift-${idx}`}
                                                value={hours}
                                                checked={Number(item.shiftHours || 8) === hours}
                                                onChange={() => updateItemField(sec.key, idx, 'shiftHours', hours)}
                                                className="accent-blue-600"
                                              />
                                              {hours}時間勤務
                                            </label>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {sec.key === 'workers' && (
                                      <label className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition ${
                                        item.isWeeklyPay
                                          ? 'bg-orange-50 border-orange-300 text-orange-900'
                                          : 'bg-white border-slate-200 text-slate-700'
                                      }`}>
                                        <input
                                          type="checkbox"
                                          checked={!!item.isWeeklyPay}
                                          onChange={(e) => updateItemField(sec.key, idx, 'isWeeklyPay', e.target.checked)}
                                          className="w-5 h-5 accent-orange-600"
                                        />
                                        <div>
                                          <div className="text-sm font-bold">週払い対象</div>
                                          <div className="text-xs text-slate-500 mt-0.5">チェックした作業員は勤怠表に「週払い」と表示</div>
                                        </div>
                                      </label>
                                    )}

                                    {sec.key === 'workers' && (
                                      <div className="rounded-xl border border-slate-200 bg-white p-3">
                                        <div className="text-xs font-bold text-slate-500 mb-2">会社カレンダー</div>
                                        <select
                                          value={item.calendarType || 'none'}
                                          onChange={(e) => {
                                            const value = e.target.value;

                                            setSettings((prev: any) => {
                                              const list = Array.isArray(prev?.[sec.key]) ? [...prev[sec.key]] : [];
                                              const current = { ...(list[idx] || {}) };

                                              current.calendarType = value;

                                              if (value === 'yamato') {
                                                current.shiftHours = 8;
                                              } else if (value === 'trainee') {
                                                current.shiftHours = 7;
                                              }

                                              list[idx] = current;

                                              return {
                                                ...prev,
                                                [sec.key]: list
                                              };
                                            });
                                          }}
                                          className="w-full p-2.5 rounded-xl border-2 border-slate-300 bg-white text-sm font-bold"
                                        >
                                          <option value="yamato">① 大和社員</option>
                                          <option value="trainee">② 実習生</option>
                                          <option value="none">③ 該当なし</option>
                                        </select>
                                      </div>
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
                );
                const ishikawaSections = masterSections.filter((sec: any) => sec.isIshikawa);
                const standardSections = masterSections.filter((sec: any) => !sec.isIshikawa);

                return (
                  <>
                    <section id="master-ishikawa-group" className="mb-6 scroll-mt-6 rounded-3xl border-2 border-indigo-300 bg-indigo-50/70 p-4 md:p-5 shadow-sm space-y-4">
                      <div className="flex justify-between items-start gap-3 pb-3 border-b border-indigo-200">
                        <div>
                          <div className="text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-white border border-indigo-200 text-indigo-700 inline-flex mb-1.5">石川県専用</div>
                          <h3 className="text-lg md:text-xl font-extrabold text-indigo-950">🗾 石川県用リースマスタ</h3>
                          <p className="text-xs md:text-sm text-indigo-700 mt-1">リース業者 → カテゴリー → 名称 → 日額単価の順で、徳本の石川県出張用リースをまとめて登録します。</p>
                          <p className="text-xs text-slate-500 mt-1.5">※保存先は従来どおり「石川県用 重機・アタッチメント・その他機械」のままです。既存データもそのまま使用します。</p>
                        </div>
                        <button
                          type="button"
                          onClick={saveUnifiedIshikawaLeaseMaster}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3.5 py-2 rounded-lg font-bold shadow-sm transition shrink-0"
                        >
                          💾 保存
                        </button>
                      </div>

                      <div id="master-ishikawaLeaseVendors" className="scroll-mt-6 rounded-2xl border border-indigo-200 bg-white p-3.5">
                        <div className="flex items-center justify-between gap-3 mb-3">
                          <div>
                            <div className="font-extrabold text-sm text-slate-800">🏢 石川県用リース業者登録</div>
                            <div className="text-xs text-slate-500 mt-0.5">ここで業者を登録すると、下の石川県用リースマスタですぐ選択できます。</div>
                          </div>
                          <div className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg px-2.5 py-1.5 whitespace-nowrap">登録済み {(settings.ishikawaLeaseVendors || []).length} 社</div>
                        </div>
                        <div className="grid grid-cols-[1fr_110px] gap-2 mb-3">
                          <input
                            type="text"
                            placeholder="石川県用リース業者名（例：ヒサヤス）"
                            value={form.ishikawaLeaseVendorName || ''}
                            onChange={(e)=>setForm({...form, ishikawaLeaseVendorName: e.target.value})}
                            className="w-full p-2.5 border border-indigo-300 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none font-medium"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const name = String(form.ishikawaLeaseVendorName || '').trim();
                              if (!name) return alert('石川県用リース業者名を入力してください。');
                              if ((settings.ishikawaLeaseVendors || []).some((v:any) => String(v?.name || '').trim() === name)) return alert('同じ石川県用リース業者がすでに登録されています。');
                              addMaster('ishikawaLeaseVendors', { name }, ['ishikawaLeaseVendorName']);
                            }}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-sm transition"
                          >
                            ＋ 追加
                          </button>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                          {(settings.ishikawaLeaseVendors || []).length === 0 ? (
                            <div className="lg:col-span-2 rounded-xl border border-dashed border-indigo-300 bg-indigo-50/40 px-4 py-3 text-sm text-slate-500 text-center">石川県用リース業者はまだ登録されていません。</div>
                          ) : (settings.ishikawaLeaseVendors || []).map((vendor:any, vendorIdx:number) => (
                            <div key={`${vendor.name || ''}_${vendorIdx}`} className="flex items-center gap-2 p-2 rounded-xl border border-indigo-200 bg-indigo-50/30">
                              <input
                                type="text"
                                value={vendor.name || ''}
                                onChange={(e)=>updateItemField('ishikawaLeaseVendors', vendorIdx, 'name', e.target.value)}
                                className="flex-1 min-w-0 p-2 border border-slate-300 rounded-lg text-sm font-bold bg-white"
                              />
                              <button type="button" onClick={() => deleteMaster('ishikawaLeaseVendors', vendorIdx)} className="text-rose-700 hover:text-white font-bold text-xs px-2.5 py-2 bg-rose-50 hover:bg-rose-600 border border-rose-200 rounded-lg transition whitespace-nowrap">🗑 削除</button>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="bg-white p-3.5 rounded-2xl border-2 border-dashed border-indigo-300">
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-3">
                          <span className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">＋</span>
                          石川県用リース品を新規追加
                        </div>
                        <div className="grid grid-cols-[1.15fr_1fr_1.35fr_0.75fr_110px] gap-2.5 items-end">
                          <label className="text-xs font-bold text-slate-600">リース業者
                            <select value={form.unifiedIshikawaLeaseVendor || ''} onChange={(e)=>setForm({...form, unifiedIshikawaLeaseVendor: e.target.value})} className="mt-1 w-full p-2.5 border border-slate-300 rounded-xl text-sm bg-slate-50 font-bold">
                              <option value="">リース業者を選択</option>
                              {(settings.ishikawaLeaseVendors || []).map((vendor:any, vendorIdx:number) => (
                                <option key={`${vendor.name || ''}_${vendorIdx}`} value={vendor.name || ''}>{vendor.name || ''}</option>
                              ))}
                            </select>
                          </label>
                          <label className="text-xs font-bold text-slate-600">カテゴリー
                            <select value={form.unifiedIshikawaLeaseCategory || 'ishikawaHeavy'} onChange={(e)=>setForm({...form, unifiedIshikawaLeaseCategory: e.target.value})} className="mt-1 w-full p-2.5 border border-slate-300 rounded-xl text-sm bg-slate-50 font-bold">
                              <option value="ishikawaHeavy">重機</option>
                              <option value="ishikawaAttach">アタッチメント</option>
                              <option value="ishikawaOther">その他の機械・機器</option>
                            </select>
                          </label>
                          <label className="text-xs font-bold text-slate-600">名称
                            <input type="text" value={form.unifiedIshikawaLeaseName || ''} onChange={(e)=>setForm({...form, unifiedIshikawaLeaseName: e.target.value})} placeholder="名称" className="mt-1 w-full p-2.5 border border-slate-300 rounded-xl text-sm bg-slate-50 font-medium" />
                          </label>
                          <label className="text-xs font-bold text-slate-600">日額単価
                            <input type="number" value={form.unifiedIshikawaLeasePrice || ''} onChange={(e)=>setForm({...form, unifiedIshikawaLeasePrice: e.target.value})} placeholder="日額" className="mt-1 w-full p-2.5 border border-slate-300 rounded-xl text-sm bg-slate-50 font-medium text-right" />
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              const vendor = String(form.unifiedIshikawaLeaseVendor || '').trim();
                              const category = String(form.unifiedIshikawaLeaseCategory || 'ishikawaHeavy');
                              const name = String(form.unifiedIshikawaLeaseName || '').trim();
                              if (!vendor) return alert('リース業者を選択してください。');
                              if (!name) return alert('名称を入力してください。');
                              addMaster(category, { name, price: Number(form.unifiedIshikawaLeasePrice) || 0, vendor, isFinished: false }, ['unifiedIshikawaLeaseVendor', 'unifiedIshikawaLeaseName', 'unifiedIshikawaLeasePrice']);
                            }}
                            className="h-[42px] bg-indigo-600 hover:bg-indigo-700 text-white px-4 rounded-xl font-bold text-sm shadow-sm transition text-center whitespace-nowrap"
                          >
                            ＋ 追加
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between px-1">
                          <div className="text-sm font-bold text-slate-700">✏️ 登録済み石川県用リース（直接編集できます）</div>
                          <div className="text-xs text-slate-400">変更後は右上の「💾 保存」</div>
                        </div>
                        <div className="max-h-[520px] overflow-y-auto bg-white border border-indigo-200 rounded-2xl p-3 space-y-3">
                          {[
                            ...(settings.ishikawaHeavy || []).map((item:any, idx:number) => ({ item, idx, key: 'ishikawaHeavy', categoryLabel: '重機' })),
                            ...(settings.ishikawaAttach || []).map((item:any, idx:number) => ({ item, idx, key: 'ishikawaAttach', categoryLabel: 'アタッチメント' })),
                            ...(settings.ishikawaOther || []).map((item:any, idx:number) => ({ item, idx, key: 'ishikawaOther', categoryLabel: 'その他の機械・機器' }))
                          ].map((row:any) => (
                            <div id={`master-${row.key}`} key={`${row.key}_${row.idx}`} className="scroll-mt-6 grid grid-cols-[120px_1.1fr_1.35fr_0.75fr_78px] gap-2 items-center p-2.5 rounded-xl border border-indigo-200 bg-indigo-50/30">
                              <span className="text-xs font-extrabold px-2.5 py-1.5 rounded-lg bg-indigo-100 text-indigo-800 text-center whitespace-nowrap">{row.categoryLabel}</span>
                              <select value={row.item.vendor || ''} onChange={(e)=>updateItemField(row.key, row.idx, 'vendor', e.target.value)} className="w-full min-w-0 p-2.5 border border-slate-300 rounded-xl text-sm font-bold bg-white">
                                <option value="">業者未設定</option>
                                {(settings.ishikawaLeaseVendors || []).map((vendor:any, vendorIdx:number) => (
                                  <option key={`${vendor.name || ''}_${vendorIdx}`} value={vendor.name || ''}>{vendor.name || ''}</option>
                                ))}
                              </select>
                              <input type="text" value={row.item.name || ''} onChange={(e)=>updateItemField(row.key, row.idx, 'name', e.target.value)} placeholder="名称" className="w-full min-w-0 p-2.5 border border-slate-300 rounded-xl text-sm font-bold bg-white" />
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="text-slate-500 font-bold text-sm">¥</span>
                                <input type="number" value={row.item.price || 0} onChange={(e)=>updateItemField(row.key, row.idx, 'price', e.target.value)} className="w-full min-w-0 p-2.5 border border-slate-300 rounded-xl text-right text-sm font-bold bg-white" placeholder="日額" />
                              </div>
                              <button type="button" onClick={() => deleteMaster(row.key, row.idx)} className="text-rose-700 hover:text-white font-bold text-xs px-2 py-2.5 bg-rose-50 hover:bg-rose-600 border border-rose-200 rounded-lg transition whitespace-nowrap">🗑 削除</button>
                            </div>
                          ))}
                          {(settings.ishikawaHeavy || []).length + (settings.ishikawaAttach || []).length + (settings.ishikawaOther || []).length === 0 && (
                            <p className="text-sm text-slate-400 text-center py-4">登録データがありません</p>
                          )}
                        </div>
                      </div>
                    </section>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
                      {standardSections.map((sec: any, idx: number) => renderMasterSection(sec, idx))}
                    </div>
                  </>
                );
              })()}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 送信された日報一覧（カレンダー＆現場別リスト） */}
      <div className={`${authRole === 'viewer' && viewerSection !== 'reports' ? 'hidden' : ''} bg-white p-4 md:p-8 rounded-2xl md:rounded-3xl shadow-sm border border-slate-100 space-y-6`}>
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

                                <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 border border-violet-200 px-2.5 py-1 text-xs md:text-sm font-extrabold text-violet-700">📨 報告者: {r.reporter || r.data?.reporter || '未記録'}</span>
                              </div>

                              <div className={`p-3.5 rounded-xl border whitespace-pre-wrap ${
                                (r.officeMessage || r.data?.officeMessage)
                                  ? 'bg-orange-50 border-orange-300'
                                  : 'bg-slate-50 border-slate-200'
                              }`}>
                                <div className={`text-xs md:text-sm mb-1 ${
                                  (r.officeMessage || r.data?.officeMessage)
                                    ? 'text-orange-700'
                                    : 'text-slate-400'
                                }`}>
                                  📢 事務所への報告・相談
                                </div>
                                <div className={`text-sm md:text-base font-medium ${
                                  (r.officeMessage || r.data?.officeMessage)
                                    ? 'text-slate-900'
                                    : 'text-slate-400'
                                }`}>
                                  {(r.officeMessage || r.data?.officeMessage) || 'なし'}
                                </div>
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
                                {leaseHeavy.length > 0 && <div>🔸 <b>通常リース重機:</b> {leaseHeavy.map(formatLeaseSelectionLabel).join(', ')}</div>}
                                {leaseAttach.length > 0 && <div>🔸 <b>通常リースアタッチメント:</b> {leaseAttach.map(formatLeaseSelectionLabel).join(', ')}</div>}
                                {leaseOther.length > 0 && <div>🔸 <b>通常リースその他機器:</b> {leaseOther.map(formatLeaseSelectionLabel).join(', ')}</div>}
                                {ishikawaHeavy.length > 0 && <div>🗾 <b>石川重機:</b> {ishikawaHeavy.map(formatLeaseSelectionLabel).join(', ')}</div>}
                                {ishikawaAttach.length > 0 && <div>🗾 <b>石川アタッチメント:</b> {ishikawaAttach.map(formatLeaseSelectionLabel).join(', ')}</div>}
                                {ishikawaOther.length > 0 && <div>🗾 <b>石川その他機器:</b> {ishikawaOther.map(formatLeaseSelectionLabel).join(', ')}</div>}
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
                                    <div className="text-sm text-emerald-700 font-bold">
                                      ♻️ スクラップ: {scraps.map((sc: any) => `${sc.location || 'その他'} (${sc.item || '品目未指定'}: ${sc.quantity || 0}${sc.unit || 'kg'})`).join(', ')}
                                    </div>
                                  )}
                                </div>
                              )}

                              {r.workDescription && (
                                <div className="text-sm md:text-base text-slate-700 font-medium bg-slate-50 p-3 rounded-xl border border-slate-200 whitespace-pre-wrap">
                                  <div className="text-xs text-slate-500 mb-1">📝 本日の作業内容</div>
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

                                <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 border border-violet-200 px-2.5 py-1 text-xs md:text-sm font-extrabold text-violet-700">📨 報告者: {r.reporter || r.data?.reporter || '未記録'}</span>
                              </div>

                              <div className={`p-3.5 rounded-xl border whitespace-pre-wrap ${
                                (r.officeMessage || r.data?.officeMessage)
                                  ? 'bg-orange-50 border-orange-300'
                                  : 'bg-slate-50 border-slate-200'
                              }`}>
                                <div className={`text-xs md:text-sm mb-1 ${
                                  (r.officeMessage || r.data?.officeMessage)
                                    ? 'text-orange-700'
                                    : 'text-slate-400'
                                }`}>
                                  📢 事務所への報告・相談
                                </div>
                                <div className={`text-sm md:text-base font-medium ${
                                  (r.officeMessage || r.data?.officeMessage)
                                    ? 'text-slate-900'
                                    : 'text-slate-400'
                                }`}>
                                  {(r.officeMessage || r.data?.officeMessage) || 'なし'}
                                </div>
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
                                {leaseHeavy.length > 0 && <div>🔸 <b>通常リース重機:</b> {leaseHeavy.map(formatLeaseSelectionLabel).join(', ')}</div>}
                                {leaseAttach.length > 0 && <div>🔸 <b>通常リースアタッチメント:</b> {leaseAttach.map(formatLeaseSelectionLabel).join(', ')}</div>}
                                {leaseOther.length > 0 && <div>🔸 <b>通常リースその他機器:</b> {leaseOther.map(formatLeaseSelectionLabel).join(', ')}</div>}
                                {ishikawaHeavy.length > 0 && <div>🗾 <b>石川重機:</b> {ishikawaHeavy.map(formatLeaseSelectionLabel).join(', ')}</div>}
                                {ishikawaAttach.length > 0 && <div>🗾 <b>石川アタッチメント:</b> {ishikawaAttach.map(formatLeaseSelectionLabel).join(', ')}</div>}
                                {ishikawaOther.length > 0 && <div>🗾 <b>石川その他機器:</b> {ishikawaOther.map(formatLeaseSelectionLabel).join(', ')}</div>}
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
                                    <div className="text-sm text-emerald-700 font-bold">
                                      ♻️ スクラップ: {scraps.map((sc: any) => `${sc.location || 'その他'} (${sc.item || '品目未指定'}: ${sc.quantity || 0}${sc.unit || 'kg'})`).join(', ')}
                                    </div>
                                  )}
                                </div>
                              )}

                              {r.workDescription && (
                                <div className="text-sm md:text-base text-slate-700 font-medium bg-slate-50 p-3 rounded-xl border border-slate-200 whitespace-pre-wrap">
                                  <div className="text-xs text-slate-500 mb-1">📝 本日の作業内容</div>
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
          <div className="bg-white rounded-[32px] w-full max-w-4xl p-6 md:p-10 !pb-0 max-h-[92vh] overflow-y-auto space-y-6 shadow-2xl border border-slate-100" onClick={(e) => e.stopPropagation()}>
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

                        <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 border border-violet-200 px-2.5 py-1 text-xs md:text-sm font-extrabold text-violet-700">📨 報告者: {r.reporter || r.data?.reporter || '未記録'}</span>
                      </div>

                      <div className={`p-3.5 rounded-xl border whitespace-pre-wrap ${
                        (r.officeMessage || r.data?.officeMessage)
                          ? 'bg-orange-50 border-orange-300'
                          : 'bg-slate-50 border-slate-200'
                      }`}>
                        <div className={`text-xs md:text-sm mb-1 ${
                          (r.officeMessage || r.data?.officeMessage)
                            ? 'text-orange-700'
                            : 'text-slate-400'
                        }`}>
                          📢 事務所への報告・相談
                        </div>
                        <div className={`text-sm md:text-base font-medium ${
                          (r.officeMessage || r.data?.officeMessage)
                            ? 'text-slate-900'
                            : 'text-slate-400'
                        }`}>
                          {(r.officeMessage || r.data?.officeMessage) || 'なし'}
                        </div>
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
                        {leaseHeavy.length > 0 && <div>🔸 <b>通常リース重機:</b> {leaseHeavy.map(formatLeaseSelectionLabel).join(', ')}</div>}
                        {leaseAttach.length > 0 && <div>🔸 <b>通常リースアタッチメント:</b> {leaseAttach.map(formatLeaseSelectionLabel).join(', ')}</div>}
                        {leaseOther.length > 0 && <div>🔸 <b>通常リースその他機器:</b> {leaseOther.map(formatLeaseSelectionLabel).join(', ')}</div>}
                        {ishikawaHeavy.length > 0 && <div>🗾 <b>石川重機:</b> {ishikawaHeavy.map(formatLeaseSelectionLabel).join(', ')}</div>}
                        {ishikawaAttach.length > 0 && <div>🗾 <b>石川アタッチメント:</b> {ishikawaAttach.map(formatLeaseSelectionLabel).join(', ')}</div>}
                        {ishikawaOther.length > 0 && <div>🗾 <b>石川その他機器:</b> {ishikawaOther.map(formatLeaseSelectionLabel).join(', ')}</div>}
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
                            <div className="text-sm text-emerald-700 font-bold">
                              ♻️ スクラップ: {scraps.map((sc: any) => `${sc.location || 'その他'} (${sc.item || '品目未指定'}: ${sc.quantity || 0}${sc.unit || 'kg'})`).join(', ')}
                            </div>
                          )}
                        </div>
                      )}

                      {r.workDescription && (
                        <div className="text-sm md:text-base text-slate-700 font-medium bg-white p-3.5 rounded-xl border border-slate-200 whitespace-pre-wrap">
                          <div className="text-xs text-slate-500 mb-1">📝 本日の作業内容</div>
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

            <div className="-mx-6 md:-mx-10 px-6 md:px-10 py-4 bg-white border-t border-slate-200 flex justify-end">
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
          <div className="bg-white rounded-[28px] w-full max-w-7xl p-4 md:p-7 !pb-0 max-h-[94vh] overflow-y-auto space-y-5 shadow-2xl border border-slate-100" onClick={(e) => e.stopPropagation()}>
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
                                    <div className="text-[11px] font-bold text-blue-600">原価反映額 合計</div>
                                    <div className="font-extrabold text-blue-700">{formatAmount(confirmedMonthlyTotal)}</div>
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
                              「日報由来」＝通常の経費額　／　「確定額」＝日報由来が間違っている時だけ入力。入力した行は確定額を原価に優先します。
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
                                        : '';

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
                                                        ? 'bg-slate-500 text-white border-slate-700'
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

            <div className="sticky bottom-0 z-20 -mx-4 md:-mx-7 px-4 md:px-7 py-4 bg-white/95 backdrop-blur-sm border-t border-slate-200 flex items-center justify-end gap-3">
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
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white'
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

      {/* 全現場：スクラップ確認表 */}
      {showAllMonthlyScrapModal && authRole === 'admin' && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-md flex items-center justify-center p-2 md:p-6 z-50 animate-fadeIn"
          onClick={() => setShowAllMonthlyScrapModal(false)}
        >
          <div
            className="bg-white rounded-[28px] w-full max-w-7xl p-4 md:p-7 !pb-0 max-h-[94vh] overflow-y-auto space-y-5 shadow-2xl border border-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-xl md:text-2xl font-bold text-slate-900">
                  ♻️ スクラップ確認表（全現場・スクラップ場別）
                </h3>
                <p className="text-sm md:text-base text-slate-600 mt-1.5 leading-relaxed">
                  各現場の日報で登録されたスクラップ搬出を、スクラップ場・月ごとにまとめて確認します。
                </p>
                <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm md:text-base text-emerald-900 font-bold leading-relaxed">
                  💰 売却明細・計量票と照らし合わせて、各日の売却金額を入力してください。<br />
                  「売却金額」は各現場の「詳細分析 → スクラップ搬出明細」と連動します。仕切り書の月合計も同じ画面間で共有されます。<br />
                  日付をクリックすると「✓ 確認済」にできます。<br />
                  <span className="text-emerald-700">
                    金額や確認済み状態を変更したら、最後に「💾 保存」を押してください。
                  </span>
                </div>
              </div>

              <button
                onClick={() => setShowAllMonthlyScrapModal(false)}
                className="shrink-0 w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-lg transition"
              >
                ✕
              </button>
            </div>

            <div className="space-y-8">
              {(() => {
                const groupedData = getAllMonthlyScrapGroupedData();
                const scrapSites = Object.keys(groupedData);

                if (scrapSites.length === 0) {
                  return (
                    <p className="text-base text-slate-500 text-center py-8">
                      スクラップ搬出データはありません
                    </p>
                  );
                }

                return scrapSites.map((scrapSite) => (
                  <section key={scrapSite} className="space-y-4">
                    <div className="sticky top-0 z-10 bg-emerald-800 text-white px-4 py-3 rounded-2xl shadow-sm">
                      <div className="font-extrabold text-lg">♻️ {scrapSite}</div>
                    </div>

                    {Object.entries(groupedData[scrapSite])
                      .sort(([a], [b]) => b.localeCompare(a))
                      .map(([ym, items]: any) => {
                        const [y, m] = ym.split('-');
                        const monthlyQuantityByUnit: { [unit: string]: number } = {};
                        items.forEach((it: any) => {
                          monthlyQuantityByUnit[it.unit] =
                            (monthlyQuantityByUnit[it.unit] || 0) + Number(it.quantity || 0);
                        });

                        const monthlySaleTotal = items.reduce(
                          (sum: number, it: any) => sum + Number(it.saleAmount || 0),
                          0
                        );

                        const projectMonthlyGroups: any = {};
                        items.forEach((it: any) => {
                          if (!projectMonthlyGroups[it.canonicalLocation]) {
                            projectMonthlyGroups[it.canonicalLocation] = {
                              statementKey: it.statementKey,
                              rowTotal: 0
                            };
                          }
                          projectMonthlyGroups[it.canonicalLocation].rowTotal += Number(it.saleAmount || 0);
                        });

                        return (
                          <div
                            key={ym}
                            className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-2xs"
                          >
                            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                              <div className="space-y-2">
                                <div className="font-extrabold text-lg text-slate-900">
                                  📅 {y}年{Number(m)}月
                                </div>
                                <div className="flex items-center gap-2">
                                  <label className="text-xs md:text-sm font-extrabold text-emerald-700 whitespace-nowrap">
                                    🧾 仕切った日
                                  </label>
                                  <input
                                    type="date"
                                    value={scrapSettlementDates[`${scrapSite}__${ym}`] ?? ''}
                                    onChange={(e) => {
                                      const dateKey = `${scrapSite}__${ym}`;
                                      setScrapSettlementDates((prev) => ({
                                        ...prev,
                                        [dateKey]: e.target.value
                                      }));
                                      setFinancialDirty(true);
                                    }}
                                    className="bg-white text-slate-900 border border-emerald-300 rounded-lg px-2.5 py-1.5 text-sm font-bold"
                                  />
                                </div>
                              </div>

                              <div className="flex flex-wrap gap-2 md:gap-3">
                                <div className="rounded-xl bg-white border border-slate-200 px-3 py-2">
                                  <div className="text-xs font-bold text-slate-500">月の総数量</div>
                                  <div className="font-extrabold text-slate-900 mt-0.5">
                                    {Object.entries(monthlyQuantityByUnit).map(([unit, qty], idx) => (
                                      <span key={unit}>
                                        {idx > 0 && ' / '}
                                        {Number(qty).toLocaleString('ja-JP')} {unit}
                                      </span>
                                    ))}
                                  </div>
                                </div>

                                <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2">
                                  <div className="text-xs font-bold text-emerald-700">売却額 合計</div>
                                  <div className="font-extrabold text-emerald-900 mt-0.5">
                                    {formatAmount(monthlySaleTotal)}
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="px-4 py-3 bg-emerald-50/50 border-b border-emerald-100 space-y-2">
                              <div className="text-xs md:text-sm font-extrabold text-emerald-900">
                                📄 仕切り書 月合計（現場別）
                              </div>
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                                {Object.entries(projectMonthlyGroups).map(([projectName, projectData]: any) => (
                                  <div
                                    key={projectName}
                                    className="bg-white rounded-xl border border-emerald-200 p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                                  >
                                    <div className="min-w-0">
                                      <div className="font-bold text-sm text-slate-800 truncate">
                                        {projectName}
                                      </div>
                                      <div className="text-xs text-slate-500 mt-0.5">
                                        日別入力合計 {formatAmount(projectData.rowTotal || 0)}
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0">
                                      <span className="font-bold text-emerald-700">¥</span>
                                      <input
                                        type="number"
                                        value={monthlyScrapStatementTotals[projectData.statementKey] ?? ''}
                                        onChange={(e) =>
                                          handleMonthlyScrapStatementTotalChange(
                                            projectData.statementKey,
                                            e.target.value
                                          )
                                        }
                                        placeholder={String(Number(projectData.rowTotal || 0))}
                                        className="w-36 p-2 border border-emerald-300 rounded-lg text-right font-extrabold bg-white text-emerald-900"
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="overflow-x-auto">
                              <table className="w-full min-w-[980px] text-left border-collapse text-base">
                                <thead>
                                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-extrabold">
                                    <th className="py-3 px-3">日付</th>
                                    <th className="py-3 px-3">現場名</th>
                                    <th className="py-3 px-3">品目</th>
                                    <th className="py-3 px-3 text-right">数量</th>
                                    <th className="py-3 px-3 text-right">売却金額</th>
                                  </tr>
                                </thead>

                                <tbody className="divide-y divide-slate-200">
                                  {items.map((it: any) => {
                                    const isChecked = !!checkedScrapRows[it.rowKey];
                                    const displayAmount =
                                      it.saleOverride !== '' && it.saleOverride !== undefined
                                        ? it.saleOverride
                                        : '';

                                    return (
                                      <tr
                                        key={it.rowKey}
                                        className={
                                          "transition " +
                                          (isChecked
                                            ? "bg-emerald-100/80 text-slate-500"
                                            : "bg-white hover:bg-emerald-50")
                                        }
                                      >
                                        <td className="py-3 px-3 align-top">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setCheckedScrapRows((prev) => ({
                                                ...prev,
                                                [it.rowKey]: !prev[it.rowKey]
                                              }));
                                              setFinancialDirty(true);
                                            }}
                                            className={
                                              "font-extrabold rounded-lg px-2 py-1 inline-block " +
                                              (isChecked
                                                ? "bg-emerald-200 text-emerald-900"
                                                : "bg-slate-100 text-slate-800 hover:bg-emerald-100")
                                            }
                                          >
                                            {it.formattedDate || '-'}
                                          </button>
                                          {isChecked && (
                                            <div className="text-[11px] font-extrabold text-emerald-700 mt-1">
                                              ✓ 確認済
                                            </div>
                                          )}
                                        </td>

                                        <td className="py-3 px-3 font-bold max-w-[360px] align-top">
                                          {it.locationName}
                                        </td>

                                        <td className="py-3 px-3 font-bold align-top">
                                          {it.item}
                                        </td>

                                        <td className="py-3 px-3 text-right font-bold align-top">
                                          {Number(it.quantity || 0).toLocaleString('ja-JP')} {it.unit}
                                        </td>

                                        <td className="py-3 px-3 text-right align-top">
                                          <div className="flex items-center justify-end gap-1">
                                            <span className="text-emerald-600 font-bold">¥</span>
                                            <input
                                              type="number"
                                              value={displayAmount}
                                              onChange={(e) =>
                                                handleScrapRowOverrideChange(
                                                  it.rowKey,
                                                  e.target.value
                                                )
                                              }
                                              placeholder="売却額"
                                              className="w-36 p-2.5 border border-emerald-300 rounded-lg text-right font-extrabold bg-emerald-50/40 text-emerald-900 text-base"
                                            />
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>

                            <div className="px-4 py-2 text-[11px] text-slate-400 bg-white border-t border-slate-100">
                              💡 日付ボタンを押すと「確認済み」の状態を保存できます。
                            </div>
                          </div>
                        );
                      })}
                  </section>
                ));
              })()}
            </div>

            <div className="sticky bottom-0 z-20 -mx-4 md:-mx-7 px-4 md:px-7 py-4 bg-white/95 backdrop-blur-sm border-t border-slate-200 flex items-center justify-end gap-3">
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
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  }`}
                >
                  {isFinancialSaving ? '保存中…' : '💾 保存'}
                </button>
              </div>

              <button
                onClick={() => setShowAllMonthlyScrapModal(false)}
                className="bg-slate-800 hover:bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold text-base transition"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}


      {/* 社長モード専用：工程表優先UI（試験版・保存なし） */}
      {showTrialSchedule && authRole === 'viewer' && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-1 md:p-2 z-[85]"
          onClick={() => setShowTrialSchedule(false)}
        >
          <div
            className="bg-white rounded-2xl md:rounded-[26px] w-full max-w-[1600px] h-[98vh] overflow-hidden shadow-2xl border border-slate-200 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 超コンパクトヘッダー */}
            <div className="px-3 md:px-5 py-2.5 md:py-3 bg-white border-b border-slate-200 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-xl md:text-2xl shrink-0">
                  📅
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-xl md:text-3xl font-black text-slate-950">工程表</h3>
                    <span className="rounded-full bg-orange-100 text-orange-700 px-2.5 py-1 text-[11px] md:text-xs font-black">
                      👑 社長モード
                    </span>
                    <span className="rounded-full bg-amber-100 text-amber-800 px-2.5 py-1 text-[11px] font-black">
                      試験版
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowTrialSchedule(false)}
                  className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-black shrink-0"
                >
                  ✕
                </button>
              </div>

              {/* 現場・月・追加を1段に圧縮 */}
              <div className="mt-2.5 grid grid-cols-1 lg:grid-cols-[1fr_190px_170px] gap-2">
                <select
                  value={trialScheduleLocation}
                  onChange={(e) => {
                    setTrialScheduleLocation(e.target.value);
                    setTrialScheduleTasks([]);
                  }}
                  className="w-full p-2.5 md:p-3 rounded-xl border-2 border-slate-200 bg-slate-50 text-sm md:text-lg font-black"
                >
                  <option value="">現場を選択してください</option>
                  {(settings.locations || [])
                    .filter((loc: any) => typeof loc === 'string' ? true : !loc?.isFinished)
                    .map((loc: any) => {
                      const name = typeof loc === 'string' ? loc : loc.name;
                      return <option key={name} value={name}>{name}</option>;
                    })}
                </select>

                <input
                  type="month"
                  value={trialScheduleMonth}
                  onChange={(e) => setTrialScheduleMonth(e.target.value)}
                  className="w-full p-2.5 md:p-3 rounded-xl border-2 border-slate-200 bg-slate-50 text-sm md:text-lg font-black"
                />

                <button
                  type="button"
                  onClick={addTrialScheduleTask}
                  disabled={!trialScheduleLocation}
                  className={`rounded-xl px-4 py-2.5 md:py-3 text-base md:text-lg font-black transition ${
                    trialScheduleLocation
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  ＋ 工程追加
                </button>
              </div>

              {/* 配置物は1本の横スクロールバーに集約 */}
              {trialScheduleLocation && (() => {
                const catalog = getTrialResourceCatalog();
                const allResources = [
                  ...catalog.workers.map((x: any) => ({ ...x, groupLabel: '社員' })),
                  ...catalog.machines.map((x: any) => ({ ...x, groupLabel: '重機' })),
                  ...catalog.vehicles.map((x: any) => ({ ...x, groupLabel: '車両' })),
                  ...catalog.subcontractors.map((x: any) => ({ ...x, groupLabel: '外注' }))
                ];

                return (
                  <div className="mt-2.5 flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-200 p-2">
                    <div className="shrink-0 px-2">
                      <div className="text-xs md:text-sm font-black text-slate-700">配置</div>
                      <div className="text-[10px] text-slate-400 font-bold">工程へドラッグ</div>
                    </div>

                    <div className="flex gap-1.5 overflow-x-auto min-w-0 pb-0.5">
                      {allResources.length === 0 ? (
                        <span className="text-xs text-slate-400 font-bold py-2 px-3">マスタ登録なし</span>
                      ) : allResources.map((resource: any) => (
                        <button
                          key={resource.id}
                          type="button"
                          onPointerDown={(e) => startTrialResourceDrag(e, resource)}
                          style={{ touchAction: 'none' }}
                          className="shrink-0 rounded-lg bg-white border border-slate-200 hover:border-indigo-300 px-2.5 py-2 text-left cursor-grab active:cursor-grabbing select-none"
                          title="工程へドラッグ"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>{trialResourceIcon(resource.type)}</span>
                            <span className="text-xs md:text-sm font-black text-slate-900 max-w-[130px] truncate">
                              {resource.label}
                            </span>
                          </div>
                          <div className="text-[9px] md:text-[10px] text-slate-400 font-bold mt-0.5">
                            {resource.groupLabel}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* 工程表を最大化 */}
            <div className="flex-1 min-h-0 overflow-auto bg-slate-100">
              {!trialScheduleLocation ? (
                <div className="h-full flex items-center justify-center p-8">
                  <div className="text-center">
                    <div className="text-5xl mb-3">🏗️</div>
                    <div className="text-2xl md:text-3xl font-black text-slate-700">現場を選んでください</div>
                    <div className="text-sm md:text-base font-bold text-slate-400 mt-2">
                      選択すると工程表が大きく表示されます
                    </div>
                  </div>
                </div>
              ) : (() => {
                const days = trialMonthDays(trialScheduleMonth);
                const monthStart = `${trialScheduleMonth}-01`;
                const totalWidth = days.length * trialDayWidth;

                return (
                  <div className="min-w-max p-1.5 md:p-2">
                    <div className="rounded-xl md:rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
                      {/* 日付ヘッダー */}
                      <div className="sticky top-0 z-30 flex bg-white border-b-2 border-slate-200">
                        <div className="sticky left-0 z-40 w-[255px] md:w-[320px] shrink-0 bg-slate-900 text-white px-3 md:px-4 py-3 border-r border-slate-700">
                          <div className="text-base md:text-xl font-black">工程</div>
                          <div className="text-[10px] md:text-xs text-slate-300 font-bold mt-0.5">
                            バーを左右にドラッグ
                          </div>
                        </div>

                        <div className="flex" style={{ width: totalWidth }}>
                          {days.map((day: string) => {
                            const d = trialParseYmd(day)!;
                            const dow = d.getUTCDay();
                            const weekend =
                              dow === 0 ? 'bg-rose-50 text-rose-600'
                              : dow === 6 ? 'bg-blue-50 text-blue-600'
                              : 'bg-white text-slate-700';

                            return (
                              <div
                                key={day}
                                style={{ width: trialDayWidth }}
                                className={`shrink-0 border-r border-slate-200 py-2 text-center ${weekend}`}
                              >
                                <div className="text-[10px] md:text-xs font-black">
                                  {['日','月','火','水','木','金','土'][dow]}
                                </div>
                                <div className="text-base md:text-xl font-black">{Number(day.slice(-2))}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {trialScheduleTasks.length === 0 ? (
                        <div className="flex min-h-[380px]">
                          <div className="sticky left-0 z-20 w-[255px] md:w-[320px] shrink-0 bg-white border-r border-slate-200 p-5">
                            <div className="text-lg md:text-xl font-black text-slate-600">工程がありません</div>
                            <div className="text-xs md:text-sm font-bold text-slate-400 mt-2">
                              上の「＋工程追加」を押してください
                            </div>
                          </div>
                          <div style={{ width: totalWidth }} className="flex items-center justify-center text-slate-300">
                            <div className="text-center">
                              <div className="text-5xl mb-3">➕</div>
                              <div className="text-xl font-black">工程を追加してください</div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        trialScheduleTasks.map((task: any, taskIndex: number) => {
                          const left = trialDiffDays(monthStart, task.start) * trialDayWidth;
                          const duration = Math.max(1, trialDiffDays(task.start, task.end) + 1);
                          const barWidth = duration * trialDayWidth;
                          const resources = Array.isArray(task.resources) ? task.resources : [];

                          return (
                            <div
                              key={task.id}
                              data-trial-task-drop={task.id}
                              className={`flex min-h-[118px] border-b border-slate-200 transition ${
                                trialResourceDrag ? 'bg-indigo-50/40' : 'bg-white'
                              }`}
                            >
                              {/* 左工程カードをコンパクト化 */}
                              <div className="sticky left-0 z-20 w-[255px] md:w-[320px] shrink-0 bg-white border-r border-slate-200 p-2.5 md:p-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center font-black text-sm shrink-0">
                                    {taskIndex + 1}
                                  </div>

                                  <input
                                    type="text"
                                    value={task.name}
                                    onChange={(e) => patchTrialTask(task.id, { name: e.target.value })}
                                    className="min-w-0 flex-1 border-0 bg-transparent text-base md:text-xl font-black text-slate-950 focus:outline-none"
                                  />

                                  <button
                                    type="button"
                                    onClick={() => patchTrialTask(task.id, { completed: !task.completed })}
                                    className={`w-8 h-8 rounded-lg shrink-0 font-black ${
                                      task.completed ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-300'
                                    }`}
                                    title="完了"
                                  >
                                    {task.completed ? '✓' : '○'}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => setTrialScheduleTasks(prev => prev.filter(x => x.id !== task.id))}
                                    className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-rose-50 hover:text-rose-600 text-slate-400 font-black"
                                    title="削除"
                                  >
                                    ×
                                  </button>
                                </div>

                                <div className="mt-1.5 text-[11px] md:text-xs font-black text-slate-400">
                                  {task.start.slice(5).replace('-', '/')} ～ {task.end.slice(5).replace('-', '/')}
                                  <span className="ml-1">（{duration}日）</span>
                                </div>

                                {resources.length === 0 ? (
                                  <div className={`mt-2 rounded-lg border-2 border-dashed px-2 py-2 text-center text-[11px] md:text-xs font-black ${
                                    trialResourceDrag
                                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                      : 'border-slate-200 bg-slate-50 text-slate-300'
                                  }`}>
                                    {trialResourceDrag ? 'ここにドロップ' : '人・重機・車両・外注を配置'}
                                  </div>
                                ) : (
                                  <div className="mt-2 flex flex-wrap gap-1">
                                    {resources.map((r: any) => (
                                      <div key={r.id} className="inline-flex items-center rounded-lg bg-slate-100 border border-slate-200 overflow-hidden">
                                        <span className="px-1.5 py-1.5 text-[10px] md:text-xs font-black max-w-[110px] truncate">
                                          {trialResourceIcon(r.type)} {r.label}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => changeTrialResourceQty(task.id, r.id, -1)}
                                          className="w-6 h-7 bg-white text-slate-600 font-black"
                                        >
                                          −
                                        </button>
                                        <span className="min-w-[28px] text-center text-xs font-black">
                                          {Number(r.quantity || 1)}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => changeTrialResourceQty(task.id, r.id, 1)}
                                          className="w-6 h-7 bg-white text-slate-600 font-black"
                                        >
                                          ＋
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* タイムラインを主役に */}
                              <div
                                className="relative shrink-0"
                                style={{
                                  width: totalWidth,
                                  backgroundImage: `repeating-linear-gradient(to right, transparent 0, transparent ${trialDayWidth - 1}px, rgb(241 245 249) ${trialDayWidth - 1}px, rgb(241 245 249) ${trialDayWidth}px)`
                                }}
                              >
                                <div
                                  onPointerDown={(e) => startTrialTaskDrag(e, task, 'move')}
                                  style={{
                                    left,
                                    width: barWidth,
                                    touchAction: 'none'
                                  }}
                                  className={`absolute top-5 h-[64px] rounded-xl shadow-md border-2 flex items-center select-none cursor-grab active:cursor-grabbing overflow-hidden ${
                                    task.completed
                                      ? 'bg-emerald-500 border-emerald-600'
                                      : 'bg-indigo-600 border-indigo-700'
                                  } text-white`}
                                >
                                  <div className="px-3 md:px-4 min-w-0 flex-1">
                                    <div className="text-sm md:text-base font-black truncate">{task.name}</div>
                                    <div className="text-[10px] md:text-xs font-bold opacity-90 mt-0.5">{duration}日</div>
                                  </div>

                                  <div
                                    onPointerDown={(e) => startTrialTaskDrag(e, task, 'resize')}
                                    style={{ touchAction: 'none' }}
                                    className="h-full w-10 md:w-12 shrink-0 bg-black/15 flex items-center justify-center cursor-ew-resize text-xl font-black"
                                    title="ここを引っ張って期間変更"
                                  >
                                    ↔
                                  </div>
                                </div>

                                {resources.length > 0 && (
                                  <div
                                    className="absolute top-[88px] flex gap-1 overflow-hidden"
                                    style={{ left: Math.max(0, left), maxWidth: Math.max(220, barWidth) }}
                                  >
                                    {resources.slice(0, 6).map((r: any) => (
                                      <span
                                        key={r.id}
                                        className="rounded-full bg-slate-800 text-white px-2 py-1 text-[10px] font-black whitespace-nowrap"
                                      >
                                        {trialResourceIcon(r.type)} {Number(r.quantity || 1)}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* 最小限フッター */}
            <div className="px-3 md:px-5 py-2.5 bg-white border-t border-slate-200 shrink-0">
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-xs md:text-sm font-black text-amber-800">
                    ⚠️ 試験版のため保存されません
                  </div>
                  <div className="hidden md:block text-xs text-slate-400 font-bold mt-0.5">
                    日報・原価・マスタ・Supabaseには影響しません。
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowTrialSchedule(false)}
                  className="px-5 md:px-7 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black"
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {trialResourceDrag && trialResourceDragPos && (
        <div
          className="fixed z-[120] pointer-events-none rounded-xl bg-slate-900 text-white px-3 py-2 shadow-2xl"
          style={{ left: trialResourceDragPos.x + 14, top: trialResourceDragPos.y + 14 }}
        >
          <div className="text-sm font-black">
            {trialResourceIcon(trialResourceDrag.type)} {trialResourceDrag.label}
          </div>
          <div className="text-[10px] text-slate-300 font-bold mt-1">工程の行で離してください</div>
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
      {replyingReport && authRole === 'admin' && (
        <div className="fixed inset-0 z-[75] bg-slate-900/55 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setReplyingReport(null)}>
          <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-slate-200 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-black text-slate-900">💬 報告者へ返信</h3>
                <div className="mt-1 text-sm font-bold text-slate-500">
                  📨 {replyingReport.reporter || replyingReport.data?.reporter || '報告者未記録'} ・ {replyingReport.date || '-'} ・ {replyingReport.location || '-'}
                </div>
              </div>
              <button type="button" onClick={() => setReplyingReport(null)} className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 font-black">✕</button>
            </div>

            <div className="p-6 space-y-5">
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <div className="text-xs font-black text-amber-700 mb-1">📣 報告事項</div>
                <div className="whitespace-pre-wrap text-sm md:text-base font-bold text-slate-800">
                  {replyingReport.officeMessage || replyingReport.data?.officeMessage || '報告事項なし'}
                </div>
              </div>

              <div>
                <div className="text-sm font-black text-slate-700 mb-2">かんたん返信</div>
                <div className="flex flex-wrap gap-2">
                  {['確認しました。', '了解しました。', 'ありがとうございます。確認しました。', '後ほど確認して対応します。'].map((text) => (
                    <button
                      key={text}
                      type="button"
                      onClick={() => setAdminReplyDraft(text)}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100"
                    >
                      {text}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-black text-slate-700 block mb-2">返信内容</label>
                <textarea
                  rows={4}
                  value={adminReplyDraft}
                  onChange={(e) => setAdminReplyDraft(e.target.value)}
                  className="w-full rounded-2xl border-2 border-emerald-200 bg-white p-4 text-base font-bold text-slate-900 focus:border-emerald-500 outline-none"
                  placeholder="報告者へ返信する内容を入力してください"
                />
                <div className="mt-2 text-xs font-bold text-slate-500">この返信は、報告者本人が次に日報入力画面を開いたときだけ表示されます。</div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 bg-white flex justify-end gap-3">
              <button type="button" onClick={() => setReplyingReport(null)} className="px-5 py-3 rounded-xl bg-slate-100 text-slate-700 font-black">キャンセル</button>
              <button type="button" onClick={saveReportReply} disabled={adminReplySaving} className="px-6 py-3 rounded-xl bg-emerald-600 text-white font-black disabled:opacity-50">
                {adminReplySaving ? '保存中…' : '💬 返信を保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {editingReport && authRole === 'admin' && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-md flex items-center justify-center p-3 md:p-6 z-50 animate-fadeIn" onClick={() => setEditingReport(null)}>
          <form onSubmit={handleUpdateReport} className="bg-white rounded-[32px] w-full max-w-4xl p-6 md:p-10 !pb-0 max-h-[92vh] overflow-y-auto space-y-8 shadow-2xl border border-slate-100" onClick={(e) => e.stopPropagation()}>
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
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1.5">報告者（送信者）</label>
                    <div className="w-full p-3.5 border border-violet-200 rounded-2xl text-sm bg-violet-50 font-extrabold text-violet-700 shadow-2xs">
                      📨 {editingReport.reporter || editingReport.data?.reporter || '未記録'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50/80 p-5 md:p-6 rounded-3xl border border-slate-200/60 space-y-4">
                <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wider">👥 作業員</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(settings.workers || []).map((w: any) => {
                    const workers = Array.isArray(editingReport.workers) ? editingReport.workers : [];
                    const checked = workers.includes(w.name);
                    const overtimeMap =
                      editingReport.workerOvertimeHours && typeof editingReport.workerOvertimeHours === 'object'
                        ? editingReport.workerOvertimeHours
                        : {};
                    const halfDayMap =
                      editingReport.workerHalfDay && typeof editingReport.workerHalfDay === 'object'
                        ? editingReport.workerHalfDay
                        : {};
                    const holidayWorkMap =
                      editingReport.workerHolidayWorkHours && typeof editingReport.workerHolidayWorkHours === 'object'
                        ? editingReport.workerHolidayWorkHours
                        : {};
                    const overtime = Math.max(0, Number(overtimeMap[w.name] || 0));
                    const isHalfDay = !!halfDayMap[w.name];
                    const defaultHolidayHours = Number(w.shiftHours || 8) === 7 ? 7 : 8;
                    const explicitHolidayWorkHours = Math.max(0, Number(holidayWorkMap[w.name] || 0));
                    const reportDateText = String(editingReport.date || '').replace(/\//g, '-');
                    const [editY, editM, editD] = reportDateText.split('-').map(Number);
                    const editIsSunday =
                      !!editY && !!editM && !!editD
                        ? new Date(editY, editM - 1, editD).getDay() === 0
                        : false;
                    const editWorkerCalendarType = w.calendarType || 'none';
                    const editCycle =
                      editM >= 11
                        ? `${editY}-${editY + 1}`
                        : `${editY - 1}-${editY}`;
                    const editCompanyHoliday =
                      editWorkerCalendarType !== 'none' &&
                      (settings.companyCalendars?.[editCycle]?.[editWorkerCalendarType]?.holidays || [])
                        .includes(reportDateText);
                    const inferredHolidayWork =
                      checked && (editIsSunday || editCompanyHoliday);
                    const holidayWorkHours =
                      explicitHolidayWorkHours > 0
                        ? explicitHolidayWorkHours
                        : inferredHolidayWork
                          ? defaultHolidayHours
                          : 0;
                    const isHolidayWork = holidayWorkHours > 0;

                    return (
                      <div
                        key={w.name}
                        className={`rounded-2xl border p-3 transition ${
                          checked
                            ? 'bg-blue-50 border-blue-300'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={e => {
                              const current = Array.isArray(editingReport.workers) ? editingReport.workers : [];
                              const updated = e.target.checked
                                ? [...current, w.name]
                                : current.filter((x: string) => x !== w.name);

                              const nextOvertime = { ...overtimeMap };
                              const nextHalfDay = { ...halfDayMap };
                              const nextHolidayWork = { ...holidayWorkMap };

                              if (!e.target.checked) {
                                delete nextOvertime[w.name];
                                delete nextHalfDay[w.name];
                                delete nextHolidayWork[w.name];
                              }

                              setEditingReport({
                                ...editingReport,
                                workers: updated,
                                workerOvertimeHours: nextOvertime,
                                workerHalfDay: nextHalfDay,
                                workerHolidayWorkHours: nextHolidayWork
                              });
                            }}
                            className="rounded text-blue-600 focus:ring-blue-500 w-5 h-5"
                          />
                          <span className={`text-base ${checked ? 'font-semibold text-blue-950' : 'font-medium text-slate-800'}`}>
                            {w.name}
                          </span>
                        </label>

                        {checked && (
                          <div className="mt-3 pt-3 border-t border-blue-200 space-y-3">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-sm font-medium text-slate-600">勤務区分</span>
                                <div className="grid grid-cols-3 gap-2 flex-1 max-w-[340px]">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const nextHalf = { ...halfDayMap };
                                      const nextHoliday = { ...holidayWorkMap };
                                      delete nextHalf[w.name];
                                      delete nextHoliday[w.name];
                                      setEditingReport({
                                        ...editingReport,
                                        workerHalfDay: nextHalf,
                                        workerHolidayWorkHours: nextHoliday
                                      });
                                    }}
                                    className={`px-2 py-2 rounded-xl border text-xs md:text-sm font-medium ${
                                      !isHalfDay && !isHolidayWork
                                        ? 'bg-blue-100 border-blue-500 text-blue-900'
                                        : 'bg-white border-slate-300 text-slate-600'
                                    }`}
                                  >
                                    通常
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      const nextHoliday = { ...holidayWorkMap };
                                      delete nextHoliday[w.name];
                                      setEditingReport({
                                        ...editingReport,
                                        workerHalfDay: {
                                          ...halfDayMap,
                                          [w.name]: true
                                        },
                                        workerHolidayWorkHours: nextHoliday
                                      });
                                    }}
                                    className={`px-2 py-2 rounded-xl border text-xs md:text-sm font-medium ${
                                      isHalfDay && !isHolidayWork
                                        ? 'bg-amber-100 border-amber-500 text-amber-900'
                                        : 'bg-white border-slate-300 text-slate-600'
                                    }`}
                                  >
                                    半日
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      const nextHalf = { ...halfDayMap };
                                      delete nextHalf[w.name];
                                      setEditingReport({
                                        ...editingReport,
                                        workerHalfDay: nextHalf,
                                        workerHolidayWorkHours: {
                                          ...holidayWorkMap,
                                          [w.name]: holidayWorkHours > 0
                                            ? holidayWorkHours
                                            : defaultHolidayHours
                                        }
                                      });
                                    }}
                                    className={`px-2 py-2 rounded-xl border text-xs md:text-sm font-medium ${
                                      isHolidayWork
                                        ? 'bg-rose-100 border-rose-500 text-rose-900'
                                        : 'bg-white border-slate-300 text-slate-600'
                                    }`}
                                  >
                                    休日出勤
                                  </button>
                                </div>
                              </div>

                              {isHolidayWork && (
                                <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3">
                                  <div>
                                    <div className="text-sm font-medium text-rose-800">休日出勤の作業時間</div>
                                    <div className="text-[11px] text-rose-600 mt-0.5">
                                      日曜は法出、それ以外の休日は休出
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      disabled={holidayWorkHours <= 1}
                                      onClick={() =>
                                        setEditingReport({
                                          ...editingReport,
                                          workerHolidayWorkHours: {
                                            ...holidayWorkMap,
                                            [w.name]: Math.max(1, holidayWorkHours - 1)
                                          }
                                        })
                                      }
                                      className="w-10 h-10 rounded-xl border border-slate-300 bg-white text-xl text-slate-600 disabled:opacity-30"
                                    >
                                      −
                                    </button>

                                    <div className="min-w-[76px] text-center text-sm font-bold text-rose-800">
                                      {holidayWorkHours}時間
                                    </div>

                                    <button
                                      type="button"
                                      disabled={holidayWorkHours >= 24}
                                      onClick={() =>
                                        setEditingReport({
                                          ...editingReport,
                                          workerHolidayWorkHours: {
                                            ...holidayWorkMap,
                                            [w.name]: Math.min(24, holidayWorkHours + 1)
                                          }
                                        })
                                      }
                                      className="w-10 h-10 rounded-xl border border-rose-400 bg-white text-xl text-rose-700 disabled:opacity-30"
                                    >
                                      ＋
                                    </button>
                                  </div>
                                </div>
                              )}

                              {!isHolidayWork && (
                                <div className="flex items-center justify-between gap-3">
                                  <span className="text-sm font-medium text-slate-600">残業</span>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      disabled={overtime <= 0}
                                      onClick={() => {
                                        const nextValue = Math.max(0, overtime - 1);
                                        const next = { ...overtimeMap };
                                        if (nextValue === 0) {
                                          delete next[w.name];
                                        } else {
                                          next[w.name] = nextValue;
                                        }
                                        setEditingReport({
                                          ...editingReport,
                                          workerOvertimeHours: next
                                        });
                                      }}
                                      className="w-10 h-10 rounded-xl border border-slate-300 bg-white text-xl text-slate-600 disabled:opacity-30"
                                    >
                                      −
                                    </button>

                                    <div className="min-w-[88px] text-center text-sm font-medium text-slate-700">
                                      残業{overtime}時間
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        setEditingReport({
                                          ...editingReport,
                                          workerOvertimeHours: {
                                            ...overtimeMap,
                                            [w.name]: overtime + 1
                                          }
                                        })
                                      }
                                      className="w-10 h-10 rounded-xl border border-blue-400 bg-blue-50 text-xl text-blue-700"
                                    >
                                      ＋
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
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
                  }} className="bg-emerald-600 text-white text-xs px-3 py-1.5 rounded-xl font-bold shadow hover:bg-emerald-500 transition">＋ 追加</button>
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
                  }} className="bg-emerald-600 text-white text-xs px-3 py-1.5 rounded-xl font-bold shadow hover:bg-emerald-500 transition">＋ 処分項目を追加</button>
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
                  }} className="bg-emerald-600 text-white text-xs px-3 py-1.5 rounded-xl font-bold shadow hover:bg-emerald-500 transition">＋ スクラップ項目を追加</button>
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
                      const qty = getEditingLeaseQuantity('ownMachines', cm.name);
                      return (
                        <div key={cm.name} className={`p-3 rounded-2xl border text-xs md:text-sm transition ${qty > 0 ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold' : 'bg-white border-slate-200'}`}>
                          <div className="truncate text-center mb-2">{cm.name}</div>
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              disabled={qty === 0}
                              onClick={() => changeEditingLeaseQuantity('ownMachines', cm.name, -1)}
                              className={`w-8 h-8 rounded-lg font-black border ${qty === 0 ? 'bg-slate-100 text-slate-300 border-slate-200' : 'bg-white text-slate-700 border-slate-300'}`}
                            >
                              −
                            </button>
                            <span className="min-w-[38px] text-center font-black">{qty}</span>
                            <button
                              type="button"
                              onClick={() => changeEditingLeaseQuantity('ownMachines', cm.name, 1)}
                              className="w-8 h-8 rounded-lg bg-emerald-600 text-white font-black"
                            >
                              ＋
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <label className="text-xs font-bold text-slate-700 block">【自社車両（乗用車・トラック）】</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                    {(settings.vehicles || []).map((v: any) => {
                      const qty = getEditingLeaseQuantity('vehicles', v.name);
                      return (
                        <div key={v.name} className={`p-3 rounded-2xl border text-xs md:text-sm transition ${qty > 0 ? 'bg-blue-50 border-blue-300 text-blue-950 font-bold' : 'bg-white border-slate-200'}`}>
                          <div className="truncate text-center mb-2">{v.name}</div>
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              disabled={qty === 0}
                              onClick={() => changeEditingLeaseQuantity('vehicles', v.name, -1)}
                              className={`w-8 h-8 rounded-lg font-black border ${qty === 0 ? 'bg-slate-100 text-slate-300 border-slate-200' : 'bg-white text-slate-700 border-slate-300'}`}
                            >
                              −
                            </button>
                            <span className="min-w-[38px] text-center font-black">{qty}</span>
                            <button
                              type="button"
                              onClick={() => changeEditingLeaseQuantity('vehicles', v.name, 1)}
                              className="w-8 h-8 rounded-lg bg-blue-600 text-white font-black"
                            >
                              ＋
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="bg-slate-50/80 p-5 md:p-6 rounded-3xl border border-slate-200/60 space-y-4">
                <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wider">🏢 通常リース</h3>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 block">【重機】</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                    {(settings.leaseHeavy || []).map((m: any) => {
                      const leaseValue = makeLeaseSelectionValue(m, '南大阪建機');
                      const qty = getEditingLeaseQuantity('leaseHeavy', leaseValue);
                      return (
                        <div key={m.name} className={`p-3 rounded-2xl border text-xs md:text-sm transition ${qty > 0 ? 'bg-blue-50 border-blue-300 text-blue-950 font-bold' : 'bg-white border-slate-200'}`}>
                          <div className="truncate text-center mb-2">{getLeaseMasterCleanName(m)}</div>
                          <div className="flex items-center justify-center gap-2">
                            <button type="button" disabled={qty === 0} onClick={() => changeEditingLeaseQuantity('leaseHeavy', leaseValue, -1)}
                              className={`w-8 h-8 rounded-lg font-black border ${qty === 0 ? 'bg-slate-100 text-slate-300 border-slate-200' : 'bg-white text-slate-700 border-slate-300'}`}>−</button>
                            <span className="min-w-[42px] text-center font-black">{qty}台</span>
                            <button type="button" onClick={() => changeEditingLeaseQuantity('leaseHeavy', leaseValue, 1)}
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
                      const leaseValue = makeLeaseSelectionValue(m, '南大阪建機');
                      const qty = getEditingLeaseQuantity('leaseAttach', leaseValue);
                      return (
                        <div key={m.name} className={`p-3 rounded-2xl border text-xs md:text-sm transition ${qty > 0 ? 'bg-blue-50 border-blue-300 text-blue-950 font-bold' : 'bg-white border-slate-200'}`}>
                          <div className="truncate text-center mb-2">{getLeaseMasterCleanName(m)}</div>
                          <div className="flex items-center justify-center gap-2">
                            <button type="button" disabled={qty === 0} onClick={() => changeEditingLeaseQuantity('leaseAttach', leaseValue, -1)}
                              className={`w-8 h-8 rounded-lg font-black border ${qty === 0 ? 'bg-slate-100 text-slate-300 border-slate-200' : 'bg-white text-slate-700 border-slate-300'}`}>−</button>
                            <span className="min-w-[42px] text-center font-black">{qty}台</span>
                            <button type="button" onClick={() => changeEditingLeaseQuantity('leaseAttach', leaseValue, 1)}
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
                      const leaseValue = makeLeaseSelectionValue(m, '南大阪建機');
                      const qty = getEditingLeaseQuantity('leaseOther', leaseValue);
                      return (
                        <div key={m.name} className={`p-3 rounded-2xl border text-xs md:text-sm transition ${qty > 0 ? 'bg-blue-50 border-blue-300 text-blue-950 font-bold' : 'bg-white border-slate-200'}`}>
                          <div className="truncate text-center mb-2">{getLeaseMasterCleanName(m)}</div>
                          <div className="flex items-center justify-center gap-2">
                            <button type="button" disabled={qty === 0} onClick={() => changeEditingLeaseQuantity('leaseOther', leaseValue, -1)}
                              className={`w-8 h-8 rounded-lg font-black border ${qty === 0 ? 'bg-slate-100 text-slate-300 border-slate-200' : 'bg-white text-slate-700 border-slate-300'}`}>−</button>
                            <span className="min-w-[42px] text-center font-black">{qty}台</span>
                            <button type="button" onClick={() => changeEditingLeaseQuantity('leaseOther', leaseValue, 1)}
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
                      className="bg-blue-600 text-white text-xs px-3 py-1.5 rounded-xl font-bold shadow hover:bg-blue-500 transition"
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
                      const leaseValue = makeLeaseSelectionValue(m, '');
                      const qty = getEditingLeaseQuantity('ishikawaHeavy', leaseValue);
                      return (
                        <div key={m.name} className={`p-3 rounded-2xl border text-xs md:text-sm transition ${qty > 0 ? 'bg-indigo-50 border-indigo-300 text-indigo-950 font-bold' : 'bg-white border-slate-200'}`}>
                          <div className="truncate text-center mb-2">{getLeaseMasterCleanName(m)}</div>
                          <div className="flex items-center justify-center gap-2">
                            <button type="button" disabled={qty === 0} onClick={() => changeEditingLeaseQuantity('ishikawaHeavy', leaseValue, -1)}
                              className={`w-8 h-8 rounded-lg font-black border ${qty === 0 ? 'bg-slate-100 text-slate-300 border-slate-200' : 'bg-white text-slate-700 border-slate-300'}`}>−</button>
                            <span className="min-w-[42px] text-center font-black">{qty}台</span>
                            <button type="button" onClick={() => changeEditingLeaseQuantity('ishikawaHeavy', leaseValue, 1)}
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
                      const leaseValue = makeLeaseSelectionValue(m, '');
                      const qty = getEditingLeaseQuantity('ishikawaAttach', leaseValue);
                      return (
                        <div key={m.name} className={`p-3 rounded-2xl border text-xs md:text-sm transition ${qty > 0 ? 'bg-indigo-50 border-indigo-300 text-indigo-950 font-bold' : 'bg-white border-slate-200'}`}>
                          <div className="truncate text-center mb-2">{getLeaseMasterCleanName(m)}</div>
                          <div className="flex items-center justify-center gap-2">
                            <button type="button" disabled={qty === 0} onClick={() => changeEditingLeaseQuantity('ishikawaAttach', leaseValue, -1)}
                              className={`w-8 h-8 rounded-lg font-black border ${qty === 0 ? 'bg-slate-100 text-slate-300 border-slate-200' : 'bg-white text-slate-700 border-slate-300'}`}>−</button>
                            <span className="min-w-[42px] text-center font-black">{qty}台</span>
                            <button type="button" onClick={() => changeEditingLeaseQuantity('ishikawaAttach', leaseValue, 1)}
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
                      const leaseValue = makeLeaseSelectionValue(m, '');
                      const qty = getEditingLeaseQuantity('ishikawaOther', leaseValue);
                      return (
                        <div key={m.name} className={`p-3 rounded-2xl border text-xs md:text-sm transition ${qty > 0 ? 'bg-indigo-50 border-indigo-300 text-indigo-950 font-bold' : 'bg-white border-slate-200'}`}>
                          <div className="truncate text-center mb-2">{getLeaseMasterCleanName(m)}</div>
                          <div className="flex items-center justify-center gap-2">
                            <button type="button" disabled={qty === 0} onClick={() => changeEditingLeaseQuantity('ishikawaOther', leaseValue, -1)}
                              className={`w-8 h-8 rounded-lg font-black border ${qty === 0 ? 'bg-slate-100 text-slate-300 border-slate-200' : 'bg-white text-slate-700 border-slate-300'}`}>−</button>
                            <span className="min-w-[42px] text-center font-black">{qty}台</span>
                            <button type="button" onClick={() => changeEditingLeaseQuantity('ishikawaOther', leaseValue, 1)}
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

              <div className="bg-orange-50/70 p-5 md:p-6 rounded-3xl border border-orange-200 space-y-4">
                <h3 className="text-sm font-bold text-orange-700 uppercase tracking-wider">📢 事務所への報告・相談</h3>
                <textarea
                  rows={3}
                  value={editingReport.officeMessage || editingReport.data?.officeMessage || ''}
                  onChange={e=>setEditingReport({...editingReport, officeMessage: e.target.value})}
                  className="w-full p-4 border border-orange-200 rounded-2xl text-sm bg-white font-medium shadow-2xs leading-relaxed"
                  placeholder="事務所への報告・相談があれば入力..."
                />
                {(editingReport.officeMessage || editingReport.data?.officeMessage) && (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div>
                        <div className="text-xs font-black text-emerald-700">💬 報告者への返信</div>
                        <div className="mt-1 text-sm font-bold text-slate-800">
                          {(editingReport.adminReply || editingReport.data?.adminReply) || 'まだ返信していません。'}
                        </div>
                        {(editingReport.adminReplyReadAt || editingReport.data?.adminReplyReadAt) && (
                          <div className="mt-1 text-[11px] font-bold text-emerald-600">✓ 報告者本人が確認済み</div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const reportId = editingReport.id || editingReport._id;
                          const originalReport = reports.find((r:any) => (r.id || r._id) === reportId) || editingReport;
                          openReportReply(originalReport);
                        }}
                        className="shrink-0 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-black text-white hover:bg-emerald-700"
                      >
                        💬 {(editingReport.adminReply || editingReport.data?.adminReply) ? '返信を編集' : '返信する'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="-mx-6 md:-mx-10 px-6 md:px-10 py-4 bg-white border-t border-slate-200 flex gap-4">
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


      {/* 社長モード専用：スマホで見やすい現場詳細 */}
      {modalLocation && modalData && authRole === 'viewer' && (() => {
        const remainingBeforeScrap = Number(modalData.contractPrice || 0) - Number(modalData.total || 0);
        const usedRate = Number(modalData.contractPrice || 0) > 0
          ? Math.round((Number(modalData.total || 0) / Number(modalData.contractPrice || 0)) * 100)
          : 0;

        const wholeYen = (value: number) =>
          `¥${Math.round(Number(value || 0)).toLocaleString('ja-JP')}`;

        const expenseRows = [
          { key: 'labor', label: '人件費', icon: '👷', value: modalData.laborCost },
          { key: 'subcontractor', label: '外注費', icon: '🏢', value: modalData.subCostTotal },
          { key: 'lease', label: 'リース', icon: '🏗️', value: Number(modalData.leaseCost || 0) + Number(modalData.otherLeaseCost || 0) },
          { key: 'ownMachine', label: '自社重機', icon: '🚜', value: modalData.ownMachineCost },
          { key: 'vehicle', label: '車両', icon: '🚚', value: modalData.vehicleCost },
          { key: 'disposal', label: '処分費', icon: '🗑️', value: modalData.disposalCost },
          { key: 'fuel', label: '燃料', icon: '⛽', value: Number(modalData.fuelCost || 0) + Number(modalData.regularCost || 0) },
          { key: 'road', label: 'ETC・駐車場', icon: '🛣️', value: Number(modalData.etcCost || 0) + Number(modalData.parkingCost || 0) },
          { key: 'other', label: 'その他', icon: '📦', value: Number(modalData.otherCost || 0) + Number(modalData.customExtraExpenseTotal || 0) }
        ];

        const aggregateNameCounts = (field: string) => {
          const map: { [key: string]: number } = {};
          (modalData.reportsWithIndex || []).forEach((r: any) => {
            (Array.isArray(r?.[field]) ? r[field] : []).forEach((name: string) => {
              if (!name) return;
              map[name] = (map[name] || 0) + 1;
            });
          });
          return Object.entries(map)
            .map(([name, count]) => ({ name, count }))
            .sort((a: any, b: any) => b.count - a.count || a.name.localeCompare(b.name, 'ja'));
        };

        const ownMachineDetails = aggregateNameCounts('ownMachines');
        const vehicleDetails = aggregateNameCounts('vehicles');

        const leaseDetails = getLeaseDetailEntries(modalLocation);
        const leaseSimpleDetails = [
          ...(leaseDetails.ishikawa || []).map((x: any) => ({ ...x, group: '石川県リース' })),
          ...(leaseDetails.mok || []).map((x: any) => ({ ...x, group: '南大阪建機' }))
        ];

        const roadDetails = (modalData.reportsWithIndex || [])
          .map((r: any) => ({
            date: r.date || '',
            etc: Number(r.etcPrice || 0),
            parking: Number(r.parkingPrice || 0)
          }))
          .filter((x: any) => x.etc !== 0 || x.parking !== 0);

        const otherDailyDetails = (modalData.reportsWithIndex || [])
          .map((r: any) => ({
            date: r.date || '',
            label: r.otherItem || 'その他',
            amount: Number(r.otherPrice || 0)
          }))
          .filter((x: any) => x.amount !== 0);

        const renderExpenseDetails = (key: string) => {
          if (key === 'labor') {
            const rows = Array.isArray(modalData.workerAttendance) ? modalData.workerAttendance : [];
            return rows.length > 0 ? (
              <div className="space-y-2">
                {rows.map((row: any) => (
                  <div key={row.name} className="flex items-center justify-between gap-3 rounded-xl bg-white border border-slate-200 px-4 py-3.5">
                    <span className="text-[16px] text-slate-700">{row.name}</span>
                    <span className="text-[16px] font-medium text-slate-950">{row.days}日</span>
                  </div>
                ))}
                <div className="text-[14px] text-slate-500">
                  ※ 個人ごとの単価は表示していません。
                </div>
              </div>
            ) : <div className="text-[15px] text-slate-500">人件費の明細はありません。</div>;
          }

          if (key === 'subcontractor') {
            const rows = Array.isArray(modalData.subcontractorBreakdown) ? modalData.subcontractorBreakdown : [];
            const custom = Array.isArray(customSubcontractors[modalLocation]) ? customSubcontractors[modalLocation] : [];
            return (rows.length > 0 || custom.length > 0) ? (
              <div className="space-y-2">
                {rows.map((row: any) => (
                  <div key={row.key} className="rounded-xl bg-white border border-slate-200 px-4 py-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[16px] font-medium text-slate-800 break-words">{row.company}</div>
                        <div className="text-[14px] text-slate-500 mt-0.5 break-words">{row.task}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[16px] font-medium text-slate-950">{wholeYen(row.confirmedTotal)}</div>
                        <div className="text-[13px] text-slate-500 mt-0.5">延べ {row.count}人</div>
                      </div>
                    </div>
                  </div>
                ))}
                {custom.map((row: any, idx: number) => (
                  <div key={`custom_${idx}`} className="rounded-xl bg-white border border-slate-200 px-4 py-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-[16px] font-medium text-slate-800">{row.company}</div>
                        <div className="text-[14px] text-slate-500 mt-0.5">{row.task || '一括請負'}</div>
                      </div>
                      <div className="text-[16px] font-medium text-slate-950">{wholeYen(row.price)}</div>
                    </div>
                  </div>
                ))}
                <div className="text-[14px] text-slate-500">※ 外注単価は表示していません。</div>
              </div>
            ) : <div className="text-[15px] text-slate-500">外注費の明細はありません。</div>;
          }

          if (key === 'lease') {
            return leaseSimpleDetails.length > 0 ? (
              <div className="space-y-2">
                {leaseSimpleDetails.map((row: any) => (
                  <div key={`${row.group}_${row.key}`} className="flex items-start justify-between gap-3 rounded-xl bg-white border border-slate-200 px-4 py-3.5">
                    <div className="min-w-0">
                      <div className="text-[16px] text-slate-800 break-words">{row.label}</div>
                      <div className="text-[13px] text-slate-500 mt-0.5">{row.group}</div>
                    </div>
                    <span className="text-[15px] font-medium text-slate-950 shrink-0">{row.count}回</span>
                  </div>
                ))}
                <div className="text-[14px] text-slate-500">※ リース単価は表示していません。</div>
              </div>
            ) : <div className="text-[15px] text-slate-500">リースの明細はありません。</div>;
          }

          if (key === 'ownMachine' || key === 'vehicle') {
            const rows = key === 'ownMachine' ? ownMachineDetails : vehicleDetails;
            const unit = key === 'ownMachine' ? '台日' : '台日';
            return rows.length > 0 ? (
              <div className="space-y-2">
                {rows.map((row: any) => (
                  <div key={row.name} className="flex items-center justify-between gap-3 rounded-xl bg-white border border-slate-200 px-4 py-3.5">
                    <span className="text-[16px] text-slate-800 break-words">{row.name}</span>
                    <span className="text-[16px] font-medium text-slate-950 shrink-0">{row.count}{unit}</span>
                  </div>
                ))}
                <div className="text-[14px] text-slate-500">※ 単価は表示していません。</div>
              </div>
            ) : <div className="text-[15px] text-slate-500">明細はありません。</div>;
          }

          if (key === 'disposal') {
            const sites = Object.entries(modalData.aggregatedDisposalBreakdown || {});

            return sites.length > 0 ? (
              <div className="space-y-3">
                {sites.map(([siteName, siteData]: any) => {
                  const itemSummary: any = {};

                  Object.entries(siteData.months || {}).forEach(([ym, monthData]: any) => {
                    Object.values(monthData.days || {}).forEach((dayData: any) => {
                      (dayData.rows || []).forEach((row: any) => {
                        if (!itemSummary[row.item]) {
                          itemSummary[row.item] = {
                            quantity: 0,
                            unit: row.unit,
                            confirmedTotal: 0
                          };
                        }

                        itemSummary[row.item].quantity += Number(row.quantity || 0);
                        itemSummary[row.item].confirmedTotal += Number(row.confirmedTotal || 0);
                      });
                    });
                  });

                  return (
                    <div key={siteName} className="rounded-xl bg-white border border-slate-200 overflow-hidden">
                      <div className="flex items-center justify-between gap-3 px-4 py-3.5 bg-slate-50">
                        <span className="text-[16px] font-medium text-slate-800 break-words">{siteName}</span>
                        <span className="text-[16px] font-medium text-slate-950 shrink-0">
                          {wholeYen(siteData.confirmedTotal)}
                        </span>
                      </div>

                      <div className="divide-y divide-slate-100">
                        {Object.entries(itemSummary).map(([itemName, itemData]: any) => (
                          <div key={itemName} className="flex items-center justify-between gap-3 px-4 py-3.5">
                            <div className="min-w-0">
                              <div className="text-[15px] text-slate-700 break-words">{itemName}</div>
                              <div className="text-[13px] text-slate-500 mt-0.5">
                                {Number(itemData.quantity || 0).toLocaleString('ja-JP')} {itemData.unit}
                              </div>
                            </div>

                            <div className="text-[15px] font-medium text-slate-950 shrink-0">
                              {wholeYen(itemData.confirmedTotal)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-[15px] text-slate-500">処分費の明細はありません。</div>
            );
          }

          if (key === 'fuel') {
            const rows = Object.entries(modalData.monthlyFuelBreakdown || {});
            return rows.length > 0 ? (
              <div className="space-y-2">
                {rows.map(([ym, row]: any) => (
                  <div key={ym} className="rounded-xl bg-white border border-slate-200 px-4 py-3.5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[16px] text-slate-800">{ym}</div>
                        <div className="text-[13px] text-slate-500 mt-0.5">{Number(row.liters || 0).toLocaleString('ja-JP')} L</div>
                      </div>
                      <div className="text-[16px] font-medium text-slate-950">{wholeYen(row.total)}</div>
                    </div>
                  </div>
                ))}
                {Number(modalData.regularCost || 0) !== 0 && (
                  <div className="flex items-center justify-between gap-3 rounded-xl bg-white border border-slate-200 px-4 py-3.5">
                    <span className="text-[16px] text-slate-700">レギュラー等</span>
                    <span className="text-[16px] font-medium text-slate-950">{wholeYen(modalData.regularCost)}</span>
                  </div>
                )}
                <div className="text-[14px] text-slate-500">※ 燃料単価は表示していません。</div>
              </div>
            ) : <div className="text-[15px] text-slate-500">燃料費の明細はありません。</div>;
          }

          if (key === 'road') {
            return roadDetails.length > 0 ? (
              <div className="space-y-2">
                {roadDetails.map((row: any, idx: number) => (
                  <div key={`${row.date}_${idx}`} className="rounded-xl bg-white border border-slate-200 px-4 py-3.5">
                    <div className="text-[14px] text-slate-500">{row.date || '日付不明'}</div>
                    <div className="mt-1 space-y-1">
                      {row.etc !== 0 && (
                        <div className="flex justify-between gap-3 text-[15px]">
                          <span className="text-slate-600">ETC</span>
                          <span className="font-medium text-slate-950">{wholeYen(row.etc)}</span>
                        </div>
                      )}
                      {row.parking !== 0 && (
                        <div className="flex justify-between gap-3 text-[15px]">
                          <span className="text-slate-600">駐車場</span>
                          <span className="font-medium text-slate-950">{wholeYen(row.parking)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : <div className="text-[15px] text-slate-500">ETC・駐車場の明細はありません。</div>;
          }

          if (key === 'other') {
            const customRows = Array.isArray(modalData.customExtraExpenseList) ? modalData.customExtraExpenseList : [];
            return (otherDailyDetails.length > 0 || customRows.length > 0) ? (
              <div className="space-y-2">
                {otherDailyDetails.map((row: any, idx: number) => (
                  <div key={`${row.date}_${row.label}_${idx}`} className="rounded-xl bg-white border border-slate-200 px-4 py-3.5">
                    <div className="text-[13px] text-slate-500">{row.date || '日付不明'}</div>
                    <div className="mt-1 flex items-center justify-between gap-3">
                      <span className="text-[15px] text-slate-700 break-words">{row.label}</span>
                      <span className="text-[15px] font-medium text-slate-950 shrink-0">{wholeYen(row.amount)}</span>
                    </div>
                  </div>
                ))}
                {customRows.map((row: any) => (
                  <div key={row.id} className="rounded-xl bg-white border border-slate-200 px-4 py-3.5">
                    <div className="text-[13px] text-slate-500">管理側追加経費</div>
                    <div className="mt-1 flex items-center justify-between gap-3">
                      <span className="text-[15px] text-slate-700 break-words">{row.label || 'その他経費'}</span>
                      <span className="text-[15px] font-medium text-slate-950 shrink-0">{wholeYen(row.amount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : <div className="text-[15px] text-slate-500">その他経費の明細はありません。</div>;
          }

          return null;
        };

        return (
          <div
            className="fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-sm overflow-y-auto p-2"
            onClick={() => { setModalLocation(null); setViewerExpenseDetailKey(null); }}
          >
            <div
              className="mx-auto w-full max-w-xl min-h-[calc(100vh-16px)] bg-slate-50 rounded-[26px] overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* ヘッダー */}
              <div className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 py-3.5">
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => setModalLocation(null)}
                    className="shrink-0 w-12 h-12 rounded-xl bg-slate-100 text-slate-600 text-lg"
                  >
                    ←
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="text-[17px] font-medium text-orange-700">現場の詳細</div>
                    <h2 className="mt-0.5 text-[22px] leading-relaxed font-semibold text-slate-950 break-words">
                      {modalLocation}
                    </h2>
                  </div>

                  <button
                    type="button"
                    onClick={() => setModalLocation(null)}
                    className="shrink-0 w-12 h-12 rounded-full bg-slate-100 text-slate-500"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="p-3 space-y-3">
                {/* 現場の基本情報 */}
                <section className="rounded-[22px] bg-white border border-slate-200 shadow-sm p-4">
                  <h3 className="text-[22px] font-semibold text-slate-950">現場の状況</h3>

                  <div className="mt-3 space-y-2.5 text-[16px]">
                    <div className="flex items-start justify-between gap-4">
                      <span className="text-slate-500 shrink-0">請負先</span>
                      <span className="text-right text-slate-900 break-words">
                        {modalData.clientStr || '未登録'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <span className="text-slate-500">開始日</span>
                      <span className="text-slate-900">{modalData.startDateStr || '未登録'}</span>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <span className="text-slate-500">稼働日数</span>
                      <span className="text-slate-900">{modalData.days}日</span>
                    </div>
                  </div>
                </section>

                {/* 一番大事な収支 */}
                <section className="rounded-[22px] bg-white border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-4 pt-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-[22px] font-semibold text-slate-950">現在の収支</h3>
                        <p className="mt-0.5 text-[14px] text-slate-500">
                          請負金額に対して、現在どこまで経費を使っているか
                        </p>
                      </div>

                      <div className={`rounded-full px-3 py-1.5 text-[15px] font-medium ${
                        usedRate >= 90
                          ? 'bg-rose-100 text-rose-700'
                          : usedRate >= 75
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {usedRate}% 使用
                      </div>
                    </div>

                    <div className="mt-4 h-2.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          usedRate >= 90
                            ? 'bg-rose-500'
                            : usedRate >= 75
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(0, usedRate))}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2 p-4">
                    <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3.5">
                      <div className="text-[14px] text-slate-500">請負金額</div>
                      <div className="mt-1 text-[26px] font-semibold text-slate-950 break-words">
                        {wholeYen(modalData.contractPrice)}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-orange-50 border border-orange-200 p-3.5">
                      <div className="text-[14px] text-orange-700">現在までに使った経費</div>
                      <div className="mt-1 text-[26px] font-semibold text-orange-800 break-words">
                        {wholeYen(modalData.total)}
                      </div>
                    </div>

                    <div className={`rounded-2xl border p-3.5 ${
                      remainingBeforeScrap >= 0
                        ? 'bg-emerald-50 border-emerald-200'
                        : 'bg-rose-50 border-rose-200'
                    }`}>
                      <div className={`text-[14px] ${
                        remainingBeforeScrap >= 0 ? 'text-emerald-700' : 'text-rose-700'
                      }`}>
                        請負金額から残っている金額
                      </div>
                      <div className={`mt-1 text-[26px] font-semibold break-words ${
                        remainingBeforeScrap >= 0 ? 'text-emerald-700' : 'text-rose-800'
                      }`}>
                        {wholeYen(remainingBeforeScrap)}
                      </div>
                    </div>
                  </div>

                  {Number(modalData.scrapTotal || 0) !== 0 && (
                    <div className="mx-4 mb-4 rounded-2xl bg-blue-50 border border-blue-200 p-3.5">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-[14px] text-blue-700">スクラップ売却</div>
                          <div className="mt-1 text-[22px] font-semibold text-blue-700">
                            ＋ {wholeYen(modalData.scrapTotal)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[14px] text-slate-500">売却益を含む利益</div>
                          <div className={`mt-1 text-[22px] font-semibold ${
                            Number(modalData.profit || 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'
                          }`}>
                            {wholeYen(modalData.profit)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </section>

                {/* 経費内訳 */}
                <section className="rounded-[22px] bg-white border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-4 py-4 border-b border-slate-100">
                    <h3 className="text-[22px] font-semibold text-slate-950">経費の内訳</h3>
                    <p className="mt-0.5 text-[14px] text-slate-500">
                      単価は表示せず、現在の合計金額だけ表示しています
                    </p>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {expenseRows.map((row: any) => {
                      const isOpen = viewerExpenseDetailKey === row.key;

                      return (
                        <div key={row.key}>
                          <button
                            type="button"
                            onClick={() => setViewerExpenseDetailKey(isOpen ? null : row.key)}
                            className="w-full flex items-center gap-3 px-4 py-4.5 text-left active:bg-slate-100 min-h-[78px]"
                          >
                            <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 text-[17px]">
                              {row.icon}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="text-[16px] text-slate-700">{row.label}</div>
                              <div className="text-[13px] text-slate-500 mt-0.5">
                                タップして詳細を見る
                              </div>
                            </div>

                            <div className="shrink-0 text-right">
                              <div className="text-[17px] font-medium text-slate-950">
                                {wholeYen(row.value)}
                              </div>
                              <div className={`mt-0.5 text-[16px] text-slate-500 transition-transform ${isOpen ? 'rotate-90' : ''}`}>
                                ›
                              </div>
                            </div>
                          </button>

                          {isOpen && (
                            <div className="px-4 pb-4">
                              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3">
                                {renderExpenseDetails(row.key)}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between gap-3 px-4 py-4 bg-slate-900 text-white">
                    <span className="text-[16px]">経費合計</span>
                    <span className="text-[19px] font-semibold">
                      {wholeYen(modalData.total)}
                    </span>
                  </div>
                </section>

                {/* 必要な詳細だけ */}
                <section className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setShowDisposalModal(true)}
                    className="rounded-2xl bg-white border border-slate-200 p-4 text-left shadow-sm"
                  >
                    <div className="text-[24px]">🗑️</div>
                    <div className="mt-2 text-[17px] font-medium text-slate-900">処分費を見る</div>
                    <div className="mt-1 text-[14px] text-slate-500">
                      {wholeYen(modalData.disposalCost)}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowScrapModal(true)}
                    className="rounded-2xl bg-white border border-slate-200 p-4 text-left shadow-sm"
                  >
                    <div className="text-[24px]">♻️</div>
                    <div className="mt-2 text-[17px] font-medium text-slate-900">スクラップを見る</div>
                    <div className="mt-1 text-[14px] text-slate-500">
                      {wholeYen(modalData.scrapTotal)}
                    </div>
                  </button>
                </section>

                {/* 写真 */}
                <section className="rounded-[22px] bg-white border border-slate-200 shadow-sm p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-[22px] font-semibold text-slate-950">📷 現場写真</h3>
                    {sitePhotoLoading && (
                      <span className="text-[14px] text-slate-500">読み込み中…</span>
                    )}
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3">
                    {[
                      { label: '着工前', photos: sitePhotos.before },
                      { label: '完了', photos: sitePhotos.after }
                    ].map((group: any) => (
                      <div key={group.label}>
                        <div className="text-[14px] text-slate-500 mb-2">
                          {group.label}（{group.photos.length}/3）
                        </div>

                        {group.photos.length === 0 ? (
                          <div className="aspect-[4/3] rounded-xl bg-slate-100 border border-dashed border-slate-200 flex items-center justify-center text-[14px] text-slate-400">
                            写真なし
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 gap-2">
                            {group.photos.slice(0, 3).map((photo: any) => (
                              <a
                                key={photo.path}
                                href={photo.signedUrl || photo.url}
                                target="_blank"
                                rel="noreferrer"
                                className="block"
                              >
                                <img
                                  src={photo.signedUrl || photo.url}
                                  alt={group.label}
                                  className="w-full aspect-[4/3] object-cover rounded-xl border border-slate-200"
                                />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>

                <button
                  type="button"
                  onClick={() => setModalLocation(null)}
                  className="w-full rounded-2xl bg-slate-900 text-white py-4 text-[17px] font-medium"
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 置場専用モーダル：管理者モード */}
      {modalLocation && authRole === 'admin' && (() => {
        const yardLoc = (settings.locations || []).find(
          (x:any) => (typeof x === 'string' ? x : x?.name) === modalLocation
        );
        if (!isStorageYardLocation(yardLoc)) return null;

        const yardReports = reports
          .map((raw:any) =>
            raw?.data && typeof raw.data === 'object'
              ? { ...raw.data, id: raw.id || raw.data.id }
              : raw || {}
          )
          .filter((r:any) => r.location === modalLocation)
          .sort((a:any,b:any) => String(b.date || '').localeCompare(String(a.date || '')));

        const workerCounts: Record<string, number> = {};
        yardReports.forEach((r:any) => {
          (Array.isArray(r.workers) ? r.workers : []).forEach((name:string) => {
            workerCounts[name] = (workerCounts[name] || 0) + 1;
          });
        });

        const latestReports = yardReports.slice(0, 20);

        return (
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-40 animate-fadeIn overflow-y-auto p-2 md:p-8"
            onClick={() => setModalLocation(null)}
          >
            <div
              className="bg-white rounded-3xl w-full max-w-[1250px] max-h-[94vh] overflow-y-auto shadow-2xl border border-slate-100 p-5 md:p-8 !pb-0 space-y-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 z-20 bg-white border-b border-slate-200 pb-4">
                <button
                  onClick={() => setModalLocation(null)}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-5 py-2.5 rounded-xl text-sm font-bold"
                >
                  閉じる
                </button>
                <div className="mt-4 flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 leading-tight">
                      📦 {modalLocation}
                    </h2>
                    <div className="text-base text-amber-700 font-bold mt-1">置場管理</div>
                  </div>
                  <div className="rounded-2xl bg-amber-50 border border-amber-200 px-5 py-3">
                    <div className="text-xs font-bold text-amber-700">責任者</div>
                    <div className="text-xl font-black text-slate-900 mt-1">{getStorageYardManager(yardLoc)}</div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-4 md:p-5">
                <div className="font-bold text-amber-900 text-lg">この画面について</div>
                <div className="text-sm md:text-base text-amber-800 mt-1 leading-relaxed">
                  置場は工事現場ではないため、請負金額・粗利・原価率ではなく、
                  日報・出勤者・作業内容・報告事項を中心に確認します。
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-xs font-bold text-slate-500">日報件数</div>
                  <div className="text-3xl font-black text-slate-900 mt-1">{yardReports.length}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-xs font-bold text-slate-500">直近の稼働日</div>
                  <div className="text-lg font-black text-slate-900 mt-1">{yardReports[0]?.date || '－'}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-xs font-bold text-slate-500">出勤した作業員</div>
                  <div className="text-3xl font-black text-slate-900 mt-1">{Object.keys(workerCounts).length}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-xs font-bold text-slate-500">責任者</div>
                  <div className="text-lg font-black text-slate-900 mt-1">{getStorageYardManager(yardLoc)}</div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                  <div className="font-bold text-slate-900">👷 置場の出勤状況</div>
                  <div className="text-xs text-slate-500 mt-1">置場の日報に登録された出勤回数です</div>
                </div>
                <div className="p-4 flex flex-wrap gap-2">
                  {Object.keys(workerCounts).length === 0 ? (
                    <span className="text-sm text-slate-400">まだ出勤記録がありません</span>
                  ) : (
                    Object.entries(workerCounts)
                      .sort((a:any,b:any)=>Number(b[1])-Number(a[1]))
                      .map(([name,count]:any)=>(
                        <span
                          key={name}
                          className="inline-flex items-center gap-2 rounded-full bg-blue-50 border border-blue-200 px-3 py-1.5 text-sm font-bold text-blue-900"
                        >
                          {name}
                          <span className="text-xs text-blue-600">{count}日</span>
                        </span>
                      ))
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-slate-900">📝 置場の日報一覧</div>
                    <div className="text-xs text-slate-500 mt-1">最新20件</div>
                  </div>
                </div>
                <div className="divide-y divide-slate-100">
                  {latestReports.length === 0 ? (
                    <div className="p-5 text-sm text-slate-400">まだ置場の日報がありません</div>
                  ) : (
                    latestReports.map((r:any, idx:number)=>(
                      <div key={r.id || `${r.date}-${idx}`} className="p-4 md:p-5">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div className="font-black text-slate-900">{r.date || '日付なし'}</div>
                          <div className="text-sm font-bold text-blue-700">
                            {(Array.isArray(r.workers) ? r.workers : []).join('・') || '作業員記録なし'}
                          </div>
                        </div>

                        <div className="mt-3">
                          <div className="text-xs font-bold text-slate-500">作業内容</div>
                          <div className="mt-1 text-sm md:text-base text-slate-800 whitespace-pre-wrap">
                            {r.workDescription || '作業内容の記載なし'}
                          </div>
                        </div>

                        {(r.officeMessage || r.data?.officeMessage) && (
                          <div className="mt-3 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5">
                            <div className="text-xs font-bold text-amber-700">📢 事務所への報告・相談</div>
                            <div className="text-sm text-amber-900 mt-1 whitespace-pre-wrap">
                              {r.officeMessage || r.data?.officeMessage}
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="sticky bottom-0 bg-white pt-3 pb-5 border-t border-slate-100">
                <button
                  onClick={() => setModalLocation(null)}
                  className="w-full rounded-2xl bg-slate-900 text-white py-4 text-base font-bold"
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 現場詳細モーダル：管理者モード（既存機能・既存UIはそのまま） */}
      {modalLocation && modalData && authRole === 'admin' && !isStorageYardLocation(
        (settings.locations || []).find(
          (x:any) => (typeof x === 'string' ? x : x?.name) === modalLocation
        )
      ) && (
        <div
          className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-40 animate-fadeIn overflow-y-auto ${authRole === 'viewer' ? 'p-1.5 md:p-8' : 'p-2 md:p-8'}`}
          onClick={() => setModalLocation(null)}
        >
          <div
            className={`bg-white rounded-3xl w-full max-h-[94vh] md:max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-100 ${
              authRole === 'viewer'
                ? 'max-w-6xl p-4 md:p-10 space-y-5 md:space-y-8'
                : 'max-w-[1400px] p-6 md:p-9 space-y-7 md:space-y-9'
            } !pb-0`}
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
                            value={projectMetaEdit.client}
                            onChange={(e) => {
                              setProjectMetaEdit({ ...projectMetaEdit, client: e.target.value });
                              setProjectMetaDirty(true);
                            }}
                            placeholder="例: 〇〇建設"
                            className="w-full p-3.5 border border-slate-300 rounded-xl text-base md:text-lg font-bold bg-white text-slate-800"
                          />
                        </div>
                        <div>
                          <label className="text-sm md:text-base font-bold text-slate-800 block mb-1.5">⏱ 開始日</label>
                          <input
                            type="date"
                            value={projectMetaEdit.startDate}
                            onChange={(e) => {
                              setProjectMetaEdit({ ...projectMetaEdit, startDate: e.target.value });
                              setProjectMetaDirty(true);
                            }}
                            className="w-full p-3.5 border border-slate-300 rounded-xl text-base md:text-lg font-bold bg-white text-slate-800"
                          />
                        </div>
                        <div className="md:col-span-2 flex items-center justify-end gap-3 pt-1">
                          <span className={`text-sm font-bold ${projectMetaDirty ? 'text-orange-600' : 'text-emerald-600'}`}>
                            {projectMetaDirty ? '● 未保存の変更があります' : '✓ 保存済み'}
                          </span>
                          <button
                            type="button"
                            onClick={saveProjectMeta}
                            disabled={!projectMetaDirty || projectMetaSaving}
                            className={`px-5 py-2.5 rounded-xl font-extrabold text-sm md:text-base transition ${
                              !projectMetaDirty || projectMetaSaving
                                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-sm'
                            }`}
                          >
                            {projectMetaSaving ? '保存中…' : '💾 請負先・開始日を保存'}
                          </button>
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
                          <div className="font-extrabold text-blue-700">② 確定金額</div>
                          <div className="text-slate-600 mt-1">請求書が届いたら、実際の金額に修正します。変更後は画面下の「💾 保存」を押します。</div>
                        </div>
                        <div className="bg-white rounded-xl border border-emerald-200 p-3.5">
                          <div className="font-extrabold text-emerald-700">③ 原価への反映額</div>
                          <div className="text-slate-600 mt-1">利益・粗利の計算に実際に使われている金額です。</div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3 mt-4 flex-wrap">
                    <p className={`${authRole === 'admin' ? 'text-lg font-bold text-slate-700' : 'text-sm md:text-base text-slate-500'}`}>原価・収支および内訳明細</p>
                    {authRole === 'admin' && (
                      <button onClick={() => downloadLocationExcel(modalLocation)} className="bg-emerald-500 hover:bg-emerald-800 text-white text-xs px-3 py-1.5 rounded-lg font-bold transition shadow-2xs flex items-center gap-1">
                        📊 Excel出力
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>


            {authRole === 'admin' && (
              <div className="sticky top-0 z-40 !mt-0 -mx-6 md:-mx-9 bg-white px-6 md:px-9 py-3.5 border-b border-slate-200 shadow-sm">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="shrink-0 text-sm font-extrabold text-slate-600 mr-1">項目へ移動</span>
                  {[
                    ['detail-summary', '📊 集計結果'],
                    ['detail-expense-labor', '👷 社員'],
                    ['detail-expense-sub', '👥 外注'],
                    ['detail-expense-lease', '🧾 リース'],
                    ['detail-expense-ownMachine', '🚜 自社重機'],
                    ['detail-expense-vehicle', '🚚 自社車両'],
                    ['detail-expense-disposal', '🗑️ 処分費'],
                    ...(modalLocation !== '旧河北郡市クリーンセンター等解体工事(石川県)' ? [['detail-expense-fuel', '⛽ 燃料']] : []),
                    ['detail-expense-etc', '🛣️ ETC'],
                    ['detail-expense-parking', '🅿️ 駐車場'],
                    ['detail-expense-other', '🧮 その他'],
                    ['detail-scrap-card', '♻️ スクラップ'],
                  ].map(([targetId, label]) => (
                    <button
                      key={targetId}
                      type="button"
                      onClick={() => document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                      className="shrink-0 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-extrabold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 現場写真（着工前・完了後） */}
            <div className="rounded-3xl border border-slate-200 bg-slate-50 overflow-hidden">
              <div className="px-5 md:px-6 py-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div>
                  <h3 className="text-lg md:text-xl font-extrabold text-slate-900">📷 現場写真</h3>
                  <p className="text-sm text-slate-500 mt-0.5">着工前・完了後のみ、各3枚まで保存します。</p>
                </div>
              </div>

              <div className="p-4 md:p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                {([
                  { key: 'before', label: '🏗️ 着工前写真', photos: sitePhotos.before },
                  { key: 'after', label: '✅ 完了写真', photos: sitePhotos.after }
                ] as const).map((group) => (
                  <div key={group.key} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-extrabold text-slate-900">{group.label}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{group.photos.length}/3枚</div>
                      </div>

                      {authRole === 'admin' && (
                        <label className={`px-3 py-2 rounded-xl font-extrabold text-sm text-white transition ${
                          group.photos.length >= 3 || sitePhotoUploading !== null
                            ? 'bg-slate-300 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-500 cursor-pointer'
                        }`}>
                          {sitePhotoUploading === group.key ? '送信中…' : '＋ 追加'}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={group.photos.length >= 3 || sitePhotoUploading !== null}
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              e.currentTarget.value = '';
                              if (file) await uploadSitePhoto(group.key, file, modalLocation);
                            }}
                          />
                        </label>
                      )}
                    </div>

                    {sitePhotoLoading ? (
                      <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-500">読み込み中…</div>
                    ) : group.photos.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-400">
                        写真はまだありません
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-2">
                        {group.photos.map((photo: any) => (
                          <div key={photo.path} className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-100 aspect-square group/photo">
                            <a href={photo.url} target="_blank" rel="noreferrer" className="block w-full h-full">
                              <img src={photo.url} alt={group.label} className="w-full h-full object-cover" />
                            </a>

                            {authRole === 'admin' && (
                              <button
                                type="button"
                                onClick={() => deleteSitePhoto(photo.path, modalLocation)}
                                className="absolute top-1.5 right-1.5 w-8 h-8 rounded-full bg-black/70 hover:bg-rose-600 text-white flex items-center justify-center font-black"
                                title="削除"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
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
                  <div className="text-base md:text-lg font-extrabold text-emerald-700">
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

            {authRole === 'admin' ? (
              <div id="detail-summary" className="w-full max-w-4xl mx-auto space-y-3 scroll-mt-24">
                <div>
                  <div className="text-lg md:text-xl font-extrabold text-slate-800">📊 現在の集計結果</div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-slate-50 px-5 py-4 rounded-2xl border border-slate-200 flex items-center justify-between gap-4">
                    <div className="text-sm md:text-base text-slate-700 font-extrabold">請負金額（税抜）</div>
                    <div className="text-xl md:text-2xl font-black text-slate-900 whitespace-nowrap">{formatAmount(modalData.contractPrice)}</div>
                  </div>
                  <div className="bg-blue-50/60 px-5 py-4 rounded-2xl border border-blue-200 flex items-center justify-between gap-4">
                    <div className="text-sm md:text-base text-blue-700 font-extrabold">利益（売却益込）</div>
                    <div className="text-xl md:text-2xl font-black text-blue-700 whitespace-nowrap">{formatAmount(modalData.profit)}</div>
                  </div>
                  <div className="bg-emerald-50/60 px-5 py-4 rounded-2xl border border-emerald-200 md:col-span-2">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div className="text-sm md:text-base text-emerald-800 font-extrabold">合計経費</div>
                      <div className="text-xl md:text-2xl font-black text-emerald-700 whitespace-nowrap">{formatAmount(modalData.total)}</div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-emerald-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm">
                      <span className="font-bold text-slate-600">日報由来の概算＋手動追加分</span>
                      <span className="font-extrabold text-slate-700">{formatAmount(modalData.reportEstimatedTotal)}</span>
                    </div>
                    {Number(modalData.customSubsTotal || 0) > 0 && (
                      <div className="mt-3 rounded-xl border border-orange-200 bg-orange-50/70 px-3.5 py-3">
                        <div className="flex items-center justify-between gap-3 text-xs md:text-sm">
                          <span className="font-extrabold text-orange-900">うち手動追加・一括外注分</span>
                          <span className="font-black text-orange-800 whitespace-nowrap">{formatAmount(modalData.customSubsTotal)}</span>
                        </div>
                        <div className="mt-2 space-y-1.5">
                          {(modalData.customSubsList || []).map((cs: any, csIdx: number) => (
                            <div key={csIdx} className="flex items-start justify-between gap-4 rounded-lg bg-white/80 border border-orange-100 px-3 py-2 text-xs md:text-sm">
                              <div className="min-w-0 text-slate-700">
                                <span className="font-extrabold">{String(cs?.company || '').trim() || '業者未設定'}</span>
                                {String(cs?.task || '').trim() && <span className="text-slate-500"> ／ {cs.task}</span>}
                              </div>
                              <div className="shrink-0 font-extrabold text-orange-800">{formatAmount(Number(cs?.price || 0))}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="bg-amber-50/60 px-5 py-4 rounded-2xl border border-amber-200 md:col-span-2 flex items-center justify-between gap-4">
                    <div className="text-sm md:text-base text-amber-800 font-extrabold">稼働日数</div>
                    <div className="text-xl md:text-2xl font-black text-amber-800 whitespace-nowrap">{modalData.days}日</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5 text-center items-stretch">
                <div className="bg-slate-50 p-4 md:p-6 rounded-2xl border border-slate-200 min-h-[132px] flex flex-col justify-center"><div className="text-sm md:text-lg text-slate-700 font-extrabold">請負金額 (税抜)</div><div className="text-xl md:text-3xl font-bold text-slate-900 mt-1.5">{formatAmount(modalData.contractPrice)}</div></div>
                <div className="bg-emerald-50/60 p-4 md:p-6 rounded-2xl border border-slate-200 min-h-[132px] flex flex-col justify-center">
                  <div className="text-sm md:text-lg text-emerald-700 font-extrabold">合計経費</div>
                  <div className="text-xl md:text-3xl font-bold text-emerald-700 mt-1.5">{formatAmount(modalData.total)}</div>
                </div>
                <div className="bg-blue-50/60 p-4 md:p-6 rounded-2xl border border-slate-200 min-h-[132px] flex flex-col justify-center"><div className="text-sm md:text-lg text-blue-700 font-extrabold">利益（売却益込）</div><div className="text-xl md:text-3xl font-bold text-blue-700 mt-1.5">{formatAmount(modalData.profit)}</div></div>
                <div className="bg-amber-50/60 p-4 md:p-6 rounded-2xl border border-slate-200 min-h-[132px] flex flex-col justify-center"><div className="text-sm md:text-lg text-amber-800 font-extrabold">稼働日数</div><div className="text-xl md:text-3xl font-bold text-amber-800 mt-1.5">{modalData.days}日</div></div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
              <div className="bg-orange-50 p-5 rounded-2xl border border-orange-200 shadow-2xs min-h-[168px] flex flex-col justify-between gap-4">
                <div>
                  <div className="font-extrabold text-orange-900 text-lg">🗑️ 処分費</div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-xl bg-white border border-orange-100 px-3 py-2">
                      <div className="text-xs font-bold text-slate-500">日報由来</div>
                      <div className="mt-1 font-extrabold text-slate-800">{formatAmount(modalData.reportEstimateDisposal)}</div>
                    </div>
                    <div className="rounded-xl bg-white border border-orange-100 px-3 py-2">
                      <div className="text-xs font-bold text-slate-500">確定額</div>
                      <div className="mt-1 font-extrabold text-orange-800">{formatAmount(modalData.disposalCost)}</div>
                    </div>
                  </div>
                </div>
                <button onClick={() => setShowDisposalModal(true)} className="w-full bg-orange-600 hover:bg-orange-700 text-white text-sm px-4 py-2.5 rounded-xl font-bold shadow-xs transition">🔍 内訳を確認</button>
              </div>

              <div id="detail-scrap-card" className="bg-emerald-50 p-5 rounded-2xl border border-emerald-200 shadow-2xs min-h-[168px] flex flex-col justify-between gap-4 scroll-mt-24">
                <div>
                  <div className="font-extrabold text-emerald-900 text-lg">♻️ スクラップ売却計</div>
                  <div className="mt-3 rounded-xl bg-white border border-emerald-100 px-4 py-3">
                    <div className="text-xs font-bold text-slate-500">売却合計</div>
                    <div className="mt-1 text-2xl font-black text-emerald-700">+ {formatAmount(modalData.scrapTotal)}</div>
                  </div>
                </div>
                <button onClick={() => setShowScrapModal(true)} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-sm px-4 py-2.5 rounded-xl font-bold shadow-xs transition">🔍 内訳・金額入力</button>
              </div>

              <div className={`${subcontractorSectionOpen ? 'lg:col-span-3' : ''} bg-amber-50/70 p-5 rounded-2xl border border-amber-200 space-y-4 shadow-2xs min-h-[168px]`}>
              <div 
                className="flex flex-col h-full justify-between gap-4 cursor-pointer select-none"
                onClick={() => setSubcontractorSectionOpen(!subcontractorSectionOpen)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="font-extrabold text-amber-950 text-lg">👥 外注費</div>
                  <span className="text-xs font-extrabold text-amber-800 bg-white border border-amber-200 px-2.5 py-1 rounded-full whitespace-nowrap">
                    {subcontractorSectionOpen ? '▲ 閉じる' : '▼ 詳細'}
                  </span>
                </div>
                <div className="rounded-xl bg-white border border-amber-100 px-4 py-3">
                  <div className="text-xs font-bold text-slate-500">外注費合計</div>
                  <div className="mt-1 text-2xl font-black text-amber-900">{formatAmount(modalData.subCostTotal)}</div>
                </div>
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

            {authRole === 'admin' && (
              <div className="flex items-center gap-3 border-b border-slate-200 pb-3 pt-2">
                <span className="bg-blue-500 text-white text-sm font-extrabold px-3 py-1.5 rounded-lg">STEP 2</span>
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

            <div className="grid grid-cols-1 gap-4 md:gap-5 max-w-5xl w-full mx-auto">
              {[
                { key: 'labor', label: '社員人件費', estimate: modalData.reportEstimateLabor, val: modalData.laborCost, isLabor: true },
                { key: 'sub', label: '外注人件費', estimate: modalData.reportEstimateSubWithCustom, val: modalData.subCostTotal, isSubcontractor: true },
                { key: 'lease', label: 'リース合計', estimate: modalData.reportEstimateLease, val: modalData.leaseCost, isLease: true, isIshikawaSpecial: modalLocation === '旧河北郡市クリーンセンター等解体工事(石川県)' },
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
                  <div id={`detail-expense-${item.key}`} key={item.key} className={`bg-white p-5 md:p-6 rounded-2xl border border-slate-300 shadow-2xs flex flex-col justify-between gap-4 scroll-mt-24 ${item.isDisposal ? 'col-span-full md:col-span-1' : ''}`}>
                    <div className="flex justify-between items-center">
                      <span className={`text-lg md:text-xl font-extrabold ${item.isDisposal ? 'text-orange-700' : 'text-slate-800'}`}>{item.label}</span>
                      <div className="flex items-center gap-2">
                        {item.isLease && (
                          <>
                            <button
                              type="button"
                              onClick={() => setShowIshikawaLeaseModal(true)}
                              className={`${item.isIshikawaSpecial ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-blue-600 hover:bg-blue-500'} text-white text-xs px-2.5 py-1.5 rounded-lg font-bold shadow-xs transition`}
                            >
                              詳細
                            </button>
                            {authRole === 'admin' && (
                              <button
                                type="button"
                                onClick={() => openExpenseInvoiceModal('lease', 'リース')}
                                className="bg-violet-600 hover:bg-violet-500 text-white text-xs px-2.5 py-1.5 rounded-lg font-bold shadow-xs transition"
                              >
                                🧾 請求書照合
                              </button>
                            )}
                          </>
                        )}

                      </div>
                    </div>

                    {['sub', 'lease', 'fuel'].includes(item.key) && (() => {
                      const st = getInvoiceReconcileStatus(modalLocation, item.key);
                      const history = getInvoiceReconcileHistory(modalLocation, item.key);
                      const historyKey = `${modalLocation}__${item.key}`;
                      const isHistoryOpen = !!invoiceHistoryOpen[historyKey];
                      return (
                        <div className="space-y-2">
                          <div className={`rounded-xl px-3 py-2.5 text-xs md:text-sm border ${st ? (st.hadChanges ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-emerald-50 border-emerald-200 text-emerald-800') : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                            {st ? (
                              <div className="space-y-1">
                                <div className="flex items-center justify-between gap-3">
                                  <div className="font-extrabold">{st.applyToCost ? '✅ 請求書確定・原価反映' : (st.hadChanges ? '✏️ 修正あり・照合済み' : '✅ 照合済み')}</div>
                                  {item.isLease && st.applyToCost && authRole === 'admin' && (
                                    <div className="flex shrink-0 items-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => openLeaseInvoiceConfirmedEdit(st)}
                                        className="rounded-lg border border-emerald-300 bg-white px-2.5 py-1 text-xs font-extrabold text-emerald-700 hover:bg-emerald-100"
                                      >
                                        ✏️ 編集
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => deleteLeaseInvoiceConfirmed(st)}
                                        className="rounded-lg border border-red-200 bg-white px-2.5 py-1 text-xs font-extrabold text-red-600 hover:bg-red-50"
                                      >
                                        🗑️ 削除
                                      </button>
                                    </div>
                                  )}
                                </div>
                                <div><span className="font-bold">対象期間：</span>{formatInvoicePeriod(st.startDate, st.endDate)}</div>
                                <div><span className="font-bold">照合日時：</span>{formatInvoiceReconcileTime(st.checkedAt)}</div>
                                {st.company && <div><span className="font-bold">業者：</span>{st.company}</div>}
                                {st.systemAmount !== null && st.systemAmount !== undefined && <div><span className="font-bold">日報由来の概算：</span>{formatAmount(st.systemAmount)}</div>}
                                <div><span className="font-bold">請求書金額：</span>{st.invoiceAmount === null || st.invoiceAmount === undefined ? '—' : formatAmount(st.invoiceAmount)}</div>
                                <div><span className="font-bold">差額：</span>{st.diff === null || st.diff === undefined ? '—' : formatAmount(st.diff)}</div>
                              </div>
                            ) : '○ 未照合'}
                          </div>
                          {history.length > 0 && (
                            <div>
                              <button
                                type="button"
                                onClick={() => setInvoiceHistoryOpen((prev: any) => ({ ...prev, [historyKey]: !prev?.[historyKey] }))}
                                className="text-xs md:text-sm font-extrabold text-blue-700 hover:text-blue-900"
                              >
                                {isHistoryOpen ? '▲ 請求書照合履歴を閉じる' : `▼ 請求書照合履歴（${history.length}件）`}
                              </button>
                              {isHistoryOpen && (
                                <div className="mt-2 rounded-xl border border-slate-200 bg-white divide-y divide-slate-100 max-h-52 overflow-y-auto">
                                  {history.map((h: any) => (
                                    <div key={h.id || `${h.checkedAt}_${h.startDate}_${h.endDate}`} className="px-3 py-2 text-xs md:text-sm">
                                      <div className="font-extrabold text-slate-800">{formatInvoicePeriod(h.startDate, h.endDate)}　{h.applyToCost ? '✅ 請求書確定・原価反映' : (h.hadChanges ? '✏️ 修正あり' : '✅ 照合済み')}</div>
                                      <div className="text-slate-500 mt-0.5">{formatInvoiceReconcileTime(h.checkedAt)}{h.company ? `　${h.company}` : ''}</div>
                                      <div className="text-slate-600 mt-0.5 flex flex-wrap items-center gap-x-1">
                                        {h.systemAmount !== null && h.systemAmount !== undefined && (<>日報由来の概算 {formatAmount(h.systemAmount)} <span>／</span></>)}
                                        <span>請求書</span> {h.invoiceAmount === null || h.invoiceAmount === undefined ? '—' : formatAmount(h.invoiceAmount)} <span>／</span>
                                        <span>差額</span> {h.diff === null || h.diff === undefined ? '—' : formatAmount(h.diff)}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })()}

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
                          <button
                            type="button"
                            onClick={openSubcontractorInvoiceModal}
                            className="w-full rounded-2xl border-2 border-violet-300 bg-violet-600 hover:bg-violet-500 text-white px-4 py-3.5 flex items-center justify-between gap-3 shadow-sm transition"
                          >
                            <div className="text-left">
                              <div className="font-extrabold text-base md:text-lg">🧾 請求書照合</div>
                              <div className="text-xs md:text-sm text-violet-100 mt-0.5">期間と外注業者を選び、使用日ごとに人工数・単価・作業内容を確認／修正</div>
                            </div>
                            <span className="text-xl">›</span>
                          </button>
                          <div className="hidden">
                            <button
                              type="button"
                              onClick={() => setSubcontractorEstimateOpen(!subcontractorEstimateOpen)}
                              className="w-full p-3 md:p-4 flex items-center justify-between gap-3 text-left hover:bg-slate-100 transition"
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <div className="text-sm md:text-base font-extrabold text-slate-700">
                                    概算の内訳
                                  </div>
                                  <span className="text-xs font-bold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                                    {subcontractorEstimateOpen ? '▲ 閉じる' : '▼ 開く'}
                                  </span>
                                </div>
                                <div className="text-xs md:text-sm text-slate-500 mt-0.5">
                                  日報で使用した外注を、業者ごとに集計しています。
                                </div>
                              </div>

                              <div className="shrink-0 text-right">
                                <div className="text-xs text-slate-500">日報合計</div>
                                <div className="text-sm md:text-base font-extrabold text-slate-900">
                                  {formatAmount(modalData.reportEstimateSub || 0)}
                                </div>
                              </div>
                            </button>

                            {subcontractorEstimateOpen && (
                              <div className="px-3 pb-3 md:px-4 md:pb-4 pt-1 border-t border-slate-200">
                            {(modalData.subcontractorBreakdown || []).length > 0 && (
                              <div className="mb-4 rounded-xl border-2 border-violet-200 bg-violet-50/50 p-3 md:p-4">
                                <div className="font-extrabold text-violet-900 text-sm md:text-base">📅 現場別・期間指定 外注単価</div>
                                <div className="text-xs md:text-sm text-violet-700 mt-1 mb-3">
                                  締め日に合わせて「8/21〜9/20」のように自由な期間を指定できます。ここで変更した単価は「{modalLocation}」の指定期間だけに反映し、マスタ単価・他現場には影響しません。
                                </div>

                                {authRole === 'admin' && (
                                  <div className="bg-white rounded-xl border border-violet-200 p-3 mb-4 space-y-3">
                                    <div className="font-extrabold text-slate-800">＋ 新しい期間単価を追加</div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                      <label className="text-sm font-bold text-slate-700">
                                        開始日
                                        <input
                                          type="date"
                                          value={subcontractorPeriodDrafts[modalLocation]?.startDate || ''}
                                          onChange={(e) => handleSubcontractorPeriodDraftChange(modalLocation, 'startDate', e.target.value)}
                                          className="mt-1 w-full p-2.5 border-2 border-violet-300 rounded-lg bg-white font-bold"
                                        />
                                      </label>
                                      <label className="text-sm font-bold text-slate-700">
                                        終了日
                                        <input
                                          type="date"
                                          value={subcontractorPeriodDrafts[modalLocation]?.endDate || ''}
                                          onChange={(e) => handleSubcontractorPeriodDraftChange(modalLocation, 'endDate', e.target.value)}
                                          className="mt-1 w-full p-2.5 border-2 border-violet-300 rounded-lg bg-white font-bold"
                                        />
                                      </label>
                                    </div>

                                    <div className="overflow-x-auto">
                                      <table className="w-full min-w-[620px] text-sm">
                                        <thead>
                                          <tr className="bg-slate-50 text-slate-600 border-b">
                                            <th className="p-2 text-left">業者・作業内容</th>
                                            <th className="p-2 text-right">現在の概算単価</th>
                                            <th className="p-2 text-right">この期間の単価</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                          {(modalData.subcontractorBreakdown || []).map((sub: any) => (
                                            <tr key={sub.key}>
                                              <td className="p-2 font-bold text-slate-800">{sub.company}（{sub.task}）</td>
                                              <td className="p-2 text-right text-slate-500">
                                                {sub.hasMultipleUnitPrices || sub.unitPrice === null ? '複数' : formatAmount(sub.unitPrice)}
                                              </td>
                                              <td className="p-2 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                  <span className="text-violet-500 font-bold">¥</span>
                                                  <input
                                                    type="number"
                                                    value={subcontractorPeriodDrafts[modalLocation]?.prices?.[sub.key] ?? ''}
                                                    onChange={(e) => handleSubcontractorPeriodDraftPriceChange(modalLocation, sub.key, e.target.value)}
                                                    placeholder="変更しない場合は空欄"
                                                    className="w-40 p-2 border-2 border-violet-300 rounded-lg bg-violet-50/40 text-right font-extrabold"
                                                  />
                                                </div>
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                    <div className="flex justify-end">
                                      <button
                                        type="button"
                                        onClick={() => handleAddSubcontractorPeriodUnitPrices(modalLocation, modalData.subcontractorBreakdown || [])}
                                        className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-extrabold"
                                      >
                                        ＋ この期間単価を追加
                                      </button>
                                    </div>
                                  </div>
                                )}

                                <div className="space-y-2">
                                  {(Array.isArray(subcontractorPeriodUnitPrices[modalLocation])
                                    ? subcontractorPeriodUnitPrices[modalLocation]
                                    : [])
                                    .slice()
                                    .sort((a: any, b: any) => String(b.startDate || '').localeCompare(String(a.startDate || '')))
                                    .map((rule: any) => (
                                      <div key={rule.id} className="bg-white rounded-xl border border-violet-200 p-3">
                                        <div className="grid grid-cols-1 lg:grid-cols-[1fr_150px_150px_150px_auto] gap-2 lg:items-center">
                                          <div>
                                            <div className="font-extrabold text-slate-900">{rule.company}（{rule.task}）</div>
                                            <div className="text-xs text-slate-500 mt-0.5">この現場だけの期間単価</div>
                                          </div>
                                          {authRole === 'admin' ? (
                                            <>
                                              <input
                                                type="date"
                                                value={rule.startDate || ''}
                                                onChange={(e) => handleSubcontractorPeriodUnitPriceChange(modalLocation, rule.id, 'startDate', e.target.value)}
                                                className="p-2 border border-violet-300 rounded-lg font-bold"
                                              />
                                              <input
                                                type="date"
                                                value={rule.endDate || ''}
                                                onChange={(e) => handleSubcontractorPeriodUnitPriceChange(modalLocation, rule.id, 'endDate', e.target.value)}
                                                className="p-2 border border-violet-300 rounded-lg font-bold"
                                              />
                                              <div className="flex items-center justify-end gap-1">
                                                <span className="text-violet-500 font-bold">¥</span>
                                                <input
                                                  type="number"
                                                  value={rule.price ?? ''}
                                                  onChange={(e) => handleSubcontractorPeriodUnitPriceChange(modalLocation, rule.id, 'price', e.target.value)}
                                                  className="w-32 p-2 border border-violet-300 rounded-lg text-right font-extrabold"
                                                />
                                              </div>
                                              <button
                                                type="button"
                                                onClick={() => handleDeleteSubcontractorPeriodUnitPrice(modalLocation, rule.id)}
                                                className="px-3 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 font-extrabold border border-red-200"
                                              >
                                                削除
                                              </button>
                                            </>
                                          ) : (
                                            <div className="lg:col-span-4 text-right font-extrabold text-violet-800">
                                              {rule.startDate} 〜 {rule.endDate}　{formatAmount(rule.price || 0)}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  {(Array.isArray(subcontractorPeriodUnitPrices[modalLocation])
                                    ? subcontractorPeriodUnitPrices[modalLocation]
                                    : []).length === 0 && (
                                      <div className="text-sm text-violet-700 bg-white rounded-lg border border-violet-100 p-3">
                                        期間単価はまだ登録されていません。未設定の日は日報保存時の単価（またはマスタ単価）を使用します。
                                      </div>
                                    )}
                                </div>
                                <div className="text-xs text-violet-700 mt-3">
                                  ※ 期間が重なった場合は、後から追加した設定を優先します。旧「月別単価」が保存済みの場合は、期間指定がない日だけ従来設定を引き続き使用します。
                                </div>
                              </div>
                            )}
                            {(modalData.subcontractorBreakdown || []).length === 0 ? (
                              <div className="bg-white rounded-xl border border-slate-200 p-3 text-sm text-slate-500">
                                日報由来の外注費はありません。
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {(modalData.subcontractorBreakdown || []).map((sub: any) => (
                                  <div
                                    key={sub.key}
                                    className="bg-white rounded-xl border border-slate-200 p-3"
                                  >
                                    <div className="grid grid-cols-1 xl:grid-cols-[1fr_auto_auto] gap-2 xl:gap-4 xl:items-center">
                                      <div>
                                        <div className="font-extrabold text-slate-900 text-sm md:text-base">
                                          🏢 {sub.company}（{sub.task}）
                                        </div>
                                        <div className="text-sm text-slate-600 mt-1">
                                          {Number(sub.count || 0).toLocaleString('ja-JP')}人
                                          {' × '}
                                          {sub.hasMultipleUnitPrices || sub.unitPrice === null
                                            ? '単価：複数'
                                            : <>単価 {formatAmount(sub.unitPrice)}</>}
                                          {' ＝ '}
                                          <span className="font-bold text-slate-800">
                                            日報 {formatAmount(sub.reportTotal || 0)}
                                          </span>
                                        </div>
                                      </div>

                                      <div className="text-xs md:text-sm text-slate-500 xl:text-right">
                                        反映額
                                      </div>

                                      <div className="xl:w-[180px]">
                                        {authRole === 'admin' ? (
                                          <div className="flex items-center gap-1">
                                            <span className="text-blue-500 font-bold">¥</span>
                                            <input
                                              type="number"
                                              value={subcontractorDetailOverrides[modalLocation]?.[sub.key] ?? ''}
                                              onChange={(e) =>
                                                handleSubcontractorDetailOverrideChange(
                                                  modalLocation,
                                                  sub.key,
                                                  e.target.value
                                                )
                                              }
                                              placeholder={String(Number(sub.reportTotal || 0))}
                                              className="w-full p-2.5 border-2 border-blue-300 rounded-xl bg-blue-50/40 text-right font-extrabold text-base"
                                            />
                                          </div>
                                        ) : (
                                          <div className="font-extrabold text-blue-700 text-right">
                                            {formatAmount(sub.confirmedTotal || 0)}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            <div className="mt-3 pt-3 border-t border-slate-200 space-y-1.5">
                              <div className="flex justify-between gap-3 text-sm md:text-base">
                                <span className="text-slate-600">日報由来の外注費</span>
                                <span className="font-extrabold text-slate-900">{formatAmount(modalData.reportEstimateSub || 0)}</span>
                              </div>
                              <div className="flex justify-between gap-3 text-sm md:text-base">
                                <span className="text-blue-700 font-bold">業者別修正後</span>
                                <span className="font-extrabold text-blue-700">{formatAmount(modalData.subcontractorConfirmedTotal || 0)}</span>
                              </div>
                              <div className="flex justify-between gap-3 text-sm md:text-base">
                                <span className="text-orange-700 font-bold">＋ 手動追加・一括外注分</span>
                                <span className="font-extrabold text-orange-700">{formatAmount(modalData.customSubsTotal || 0)}</span>
                              </div>
                              <div className="border-t border-slate-200 pt-2 flex justify-between gap-3 text-base md:text-lg">
                                <span className="font-extrabold text-slate-700">外注費 反映前合計</span>
                                <span className="font-extrabold text-slate-900">
                                  {formatAmount((modalData.subcontractorConfirmedTotal || 0) + (modalData.customSubsTotal || 0))}
                                </span>
                              </div>
                            </div>

                            <div className="text-xs md:text-sm text-slate-500 mt-2">
                              ※各業者の「反映額」を変更すると、その金額が外注費の原価計算に使われます。
                              下の「請求書の金額」に全体金額を入力した場合は、そちらを最優先します。
                            </div>
                              </div>
                            )}
                          </div>

                          <div className="hidden">
                            <div className="text-sm md:text-base font-extrabold text-blue-700 mb-2">請求書の金額（違う場合だけ入力）</div>
                            {authRole === 'admin' ? (
                              <div className="flex items-center gap-1 w-full">
                                <span className="text-slate-500 font-bold">¥</span>
                                <input
                                  type="number"
                                  value={costOverrides[modalLocation]?.[item.key] ?? ''}
                                  onChange={(e) => handleCostOverrideChange(modalLocation, item.key, e.target.value)}
                                  placeholder={`未入力：業者別反映後 ${Number((modalData.subcontractorConfirmedTotal || 0) + (modalData.customSubsTotal || 0)).toLocaleString('ja-JP')}円`}
                                  className="w-full p-3 border-2 border-blue-400 rounded-xl font-extrabold text-right bg-blue-50/40 text-lg"
                                />
                              </div>
                            ) : (
                              <div className="text-lg md:text-xl font-bold text-blue-700">
                                {costOverrides[modalLocation]?.[item.key] !== '' && costOverrides[modalLocation]?.[item.key] !== undefined
                                  ? formatAmount(costOverrides[modalLocation][item.key])
                                  : <span className="text-slate-400 text-sm">未入力（概算を使用）</span>}
                              </div>
                            )}
                          </div>

                          <div className="border-t border-slate-200 pt-3">
                            <div className="text-sm md:text-base font-extrabold text-emerald-700">利益計算に使う金額</div>
                            <div className="text-xl md:text-2xl font-extrabold text-emerald-700 mt-1">{formatAmount(item.val || 0)}</div>
                            {authRole === 'admin' && (
                              <div className="text-sm text-slate-500 mt-1.5">
                                ※請求書金額が未入力なら、業者別の反映額＋手動追加分を使います。
                              </div>
                            )}
                          </div>
                        </div>
                      ) : item.isDisposal ? (
                        <div className="space-y-3">
                          <div className="bg-slate-50 rounded-xl border border-slate-200 p-3"><div className="text-sm md:text-base font-bold text-slate-600">日報由来の概算</div><div className="text-xl md:text-2xl font-bold text-slate-900 mt-1">{formatAmount(item.estimate || 0)}</div></div>
                          <div className="bg-blue-50/50 rounded-xl border border-blue-200 p-3"><div className="text-sm md:text-base font-extrabold text-blue-700">確定額（原価に反映）</div><div className="text-lg md:text-xl font-bold text-blue-900 mt-1">{formatAmount(item.val || 0)}</div></div>
                          <button type="button" onClick={() => setShowDisposalModal(true)} className="w-full bg-orange-600 hover:bg-orange-700 text-white py-2.5 rounded-xl font-bold text-sm">🧾 請求書照合</button>
                        </div>
                      ) : item.isIshikawaSpecial ? (
                        <div className="space-y-3">
                          <div className="bg-slate-50 rounded-xl border border-slate-200 p-3">
                            <div className="text-sm md:text-base font-bold text-slate-600">日報由来の概算</div>
                            <div className="text-xl md:text-2xl font-bold text-slate-900 mt-1">{formatAmount(item.estimate || 0)}</div>
                          </div>
                          <div className="border-t border-slate-200 pt-3">
                            <div className="text-sm md:text-base font-extrabold text-emerald-700">利益計算に使う金額</div>
                            <div className="text-xl md:text-2xl font-extrabold text-emerald-700 mt-1">{formatAmount(item.val || 0)}</div>
                            <div className="text-sm text-slate-500 mt-1.5">※未照合月は日報由来の概算、照合済み月は請求書金額を使用します。</div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {item.isLabor && (
                            <div className="rounded-xl border border-slate-200 bg-white p-3">
                              <div className="text-xs md:text-sm font-extrabold text-slate-600 mb-2">
                                👷 入場日数（日報集計）
                              </div>

                              {(modalData.workerAttendance || []).length === 0 ? (
                                <div className="text-xs md:text-sm text-slate-400">
                                  入場した社員はいません。
                                </div>
                              ) : (
                                <div
                                  className={`grid gap-x-4 gap-y-1.5 ${
                                    (modalData.workerAttendance || []).length <= 4
                                      ? 'grid-cols-1'
                                      : (modalData.workerAttendance || []).length <= 8
                                        ? 'grid-cols-2'
                                        : 'grid-cols-2 md:grid-cols-3'
                                  }`}
                                >
                                  {(modalData.workerAttendance || []).map((worker: any) => (
                                    <div
                                      key={worker.name}
                                      className="text-xs md:text-sm text-slate-700 whitespace-nowrap"
                                    >
                                      <span className="font-bold">{worker.name}</span>
                                      <span className="text-slate-400 mx-1">：</span>
                                      <span className="font-extrabold text-slate-900">{worker.days}日</span>
                                      {Number(worker.halfDays || 0) > 0 && (
                                        <span className="font-bold text-blue-700 ml-1">
                                          （半日{Number(worker.halfDays || 0)}回）
                                        </span>
                                      )}
                                      {Number(worker.overtimeHours || 0) > 0 && (
                                        <span className="font-extrabold text-orange-700 ml-1">
                                          ＋残業{Number(worker.overtimeHours || 0)}時間
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          <div className="bg-slate-50 rounded-xl border border-slate-200 p-3">
                            <div className="text-sm md:text-base font-bold text-slate-600">日報由来の概算</div>
                            <div className="text-xl md:text-2xl font-bold text-slate-900 mt-1">{formatAmount(item.estimate || 0)}</div>
                          </div>

                          {['lease', 'fuel'].includes(item.key) && (
                            <button
                              type="button"
                              onClick={() => openExpenseInvoiceModal(item.key, item.label)}
                              className="w-full rounded-2xl border-2 border-blue-300 bg-blue-600 hover:bg-blue-500 text-white px-4 py-3.5 flex items-center justify-between gap-3 shadow-sm transition"
                            >
                              <div className="text-left">
                                <div className="font-extrabold text-base md:text-lg">🧾 請求書照合</div>
                                <div className="text-xs md:text-sm text-blue-100 mt-0.5">期間を選び、使用日ごとの内容・数量・単価・金額を確認／修正</div>
                              </div>
                              <span className="text-xl">›</span>
                            </button>
                          )}

                          <div className="border-t border-slate-200 pt-3">
                            <div className="text-sm md:text-base font-extrabold text-emerald-700">利益計算に使う金額</div>
                            <div className="text-xl md:text-2xl font-extrabold text-emerald-700 mt-1">{formatAmount(item.val || 0)}</div>
                            {authRole === 'admin' && (
                              <div className="text-sm text-slate-500 mt-1.5">
                                {item.key === 'lease'
                                  ? '※未照合月は日報由来の概算、照合済み月は請求書金額を使用します。'
                                  : '※請求書照合で修正した明細だけ、この現場の原価へ反映します。'}
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

            {/* この現場だけの突発的な追加経費 */}
            <div className="rounded-3xl border-2 border-amber-200 bg-amber-50/40 overflow-hidden">
              <div className="px-5 md:px-6 py-4 md:py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-amber-200">
                <div>
                  <h3 className="text-lg md:text-xl font-extrabold text-slate-900">🧾 この現場だけの追加経費</h3>
                  <p className="text-sm md:text-base text-slate-600 mt-1">
                    日報にない突発的な経費があった場合に追加します。入力した金額は合計経費・利益・粗利に反映されます。
                  </p>
                </div>

                {authRole === 'admin' && (
                  <button
                    type="button"
                    onClick={() => handleAddCustomExtraExpense(modalLocation)}
                    className="shrink-0 bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-xl font-extrabold text-base shadow-sm transition"
                  >
                    ＋ 追加
                  </button>
                )}
              </div>

              <div className="p-4 md:p-5 space-y-3">
                {(modalData.customExtraExpenseList || []).length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-amber-300 bg-white/70 px-4 py-5 text-center text-slate-500 text-sm md:text-base">
                    追加経費はありません。
                    {authRole === 'admin' && <span> 必要な場合は「＋ 追加」から入力してください。</span>}
                  </div>
                ) : (
                  (modalData.customExtraExpenseList || []).map((item: any) => (
                    <div
                      key={item.id}
                      className="bg-white rounded-2xl border border-amber-200 p-3 md:p-4"
                    >
                      {authRole === 'admin' ? (
                        <div className="grid grid-cols-1 md:grid-cols-[1fr_220px_auto] gap-3 items-end">
                          <div>
                            <label className="text-sm font-bold text-slate-700 block mb-1.5">内容</label>
                            <input
                              type="text"
                              value={item.label ?? ''}
                              onChange={(e) =>
                                handleCustomExtraExpenseChange(
                                  modalLocation,
                                  item.id,
                                  'label',
                                  e.target.value
                                )
                              }
                              placeholder="例：近隣対策費、緊急修理費、追加運搬費"
                              className="w-full p-3 border border-slate-300 rounded-xl bg-white text-base font-bold"
                            />
                          </div>

                          <div>
                            <label className="text-sm font-bold text-slate-700 block mb-1.5">金額</label>
                            <div className="flex items-center gap-1">
                              <span className="font-bold text-slate-500">¥</span>
                              <input
                                type="number"
                                value={item.amount ?? ''}
                                onChange={(e) =>
                                  handleCustomExtraExpenseChange(
                                    modalLocation,
                                    item.id,
                                    'amount',
                                    e.target.value
                                  )
                                }
                                placeholder="0"
                                className="w-full p-3 border-2 border-amber-300 focus:border-amber-500 outline-none rounded-xl bg-amber-50/30 text-right text-lg font-extrabold"
                              />
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteCustomExtraExpense(modalLocation, item.id)}
                            className="h-[50px] px-4 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-extrabold"
                          >
                            削除
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-4">
                          <div className="font-bold text-slate-800">
                            {item.label || '内容未入力'}
                          </div>
                          <div className="font-extrabold text-lg text-amber-800">
                            {formatAmount(item.amount || 0)}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}

                {(modalData.customExtraExpenseList || []).length > 0 && (
                  <div className="flex items-center justify-between gap-4 rounded-2xl bg-amber-100/70 border border-amber-300 px-4 md:px-5 py-3">
                    <span className="font-extrabold text-amber-900 text-base md:text-lg">
                      追加経費 合計
                    </span>
                    <span className="font-extrabold text-amber-900 text-xl md:text-2xl">
                      {formatAmount(modalData.customExtraExpenseTotal || 0)}
                    </span>
                  </div>
                )}

                {authRole === 'admin' && (
                  <p className="text-xs md:text-sm text-slate-500">
                    ※入力内容は日報そのものには追加されません。この現場の管理用経費として保存されます。変更後は画面下の「💾 保存」を押してください。
                  </p>
                )}
              </div>
            </div>

            <div
              className={`sticky bottom-0 z-30 bg-white/95 backdrop-blur-sm border-t border-slate-200 flex items-center justify-end gap-3 ${
                authRole === 'viewer'
                  ? '-mx-4 md:-mx-10 px-4 md:px-10 py-4'
                  : '-mx-6 md:-mx-9 px-6 md:px-9 py-4'
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
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white'
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

      {/* リース詳細：月別・業者別の原価確認 */}
      {showIshikawaLeaseModal && modalLocation && modalData && (() => {
        const monthlyLeaseSummary = getLeaseMonthlyVendorSummary(modalLocation);
        const totalApplied = monthlyLeaseSummary.reduce((sum: number, row: any) => sum + Number(row.appliedAmount || 0), 0);
        const reconciledCount = monthlyLeaseSummary.filter((row: any) => row.isReconciled).length;
        const unreconciledCount = monthlyLeaseSummary.length - reconciledCount;

        return (
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-md flex items-center justify-center p-3 md:p-6 z-50 animate-fadeIn overflow-y-auto"
            onClick={() => setShowIshikawaLeaseModal(false)}
          >
            <div
              className="bg-white rounded-[28px] w-full max-w-4xl max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-100"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 z-20 bg-white border-b border-slate-200 px-5 md:px-7 py-4 flex justify-between items-start gap-4">
                <div>
                  <h3 className="text-xl md:text-2xl font-extrabold text-slate-900">🧾 リース費用の期間・業者別内訳</h3>
                  <p className="text-xs md:text-sm text-slate-500 mt-1">
                    未照合は「日報由来の概算」、照合済みは指定した請求期間の「請求書金額」を原価として表示します。
                  </p>
                </div>
                <button onClick={() => setShowIshikawaLeaseModal(false)} className="w-10 h-10 shrink-0 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-lg transition">✕</button>
              </div>

              <div className="p-5 md:p-7 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-3xl mx-auto">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="text-xs font-bold text-slate-500">期間・業者の件数</div>
                    <div className="text-xl font-black text-slate-900 mt-1">{monthlyLeaseSummary.length}件</div>
                  </div>
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                    <div className="text-xs font-bold text-emerald-700">照合済み</div>
                    <div className="text-xl font-black text-emerald-700 mt-1">{reconciledCount}件</div>
                  </div>
                  <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3">
                    <div className="text-xs font-bold text-blue-700">利益計算に使うリース原価</div>
                    <div className="text-xl font-black text-blue-800 mt-1">{formatAmount(totalApplied)}</div>
                  </div>
                </div>

                {unreconciledCount > 0 && (
                  <div className="max-w-3xl mx-auto rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 font-bold">
                    ○ 未照合 {unreconciledCount}件は、請求書照合が完了するまで日報由来の概算を原価に使用しています。
                  </div>
                )}

                {monthlyLeaseSummary.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500 font-bold">この現場のリース日報データはありません。</div>
                ) : (
                  <div className="max-w-3xl mx-auto rounded-2xl border border-slate-200 bg-white overflow-hidden divide-y divide-slate-100">
                    {monthlyLeaseSummary.map((row: any) => (
                      <div key={row.key} className="px-4 md:px-5 py-4 grid grid-cols-1 md:grid-cols-[180px_1fr_150px_120px] gap-2 md:gap-4 md:items-center">
                        <div className="text-sm font-extrabold text-slate-700">{row.periodLabel}</div>
                        <div>
                          <div className="font-extrabold text-slate-900">{row.vendor}</div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {row.isReconciled ? (
                              <span className="inline-flex flex-wrap items-center gap-x-1">
                                <span>日報由来の概算</span>
                                <span className="font-bold text-slate-700">{formatAmount(row.estimate)}</span>
                                <span>→</span>
                                <span>請求書金額</span>
                                <span className="font-bold text-slate-700">{formatAmount(row.appliedAmount)}</span>
                              </span>
                            ) : (
                              '日報由来の概算を原価に使用'
                            )}
                          </div>
                        </div>
                        <div className="md:text-right font-black text-lg text-slate-900">{formatAmount(row.appliedAmount)}</div>
                        <div className="md:text-right">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-extrabold ${row.isReconciled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                            {row.isReconciled ? '✅ 照合済み' : '○ 未照合'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="sticky bottom-0 bg-white/95 backdrop-blur border-t border-slate-200 px-5 md:px-7 py-4 flex justify-end">
                <button onClick={() => setShowIshikawaLeaseModal(false)} className="bg-slate-800 hover:bg-slate-900 text-white px-7 py-3 rounded-2xl font-bold text-base transition">閉じる</button>
              </div>
            </div>
          </div>
        );
      })()}

      {showDisposalModal && modalLocation && modalData && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-md flex items-center justify-center p-2 md:p-6 z-50 animate-fadeIn" onClick={() => setShowDisposalModal(false)}>
          <div className="bg-white rounded-[28px] w-full max-w-6xl p-4 md:p-8 !pb-0 max-h-[94vh] overflow-y-auto space-y-6 shadow-2xl border border-slate-100" onClick={(e) => e.stopPropagation()}>
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
                <div className="text-sm font-bold text-blue-700">原価反映額 合計</div>
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
                                  hasInvoiceOverride: false,
                                  rows: []
                                };
                              }
                              summaryByItem[row.item].quantity += Number(row.quantity || 0);
                              summaryByItem[row.item].reportTotal += Number(row.reportTotal || 0);
                              summaryByItem[row.item].confirmedTotal += Number(row.confirmedTotal || 0);
                              summaryByItem[row.item].hasInvoiceOverride =
                                summaryByItem[row.item].hasInvoiceOverride ||
                                (row.invoiceOverride !== '' && row.invoiceOverride !== undefined);
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
                                                  value={summary.hasInvoiceOverride ? formatInputNumber(summary.confirmedTotal) : ''}
                                                  onChange={(e) => handleDisposalMonthlyItemInvoiceChange(
                                                    modalLocation, dLoc, ym, summary.item, summary.rows, e.target.value
                                                  )}
                                                  className="w-36 p-2.5 border border-blue-300 rounded-lg text-right font-extrabold bg-blue-50/40 text-blue-900 text-base"
                                                />
                                              </div>
                                            ) : (
                                              <span className="font-extrabold text-blue-700 text-base md:text-lg">{formatAmount(summary.confirmedTotal)}</span>
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

            <div className="sticky bottom-0 z-20 -mx-4 md:-mx-8 px-4 md:px-8 py-4 bg-white/95 backdrop-blur-sm border-t border-slate-200 flex items-center justify-end gap-3">
              {authRole === 'admin' && (
                <div className="flex items-center gap-3 mr-auto flex-wrap">
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
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white'
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

      {/* 外注以外：カテゴリー共通の請求書照合モーダル */}
      {showExpenseInvoiceModal && expenseInvoiceCategory && modalLocation && authRole === 'admin' && (() => {
        const categoryKey = expenseInvoiceCategory.key;
        const allLines = getExpenseInvoiceLines(modalLocation, categoryKey);
        const { startDate, endDate, vendor } = expenseInvoiceFilter;
        const isLeaseInvoice = categoryKey === 'lease';
        const vendorOptions = isLeaseInvoice
          ? Array.from(new Set(allLines.map((line: any) => String(line.vendor || '未設定')))).sort((a: any, b: any) => String(a).localeCompare(String(b), 'ja'))
          : [];
        const conditionsReady = !!startDate && !!endDate && startDate <= endDate && (!isLeaseInvoice || !!vendor);
        const visibleLines = conditionsReady
          ? allLines.filter((line: any) =>
              line.date >= startDate &&
              line.date <= endDate &&
              (!isLeaseInvoice || String(line.vendor || '未設定') === vendor)
            )
          : [];
        const totalAmount = visibleLines.reduce((sum: number, line: any) => sum + Number(line.amount || 0), 0);
        const dailyEstimateAmount = visibleLines.reduce((sum: number, line: any) => sum + Number(line.baseAmount ?? line.amount ?? 0), 0);
        const reconcileBaseAmount = isLeaseInvoice ? dailyEstimateAmount : totalAmount;
        const invoiceAmountNumber = expenseInvoiceAmount === '' ? null : Number(expenseInvoiceAmount || 0);
        const diff = invoiceAmountNumber === null ? null : invoiceAmountNumber - reconcileBaseAmount;
        const canMarkReconciled = conditionsReady && visibleLines.length > 0 && (!isLeaseInvoice || (invoiceAmountNumber !== null && !Number.isNaN(invoiceAmountNumber) && invoiceAmountNumber >= 0));
        const detailsOpen = isLeaseInvoice ? showExpenseInvoiceDetails : true;

        return (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-2 md:p-5 z-[96]" onClick={() => setShowExpenseInvoiceModal(false)}>
            <div className="bg-white w-full max-w-5xl max-h-[94vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="px-4 md:px-6 py-4 border-b border-slate-200 bg-blue-50 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl md:text-2xl font-extrabold text-slate-900">🧾 {expenseInvoiceCategory.label}・請求書照合</h3>
                  <p className="text-sm text-slate-600 mt-1">
                    {isLeaseInvoice
                      ? '業者と対象期間を選び、日報由来の概算と請求書金額の合計を照合します。月初～月末以外の請求期間にも対応できます。必要な場合だけ明細を開いて個別修正できます。'
                      : 'この現場だけを対象に、期間内の明細を請求書と照らし合わせます。マスタ・他現場・元の日報は変更しません。'}
                  </p>
                </div>
                <button type="button" onClick={() => setShowExpenseInvoiceModal(false)} className="w-10 h-10 shrink-0 rounded-full bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 font-extrabold">✕</button>
              </div>

              <div className="p-4 md:p-6 overflow-y-auto space-y-4">
                {isLeaseInvoice ? (
                  <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-3 rounded-2xl border border-blue-200 bg-blue-50/50 p-4">
                    <label className="text-sm font-extrabold text-slate-700">リース業者
                      <select value={vendor} onChange={(e) => setExpenseInvoiceFilter((prev) => ({ ...prev, vendor: e.target.value }))} className="mt-1 w-full p-2.5 border-2 border-blue-300 rounded-xl bg-white font-bold">
                        <option value="">業者を選択</option>
                        {vendorOptions.map((name:any) => <option key={String(name)} value={String(name)}>{String(name)}</option>)}
                      </select>
                    </label>
                    <label className="text-sm font-extrabold text-slate-700">開始日
                      <input type="date" value={startDate} onChange={(e) => setExpenseInvoiceFilter((prev) => ({ ...prev, startDate: e.target.value }))} className="mt-1 w-full p-2.5 border-2 border-blue-300 rounded-xl bg-white font-bold" />
                    </label>
                    <label className="text-sm font-extrabold text-slate-700">終了日
                      <input type="date" value={endDate} onChange={(e) => setExpenseInvoiceFilter((prev) => ({ ...prev, endDate: e.target.value }))} className="mt-1 w-full p-2.5 border-2 border-blue-300 rounded-xl bg-white font-bold" />
                    </label>
                    <div className="lg:col-span-3 text-xs font-bold text-blue-700 bg-white/80 border border-blue-100 rounded-xl px-3 py-2">
                      対象期間：{startDate && endDate ? formatInvoicePeriod(startDate, endDate) : '開始日と終了日を選択してください'}
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 rounded-2xl border border-blue-200 bg-blue-50/50 p-4">
                    <label className="text-sm font-extrabold text-slate-700">開始日
                      <input type="date" value={startDate} onChange={(e) => setExpenseInvoiceFilter((prev) => ({ ...prev, startDate: e.target.value }))} className="mt-1 w-full p-2.5 border-2 border-blue-300 rounded-xl bg-white font-bold" />
                    </label>
                    <label className="text-sm font-extrabold text-slate-700">終了日
                      <input type="date" value={endDate} onChange={(e) => setExpenseInvoiceFilter((prev) => ({ ...prev, endDate: e.target.value }))} className="mt-1 w-full p-2.5 border-2 border-blue-300 rounded-xl bg-white font-bold" />
                    </label>
                  </div>
                )}

                {!conditionsReady ? (
                  <div className="rounded-2xl border border-dashed border-blue-300 bg-white p-8 text-center text-slate-500 font-bold">{isLeaseInvoice ? 'リース業者・開始日・終了日を選択すると集計結果を表示します。' : '開始日と終了日を選択すると明細を表示します。'}</div>
                ) : visibleLines.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500 font-bold">指定した条件の日報リース明細はありません。</div>
                ) : (
                  <>
                    {isLeaseInvoice ? (
                      <div className="max-w-4xl mx-auto space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <div className="text-xs font-bold text-slate-500">日報由来の概算</div>
                            <div className="text-2xl font-black text-slate-900 mt-1">{formatAmount(dailyEstimateAmount)}</div>
                            <div className="text-xs text-slate-500 mt-1">{visibleLines.length}明細</div>
                          </div>
                          <label className="rounded-2xl border-2 border-blue-300 bg-blue-50 p-4 block">
                            <div className="text-xs font-extrabold text-blue-800">請求書金額（税別・合計）</div>
                            <div className="mt-2 flex items-center gap-2">
                              <span className="font-black text-blue-700 text-lg">¥</span>
                              <input
                                type="number"
                                value={expenseInvoiceAmount}
                                onChange={(e) => setExpenseInvoiceAmount(e.target.value)}
                                placeholder="請求書の合計を入力"
                                className="w-full p-2.5 border-2 border-blue-300 rounded-xl text-right text-xl font-black bg-white"
                              />
                            </div>
                          </label>
                          <div className={`rounded-2xl border p-4 ${diff === null ? 'border-slate-200 bg-white' : diff === 0 ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
                            <div className="text-xs font-bold text-slate-600">差額（請求書 − 概算）</div>
                            <div className={`text-2xl font-black mt-1 ${diff === null ? 'text-slate-400' : diff === 0 ? 'text-emerald-700' : 'text-amber-800'}`}>{diff === null ? '—' : formatAmount(diff)}</div>
                            <div className="text-xs text-slate-500 mt-1">{vendor} ／ {formatInvoicePeriod(startDate, endDate)}</div>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-blue-200 bg-white overflow-hidden">
                          <button
                            type="button"
                            onClick={() => setShowExpenseInvoiceDetails((prev) => !prev)}
                            className="w-full px-4 py-3 flex items-center justify-between gap-4 text-left hover:bg-slate-50"
                          >
                            <div>
                              <div className="font-extrabold text-slate-900">🔍 機械・道具の明細</div>
                              <div className="text-xs text-slate-500 mt-0.5">通常は合計だけで照合できます。差額の確認が必要なときだけ開いてください。</div>
                            </div>
                            <span className="font-extrabold text-blue-700 whitespace-nowrap">{showExpenseInvoiceDetails ? '▲ 閉じる' : `▼ 開く（${visibleLines.length}件）`}</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <div className="text-xs font-bold text-slate-500">現在の明細合計</div>
                          <div className="text-2xl font-extrabold text-slate-900 mt-1">{formatAmount(totalAmount)}</div>
                        </div>
                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                          <div className="text-xs font-bold text-emerald-700">明細数</div>
                          <div className="text-2xl font-extrabold text-emerald-700 mt-1">{visibleLines.length}件</div>
                        </div>
                      </div>
                    )}

                    {detailsOpen && (
                      <div className="overflow-x-auto rounded-2xl border border-slate-200 max-w-4xl mx-auto">
                        <table className="w-full min-w-[820px] text-sm">
                          <thead className="bg-slate-100 text-slate-600">
                            <tr>
                              <th className="py-3 px-3 text-left">日付</th>
                              <th className="py-3 px-3 text-left">内容</th>
                              <th className="py-3 px-3 text-right">数量</th>
                              <th className="py-3 px-3 text-right">単価</th>
                              <th className="py-3 px-3 text-right">金額</th>
                              <th className="py-3 px-3 text-center">修正</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white">
                            {visibleLines.map((line: any) => {
                              const isEditing = expenseInvoiceEditingKey === line.lineKey;
                              const draft = expenseInvoiceDrafts[line.lineKey] || {};
                              return (
                                <tr key={line.lineKey} className={line.hasOverride ? 'bg-amber-50/50' : ''}>
                                  <td className="py-3 px-3 font-bold whitespace-nowrap">{line.date}</td>
                                  <td className="py-3 px-3">
                                    {isEditing ? <input type="text" value={draft.label ?? ''} onChange={(e) => setExpenseInvoiceDrafts((prev:any) => ({ ...prev, [line.lineKey]: { ...(prev[line.lineKey] || {}), label: e.target.value } }))} className="w-full p-2 border-2 border-blue-300 rounded-lg font-bold" /> : <div><span className="font-extrabold text-slate-900">{line.label}</span>{line.hasOverride && <span className="ml-2 text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">修正済み</span>}</div>}
                                  </td>
                                  <td className="py-3 px-3 text-right">
                                    {isEditing ? <input type="number" min="0" step="0.01" value={draft.quantity ?? ''} onChange={(e) => setExpenseInvoiceDrafts((prev:any) => ({ ...prev, [line.lineKey]: { ...(prev[line.lineKey] || {}), quantity: e.target.value } }))} className="w-24 p-2 border-2 border-blue-300 rounded-lg text-right font-bold" /> : <span className="font-extrabold">{Number(line.quantity || 0).toLocaleString('ja-JP', { maximumFractionDigits: 2 })}{line.unitLabel ? ` ${line.unitLabel}` : ''}</span>}
                                  </td>
                                  <td className="py-3 px-3 text-right">
                                    {isEditing ? <div className="flex items-center justify-end gap-1"><span>¥</span><input type="number" min="0" step="0.01" value={draft.unitPrice ?? ''} onChange={(e) => setExpenseInvoiceDrafts((prev:any) => ({ ...prev, [line.lineKey]: { ...(prev[line.lineKey] || {}), unitPrice: e.target.value } }))} className="w-28 p-2 border-2 border-blue-300 rounded-lg text-right font-extrabold" /></div> : <span className="font-bold">{formatAmount(line.unitPrice)}</span>}
                                  </td>
                                  <td className="py-3 px-3 text-right font-extrabold text-slate-900">{isEditing ? formatAmount(Number(draft.quantity || 0) * Number(draft.unitPrice || 0)) : formatAmount(line.amount)}</td>
                                  <td className="py-3 px-3 text-center">
                                    {isEditing ? (
                                      <div className="flex justify-center gap-1.5"><button type="button" onClick={() => saveExpenseInvoiceRow(modalLocation, categoryKey, line)} className="px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white font-extrabold">保存</button><button type="button" onClick={() => setExpenseInvoiceEditingKey(null)} className="px-2.5 py-1.5 rounded-lg bg-slate-200 text-slate-700 font-bold">戻る</button></div>
                                    ) : (
                                      <div className="flex justify-center gap-1.5"><button type="button" onClick={() => startExpenseInvoiceEdit(line)} className="w-9 h-9 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 font-extrabold text-lg" title="この明細を修正">✏️</button>{line.hasOverride && <button type="button" onClick={() => resetExpenseInvoiceRow(modalLocation, categoryKey, line.lineKey)} className="px-2 py-1.5 rounded-lg bg-red-50 text-red-600 font-bold text-xs border border-red-200">元に戻す</button>}</div>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {!isLeaseInvoice && (
                      <div className="rounded-2xl border-2 border-blue-200 bg-blue-50/50 p-4">
                        <div className="grid grid-cols-1 md:grid-cols-[1fr_220px_220px] gap-3 md:items-end">
                          <div><div className="font-extrabold text-blue-900">請求書と照合</div><div className="text-xs md:text-sm text-blue-700 mt-1">請求書の税別金額を入力すると、現在の明細合計との差額を確認できます。入力値は比較用で、原価は上の明細修正で確定します。</div></div>
                          <label className="text-sm font-extrabold text-slate-700">請求書金額（税別）<div className="mt-1 flex items-center gap-1"><span className="font-bold text-blue-600">¥</span><input type="number" value={expenseInvoiceAmount} onChange={(e) => setExpenseInvoiceAmount(e.target.value)} placeholder="請求書の合計" className="w-full p-2.5 border-2 border-blue-300 rounded-xl text-right font-extrabold bg-white" /></div></label>
                          <div className="rounded-xl bg-white border border-blue-200 p-3 text-right"><div className="text-xs text-slate-500 font-bold">差額（請求書 − 現在合計）</div><div className={`text-xl font-extrabold mt-1 ${diff === null ? 'text-slate-400' : diff === 0 ? 'text-emerald-600' : 'text-red-600'}`}>{diff === null ? '—' : formatAmount(diff)}</div></div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="px-4 md:px-6 py-3.5 border-t border-slate-200 bg-white flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className={`text-sm font-bold ${financialDirty ? 'text-orange-600' : 'text-emerald-600'}`}>{financialDirty ? '● 未保存の変更があります' : '✓ 保存済み'}</div>
                <div className="flex gap-2 justify-end flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      markInvoiceReconciled(modalLocation, categoryKey, {
                        startDate: expenseInvoiceFilter.startDate,
                        endDate: expenseInvoiceFilter.endDate,
                        company: categoryKey === 'lease' ? expenseInvoiceFilter.vendor : '',
                        hadChanges: visibleLines.some((line: any) => line.hasOverride),
                        invoiceAmount: invoiceAmountNumber,
                        diff,
                        systemAmount: reconcileBaseAmount,
                        applyToCost: isLeaseInvoice,
                        existingId: isLeaseInvoice ? expenseInvoiceReconcileEditingId : null
                      });
                      if (isLeaseInvoice) setExpenseInvoiceReconcileEditingId(null);
                    }}
                    disabled={!canMarkReconciled}
                    className={`px-4 py-2.5 rounded-xl font-extrabold ${!canMarkReconciled ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-blue-100 text-blue-800 hover:bg-blue-200 border border-blue-200'}`}
                  >
                    {isLeaseInvoice ? (expenseInvoiceReconcileEditingId ? '✓ 確定内容を更新' : '✓ 請求書金額を確定') : '✓ 照合済みにする'}
                  </button>
                  <button type="button" onClick={() => setShowExpenseInvoiceModal(false)} className="px-4 py-2.5 rounded-xl bg-slate-200 text-slate-700 font-extrabold">閉じる</button>
                  <button type="button" onClick={saveFinancialEdits} disabled={!financialDirty || isFinancialSaving} className={`px-5 py-2.5 rounded-xl font-extrabold ${!financialDirty || isFinancialSaving ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}>{isFinancialSaving ? '保存中…' : '💾 変更を保存'}</button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* スクラップ内訳・金額入力モーダル */}
      {showSubcontractorInvoiceModal && modalLocation && authRole === 'admin' && (() => {
        const targetNames = getTargetLocationNames(modalLocation);
        const allInvoiceLines = reports
          .filter((r: any) => targetNames.includes(r.location))
          .flatMap((r: any) =>
            (Array.isArray(r.subcontractors) ? r.subcontractors : []).map((sub: any, subIndex: number) =>
              getEffectiveSubcontractorInvoiceLine(modalLocation, r, sub, subIndex)
            )
          )
          .filter((line: any) => line.date)
          .sort((a: any, b: any) => a.date.localeCompare(b.date));

        const companyOptions = Array.from(new Set(allInvoiceLines.map((line: any) => line.company))).sort((a: any, b: any) =>
          String(a).localeCompare(String(b), 'ja')
        );
        const { startDate, endDate, company } = subcontractorInvoiceFilter;
        const filteredLines = allInvoiceLines.filter((line: any) =>
          (!startDate || line.date >= startDate) &&
          (!endDate || line.date <= endDate) &&
          (!company || line.company === company)
        );
        const conditionsReady = !!startDate && !!endDate && !!company;
        const visibleLines = conditionsReady ? filteredLines : [];
        const totalCount = visibleLines.reduce((sum: number, line: any) => sum + Number(line.count || 0), 0);
        const totalAmount = visibleLines.reduce((sum: number, line: any) => sum + Number(line.amount || 0), 0);
        const invoiceAmountNumber = subcontractorInvoiceAmount === '' ? null : Number(subcontractorInvoiceAmount || 0);
        const diff = invoiceAmountNumber === null ? null : invoiceAmountNumber - totalAmount;
        const overallSubOverride = costOverrides?.[modalLocation]?.sub;
        const hasOverallSubOverride = overallSubOverride !== '' && overallSubOverride !== undefined && overallSubOverride !== null;

        return (
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-2 md:p-5 z-[95]"
            onClick={() => setShowSubcontractorInvoiceModal(false)}
          >
            <div
              className="bg-white w-full max-w-7xl max-h-[94vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-4 md:px-6 py-4 border-b border-slate-200 bg-violet-50 flex items-start justify-between gap-4">
                <div>
                  <div className="text-xl md:text-2xl font-extrabold text-slate-900">🧾 外注人件費・請求書照合</div>
                  <div className="text-sm text-slate-600 mt-1">{modalLocation}</div>
                  <div className="text-xs md:text-sm text-violet-700 font-bold mt-1">日報そのもの・マスタ・他現場は変更せず、この現場の該当明細だけ原価を補正します。</div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSubcontractorInvoiceModal(false)}
                  className="shrink-0 w-10 h-10 rounded-full bg-white border border-slate-300 text-slate-600 hover:bg-slate-100 font-extrabold"
                >
                  ✕
                </button>
              </div>

              <div className="p-4 md:p-6 overflow-y-auto space-y-4">
                <div className="rounded-2xl border-2 border-violet-200 bg-violet-50/50 p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <label className="text-sm font-extrabold text-slate-700">
                      開始日
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setSubcontractorInvoiceFilter((prev) => ({ ...prev, startDate: e.target.value }))}
                        className="mt-1 w-full p-2.5 border-2 border-violet-300 rounded-xl bg-white font-bold"
                      />
                    </label>
                    <label className="text-sm font-extrabold text-slate-700">
                      終了日
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setSubcontractorInvoiceFilter((prev) => ({ ...prev, endDate: e.target.value }))}
                        className="mt-1 w-full p-2.5 border-2 border-violet-300 rounded-xl bg-white font-bold"
                      />
                    </label>
                    <label className="text-sm font-extrabold text-slate-700">
                      外注業者
                      <select
                        value={company}
                        onChange={(e) => setSubcontractorInvoiceFilter((prev) => ({ ...prev, company: e.target.value }))}
                        className="mt-1 w-full p-2.5 border-2 border-violet-300 rounded-xl bg-white font-bold"
                      >
                        <option value="">選択してください</option>
                        {companyOptions.map((name: any) => (
                          <option key={String(name)} value={String(name)}>{String(name)}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  {startDate && endDate && startDate > endDate && (
                    <div className="mt-3 text-sm font-bold text-red-600">終了日は開始日以降を選択してください。</div>
                  )}
                </div>

                {hasOverallSubOverride && (
                  <div className="rounded-2xl border-2 border-orange-300 bg-orange-50 p-4 text-sm text-orange-900">
                    <div className="font-extrabold">⚠ 外注人件費の「請求書の金額」が全体上書きとして入力されています。</div>
                    <div className="mt-1">現在は全体金額 {formatAmount(overallSubOverride)} が最優先です。明細の修正を利益計算へ反映する場合は、詳細分析の外注人件費にある「請求書の金額」を空欄にしてください。</div>
                  </div>
                )}

                {!conditionsReady ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-500 font-bold">
                    開始日・終了日・外注業者を選択すると、その期間に使用した日が一覧表示されます。
                  </div>
                ) : visibleLines.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-500 font-bold">
                    指定した期間に「{company}」を使用した日報はありません。
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="rounded-2xl bg-slate-900 text-white p-4">
                        <div className="text-xs text-slate-300 font-bold">使用日数</div>
                        <div className="text-2xl font-extrabold mt-1">{new Set(visibleLines.map((x: any) => x.date)).size}日</div>
                      </div>
                      <div className="rounded-2xl bg-violet-600 text-white p-4">
                        <div className="text-xs text-violet-100 font-bold">人工合計</div>
                        <div className="text-2xl font-extrabold mt-1">{Number(totalCount || 0).toLocaleString('ja-JP')}人工</div>
                      </div>
                      <div className="rounded-2xl bg-emerald-600 text-white p-4">
                        <div className="text-xs text-emerald-100 font-bold">日報・修正後合計</div>
                        <div className="text-2xl font-extrabold mt-1">{formatAmount(totalAmount)}</div>
                      </div>
                    </div>

                    <div className="overflow-x-auto rounded-2xl border border-slate-200">
                      <table className="w-full min-w-[900px] text-sm">
                        <thead>
                          <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                            <th className="py-3 px-3 text-left">日付</th>
                            <th className="py-3 px-3 text-left">作業内容</th>
                            <th className="py-3 px-3 text-right">人工数</th>
                            <th className="py-3 px-3 text-right">単価</th>
                            <th className="py-3 px-3 text-right">金額</th>
                            <th className="py-3 px-3 text-center w-28">修正</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {visibleLines.map((line: any) => {
                            const isEditing = subcontractorInvoiceEditingKey === line.lineKey;
                            const draft = subcontractorInvoiceDrafts[line.lineKey] || {};
                            return (
                              <tr key={line.lineKey} className={line.hasOverride ? 'bg-amber-50/60' : 'bg-white'}>
                                <td className="py-3 px-3 font-extrabold text-slate-800 whitespace-nowrap">
                                  {line.date}
                                  {line.hasOverride && <div className="text-[11px] text-amber-700 mt-0.5">修正済み</div>}
                                </td>
                                <td className="py-3 px-3">
                                  {isEditing ? (
                                    <input
                                      type="text"
                                      value={draft.task ?? ''}
                                      onChange={(e) => handleSubcontractorInvoiceDraftChange(line.lineKey, 'task', e.target.value)}
                                      className="w-full p-2 border-2 border-violet-300 rounded-lg font-bold"
                                      placeholder="作業内容"
                                    />
                                  ) : (
                                    <span className="font-bold text-slate-800">{line.task}</span>
                                  )}
                                </td>
                                <td className="py-3 px-3 text-right">
                                  {isEditing ? (
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.5"
                                      value={draft.count ?? ''}
                                      onChange={(e) => handleSubcontractorInvoiceDraftChange(line.lineKey, 'count', e.target.value)}
                                      className="w-24 p-2 border-2 border-violet-300 rounded-lg text-right font-bold"
                                    />
                                  ) : (
                                    <span className="font-extrabold">{Number(line.count || 0).toLocaleString('ja-JP')}</span>
                                  )}
                                </td>
                                <td className="py-3 px-3 text-right">
                                  {isEditing ? (
                                    <div className="flex items-center justify-end gap-1">
                                      <span className="text-slate-500">¥</span>
                                      <input
                                        type="number"
                                        min="0"
                                        value={draft.price ?? ''}
                                        onChange={(e) => handleSubcontractorInvoiceDraftChange(line.lineKey, 'price', e.target.value)}
                                        className="w-32 p-2 border-2 border-violet-300 rounded-lg text-right font-extrabold"
                                      />
                                    </div>
                                  ) : (
                                    <span className="font-bold">{formatAmount(line.unitPrice)}</span>
                                  )}
                                </td>
                                <td className="py-3 px-3 text-right font-extrabold text-slate-900">
                                  {isEditing
                                    ? formatAmount((Number(draft.count || 0)) * (Number(draft.price || 0)))
                                    : formatAmount(line.amount)}
                                </td>
                                <td className="py-3 px-3 text-center">
                                  {isEditing ? (
                                    <div className="flex items-center justify-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => saveSubcontractorInvoiceRow(modalLocation, line)}
                                        className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold"
                                      >
                                        保存
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setSubcontractorInvoiceEditingKey(null)}
                                        className="px-2.5 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold"
                                      >
                                        戻る
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => startSubcontractorInvoiceEdit(line)}
                                        className="w-9 h-9 rounded-lg bg-violet-100 hover:bg-violet-200 text-violet-700 font-extrabold text-lg"
                                        title="この明細を修正"
                                      >
                                        ✏️
                                      </button>
                                      {line.hasOverride && (
                                        <button
                                          type="button"
                                          onClick={() => resetSubcontractorInvoiceRow(modalLocation, line.lineKey)}
                                          className="px-2 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs border border-red-200"
                                        >
                                          元に戻す
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="rounded-2xl border-2 border-blue-200 bg-blue-50/50 p-4">
                      <div className="grid grid-cols-1 md:grid-cols-[1fr_220px_220px] gap-3 md:items-end">
                        <div>
                          <div className="font-extrabold text-blue-900">請求書と照合</div>
                          <div className="text-xs md:text-sm text-blue-700 mt-1">請求書の税別金額を入力すると、現在の明細合計との差額を確認できます。ここへの入力は比較用で、原価は上の明細修正で確定します。</div>
                        </div>
                        <label className="text-sm font-extrabold text-slate-700">
                          請求書金額（税別）
                          <div className="mt-1 flex items-center gap-1">
                            <span className="font-bold text-blue-600">¥</span>
                            <input
                              type="number"
                              value={subcontractorInvoiceAmount}
                              onChange={(e) => setSubcontractorInvoiceAmount(e.target.value)}
                              placeholder="請求書の合計"
                              className="w-full p-2.5 border-2 border-blue-300 rounded-xl text-right font-extrabold bg-white"
                            />
                          </div>
                        </label>
                        <div className="rounded-xl bg-white border border-blue-200 p-3 text-right">
                          <div className="text-xs text-slate-500 font-bold">差額（請求書 − 現在合計）</div>
                          <div className={`text-xl font-extrabold mt-1 ${diff === null ? 'text-slate-400' : diff === 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {diff === null ? '—' : formatAmount(diff)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="px-4 md:px-6 py-3.5 border-t border-slate-200 bg-white flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className={`text-sm font-bold ${financialDirty ? 'text-orange-600' : 'text-emerald-600'}`}>
                  {financialDirty ? '● 未保存の変更があります' : '✓ 保存済み'}
                </div>
                <div className="flex gap-2 justify-end flex-wrap">
                  <button
                    type="button"
                    onClick={() => markInvoiceReconciled(modalLocation, 'sub', {
                      startDate,
                      endDate,
                      company,
                      hadChanges: visibleLines.some((line: any) => line.hasOverride),
                      invoiceAmount: invoiceAmountNumber,
                      diff
                    })}
                    disabled={!conditionsReady || startDate > endDate}
                    className={`px-4 py-2.5 rounded-xl font-extrabold ${(!conditionsReady || startDate > endDate) ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-violet-100 text-violet-800 hover:bg-violet-200 border border-violet-200'}`}
                  >
                    ✓ 照合済みにする
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSubcontractorInvoiceModal(false)}
                    className="px-4 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-extrabold"
                  >
                    閉じる
                  </button>
                  <button
                    type="button"
                    onClick={saveFinancialEdits}
                    disabled={!financialDirty || isFinancialSaving}
                    className={`px-5 py-2.5 rounded-xl font-extrabold ${!financialDirty || isFinancialSaving ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}
                  >
                    {isFinancialSaving ? '保存中…' : '💾 変更を保存'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {showScrapModal && modalLocation && modalData && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-md flex items-center justify-center p-3 md:p-6 z-50 animate-fadeIn" onClick={() => setShowScrapModal(false)}>
          <div className="bg-white rounded-[32px] w-full max-w-4xl p-6 md:p-10 !pb-0 max-h-[92vh] overflow-y-auto space-y-6 shadow-2xl border border-slate-100" onClick={(e) => e.stopPropagation()}>
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
                  <span className="text-emerald-700 font-bold text-lg">+ ¥</span>
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
                <h4 className="font-bold text-lg text-slate-800">📋 月別スクラップ搬出明細</h4>
                <p className="text-sm text-slate-500">
                  月ごと・スクラップ場ごとに搬出内容を確認し、仕切り書が届いたら「仕切り書 月合計」を入力してください。
                  日別の「売却金額」は上部の「♻️ スクラップ確認表」と同じデータです。
                </p>

                {(() => {
                  const monthlyData = getLocationMonthlyScrapData(modalLocation);
                  const monthEntries = Object.entries(monthlyData).sort(([a], [b]) => b.localeCompare(a));

                  if (monthEntries.length === 0) {
                    return (
                      <p className="text-base text-slate-500 text-center py-8">
                        スクラップ搬出データはありません
                      </p>
                    );
                  }

                  return (
                    <div className="space-y-6">
                      {monthEntries.map(([ym, monthData]: any) => {
                        const [y, m] = ym.split('-');

                        return (
                          <div key={ym} className="rounded-3xl border border-emerald-200 bg-emerald-50/30 overflow-hidden">
                            <div className="px-4 md:px-5 py-3 bg-emerald-800 text-white">
                              <div className="font-extrabold text-lg">
                                📅 {y}年{Number(m)}月
                              </div>
                            </div>

                            <div className="p-4 md:p-5 space-y-4">
                              {Object.entries(monthData.sites || {}).map(([scrapSite, siteData]: any) => (
                                <div key={scrapSite} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                                  <div className="p-4 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                                    <div>
                                      <h5 className="font-extrabold text-slate-900 text-base md:text-lg">
                                        ♻️ {scrapSite}
                                      </h5>
                                      <div className="text-sm text-slate-600 mt-1">
                                        搬出数量：
                                        {Object.entries(siteData.quantityByUnit || {}).map(([unit, qty], idx) => (
                                          <span key={unit}>
                                            {idx > 0 && ' / '}
                                            <b>{Number(qty).toLocaleString('ja-JP')} {unit}</b>
                                          </span>
                                        ))}
                                      </div>
                                    </div>

                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                      <div className="text-sm text-slate-600">
                                        日別入力合計：
                                        <span className="font-extrabold text-emerald-700 ml-1">
                                          {formatAmount(siteData.rowSaleTotal || 0)}
                                        </span>
                                      </div>

                                      <div className="flex items-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-300 px-3 py-2">
                                        <span className="text-sm font-extrabold text-emerald-700 whitespace-nowrap">
                                          仕切り書 月合計
                                        </span>
                                        <span className="font-bold text-emerald-700">¥</span>
                                        {authRole === 'admin' ? (
                                          <input
                                            type="number"
                                            value={monthlyScrapStatementTotals[siteData.statementKey] ?? ''}
                                            onChange={(e) =>
                                              handleMonthlyScrapStatementTotalChange(
                                                siteData.statementKey,
                                                e.target.value
                                              )
                                            }
                                            placeholder={String(Number(siteData.rowSaleTotal || 0))}
                                            className="w-36 p-2 border border-emerald-400 rounded-lg text-right font-extrabold bg-white"
                                          />
                                        ) : (
                                          <span className="font-extrabold text-emerald-900">
                                            {formatAmount(siteData.statementTotal || 0, false)}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="overflow-x-auto">
                                    <table className="w-full min-w-[760px] text-left border-collapse text-sm md:text-base">
                                      <thead>
                                        <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-extrabold">
                                          <th className="py-2.5 px-3">日付</th>
                                          <th className="py-2.5 px-3">品目</th>
                                          <th className="py-2.5 px-3 text-right">数量</th>
                                          <th className="py-2.5 px-3 text-right">売却金額</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-200">
                                        {(siteData.rows || []).map((row: any) => (
                                          <tr key={row.rowKey} className="bg-white hover:bg-emerald-50/40">
                                            <td className="py-3 px-3 font-bold">{row.displayDate}</td>
                                            <td className="py-3 px-3">{row.item}</td>
                                            <td className="py-3 px-3 text-right font-bold">
                                              {Number(row.quantity || 0).toLocaleString('ja-JP')} {row.unit}
                                            </td>
                                            <td className="py-3 px-3 text-right">
                                              {authRole === 'admin' ? (
                                                <div className="flex items-center justify-end gap-1">
                                                  <span className="text-emerald-600 font-bold">¥</span>
                                                  <input
                                                    type="number"
                                                    value={scrapRowOverrides[row.rowKey] ?? ''}
                                                    onChange={(e) =>
                                                      handleScrapRowOverrideChange(
                                                        row.rowKey,
                                                        e.target.value
                                                      )
                                                    }
                                                    placeholder="売却額"
                                                    className="w-36 p-2 border border-emerald-300 rounded-lg text-right font-extrabold bg-emerald-50/40 text-emerald-900"
                                                  />
                                                </div>
                                              ) : (
                                                <span className="font-extrabold text-emerald-700">
                                                  {formatAmount(row.saleAmount || 0)}
                                                </span>
                                              )}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>

                                  <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 text-xs md:text-sm text-slate-500">
                                    ※「仕切り書 月合計」を入力した場合、その金額がこの月・このスクラップ場の売却確定額として最終粗利に反映されます。
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="sticky bottom-0 z-20 -mx-6 md:-mx-10 px-6 md:px-10 py-4 bg-white/95 backdrop-blur-sm border-t border-slate-200 flex items-center justify-end gap-3">
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
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white'
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
