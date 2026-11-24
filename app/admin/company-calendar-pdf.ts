// 大和の年間勤務予定表（2026/11/21～2027/11/20）の赤・オレンジ色の丸を休日として読み取ります。
// 12枚の月枠、月の区切りは21日～翌20日です。
// 様式や検出結果が原本と合わない場合はエラーにして、既存データを上書きしません。

export type ImportedCalendarHolidays = {
  cycle: string;
  startDate: string;
  endDate: string;
  holidays: string[];
};

const dateKey = (d: Date) =>
  `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;

const dateUtc = (y: number, m: number, day: number) => new Date(Date.UTC(y, m - 1, day));

// 今回のPDFは「FlateDecode → DCTDecode」で圧縮したJPEG画像を1枚含みます。
// ブラウザ内で取り出すだけで、PDFを外部へ送信しません。
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
    throw new Error('このPDFの画像形式は自動読取に対応していません。休日は保存していません。');
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

  // 実際に提供された2026～2027年版を827×1169に縮小したときの座標。
  // 従来の座標は別の様式用で、休日が22日しか検出されませんでした。
  const width = 827;
  const height = 1169;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('画像を解析できませんでした。');
  context.drawImage(image, 0, 0, width, height);
  const pixels = context.getImageData(0, 0, width, height).data;

  // オレンジ色の囲み線を検出。黒い日付や赤系の周辺文字は対象外とする。
  // 実習生用PDFではスキャン画像のにじみにより未丸囲みの文字が20〜24点になり、
  // 20点では3日誤検出する。正しい丸囲みは最小47点なので30点を採用する。
  const circleScore = (cx: number, cy: number) => {
    let count = 0;
    const x0 = Math.round(cx);
    const y0 = Math.round(cy);
    for (let dy = -11; dy <= 11; dy++) {
      for (let dx = -12; dx <= 12; dx++) {
        const x = x0 + dx;
        const y = y0 + dy;
        if (x < 0 || y < 0 || x >= width || y >= height) continue;
        const i = (y * width + x) * 4;
        const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
        if (r > 150 && r > g * 1.28 && g > b * 1.03 && r - g > 38) count++;
      }
    }
    return count;
  };

  const startDate = '2026-11-21';
  const endDate = '2027-11-20';
  const holidays: string[] = [];
  const monthCounts: number[] = [];
  // 3列×4段の月枠。上段は2026年11月、最下段は2027年10月。
  const centersX = [94, 321, 546];
  const centersY = [189, 396, 602, 808];

  for (let panel = 0; panel < 12; panel++) {
    const startOfPanel = dateUtc(2026, 11 + panel, 21);
    const endOfPanel = dateUtc(2026, 12 + panel, 21);
    const firstSunday = new Date(startOfPanel.getTime());
    firstSunday.setUTCDate(firstSunday.getUTCDate() - firstSunday.getUTCDay());
    let count = 0;
    for (let row = 0; row < 6; row++) {
      for (let col = 0; col < 7; col++) {
        const day = new Date(firstSunday.getTime());
        day.setUTCDate(day.getUTCDate() + row * 7 + col);
        if (day < startOfPanel || day >= endOfPanel) continue;
        const x = centersX[panel % 3] + col * 29.3;
        const y = centersY[Math.floor(panel / 3)] + row * 25;
        if (circleScore(x, y) >= 30) {
          holidays.push(dateKey(day));
          count++;
        }
      }
    }
    monthCounts.push(count);
  }

  const unique = Array.from(new Set(holidays)).sort();
  const expectedCount = pattern === 'yamato' ? 105 : 85;
  if (unique.length !== expectedCount) {
    throw new Error(
      `休日を${unique.length}日検出しましたが、原本の${expectedCount}日と一致しません。` +
      '休日は保存していません。対象の年間カレンダーPDFを確認してください。'
    );
  }

  // 両方の原本の月別休日数（11月～翌10月）とも照合。
  // 合計だけ偶然一致する誤読を保存しない。
  const expectedMonthlyCounts = pattern === 'yamato'
    ? [9, 12, 7, 8, 9, 10, 8, 8, 9, 9, 8, 8]
    : [7, 12, 6, 7, 7, 8, 7, 6, 7, 6, 6, 6];
  if (monthCounts.some((count, index) => count !== expectedMonthlyCounts[index])) {
    throw new Error('月ごとの休日数が原本と一致しません。休日は保存していません。');
  }
  return { cycle: '2026-2027', startDate, endDate, holidays: unique };
};
