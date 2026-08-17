import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'data', 'reports.json');
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ success: true, summary: [] });
    }
    const fileData = fs.readFileSync(filePath, 'utf8');
    const reports = JSON.parse(fileData || '[]');

    const summaryMap: { [key: string]: number } = {};
    reports.forEach((report: any) => {
      if (report.siteName) {
        summaryMap[report.siteName] = (summaryMap[report.siteName] || 0) + 1;
      }
    });

    const summary = Object.keys(summaryMap).map((siteName) => ({
      siteName,
      count: summaryMap[siteName],
    }));

    return NextResponse.json({ success: true, summary });
  } catch (error) {
    return NextResponse.json({ success: false, summary: [] }, { status: 500 });
  }
}