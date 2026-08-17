/**
 * types/dailyReport.ts
 * --------------------------------------------------------------
 * 株式会社大和「日報原本」をもとに設計した日報データ構造。
 *
 * 元Excel（_日報原本_最新版）は原価管理（人件費・外注費・処分費・
 * 重機レンタル代など）が中心で、天候・作業内容・安全事項のような
 * 記述式の日報項目は含まれていません。
 * そこで、Excel内にある基本情報（現場名 / 現場責任者 / 日付 / 作業員構成）
 * をベースに、音声入力アプリとして必要な「作業内容・進捗」「安全・管理」
 * 「現場写真」の3カテゴリを追加して設計しています。
 *
 * この型は
 *   1) Claude APIへ渡すJSON生成のスキーマ（システムプロンプト内で参照）
 *   2) フロントの確認・修正フォームの型
 * の両方で共通利用します。
 * --------------------------------------------------------------
 */

/** 天候の選択肢（現場の記録として一般的なもの） */
export type Weather = "晴れ" | "曇り" | "雨" | "雪" | "強風" | "その他";

/** 廃材の種類ごとの搬出量。Excelの「処分費」シートの品目（コンガラ・木くず等）を踏襲 */
export interface WasteItem {
  /** 品目名（例: コンガラ(t) / 木くず(t) / 混合(m3) / 残土(車) など） */
  type: string;
  /** 数量 */
  amount: number;
  /** 単位（トン・立米・車 など） */
  unit: "t" | "m3" | "車" | "kg" | "枚" | "その他";
}

/** 搬出トラックの情報。Excelの「車両費」項目に対応 */
export interface TruckEntry {
  /** 車種（例: 4tダンプ、2tユニック 等） */
  vehicleType: string;
  /** 台数 */
  count: number;
}

/** 現場写真1枚分のデータ */
export interface SitePhoto {
  /** クライアント側で採番する一意ID */
  id: string;
  /** 画像データ（プレビュー用 base64 data URL、送信時はAPIへ渡す） */
  imageDataUrl: string;
  /** AIが画像から自動生成したキャプション（日本語、現場写真として適切な説明文） */
  aiCaption: string;
  /** 撮影時刻（ISO文字列） */
  takenAt: string;
};

/** 日報全体のデータ構造 */
export interface DailyReport {
  /** レポート一意ID（クライアント側でuuid等を生成） */
  reportId: string;

  /** ---------------- 基本情報（Excel: 日付 / 現場責任者 等） ---------------- */
  basicInfo: {
    /** 日付（YYYY-MM-DD） */
    date: string;
    /** 天候 */
    weather: Weather;
    /** 現場名（Excel「現場名」セル） */
    siteName: string;
    /** 現場住所 */
    siteAddress: string;
    /** 作業責任者名（Excel「現場責任者」セル） */
    siteManager: string;
    /** 作業員名（複数、Excel「大和 人工数」オペレーター/解体/土工/運転手/鳶/ガス/斫り等の職種を含めてもよい） */
    workerNames: string[];
    /** 作業員人数 */
    workerCount: number;
  };

  /** ---------------- 作業内容・進捗 ---------------- */
  workProgress: {
    /** 本日の作業内容（自由記述、音声からAIが要約・整形） */
    workDescription: string;
    /** 廃材搬出量（複数品目） */
    wasteItems: WasteItem[];
    /** 搬出トラック車種・台数 */
    trucks: TruckEntry[];
    /** 進捗率（0-100） */
    progressPercent: number;
  };

  /** ---------------- 安全・管理 ---------------- */
  safety: {
    /** 事故・ヒヤリハット・KY（危険予知）事項 */
    incidentsAndKY: string;
    /** 現場連絡・特記事項 */
    siteNotes: string;
    /** 明日の作業予定 */
    nextDayPlan: string;
  };

  /** ---------------- 現場写真 ---------------- */
  photos: SitePhoto[];

  /** ---------------- メタ情報 ---------------- */
  meta: {
    /** 作成日時（ISO文字列） */
    createdAt: string;
    /** 入力方法 */
    inputMethod: "voice" | "manual" | "mixed";
    /** AIが自動生成した内容を含むか */
    aiGenerated: boolean;
    /** 作業員が手修正したかどうか（送信前にフォームで編集された場合true） */
    manuallyEdited: boolean;
  };
}

/**
 * 新規日報の空データを生成するヘルパー。
 * 音声入力前の初期状態や、AI生成が失敗した場合のフォールバックに使用。
 */
export function createEmptyDailyReport(overrides?: Partial<DailyReport>): DailyReport {
  const now = new Date();
  return {
    reportId: crypto.randomUUID(),
    basicInfo: {
      date: now.toISOString().slice(0, 10),
      weather: "晴れ",
      siteName: "",
      siteAddress: "",
      siteManager: "",
      workerNames: [],
      workerCount: 0,
    },
    workProgress: {
      workDescription: "",
      wasteItems: [],
      trucks: [],
      progressPercent: 0,
    },
    safety: {
      incidentsAndKY: "",
      siteNotes: "",
      nextDayPlan: "",
    },
    photos: [],
    meta: {
      createdAt: now.toISOString(),
      inputMethod: "manual",
      aiGenerated: false,
      manuallyEdited: false,
    },
    ...overrides,
  };
}

/**
 * サイトプロフィール（現場名・住所・責任者など、日ごとに変わらない情報）
 * を端末に保存しておき、毎回の音声入力の負担を減らすための補助型。
 */
export interface SiteProfile {
  siteName: string;
  siteAddress: string;
  siteManager: string;
}
