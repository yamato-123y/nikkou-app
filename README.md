# 音声日報アプリ（プロトタイプ）

株式会社大和の解体現場向け、**「話すだけ・撮るだけ」で日報を作成できる**モバイルWebアプリのプロトタイプです（Next.js 14 / React / Tailwind CSS / Claude API）。

## 添付Excelとの対応関係について（重要）

添付いただいた `_日報原本_最新版_コピーして使う.xlsm` を確認したところ、このシートは
**原価管理表**（人件費・外注費・処分費・重機レンタル代などの日次コスト集計）が中心で、
天候・作業内容・安全事項のような「文章で記録する日報」項目は含まれていませんでした。

含まれていた基本情報は次の項目です。

| Excel上の項目 | 本アプリでの対応 |
|---|---|
| 日付 | `basicInfo.date` |
| 現場名 | `basicInfo.siteName` |
| 現場責任者 | `basicInfo.siteManager` |
| 大和 人工数（オペレーター/解体/土工/運転手/鳶/ガス/斫り 等） | `basicInfo.workerNames` / `workerCount` |
| 車両費・処分費（廃材品目：コンガラ/木くず/混合/残土 等） | `workProgress.wasteItems` / `workProgress.trucks` |
| 建物構造・坪数 | 拡張可（現状のプロトタイプ範囲外） |

ご要望にあった「天候」「現場住所」「本日の作業内容」「進捗率」「事故・ヒヤリハット・KY」
「現場連絡・特記事項」「明日の作業予定」「現場写真」は、Excel側に該当項目がなかったため、
音声日報アプリとして必要な項目として**新規に追加設計**しています（`types/dailyReport.ts` 参照）。

原価計算部分（人件費・外注費・処分費の金額集計）は現状のExcelで運用が確立しているため、
本プロトタイプでは対象外とし、必要であれば別途、日報JSONを既存Excelへ書き出す連携機能を
追加する形を想定しています。

## 構成

```
nikkou-app/
├── types/dailyReport.ts        # DailyReport型定義（要求仕様の①に対応）
├── lib/systemPrompt.ts         # AIシステムプロンプト（要求仕様の①に対応）
├── app/api/generate-report/route.ts  # Claude API呼び出し（音声＋写真→JSON）
├── app/page.tsx                # メイン画面（要求仕様の②）
├── components/VoiceRecorder.tsx   # 録音開始ボタン（Web Speech API）
├── components/PhotoCapture.tsx    # 写真を撮るボタン
├── components/ReportForm.tsx      # AI生成結果の確認・修正フォーム
└── app/globals.css / tailwind.config.ts  # スマホ向けUIスタイル
```

## 画面の流れ

1. **ホーム画面**：「録音開始」「写真を撮る」「送信（AI日報生成）」の3つの大きなボタンのみ。
   - 現場名・住所・責任者は「現場設定」に一度登録しておけば毎回話す必要がありません（localStorage保存）。
2. 作業員が話した内容はブラウザの音声認識（Web Speech API, `ja-JP`）でリアルタイムに文字起こし。
3. 現場写真は複数枚撮影可能。カメラは `<input type="file" capture="environment">` でスマホの標準カメラを起動（追加ライブラリ不要）。
4. 「送信」を押すと、文字起こしテキストと写真を `/api/generate-report` に送信し、
   Claude APIが `DailyReport` 型のJSONを生成（画像に対する自動キャプションも同時生成）。
5. 生成結果は**確認・修正フォーム**で表示され、内容を手直ししてから最終送信できます。

## セットアップ

```bash
npm install
cp .env.local.example .env.local   # ANTHROPIC_API_KEY を設定
npm run dev
```

`http://localhost:3000` にスマホ（同一ネットワーク）またはPCブラウザでアクセスしてください。
カメラ・マイクを利用するため、本番運用時は **HTTPS** 配信が必須です（localhostは例外）。

## 本番化に向けた既知の制約・TODO

- **Web Speech APIの対応状況**：Chrome系ブラウザは対応済みですが、Safari/iOSでは挙動が不安定な場合があります。
  非対応環境向けに、録音した音声ファイルをサーバーへ送りWhisper等でサーバーサイド文字起こしするフォールバックを推奨します。
- **送信後の保存先が未実装**：現状 `handleFinalSubmit` はコンソール出力のみです。実運用では
  社内DB／スプレッドシート（Google Sheets API等）／既存Excel運用へのエクスポート機能を追加してください。
- **オフライン対応**：解体現場は電波が弱い場合があるため、PWA化・オフラインキューイングの追加を推奨します。
- **認証**：現状ログイン機能がありません。作業員ごとのアカウント管理が必要な場合は追加実装が必要です。
- **モデルID**：`app/api/generate-report/route.ts` 内の `MODEL_ID` は最新のAnthropicドキュメントを確認のうえ、
  必要に応じて更新してください。
