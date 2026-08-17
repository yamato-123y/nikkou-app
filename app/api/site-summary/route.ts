import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const reportsPath = path.join(process.cwd(), 'data', 'reports.json');
const settingsPath = path.join(process.cwd(), 'data', 'settings.json');

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const siteName = searchParams.get('siteName') || '';
  const startDate = searchParams.get('startDate') || '';
  const endDate = searchParams.get('endDate') || '';

  let reports: any[] = [];
  let settings: any = { rates: {}, disposalSites: [] };

  if (fs.existsSync(reportsPath)) {
    try {
      reports = JSON.parse(fs.readFileSync(reportsPath, 'utf8'));
    } catch (e) {}
  }

  if (fs.existsSync(settingsPath)) {
    try {
      settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    } catch (e) {}
  }

  const rates = settings.rates || {};
  const disposalSites = settings.disposalSites || [];

  // 現場名で絞り込み
  let filtered = reports.filter((r) => r.siteName === siteName);

  // 日付フィルター
  if (startDate) {
    filtered = filtered.filter((r) => {
      const d = r.date ? new Date(r.date.replace(/\//g, '-')) : new Date(r.createdAt);
      return d >= new Date(startDate);
    });
  }
  if (endDate) {
    filtered = filtered.filter((r) => {
      const d = r.date ? new Date(r.date.replace(/\//g, '-')) : new Date(r.createdAt);
      return d <= new Date(endDate + 'T23:59:59');
    });
  }

  // 日割り詳細データの組み立て
  let totalLaborCost = 0;
  let totalDisposalCost = 0;
  let totalWorkersCount = 0;

  const disposalSummaryMap: { [key: string]: { amount: number; cost: number; unit: string; item: string } } = {};

  const dailyList = filtered.map((r) => {
    // 1. 人員と人件費計算
    let laborCost = 0;
    let workerCount = 0;

    if (r.manager) {
      workerCount += 1;
      laborCost += rates[r.manager] || 0;
    }

    if (r.workers && r.workers !== '作業員未選択') {
      const list = r.workers.split('、');
      list.forEach((w: string) => {
        const name = w.trim();
        if (name) {
          workerCount += 1;
          laborCost += rates[name] || 0;
        }
      });
    }

    totalLaborCost += laborCost;
    totalWorkersCount += workerCount;

    // 2. 処分費用のパースと計算 (形式: "堺処分場(ガラ): 2.5t")
    let dayDisposalCost = 0;
    if (r.safety && r.safety !== '処分なし') {
      const items = r.safety.split('、');
      items.forEach((itemStr: string) => {
        const match = itemStr.match(/(.+)\((.+)\):\s*([\d.]+)(.+)/);
        if (match) {
          const siteNameParsed = match[1].trim();
          const itemParsed = match[2].trim();
          const amountParsed = parseFloat(match[3]) || 0;
          const unitParsed = match[4].trim();

          // マスタから単価検索
          const master = disposalSites.find(
            (d: any) => d.name === siteNameParsed || d.item === itemParsed
          );
          const price = master?.price || 0;
          const cost = amountParsed * price;

          dayDisposalCost += cost;

          // 処分場ごとの集計
          const key = `${siteNameParsed} (${itemParsed})`;
          if (!disposalSummaryMap[key]) {
            disposalSummaryMap[key] = { amount: 0, cost: 0, unit: unitParsed, item: itemParsed };
          }
          disposalSummaryMap[key].amount += amountParsed;
          disposalSummaryMap[key].cost += cost;
        }
      });
    }

    totalDisposalCost += dayDisposalCost;

    return {
      id: r.id,
      date: r.date || new Date(r.createdAt).toLocaleDateString('ja-JP'),
      manager: r.manager,
      workers: r.workers,
      workerCount,
      laborCost,
      content: r.content,
      disposalText: r.safety,
      dayDisposalCost,
      photoUrl: r.photoUrl,
    };
  });

  return NextResponse.json({
    success: true,
    siteName,
    summary: {
      totalDays: filtered.length,
      totalWorkersCount,
      totalLaborCost,
      totalDisposalCost,
      grandTotal: totalLaborCost + totalDisposalCost,
      disposalSummary: disposalSummaryMap,
    },
    dailyList,
  });
}s