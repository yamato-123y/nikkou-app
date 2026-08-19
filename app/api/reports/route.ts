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

  // フロントエンド側が扱いやすいようにデータを整形して返す
  // （Supabaseの `data` カラムにJSONオブジェクトが入っている構造を想定）
  const reports = data.map((row: any) => ({
    id: row.id,
    createdAt: row.created_at,
    ...(typeof row.data === 'object' ? row.data : JSON.parse(row.data || '{}'))
  }));

  return NextResponse.json(reports);
}

export async function POST(request: Request) {
  const newReport = await request.json();

  // Supabaseの 'reports' テーブルに保存
  // （構造に合わせて `data` カラムに丸ごとJSONとして保存する形にしています）
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
