import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';

/**
 * Health check endpoint.
 *
 * Why: When Supabase silently dies (deleted project, paused, network issue),
 * the app appears to work because reads return empty and writes swallow errors.
 * This endpoint actively probes critical dependencies so a 30-second curl
 * reveals what 1 hour of detective work would.
 *
 * GET /api/health → { status: "ok" | "degraded" | "down", checks: {...} }
 * - 200 if all critical checks pass
 * - 503 if any critical check fails (use this for monitoring alerts)
 */

interface CheckResult {
  ok: boolean;
  ms?: number;
  detail?: string;
}

async function probeSupabase(): Promise<CheckResult> {
  if (!isSupabaseConfigured() || !supabase) {
    return { ok: false, detail: 'Supabase not configured (env vars missing)' };
  }
  const start = Date.now();
  try {
    const { error } = await supabase
      .from('tenants')
      .select('id', { count: 'exact', head: true })
      .limit(1);
    const ms = Date.now() - start;
    if (error) return { ok: false, ms, detail: error.message };
    return { ok: true, ms };
  } catch (e) {
    return {
      ok: false,
      ms: Date.now() - start,
      detail: e instanceof Error ? e.message : 'unknown',
    };
  }
}

async function probePromptsTable(): Promise<CheckResult> {
  if (!isSupabaseConfigured() || !supabase) {
    return { ok: false, detail: 'Supabase not configured' };
  }
  const start = Date.now();
  try {
    const { data, error } = await supabase
      .from('prompt_templates')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true);
    const ms = Date.now() - start;
    if (error) return { ok: false, ms, detail: error.message };
    return { ok: true, ms, detail: `${data ? 'ok' : 'empty'}` };
  } catch (e) {
    return {
      ok: false,
      ms: Date.now() - start,
      detail: e instanceof Error ? e.message : 'unknown',
    };
  }
}

async function probeAradRates(): Promise<CheckResult> {
  const start = Date.now();
  try {
    const res = await fetch('https://www.cnb.cz/cnb/STAT.ARADY_PKG.PARAMETRY_SESTAVY?p_sestuid=12450&p_strid=AAABAA', {
      signal: AbortSignal.timeout(5000),
    });
    const ms = Date.now() - start;
    return { ok: res.ok, ms, detail: `HTTP ${res.status}` };
  } catch (e) {
    return {
      ok: false,
      ms: Date.now() - start,
      detail: e instanceof Error ? e.message : 'unknown',
    };
  }
}

function checkEnvVars(): CheckResult {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    return { ok: false, detail: `Missing: ${missing.join(', ')}` };
  }
  const consentSecret = process.env.CONSENT_WITHDRAW_SECRET ?? process.env.NEXTAUTH_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!consentSecret) {
    return { ok: false, detail: 'No consent withdraw secret configured' };
  }
  return { ok: true };
}

export async function GET() {
  const [envCheck, supabaseCheck, promptsCheck, aradCheck] = await Promise.all([
    Promise.resolve(checkEnvVars()),
    probeSupabase(),
    probePromptsTable(),
    probeAradRates(),
  ]);

  const checks = {
    env: envCheck,
    supabase: supabaseCheck,
    prompts: promptsCheck,
    arad: aradCheck,
  };

  // Criticals = env + supabase + prompts. Arad downtime is recoverable.
  const criticalsOk = envCheck.ok && supabaseCheck.ok && promptsCheck.ok;
  const allOk = criticalsOk && aradCheck.ok;

  const status: 'ok' | 'degraded' | 'down' = allOk
    ? 'ok'
    : criticalsOk
      ? 'degraded'
      : 'down';

  return new Response(
    JSON.stringify(
      {
        status,
        timestamp: new Date().toISOString(),
        checks,
      },
      null,
      2
    ),
    {
      status: criticalsOk ? 200 : 503,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, max-age=0',
      },
    }
  );
}
