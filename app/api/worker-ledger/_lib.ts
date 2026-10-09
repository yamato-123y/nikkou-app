const getEnv = (...names: string[]) => {
  for (const name of names) {
    const value = process.env[name];
    if (value) return value;
  }
  return '';
};

export const ADMIN_PASSWORD = getEnv('ADMIN_PASSWORD', 'YAMATO_ADMIN_PASSWORD') || '19770323';

export const getSupabaseConfig = () => {
  const url = getEnv('SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL');
  const serviceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_KEY');
  if (!url || !serviceKey) {
    throw new Error('Supabase server environment variables are missing. SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
  }
  return { url: url.replace(/\/$/, ''), serviceKey };
};

export const assertAdmin = (request: Request) => {
  const supplied = request.headers.get('x-admin-password') || '';
  if (supplied !== ADMIN_PASSWORD) {
    const error: any = new Error('Unauthorized');
    error.status = 401;
    throw error;
  }
};

export const supabaseRest = async (
  path: string,
  init: RequestInit = {},
  extraHeaders: Record<string, string> = {}
) => {
  const { url, serviceKey } = getSupabaseConfig();
  const response = await fetch(`${url}${path}`, {
    ...init,
    cache: 'no-store',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      ...(init.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...extraHeaders,
      ...(init.headers || {})
    }
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Supabase request failed (${response.status}): ${text || response.statusText}`);
  }
  return response;
};

export const safeFileName = (name: string) =>
  String(name || 'file')
    .normalize('NFKC')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80) || 'file';
