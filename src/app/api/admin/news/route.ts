import { getAdminUser, unauthorizedResponse } from '@/lib/admin/auth';
import { supabase } from '@/lib/supabase/client';

/**
 * Admin API pro správu článků (public.news).
 * GET  /api/admin/news?tenantId=hypoteeka — seznam (vč. nepublikovaných)
 * POST /api/admin/news — vytvoří nový článek
 * PUT  /api/admin/news — update článku (přes id v body)
 * DELETE /api/admin/news?id=... — soft delete (published=false)
 */

export async function GET(req: Request) {
  const admin = await getAdminUser();
  if (!admin) return unauthorizedResponse();
  if (!supabase) return Response.json({ error: 'DB not configured' }, { status: 500 });

  const url = new URL(req.url);
  const tenantId = url.searchParams.get('tenantId') ?? 'hypoteeka';

  const { data, error } = await supabase
    .from('news')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('published_at', { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ news: data ?? [] });
}

export async function POST(req: Request) {
  const admin = await getAdminUser();
  if (!admin) return unauthorizedResponse();
  if (!supabase) return Response.json({ error: 'DB not configured' }, { status: 500 });

  const body = await req.json();
  const required = ['title', 'slug', 'content'];
  for (const key of required) {
    if (!body[key]) return Response.json({ error: `Missing field: ${key}` }, { status: 400 });
  }

  const insert = {
    tenant_id: body.tenant_id ?? 'hypoteeka',
    title: body.title,
    slug: body.slug,
    summary: body.summary ?? null,
    content: body.content,
    published: body.published ?? false,
    published_at: body.published_at ?? new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('news')
    .insert(insert)
    .select('*')
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ news: data });
}

export async function PUT(req: Request) {
  const admin = await getAdminUser();
  if (!admin) return unauthorizedResponse();
  if (!supabase) return Response.json({ error: 'DB not configured' }, { status: 500 });

  const body = await req.json();
  const { id, ...updates } = body;
  if (!id) return Response.json({ error: 'id is required' }, { status: 400 });

  delete updates.id;
  delete updates.created_at;
  if (admin.role !== 'superadmin') {
    delete updates.tenant_id;
  }
  updates.updated_at = new Date().toISOString();

  const { error } = await supabase
    .from('news')
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
  if (!id) return Response.json({ error: 'id query param is required' }, { status: 400 });

  // Soft delete — jen unpublish. Hard delete je opt-in přes ?hard=true (jen superadmin).
  const hard = url.searchParams.get('hard') === 'true';
  if (hard) {
    if (admin.role !== 'superadmin') return Response.json({ error: 'Forbidden' }, { status: 403 });
    const { error } = await supabase.from('news').delete().eq('id', id);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ ok: true, deleted: true });
  }

  const { error } = await supabase
    .from('news')
    .update({ published: false, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true, unpublished: true });
}
