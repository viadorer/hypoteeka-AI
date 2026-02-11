/**
 * Forgot Password API
 * 
 * Pošle reset email přes Supabase Auth.
 * Uživatel dostane odkaz na /auth/confirm?type=recovery
 */

import { createSupabaseServer } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return Response.json(
        { error: 'E-mail je povinný.' },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServer();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/auth/confirm`,
    });

    if (error) {
      console.error('[Auth] Reset password error:', error.message);
      // Don't reveal if email exists or not
    }

    // Always return success to prevent email enumeration
    return Response.json({
      success: true,
      message: 'Pokud účet s tímto e-mailem existuje, odeslali jsme vám odkaz pro obnovení hesla.',
    });
  } catch {
    return Response.json({ error: 'Chyba serveru.' }, { status: 500 });
  }
}
