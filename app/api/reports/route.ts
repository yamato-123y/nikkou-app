import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Renderの環境変数からSupabaseに接続するクライアントを作成
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function GET() {
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .order('id', { ascending: false });

  if (error) {
    console.error('Supabase GET Error:', error);
    return NextResponse.json([], { status: 500 });
  }

  const reports = data.map((row: any) => ({
    id: row.id,
    createdAt: row.created_at,
    ...(typeof row.data === 'object' ? row.data : JSON.parse(row.data || '{}'))
  }));

  return NextResponse.json(reports);
}

export async function POST(request: Request) {
  const newReport = await request.json();

  const { error } = await supabase
    .from('reports')
    .insert([
      { data: newReport }
    ]);

  if (error) {
    console.error('Supabase POST Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// 📌 PUT: 日報の更新（全項目対応）
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, createdAt, ...reportData } = body;

    // Supabaseの `id` をキーにして `data` カラム全体を更新
    const { error } = await supabase
      .from('reports')
      .update({ data: reportData })
      .eq('id', id);

    if (error) {
      console.error('Supabase PUT Error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('PUT Server Error:', e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

// 📌 DELETE: 日報の削除
export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });
    }

    // Supabaseの `id` をキーにして行を削除
    const { error } = await supabase
      .from('reports')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Supabase DELETE Error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('DELETE Server Error:', e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
