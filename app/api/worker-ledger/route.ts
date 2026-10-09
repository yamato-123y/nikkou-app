import { NextResponse } from 'next/server';
import { assertAdmin, supabaseRest } from './_lib';

const jsonError = (error: any) => {
  const status = Number(error?.status) || 500;
  console.error(error);
  return NextResponse.json({ error: error?.message || '処理に失敗しました。' }, { status });
};

const readJson = async (response: Response) => response.json().catch(() => []);

export async function GET(request: Request) {
  try {
    assertAdmin(request);
    const url = new URL(request.url);
    const worker = String(url.searchParams.get('worker') || '').trim();
    const suffix = worker ? `&worker_name=eq.${encodeURIComponent(worker)}` : '';

    const [profilesRes, qualificationsRes, healthRes, documentsRes] = await Promise.all([
      supabaseRest(`/rest/v1/worker_profiles?select=*&order=worker_name.asc${suffix}`),
      supabaseRest(`/rest/v1/worker_qualifications?select=*&order=acquired_date.desc.nullslast,created_at.desc${suffix}`),
      supabaseRest(`/rest/v1/worker_health_checks?select=*&order=exam_date.desc.nullslast,created_at.desc${suffix}`),
      supabaseRest(`/rest/v1/worker_documents?select=*&order=uploaded_at.desc${suffix}`)
    ]);

    return NextResponse.json({
      profiles: await readJson(profilesRes),
      qualifications: await readJson(qualificationsRes),
      healthChecks: await readJson(healthRes),
      documents: await readJson(documentsRes)
    });
  } catch (error: any) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    assertAdmin(request);
    const body = await request.json();
    const action = String(body?.action || '');

    if (action === 'saveProfile') {
      const data = body?.data || {};
      const workerName = String(data.worker_name || '').trim();
      if (!workerName) return NextResponse.json({ error: '作業員名が必要です。' }, { status: 400 });
      const payload = {
        worker_name: workerName,
        full_name: String(data.full_name || '').trim() || null,
        employee_no: String(data.employee_no || '').trim() || null,
        employment_type: String(data.employment_type || '').trim() || null,
        hire_date: data.hire_date || null,
        birth_date: data.birth_date || null,
        blood_type: String(data.blood_type || '').trim() || null,
        address: String(data.address || '').trim() || null,
        emergency_contact: String(data.emergency_contact || '').trim() || null,
        notes: String(data.notes || '').trim() || null,
        updated_at: new Date().toISOString()
      };
      const res = await supabaseRest('/rest/v1/worker_profiles?on_conflict=worker_name', {
        method: 'POST', body: JSON.stringify(payload)
      }, { Prefer: 'resolution=merge-duplicates,return=representation' });
      return NextResponse.json({ ok: true, rows: await readJson(res) });
    }

    if (action === 'saveQualification') {
      const data = body?.data || {};
      const id = String(data.id || '').trim();
      const payload = {
        worker_name: String(data.worker_name || '').trim(),
        category: String(data.category || '').trim() || 'その他',
        qualification_name: String(data.qualification_name || '').trim(),
        certificate_no: String(data.certificate_no || '').trim() || null,
        acquired_date: data.acquired_date || null,
        expiry_date: data.expiry_date || null,
        issuing_body: String(data.issuing_body || '').trim() || null,
        notes: String(data.notes || '').trim() || null,
        updated_at: new Date().toISOString()
      };
      if (!payload.worker_name || !payload.qualification_name) {
        return NextResponse.json({ error: '作業員名と資格名が必要です。' }, { status: 400 });
      }
      const path = id ? `/rest/v1/worker_qualifications?id=eq.${encodeURIComponent(id)}` : '/rest/v1/worker_qualifications';
      const method = id ? 'PATCH' : 'POST';
      const res = await supabaseRest(path, { method, body: JSON.stringify(payload) }, { Prefer: 'return=representation' });
      return NextResponse.json({ ok: true, rows: await readJson(res) });
    }

    if (action === 'deleteQualification') {
      const id = String(body?.id || '').trim();
      if (!id) return NextResponse.json({ error: '削除対象がありません。' }, { status: 400 });
      await supabaseRest(`/rest/v1/worker_qualifications?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
      return NextResponse.json({ ok: true });
    }

    if (action === 'saveHealth') {
      const data = body?.data || {};
      const id = String(data.id || '').trim();
      const payload = {
        worker_name: String(data.worker_name || '').trim(),
        exam_date: data.exam_date || null,
        systolic: data.systolic === '' || data.systolic == null ? null : Number(data.systolic),
        diastolic: data.diastolic === '' || data.diastolic == null ? null : Number(data.diastolic),
        judgement: String(data.judgement || '').trim() || null,
        next_due_date: data.next_due_date || null,
        notes: String(data.notes || '').trim() || null,
        updated_at: new Date().toISOString()
      };
      if (!payload.worker_name || !payload.exam_date) {
        return NextResponse.json({ error: '作業員名と受診日が必要です。' }, { status: 400 });
      }
      const path = id ? `/rest/v1/worker_health_checks?id=eq.${encodeURIComponent(id)}` : '/rest/v1/worker_health_checks';
      const method = id ? 'PATCH' : 'POST';
      const res = await supabaseRest(path, { method, body: JSON.stringify(payload) }, { Prefer: 'return=representation' });
      return NextResponse.json({ ok: true, rows: await readJson(res) });
    }

    if (action === 'deleteHealth') {
      const id = String(body?.id || '').trim();
      if (!id) return NextResponse.json({ error: '削除対象がありません。' }, { status: 400 });
      await supabaseRest(`/rest/v1/worker_health_checks?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
      return NextResponse.json({ ok: true });
    }

    if (action === 'deleteDocument') {
      const id = String(body?.id || '').trim();
      const filePath = String(body?.file_path || '').trim();
      if (!id) return NextResponse.json({ error: '削除対象がありません。' }, { status: 400 });
      if (filePath) {
        await supabaseRest('/storage/v1/object/worker-documents', {
          method: 'DELETE', body: JSON.stringify({ prefixes: [filePath] })
        }).catch((e) => console.error('storage delete failed', e));
      }
      await supabaseRest(`/rest/v1/worker_documents?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: '未対応の操作です。' }, { status: 400 });
  } catch (error: any) {
    return jsonError(error);
  }
}
