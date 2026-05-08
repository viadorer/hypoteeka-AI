import { getAdminUser, unauthorizedResponse, canManageTenant, forbiddenTenantResponse } from '@/lib/admin/auth';
import { supabase } from '@/lib/supabase/client';

const CSV_COLUMNS = [
  'id',
  'tenant_id',
  'session_id',
  'lead_id',
  'user_id',
  'scope',
  'consent_text_version',
  'consent_text_hash',
  'partner_id',
  'ip_address',
  'user_agent',
  'consented_at',
  'withdrawn_at',
];

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(req: Request) {
  const admin = await getAdminUser();
  if (!admin) return unauthorizedResponse();
  if (!supabase) return Response.json({ error: 'DB not configured' }, { status: 500 });

  const url = new URL(req.url);
  const tenantId = url.searchParams.get('tenantId');
  if (!tenantId) return Response.json({ error: 'tenantId required' }, { status: 400 });
  if (!canManageTenant(admin, tenantId)) return forbiddenTenantResponse(tenantId);

  const format = (url.searchParams.get('format') ?? 'csv').toLowerCase();
  const fromIso = url.searchParams.get('from');
  const toIso = url.searchParams.get('to');
  const scope = url.searchParams.get('scope');

  let q = supabase
    .from('consent_log')
    .select('id, tenant_id, session_id, lead_id, user_id, scope, consent_text_version, consent_text_hash, partner_id, ip_address, user_agent, consented_at, withdrawn_at')
    .eq('tenant_id', tenantId)
    .order('consented_at', { ascending: false })
    .limit(10000);

  if (fromIso) q = q.gte('consented_at', fromIso);
  if (toIso) q = q.lte('consented_at', toIso);
  if (scope) q = q.eq('scope', scope);

  const { data, error } = await q;
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const rows = data ?? [];

  if (format === 'json') {
    return Response.json({ tenantId, count: rows.length, rows });
  }

  const header = CSV_COLUMNS.join(',');
  const body = rows.map((row) => CSV_COLUMNS.map((col) => csvEscape((row as Record<string, unknown>)[col])).join(',')).join('\n');
  const csv = `${header}\n${body}\n`;

  const filename = `consent-log-${tenantId}-${new Date().toISOString().slice(0, 10)}.csv`;
  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
