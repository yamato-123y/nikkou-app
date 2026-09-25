import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  '';

const supabase = createClient(supabaseUrl, supabaseKey);

// ★ Supabaseに現在残しているkeyと必ず同じ文字にする
const SETTINGS_KEY = 'アプリ設定';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', SETTINGS_KEY)
      .maybeSingle();

    if (error) {
      console.error('GET settings error:', error);
      return NextResponse.json({}, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({});
    }

    const settingsData =
      typeof data.value === 'object'
        ? data.value
        : JSON.parse(data.value || '{}');

    return NextResponse.json(settingsData);
  } catch (err) {
    console.error('GET settings exception:', err);
    return NextResponse.json({}, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const newSettings = await request.json();

    // 現在の設定を取得
    const { data: existingData, error: readError } = await supabase
      .from('settings')
      .select('value')
      .eq('key', SETTINGS_KEY)
      .maybeSingle();

    if (readError) {
      console.error('POST settings read error:', readError);
      return NextResponse.json(
        { success: false, error: readError.message },
        { status: 500 }
      );
    }

    let currentSettings: any = {};

    if (existingData?.value) {
      currentSettings =
        typeof existingData.value === 'object'
          ? existingData.value
          : JSON.parse(existingData.value || '{}');
    }

    // 今まで通り、既存設定を残しながら上書き
    const mergedSettings = {
      ...currentSettings,
      ...newSettings,
    };

    // ★ DELETE → INSERT はしない
    // keyがあればUPDATE、なければINSERT
    const { error: saveError } = await supabase
      .from('settings')
      .upsert(
        {
          key: SETTINGS_KEY,
          value: mergedSettings,
        },
        {
          onConflict: 'key',
        }
      );

    if (saveError) {
      console.error('POST settings save error:', saveError);
      return NextResponse.json(
        { success: false, error: saveError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('POST settings exception:', err);

    return NextResponse.json(
      {
        success: false,
        error: err?.message || '設定の保存に失敗しました。',
      },
      { status: 500 }
    );
  }
}
