import { NextResponse } from 'next/server';
import { assertAdmin, getSupabaseConfig, supabaseRest } from '../_lib';

export async function GET(request: Request) {
  try {
    assertAdmin(request);
    const url = new URL(request.url);
    const path = String(url.searchParams.get('path') || '').trim();
    if (!path) return NextResponse.json({ error: 'ファイル指定がありません。' }, { status: 400 });

    const res = await supabaseRest(`/storage/v1/object/sign/worker-documents/${path.split('/').map(encodeURIComponent).join('/')}`, {
      method: 'POST', body: JSON.stringify({ expiresIn: 300 })
    });
    const data: any = await res.json();
    const { url: baseUrl } = getSupabaseConfig();
    const signed = data?.signedURL || data?.signedUrl || '';
    const signedUrl = signed.startsWith('http') ? signed : `${baseUrl}/storage/v1${signed}`;
    return NextResponse.json({ signedUrl });
  } catch (error: any) {
    console.error(error);
    const status = Number(error?.status) || 500;
    return NextResponse.json({ error: error?.message || 'ファイルを開けませんでした。' }, { status });
  }
}
