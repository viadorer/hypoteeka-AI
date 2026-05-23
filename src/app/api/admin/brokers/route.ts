import { getAdminUser, unauthorizedResponse } from '@/lib/admin/auth';
import { supabase } from '@/lib/supabase/client';

/**
 * Admin API pro správu broker poolu.
 * GET  /api/admin/brokers?tenantId=hypoteeka — seznam
 * POST /api/admin/brokers — vytvoří nového brokera
 * PUT  /api/admin/brokers — update brokera (přes id v body)
 */

export async function GET(req: Request) {
  const admin = await getAdminUser();
  if (!admin) return unauthorizedResponse();
  if (!supabase) return Response.json({ error: 'DB not configured' }, { status: 500 });

  const url = new URL(req.url);
  const tenantId = url.searchParams.get('tenantId') ?? 'hypoteeka';

  const { data, error } = await supabase
    .from('brokers')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ brokers: data ?? [] });
}

export async function POST(req: Request) {
  const admin = await getAdminUser();
  if (!admin) return unauthorizedResponse();
  if (!supabase) return Response.json({ error: 'DB not configured' }, { status: 500 });

  const body = await req.json();
  // Required validation
  const required = ['first_name', 'last_name', 'display_name', 'slug', 'email', 'phone', 'company'];
  for (const key of required) {
    if (!body[key]) {
      return Response.json({ error: `Missing field: ${key}` }, { status: 400 });
    }
  }

  const insert = {
    tenant_id: body.tenant_id ?? 'hypoteeka',
    first_name: body.first_name,
    last_name: body.last_name,
    display_name: body.display_name,
    slug: body.slug,
    email: body.email,
    phone: body.phone,
    whatsapp_phone: body.whatsapp_phone ?? null,
    photo_url: body.photo_url ?? null,
    role_label: body.role_label ?? 'Hypoteční specialista',
    short_description: body.short_description ?? null,
    specializations: body.specializations ?? [],
    vertical_tags: body.vertical_tags ?? [],
    company: body.company,
    vazany_zastupce_of: body.vazany_zastupce_of ?? null,
    cnb_license_id: body.cnb_license_id ?? null,
    legal_disclosure: body.legal_disclosure ?? null,
    is_active: body.is_active ?? true,
    accepts_leads: body.accepts_leads ?? true,
    source: body.source ?? 'internal',
    external_id: body.external_id ?? null,
    bio: body.bio ?? null,
  };

  const { data, error } = await supabase
    .from('brokers')
    .insert(insert)
    .select('*')
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ broker: data });
}

export async function PUT(req: Request) {
  const admin = await getAdminUser();
  if (!admin) return unauthorizedResponse();
  if (!supabase) return Response.json({ error: 'DB not configured' }, { status: 500 });

  const body = await req.json();
  const { id, ...updates } = body;
  if (!id) return Response.json({ error: 'id is required' }, { status: 400 });

  // Strip nedovolená pole (id, created_at, updated_at, tenant_id pro non-superadmina)
  delete updates.id;
  delete updates.created_at;
  delete updates.updated_at;
  if (admin.role !== 'superadmin') {
    delete updates.tenant_id;
  }
  updates.updated_at = new Date().toISOString();

  const { error } = await supabase
    .from('brokers')
    .update(updates)
    .eq('id', id);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}

export async function DELETE(req: Request) {
  const admin = await getAdminUser();
  if (!admin) return unauthorizedResponse();
  if (admin.role !== 'superadmin') return Response.json({ error: 'Forbidden' }, { status: 403 });
  if (!supabase) return Response.json({ error: 'DB not configured' }, { status: 500 });

  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return Response.json({ error: 'id query param is required' }, { status: 400 });

  // Soft delete: jen deactivate, ne DELETE (zachovat historii broker_assignments)
  const { error } = await supabase
    .from('brokers')
    .update({ is_active: false, accepts_leads: false, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
