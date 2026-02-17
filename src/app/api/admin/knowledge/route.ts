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
    .from('knowledge_base')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .order('category')
    .order('sort_order');

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ items: data });
}

export async function POST(req: Request) {
  const admin = await getAdminUser();
  if (!admin) return unauthorizedResponse();
  if (!supabase) return Response.json({ error: 'DB not configured' }, { status: 500 });

  const body = await req.json();
  if (!body.tenant_id || !body.category || !body.title || !body.content) {
    return Response.json({ error: 'tenant_id, category, title, content required' }, { status: 400 });
  }
  if (!canManageTenant(admin, body.tenant_id)) return forbiddenTenantResponse(body.tenant_id);

  const { data, error } = await supabase
    .from('knowledge_base')
    .insert(body)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ item: data });
}

export async function PUT(req: Request) {
  const admin = await getAdminUser();
  if (!admin) return unauthorizedResponse();
  if (!supabase) return Response.json({ error: 'DB not configured' }, { status: 500 });

  const body = await req.json();
  const { id, ...updates } = body;
  if (!id) return Response.json({ error: 'id required' }, { status: 400 });

  const { error } = await supabase
    .from('knowledge_base')
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
    .from('knowledge_base')
    .update({ is_active: false })
    .eq('id', id);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
