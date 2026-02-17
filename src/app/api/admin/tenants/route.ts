import { getAdminUser, unauthorizedResponse } from '@/lib/admin/auth';
import { supabase } from '@/lib/supabase/client';

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return unauthorizedResponse();
  if (!supabase) return Response.json({ error: 'DB not configured' }, { status: 500 });

  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .order('id');

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Filter by managed tenants for non-superadmin
  const tenants = admin.role === 'superadmin'
    ? data
    : data?.filter(t => admin.managedTenants.includes(t.id));

  return Response.json({ tenants });
}

export async function PUT(req: Request) {
  const admin = await getAdminUser();
  if (!admin) return unauthorizedResponse();
  if (!supabase) return Response.json({ error: 'DB not configured' }, { status: 500 });

  const body = await req.json();
  const { id, ...updates } = body;
  if (!id) return Response.json({ error: 'id is required' }, { status: 400 });

  if (admin.role !== 'superadmin' && !admin.managedTenants.includes(id)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { error } = await supabase
    .from('tenants')
    .update(updates)
    .eq('id', id);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
