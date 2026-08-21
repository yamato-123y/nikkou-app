import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const SETTINGS_KEY = 'app_settings';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', SETTINGS_KEY)
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

    // 常に最新の1行だけにするため、まず既存のデータを削除する
    await supabase
      .from('settings')
      .delete()
      .eq('key', SETTINGS_KEY);

    // 新しい設定データを1行だけ挿入する
    const { error } = await supabase
      .from('settings')
      .insert([
        { key: SETTINGS_KEY, value: newSettings }
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
