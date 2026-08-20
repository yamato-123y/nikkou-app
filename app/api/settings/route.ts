import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function GET() {
  try {
    // `settings` テーブルから一番新しいデータを1件取得する
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({});
    }

    const settingsData = typeof data.value === 'object' ? data.value : JSON.parse(data.value || '{}');
    return NextResponse.json(settingsData);
  } catch (err) {
    console.error('GET Exception:', err);
    return NextResponse.json({});
  }
}

export async function POST(request: Request) {
  try {
    const newSettings = await request.json();

    // 単純に新しい設定データをINSERTする
    const { error } = await supabase
      .from('settings')
      .insert([
        { value: newSettings }
      ]);

    if (error) {
      console.error('POST Error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('POST Exception:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
