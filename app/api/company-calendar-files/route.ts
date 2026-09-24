import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const BUCKET = 'site-photos';

const getSupabaseAdmin = () => {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error('Supabaseの環境変数が不足しています。');
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
};

const safeSegment = (value: string) =>
  String(value || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 80);

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const cycle = String(formData.get('cycle') || '').trim();
    const pattern = String(formData.get('pattern') || '').trim();
    const file = formData.get('file');

    if (!cycle || !['yamato', 'trainee'].includes(pattern)) {
      return NextResponse.json({ error: '年度またはカレンダー区分が不正です。' }, { status: 400 });
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'PDFファイルがありません。' }, { status: 400 });
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'PDFファイルのみアップロードできます。' }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'PDFは10MB以下にしてください。' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const path = `company-calendars/${safeSegment(cycle)}/${safeSegment(pattern)}_${Date.now()}.pdf`;
    const bytes = Buffer.from(await file.arrayBuffer());

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, bytes, {
        contentType: 'application/pdf',
        upsert: false
      });

    if (error) throw new Error(error.message);

    return NextResponse.json({
      ok: true,
      path,
      fileName: file.name
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e?.message || 'PDFアップロードに失敗しました。' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const path = String(req.nextUrl.searchParams.get('path') || '').trim();
    if (!path || !path.startsWith('company-calendars/')) {
      return NextResponse.json({ error: 'PDFパスが不正です。' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, 60 * 15);

    if (error) throw new Error(error.message);

    return NextResponse.json({ url: data.signedUrl });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e?.message || 'PDFの取得に失敗しました。' },
      { status: 500 }
    );
  }
}
