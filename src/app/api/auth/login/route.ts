import { createSupabaseServer } from '@/lib/supabase/server';
import { ensureProfile } from '@/lib/auth/ensure-profile';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return Response.json(
        { error: 'E-mail a heslo jsou povinné.' },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServer();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    // Účty z PTF se do hypoteeky přihlásí, aniž tu kdy prošly registrací.
    await ensureProfile(data.user);

    return Response.json({
      user: { id: data.user.id, email: data.user.email, name: data.user.user_metadata?.name },
    });
  } catch {
    return Response.json({ error: 'Chyba serveru.' }, { status: 500 });
  }
}
