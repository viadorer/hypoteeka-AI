import { getAdminUser, unauthorizedResponse, canManageTenant, forbiddenTenantResponse } from '@/lib/admin/auth';
import { supabase } from '@/lib/supabase/client';

export async function GET(req: Request) {
  const admin = await getAdminUser();
  if (!admin) return unauthorizedResponse();
  if (!supabase) return Response.json({ error: 'DB not configured' }, { status: 500 });

  const url = new URL(req.url);
  const tenantId = url.searchParams.get('tenantId');
  if (!tenantId) return Response.json({ error: 'tenantId required' }, { status: 400 });
  if (!canManageTenant(admin, tenantId)) return forbiddenTenantResponse(tenantId);

  const { data, error } = await supabase
    .from('communication_styles')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('is_default', { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ styles: data });
}

export async function POST(req: Request) {
  const admin = await getAdminUser();
  if (!admin) return unauthorizedResponse();
  if (!supabase) return Response.json({ error: 'DB not configured' }, { status: 500 });

  const body = await req.json();
  if (!body.tenant_id || !body.slug || !body.name || !body.style_prompt) {
    return Response.json({ error: 'tenant_id, slug, name, style_prompt required' }, { status: 400 });
  }
  if (!canManageTenant(admin, body.tenant_id)) return forbiddenTenantResponse(body.tenant_id);

  const { data, error } = await supabase
    .from('communication_styles')
    .insert(body)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ style: data });
}

export async function PUT(req: Request) {
  const admin = await getAdminUser();
  if (!admin) return unauthorizedResponse();
  if (!supabase) return Response.json({ error: 'DB not configured' }, { status: 500 });

  const body = await req.json();
  const { id, ...updates } = body;
  if (!id) return Response.json({ error: 'id required' }, { status: 400 });

  const { error } = await supabase
    .from('communication_styles')
    .update(updates)
    .eq('id', id);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}

export async function DELETE(req: Request) {
  const admin = await getAdminUser();
  if (!admin) return unauthorizedResponse();
  if (!supabase) return Response.json({ error: 'DB not configured' }, { status: 500 });

  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return Response.json({ error: 'id required' }, { status: 400 });

  const { error } = await supabase
    .from('communication_styles')
    .update({ is_active: false })
    .eq('id', id);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
