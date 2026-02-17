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
    .from('prompt_templates')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .order('sort_order');

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ prompts: data });
}

export async function POST(req: Request) {
  const admin = await getAdminUser();
  if (!admin) return unauthorizedResponse();
  if (!supabase) return Response.json({ error: 'DB not configured' }, { status: 500 });

  const body = await req.json();
  const { tenant_id, slug, category, content, description, sort_order, phase } = body;
  if (!tenant_id || !slug || !category || !content) {
    return Response.json({ error: 'tenant_id, slug, category, content required' }, { status: 400 });
  }
  if (!canManageTenant(admin, tenant_id)) return forbiddenTenantResponse(tenant_id);

  const { data, error } = await supabase
    .from('prompt_templates')
    .insert({
      tenant_id, slug, category, content,
      description: description ?? null,
      sort_order: sort_order ?? 0,
      phase: phase ?? null,
      created_by: admin.id,
    })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ prompt: data });
}

export async function PUT(req: Request) {
  const admin = await getAdminUser();
  if (!admin) return unauthorizedResponse();
  if (!supabase) return Response.json({ error: 'DB not configured' }, { status: 500 });

  const body = await req.json();
  const { id, tenant_id, ...updates } = body;
  if (!id) return Response.json({ error: 'id required' }, { status: 400 });

  // Verify tenant access
  if (tenant_id && !canManageTenant(admin, tenant_id)) return forbiddenTenantResponse(tenant_id);

  const { error } = await supabase
    .from('prompt_templates')
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

  // Soft delete - set is_active = false
  const { error } = await supabase
    .from('prompt_templates')
    .update({ is_active: false })
    .eq('id', id);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
