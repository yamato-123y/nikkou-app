// スキャンされた「年間カレンダー」の画像にある赤色のマスから休日を判定します。
// 対象様式：大和の年間カレンダー（11/21〜翌年11/20、12枠の月別表）。
// 未対応のPDF・レイアウトの場合は保存せず、正しい休日を誤って上書きしない設計です。

export type ImportedCalendarHolidays = {
  cycle: string;
  startDate: string;
  endDate: string;
  holidays: string[];
};

const dateKey = (d: Date) =>
  `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;

const dateUtc = (y: number, m: number, day: number) => new Date(Date.UTC(y, m - 1, day));

// 大和から提供されたPDFは、1ページに埋め込まれた単一のJPEG画像です。
// PDFの画像をそのまま抽出するため、サーバーや外部サイトにPDFの内容を送信しません。
const extractLargestJpeg = async (bytes: Uint8Array): Promise<Blob> => {
  const raw = new TextDecoder('latin1').decode(bytes);
  const re = /\/Subtype\s*\/Image\b/g;
  let match: RegExpExecArray | null;
  let best: Uint8Array | null = null;
  while ((match = re.exec(raw))) {
    const header = raw.slice(match.index, Math.min(raw.length, match.index + 1600));
    if (!/\/DCTDecode\b/.test(header)) continue;
    const streamMatch = /stream\r?\n/.exec(header);
    if (!streamMatch) continue;
    const start = match.index + streamMatch.index + streamMatch[0].length;
    const streamEnd = raw.indexOf('endstream', start);
    if (streamEnd < 0) continue;
    let end = streamEnd;
    while (end > start && (bytes[end - 1] === 10 || bytes[end - 1] === 13)) end--;
    const compressed = bytes.slice(start, end);
    let jpeg: Uint8Array;
    if (/\/FlateDecode\b/.test(header)) {
      if (typeof DecompressionStream === 'undefined') {
        throw new Error('このブラウザではPDFの画像を読み取れません。Chromeの最新版をご利用ください。');
      }
      try {
        const decoded = await new Response(
          new Blob([compressed as unknown as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate'))
        ).arrayBuffer();
        jpeg = new Uint8Array(decoded);
      } catch {
        continue;
      }
    } else {
      jpeg = compressed;
    }
    if (jpeg[0] !== 0xff || jpeg[1] !== 0xd8) continue;
    if (!best || jpeg.length > best.length) best = jpeg;
  }
  if (!best || best.length < 50000) {
    throw new Error('このPDFの画像形式は自動読取に対応していません。登録内容は変更していません。');
  }
  return new Blob([best as unknown as BlobPart], { type: 'image/jpeg' });
};

const loadImage = async (blob: Blob): Promise<HTMLImageElement> => {
  const url = URL.createObjectURL(blob);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('PDF内の画像を開けませんでした。'));
      img.src = url;
    });
  } finally {
    // 画像の読み込み後にURLを解放する。
    // 画像自体は読み込み済みなので描画可能です。
    URL.revokeObjectURL(url);
  }
};

export const readCompanyCalendarHolidayPdf = async (
  file: File,
  pattern: 'yamato' | 'trainee'
): Promise<ImportedCalendarHolidays> => {
  if (file.size > 20 * 1024 * 1024) throw new Error('PDFは20MB以下にしてください。');
  const bytes = new Uint8Array(await file.arrayBuffer());
  const jpeg = await extractLargestJpeg(bytes);
  const image = await loadImage(jpeg);
  if (Math.abs(image.naturalWidth / image.naturalHeight - 1653 / 2338) > 0.025) {
    throw new Error('年間カレンダーの様式が異なるため、自動登録しませんでした。');
  }
  const canvas = document.createElement('canvas');
  canvas.width = 827;
  canvas.height = 1169;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('画像を解析できませんでした。');
  context.drawImage(image, 0, 0, 827, 1169);
  const pixels = context.getImageData(0, 0, 827, 1169).data;
  const redScore = (x: number, y: number) => {
    let reds = 0;
    for (const dx of [4, 5, 6, 7]) for (const dy of [8, 11, 14, 17]) {
      const offset = ((Math.floor(y + dy) * 827) + Math.floor(x + dx)) * 4;
      const r = pixels[offset], g = pixels[offset + 1], b = pixels[offset + 2];
      if (r > 175 && r > g * 1.45 && r > b * 1.35) reds++;
    }
    return reds;
  };

  // 2025年11月21日から始まる大和様式。
  // 他年度・別レイアウトのPDFを誤読しないため、今回はこの期間に限定します。
  const startDate = '2025-11-21';
  const endDate = '2026-11-20';
  const holidays: string[] = [];
  for (let panel = 0; panel < 12; panel++) {
    const startOfPanel = dateUtc(2025, 11 + panel, 21);
    const endOfPanel = dateUtc(2025, 12 + panel, 21);
    const firstSunday = new Date(startOfPanel.getTime());
    firstSunday.setUTCDate(firstSunday.getUTCDate() - firstSunday.getUTCDay());
    for (let row = 0; row < 6; row++) for (let col = 0; col < 7; col++) {
      const day = new Date(firstSunday.getTime());
      day.setUTCDate(day.getUTCDate() + row * 7 + col);
      if (day < startOfPanel || day >= endOfPanel) continue;
      const x = 90 + (panel % 3) * 238 + col * 28.55;
      const y = 162 + Math.floor(panel / 3) * 198.2 + row * 27.75;
      if (redScore(x, y) >= 3) holidays.push(dateKey(day));
    }
  }

  // 今回の原本に明記されている年間休日数と一致する場合のみ、自動登録します。
  const expectedCount = pattern === 'yamato' ? 105 : 85;
  const unique = Array.from(new Set(holidays)).sort();
  if (unique.length !== expectedCount) {
    throw new Error(
      `休日を${unique.length}日検出しましたが、原本の${expectedCount}日と一致しません。` +
      '休日は保存していません。対象の年間カレンダーPDFを確認してください。'
    );
  }
  return { cycle: '2025-2026', startDate, endDate, holidays: unique };
};
