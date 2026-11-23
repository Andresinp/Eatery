// Shared by every Edge Function: CORS, JSON responses with a stable error `code` the app
// translates (mobile/src/lib/api.ts), and the signed-in caller.
import { createClient, type SupabaseClient, type User } from 'jsr:@supabase/supabase-js@2';

export const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'content-type': 'application/json' } });
}

// `code` is what the app shows a translation for: errors.<code>.
export function fail(code: string, status: number, detail?: unknown): Response {
  if (detail !== undefined) console.error(`[${code}]`, detail instanceof Error ? detail.message : detail);
  return json({ error: code }, status);
}

export function env(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`missing env ${name}`);
  return value;
}

export function admin(): SupabaseClient {
  return createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });
}

// The caller from their JWT, or null.
export async function caller(req: Request): Promise<User | null> {
  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data, error } = await admin().auth.getUser(token);
  if (error) return null;
  return data.user;
}

export async function readJson<T>(req: Request): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null; // a body that is not JSON is the caller's 400, reported by the function
  }
}
