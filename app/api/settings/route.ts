import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const dataFilePath = path.join(process.cwd(), 'data', 'settings.json');

// データの読み込み
function readSettings() {
  if (!fs.existsSync(dataFilePath)) {
    const defaultData = {
      workers: ['田中 太郎', '鈴木 次郎', '佐藤 花子'],
      locations: ['第1現場', '第2現場'],
      vehicles: ['1号車', '2号車'],
      heavyMachines: ['バックホウ 0.2㎥', 'ミニショベル'],
      scrapLocations: [{ location: '〇〇解体処分場', item: '鉄スクラップ' }],
      subcontractors: ['A工業', 'B建設']
    };
    const dir = path.dirname(dataFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(dataFilePath, JSON.stringify(defaultData, null, 2));
    return defaultData;
  }
  const fileData = fs.readFileSync(dataFilePath, 'utf-8');
  try {
    return JSON.parse(fileData);
  } catch {
    return { workers: [], locations: [], vehicles: [], heavyMachines: [], scrapLocations: [], subcontractors: [] };
  }
}

// データの保存
function writeSettings(data: any) {
  const dir = path.dirname(dataFilePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
}

export async function GET() {
  const settings = readSettings();
  return NextResponse.json(settings);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, value } = body;
    const settings = readSettings();

    if (type === 'worker' && !settings.workers.includes(value)) {
      settings.workers.push(value);
    } else if (type === 'location' && !settings.locations.includes(value)) {
      settings.locations.push(value);
    } else if (type === 'vehicle' && !settings.vehicles.includes(value)) {
      settings.vehicles.push(value);
    } else if (type === 'heavyMachine' && !settings.heavyMachines.includes(value)) {
      settings.heavyMachines.push(value);
    } else if (type === 'subcontractor' && !settings.subcontractors.includes(value)) {
      settings.subcontractors.push(value);
    } else if (type === 'scrapLocation') {
      // value は { location, item } のオブジェクト
      if (!settings.scrapLocations) settings.scrapLocations = [];
      const exists = settings.scrapLocations.some((s: any) => s.location === value.location && s.item === value.item);
      if (!exists) {
        settings.scrapLocations.push(value);
      }
    }

    writeSettings(settings);
    return NextResponse.json(settings);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { type, value } = body;
    const settings = readSettings();

    if (type === 'worker') {
      settings.workers = settings.workers.filter((w: string) => w !== value);
    } else if (type === 'location') {
      settings.locations = settings.locations.filter((l: string) => l !== value);
    } else if (type === 'vehicle') {
      settings.vehicles = settings.vehicles.filter((v: string) => v !== value);
    } else if (type === 'heavyMachine') {
      settings.heavyMachines = settings.heavyMachines.filter((hm: string) => hm !== value);
    } else if (type === 'subcontractor') {
      settings.subcontractors = settings.subcontractors.filter((sub: string) => sub !== value);
    } else if (type === 'scrapLocation') {
      // value は "location:item" という文字列で受け取る想定
      const [loc, item] = value.split(':');
      settings.scrapLocations = settings.scrapLocations.filter((s: any) => !(s.location === loc && s.item === item));
    }

    writeSettings(settings);
    return NextResponse.json(settings);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to delete setting' }, { status: 500 });
  }
}