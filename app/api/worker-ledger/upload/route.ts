import { NextResponse } from 'next/server';
import { assertAdmin, safeFileName, supabaseRest } from '../_lib';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    assertAdmin(request);
    const form = await request.formData();
    const file = form.get('file');
    const workerName = String(form.get('workerName') || '').trim();
    const documentType = String(form.get('documentType') || 'other').trim();
    const title = String(form.get('title') || '').trim();

    if (!(file instanceof File) || !workerName) {
      return NextResponse.json({ error: '作業員とファイルを指定してください。' }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: '1ファイル10MB以下にしてください。' }, { status: 400 });
    }
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowed.includes(file.type)) {
      return NextResponse.json({ error: 'JPEG・PNG・WebP・PDFのみアップロードできます。' }, { status: 400 });
    }

    const ext = file.type === 'application/pdf' ? 'pdf' : file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const objectName = `${Date.now()}_${crypto.randomUUID()}_${safeFileName(file.name.replace(/\.[^.]+$/, ''))}.${ext}`;
    const path = `${safeFileName(workerName)}/${documentType}/${objectName}`;
    const buffer = await file.arrayBuffer();

    await supabaseRest(`/storage/v1/object/worker-documents/${path.split('/').map(encodeURIComponent).join('/')}`, {
      method: 'POST', body: buffer
    }, { 'Content-Type': file.type, 'x-upsert': 'false' });

    const payload = {
      worker_name: workerName,
      document_type: documentType,
      title: title || file.name,
      file_path: path,
      mime_type: file.type,
      file_size: file.size,
      uploaded_at: new Date().toISOString()
    };
    const res = await supabaseRest('/rest/v1/worker_documents', {
      method: 'POST', body: JSON.stringify(payload)
    }, { Prefer: 'return=representation' });

    return NextResponse.json({ ok: true, rows: await res.json().catch(() => []) });
  } catch (error: any) {
    console.error(error);
    const status = Number(error?.status) || 500;
    return NextResponse.json({ error: error?.message || 'アップロードに失敗しました。' }, { status });
  }
}
