import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const SETTINGS_KEY = 'app_settings';

export async function GET() {
  const { data, error } = await supabase
    .from('settings')
    .select('value')
    .eq('key', SETTINGS_KEY)
    .single();

  if (error || !data) {
    return NextResponse.json({});
  }

  const settingsData = typeof data.value === 'object' ? data.value : JSON.parse(data.value || '{}');
  return NextResponse.json(settingsData);
}

export async function POST(request: Request) {
  const newSettings = await request.json();

  // keyが 'app_settings' の行を上書き（なければ挿入）する
  const { error } = await supabase
    .from('settings')
    .upsert([
      { key: SETTINGS_KEY, value: newSettings }
    ], { onConflict: 'key' });

  if (error) {
    console.error('Supabase Settings POST Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
