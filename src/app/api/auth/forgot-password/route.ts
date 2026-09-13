/**
 * Forgot Password API
 * 
 * Pošle reset email přes Supabase Auth.
 * Odkaz vede přes /auth/callback (výměna kódu za přihlášení) na /auth/reset-password.
 * Adresa musí být v Supabase → Authentication → Redirect URLs, jinak Supabase
 * odkaz pošle na Site URL projektu.
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
    // Doména, ze které žádost přišla — dřív bez NEXT_PUBLIC_SITE_URL mířil odkaz na localhost.
    const origin = new URL(req.url).origin;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/callback?next=/auth/reset-password`,
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
