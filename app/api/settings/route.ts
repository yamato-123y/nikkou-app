import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Renderの環境変数からSupabaseに接続するクライアントを作成
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function GET() {
  // `settings` テーブルから最新の設定データを取得する
  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .order('id', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    // まだデータがない場合は空のオブジェクトを返す
    return NextResponse.json({});
  }

  // 保存されている `data` カラムのJSONオブジェクトを返す
  const settingsData = typeof data.data === 'object' ? data.data : JSON.parse(data.data || '{}');
  return NextResponse.json(settingsData);
}

export async function POST(request: Request) {
  const newSettings = await request.json();

  // Supabaseの 'settings' テーブルに保存
  const { error } = await supabase
    .from('settings')
    .insert([
      { data: newSettings }
    ]);

  if (error) {
    console.error('Supabase Settings POST Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
