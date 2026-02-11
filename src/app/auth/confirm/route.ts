/**
 * Auth Confirm Callback
 * 
 * Supabase posílá uživatele sem po kliknutí na odkaz v emailu.
 * Typy: signup (potvrzení emailu), recovery (reset hesla), email_change
 * 
 * URL: /auth/confirm?token_hash=xxx&type=signup|recovery|email_change
 */

import { createSupabaseServer } from '@/lib/supabase/server';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as 'signup' | 'recovery' | 'email_change' | null;
  const next = searchParams.get('next') ?? '/';

  if (!token_hash || !type) {
    return NextResponse.redirect(new URL('/?error=invalid_link', request.url));
  }

  const supabase = await createSupabaseServer();

  const { error } = await supabase.auth.verifyOtp({
    token_hash,
    type,
  });

  if (error) {
    console.error('[Auth] Confirm error:', error.message);
    return NextResponse.redirect(new URL('/?error=confirm_failed', request.url));
  }

  // Redirect based on type
  switch (type) {
    case 'recovery':
      // User clicked "reset password" link -> send to reset password page
      return NextResponse.redirect(new URL('/auth/reset-password', request.url));
    case 'signup':
      // Email confirmed -> send to home with success
      return NextResponse.redirect(new URL('/?confirmed=true', request.url));
    case 'email_change':
      return NextResponse.redirect(new URL('/?email_changed=true', request.url));
    default:
      return NextResponse.redirect(new URL(next, request.url));
  }
}
