import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'data/settings.json');

export async function GET() {
  if (!fs.existsSync(filePath)) return NextResponse.json({});
  return NextResponse.json(JSON.parse(fs.readFileSync(filePath, 'utf-8')));
}

export async function POST(request: Request) {
  const data = await request.json();
  if (!fs.existsSync(path.dirname(filePath))) fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data));
  return NextResponse.json({ success: true });
}
