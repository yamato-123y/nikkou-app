import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const BUCKET = 'site-photos';
const MAX_PER_TYPE = 3;
const SIGNED_URL_SECONDS = 60 * 60; // 1時間

const getSupabaseEnv = () => {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Supabaseの環境変数が不足しています。SUPABASE_URL（またはNEXT_PUBLIC_SUPABASE_URL）とSUPABASE_SERVICE_ROLE_KEYを設定してください。'
    );
  }

  return { url: url.replace(/\/$/, ''), serviceRoleKey };
};

const authHeaders = () => {
  const { serviceRoleKey } = getSupabaseEnv();
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`
  };
};

const locationFolder = (location: string) =>
  Buffer.from(location, 'utf8').toString('base64url');

const isPhotoType = (value: string): value is 'before' | 'after' =>
  value === 'before' || value === 'after';

const listFolder = async (location: string, type: 'before' | 'after') => {
  const { url } = getSupabaseEnv();
  const prefix = `${locationFolder(location)}/${type}`;

  const res = await fetch(`${url}/storage/v1/object/list/${BUCKET}`, {
    method: 'POST',
    headers: {
      ...authHeaders(),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      prefix,
      limit: 100,
      offset: 0,
      sortBy: { column: 'created_at', order: 'asc' }
    }),
    cache: 'no-store'
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Storage list failed: ${text}`);
  }

  const items = await res.json();

  return (Array.isArray(items) ? items : [])
    .filter((item: any) => item?.name && !item.name.endsWith('/'))
    .map((item: any) => ({
      name: item.name,
      path: `${prefix}/${item.name}`,
      createdAt: item.created_at || item.createdAt || null
    }));
};

const signedUrlForPath = async (path: string) => {
  const { url } = getSupabaseEnv();

  const res = await fetch(`${url}/storage/v1/object/sign/${BUCKET}/${path}`, {
    method: 'POST',
    headers: {
      ...authHeaders(),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ expiresIn: SIGNED_URL_SECONDS }),
    cache: 'no-store'
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Signed URL failed: ${text}`);
  }

  const data = await res.json();
  const signed = data?.signedURL || data?.signedUrl || '';
  if (!signed) return '';

  return signed.startsWith('http') ? signed : `${url}/storage/v1${signed}`;
};

const withSignedUrls = async (items: any[]) =>
  Promise.all(
    items.map(async (item) => ({
      ...item,
      url: await signedUrlForPath(item.path)
    }))
  );

export async function GET(req: NextRequest) {
  try {
    const location = req.nextUrl.searchParams.get('location')?.trim() || '';
    if (!location) {
      return NextResponse.json({ error: 'locationが必要です。' }, { status: 400 });
    }

    const [before, after] = await Promise.all([
      listFolder(location, 'before'),
      listFolder(location, 'after')
    ]);

    return NextResponse.json({
      before: await withSignedUrls(before),
      after: await withSignedUrls(after)
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message || '写真の取得に失敗しました。' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const location = String(formData.get('location') || '').trim();
    const type = String(formData.get('type') || '').trim();
    const file = formData.get('file');

    if (!location) {
      return NextResponse.json({ error: '現場名がありません。' }, { status: 400 });
    }
    if (!isPhotoType(type)) {
      return NextResponse.json({ error: '写真種別が不正です。' }, { status: 400 });
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ error: '写真ファイルがありません。' }, { status: 400 });
    }
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: '画像ファイルのみアップロードできます。' }, { status: 400 });
    }

    // 圧縮後ファイルでも極端に大きいものは止める
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: '写真サイズが大きすぎます。5MB以下にしてください。' }, { status: 400 });
    }

    const existing = await listFolder(location, type);
    if (existing.length >= MAX_PER_TYPE) {
      return NextResponse.json(
        { error: type === 'before' ? '着工前写真は3枚までです。' : '完了写真は3枚までです。' },
        { status: 400 }
      );
    }

    const { url } = getSupabaseEnv();
    const ext = file.type === 'image/png' ? 'png' : 'jpg';
    const fileName = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const path = `${locationFolder(location)}/${type}/${fileName}`;

    const bytes = Buffer.from(await file.arrayBuffer());

    const uploadRes = await fetch(`${url}/storage/v1/object/${BUCKET}/${path}`, {
      method: 'POST',
      headers: {
        ...authHeaders(),
        'Content-Type': file.type || 'image/jpeg',
        'x-upsert': 'false'
      },
      body: bytes
    });

    if (!uploadRes.ok) {
      const text = await uploadRes.text();
      throw new Error(`Storage upload failed: ${text}`);
    }

    return NextResponse.json({
      ok: true,
      path,
      url: await signedUrlForPath(path)
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message || '写真のアップロードに失敗しました。' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const path = String(body?.path || '').trim();

    if (!path) {
      return NextResponse.json({ error: '削除対象がありません。' }, { status: 400 });
    }

    // このAPIで管理するbucket配下の相対パスだけ許可
    if (path.includes('..') || path.startsWith('/')) {
      return NextResponse.json({ error: '不正なパスです。' }, { status: 400 });
    }

    const { url } = getSupabaseEnv();
    const res = await fetch(`${url}/storage/v1/object/${BUCKET}/${path}`, {
      method: 'DELETE',
      headers: authHeaders()
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Storage delete failed: ${text}`);
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message || '写真の削除に失敗しました。' }, { status: 500 });
  }
}
