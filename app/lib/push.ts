import { createClient } from '@supabase/supabase-js';
import { timingSafeEqual } from 'node:crypto';

export const REPORTERS = ['岩橋','寺岡','塩澤','徳本','吉田','湯浅','島村','鳥羽','嶋田'] as const;
export const isReporter = (name: unknown): name is (typeof REPORTERS)[number] =>
  typeof name === 'string' && REPORTERS.includes(name as any);

export function pushDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabaseの接続設定が不足しています。');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
export function authorized(request: Request): boolean {
  const configured = process.env.PUSH_ADMIN_KEY || '';
  const supplied = request.headers.get('x-push-admin-key') || '';
  if (configured.length < 20 || !supplied || supplied.length !== configured.length) return false;
  return timingSafeEqual(Buffer.from(configured), Buffer.from(supplied));
}
export const jsonError = (message: string, status = 400) =>
  Response.json({ success: false, error: message }, { status });
