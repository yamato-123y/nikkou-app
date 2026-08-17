import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'data', 'reports.json');

function getReports() {
  if (!fs.existsSync(filePath)) {
    return [];
  }
  const fileData = fs.readFileSync(filePath, 'utf8');
  try {
    return JSON.parse(fileData);
  } catch (e) {
    return [];
  }
}

function saveReports(reports: any[]) {
  const dirPath = path.dirname(filePath);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(reports, null, 2), 'utf8');
}

export async function GET() {
  const reports = getReports();
  return NextResponse.json({ success: true, reports });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const reports = getReports();

    const newReport = {
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      ...body,
    };

    reports.unshift(newReport);
    saveReports(reports);

    return NextResponse.json({ success: true, report: newReport });
  } catch (error) {
    return NextResponse.json({ success: false, error: '保存失敗' }, { status: 500 });
  }
}

// 編集更新用 (PUT)
export async function PUT(req: NextRequest) {
  try {
    const updatedReport = await req.json();
    let reports = getReports();

    reports = reports.map((r: any) => (r.id === updatedReport.id ? updatedReport : r));
    saveReports(reports);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: '更新失敗' }, { status: 500 });
  }
}

// 削除用 (DELETE)
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'IDが必要です' }, { status: 400 });
    }

    let reports = getReports();
    reports = reports.filter((r: any) => r.id !== id);
    saveReports(reports);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: '削除失敗' }, { status: 500 });
  }
}