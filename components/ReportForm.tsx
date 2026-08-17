"use client";

/**
 * components/ReportForm.tsx
 * --------------------------------------------------------------
 * AIが自動生成した DailyReport をその場で確認・手修正するフォーム。
 * スマホでの入力負担を減らすため、テキストは大きめのtextarea、
 * 数値はnumber inputで最小限のタップ操作に留めている。
 * --------------------------------------------------------------
 */

import type { DailyReport, TruckEntry, WasteItem, Weather } from "@/types/dailyReport";

const WEATHER_OPTIONS: Weather[] = ["晴れ", "曇り", "雨", "雪", "強風", "その他"];

interface ReportFormProps {
  report: DailyReport;
  onChange: (report: DailyReport) => void;
  onSubmit: () => void;
  onBack: () => void;
  isSubmitting?: boolean;
}

export default function ReportForm({
  report,
  onChange,
  onSubmit,
  onBack,
  isSubmitting,
}: ReportFormProps) {
  const update = (patch: Partial<DailyReport>) =>
    onChange({ ...report, ...patch, meta: { ...report.meta, manuallyEdited: true } });

  const updateWasteItem = (index: number, patch: Partial<WasteItem>) => {
    const items = [...report.workProgress.wasteItems];
    items[index] = { ...items[index], ...patch };
    update({ workProgress: { ...report.workProgress, wasteItems: items } });
  };

  const updateTruck = (index: number, patch: Partial<TruckEntry>) => {
    const trucks = [...report.workProgress.trucks];
    trucks[index] = { ...trucks[index], ...patch };
    update({ workProgress: { ...report.workProgress, trucks } });
  };

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 pb-28">
      <Section title="基本情報">
        <Field label="日付">
          <input
            type="date"
            className="input"
            value={report.basicInfo.date}
            onChange={(e) =>
              update({ basicInfo: { ...report.basicInfo, date: e.target.value } })
            }
          />
        </Field>
        <Field label="天候">
          <div className="flex flex-wrap gap-2">
            {WEATHER_OPTIONS.map((w) => (
              <button
                type="button"
                key={w}
                onClick={() => update({ basicInfo: { ...report.basicInfo, weather: w } })}
                className={`chip ${report.basicInfo.weather === w ? "chip-active" : ""}`}
              >
                {w}
              </button>
            ))}
          </div>
        </Field>
        <Field label="現場名">
          <input
            className="input"
            value={report.basicInfo.siteName}
            onChange={(e) =>
              update({ basicInfo: { ...report.basicInfo, siteName: e.target.value } })
            }
          />
        </Field>
        <Field label="現場住所">
          <input
            className="input"
            value={report.basicInfo.siteAddress}
            onChange={(e) =>
              update({ basicInfo: { ...report.basicInfo, siteAddress: e.target.value } })
            }
          />
        </Field>
        <Field label="作業責任者名">
          <input
            className="input"
            value={report.basicInfo.siteManager}
            onChange={(e) =>
              update({ basicInfo: { ...report.basicInfo, siteManager: e.target.value } })
            }
          />
        </Field>
        <Field label="作業員名（カンマ区切り）">
          <input
            className="input"
            value={report.basicInfo.workerNames.join("、")}
            onChange={(e) =>
              update({
                basicInfo: {
                  ...report.basicInfo,
                  workerNames: e.target.value.split(/[、,]/).map((s) => s.trim()).filter(Boolean),
                },
              })
            }
          />
        </Field>
        <Field label="人数">
          <input
            type="number"
            min={0}
            className="input"
            value={report.basicInfo.workerCount}
            onChange={(e) =>
              update({
                basicInfo: { ...report.basicInfo, workerCount: Number(e.target.value) },
              })
            }
          />
        </Field>
      </Section>

      <Section title="作業内容・進捗">
        <Field label="本日の作業内容">
          <textarea
            className="input min-h-[100px]"
            value={report.workProgress.workDescription}
            onChange={(e) =>
              update({
                workProgress: { ...report.workProgress, workDescription: e.target.value },
              })
            }
          />
        </Field>

        <Field label="廃材搬出量">
          {report.workProgress.wasteItems.map((item, i) => (
            <div key={i} className="mb-2 flex gap-2">
              <input
                className="input flex-1"
                placeholder="品目（例: コンガラ）"
                value={item.type}
                onChange={(e) => updateWasteItem(i, { type: e.target.value })}
              />
              <input
                type="number"
                className="input w-20"
                value={item.amount}
                onChange={(e) => updateWasteItem(i, { amount: Number(e.target.value) })}
              />
              <span className="flex items-center text-sm text-slate-500">{item.unit}</span>
            </div>
          ))}
          <button
            type="button"
            className="text-sm text-brand underline"
            onClick={() =>
              update({
                workProgress: {
                  ...report.workProgress,
                  wasteItems: [
                    ...report.workProgress.wasteItems,
                    { type: "", amount: 0, unit: "t" },
                  ],
                },
              })
            }
          >
            ＋ 品目を追加
          </button>
        </Field>

        <Field label="搬出トラック">
          {report.workProgress.trucks.map((truck, i) => (
            <div key={i} className="mb-2 flex gap-2">
              <input
                className="input flex-1"
                placeholder="車種（例: 4tダンプ）"
                value={truck.vehicleType}
                onChange={(e) => updateTruck(i, { vehicleType: e.target.value })}
              />
              <input
                type="number"
                className="input w-20"
                value={truck.count}
                onChange={(e) => updateTruck(i, { count: Number(e.target.value) })}
              />
              <span className="flex items-center text-sm text-slate-500">台</span>
            </div>
          ))}
          <button
            type="button"
            className="text-sm text-brand underline"
            onClick={() =>
              update({
                workProgress: {
                  ...report.workProgress,
                  trucks: [...report.workProgress.trucks, { vehicleType: "", count: 0 }],
                },
              })
            }
          >
            ＋ 車両を追加
          </button>
        </Field>

        <Field label={`進捗率: ${report.workProgress.progressPercent}%`}>
          <input
            type="range"
            min={0}
            max={100}
            value={report.workProgress.progressPercent}
            onChange={(e) =>
              update({
                workProgress: {
                  ...report.workProgress,
                  progressPercent: Number(e.target.value),
                },
              })
            }
            className="w-full accent-brand"
          />
        </Field>
      </Section>

      <Section title="安全・管理">
        <Field label="事故・ヒヤリハット・KY事項">
          <textarea
            className="input min-h-[80px]"
            value={report.safety.incidentsAndKY}
            onChange={(e) => update({ safety: { ...report.safety, incidentsAndKY: e.target.value } })}
          />
        </Field>
        <Field label="現場連絡・特記事項">
          <textarea
            className="input min-h-[80px]"
            value={report.safety.siteNotes}
            onChange={(e) => update({ safety: { ...report.safety, siteNotes: e.target.value } })}
          />
        </Field>
        <Field label="明日の作業予定">
          <textarea
            className="input min-h-[80px]"
            value={report.safety.nextDayPlan}
            onChange={(e) => update({ safety: { ...report.safety, nextDayPlan: e.target.value } })}
          />
        </Field>
      </Section>

      <Section title={`現場写真（${report.photos.length}枚）`}>
        <div className="grid grid-cols-1 gap-3">
          {report.photos.map((photo, i) => (
            <div key={photo.id} className="flex gap-3 rounded-lg border border-slate-200 p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.imageDataUrl}
                alt="現場写真"
                className="h-20 w-20 shrink-0 rounded-md object-cover"
              />
              <textarea
                className="input min-h-[80px] flex-1"
                value={photo.aiCaption}
                onChange={(e) => {
                  const photos = [...report.photos];
                  photos[i] = { ...photos[i], aiCaption: e.target.value };
                  update({ photos });
                }}
              />
            </div>
          ))}
          {report.photos.length === 0 && (
            <p className="text-sm text-slate-500">写真はありません。</p>
          )}
        </div>
      </Section>

      <div className="fixed inset-x-0 bottom-0 flex gap-3 border-t border-slate-200 bg-white p-4">
        <button type="button" onClick={onBack} className="btn-secondary flex-1">
          戻る
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting}
          className="btn-primary flex-[2]"
        >
          {isSubmitting ? "送信中…" : "この内容で日報を確定する"}
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-base font-bold text-slate-800">{title}</h2>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}
