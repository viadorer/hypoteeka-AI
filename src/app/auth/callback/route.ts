import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { ensureProfile } from '@/lib/auth/ensure-profile';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Přihlášení přes Google nikde jinde profil nezakládá — bez něj by
      // uživatel neměl roli ani uložené konverzace (sessions.user_id má na
      // profiles cizí klíč).
      await ensureProfile(data.user);
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return to homepage on error
  return NextResponse.redirect(`${origin}/`);
}
