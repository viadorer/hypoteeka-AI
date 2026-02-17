import { createSupabaseServer } from '@/lib/supabase/server';
import { supabase as serviceClient } from '@/lib/supabase/client';

export interface AdminUser {
  id: string;
  email: string;
  role: 'admin' | 'superadmin';
  managedTenants: string[];
}

/**
 * Verify the current request is from an authenticated admin/superadmin.
 * Returns AdminUser or null.
 */
export async function getAdminUser(): Promise<AdminUser | null> {
  try {
    const supabase = await createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Fetch profile with role from DB using service client (bypasses RLS)
    if (!serviceClient) return null;
    const { data: profile } = await serviceClient
      .from('profiles')
      .select('role, managed_tenants')
      .eq('id', user.id)
      .single();

    if (!profile || (profile.role !== 'admin' && profile.role !== 'superadmin')) {
      return null;
    }

    return {
      id: user.id,
      email: user.email ?? '',
      role: profile.role,
      managedTenants: profile.managed_tenants ?? [],
    };
  } catch {
    return null;
  }
}

/**
 * Check if admin can manage a specific tenant.
 */
export function canManageTenant(admin: AdminUser, tenantId: string): boolean {
  if (admin.role === 'superadmin') return true;
  return admin.managedTenants.includes(tenantId);
}

/**
 * Return 401 response for unauthorized requests.
 */
export function unauthorizedResponse() {
  return Response.json({ error: 'Přístup odepřen. Vyžaduje admin oprávnění.' }, { status: 401 });
}

/**
 * Return 403 response for forbidden tenant access.
 */
export function forbiddenTenantResponse(tenantId: string) {
  return Response.json({ error: `Nemáte oprávnění spravovat tenant '${tenantId}'.` }, { status: 403 });
}
