import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'data/reports.json');

export async function GET() {
  if (!fs.existsSync(filePath)) return NextResponse.json([]);
  return NextResponse.json(JSON.parse(fs.readFileSync(filePath, 'utf-8')));
}

export async function POST(request: Request) {
  const newReport = await request.json();
  let reports = [];
  if (!fs.existsSync(path.dirname(filePath))) fs.mkdirSync(path.dirname(filePath), { recursive: true });
  if (fs.existsSync(filePath)) reports = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  reports.unshift(newReport);
  fs.writeFileSync(filePath, JSON.stringify(reports));
  return NextResponse.json({ success: true });
}
