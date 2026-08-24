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

    // 1. 既存のデータを取得する
    const { data: existingData } = await supabase
      .from('settings')
      .select('value')
      .eq('key', SETTINGS_KEY)
      .maybeSingle();

    let currentSettings = {};
    if (existingData && existingData.value) {
      currentSettings = typeof existingData.value === 'object' ? existingData.value : JSON.parse(existingData.value || '{}');
    }

    // 2. 既存のデータと新しく送られてきたデータを安全にマージ（結合）する
    // 送信されてきたキー（例: locations, workers など）のみを上書きし、含まれていないキーやデータは保持する
    const mergedSettings = {
      ...currentSettings,
      ...newSettings,
    };

    // 3. 一度削除して最新化する代わりに、安全にupsert（存在すれば更新、なければ挿入）またはdelete/insertを行う
    await supabase
      .from('settings')
      .delete()
      .eq('key', SETTINGS_KEY);

    const { error } = await supabase
      .from('settings')
      .insert([
        { key: SETTINGS_KEY, value: mergedSettings }
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
