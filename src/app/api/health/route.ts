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

/** PostgrestError má kromě message i code/details/hint — u schema/grant
 *  problémů je message často prázdná, kdežto code (PGRST106, 42501…) mluví. */
function formatDbError(error: { message?: string; code?: string; details?: string | null; hint?: string | null }): string {
  return [error.code, error.message, error.details, error.hint]
    .filter(Boolean)
    .join(' | ') || 'unknown DB error (empty response)';
}

async function probeSupabase(): Promise<CheckResult> {
  if (!isSupabaseConfigured() || !supabase) {
    return { ok: false, detail: 'Supabase not configured (env vars missing)' };
  }
  const start = Date.now();
  try {
    // head:true zamerne NE — HEAD odpoved nenese telo chyby a detail by byl prazdny
    const { error } = await supabase
      .from('tenants')
      .select('id')
      .limit(1);
    const ms = Date.now() - start;
    if (error) return { ok: false, ms, detail: formatDbError(error) };
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
    const { count, error } = await supabase
      .from('prompt_templates')
      .select('id', { count: 'exact' })
      .eq('is_active', true)
      .limit(1);
    const ms = Date.now() - start;
    if (error) return { ok: false, ms, detail: formatDbError(error) };
    if (!count || count === 0) return { ok: false, ms, detail: 'empty — run seed_full.sql' };
    return { ok: true, ms, detail: `${count} active prompts` };
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
    // ARAD API root — kód v src/lib/data/rates.ts používá tuto base
    const res = await fetch('https://www.cnb.cz/aradb/api/v1', {
      signal: AbortSignal.timeout(5000),
    });
    const ms = Date.now() - start;
    // ARAD root vrací HTML s odkazy — 200/404 obojí znamená že server žije
    const reachable = res.status < 500;
    return { ok: reachable, ms, detail: `HTTP ${res.status}` };
  } catch (e) {
    return {
      ok: false,
      ms: Date.now() - start,
      detail: e instanceof Error ? e.message : 'unknown',
    };
  }
}

/** Project ref z URL i ze service klíče (JWT claim). Když se liší, míří
 *  aplikace jinam, než kde běžela migrace — typická příčina PGRST106.
 *  Ref není tajný: je v každém klientském bundlu (NEXT_PUBLIC_SUPABASE_URL). */
function checkProjectRef(): CheckResult {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const urlRef = url.match(/https:\/\/([a-z0-9]+)\.supabase\./)?.[1] ?? 'unknown';

  let keyRef = 'unparsed';
  try {
    const payload = process.env.SUPABASE_SERVICE_ROLE_KEY?.split('.')[1];
    if (payload) {
      const decoded = JSON.parse(Buffer.from(payload, 'base64').toString('utf-8'));
      keyRef = decoded.ref ?? 'no-ref-claim';
    }
  } catch {
    keyRef = 'unparsed';
  }

  const match = keyRef === urlRef || keyRef === 'unparsed' || keyRef === 'no-ref-claim';
  return {
    ok: match,
    detail: `url=${urlRef} serviceKey=${keyRef}${match ? '' : ' — NESHODA: klíč patří jinému projektu'}`,
  };
}

/** Dosažitelnost PTF backendu + rozpoznání tenanta. Bez toho leady do CRM
 *  nedojdou a pozná se to jen z logů. Čte se veřejné /api/settings, nic nezapisuje. */
async function probePtfApi(): Promise<CheckResult> {
  const apiUrl = process.env.PTF_API_URL;
  const tenantSlug = process.env.PTF_TENANT_SLUG ?? 'ptf-reality';
  if (!apiUrl) {
    return { ok: false, detail: 'PTF_API_URL nenastaveno — leady se do PTF CRM nepředávají' };
  }
  const start = Date.now();
  try {
    const res = await fetch(`${apiUrl.replace(/\/$/, '')}/api/settings`, {
      headers: { 'X-Tenant-Slug': tenantSlug },
      signal: AbortSignal.timeout(8000),
    });
    const ms = Date.now() - start;
    if (!res.ok) {
      return { ok: false, ms, detail: `HTTP ${res.status} pro tenanta '${tenantSlug}'` };
    }
    const data = (await res.json().catch(() => ({}))) as { slug?: string; name?: string };
    return { ok: true, ms, detail: `tenant '${data.slug ?? tenantSlug}' (${data.name ?? '?'})` };
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
  const [envCheck, supabaseCheck, promptsCheck, aradCheck, ptfCheck] = await Promise.all([
    Promise.resolve(checkEnvVars()),
    probeSupabase(),
    probePromptsTable(),
    probeAradRates(),
    probePtfApi(),
  ]);

  const checks = {
    env: envCheck,
    project: checkProjectRef(),
    supabase: supabaseCheck,
    prompts: promptsCheck,
    ptf: ptfCheck,
    arad: aradCheck,
  };

  // Criticals = env + supabase + prompts. Arad downtime is recoverable.
  // PTF: nedostupné CRM lead neztratí (zůstává v hypoteeka.leads), ale
  // poradce ho neuvidí — degraded, ne down.
  const criticalsOk = envCheck.ok && supabaseCheck.ok && promptsCheck.ok;
  const allOk = criticalsOk && aradCheck.ok && ptfCheck.ok;

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
