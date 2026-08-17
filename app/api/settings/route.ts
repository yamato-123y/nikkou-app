import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'data', 'settings.json');

function getSettings() {
  if (!fs.existsSync(filePath)) {
    return {
      siteNames: ['堺市邸解体工事', '北花田店舗改修', '美原区住宅解体'],
      managers: ['大和 太郎', '佐藤 次郎', '鈴木 三郎'],
      workersList: ['作業員A', '作業員B', '作業員C'],
      leaseList: ['0.2ユンボ', '0.45ユンボ', '2tダンプ'],
      disposalSites: [
        { id: '1', name: '堺処分場', item: 'ガラ', unit: 't', price: 0 },
      ],
      rates: {},
    };
  }
  try {
    const fileData = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(fileData);
    if (!data.rates) data.rates = {};
    if (!data.disposalSites) data.disposalSites = [];
    if (!data.leaseList) data.leaseList = [];
    return data;
  } catch (e) {
    return { siteNames: [], managers: [], workersList: [], leaseList: [], disposalSites: [], rates: {} };
  }
}

function saveSettings(settings: any) {
  const dirPath = path.dirname(filePath);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(settings, null, 2), 'utf8');
}

export async function GET() {
  const settings = getSettings();
  return NextResponse.json({ success: true, settings });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    saveSettings(body);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: '保存失敗' }, { status: 500 });
  }
}