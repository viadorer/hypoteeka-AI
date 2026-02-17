import { supabase } from '@/lib/supabase/client';

const SUPERADMIN_EMAIL = 'david@ptf.cz';
const SUPERADMIN_PASSWORD = 'admin123';

/**
 * One-time seed endpoint to create the superadmin user.
 * POST /api/admin/seed
 * Protected by a secret token to prevent abuse.
 */
export async function POST(req: Request) {
  if (!supabase) {
    return Response.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  // Simple protection - require seed_token from env or body
  const body = await req.json().catch(() => ({}));
  const envToken = process.env.ADMIN_SEED_TOKEN;
  if (envToken && body.token !== envToken) {
    return Response.json({ error: 'Invalid seed token' }, { status: 403 });
  }

  try {
    // Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existing = existingUsers?.users?.find(u => u.email === SUPERADMIN_EMAIL);

    if (existing) {
      // User exists - just ensure profile has superadmin role
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: existing.id,
          display_name: 'David (Superadmin)',
          email: SUPERADMIN_EMAIL,
          role: 'superadmin',
          managed_tenants: [],
        }, { onConflict: 'id' });

      if (profileError) {
        return Response.json({ error: `Profile update failed: ${profileError.message}` }, { status: 500 });
      }

      return Response.json({ message: 'Superadmin already exists, profile updated', userId: existing.id });
    }

    // Create new user via admin API (bypasses email confirmation)
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: SUPERADMIN_EMAIL,
      password: SUPERADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: { name: 'David' },
    });

    if (createError) {
      return Response.json({ error: `User creation failed: ${createError.message}` }, { status: 500 });
    }

    // Create profile with superadmin role
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: newUser.user.id,
        display_name: 'David (Superadmin)',
        email: SUPERADMIN_EMAIL,
        role: 'superadmin',
        managed_tenants: [],
      }, { onConflict: 'id' });

    if (profileError) {
      return Response.json({ error: `Profile creation failed: ${profileError.message}` }, { status: 500 });
    }

    return Response.json({
      message: 'Superadmin created successfully',
      userId: newUser.user.id,
      email: SUPERADMIN_EMAIL,
    });
  } catch (err) {
    return Response.json({ error: `Unexpected error: ${err}` }, { status: 500 });
  }
}
